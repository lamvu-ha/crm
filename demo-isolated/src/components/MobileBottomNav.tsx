import React, { useState } from 'react';
import { 
  Table, 
  Kanban, 
  CalendarDays, 
  BarChart3, 
  Users, 
  Plus, 
  Sparkles, 
  MessageSquare, 
  ShieldCheck, 
  Settings,
  MoreHorizontal,
  X,
  ChevronRight,
  TrendingUp,
  Target
} from 'lucide-react';
import { ViewMode, UserRole } from '../types';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenAddModal: () => void;
  upcomingAppointmentsCount?: number;
  salesCount?: number;
  unreadChatCount?: number;
  onOpenInternalChat?: () => void;
  onOpenSettings?: () => void;
  currentUserRole?: UserRole;
  onOpenPersonalPerformance?: () => void;
  onOpenAdminCmsTab?: (tab: 'customer_file' | 'staff' | 'database') => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onOpenAddModal,
  upcomingAppointmentsCount = 0,
  salesCount = 0,
  unreadChatCount = 0,
  onOpenInternalChat,
  onOpenSettings,
  currentUserRole,
  onOpenPersonalPerformance,
  onOpenAdminCmsTab
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Checks if the active view belongs to the "More" drawer
  const isMoreViewActive = ['sales_team', 'analytics', 'performance_overview', 'smart_reports', 'system_logs'].includes(currentView);

  const handleSelectView = (view: ViewMode) => {
    onViewChange(view);
    setIsMoreSheetOpen(false);
  };

  return (
    <>
      {/* Slide-up Bottom Sheet for Secondary Tools & Views on Mobile */}
      {isMoreSheetOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMoreSheetOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 sm:p-5 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Tính năng &amp; Tiện ích CRM</h3>
                  <p className="text-[11px] text-slate-500">Chuyển màn hình hoặc mở nhanh công cụ</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions Grid: Chat & Settings */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {onOpenInternalChat && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenInternalChat();
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-amber-100/70 border border-amber-200 text-left flex items-center justify-between active:scale-98 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-amber-950 truncate">Chat TPKD</div>
                      <div className="text-[10px] text-amber-700/80 truncate">Trao đổi nội bộ</div>
                    </div>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shrink-0 animate-pulse">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenSettings();
                  }}
                  className="p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-left flex items-center justify-between active:scale-98 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-blue-950 truncate">Cài đặt Zalo</div>
                      <div className="text-[10px] text-blue-700/80 truncate">Mẫu tin &amp; KPI</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-blue-400 shrink-0" />
                </button>
              )}
            </div>

            {/* Views List in Drawer */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 block mb-1">
                Các phân hệ quản lý
              </span>

              {/* 1. Đội ngũ Sale */}
              <button
                type="button"
                onClick={() => handleSelectView('sales_team')}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                  currentView === 'sales_team'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={`w-4 h-4 ${currentView === 'sales_team' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Đội ngũ sale &amp; Phân bổ ({salesCount})</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'sales_team' ? 'text-white/80' : 'text-slate-400'}`} />
              </button>

              {/* 2. Hiệu suất & Sản lượng */}
              <button
                type="button"
                onClick={() => handleSelectView('performance_overview')}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                  currentView === 'performance_overview'
                    ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className={`w-4 h-4 ${currentView === 'performance_overview' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Hiệu suất &amp; Sản lượng tiếp nhận</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'performance_overview' ? 'text-white/80' : 'text-slate-400'}`} />
              </button>

              {/* 3. Báo cáo & Tỷ lệ chốt */}
              <button
                type="button"
                onClick={() => handleSelectView('analytics')}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                  currentView === 'analytics'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={`w-4 h-4 ${currentView === 'analytics' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Báo cáo &amp; Tỷ lệ chốt cọc</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'analytics' ? 'text-white/80' : 'text-slate-400'}`} />
              </button>

              {/* 4. Báo cáo thông minh (Smart) */}
              <button
                type="button"
                onClick={() => handleSelectView('smart_reports')}
                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                  currentView === 'smart_reports'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`w-4 h-4 ${currentView === 'smart_reports' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Báo cáo thông minh Recharts</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${currentView === 'smart_reports' ? 'text-white/80' : 'text-slate-400'}`} />
              </button>

              {/* Tỷ lệ Hẹn xem cá nhân (Recharts Pie Chart) */}
              {onOpenPersonalPerformance && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenPersonalPerformance();
                  }}
                  className="w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all text-violet-800 hover:bg-violet-100 bg-violet-50 border border-violet-200"
                >
                  <div className="flex items-center gap-2.5">
                    <Target className="w-4 h-4 text-violet-600" />
                    <span className="font-bold">Tỷ lệ hẹn xem của tôi (Recharts Pie)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-violet-400" />
                </button>
              )}

              {/* 5. Phân hệ Quản trị Admin (Admin only) */}
              {currentUserRole === 'admin' && (
                <>
                  {onOpenAdminCmsTab && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreSheetOpen(false);
                          onOpenAdminCmsTab('customer_file');
                        }}
                        className="w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span className="font-bold">Trung tâm quản trị hệ thống</span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">DB</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreSheetOpen(false);
                          onOpenAdminCmsTab('staff');
                        }}
                        className="w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold">Quản lý nhân viên (Database)</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-indigo-400" />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSelectView('system_logs')}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold transition-all ${
                      currentView === 'system_logs'
                        ? 'bg-slate-900 text-amber-300 font-bold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className={`w-4 h-4 ${currentView === 'system_logs' ? 'text-amber-400' : 'text-slate-700'}`} />
                      <span>Nhật ký hệ thống (Audit Logs)</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${currentView === 'system_logs' ? 'text-amber-300' : 'text-slate-400'}`} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Ergonomic Bottom Navigation Bar (No intrusive floating buttons!) */}
      <nav 
        aria-label="Thanh điều hướng di động"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.07)]"
      >
        <div className="grid grid-cols-5 h-14 items-stretch max-w-md mx-auto px-1 relative">
          {/* Tab 1: Danh sách Lead */}
          <button
            id="mobile-nav-table"
            type="button"
            onClick={() => onViewChange('table')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
              currentView === 'table'
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className={`w-5 h-5 mb-0.5 ${currentView === 'table' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight leading-none">Khách hàng</span>
            {currentView === 'table' && (
              <span className="absolute top-0 inset-x-2 h-0.5 bg-amber-600 rounded-full" />
            )}
          </button>

          {/* Tab 2: Phễu Kanban */}
          <button
            id="mobile-nav-pipeline"
            type="button"
            onClick={() => onViewChange('pipeline')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
              currentView === 'pipeline'
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Kanban className={`w-5 h-5 mb-0.5 ${currentView === 'pipeline' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[10px] tracking-tight leading-none">Phễu chốt</span>
            {currentView === 'pipeline' && (
              <span className="absolute top-0 inset-x-2 h-0.5 bg-amber-600 rounded-full" />
            )}
          </button>

          {/* Tab 3: Prominent Center Action (+ Thêm Lead Mới) */}
          <div className="flex items-center justify-center relative">
            <button
              id="mobile-nav-add-lead-center"
              type="button"
              onClick={onOpenAddModal}
              className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-600/40 active:scale-95 transition-all border-4 border-white cursor-pointer focus:outline-none"
              title="Thêm khách hàng mới"
              aria-label="Thêm khách hàng mới"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
            </button>
          </div>

          {/* Tab 4: Lịch hẹn BĐS */}
          <button
            id="mobile-nav-appointments"
            type="button"
            onClick={() => onViewChange('appointments')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
              currentView === 'appointments'
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <CalendarDays className={`w-5 h-5 mb-0.5 ${currentView === 'appointments' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {upcomingAppointmentsCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 rounded-full bg-purple-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white px-0.5 animate-pulse">
                  {upcomingAppointmentsCount > 9 ? '9+' : upcomingAppointmentsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">Lịch hẹn</span>
            {currentView === 'appointments' && (
              <span className="absolute top-0 inset-x-2 h-0.5 bg-amber-600 rounded-full" />
            )}
          </button>

          {/* Tab 5: Menu / Khác (Opens Drawer) */}
          <button
            id="mobile-nav-more-menu"
            type="button"
            onClick={() => setIsMoreSheetOpen(true)}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
              isMoreViewActive || isMoreSheetOpen
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className={`w-5 h-5 mb-0.5 ${isMoreViewActive || isMoreSheetOpen ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {unreadChatCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white animate-ping" />
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none">
              {isMoreViewActive ? 'Phân hệ' : 'Thêm'}
            </span>
            {(isMoreViewActive || isMoreSheetOpen) && (
              <span className="absolute top-0 inset-x-2 h-0.5 bg-amber-600 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
