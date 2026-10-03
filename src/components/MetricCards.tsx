import React from 'react';
import { 
  Users, 
  UserPlus, 
  Flame, 
  CheckCircle2, 
  Percent, 
  TrendingUp,
  Eye,
  Calendar
} from 'lucide-react';
import { CRMIndicators } from '../types';

interface MetricCardsProps {
  indicators: CRMIndicators;
  activeStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  upcomingAppointmentsCount?: number;
}

const CUSTOMER_STATUS_LIST = [
  'Không nghe máy',
  'Không nhu cầu',
  'Quan tâm',
  'Tiềm năng',
  'Gọi lại sau',
  'Máy bận',
  'Thuê bao',
  'Gửi thông tin',
  'Nhầm số',
  'Khác'
] as const;

const STATUS_DOT_COLORS: Record<string, string> = {
  'Không nghe máy': 'bg-amber-500',
  'Không nhu cầu': 'bg-slate-400',
  'Quan tâm': 'bg-teal-500',
  'Tiềm năng': 'bg-indigo-500',
  'Gọi lại sau': 'bg-blue-500',
  'Máy bận': 'bg-rose-500',
  'Thuê bao': 'bg-zinc-400',
  'Gửi thông tin': 'bg-violet-500',
  'Nhầm số': 'bg-stone-400',
  'Khác': 'bg-slate-500'
};

