import React, { useState } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  X, 
  Clock, 
  Check, 
  ArrowRight,
  RotateCcw,
  Sparkles,
  RefreshCw,
  Zap,
  SlidersHorizontal
} from 'lucide-react';
import { 
  DateFilterRange, 
  DateFilterField,
  DATE_FIELD_OPTIONS,
  getDateRangeBounds, 
  formatDateToDMY 
} from '../utils/dateFilterUtils';

interface LeadDateFilterProps {
  currentRange: DateFilterRange;
  onRangeChange: (range: DateFilterRange) => void;
  dateField?: DateFilterField;
  onDateFieldChange?: (field: DateFilterField) => void;
  customStartDate: string;
  onCustomStartDateChange: (val: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (val: string) => void;
  presetCounts?: {
    all: number;
    today: number;
    yesterday: number;
    this_week: number;
    this_month: number;
    createdToday?: number;
    updatedToday?: number;
  };
  totalMatchingCount?: number;
}

export const LeadDateFilter: React.FC<LeadDateFilterProps> = ({
  currentRange,
  onRangeChange,
  dateField = 'createdAt',
  onDateFieldChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  presetCounts,
  totalMatchingCount
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(currentRange === 'custom');

  const boundsInfo = getDateRangeBounds(currentRange, customStartDate, customEndDate);

  const handleSelectQuick = (range: DateFilterRange) => {
    onRangeChange(range);
    if (range !== 'custom') {
      setShowCustomInputs(false);
    } else {
      setShowCustomInputs(true);
    }
    setIsDropdownOpen(false);
  };

  const handleSelectField = (field: DateFilterField) => {
    if (onDateFieldChange) {
      onDateFieldChange(field);
    }
    setIsFieldDropdownOpen(false);
  };

  // Quick 1-tap shortcut: "Vừa đẩy về hôm nay"
  const handleSelectCreatedToday = () => {
    if (onDateFieldChange) {
      onDateFieldChange('createdAt');
    }
    onRangeChange('today');
    setShowCustomInputs(false);
    setIsDropdownOpen(false);
  };

  // Quick 1-tap shortcut: "Vừa cập nhật hôm nay"
  const handleSelectUpdatedToday = () => {
    if (onDateFieldChange) {
      onDateFieldChange('updatedAt');
    }
    onRangeChange('today');
    setShowCustomInputs(false);
    setIsDropdownOpen(false);
  };

  const handleClearDateFilter = () => {
    onRangeChange('all');
    onCustomStartDateChange('');
    onCustomEndDateChange('');
    setShowCustomInputs(false);
    setIsDropdownOpen(false);
  };

  // Primary presets shown as 1-click buttons
  const primaryPresets: { key: DateFilterRange; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: presetCounts?.all },
    { key: 'today', label: 'Hôm nay', count: presetCounts?.today },
    { key: 'this_week', label: 'Tuần này', count: presetCounts?.this_week },
    { key: 'this_month', label: 'Tháng này', count: presetCounts?.this_month },
  ];

  // Secondary presets shown in "Khác / Mở rộng" dropdown
  const secondaryPresets: { key: DateFilterRange; label: string; desc: string }[] = [
    { key: 'yesterday', label: 'Hôm qua', desc: 'Dữ liệu phát sinh ngày hôm qua' },
    { key: 'last_week', label: 'Tuần trước', desc: 'Thứ 2 đến Chủ nhật tuần trước' },
    { key: 'last_month', label: 'Tháng trước', desc: 'Trọn vẹn 1 tháng trước' },
    { key: 'custom', label: 'Tùy chọn khoảng ngày...', desc: 'Chọn ngày bắt đầu & ngày kết thúc' },
  ];

  const currentFieldLabel =
    dateField === 'createdAt'
      ? 'Ngày tạo'
      : dateField === 'updatedAt'
      ? 'Cập nhật'
      : 'Tạo/Cập nhật';

  const isFilterActive = currentRange !== 'all';

  return (
    <div className="relative inline-flex flex-col lg:flex-row items-stretch lg:items-center gap-1.5 shrink-0 flex-wrap">
      {/* Quick 1-tap Buttons for Telemarketing & Management */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Quick shortcut: Vừa đẩy về hôm nay */}
        <button
          type="button"
          onClick={handleSelectCreatedToday}
          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[34px] cursor-pointer shadow-2xs border ${
            currentRange === 'today' && dateField === 'createdAt'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400/30 font-extrabold'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:border-amber-300'
          }`}
          title="Lọc nhanh toàn bộ khách hàng mới được tạo hoặc đẩy về hệ thống trong ngày hôm nay"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Vừa đẩy về</span>
          {presetCounts?.createdToday !== undefined && presetCounts.createdToday > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold leading-none ${
                currentRange === 'today' && dateField === 'createdAt'
                  ? 'bg-amber-800 text-amber-100'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {presetCounts.createdToday}
            </span>
          )}
        </button>

        {/* Quick shortcut: Vừa cập nhật hôm nay */}
        <button
          type="button"
          onClick={handleSelectUpdatedToday}
          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[34px] cursor-pointer shadow-2xs border ${
            currentRange === 'today' && dateField === 'updatedAt'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/30 font-extrabold'
              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
          }`}
          title="Lọc nhanh các khách hàng có hoạt động cập nhật, trao đổi hoặc đổi trạng thái hôm nay"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
          <span>Vừa cập nhật</span>
          {presetCounts?.updatedToday !== undefined && presetCounts.updatedToday > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold leading-none ${
                currentRange === 'today' && dateField === 'updatedAt'
                  ? 'bg-blue-800 text-blue-100'
                  : 'bg-blue-200 text-blue-900'
              }`}
            >
              {presetCounts.updatedToday}
            </span>
          )}
        </button>
      </div>

      {/* Main Date Range Selector Segment */}
      <div className="flex items-center p-0.5 bg-slate-200/80 rounded-xl border border-slate-300/80 text-xs shrink-0 shadow-2xs">
        {/* Date Field Criterion Toggle / Dropdown */}
        {onDateFieldChange && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
              className="flex items-center px-2 py-1 bg-white/90 hover:bg-white text-slate-800 rounded-lg font-bold text-[11px] shadow-2xs border border-slate-200/90 transition-all min-h-[30px] cursor-pointer mr-1"
              title="Chọn tiêu chí ngày: Ngày tạo/đẩy về hoặc Ngày cập nhật gần nhất"
            >
              {dateField === 'createdAt' ? (
                <Sparkles className="w-3 h-3 text-amber-600 mr-1 shrink-0" />
              ) : dateField === 'updatedAt' ? (
                <RefreshCw className="w-3 h-3 text-blue-600 mr-1 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-emerald-600 mr-1 shrink-0" />
              )}
              <span className="font-extrabold">{currentFieldLabel}</span>
              <ChevronDown className="w-3 h-3 ml-1 text-slate-400 shrink-0" />
            </button>

            {/* Field Dropdown Popover */}
            {isFieldDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsFieldDropdownOpen(false)} 
                />
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1 text-xs animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Tiêu chí mốc thời gian lọc
                  </div>
                  {DATE_FIELD_OPTIONS.map((opt) => {
                    const isSelected = dateField === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectField(opt.key)}
                        className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-amber-50/70 transition-colors cursor-pointer ${
                          isSelected ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-700'
                        }`}
                      >
                        <div className="pr-2">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {opt.key === 'createdAt' && <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
                            {opt.key === 'updatedAt' && <RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
                            {opt.key === 'any' && <Clock className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{opt.label}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{opt.desc}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* 1-click Quick Range Buttons */}
        {primaryPresets.map((preset) => {
          const isActive = currentRange === preset.key;
          return (
            <button
              key={preset.key}
              type="button"
              id={`btn-date-filter-${preset.key}`}
              onClick={() => handleSelectQuick(preset.key)}
              className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 shrink-0 min-h-[30px] cursor-pointer ${
                isActive
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
              }`}
              title={`Lọc khách hàng theo ${preset.label}`}
            >
              <span>{preset.label}</span>
              {preset.count !== undefined && preset.count > 0 && preset.key !== 'all' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                    isActive
                      ? 'bg-amber-800/80 text-amber-100'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {preset.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Extended presets dropdown */}
        <div className="relative">
          <button
            type="button"
            id="btn-date-filter-dropdown"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`px-2 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1 shrink-0 min-h-[30px] cursor-pointer ${
              ['yesterday', 'last_week', 'last_month', 'custom'].includes(currentRange)
                ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                : 'text-slate-700 hover:bg-white/80'
            }`}
            title="Thêm các mốc thời gian khác hoặc tùy chỉnh khoảng ngày"
          >
            <span className="truncate max-w-[85px]">
              {currentRange === 'yesterday'
                ? 'Hôm qua'
                : currentRange === 'last_week'
                ? 'Tuần trước'
                : currentRange === 'last_month'
                ? 'Tháng trước'
                : currentRange === 'custom'
                ? 'Tùy chọn'
                : 'Khác'}
            </span>
            <ChevronDown className="w-3 h-3 ml-0.5 shrink-0" />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1.5 font-bold text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Mốc thời gian mở rộng
                </div>

                {secondaryPresets.map((sp) => {
                  const isCur = currentRange === sp.key;
                  return (
                    <button
                      key={sp.key}
                      type="button"
                      onClick={() => handleSelectQuick(sp.key)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-amber-50/70 transition-colors cursor-pointer ${
                        isCur ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{sp.label}</div>
                        <div className="text-[10px] text-slate-400">{sp.desc}</div>
                      </div>
                      {isCur && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}

                {currentRange !== 'all' && (
                  <div className="pt-1 mt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={handleClearDateFilter}
                      className="w-full text-left px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Xem toàn bộ danh sách (Bỏ lọc ngày)</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Custom Date Range Picker Popover or Inline Picker */}
      {showCustomInputs && (
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-300 shadow-xs text-xs animate-in fade-in">
          <span className="text-[11px] font-semibold text-slate-500 pl-1">Từ:</span>
          <input
            type="date"
            id="custom-date-start"
            value={customStartDate}
            onChange={(e) => {
              onCustomStartDateChange(e.target.value);
              if (currentRange !== 'custom') onRangeChange('custom');
            }}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span className="text-[11px] font-semibold text-slate-500">Đến:</span>
          <input
            type="date"
            id="custom-date-end"
            value={customEndDate}
            onChange={(e) => {
              onCustomEndDateChange(e.target.value);
              if (currentRange !== 'custom') onRangeChange('custom');
            }}
            className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowCustomInputs(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
            title="Đóng chọn ngày tùy chỉnh"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Active Date Range Indicator Tag (When filtered by date) */}
      {isFilterActive && (
        <div className="inline-flex items-center bg-amber-50 border border-amber-300 text-amber-900 rounded-xl px-2.5 py-1 text-xs font-semibold shadow-2xs gap-1.5 animate-in fade-in">
          {dateField === 'createdAt' ? (
            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
          ) : (
            <RefreshCw className="w-3 h-3 text-blue-600 shrink-0" />
          )}
          <span>
            {currentFieldLabel} ({boundsInfo.label}):{' '}
            <strong className="font-bold text-amber-950">{boundsInfo.rangeText}</strong>
          </span>
          {totalMatchingCount !== undefined && (
            <span className="text-[10px] bg-amber-200/80 text-amber-950 px-1.5 py-0.2 rounded-full font-bold">
              {totalMatchingCount} khách
            </span>
          )}
          <button
            type="button"
            id="btn-clear-date-filter-tag"
            onClick={handleClearDateFilter}
            className="text-amber-700 hover:text-rose-700 hover:bg-amber-100 rounded-full p-0.5 transition-colors cursor-pointer ml-0.5"
            title="Xóa bộ lọc ngày này"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
