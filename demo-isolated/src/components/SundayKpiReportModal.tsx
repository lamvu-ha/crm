import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  X, 
  Eye, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Award,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Settings2,
  Sliders,
  Filter,
  Search,
  Info,
  UserCheck,
  RotateCcw,
  AtSign,
  PhoneCall,
  Flame,
  CheckCheck,
  FileText
} from 'lucide-react';
import { Lead, Appointment, SalesMember, KpiPolicy, SaleWeeklyKpiReport } from '../types';
import { 
  getCurrentWeekRange, 
  calculateWeeklyKpiReports, 
  generateSundayReportEmailHtml,
  DEFAULT_KPI_POLICY 
} from '../services/kpiReportService';
import { getTpkdForMember } from '../data/salesTeamData';
import { sendEmailViaGmail, getAccessToken } from '../services/googleSheetsService';

interface SundayKpiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesMembers: SalesMember[];
  leads: Lead[];
  appointments: Appointment[];
  currentUser: SalesMember;
  kpiPolicy?: KpiPolicy;
  onUpdatePolicy?: (newPolicy: KpiPolicy) => void;
  onShowToast: (msg: string) => void;
  onOpenWeeklyPdfModal?: (memberId?: string) => void;
}

export const SundayKpiReportModal: React.FC<SundayKpiReportModalProps> = ({
  isOpen,
  onClose,
  salesMembers,
  leads,
  appointments,
  currentUser,
  kpiPolicy = DEFAULT_KPI_POLICY,
  onUpdatePolicy,
  onShowToast,
  onOpenWeeklyPdfModal
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isTpkd = currentUser.role === 'tpkd';
  const isSale = currentUser.role === 'sale' || (!isAdmin && !isTpkd);

  const [policy, setPolicy] = useState<KpiPolicy>(kpiPolicy);

  useEffect(() => {
    if (kpiPolicy) {
      setPolicy(kpiPolicy);
    }
  }, [kpiPolicy]);

  const weekRange = useMemo(() => getCurrentWeekRange(), []);
  
  const reports = useMemo(() => {
    return calculateWeeklyKpiReports(salesMembers, leads, appointments, policy);
  }, [salesMembers, leads, appointments, policy]);

  // Tìm báo cáo của chính currentUser
  const myReport = useMemo(() => {
    const cEmail = (currentUser.email || '').toLowerCase().trim();
    const cName = (currentUser.name || '').toLowerCase().trim();
    const cleanCName = cName.replace(/\s*\(.*?\)\s*/g, '').trim();

    const found = reports.find((r) => {
      if (r.member.id === currentUser.id) return true;
      if (cEmail && r.member.email && r.member.email.toLowerCase().trim() === cEmail) return true;
      const rName = (r.member.name || '').toLowerCase().trim();
      const cleanRName = rName.replace(/\s*\(.*?\)\s*/g, '').trim();
      return rName === cName || cleanRName === cleanCName;
    });

    return found || reports[0] || null;
  }, [reports, currentUser]);

  // Thống kê nhanh và danh sách báo cáo có hiệu lực theo vai trò:
  // - Admin: Xem toàn bộ công ty (toàn bộ reports)
  // - TPKD: Chỉ xem và duyệt báo cáo của chính mình + NVKD thuộc phòng kinh doanh mình quản lý
  // - NVKD: Chỉ xem và gửi báo cáo của chính mình
  const accessibleReports = useMemo(() => {
    if (isAdmin) {
      return reports;
    }
    if (isTpkd) {
      const isCurrentTam = currentUser.id === 'sale-tpkd-tam' || 
        (currentUser.email && currentUser.email.toLowerCase().includes('phamtamdxg')) ||
        (currentUser.name && currentUser.name.toLowerCase().includes('hoài tâm'));

      return reports.filter((r) => {
        // Chính TPKD đó
        if (r.member.id === currentUser.id) return true;
        if (currentUser.email && r.member.email && r.member.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true;

        // Loại bỏ chuyên viên Marketing và Ban Quản Trị / Giám Đốc khỏi phòng kinh doanh của TPKD
        const memberTeam = (r.member.team || '').toLowerCase();
        const memberTitle = (r.member.title || '').toLowerCase();
        if (
          memberTeam.includes('marketing') ||
          memberTitle.includes('marketing') ||
          memberTeam.includes('quản trị') ||
          memberTitle.includes('quản trị') ||
          r.member.role === 'admin'
        ) {
          return false;
        }

        // TPKD Chuyên viên 01: Theo chuẩn Google Sheet MAY_TRUONGBV_MH5.19_NVKD_V.1
        // Phòng KD của Chuyên viên 01 CHỈ CÓ DUY NHẤT 1 NVKD là Trưởng nhóm thử nghiệm
        if (isCurrentTam) {
          const mName = (r.member.name || '').toLowerCase();
          const mEmail = (r.member.email || '').toLowerCase();
          return mName.includes('trần minh phúc') || mEmail.includes('phucminhtran');
        }

        // Các TPKD khác (Quản trị thử nghiệm, Quản trị thử nghiệm, Chuyên viên 02):
        // Hoặc NVKD thuộc team quản lý của TPKD này
        if (r.tpkdMember?.id === currentUser.id) return true;
        if (currentUser.email && r.tpkdEmail && r.tpkdEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true;
        if (r.member.managerId === currentUser.id) return true;
        // Kiểm tra mapping getTpkdForMember
        const tpkdInfo = getTpkdForMember(r.member, salesMembers);
        if (tpkdInfo?.id === currentUser.id) return true;
        if (currentUser.email && tpkdInfo?.email && tpkdInfo.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim()) return true;
        return false;
      });
    }
    // NVKD
    return myReport ? [myReport] : (reports.length > 0 ? [reports[0]] : []);
  }, [isAdmin, isTpkd, reports, currentUser, myReport, salesMembers]);

  const [selectedReport, setSelectedReport] = useState<SaleWeeklyKpiReport | null>(null);
  // NVKD khi mở modal sẽ vào thẳng tab Xem trước & Gửi Email cá nhân của mình
  const [activeTab, setActiveTab] = useState<'list' | 'settings' | 'preview'>(() => {
    return isSale ? 'preview' : 'list';
  });
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; successCount: number } | null>(null);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // NVKD không được vào tab Cấu hình KPI (Admin)
  useEffect(() => {
    if (isSale && activeTab === 'settings') {
      setActiveTab('preview');
    }
  }, [isSale, activeTab]);

  // Filters for KPI Table
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'violation' | 'not_met' | 'met' | 'excellent'>('all');

  // Thống kê nhanh dựa trên phạm vi quyền hạn (TPKD chỉ tính trên đội của họ)
  const totalSales = accessibleReports.length;
  const metDailyZaloTodayCount = accessibleReports.filter((r) => r.isDailyZaloMetToday).length;
  const metWeeklyMeetingCount = accessibleReports.filter((r) => r.isWeeklyMeetingMet).length;
  const excellentCount = accessibleReports.filter((r) => r.overallStatus === 'ĐẠT XUẤT SẮC').length;
  const metCount = accessibleReports.filter((r) => r.overallStatus === 'ĐẠT CHỈ TIÊU').length;
  const notMetCount = accessibleReports.filter((r) => r.overallStatus === 'CHƯA ĐẠT').length;
  const violationCount = accessibleReports.filter((r) => r.overallStatus === 'CẢNH BÁO VI PHẠM').length;

  // Báo cáo đang kích hoạt để xem trước & gửi email
  const activeReport = useMemo(() => {
    if (isSale) {
      return myReport || accessibleReports[0] || reports[0] || null;
    }
    if (selectedReport && accessibleReports.some((r) => r.member.id === selectedReport.member.id)) {
      return selectedReport;
    }
    return myReport || accessibleReports[0] || reports[0] || null;
  }, [isSale, myReport, selectedReport, accessibleReports, reports]);

  const activeEmailHtml = useMemo(() => {
    if (!activeReport) return '';
    try {
      return generateSundayReportEmailHtml(activeReport, weekRange.weekLabel);
    } catch (err) {
      console.error('Error generating Sunday report email HTML:', err);
      return '<p style="padding: 16px; color: #ef4444;">Không thể tạo mẫu email xem trước.</p>';
    }
  }, [activeReport, weekRange.weekLabel]);

  // Filtered reports: Áp dụng tìm kiếm và trạng thái trên accessibleReports
  const filteredReports = useMemo(() => {
    if (isSale) {
      return myReport ? [myReport] : (accessibleReports.length > 0 ? [accessibleReports[0]] : []);
    }
    return accessibleReports.filter((r) => {
      // Search query match
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        (r.member.name && r.member.name.toLowerCase().includes(q)) ||
        (r.member.email && r.member.email.toLowerCase().includes(q)) ||
        (r.member.team && r.member.team.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Status filter match
      if (statusFilter === 'violation') return r.overallStatus === 'CẢNH BÁO VI PHẠM';
      if (statusFilter === 'not_met') return r.overallStatus === 'CHƯA ĐẠT';
      if (statusFilter === 'met') return r.overallStatus === 'ĐẠT CHỈ TIÊU';
      if (statusFilter === 'excellent') return r.overallStatus === 'ĐẠT XUẤT SẮC';

      return true;
    });
  }, [isSale, myReport, accessibleReports, searchQuery, statusFilter]);

  if (!isOpen) return null;

  // Xử lý gửi email báo cáo cho 1 sale
  const handleSendSingleEmail = async (report: SaleWeeklyKpiReport) => {
    try {
      // Kiểm tra bảo mật: NVKD chỉ được phép gửi báo cáo của chính mình
      if (isSale) {
        const isSelf = report.member.id === myReport.member.id || 
                       report.member.email.toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim();
        if (!isSelf) {
          onShowToast('❌ Vi phạm bảo mật: NVKD chỉ được phép gửi email báo cáo KPI của chính bản thân mình cho TPKD và GĐKD!');
          return;
        }
      }

      // Kiểm tra bảo mật: TPKD chỉ được gửi báo cáo của mình hoặc nhân sự trong phòng KD mình quản lý
      if (isTpkd) {
        const isAllowed = accessibleReports.some((r) => r.member.id === report.member.id);
        if (!isAllowed) {
          onShowToast('❌ Vi phạm bảo mật: TPKD chỉ được phép duyệt và gửi báo cáo cho nhân sự thuộc phòng kinh doanh của mình!');
          return;
        }
      }

      setIsSendingSingle(true);
      const token = getAccessToken();
      if (!token) {
        onShowToast('⚠️ Vui lòng kết nối tài khoản Google có quyền Gmail trước khi gửi tự động!');
        return;
      }

      const subject = `[BÁO CÁO TUẦN SALEPRO HCM_E05] Kết quả KPI Zalo & Lịch hẹn BĐS - ${report.member.name} - Tối CN (${weekRange.endStr})`;
      const html = generateSundayReportEmailHtml(report, weekRange.weekLabel);

      // Người nhận: NVKD gửi trực tiếp cho TPKD phụ trách, CC cho GĐKD và chính mình
      const toRecipients = report.member.role === 'tpkd'
        ? report.gdkdEmail
        : report.tpkdEmail;
      const ccRecipient = report.member.role === 'tpkd'
        ? report.saleEmail
        : [report.gdkdEmail, report.saleEmail].filter(Boolean).join(', ');

      await sendEmailViaGmail(toRecipients, subject, html, ccRecipient);
      onShowToast(
        report.member.role === 'tpkd'
          ? `Đã gửi email báo cáo của TPKD "${report.member.name}" đến GĐKD (${report.gdkdEmail}) thành công!`
          : `Đã gửi email báo cáo của "${report.member.name}" đến TPKD ${report.tpkdMember?.name || ''} (${report.tpkdEmail}) - CC GĐKD (${report.gdkdEmail}) thành công!`
      );
    } catch (err: any) {
      console.error('Failed to send Sunday report email', err);
      onShowToast(`❌ Lỗi gửi email: ${err.message || 'Không thể gửi qua Gmail'}`);
    } finally {
      setIsSendingSingle(false);
    }
  };

  // Xử lý gửi hàng loạt cho NVKD & TPKD (Admin gửi toàn công ty, TPKD gửi cho toàn bộ phòng kinh doanh của mình)
  const handleSendAllReports = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        onShowToast('⚠️ Vui lòng kết nối tài khoản Google có quyền Gmail trước khi gửi hàng loạt!');
        return;
      }

      const targetList = isTpkd ? accessibleReports : reports;
      const targetLabel = isTpkd 
        ? `toàn bộ ${targetList.length} nhân sự trong phòng kinh doanh của bạn` 
        : `toàn bộ ${targetList.length} chuyên viên kinh doanh & TPKD`;

      if (!window.confirm(`Xác nhận gửi email báo cáo tối Chủ Nhật cho ${targetLabel}?`)) {
        return;
      }

      setIsSendingAll(true);
      setSendProgress({ current: 0, total: targetList.length, successCount: 0 });

      let successCount = 0;
      for (let i = 0; i < targetList.length; i++) {
        const report = targetList[i];
        setSendProgress({ current: i + 1, total: targetList.length, successCount });

        const subject = `[BÁO CÁO TUẦN SALEPRO HCM_E05] Kết quả KPI Zalo & Lịch hẹn BĐS - ${report.member.name} - Tối CN (${weekRange.endStr})`;
        const html = generateSundayReportEmailHtml(report, weekRange.weekLabel);
        const toRecipients = report.member.role === 'tpkd'
          ? report.gdkdEmail
          : report.tpkdEmail;
        const ccRecipient = report.member.role === 'tpkd'
          ? report.saleEmail
          : [report.gdkdEmail, report.saleEmail].filter(Boolean).join(', ');

        try {
          await sendEmailViaGmail(toRecipients, subject, html, ccRecipient);
          successCount++;
          setSendProgress({ current: i + 1, total: targetList.length, successCount });
        } catch (e) {
          console.error(`Error sending email for ${report.member.name}:`, e);
        }

        // Chờ 800ms để tránh rate limit của Google API
        await new Promise((res) => setTimeout(res, 800));
      }

      onShowToast(`Hoàn tất gửi báo cáo tối Chủ Nhật: ${successCount}/${targetList.length} email đã được chuyển đúng TPKD phụ trách & CC cho GĐKD!`);
    } catch (err: any) {
      console.error('Failed batch send', err);
      onShowToast(`❌ Lỗi gửi hàng loạt: ${err.message}`);
    } finally {
      setIsSendingAll(false);
      setSendProgress(null);
    }
  };

  const handleCopyHtml = () => {
    if (!activeEmailHtml) return;
    navigator.clipboard.writeText(activeEmailHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2500);
    onShowToast('Đã sao chép toàn bộ mã HTML Email vào bộ nhớ tạm!');
  };

  const handleSavePolicySettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePolicy) {
      onUpdatePolicy(policy);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    onShowToast('Đã lưu cấu hình Chỉ tiêu KPI & Email Báo cáo tối Chủ Nhật thành công!');
  };

  const handleResetDefaultPolicy = () => {
    setPolicy({ ...DEFAULT_KPI_POLICY });
    onShowToast('Đã khôi phục thông số KPI về mức mặc định (2 Zalo/ngày, 2 Hẹn/tuần)');
  };

  // Helper render badge trạng thái
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ĐẠT XUẤT SẮC':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Đạt xuất sắc</span>
          </span>
        );
      case 'ĐẠT CHỈ TIÊU':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Đạt chỉ tiêu</span>
          </span>
        );
      case 'CHƯA ĐẠT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Chưa đạt KPI</span>
          </span>
        );
      case 'CẢNH BÁO VI PHẠM':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Cảnh báo vi phạm</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-6xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto h-[96dvh] max-h-[96dvh] flex flex-col transition-all">
        
        {/* MODAL HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 shrink-0 gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  Báo Cáo KPI Tuần &amp; Gửi Email Tối Chủ Nhật
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                  NVKD &amp; TPKD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5 flex-wrap">
                <span>{weekRange.weekLabel}</span>
                <span>•</span>
                <span className={weekRange.isSunday ? 'text-rose-600 font-bold' : 'text-slate-600'}>
                  {weekRange.isSunday ? '🔴 Hôm nay là Chủ Nhật (Đến hạn gửi)' : 'Đang trong tuần công tác'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
            {isAdmin && (
              <button
                onClick={() => setActiveTab(activeTab === 'settings' ? 'list' : 'settings')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 shadow-2xs ${
                  activeTab === 'settings'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-amber-200'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>{activeTab === 'settings' ? 'Về bảng KPI' : 'Cấu hình KPI'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center font-bold transition-colors"
              title="Đóng modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* PRIMARY NAVIGATION TABS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 py-2.5 my-2 shrink-0 gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 sm:pb-0">
            {isSale ? (
              <>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'preview'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Email Báo Cáo Của Tôi ({myReport?.member.name})</span>
                </button>

                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'list'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tiến Độ KPI Cá Nhân</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'list'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isTpkd 
                      ? `Bảng theo dõi KPI phòng kinh doanh (${accessibleReports.length})` 
                      : `Bảng theo dõi KPI cả đội (${reports.length})`}
                  </span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                      activeTab === 'settings'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Cấu hình KPI (Admin)</span>
                    <span className="px-1.5 py-0.2 bg-amber-200/60 text-amber-900 rounded text-[10px] font-bold">
                      Admin
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    activeTab === 'preview'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Xem trước Email ({activeReport?.member.name || 'Chi tiết'})</span>
                </button>
              </>
            )}
          </div>

          {/* Quick Metrics Indicators */}
          <div className="flex items-center space-x-3 text-xs text-slate-600 font-medium self-end sm:self-auto shrink-0">
            {isSale ? (
              <>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border ${myReport.isDailyZaloMetToday ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${myReport.isDailyZaloMetToday ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  <span>Zalo hôm nay: {myReport.dailyZaloCountToday}/{myReport.dailyZaloTarget}</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border ${myReport.isWeeklyMeetingMet ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${myReport.isWeeklyMeetingMet ? 'bg-purple-500' : 'bg-rose-500'}`}></span>
                  <span>Hẹn tuần: {myReport.weeklyMeetingCount}/{myReport.weeklyMeetingTarget}</span>
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Đạt Zalo hôm nay: {metDailyZaloTodayCount}/{totalSales}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>Đạt Hẹn tuần: {metWeeklyMeetingCount}/{totalSales}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: BẢNG THEO DÕI KPI */}
        {/* ================================================================ */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
            
            {/* 4 Executive Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              {isSale ? (
                <>
                  {/* Card 1: Tài khoản cá nhân */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-800">Tài khoản NVKD</p>
                      <p className="text-base sm:text-lg font-extrabold text-amber-950 mt-0.5 truncate">{myReport.member.name}</p>
                      <p className="text-[10px] text-amber-700 font-medium">{myReport.member.team || 'MAY_MH5.19'}</p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-200/70 text-amber-900 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 2: Zalo hôm nay của NVKD */}
                  <div className={`border rounded-xl p-3 flex items-center justify-between ${myReport.isDailyZaloMetToday ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'}`}>
                    <div>
                      <p className="text-[11px] font-bold text-slate-700">Zalo hôm nay</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className={`text-lg sm:text-xl font-extrabold ${myReport.isDailyZaloMetToday ? 'text-emerald-900' : 'text-amber-900'}`}>
                          {myReport.dailyZaloCountToday}/{myReport.dailyZaloTarget}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">khách</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Tuần: {myReport.weeklyZaloCount} khách ({myReport.weeklyZaloDaysMet} ngày đạt)</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${myReport.isDailyZaloMetToday ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 3: Lịch hẹn tuần của NVKD */}
                  <div className={`border rounded-xl p-3 flex items-center justify-between ${myReport.isWeeklyMeetingMet ? 'bg-purple-50/70 border-purple-200' : 'bg-rose-50/70 border-rose-200'}`}>
                    <div>
                      <p className="text-[11px] font-bold text-slate-700">Lịch hẹn tuần này</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className={`text-lg sm:text-xl font-extrabold ${myReport.isWeeklyMeetingMet ? 'text-purple-900' : 'text-rose-700'}`}>
                          {myReport.weeklyMeetingCount}/{myReport.weeklyMeetingTarget}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">lịch hẹn</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{myReport.isWeeklyMeetingMet ? '✅ Đã hoàn thành chỉ tiêu' : '⚠️ Cần cố gắng thêm'}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${myReport.isWeeklyMeetingMet ? 'bg-purple-100 text-purple-700' : 'bg-rose-100 text-rose-700'}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 4: Xếp loại cá nhân */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-600">Đánh giá tuần</p>
                      <div className="mt-1">
                        {renderStatusBadge(myReport.overallStatus)}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Card 1: Tổng nhân sự */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500">
                        {isTpkd ? 'Nhân sự phòng KD' : 'Tổng NVKD & TPKD'}
                      </p>
                      <div className="flex items-baseline space-x-1.5 mt-0.5">
                        <span className="text-lg sm:text-xl font-extrabold text-slate-900">{totalSales} nhân sự</span>
                        {isTpkd && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                            {accessibleReports.filter(r => r.member.role === 'sale').length} NVKD + 1 TPKD
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-200/70 text-slate-700 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 2: Đạt Zalo hôm nay */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-emerald-800">Đạt Zalo hôm nay</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className="text-lg sm:text-xl font-extrabold text-emerald-900">{metDailyZaloTodayCount}/{totalSales}</span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          ({totalSales > 0 ? Math.round((metDailyZaloTodayCount / totalSales) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 3: Đạt Lịch hẹn tuần */}
                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-purple-800">Đạt Lịch hẹn tuần</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className="text-lg sm:text-xl font-extrabold text-purple-900">{metWeeklyMeetingCount}/{totalSales}</span>
                        <span className="text-[11px] font-bold text-purple-700">
                          ({totalSales > 0 ? Math.round((metWeeklyMeetingCount / totalSales) * 100) : 0}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Card 4: Tình hình cảnh báo */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-amber-900">Cảnh báo / Chưa đạt</p>
                      <div className="flex items-baseline space-x-1 mt-0.5">
                        <span className="text-lg sm:text-xl font-extrabold text-rose-600">{violationCount}</span>
                        <span className="text-xs text-slate-500 font-bold">vi phạm</span>
                        <span className="text-xs text-slate-400">/</span>
                        <span className="text-xs text-amber-700 font-bold">{notMetCount} chưa đạt</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Flame className="w-4 h-4" />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Policy Banner + Batch Send Action */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50 border border-amber-200 rounded-xl p-3.5 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1 min-w-0">
                <div className="font-extrabold text-amber-950 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Chính sách KPI bắt buộc áp dụng cho NVKD và TPKD:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 text-[11px] sm:text-xs text-amber-900">
                  <div className="flex items-center space-x-1">
                    <span>📱</span>
                    <span><strong>Chỉ tiêu ngày:</strong> Tối thiểu <strong>{policy.dailyZaloTarget} khách quan tâm kết nối Zalo</strong> / ngày.</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>🤝</span>
                    <span><strong>Chỉ tiêu tuần:</strong> Tối thiểu <strong>{policy.weeklyMeetingTarget} khách hẹn gặp / xem dự án</strong> / tuần.</span>
                  </div>
                </div>
                <div className="text-[11px] text-amber-800">
                  ✉️ <strong>Cơ chế báo cáo:</strong> Tối Chủ Nhật, hệ thống tổng kết gửi cho <strong>GĐKD</strong> và <strong>TPKD tương ứng</strong>, đồng thời <strong>CC cho chính Sale đó</strong>.
                </div>
              </div>

              {(isAdmin || isTpkd) && (
                <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1">
                  <button
                    onClick={handleSendAllReports}
                    disabled={isSendingAll}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-200 transition-all shrink-0 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSendingAll ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        <span>Đang gửi ({sendProgress?.current}/{sendProgress?.total})...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        <span>
                          {isTpkd 
                            ? `Gửi Email tối CN cho phòng KD (${accessibleReports.length})` 
                            : `Gửi Email tối CN cho TẤT CẢ Sale (${reports.length})`}
                        </span>
                      </>
                    )}
                  </button>
                  {isSendingAll && sendProgress && (
                    <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full transition-all duration-300"
                        style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Filter & Search Bar - Ẩn đối với NVKD vì NVKD chỉ quản lý báo cáo cá nhân của chính mình */}
            {!isSale && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-white p-1">
                {/* Search input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên chuyên viên, email hoặc team..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-400 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      statusFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({accessibleReports.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('violation')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center space-x-1 ${
                      statusFilter === 'violation'
                        ? 'bg-rose-600 text-white'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    }`}
                  >
                    <span>Cảnh báo ({violationCount})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('not_met')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      statusFilter === 'not_met'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    Chưa đạt ({notMetCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('met')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      statusFilter === 'met'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    Đạt chuẩn ({metCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('excellent')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors whitespace-nowrap ${
                      statusFilter === 'excellent'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    Xuất sắc ({excellentCount})
                  </button>
                </div>
              </div>
            )}

            {/* TABLE VIEW FOR DESKTOP (md and above) */}
            <div className="hidden md:block overflow-y-auto flex-1 border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="p-3 min-w-[210px]">Chuyên viên / Chức vụ</th>
                    <th className="p-3 min-w-[120px]">Đội nhóm</th>
                    <th className="p-3 min-w-[120px] text-center">
                      Zalo hôm nay
                      <div className="text-[10px] font-normal text-slate-500">Chỉ tiêu: ≥ {policy.dailyZaloTarget} khách</div>
                    </th>
                    <th className="p-3 min-w-[130px] text-center">
                      Hẹn gặp / Dự án tuần
                      <div className="text-[10px] font-normal text-slate-500">Chỉ tiêu: ≥ {policy.weeklyMeetingTarget} khách</div>
                    </th>
                    <th className="p-3 min-w-[150px] text-center">Đánh giá tuần</th>
                    <th className="p-3 min-w-[190px]">Người nhận Email báo cáo</th>
                    <th className="p-3 min-w-[160px] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Không tìm thấy chuyên viên kinh doanh phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report) => {
                      const isCurrent = activeReport?.member.id === report.member.id;
                      return (
                        <tr 
                          key={report.member.id}
                          className={`hover:bg-amber-50/30 transition-colors ${
                            isCurrent ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          {/* Chuyên viên / Chức vụ */}
                          <td className="p-3">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                {report.member.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                  <span className="truncate">{report.member.name}</span>
                                  {report.member.id === currentUser.id && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold shrink-0">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {report.member.role === 'tpkd' ? 'Trưởng phòng kinh doanh (TPKD)' : 'Chuyên viên BĐS (NVKD)'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  {report.member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Đội nhóm */}
                          <td className="p-3">
                            <span className="inline-block px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                              {report.member.team || 'MAY_MH5.19'}
                            </span>
                          </td>

                          {/* Zalo hôm nay */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center space-x-1.5 font-bold">
                              <span className={`text-sm ${report.isDailyZaloMetToday ? 'text-emerald-700 font-extrabold' : 'text-amber-700'}`}>
                                {report.dailyZaloCountToday}
                              </span>
                              <span className="text-slate-400 font-normal">/ {report.dailyZaloTarget}</span>
                              {report.isDailyZaloMetToday ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-500 inline shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Tuần: <strong>{report.weeklyZaloCount}</strong> khách ({report.weeklyZaloDaysMet} ngày đạt)
                            </div>
                          </td>

                          {/* Lịch hẹn tuần */}
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center space-x-1.5 font-bold">
                              <span className={`text-sm ${report.isWeeklyMeetingMet ? 'text-purple-700 font-extrabold' : 'text-rose-700'}`}>
                                {report.weeklyMeetingCount}
                              </span>
                              <span className="text-slate-400 font-normal">/ {report.weeklyMeetingTarget}</span>
                              {report.isWeeklyMeetingMet ? (
                                <CheckCircle2 className="w-4 h-4 text-purple-600 inline shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500 inline shrink-0" />
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {report.appointmentsInWeek.length} lịch hẹn dự án
                            </div>
                          </td>

                          {/* Đánh giá tuần - FIX: Không bao giờ bị vỡ dòng */}
                          <td className="p-3 text-center">
                            {renderStatusBadge(report.overallStatus)}
                          </td>

                          {/* Người nhận Email báo cáo */}
                          <td className="p-3 text-[11px]">
                            {(() => {
                              const isMkt = (report.member.team || '').toLowerCase().includes('marketing') || (report.member.title || '').toLowerCase().includes('marketing');
                              const toText = report.member.role === 'tpkd' || isMkt ? 'GĐKD' : `TPKD: ${report.tpkdMember?.name || 'TPKD'}`;
                              return (
                                <>
                                  <div className="text-slate-700 truncate" title={`To: ${report.member.role === 'tpkd' || isMkt ? report.gdkdEmail : report.tpkdEmail}`}>
                                    <span className="font-bold text-slate-900">To:</span> {toText}
                                  </div>
                                  <div className="text-slate-400 text-[10px] truncate mt-0.5" title={`CC: ${report.member.role === 'tpkd' ? report.saleEmail : `GĐKD, ${report.saleEmail}`}`}>
                                    <span className="font-semibold text-slate-600">CC:</span> {report.member.role === 'tpkd' ? report.saleEmail : `GĐKD, ${report.saleEmail}`}
                                  </div>
                                </>
                              );
                            })()}
                          </td>

                          {/* Thao tác */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedReport(report);
                                  setActiveTab('preview');
                                }}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center shadow-2xs transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                <span>Xem</span>
                              </button>
                              {onOpenWeeklyPdfModal && (
                                <button
                                  type="button"
                                  onClick={() => onOpenWeeklyPdfModal(report.member.id)}
                                  className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center shadow-2xs transition-colors"
                                  title={`Xuất báo cáo PDF hoạt động tuần của ${report.member.name}`}
                                >
                                  <FileText className="w-3.5 h-3.5 mr-1 text-rose-600" />
                                  <span>PDF</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleSendSingleEmail(report)}
                                disabled={isSendingSingle}
                                className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center shadow-2xs transition-colors disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5 mr-1" />
                                <span>Gửi</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* CARD VIEW FOR MOBILE (< md screens) - Đảm bảo không bao giờ vỡ trên điện thoại */}
            <div className="md:hidden overflow-y-auto flex-1 space-y-2.5 pr-0.5">
              {filteredReports.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  Không tìm thấy chuyên viên kinh doanh phù hợp.
                </div>
              ) : (
                filteredReports.map((report) => {
                  const isCurrent = activeReport?.member.id === report.member.id;
                  return (
                    <div
                      key={report.member.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrent 
                          ? 'bg-amber-50/40 border-amber-300 shadow-xs' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Member Info & Evaluation Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-xs">
                            {report.member.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                              <span>{report.member.name}</span>
                              {report.member.id === currentUser.id && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold shrink-0">Bạn</span>
                              )}
                            </h4>
                            <p className="text-[10px] text-slate-500">
                              {report.member.role === 'tpkd' ? 'TPKD' : 'NVKD'} • {report.member.team || 'MAY_MH5.19'}
                            </p>
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0">
                          {renderStatusBadge(report.overallStatus)}
                        </div>
                      </div>

                      {/* 2 KPI Metric Boxes */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 block">Zalo hôm nay</span>
                          <div className="flex items-center space-x-1.5 mt-0.5 font-bold">
                            <span className={`text-base ${report.isDailyZaloMetToday ? 'text-emerald-700 font-extrabold' : 'text-amber-700'}`}>
                              {report.dailyZaloCountToday}
                            </span>
                            <span className="text-slate-400 text-xs font-normal">/ {report.dailyZaloTarget} khách</span>
                            {report.isDailyZaloMetToday ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Cả tuần: {report.weeklyZaloCount} khách
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500 block">Hẹn gặp tuần</span>
                          <div className="flex items-center space-x-1.5 mt-0.5 font-bold">
                            <span className={`text-base ${report.isWeeklyMeetingMet ? 'text-purple-700 font-extrabold' : 'text-rose-700'}`}>
                              {report.weeklyMeetingCount}
                            </span>
                            <span className="text-slate-400 text-xs font-normal">/ {report.weeklyMeetingTarget} khách</span>
                            {report.isWeeklyMeetingMet ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 ml-auto" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500 ml-auto" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {report.appointmentsInWeek.length} lịch hẹn
                          </div>
                        </div>
                      </div>

                      {/* Recipient summary & Actions */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
                        <div className="text-slate-500 text-[10px] truncate">
                          {report.member.role === 'tpkd'
                            ? `To: GĐKD • CC: ${report.member.name}`
                            : `To: TPKD ${report.tpkdMember?.name || ''} • CC: GĐKD, ${report.member.name}`}
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setActiveTab('preview');
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs"
                          >
                            Xem Email
                          </button>
                          {onOpenWeeklyPdfModal && (
                            <button
                              type="button"
                              onClick={() => onOpenWeeklyPdfModal(report.member.id)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1"
                              title="Xuất PDF"
                            >
                              <FileText className="w-3 h-3 text-rose-600" />
                              <span>PDF</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleSendSingleEmail(report)}
                            disabled={isSendingSingle}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs disabled:opacity-50"
                          >
                            Gửi Gmail
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 2: CẤU HÌNH KPI (ADMIN CONFIGURATION VIEW) */}
        {/* ================================================================ */}
        {activeTab === 'settings' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1">
            <form onSubmit={handleSavePolicySettings} className="space-y-4 text-xs">
              
              {/* Header Info Box */}
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Bảng Điều Khiển Cấu Hình KPI &amp; Email Báo Cáo Tối Chủ Nhật
                    </h3>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Thiết lập các tiêu chí đánh giá hiệu suất bắt buộc đối với Chuyên viên kinh doanh (NVKD) và Trưởng phòng kinh doanh (TPKD). 
                      Thông số này được hệ thống sử dụng để tự động tính toán, phân loại xếp loại và tạo Email gửi vào <strong>20:00 - 22:00 Tối Chủ Nhật hàng tuần</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 2 Columns for Core Policy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CARD 1: CHỈ TIÊU ZALO HÀNG NGÀY */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      📱
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">1. Chỉ tiêu kết nối Zalo hàng ngày</h4>
                      <p className="text-[10px] text-slate-500">Định mức tối thiểu mỗi ngày cho NVKD &amp; TPKD</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 block">
                      Số khách quan tâm kết nối Zalo tối thiểu / ngày:
                    </label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setPolicy({ ...policy, dailyZaloTarget: Math.max(1, policy.dailyZaloTarget - 1) })}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={policy.dailyZaloTarget}
                        onChange={(e) => setPolicy({ ...policy, dailyZaloTarget: Number(e.target.value) || 2 })}
                        className="w-20 text-center py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPolicy({ ...policy, dailyZaloTarget: Math.min(20, policy.dailyZaloTarget + 1) })}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                      <span className="text-slate-600 font-bold text-xs">khách hàng / ngày</span>
                    </div>

                    {/* Quick presets */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Chọn nhanh mức định mức:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPolicy({ ...policy, dailyZaloTarget: val })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              policy.dailyZaloTarget === val
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {val} khách {val === 2 && '(Chuẩn BĐS)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>Nguyên tắc:</strong> Mỗi chuyên viên phải cập nhật trạng thái Zalo của khách lên CRM trong ngày. 
                      Hệ thống tự động đếm khách được đánh dấu "Đã kết nối Zalo" để tính tỷ lệ hoàn thành.
                    </p>
                  </div>
                </div>

                {/* CARD 2: CHỈ TIÊU LỊCH HẸN TUẦN */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                      🤝
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">2. Chỉ tiêu Hẹn gặp / Xem BĐS tuần</h4>
                      <p className="text-[10px] text-slate-500">Định mức gặp khách trực tiếp hoặc dẫn xem dự án</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-bold text-slate-700 block">
                      Số khách hẹn gặp / tham quan dự án tối thiểu / tuần:
                    </label>
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setPolicy({ ...policy, weeklyMeetingTarget: Math.max(1, policy.weeklyMeetingTarget - 1) })}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={policy.weeklyMeetingTarget}
                        onChange={(e) => setPolicy({ ...policy, weeklyMeetingTarget: Number(e.target.value) || 2 })}
                        className="w-20 text-center py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setPolicy({ ...policy, weeklyMeetingTarget: Math.min(20, policy.weeklyMeetingTarget + 1) })}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-base flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                      <span className="text-slate-600 font-bold text-xs">khách hẹn / tuần</span>
                    </div>

                    {/* Quick presets */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">Chọn nhanh mức định mức:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[1, 2, 3, 4].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPolicy({ ...policy, weeklyMeetingTarget: val })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                              policy.weeklyMeetingTarget === val
                                ? 'bg-purple-600 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {val} khách {val === 2 && '(Chuẩn tuần)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>Nguyên tắc:</strong> Sau 1 tuần làm việc (Thứ 2 đến hết Chủ Nhật), sale phải tạo lịch hẹn có trạng thái "Đã xác nhận" hoặc "Đã gặp" trên lịch CRM.
                    </p>
                  </div>
                </div>

                {/* CARD 3: CẤU HÌNH NGƯỜI NHẬN BÁO CÁO EMAIL */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                      ✉️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">3. Luồng Email gửi báo cáo tối Chủ Nhật</h4>
                      <p className="text-[10px] text-slate-500">Đầu mối nhận báo cáo quản trị và giám sát</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Email Giám Đốc Kinh Doanh (GĐKD):
                      </label>
                      <div className="relative">
                        <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={policy.gdkdEmail}
                          onChange={(e) => setPolicy({ ...policy, gdkdEmail: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 font-bold"
                          placeholder="manager@sandbox.invalid"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        GĐKD Trưởng nhóm thử nghiệm nhận email tổng hợp tất cả các sale.
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-[11px] text-slate-600">
                      <div className="font-bold text-slate-800">Quy tắc phân luồng email tự động:</div>
                      <div className="flex items-start space-x-2">
                        <span className="text-amber-600 font-bold">1. To:</span>
                        <span>Gửi trực tiếp đến <strong>GĐKD</strong> và <strong>TPKD tương ứng</strong> của Sale đó.</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-600 font-bold">2. CC:</span>
                        <span>Đồng kính gửi đến <strong>chính email của Sale</strong> để nắm bắt và chịu trách nhiệm.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CARD 4: MA TRẬN ĐÁNH GIÁ & TIÊU CHUẨN XẾP LOẠI */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                  <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      🛡️
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">4. Ma trận xếp loại &amp; Cảnh báo vi phạm</h4>
                      <p className="text-[10px] text-slate-500">Cách hệ thống tự động gán nhãn đánh giá cuối tuần</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-950">ĐẠT XUẤT SẮC</span>
                          <p className="text-[10px] text-emerald-800">Đạt chỉ tiêu Zalo + Có từ 3 khách hẹn BĐS trở lên</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold text-blue-950">ĐẠT CHỈ TIÊU</span>
                          <p className="text-[10px] text-blue-800">Đạt Zalo hàng ngày &amp; Đạt từ {policy.weeklyMeetingTarget} khách hẹn tuần</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-950">CHƯA ĐẠT</span>
                          <p className="text-[10px] text-amber-800">Chỉ hoàn thành 1 trong 2 chỉ tiêu bắt buộc</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <span className="font-bold text-rose-950">CẢNH BÁO VI PHẠM</span>
                          <p className="text-[10px] text-rose-800">Không đạt cả 2 chỉ tiêu (Email sẽ gắn cờ Cảnh Báo Vi Phạm)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleResetDefaultPolicy}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Khôi phục mặc định (2 Zalo/ngày, 2 Hẹn/tuần)</span>
                </button>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-200 transition-all flex items-center justify-center space-x-1.5"
                  >
                    {savedSuccess ? (
                      <>
                        <CheckCheck className="w-4 h-4 text-emerald-200" />
                        <span>Đã lưu cấu hình thành công!</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Lưu &amp; Áp Dụng Cấu Hình KPI</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: XEM TRƯỚC EMAIL BÁO CÁO */}
        {/* ================================================================ */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-slate-100">
            {/* Action Bar for preview */}
            <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
              <div className="flex items-center space-x-2">
                {isSale ? (
                  /* TẮT HOÀN TOÀN TÍNH NĂNG SỔ XUỐNG LOẠT NVKD - CỐ ĐỊNH TÀI KHOẢN NVKD */
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-amber-600" />
                      <span>Báo cáo KPI của bạn:</span>
                    </span>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl font-bold text-amber-950 shadow-2xs">
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-extrabold">
                        {activeReport?.member?.name ? activeReport.member.name.charAt(0) : '?'}
                      </div>
                      <span>{activeReport?.member?.name || 'Chuyên viên'}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-200/70 text-amber-900">
                        {activeReport?.member?.role === 'tpkd' ? 'TPKD' : 'NVKD'} • {activeReport?.member?.team || 'MAY_MH5.19'}
                        {activeReport?.member?.role !== 'tpkd' && activeReport?.tpkdMember && (
                          <span className="ml-1 text-amber-950 font-extrabold">• TPKD: {activeReport.tpkdMember.name}</span>
                        )}
                      </span>
                      {activeReport && renderStatusBadge(activeReport.overallStatus)}
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                      (Đã tắt tính năng chọn NVKD khác • Đã khóa tài khoản cá nhân)
                    </span>
                  </div>
                ) : isTpkd ? (
                  /* TRƯỞNG PHÒNG KINH DOANH CHỈ ĐƯỢC DUYỆT BÁO CÁO CỦA PHÒNG MÌNH */
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Duyệt báo cáo phòng KD ({currentUser.name}):</span>
                    </span>
                    <select
                      value={activeReport?.member?.id || ''}
                      onChange={(e) => {
                        const found = accessibleReports.find((r) => r.member.id === e.target.value);
                        if (found) setSelectedReport(found);
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      {accessibleReports.map((r) => (
                        <option key={r.member.id} value={r.member.id}>
                          {r.member.name} {r.member.id === currentUser.id ? '(Chính bạn - TPKD)' : `(${r.member.role === 'tpkd' ? 'TPKD' : 'NVKD'})`} - {r.overallStatus}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* CHỈ QUẢN TRỊ VIÊN MỚI CÓ QUYỀN DUYỆT BÁO CÁO TOÀN BỘ CHUYÊN VIÊN */
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Duyệt báo cáo chuyên viên (Admin):</span>
                    </span>
                    <select
                      value={activeReport?.member?.id || ''}
                      onChange={(e) => {
                        const found = reports.find((r) => r.member.id === e.target.value);
                        if (found) setSelectedReport(found);
                      }}
                      className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      {reports.map((r) => (
                        <option key={r.member.id} value={r.member.id}>
                          {r.member.name} ({r.overallStatus})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {onOpenWeeklyPdfModal && activeReport && (
                  <button
                    type="button"
                    onClick={() => onOpenWeeklyPdfModal(activeReport.member.id)}
                    className="px-3 py-1.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-800 font-bold rounded-lg inline-flex items-center shadow-2xs transition-colors"
                    title="Xuất bản in PDF báo cáo hoạt động tuần gửi cấp trên"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1 text-rose-600" />
                    <span>Xuất báo cáo PDF</span>
                  </button>
                )}

                <button
                  onClick={handleCopyHtml}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg inline-flex items-center shadow-2xs"
                >
                  {copiedHtml ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  <span>{copiedHtml ? 'Đã sao chép' : 'Sao chép HTML'}</span>
                </button>

                {activeReport && (
                  <button
                    onClick={() => handleSendSingleEmail(activeReport)}
                    disabled={isSendingSingle}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold rounded-lg inline-flex items-center shadow-xs disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>
                      {isSendingSingle 
                        ? 'Đang gửi qua Gmail...' 
                        : isSale 
                          ? `Gửi Email báo cáo cho TPKD (CC GĐKD)` 
                          : 'Gửi Email báo cáo này ngay'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Email Header Preview Info */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 text-[11px] text-slate-600 font-mono shrink-0 space-y-1.5">
              <div className="flex items-start gap-2">
                <strong className="text-slate-800 font-sans font-bold shrink-0">Tiêu đề (Subject):</strong>
                <span className="text-slate-900 font-sans font-semibold">[BÁO CÁO TUẦN SALEPRO HCM_E05] Kết quả KPI Zalo &amp; Lịch hẹn BĐS - {activeReport?.member.name} - Tối CN ({weekRange.endStr})</span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <strong className="text-slate-800 font-sans font-bold shrink-0">Gửi đến (To):</strong> 
                {activeReport?.member.role === 'tpkd' ? (
                  <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">
                    GĐKD: Trưởng nhóm thử nghiệm ({activeReport?.gdkdEmail})
                  </span>
                ) : (
                  <span className="text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 font-sans">
                    TPKD: {activeReport?.tpkdMember?.name || 'Chuyên viên 01'} ({activeReport?.tpkdEmail})
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <strong className="text-slate-800 font-sans font-bold shrink-0">Đồng kính gửi (Cc):</strong> 
                {activeReport?.member.role === 'tpkd' ? (
                  <span className="text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-sans">
                    Trưởng phòng: {activeReport?.member.name} ({activeReport?.saleEmail})
                  </span>
                ) : (
                  <>
                    <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans">
                      GĐKD: Trưởng nhóm thử nghiệm ({activeReport?.gdkdEmail})
                    </span>
                    <span className="text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-sans">
                      {isSale ? 'Chính chuyên viên' : activeReport?.member.name}: ({activeReport?.saleEmail})
                    </span>
                  </>
                )}
              </div>
              <div className="pt-1 text-[11px] text-amber-800 font-sans flex items-center gap-1.5 font-medium border-t border-amber-100">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>
                  {isTpkd ? (
                    <><strong>Chính sách phân quyền TPKD:</strong> Bạn có quyền xem và duyệt báo cáo của chính bạn cùng các NVKD thuộc phòng kinh doanh do bạn phụ trách.</>
                  ) : isSale ? (
                    <><strong>Chính sách phân quyền NVKD:</strong> NVKD gửi trực tiếp cho TPKD phụ trách (CC cho GĐKD). Tính năng chọn chuyên viên khác đã được khóa cố định theo tài khoản cá nhân.</>
                  ) : (
                    <><strong>Quyền Quản trị viên (Admin):</strong> Bạn có toàn quyền theo dõi, duyệt và gửi báo cáo KPI của tất cả phòng kinh doanh và chuyên viên trong công ty.</>
                  )}
                </span>
              </div>
            </div>

            {/* Rendered HTML Preview */}
            <div className="flex-1 min-h-0 overflow-auto p-2 sm:p-4">
              <div 
                className="bg-white rounded-xl shadow-lg border border-slate-200 mx-auto w-full max-w-[800px] p-2 sm:p-5 [&>table>tbody>tr>td>table]:w-full [&>table>tbody>tr>td>table]:max-w-[680px]"
                dangerouslySetInnerHTML={{ __html: activeEmailHtml }}
              />
            </div>
          </div>
        )}

        {/* MODAL FOOTER INFO */}
        <div className="pt-3 border-t border-slate-200 mt-3 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2 shrink-0">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Email được gửi an toàn thông qua Google Workspace Gmail API RFC 2822 chuẩn quốc tế.</span>
          </div>
          <div className="text-slate-400">
            Hệ thống CRM SALEPRO HCM_E05 • Tối Chủ Nhật Hàng Tuần
          </div>
        </div>

      </div>
    </div>
  );
};
