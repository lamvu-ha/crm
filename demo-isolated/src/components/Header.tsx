import React from 'react';
import { 
  Building2, 
  Plus, 
  Download, 
  Upload, 
  FileSpreadsheet,
  Table, 
  Kanban, 
  CalendarDays, 
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Users,
  KeyRound,
  ShieldCheck,
  ChevronDown,
  Mail,
  Bell,
  Database,
  Sparkles,
  TrendingUp,
  FileText,
  MessageSquare,
  MessageSquareText,
  Settings,
  Target,
  PieChart as PieChartIcon
} from 'lucide-react';
import { ViewMode, SalesMember } from '../types';

interface HeaderProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenAddModal: () => void;
  onExportCSV: () => void;
  onOpenImportModal: () => void;
  onOpenGoogleSheetSync: () => void;
  onOpenSyncNvkdSheet?: () => void;
  onOpenDatabaseModal?: () => void;
  onOpenZaloTemplates?: () => void;
  onOpenSettings?: (tab?: 'zalo_templates' | 'kpi' | 'distribution' | 'account') => void;
  onOpenAdminCms?: () => void;
  onOpenAdminCmsTab?: (tab: 'customer_file' | 'staff' | 'database') => void;
  onResetData: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCount: number;
  currentUser: SalesMember;
  salesCount: number;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
  onOpenSundayReportModal?: () => void;
  onOpenWeeklyPdfModal?: (memberId?: string) => void;
  unreadNotificationsCount?: number;
  onOpenNotifications?: () => void;
  unreadChatCount?: number;
  onOpenInternalChat?: () => void;
  upcomingAppointments30mCount?: number;
  onOpenPersonalPerformance?: (saleName?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenAddModal,
  onExportCSV,
  onOpenImportModal,
  onOpenGoogleSheetSync,
  onOpenSyncNvkdSheet,
  onResetData,
  searchTerm,
  onSearchChange,
  selectedCount,
  currentUser,
  salesCount,
  onOpenLoginModal,
  onLogout,
  onOpenChangePassword,
  onOpenSundayReportModal,
  onOpenWeeklyPdfModal,
  unreadNotificationsCount = 0,
  onOpenNotifications,
  unreadChatCount = 0,
  onOpenInternalChat,
  upcomingAppointments30mCount = 0,
  onOpenDatabaseModal,
  onOpenZaloTemplates,
  onOpenSettings,
  onOpenPersonalPerformance,
  onOpenAdminCms,
  onOpenAdminCmsTab
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="py-2 sm:py-3">
          {/* Row 1: Logo & User Switcher / Mobile Action Controls */}
          <div className="flex items-center justify-between gap-2">
            {/* Logo & Identity */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-xs shadow-amber-200 shrink-0">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 tracking-tight leading-tight truncate">
                    SALEPRO HCM_E05
                  </h1>
                  <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs">
                    BĐS PRO
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium leading-tight truncate hidden xs:block">
                  Quản trị lead • Phân bổ kinh doanh • Phễu chốt cọc
                </p>
              </div>
            </div>

            {/* User Account / Profile Controls */}
            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              {currentUser.role === 'admin' ? (
                <button
                  onClick={onOpenLoginModal}
                  className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl transition-all text-left cursor-pointer"
                  title="Quản trị chuyển đổi tài khoản (Quyền Admin)"
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-amber-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="hidden xs:block min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[85px] sm:max-w-[110px]">
                        {currentUser.name}
                      </span>
                      <span className="text-[9px] px-1 rounded font-semibold bg-amber-200/80 text-amber-900">
                        Admin
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-0.5 leading-none">
                      <span>Đổi tài khoản</span>
                      <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                    </div>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenPersonalPerformance && onOpenPersonalPerformance(currentUser.name)}
                  className="flex items-center space-x-1.5 px-2 sm:px-2.5 py-1.5 bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer"
                  title={`Tài khoản cá nhân: ${currentUser.name} - Bấm xem biểu đồ chuyển đổi Hẹn xem`}
                >
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden bg-blue-600 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      currentUser.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="hidden xs:block min-w-0">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[85px] sm:max-w-[110px]">
                        {currentUser.name}
                      </span>
                      <span className={`text-[9px] px-1 rounded font-semibold ${
                        currentUser.role === 'tpkd'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {currentUser.role === 'tpkd' ? 'TPKD' : 'NVKD'}
                      </span>
                    </div>
                    <div className="text-[10px] text-violet-600 font-bold flex items-center gap-0.5 leading-none">
                      <span>Hiệu suất Pie ➔</span>
                    </div>
                  </div>
                </button>
              )}

              {/* Quick Personal Conversion Pie Shortcut */}
              {onOpenPersonalPerformance && (
                <button
                  type="button"
                  onClick={() => onOpenPersonalPerformance(currentUser.name)}
                  className="hidden xl:inline-flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-violet-50 to-indigo-50 hover:from-violet-100 hover:to-indigo-100 border border-violet-200 text-violet-800 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Xem biểu đồ tròn Recharts tỷ lệ chuyển đổi từ Lead sang Hẹn xem của bạn"
                >
                  <Target className="w-3.5 h-3.5 text-violet-600" />
                  <span>Tỷ lệ Hẹn xem</span>
                </button>
              )}

              {/* In-app Notification Bell */}
              {onOpenNotifications && (
                <button
                  id="notifications-btn"
                  onClick={onOpenNotifications}
                  className="relative min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 active:scale-95 rounded-xl transition-all border border-slate-200 cursor-pointer"
                  title="Xem thông báo nạp lead & phân bổ"
                  aria-label="Thông báo"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center px-1 border-2 border-white shadow-xs animate-bounce">
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                  )}
                </button>
              )}

              {/* Internal Chat Button with unread count */}
              {onOpenInternalChat && (
                <button
                  id="internal-chat-btn"
                  onClick={onOpenInternalChat}
                  className="relative min-h-[40px] min-w-[40px] flex items-center justify-center p-2 text-slate-600 hover:text-amber-800 hover:bg-amber-50 active:scale-95 rounded-xl transition-all border border-slate-200 cursor-pointer"
                  title="Trao đổi nội bộ giữa TPKD và NVKD về khách hàng"
                  aria-label="Chat nội bộ"
                >
                  <MessageSquare className="w-4 h-4 text-amber-600" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white shadow-xs animate-pulse">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {/* Unified Settings / Zalo Quick Message Templates Manager */}
              <button
                id="header-settings-btn"
                onClick={() => {
                  if (onOpenSettings) onOpenSettings('zalo_templates');
                  else if (onOpenZaloTemplates) onOpenZaloTemplates();
                }}
                className="inline-flex min-h-[40px] items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-blue-700 hover:text-blue-900 hover:bg-blue-100/80 active:scale-95 bg-blue-50/80 rounded-xl transition-all border border-blue-200 cursor-pointer font-bold text-xs shadow-2xs"
                title="Cài đặt hệ thống: Quản lý mẫu tin nhắn nhanh Zalo (Chào hỏi, gửi dự án...), KPI và tiện ích"
                aria-label="Cài đặt hệ thống & mẫu tin nhắn Zalo"
              >
                <Settings className="w-4 h-4 text-blue-600 animate-spin-hover shrink-0" />
                <span className="hidden sm:inline">Cài đặt</span>
              </button>

              {/* Super Admin CMS & Backend Management Panel */}
              {currentUser.role === 'admin' && onOpenAdminCms && (
                <button
                  id="header-admin-cms-btn"
                  onClick={onOpenAdminCms}
                  className="inline-flex min-h-[40px] items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-amber-950 hover:text-amber-900 hover:bg-amber-100 active:scale-95 bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl transition-all border border-amber-400/80 cursor-pointer font-extrabold text-xs shadow-xs"
                  title="Quản trị Backend, Nạp khách hàng thủ công, Cơ sở dữ liệu, Cờ tính năng & Nhật ký kiểm toán (Super Admin)"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Quản trị backend</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500 text-slate-950 font-black">
                    PRO
                  </span>
                </button>
              )}

              {/* Desktop Primary Add Lead button */}
              <button
                id="add-lead-btn"
                onClick={onOpenAddModal}
                className="hidden md:inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-all whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-1 stroke-[2.5]" />
                Thêm lead mới
              </button>
            </div>
          </div>

          {/* Row 2: Search and Action Bar */}
          <div className="mt-2 sm:mt-2.5 flex flex-col items-stretch gap-2 max-w-full">
            {/* Search Input */}
            <div className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Tìm tên khách, số điện thoại, dự án, sale..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-xs text-slate-400 hover:text-slate-600 bg-slate-200/70 rounded-full"
                  title="Xoá tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Action Buttons: Google Sheet, Import, Export, Add (Mobile) */}
            <div className="flex flex-wrap items-center gap-1.5 py-0.5 w-full min-w-0">
              {/* Add Lead for mobile inside action strip */}
              <button
                onClick={onOpenAddModal}
                className="md:hidden inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
                <span>+ Lead</span>
              </button>

              {/* Sunday KPI Report & Email button */}
              {onOpenSundayReportModal && (
                <button
                  id="sunday-kpi-report-btn"
                  onClick={onOpenSundayReportModal}
                  title="Báo cáo tuần KPI Zalo & Lịch hẹn tối Chủ Nhật (Gửi GĐKD + TPKD, CC Sale)"
                  className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-900 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 border border-amber-400/60 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0"
                >
                  <Mail className="w-3.5 h-3.5 mr-1 text-amber-700 group-hover:scale-110 transition-transform" />
                  <span>Báo cáo tuần (Tối CN)</span>
                </button>
              )}

              {/* Weekly Activity PDF Report button */}
              {onOpenWeeklyPdfModal && (
                <button
                  id="weekly-activity-pdf-btn"
                  onClick={() => onOpenWeeklyPdfModal()}
                  title="Xuất báo cáo hoạt động tuần định dạng PDF (Cuộc gọi, lịch hẹn, kết quả kinh doanh) nộp cấp trên"
                  className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-rose-950 bg-gradient-to-r from-rose-50 via-rose-100 to-amber-50 hover:from-rose-100 hover:to-amber-100 border border-rose-300/80 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0"
                >
                  <FileText className="w-3.5 h-3.5 mr-1 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Báo cáo PDF tuần</span>
                  <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded font-black bg-rose-600 text-white shadow-2xs">PDF</span>
                </button>
              )}

              {/* Only Admin has access to Database, Staff Management, Customer File Upload, and System Logs */}
              {currentUser.role === 'admin' && (
                <>
                  {/* Upload Riêng File Khách Hàng Lưu Database (Key Request) */}
                  <button
                    id="header-upload-customer-file-btn"
                    onClick={() => {
                      if (onOpenAdminCmsTab) onOpenAdminCmsTab('customer_file');
                      else if (onOpenAdminCms) onOpenAdminCms();
                    }}
                    title="Upload riêng file thông tin khách hàng (CSV, Excel, TXT, JSON) và lưu trực tiếp vào Database máy chủ & Cloud"
                    className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 border border-amber-400 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1 text-amber-800 group-hover:scale-110 transition-transform" />
                    <span>Tải lên khách hàng</span>
                    <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded font-black bg-emerald-600 text-white shadow-2xs">DB</span>
                  </button>

                  {/* Quản Lý & Tự Thêm Nhân Viên (Key Request) */}
                  <button
                    id="header-manage-staff-btn"
                    onClick={() => {
                      if (onOpenAdminCmsTab) onOpenAdminCmsTab('staff');
                      else if (onOpenAdminCms) onOpenAdminCms();
                    }}
                    title="Quản trị nhân sự: Tự thêm nhân viên mới, phân quyền TPKD/NVKD, đổi mật khẩu và lưu Database"
                    className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 mr-1 text-indigo-700 group-hover:scale-110 transition-transform" />
                    <span>Quản lý nhân viên</span>
                    <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold bg-indigo-200/80 text-indigo-900">{salesCount}</span>
                  </button>

                  {onOpenDatabaseModal && (
                    <button
                      id="database-management-btn"
                      onClick={onOpenDatabaseModal}
                      title="Quản trị Database: Sao lưu JSON, dọn dẹp demo, phân bổ NVKD & Đồng bộ Cloud (Không cần Google Sheet)"
                      className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0"
                    >
                      <Database className="w-3.5 h-3.5 mr-1 text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span>Quản trị database</span>
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    </button>
                  )}

                  <button
                    id="header-system-logs-btn"
                    onClick={() => onViewChange('system_logs')}
                    title="Xem Nhật ký hệ thống (Lịch sử đăng nhập, xóa, sửa lead của từng nhân viên)"
                    className={`inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0 ${
                      currentView === 'system_logs'
                        ? 'bg-slate-900 text-amber-300 border border-slate-700'
                        : 'text-slate-800 bg-white hover:bg-amber-50 border border-slate-200'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span>Nhật ký</span>
                  </button>

                  <button
                    id="import-csv-btn"
                    onClick={onOpenImportModal}
                    title="Nhập khách hàng từ file CSV nhanh"
                    className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 sm:border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>Nhập CSV</span>
                  </button>

                  <button
                    id="export-csv-btn"
                    onClick={onExportCSV}
                    title="Xuất file CSV chuẩn CRM"
                    className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 sm:border-slate-300 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>Xuất CSV</span>
                  </button>

                  {/* Secondary / Optional Google Sheet Sync (Demoted as requested: "không dùng google sheet nữa") */}
                  <button
                    id="sync-google-sheet-btn"
                    onClick={onOpenGoogleSheetSync}
                    title="Đồng bộ từ Google Sheet (Tính năng phụ / Dự phòng. Dữ liệu chính đã lưu trực tiếp vào Database)"
                    className="inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all whitespace-nowrap group shrink-0"
                  >
                    <FileSpreadsheet className="w-3 h-3 mr-1 text-slate-400" />
                    <span>Sheet (Dự phòng)</span>
                  </button>

                  {onOpenSyncNvkdSheet && (
                    <button
                      id="sync-nvkd-sheet-btn"
                      onClick={onOpenSyncNvkdSheet}
                      title="Nhập danh sách NVKD từ file Google Sheet (Dự phòng)"
                      className="inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all whitespace-nowrap group shrink-0"
                    >
                      <Users className="w-3 h-3 mr-1 text-slate-400" />
                      <span>NVKD (Sheet cũ)</span>
                    </button>
                  )}
                </>
              )}

              {/* Quick Message Templates Button - Available for all staff */}
              {(onOpenSettings || onOpenZaloTemplates) && (
                <button
                  id="action-zalo-templates-btn"
                  onClick={() => {
                    if (onOpenSettings) onOpenSettings('zalo_templates');
                    else if (onOpenZaloTemplates) onOpenZaloTemplates();
                  }}
                  title="Cài đặt & Quản lý kho mẫu tin nhắn nhanh Zalo (Chào hỏi, gửi thông tin dự án, bảng giá...)"
                  className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl transition-all shadow-2xs whitespace-nowrap group shrink-0 cursor-pointer"
                >
                  <MessageSquareText className="w-3.5 h-3.5 mr-1 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>Cài đặt mẫu tin Zalo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs Bar (On mobile, replaced by bottom navigation bar) */}
        <nav aria-label="CRM Navigation" className="hidden md:flex items-center border-t border-slate-100 pt-1.5 pb-2">
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5 min-w-0 w-full">
            <button
              id="tab-table-view"
              onClick={() => onViewChange('table')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'table'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Table className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Bảng dữ liệu chuẩn (Excel)
            </button>

            <button
              id="tab-pipeline-view"
              onClick={() => onViewChange('pipeline')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'pipeline'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Kanban className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Phễu bán hàng (Kanban)
            </button>

            <button
              id="tab-appointments-view"
              onClick={() => onViewChange('appointments')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'appointments'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Lịch hẹn xem BĐS</span>
              {upcomingAppointments30mCount > 0 && (
                <span 
                  className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-0.5 animate-pulse ${
                    currentView === 'appointments'
                      ? 'bg-white text-rose-600 shadow-2xs'
                      : 'bg-rose-500 text-white shadow-2xs'
                  }`}
                  title={`${upcomingAppointments30mCount} lịch hẹn sắp diễn ra trong vòng 30 phút`}
                >
                  <span>⏰</span>
                  <span>{upcomingAppointments30mCount}</span>
                </span>
              )}
            </button>

            <button
              id="tab-sales-team-view"
              onClick={() => onViewChange('sales_team')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'sales_team'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>Đội ngũ sale &amp; phân bổ</span>
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                currentView === 'sales_team'
                  ? 'bg-white/30 text-white'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {salesCount}
              </span>
            </button>

            <button
              id="tab-analytics-view"
              onClick={() => onViewChange('analytics')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'analytics'
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              Báo cáo & tỷ lệ chốt
            </button>

            <button
              id="tab-performance-overview"
              onClick={() => onViewChange('performance_overview')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'performance_overview'
                  ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-xs font-bold'
                  : 'text-slate-700 bg-slate-100/80 hover:bg-slate-200/90 font-bold border border-slate-200/70'
              }`}
              title="Tổng quan hiệu suất Recharts: Trực quan hóa phân bổ Lead theo trạng thái & sản lượng tiếp nhận"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-500" />
              <span>Hiệu suất & Sản lượng</span>
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                currentView === 'performance_overview'
                  ? 'bg-white/25 text-white'
                  : 'bg-amber-500 text-slate-950 shadow-2xs'
              }`}>
                Mới
              </span>
            </button>

            <button
              id="tab-smart-reports-view"
              onClick={() => onViewChange('smart_reports')}
              className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                currentView === 'smart_reports'
                  ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white shadow-xs font-bold'
                  : 'text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 hover:text-indigo-950 font-bold border border-indigo-200/60'
              }`}
              title="Báo cáo thông minh Recharts: Trực quan hóa tỷ lệ chuyển đổi theo Nguồn dữ liệu & Dự án BĐS"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-400" />
              <span>Báo cáo thông minh</span>
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                currentView === 'smart_reports'
                  ? 'bg-white/25 text-white'
                  : 'bg-amber-500 text-slate-950 shadow-2xs'
              }`}>
                Recharts
              </span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                id="tab-system-logs-view"
                onClick={() => onViewChange('system_logs')}
                className={`inline-flex items-center px-3 py-2 rounded-xl text-xs sm:text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  currentView === 'system_logs'
                    ? 'bg-slate-900 text-amber-300 shadow-xs font-bold border border-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Bảng Nhật ký hệ thống: Theo dõi lịch sử đăng nhập, xóa, sửa lead của từng nhân viên"
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5 shrink-0 text-amber-500" />
                <span>Nhật ký hệ thống</span>
                <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  currentView === 'system_logs'
                    ? 'bg-amber-400 text-slate-950 shadow-2xs'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  Audit
                </span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-500 shrink-0 pl-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Đồng bộ phân quyền sale</span>
          </div>
        </nav>
      </div>
    </header>
  );
};

