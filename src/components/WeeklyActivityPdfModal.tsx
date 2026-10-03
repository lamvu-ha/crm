import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  X, 
  Calendar, 
  User, 
  PhoneCall, 
  Users, 
  Award, 
  ShieldCheck, 
  Edit3, 
  TrendingUp, 
  MessageSquare, 
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Send
} from 'lucide-react';
import { Lead, Appointment, SalesMember } from '../types';
import { 
  getWeekRangeFromDate, 
  buildSalesWeeklyActivityData, 
  exportElementToPdf,
  SalesWeeklyActivityReportData 
} from '../services/pdfReportService';

interface WeeklyActivityPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesMembers: SalesMember[];
  leads: Lead[];
  appointments: Appointment[];
  currentUser: SalesMember;
  onShowToast: (msg: string) => void;
  defaultMemberId?: string;
}

export const WeeklyActivityPdfModal: React.FC<WeeklyActivityPdfModalProps> = ({
  isOpen,
  onClose,
  salesMembers,
  leads,
  appointments,
  currentUser,
  onShowToast,
  defaultMemberId
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isTpkd = currentUser.role === 'tpkd';
  const isSale = currentUser.role === 'sale' || (!isAdmin && !isTpkd);

  const reportRef = useRef<HTMLDivElement>(null);

  // Chọn tuần: Tuần này, tuần trước hoặc tùy chỉnh
  const [weekPreset, setWeekPreset] = useState<'current' | 'previous' | 'custom'>('current');
  const [customStart, setCustomStart] = useState<string>(() => {
    const r = getWeekRangeFromDate();
    return r.startDateStr;
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    const r = getWeekRangeFromDate();
    return r.endDateStr;
  });

  // Chọn chuyên viên
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (defaultMemberId) return defaultMemberId;
    if (isSale) return currentUser.id;
    return currentUser.id;
  });

  // Tùy chọn bảo mật số điện thoại
  const [maskPhone, setMaskPhone] = useState<boolean>(false);

  // Trạng thái tùy biến ghi chú / kế hoạch
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [selfAssessment, setSelfAssessment] = useState<'Xuất sắc' | 'Đạt chỉ tiêu' | 'Cần cố gắng'>('Đạt chỉ tiêu');
  const [weeklyHighlights, setWeeklyHighlights] = useState<string>('');
  const [difficultiesFaced, setDifficultiesFaced] = useState<string>('');
  const [supervisorSupportNeeded, setSupervisorSupportNeeded] = useState<string>('');
  const [nextWeekTargetCalls, setNextWeekTargetCalls] = useState<number>(35);
  const [nextWeekTargetAppointments, setNextWeekTargetAppointments] = useState<number>(2);
  const [nextWeekPlanNotes, setNextWeekPlanNotes] = useState<string>('');

  // Trạng thái xuất file
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Danh sách chuyên viên được phép xem theo phân quyền
  const accessibleMembers = useMemo(() => {
    if (isAdmin) {
      return salesMembers.filter((s) => s.status === 'active');
    }
    if (isTpkd) {
      // TPKD: Bản thân + NVKD thuộc team mình
      const currentTam = currentUser.id === 'sale-tpkd-tam' || (currentUser.name && currentUser.name.toLowerCase().includes('hoài tâm'));
      return salesMembers.filter((s) => {
        if (s.id === currentUser.id) return true;
        if (s.managerId === currentUser.id) return true;
        if (s.team && currentUser.team && s.team.toLowerCase().trim() === currentUser.team.toLowerCase().trim()) return true;
        if (currentTam && (s.name.toLowerCase().includes('minh phúc') || s.email.toLowerCase().includes('minhphuc'))) return true;
        return false;
      });
    }
    // NVKD: Chỉ bản thân
    return salesMembers.filter((s) => s.id === currentUser.id);
  }, [salesMembers, currentUser, isAdmin, isTpkd]);

  // Thành viên đang được chọn
  const activeMember = useMemo(() => {
    const found = salesMembers.find((s) => s.id === selectedMemberId);
    return found || currentUser;
  }, [salesMembers, selectedMemberId, currentUser]);

  // Tính khoảng ngày thực tế
  const activeDateRange = useMemo(() => {
    const now = new Date();
    if (weekPreset === 'current') {
      return getWeekRangeFromDate(now);
    }
    if (weekPreset === 'previous') {
      const prevWeekDate = new Date(now);
      prevWeekDate.setDate(now.getDate() - 7);
      return getWeekRangeFromDate(prevWeekDate);
    }
    // Custom
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startParts = customStart.split('-');
    const endParts = customEnd.split('-');
    const formatVn = (parts: string[]) => parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : customStart;
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
      startDateStr: customStart,
      endDateStr: customEnd,
      weekLabel: `Giai đoạn (${formatVn(startParts)} - ${formatVn(endParts)})`
    };
  }, [weekPreset, customStart, customEnd]);

  // Tạo dữ liệu báo cáo
  const reportData: SalesWeeklyActivityReportData = useMemo(() => {
    return buildSalesWeeklyActivityData(
      activeMember,
      salesMembers,
      leads,
      appointments,
      activeDateRange.startDateStr,
      activeDateRange.endDateStr,
      activeDateRange.weekLabel,
      {
        selfAssessment,
        weeklyHighlights: weeklyHighlights || undefined,
        difficultiesFaced: difficultiesFaced || undefined,
        supervisorSupportNeeded: supervisorSupportNeeded || undefined,
        nextWeekTargetCalls,
        nextWeekTargetAppointments,
        nextWeekPlanNotes: nextWeekPlanNotes || undefined
      }
    );
  }, [
    activeMember,
    salesMembers,
    leads,
    appointments,
    activeDateRange,
    selfAssessment,
    weeklyHighlights,
    difficultiesFaced,
    supervisorSupportNeeded,
    nextWeekTargetCalls,
    nextWeekTargetAppointments,
    nextWeekPlanNotes
  ]);

  if (!isOpen) return null;

  // Xử lý tải file PDF
  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    try {
      const cleanName = (activeMember.name || 'Sales').replace(/\s+/g, '_');
      const fileName = `Bao_Cao_Tuan_${cleanName}_${activeDateRange.startDateStr}_den_${activeDateRange.endDateStr}.pdf`;
      await exportElementToPdf(reportRef.current, fileName);
      onShowToast(`Đã xuất và tải báo cáo PDF cho chuyên viên ${activeMember.name} thành công!`);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      onShowToast('Không thể tạo file PDF. Vui lòng thử in trực tiếp bằng trình duyệt!');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Xử lý in qua trình duyệt
  const handlePrint = () => {
    window.print();
  };

  // Xử lý sao chép tóm tắt văn bản (Zalo / Viber)
  const handleCopySummary = () => {
    const summaryText = `[BÁO CÁO HOẠT ĐỘNG TUẦN - SALEPRO HCM_E05]
Chuyên viên: ${reportData.member.name} (${reportData.member.role === 'tpkd' ? 'TPKD' : 'NVKD'} - ${reportData.member.team || 'MAY_MH5.19'})
Kính gửi: TPKD ${reportData.tpkd?.name || 'Trưởng phòng'} & GĐKD Nguyễn Đức Huy
Thời gian: ${reportData.weekLabel}

1. KẾT QUẢ CUỘC GỌI & TƯƠNG TÁC:
- Số khách đã gọi: ${reportData.totalCallsCount} khách
- Kết nối thành công / Nghe máy: ${reportData.successfulCallsCount} (${reportData.callSuccessRate}%)
- Hẹn gọi lại: ${reportData.callbackCallsCount}
- Chưa liên hệ được: ${reportData.unreachableCallsCount}

2. KẾT QUẢ LỊCH HẸN BĐS:
- Tổng số lịch hẹn đã tạo: ${reportData.totalAppointmentsCount}
- Đã xem / Gặp trực tiếp: ${reportData.completedAppointmentsCount}
- Chờ đi xem: ${reportData.upcomingAppointmentsCount}
- Tỷ lệ thực hiện: ${reportData.appointmentSuccessRate}%

3. KẾT NỐI ZALO & CHĂM SÓC TIỀM NĂNG:
- Số khách kết nối Zalo mới: ${reportData.zaloConnectedCount}
- Khách nét quan tâm cao: ${reportData.hotLeadsCount}
- Cọc / Chốt: ${reportData.depositOrClosedCount}

4. ĐÁNH GIÁ & ĐỀ XUẤT:
- Tự đánh giá: ${reportData.selfAssessment}
- Đề xuất hỗ trợ: ${reportData.supervisorSupportNeeded}
- Mục tiêu tuần tới: ${reportData.nextWeekTargetCalls} cuộc gọi, ${reportData.nextWeekTargetAppointments} lịch hẹn mới.`;

    navigator.clipboard.writeText(summaryText);
    setCopiedText(true);
    onShowToast('Đã sao chép nội dung tóm tắt báo cáo hoạt động tuần vào bộ nhớ tạm!');
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Hàm ẩn số điện thoại
  const formatPhone = (phone: string) => {
    if (!phone) return '—';
    if (!maskPhone) return phone;
    if (phone.length >= 7) {
      return phone.slice(0, 3) + '***' + phone.slice(-4);
    }
    return phone;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER (NO-PRINT) */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  Xuất Báo Cáo Hoạt Động Tuần (PDF)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wide">
                  Gửi Cấp Trên
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 font-medium">
                Thống kê số cuộc gọi, số lịch hẹn đã tạo &amp; đề xuất hỗ trợ từ TPKD / GĐKD
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONTROLS BAR (NO-PRINT) */}
        <div className="no-print bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Filters & Target Member */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Sales Member Selector */}
            {isSale ? (
              <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-amber-300 shadow-2xs font-bold text-amber-950">
                <User className="w-3.5 h-3.5 text-amber-600" />
                <span>Chuyên viên: {currentUser.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                  {currentUser.team || 'MAY_MH5.19'}
                </span>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-600 font-bold flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Chọn chuyên viên:</span>
                </span>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 shadow-2xs"
                >
                  {accessibleMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.id === currentUser.id ? '(Chính bạn)' : `(${m.role === 'tpkd' ? 'TPKD' : 'NVKD'})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Week Preset Selector */}
            <div className="flex items-center space-x-1 bg-white p-0.5 rounded-xl border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setWeekPreset('current')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  weekPreset === 'current'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => setWeekPreset('previous')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  weekPreset === 'previous'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tuần trước
              </button>
              <button
                type="button"
                onClick={() => setWeekPreset('custom')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  weekPreset === 'custom'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tùy chỉnh ngày
              </button>
            </div>

            {/* Custom Date Range if active */}
            {weekPreset === 'custom' && (
              <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-xl border border-slate-300">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-[11px] font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0"
                />
                <span className="text-slate-400 font-bold">→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-[11px] font-bold text-slate-700 bg-transparent border-none p-0 focus:ring-0"
                />
              </div>
            )}

            {/* Mask Phone Toggle */}
            <button
              type="button"
              onClick={() => setMaskPhone(!maskPhone)}
              className={`px-2.5 py-1.5 rounded-xl border font-bold flex items-center space-x-1.5 transition-colors ${
                maskPhone 
                  ? 'bg-amber-50 text-amber-900 border-amber-300' 
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
              }`}
              title="Che 3 số giữa số điện thoại khách hàng khi gửi báo cáo công khai"
            >
              <span>{maskPhone ? '🔒 Đang che SĐT' : '🔓 Hiện đầy đủ SĐT'}</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center space-x-1.5 shadow-2xs transition-colors ${
                isEditingNotes 
                  ? 'bg-amber-100 text-amber-900 border-amber-400' 
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
              <span>{isEditingNotes ? 'Đóng tùy chỉnh' : 'Tùy chỉnh nhận xét'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs transition-colors"
              title="Sao chép nội dung tóm tắt để dán nhanh vào nhóm Zalo báo cáo"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copiedText ? 'Đã sao chép' : 'Copy gửi Zalo'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl flex items-center space-x-1.5 shadow-2xs transition-colors"
              title="In trực tiếp hoặc chọn 'Save as PDF' qua hộp thoại in của trình duyệt"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>In / Lưu PDF</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-extrabold rounded-xl flex items-center space-x-1.5 shadow-xs transition-all disabled:opacity-50"
              title="Tải ngay file PDF chất lượng cao về máy"
            >
              <Download className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span>{isExportingPdf ? 'Đang tạo PDF...' : 'Tải file PDF (.pdf)'}</span>
            </button>
          </div>
        </div>

        {/* CUSTOMIZATION PANEL (IF OPEN, NO-PRINT) */}
        {isEditingNotes && (
          <div className="no-print bg-amber-50/70 border-b border-amber-200 px-4 sm:px-6 py-3.5 shrink-0 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Tùy chỉnh nội dung đánh giá &amp; Kế hoạch gửi cấp trên:</span>
              </span>
              <span className="text-[11px] text-amber-700">
                Các nội dung dưới đây sẽ được in trực tiếp vào bản báo cáo PDF
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tự đánh giá tuần:</label>
                <select
                  value={selfAssessment}
                  onChange={(e) => setSelfAssessment(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                >
                  <option value="Xuất sắc">⭐ Xuất sắc (Vượt chỉ tiêu)</option>
                  <option value="Đạt chỉ tiêu">✓ Đạt chỉ tiêu (Chuẩn KPI)</option>
                  <option value="Cần cố gắng">⚠️ Cần cố gắng (Chưa đạt)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mục tiêu cuộc gọi tuần tới:</label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={nextWeekTargetCalls}
                  onChange={(e) => setNextWeekTargetCalls(Number(e.target.value) || 35)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mục tiêu lịch hẹn tuần tới:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={nextWeekTargetAppointments}
                  onChange={(e) => setNextWeekTargetAppointments(Number(e.target.value) || 2)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Đề xuất cấp trên hỗ trợ (TPKD &amp; GĐKD):</label>
                <textarea
                  rows={2}
                  value={supervisorSupportNeeded}
                  onChange={(e) => setSupervisorSupportNeeded(e.target.value)}
                  placeholder="VD: Đề xuất TPKD hỗ trợ đi gặp khách VIP vào thứ 7, xin chính sách thanh toán sớm cho khách dự án Meyhomes..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kế hoạch hành động tuần tới:</label>
                <textarea
                  rows={2}
                  value={nextWeekPlanNotes}
                  onChange={(e) => setNextWeekPlanNotes(e.target.value)}
                  placeholder="VD: Bám sát tệp 10 khách quan tâm cao, đặt lịch đi thực tế công trình, đẩy mạnh gọi lại nhóm khách hẹn giờ..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* SCROLLABLE PDF DOCUMENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70">
          {/* A4 REPORT PREVIEW CARD */}
          <div 
            id="printable-weekly-report"
            ref={reportRef}
            className="max-w-[210mm] mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-6 sm:p-10 text-slate-800 text-xs font-sans print:shadow-none print:border-none print:p-0 print:m-0"
            style={{ minHeight: '297mm', boxSizing: 'border-box' }}
          >
            {/* 1. DOCUMENT HEADER */}
            <div className="border-b-2 border-slate-800 pb-4 mb-5">
              <div className="flex flex-row items-center justify-between gap-4">
                <div>
                  <div className="text-[13px] font-extrabold uppercase tracking-wider text-amber-700 font-sans">
                    HỆ THỐNG QUẢN TRỊ BẤT ĐỘNG SẢN SALEPRO HCM_E05
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    HỆ THỐNG QUẢN TRỊ BÁN HÀNG &amp; CHĂM SÓC KHÁCH HÀNG CRM (HCM_E05)
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-slate-500">
                    Mã BC: <strong className="text-slate-800 font-mono">BC-SALES-{reportData.member.id.replace('sale-', '')}-{activeDateRange.startDateStr.replace(/-/g, '')}</strong>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Xuất lúc: <span className="font-semibold text-slate-700">{reportData.generatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="mt-5 text-center">
                <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-950 tracking-tight">
                  BÁO CÁO HOẠT ĐỘNG KINH DOANH TUẦN
                </h1>
                <p className="text-xs sm:text-sm font-bold text-amber-800 mt-1">
                  {reportData.weekLabel} • (Từ ngày {reportData.startDate} đến hết {reportData.endDate})
                </p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase">
                  Tài liệu nội bộ • Báo cáo định kỳ nộp cấp trên
                </div>
              </div>
            </div>

            {/* 2. REPORTERS & SUPERVISORS INFO BOX */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              {/* Bên lập báo cáo */}
              <div className="border-r border-slate-200 pr-3 space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-amber-600 inline" />
                  <span>I. CHUYÊN VIÊN THỰC HIỆN BÁO CÁO</span>
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  {reportData.member.name}
                </div>
                <div className="text-[11px] text-slate-600">
                  Chức vụ: <strong>{reportData.member.role === 'tpkd' ? 'Trưởng phòng KD (TPKD)' : 'Chuyên viên tư vấn BĐS'}</strong>
                </div>
                <div className="text-[11px] text-slate-600">
                  Đội ngũ: <strong>{reportData.member.team || 'MAY_MH5.19'}</strong>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  SĐT: {reportData.member.phone || '09xx'} • Email: {reportData.member.email}
                </div>
              </div>

              {/* Cấp trên tiếp nhận */}
              <div className="pl-2 space-y-1">
                <div className="text-[10px] font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-600 inline" />
                  <span>II. CẤP TRÊN TIẾP NHẬN BÁO CÁO</span>
                </div>
                <div className="text-[11px] text-slate-800">
                  <span className="font-bold text-slate-900">1. Trưởng phòng KD (TPKD):</span>{' '}
                  <span className="font-extrabold text-amber-900">{reportData.tpkd?.name || 'Phan Bích Chi'}</span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Email: {reportData.tpkd?.email || 'bichchilk2023@gmail.com'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-800 pt-0.5">
                  <span className="font-bold text-slate-900">2. Giám đốc KD (GĐKD):</span>{' '}
                  <span className="font-extrabold text-amber-900">Nguyễn Đức Huy</span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    Email: happyhuy2812@gmail.com • ĐT: 0901394143
                  </span>
                </div>
              </div>
            </div>

            {/* 3. CORE METRICS SUMMARY TILES */}
            <div className="mb-5">
              <div className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span>III. TỔNG HỢP CHỈ SỐ HOẠT ĐỘNG TRONG TUẦN</span>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {/* Tile 1: Cuộc gọi */}
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-300">
                  <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center justify-between">
                    <span>1. Khách Đã Gọi</span>
                    <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-950 mt-1">
                    {reportData.totalCallsCount} <span className="text-xs font-normal text-slate-500">khách</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-amber-200 text-[10px] text-slate-600 space-y-0.5">
                    <div>• Nghe máy: <strong className="text-emerald-700">{reportData.successfulCallsCount}</strong> ({reportData.callSuccessRate}%)</div>
                    <div>• Hẹn gọi lại: <strong>{reportData.callbackCallsCount}</strong></div>
                    <div>• Chưa liên hệ: <strong>{reportData.unreachableCallsCount}</strong></div>
                  </div>
                </div>

                {/* Tile 2: Lịch hẹn */}
                <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-300">
                  <div className="text-[10px] font-bold text-purple-800 uppercase flex items-center justify-between">
                    <span>2. Lịch Hẹn Tạo</span>
                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-950 mt-1">
                    {reportData.totalAppointmentsCount} <span className="text-xs font-normal text-slate-500">cuộc hẹn</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-purple-200 text-[10px] text-slate-600 space-y-0.5">
                    <div>• Đã xem / Gặp: <strong className="text-purple-800">{reportData.completedAppointmentsCount}</strong></div>
                    <div>• Chờ đi xem: <strong>{reportData.upcomingAppointmentsCount}</strong></div>
                    <div>• Tỷ lệ đạt: <strong>{reportData.appointmentSuccessRate}%</strong></div>
                  </div>
                </div>

                {/* Tile 3: Zalo */}
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase flex items-center justify-between">
                    <span>3. Kết Nối Zalo</span>
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    {reportData.zaloConnectedCount} <span className="text-xs font-normal text-slate-500">khách</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-emerald-200 text-[10px] text-slate-600 space-y-0.5">
                    <div>• Chỉ tiêu: <strong>12 - 14 khách/tuần</strong></div>
                    <div>• Tỷ lệ đạt: <strong>{Math.round((reportData.zaloConnectedCount / 12) * 100)}%</strong></div>
                    <div>• Trạng thái: <strong className={reportData.zaloConnectedCount >= 10 ? 'text-emerald-700' : 'text-amber-700'}>{reportData.zaloConnectedCount >= 10 ? 'Tốt' : 'Cần tăng tốc'}</strong></div>
                  </div>
                </div>

                {/* Tile 4: Tiềm năng & Cọc */}
                <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-300">
                  <div className="text-[10px] font-bold text-blue-800 uppercase flex items-center justify-between">
                    <span>4. Khách Nét &amp; Cọc</span>
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-950 mt-1">
                    {reportData.hotLeadsCount} <span className="text-xs font-normal text-slate-500">khách nét</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-blue-200 text-[10px] text-slate-600 space-y-0.5">
                    <div>• Cọc / Chốt: <strong className="text-rose-600">{reportData.depositOrClosedCount} hợp đồng</strong></div>
                    <div>• Tổng Lead quản lý: <strong>{reportData.totalLeadsAssigned}</strong></div>
                    <div>• Đánh giá: <strong className="text-blue-900">{reportData.selfAssessment}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. TABLE: CUỘC GỌI CHI TIẾT TRONG TUẦN */}
            <div className="mb-5 print-avoid-break">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  <span>IV. CHI TIẾT CÁC KHÁCH HÀNG ĐÃ GỌI ĐIỆN / TƯƠNG TÁC TRONG TUẦN ({reportData.calls.length})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Căn cứ nhật ký tương tác CRM &amp; Trạng thái cuộc gọi
                </span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 w-8 text-center">STT</th>
                      <th className="p-2 min-w-[130px]">Khách hàng</th>
                      <th className="p-2 min-w-[90px]">Số điện thoại</th>
                      <th className="p-2 min-w-[110px]">Dự án quan tâm</th>
                      <th className="p-2 min-w-[90px]">Ngày gọi</th>
                      <th className="p-2 min-w-[120px]">Kết quả cuộc gọi</th>
                      <th className="p-2 min-w-[160px]">Nội dung tư vấn / Ghi chú mới nhất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.calls.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                          Chưa có dữ liệu cuộc gọi nào được ghi nhận trong tuần này.
                        </td>
                      </tr>
                    ) : (
                      reportData.calls.slice(0, 30).map((call, idx) => (
                        <tr key={call.leadId || idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">
                            {call.leadName}
                            {call.potentialLevel && (
                              <span className={`ml-1 text-[9px] px-1 py-0.2 rounded font-extrabold ${
                                call.potentialLevel === 'Nóng' 
                                  ? 'bg-red-100 text-red-700' 
                                  : call.potentialLevel === 'Ấm' 
                                    ? 'bg-amber-100 text-amber-800' 
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {call.potentialLevel}
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-mono text-slate-700">{formatPhone(call.phone)}</td>
                          <td className="p-2 text-slate-700 font-medium">{call.project}</td>
                          <td className="p-2 font-mono text-slate-600">{call.callDate}</td>
                          <td className="p-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              call.callStatus.includes('nghe') || call.callStatus.includes('quan tâm') || call.callStatus.includes('Zalo')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : call.callStatus.includes('hẹn')
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700'
                            }`}>
                              {call.callStatus}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 text-[10px] leading-tight max-w-[220px] truncate" title={call.latestNote}>
                            {call.latestNote}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {reportData.calls.length > 30 && (
                  <div className="bg-slate-50 p-2 text-center text-[10px] text-slate-500 border-t border-slate-200 italic">
                    (Hiển thị 30 / {reportData.calls.length} khách hàng đã gọi trong tuần. Danh sách đầy đủ được lưu trên hệ thống CRM).
                  </div>
                )}
              </div>
            </div>

            {/* 5. TABLE: LỊCH HẸN CHI TIẾT TRONG TUẦN */}
            <div className="mb-5 print-avoid-break">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>V. CHI TIẾT LỊCH HẸN GẶP TRỰC TIẾP &amp; THAM QUAN DỰ ÁN ({reportData.appointments.length})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Chỉ tiêu: ≥ 2 cuộc hẹn / tuần
                </span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[10.5px]">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 w-8 text-center">STT</th>
                      <th className="p-2 min-w-[130px]">Khách hàng</th>
                      <th className="p-2 min-w-[90px]">Số điện thoại</th>
                      <th className="p-2 min-w-[120px]">Dự án</th>
                      <th className="p-2 min-w-[110px]">Thời gian hẹn</th>
                      <th className="p-2 min-w-[120px]">Địa điểm</th>
                      <th className="p-2 min-w-[100px]">Trạng thái</th>
                      <th className="p-2 min-w-[150px]">Ghi chú kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.appointments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                          Chưa có lịch hẹn nào được tạo trong tuần này.
                        </td>
                      </tr>
                    ) : (
                      reportData.appointments.map((app, idx) => (
                        <tr key={app.appointmentId || idx} className="hover:bg-slate-50">
                          <td className="p-2 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{app.leadName}</td>
                          <td className="p-2 font-mono text-slate-700">{formatPhone(app.phone)}</td>
                          <td className="p-2 text-slate-700 font-medium">{app.project}</td>
                          <td className="p-2 font-mono text-slate-700">
                            <strong>{app.time}</strong> • {app.date}
                          </td>
                          <td className="p-2 text-slate-600">{app.location}</td>
                          <td className="p-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              app.status === 'Đã xem'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : app.status === 'Chờ đi xem'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                            }`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 text-[10px]">{app.note}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. SELF ASSESSMENT & SUPERVISOR SUPPORT REQUESTS */}
            <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 print-avoid-break space-y-2.5">
              <div className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                <span>VI. TỰ ĐÁNH GIÁ &amp; ĐỀ XUẤT CẤP TRÊN HỖ TRỢ</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-800">1. Đánh giá hoàn thành KPI tuần:</span>{' '}
                    <span className={`font-black px-2 py-0.5 rounded ${
                      reportData.selfAssessment === 'Xuất sắc' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : reportData.selfAssessment === 'Đạt chỉ tiêu'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {reportData.selfAssessment}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <strong className="text-slate-800">2. Điểm nổi bật:</strong> {reportData.weeklyHighlights}
                  </div>
                  <div className="text-slate-600">
                    <strong className="text-slate-800">3. Khó khăn vướng mắc:</strong> {reportData.difficultiesFaced}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-slate-800">
                    <strong className="text-amber-900 font-extrabold">4. Đề xuất TPKD &amp; GĐKD hỗ trợ:</strong>
                    <div className="mt-1 p-2 bg-white rounded-lg border border-amber-200 text-slate-700 leading-snug">
                      {reportData.supervisorSupportNeeded}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next week plan */}
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-700">
                <span className="font-extrabold text-slate-900 uppercase tracking-wide">
                  VII. CAM KẾT MỤC TIÊU &amp; KẾ HOẠCH TUẦN KẾ TIẾP:
                </span>
                <div className="mt-1 flex items-center gap-4 flex-wrap font-bold">
                  <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    📞 Mục tiêu gọi: <strong>{reportData.nextWeekTargetCalls} khách</strong>
                  </span>
                  <span className="text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    🤝 Mục tiêu lịch hẹn: <strong>{reportData.nextWeekTargetAppointments} cuộc hẹn</strong>
                  </span>
                  <span className="text-slate-600 font-normal">
                    Kế hoạch cụ thể: {reportData.nextWeekPlanNotes}
                  </span>
                </div>
              </div>
            </div>

            {/* 7. THREE-PARTY SIGNATURE BLOCK */}
            <div className="mt-8 pt-4 border-t border-slate-300 print-avoid-break">
              <div className="grid grid-cols-3 gap-4 text-center">
                {/* Signer 1: Sales Member */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    NGƯỜI LẬP BÁO CÁO
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    (Ký và ghi rõ họ tên)
                  </div>
                  <div className="h-16 flex items-end justify-center font-bold text-slate-800 text-sm">
                    {reportData.member.name}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Chuyên viên tư vấn
                  </div>
                </div>

                {/* Signer 2: TPKD */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    TRƯỞNG PHÒNG KINH DOANH
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    (Xem xét &amp; Nhận xét)
                  </div>
                  <div className="h-16 flex items-end justify-center font-bold text-slate-800 text-sm">
                    {reportData.tpkd?.name || 'Phan Bích Chi'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    TPKD phụ trách
                  </div>
                </div>

                {/* Signer 3: GĐKD */}
                <div className="space-y-1">
                  <div className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                    GIÁM ĐỐC KINH DOANH (GĐKD)
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    (Phê duyệt)
                  </div>
                  <div className="h-16 flex items-end justify-center font-bold text-slate-800 text-sm">
                    Nguyễn Đức Huy
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Giám đốc kinh doanh
                  </div>
                </div>
              </div>
            </div>

            {/* Document footer note */}
            <div className="mt-8 text-center text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-2">
              Hệ thống SALEPRO HCM_E05 CRM • Báo cáo được tạo tự động và xác thực dữ liệu theo thời gian thực
            </div>
          </div>
        </div>

        {/* MODAL FOOTER (NO-PRINT) */}
        <div className="no-print px-4 sm:px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Định dạng chuẩn A4. Bạn có thể bấm <strong>"Tải file PDF"</strong> hoặc <strong>"In / Lưu PDF"</strong> qua trình duyệt.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải file PDF ngay'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
