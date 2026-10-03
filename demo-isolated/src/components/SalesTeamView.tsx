import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shuffle, 
  UserCheck, 
  ArrowRightLeft, 
  Phone, 
  Mail, 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  Power, 
  TrendingUp, 
  Award, 
  Briefcase,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  Lock,
  Send,
  ShieldAlert,
  Trophy,
  Play,
  CheckCircle2,
  Zap,
  BarChart3,
  FileText
} from 'lucide-react';
import { Lead, SalesMember, UserRole, AutoDistributionPolicy } from '../types';
import { TARGET_NVKD_SHEET_NAME } from '../services/googleSheetsService';
import { calculateSalesPerformance } from '../services/leadDistributionService';
import { WeeklySlaPerformanceChart } from './WeeklySlaPerformanceChart';

interface SalesTeamViewProps {
  salesMembers: SalesMember[];
  leads: Lead[];
  currentUser: SalesMember;
  onUpdateMemberStatus: (memberId: string, newStatus: 'active' | 'paused') => void;
  onAddSalesMember: (newMember: Omit<SalesMember, 'id'>) => void;
  onOpenTransferModalForSale: (saleName: string) => void;
  onAutoDistributeUnassigned: () => void;
  onSwitchUser: (member: SalesMember) => void;
  onOpenSyncNvkdModal?: () => void;
  onOpenChangePasswordModal?: (member: SalesMember) => void;
  onOpenPolicyModal?: () => void;
  onTriggerSlaCheck?: () => void;
  onOpenSundayReportModal?: () => void;
  onOpenWeeklyPdfModal?: (memberId?: string) => void;
  policy?: AutoDistributionPolicy;
  onOpenPersonalPerformance?: (saleName?: string) => void;
}

