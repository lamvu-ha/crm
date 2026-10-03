import React, { useState, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Check,
  Bell,
  ArrowRight,
  Flame,
  Pause,
  Play,
  History,
  FileText
} from 'lucide-react';
import { Lead, PeriodicFollowUpReminder, SalesMember } from '../types';
import {
  calculateNextFollowUpDate,
  buildPeriodicFollowUpReminder,
  formatPeriodicFollowUpBadge,
  deletePeriodicFollowUp,
  playPeriodicFollowUpChime
} from '../services/periodicFollowUpService';

interface PeriodicFollowUpModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaveFollowUp: (updatedLead: Lead, reminder: PeriodicFollowUpReminder) => void;
  onDeleteFollowUp?: (updatedLead: Lead) => void;
  currentUser?: SalesMember;
}

const CYCLE_PRESETS = [
  { days: 1, label: 'Hàng ngày (1d)', desc: 'Khách cực nóng / sắp cọc', color: 'border-rose-400 bg-rose-50 text-rose-950' },
  { days: 2, label: 'Mỗi 2 ngày', desc: 'Chăm sóc sát sao', color: 'border-orange-400 bg-orange-50 text-orange-950' },
  { days: 3, label: 'Mỗi 3 ngày (Khuyên dùng)', desc: 'Chu kỳ vàng BĐS nhà phố', color: 'border-violet-500 bg-violet-50 text-violet-950 font-black ring-2 ring-violet-500/20' },
  { days: 5, label: 'Mỗi 5 ngày', desc: 'Khách cân nhắc tài chính', color: 'border-blue-400 bg-blue-50 text-blue-950' },
  { days: 7, label: 'Mỗi 7 ngày (1 tuần)', desc: 'Gửi rổ hàng mới định kỳ', color: 'border-emerald-400 bg-emerald-50 text-emerald-950' },
  { days: 14, label: 'Mỗi 14 ngày (2 tuần)', desc: 'Khách đầu tư dài hạn', color: 'border-slate-300 bg-slate-50 text-slate-800' }
];

const QUICK_GOAL_PRESETS = [
  'Gửi 2 - 3 căn mới hạ giá 300 - 500tr cùng phân khúc',
  'Hỏi thăm khách đã xem thêm khu vực nào khác chưa',
  'Cập nhật tiến độ sổ hồng & pháp lý căn đang quan tâm',
  'Mời cafe cuối tuần & tính toán phương án vay ngân hàng',
  'Gửi video thực tế hẻm xe hơi & nhà đối diện',
  'Kiểm tra lại xem khách đã giải ngân nguồn tiền sẵn chưa'
];