export const MetricCards: React.FC<MetricCardsProps> = ({
  indicators,
  activeStatusFilter,
  onSelectStatusFilter,
  upcomingAppointmentsCount = 0
}) => {
  return (
    <div className="mb-4 sm:mb-6">
      {/* Top Banner indicating the CRM indicators formula */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
            Chỉ số SALEPRO HCM_E05 (KPIs)
          </span>
          <span className="text-[11px] text-slate-400 hidden xs:inline">• Chạm để lọc nhanh</span>
        </div>
        {activeStatusFilter && (
          <button
            onClick={() => onSelectStatusFilter('')}
            className="text-[11px] sm:text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300 transition-colors"
          >
            ✕ Xoá lọc: {activeStatusFilter}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* 1. Tổng Lead */}
        <div
          id="metric-card-total-leads"
          onClick={() => onSelectStatusFilter('')}
          className={`cursor-pointer bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
            activeStatusFilter === ''
              ? 'border-slate-800 ring-2 ring-slate-800/10 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-bold text-slate-500">Tổng lead</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {indicators.totalLeads}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium">khách</span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-[11px] text-slate-500 truncate">
            <span>Toàn bộ nguồn dữ liệu</span>
          </div>
        </div>

        {/* 2. Khách mới */}
        <div
          id="metric-card-new-leads"
          onClick={() => onSelectStatusFilter('Khách mới')}
          className={`cursor-pointer bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
            activeStatusFilter === 'Khách mới'
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/30 shadow-xs'
              : 'border-slate-200 hover:border-sky-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-bold text-sky-700">Khách mới</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {indicators.newLeads}
            </span>
            <span className="text-[11px] sm:text-xs text-sky-600 font-bold">
              {indicators.totalLeads > 0 
                ? `${Math.round((indicators.newLeads / indicators.totalLeads) * 100)}%` 
                : '0%'}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-[11px] text-sky-600 font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 shrink-0"></span>
            <span className="truncate">Cần gọi ngay hôm nay</span>
          </div>
        </div>

        {/* 3. Tiềm năng */}
        <div
          id="metric-card-potential-leads"
          onClick={() => onSelectStatusFilter('Tiềm năng')}
          className={`cursor-pointer bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
            activeStatusFilter === 'Tiềm năng'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 shadow-xs'
              : 'border-slate-200 hover:border-indigo-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-bold text-indigo-700">Tiềm năng</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {indicators.potentialLeads}
            </span>
            <span className="text-[11px] sm:text-xs text-indigo-600 font-bold">
              {indicators.totalLeads > 0 
                ? `${Math.round((indicators.potentialLeads / indicators.totalLeads) * 100)}%` 
                : '0%'}
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-[11px] text-indigo-600 font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 shrink-0"></span>
            <span className="truncate">Tài chính khớp</span>
          </div>
        </div>

        {/* 4. Đã chốt */}
        <div
          id="metric-card-closed-leads"
          onClick={() => onSelectStatusFilter('Đã chốt')}
          className={`cursor-pointer bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 hover:shadow-md active:scale-[0.99] ${
            activeStatusFilter === 'Đã chốt'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30 shadow-xs'
              : 'border-slate-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-bold text-emerald-700">Đã chốt</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
              {indicators.closedLeads}
            </span>
            <span className="text-[11px] sm:text-xs text-emerald-600 font-medium">HĐ/cọc</span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-[11px] text-emerald-600 font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0"></span>
            <span className="truncate">Thành công</span>
          </div>
        </div>

        {/* 5. Tỷ lệ chốt */}
        <div
          id="metric-card-close-rate"
          className="bg-gradient-to-br from-amber-600 to-amber-700 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-600 text-white shadow-xs col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <span className="text-xs font-bold text-amber-100">Tỷ lệ chốt</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-1.5 sm:space-x-2">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {indicators.closeRate.toFixed(1).replace('.', ',')}%
            </span>
          </div>
          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-[11px] text-amber-100 font-medium truncate">
            <TrendingUp className="w-3 h-3 mr-1 inline shrink-0" />
            <span className="truncate">Đã chốt / Tổng Lead</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Pulse Bar: 10 Tình trạng khách hàng */}
      <div className="mt-3 bg-white p-3 sm:p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-800 tracking-tight">
              Tình trạng khách hàng ({CUSTOMER_STATUS_LIST.length})
            </span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              • Chọn trạng thái để lọc nhanh
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs self-start sm:self-auto">
            {activeStatusFilter && (
              <button
                type="button"
                onClick={() => onSelectStatusFilter('')}
                className="text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-md transition-colors flex items-center gap-1 cursor-pointer border border-amber-300 shadow-2xs"
                title="Hủy lọc trạng thái"
              >
                <span>Đang lọc: <strong>{activeStatusFilter}</strong></span>
                <span className="text-xs font-bold ml-0.5">✕</span>
              </button>
            )}

            {upcomingAppointmentsCount > 0 && (
              <div className="flex items-center text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200 font-medium text-[11px]">
                <Calendar className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span>Có <strong>{upcomingAppointmentsCount}</strong> lịch xem BĐS sắp tới</span>
              </div>
            )}
          </div>
        </div>

        {/* Responsive Pill Strip (Smooth scroll on mobile, wrap on wide screens) */}
        <div className="flex items-center flex-wrap gap-1.5 overflow-x-auto no-scrollbar touch-scroll py-0.5">
          {/* Reset / All Chip */}
          <button
            type="button"
            onClick={() => onSelectStatusFilter('')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
              activeStatusFilter === ''
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Xem tất cả tình trạng"
          >
            <span>Tất cả</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeStatusFilter === '' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {indicators.totalLeads}
            </span>
          </button>

          {CUSTOMER_STATUS_LIST.map((st) => {
            const count = indicators.statusCounts?.[st] ?? 0;
            const isSelected = activeStatusFilter === st;
            const dotColor = STATUS_DOT_COLORS[st] || 'bg-slate-400';

            return (
              <button
                key={st}
                type="button"
                onClick={() => onSelectStatusFilter(isSelected ? '' : st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                }`}
                title={`Lọc theo tình trạng: ${st} (${count} khách)`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white ring-2 ring-amber-300' : dotColor}`} />
                <span className="whitespace-nowrap">{st}:</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isSelected
                    ? 'bg-amber-800 text-white'
                    : count > 0
                      ? 'bg-slate-100 text-slate-900 font-extrabold'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