export const SalesTeamView: React.FC<SalesTeamViewProps> = ({
  salesMembers,
  leads,
  currentUser,
  onUpdateMemberStatus,
  onAddSalesMember,
  onOpenTransferModalForSale,
  onAutoDistributeUnassigned,
  onSwitchUser,
  onOpenSyncNvkdModal,
  onOpenChangePasswordModal,
  onOpenPolicyModal,
  onTriggerSlaCheck,
  onOpenSundayReportModal,
  onOpenWeeklyPdfModal,
  policy,
  onOpenPersonalPerformance
}) => {
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [showSlaChart, setShowSlaChart] = useState(true);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTitle, setNewTitle] = useState('Chuyên viên tư vấn BĐS');
  const [newRole, setNewRole] = useState<UserRole>('sale');
  const [newTeam, setNewTeam] = useState('Phòng MAY_MH5.19');

  // Compute stats and performance scores per sale
  const performanceScores = calculateSalesPerformance(salesMembers, leads);
  const performanceMap = new Map(performanceScores.map((p) => [p.member.id, p]));

  const salesStats = salesMembers.map((member) => {
    const perf = performanceMap.get(member.id);
    const memberLeads = leads.filter((l) => l.assignee === member.name);
    const closedLeads = memberLeads.filter((l) => l.status === 'Đã chốt');
    const closeRate = memberLeads.length > 0 
      ? Math.round((closedLeads.length / memberLeads.length) * 100) 
      : 0;
    const totalDealValue = closedLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);

    return {
      member,
      leadCount: memberLeads.length,
      closedCount: closedLeads.length,
      closeRate,
      totalDealValue,
      perf
    };
  });

  const unassignedCount = leads.filter(
    (l) => !l.assignee || l.assignee === 'Chưa phân công' || l.assignee.trim() === ''
  ).length;

  const activeSalesCount = salesMembers.filter((s) => s.status === 'active').length;

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPhone.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin nhân sự!');
      return;
    }

    onAddSalesMember({
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim(),
      title: newTitle.trim(),
      role: newRole,
      team: newTeam.trim(),
      status: 'active',
      password: '123',
      color: 'bg-indigo-600'
    });

    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setIsAddMemberOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-4 sm:p-6 text-white shadow-sm space-y-4">
        {/* Top Row: Information & Quick Add */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[11px] tracking-wide uppercase border border-amber-400/30 whitespace-nowrap">
                Quản trị đội ngũ &amp; phân bổ
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-slate-300 text-xs font-medium whitespace-nowrap">
                {salesMembers.length} chuyên viên ({activeSalesCount} đang nhận Lead)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              Danh sách sale &amp; cơ chế tự động phân bổ lead
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Hệ thống phân chia khách hàng thông minh xoay vòng (Round-Robin) công bằng cho các chuyên viên, hỗ trợ bàn giao chuyển khách hàng 1 chạm và mỗi sale đăng nhập không gian quản lý riêng biệt.
            </p>
          </div>

          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-2 shrink-0 self-start">
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center px-3.5 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <UserPlus className="w-4 h-4 mr-1.5 text-amber-300" />
                <span>Thêm chuyên viên</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Toolbar: Management & Automation Actions */}
        <div className="pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2 sm:gap-2.5">
          {currentUser.role === 'admin' && onOpenPolicyModal && (
            <button
              onClick={onOpenPolicyModal}
              className="inline-flex items-center px-3 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-rose-500"
              title="Cấu hình quy chế tiếp nhận, báo cáo và tự động thu hồi khách khi sale làm việc không tốt"
            >
              <ShieldAlert className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Chính sách phân bổ &amp; SLA</span>
            </button>
          )}

          {onOpenSundayReportModal && (
            <button
              onClick={onOpenSundayReportModal}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-amber-400/40"
              title="Xem báo cáo KPI tuần (2 khách Zalo/ngày, 2 hẹn gặp/tuần) & Gửi Email tối Chủ Nhật cho GĐKD, TPKD & CC Sale"
            >
              <Mail className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Báo cáo tuần (Tối CN)</span>
            </button>
          )}

          {onOpenWeeklyPdfModal && (
            <button
              onClick={() => onOpenWeeklyPdfModal()}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-rose-400/40"
              title="Xuất báo cáo PDF hoạt động tuần (Cuộc gọi, lịch hẹn, kết quả kinh doanh) nộp cấp trên"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Báo cáo PDF tuần</span>
            </button>
          )}

          {currentUser.role === 'admin' && onTriggerSlaCheck && (
            <button
              onClick={onTriggerSlaCheck}
              className="inline-flex items-center px-3 py-2 bg-slate-700/90 hover:bg-slate-600 active:scale-95 text-slate-100 rounded-xl text-xs font-bold shadow-xs transition-all border border-slate-600"
              title="Kiểm tra ngay hạn tiếp nhận và báo cáo của các Sale để thu hồi lead quá hạn"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-amber-400 shrink-0" />
              <span>Quét thu hồi SLA</span>
            </button>
          )}

          <button
            onClick={() => onAutoDistributeUnassigned()}
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            title="Chia khách mới theo chính sách ưu tiên hiệu suất cao"
          >
            <Shuffle className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>Tự động chia lead ({unassignedCount} chờ)</span>
          </button>

          {currentUser.role === 'admin' && onOpenSyncNvkdModal && (
            <button
              onClick={onOpenSyncNvkdModal}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all border border-amber-400/30"
              title={`Nhập danh sách NVKD từ file Google Sheet ${TARGET_NVKD_SHEET_NAME} & Gửi email thông tin tài khoản`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-amber-200 shrink-0" />
              <span>Nhập NVKD (Google Sheet)</span>
            </button>
          )}

          <button
            id="btn-toggle-sla-chart"
            onClick={() => setShowSlaChart(!showSlaChart)}
            className={`inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all border cursor-pointer ${
              showSlaChart
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            title="Bật/Tắt biểu đồ cột hiển thị hiệu suất tiếp nhận và phản hồi SLA của từng nhân viên sale trong tuần"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            <span>{showSlaChart ? 'Ẩn Biểu Đồ SLA Tuần' : '📊 Xem Biểu Đồ SLA Tuần'}</span>
          </button>
        </div>
      </div>

      {/* Weekly SLA Performance Bar Chart for Sales Team */}
      {showSlaChart && (
        <WeeklySlaPerformanceChart
          leads={leads}
          salesMembers={salesMembers}
          onSelectSale={onOpenTransferModalForSale}
        />
      )}

      {/* Unassigned Leads Warning if any */}
      {unassignedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Hiện đang có <strong>{unassignedCount} khách hàng mới</strong> chưa được phân công chuyên viên chăm sóc.
            </span>
          </div>
          <button
            onClick={onAutoDistributeUnassigned}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shrink-0 shadow-2xs"
          >
            Chia đều ngay (Round-Robin)
          </button>
        </div>
      )}

      {/* Grid of Sales Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {salesStats.map(({ member, leadCount, closedCount, closeRate, totalDealValue, perf }) => {
          const isCurrentUser = member.id === currentUser.id;
          const isActive = member.status === 'active';

          return (
            <div
              key={member.id}
              className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between ${
                isCurrentUser 
                  ? 'border-amber-400 ring-2 ring-amber-400/20' 
                  : 'border-slate-200'
              }`}
            >
              <div className="p-4 sm:p-5 space-y-3.5">
                {/* Sale Header */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-xs">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 bg-amber-100 text-base">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={isActive ? 'Đang nhận Lead' : 'Tạm ngưng nhận'}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {member.name}
                        </h4>
                        {member.role === 'admin' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                            Admin
                          </span>
                        )}
                        {member.role === 'tpkd' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 shrink-0">
                            TPKD
                          </span>
                        )}
                        {member.role === 'sale' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                            NVKD
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{member.title}</p>
                      {member.team && (
                        <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">
                          🏢 {member.team}
                        </p>
                      )}
                      {isCurrentUser && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded inline-block mt-0.5">
                          ⭐ Tài khoản hiện tại của bạn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Active / Pause Toggle Button */}
                  {currentUser.role === 'admin' || isCurrentUser ? (
                    <button
                      onClick={() => onUpdateMemberStatus(member.id, isActive ? 'paused' : 'active')}
                      className={`p-1.5 rounded-xl border text-xs transition-colors shrink-0 ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                      }`}
                      title={isActive ? 'Bấm để Tạm ngưng nhận khách mới' : 'Bấm để Kích hoạt nhận khách tự động'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span
                      className={`p-1.5 rounded-xl border text-xs shrink-0 ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-slate-100 border-slate-200 text-slate-400'
                      }`}
                      title={isActive ? 'Đang nhận khách tự động' : 'Tạm ngưng nhận khách'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Contact quick links */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <a href={`tel:${member.phone}`} className="flex items-center hover:text-amber-600 transition-colors">
                    <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {member.phone}
                  </a>
                  <a href={`mailto:${member.email}`} className="flex items-center hover:text-amber-600 transition-colors truncate max-w-[140px]">
                    <Mail className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </a>
                </div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Đang chăm</div>
                    <div className="text-sm font-bold text-slate-800">{leadCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Đã chốt</div>
                    <div className="text-sm font-bold text-emerald-600">{closedCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Tỷ lệ chốt</div>
                    <div className="text-sm font-bold text-amber-700">{closeRate}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-medium">Điểm SLA</div>
                    <div className="text-sm font-bold text-indigo-600">
                      {perf?.performanceScore ?? 50}đ
                    </div>
                  </div>
                </div>

                {/* Performance Tier & SLA Compliance Banner */}
                <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200 flex items-center justify-between text-[11px]">
                  <div className="flex items-center space-x-1.5">
                    <Trophy className={`w-3.5 h-3.5 ${
                      perf?.tier === 'VIP' ? 'text-amber-500' :
                      perf?.tier === 'Tốt' ? 'text-emerald-500' :
                      perf?.tier === 'Đạt' ? 'text-blue-500' : 'text-slate-400'
                    }`} />
                    <span className="font-bold text-slate-800">
                      Xếp hạng: <span className={`px-1.5 py-0.2 rounded font-bold ${
                        perf?.tier === 'VIP' ? 'bg-rose-100 text-rose-700' :
                        perf?.tier === 'Tốt' ? 'bg-emerald-100 text-emerald-700' :
                        perf?.tier === 'Đạt' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'
                      }`}>{perf?.tier || 'Đạt'}</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Phạt quá hạn: <strong className={perf?.slaBreachCount ? 'text-rose-600 font-bold' : 'text-emerald-600'}>{perf?.slaBreachCount || 0}</strong>
                  </div>
                </div>

                {/* Lead distribution status badge */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Trạng thái nhận Lead:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                      isActive 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isActive 
                      ? (policy?.performancePriority ? `● Nhận ưu tiên (${perf?.tier === 'VIP' ? '3x' : perf?.tier === 'Tốt' ? '2x' : '1x'})` : '● Sẵn sàng nhận (Round-Robin)') 
                      : '○ Tạm ngưng nhận Lead'}
                  </span>
                </div>

                {/* Password & Onboarding Status - Only visible to Admin or the user themselves */}
                {(currentUser.role === 'admin' || isCurrentUser) && member.mustChangePassword && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-[11px] text-amber-900">
                    <div className="flex items-center space-x-1.5 truncate pr-1">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Pass mặc định: <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">CHANGE_ME_BEFORE_USE</code></span>
                    </div>
                    {onOpenChangePasswordModal && (
                      <button
                        type="button"
                        onClick={() => onOpenChangePasswordModal(member)}
                        className="text-[10px] font-bold text-amber-800 hover:underline shrink-0 ml-1"
                      >
                        Đổi pass
                      </button>
                    )}
                  </div>
                )}

                {member.emailSent && (
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-700 font-medium">
                    <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Đã gửi email thông tin đăng nhập qua Gmail</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => onOpenTransferModalForSale(member.name)}
                  disabled={leadCount === 0}
                  className="inline-flex items-center text-slate-700 hover:text-amber-800 font-medium disabled:opacity-40 transition-colors"
                  title="Chuyển giao khách hàng của sale này sang sale khác"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Bàn giao ({leadCount})
                </button>

                <div className="flex items-center space-x-1.5">
                  {onOpenPersonalPerformance && (
                    <button
                      type="button"
                      onClick={() => onOpenPersonalPerformance(member.name)}
                      className="inline-flex items-center text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-lg border border-violet-200 text-[11px] font-bold shadow-2xs transition-colors"
                      title={`Xem biểu đồ hình tròn Recharts tỷ lệ chuyển đổi Hẹn xem của ${member.name}`}
                    >
                      <TrendingUp className="w-3 h-3 mr-1 text-violet-600" />
                      <span>Tỷ lệ Hẹn</span>
                    </button>
                  )}

                  {onOpenWeeklyPdfModal && (
                    <button
                      type="button"
                      onClick={() => onOpenWeeklyPdfModal(member.id)}
                      className="inline-flex items-center text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 text-[11px] font-bold shadow-2xs transition-colors"
                      title={`Xuất báo cáo PDF hoạt động tuần của ${member.name}`}
                    >
                      <FileText className="w-3 h-3 mr-1 text-rose-600" />
                      <span>PDF</span>
                    </button>
                  )}

                  {!isCurrentUser ? (
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      Độc lập
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Bạn
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Thêm chuyên viên kinh doanh mới
                </h3>
              </div>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Họ và tên chuyên viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="VD: Trần Đình Khang"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="VD: 0909123456"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email công ty (Dùng để đăng nhập) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="VD: nvkd@gmail.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chức danh / Vị trí phụ trách
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Chuyên viên BĐS Nhà Phố / Biệt Thự"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Phòng ban / Đội ngũ (Team)
                </label>
                <input
                  type="text"
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder="VD: Phòng MAY_MH5.19"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vai trò phân quyền <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="sale">Chuyên viên kinh doanh (NVKD) - Chỉ xem khách của mình, cấm xuất dữ liệu</option>
                  <option value="tpkd">Trưởng phòng kinh doanh (TPKD) - Xem full khách NVKD trong phòng, cấm xuất dữ liệu</option>
                  <option value="admin">Giám đốc / Quản trị viên (Admin) - Toàn quyền điều phối toàn công ty & xuất file CSV</option>
                </select>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
                * Mật khẩu đăng nhập ban đầu mặc định là <strong>123</strong>. Nhân viên có thể đăng nhập ngay hoặc sử dụng bộ chuyển đổi tài khoản 1 chạm.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-2xs"
                >
                  Tạo chuyên viên mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