export const PeriodicFollowUpModal: React.FC<PeriodicFollowUpModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSaveFollowUp,
  onDeleteFollowUp,
  currentUser
}) => {
  if (!isOpen || !lead) return null;

  const existingFollowUp = lead.periodicFollowUp;

  // Form states
  const [cycleDays, setCycleDays] = useState<number>(() => {
    return existingFollowUp ? existingFollowUp.cycleDays : 3;
  });

  const [isCustomCycle, setIsCustomCycle] = useState<boolean>(() => {
    if (!existingFollowUp) return false;
    return !CYCLE_PRESETS.some((p) => p.days === existingFollowUp.cycleDays);
  });

  const [customDaysInput, setCustomDaysInput] = useState<string>(() => {
    return existingFollowUp ? String(existingFollowUp.cycleDays) : '3';
  });

  const [nextDateStr, setNextDateStr] = useState<string>(() => {
    if (existingFollowUp?.nextFollowUpDate) {
      return existingFollowUp.nextFollowUpDate;
    }
    return calculateNextFollowUpDate(new Date(), 3);
  });

  const [timeStr, setTimeStr] = useState<string>(() => {
    return existingFollowUp?.nextFollowUpTime || '09:00';
  });

  const [notes, setNotes] = useState<string>(() => {
    return existingFollowUp?.notes || QUICK_GOAL_PRESETS[0];
  });

  const [status, setStatus] = useState<'active' | 'paused' | 'completed'>(() => {
    return existingFollowUp?.status || 'active';
  });

  // When cycleDays change, recalculate default next date if not set to a custom future date
  const handleSelectCycle = (days: number) => {
    setCycleDays(days);
    setIsCustomCycle(false);
    setNextDateStr(calculateNextFollowUpDate(new Date(), days));
  };

  const handleCustomDaysChange = (valStr: string) => {
    setCustomDaysInput(valStr);
    const parsed = parseInt(valStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setCycleDays(parsed);
      setNextDateStr(calculateNextFollowUpDate(new Date(), parsed));
    }
  };

  const handleSave = () => {
    const finalCycle = Math.max(1, cycleDays);
    const reminder = buildPeriodicFollowUpReminder(
      lead,
      finalCycle,
      nextDateStr,
      timeStr,
      notes,
      currentUser?.name || lead.assignee
    );
    reminder.status = status;

    playPeriodicFollowUpChime();

    const updatedLead: Lead = {
      ...lead,
      periodicFollowUp: reminder,
      updatedAt: new Date().toISOString()
    };

    onSaveFollowUp(updatedLead, reminder);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy lịch follow-up định kỳ cho khách hàng này?')) {
      const updatedLead = deletePeriodicFollowUp(lead);
      if (onDeleteFollowUp) {
        onDeleteFollowUp(updatedLead);
      }
      onClose();
    }
  };

  const badgeInfo = formatPeriodicFollowUpBadge(existingFollowUp);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/30 border border-violet-400/40 text-violet-300 flex items-center justify-center shadow-inner shrink-0">
              <RotateCcw className="w-6 h-6 text-amber-300 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/20 px-2 py-0.5 rounded-full border border-violet-400/30 text-violet-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  Cadence Follow-Up
                </span>
                {existingFollowUp && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeInfo.badgeClass}`}>
                    {existingFollowUp.status === 'paused' ? 'Đang tạm dừng' : `Mỗi ${existingFollowUp.cycleDays} ngày`}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                Nhắc Nhở Follow-up Định Kỳ
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Cài đặt lịch chu kỳ tự động chăm sóc khách hàng chưa chốt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Strip */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">{lead.fullName}</span>
            <span className="text-slate-400 font-mono text-[11px]">({lead.phone})</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-200">
              {lead.status}
            </span>
            <span className="text-[11px] text-slate-500">
              Sale: <strong className="text-slate-800">{lead.assignee || 'Chưa gán'}</strong>
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Section 1: Chu kỳ lặp lại (Cycle Days) */}
          <div className="space-y-2">
            <label className="block font-black text-slate-900 text-xs sm:text-sm flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-violet-600" />
                <span>Chọn chu kỳ lặp lại (Mỗi mấy ngày):</span>
              </span>
              <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                Đang chọn: Mỗi {cycleDays} ngày
              </span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CYCLE_PRESETS.map((preset) => {
                const isSelected = !isCustomCycle && cycleDays === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handleSelectCycle(preset.days)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? `${preset.color} ring-2 ring-violet-500 shadow-xs`
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="font-extrabold text-xs flex items-center justify-between">
                      <span>{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-700 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight truncate">
                      {preset.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Cycle Days input */}
            <div className="pt-1 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setIsCustomCycle(true);
                  const p = parseInt(customDaysInput, 10) || 4;
                  setCycleDays(p);
                  setNextDateStr(calculateNextFollowUpDate(new Date(), p));
                }}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
                  isCustomCycle
                    ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Tùy chỉnh số ngày:
              </button>
              {isCustomCycle && (
                <div className="flex items-center space-x-1.5 animate-fadeIn">
                  <span>Mỗi</span>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={customDaysInput}
                    onChange={(e) => handleCustomDaysChange(e.target.value)}
                    className="w-16 p-1.5 border border-violet-400 rounded-lg text-center font-bold text-slate-900 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                    autoFocus
                  />
                  <span>ngày nhắc 1 lần</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Thời gian lần follow-up tiếp theo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Lần nhắc tiếp theo (Ngày):</span>
              </label>
              <input
                type="date"
                value={nextDateStr}
                onChange={(e) => setNextDateStr(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Giờ nhắc trong ngày:</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <select
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:ring-2 focus:ring-violet-500 focus:outline-none text-xs"
                >
                  <option value="09:00">09:00 Sáng (Khuyên dùng)</option>
                  <option value="10:30">10:30 Sáng</option>
                  <option value="11:30">11:30 Trưa</option>
                  <option value="14:30">14:30 Chiều</option>
                  <option value="16:30">16:30 Chiều</option>
                  <option value="19:00">19:00 Tối</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Mục tiêu / Ghi chú chăm sóc định kỳ */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>Mục tiêu chăm sóc / Kịch bản tương tác:</span>
              </label>
              <span className="text-[10px] text-slate-400">Bấm gợi ý bên dưới để điền nhanh</span>
            </div>

            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Gửi 2-3 căn mới hạ giá hẻm xe hơi, hỏi thăm tiến độ..."
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {QUICK_GOAL_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(preset)}
                  className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-violet-50 hover:text-violet-900 hover:border-violet-200 border border-slate-200 text-slate-600 text-left transition-colors cursor-pointer truncate max-w-full"
                  title={preset}
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Section 4: Trạng thái & Lịch sử chu kỳ */}
          {existingFollowUp && (
            <div className="p-3 rounded-2xl bg-violet-50/60 border border-violet-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <History className="w-4 h-4 text-violet-700" />
                  <span className="font-extrabold text-violet-950">Tiến độ chu kỳ hiện tại:</span>
                </div>
                <span className="text-[11px] font-bold text-violet-800 bg-white px-2 py-0.5 rounded-md border border-violet-200">
                  Đã hoàn thành {existingFollowUp.completedCyclesCount || 0} lần
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                <span>Trạng thái hoạt động:</span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setStatus(status === 'active' ? 'paused' : 'active')}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition-colors flex items-center gap-1 ${
                      status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}
                  >
                    {status === 'active' ? (
                      <>
                        <Play className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                        <span>Đang chạy định kỳ</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3 fill-amber-600 text-amber-600" />
                        <span>Đang tạm dừng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {existingFollowUp.lastFollowedUpAt && (
                <p className="text-[10px] text-slate-500">
                  Lần chăm sóc gần nhất: <strong>{new Date(existingFollowUp.lastFollowedUpAt).toLocaleString('vi-VN')}</strong>
                </p>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            {existingFollowUp && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
                title="Hủy lịch follow-up định kỳ cho khách này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hủy chu kỳ</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-violet-500/20 transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{existingFollowUp ? 'Lưu Cập Nhật Chu Kỳ' : 'Bắt Đầu Follow-up Định Kỳ'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
