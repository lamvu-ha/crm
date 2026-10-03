import React from 'react';
import {
  PhoneCall,
  Phone,
  X,
  Check,
  Clock,
  User,
  RotateCcw
} from 'lucide-react';
import { CallbackReminder } from '../types';
import { getCleanPhoneTelUrl } from '../services/callbackReminderService';

interface CallbackReminderToastProps {
  reminders: CallbackReminder[];
  onDismiss: (id: string) => void;
  onOpenLeadDetail?: (leadId: string) => void;
  onMarkCompleted?: (reminder: CallbackReminder) => void;
  onSnooze?: (reminder: CallbackReminder, minutes: number) => void;
}

export const CallbackReminderToast: React.FC<CallbackReminderToastProps> = ({
  reminders,
  onDismiss,
  onOpenLeadDetail,
  onMarkCompleted,
  onSnooze
}) => {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[130] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {reminders.map((rem) => {
        const telUrl = getCleanPhoneTelUrl(rem.leadPhone);
        const targetDate = new Date(rem.targetTime);
        const timeFormatted = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

        return (
          <div
            key={rem.id}
            className="pointer-events-auto bg-slate-950 text-white rounded-2xl p-4 shadow-2xl border-2 border-emerald-500 animate-slide-in flex flex-col gap-2.5 ring-4 ring-emerald-500/20"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div className="flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-emerald-400 animate-bounce" />
                  <span className="font-black text-xs text-emerald-300 uppercase tracking-wider">
                    Đến giờ gọi lại ({timeFormatted})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(rem.id)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div>
              <div className="flex items-baseline justify-between gap-1">
                <h4 className="font-extrabold text-sm text-white truncate">
                  {rem.leadName}
                </h4>
                <span className="font-mono text-xs text-emerald-300 font-bold shrink-0">
                  {rem.leadPhone}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 bg-slate-900 p-2 rounded-xl border border-slate-800 font-medium">
                "{rem.notes}"
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={telUrl}
                onClick={() => {
                  if (onMarkCompleted) onMarkCompleted(rem);
                  onDismiss(rem.id);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/30"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Gọi ngay</span>
              </a>

              {onOpenLeadDetail && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLeadDetail(rem.leadId);
                    onDismiss(rem.id);
                  }}
                  className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                  title="Mở hồ sơ khách hàng"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}

              {onSnooze && (
                <button
                  type="button"
                  onClick={() => {
                    onSnooze(rem, 10);
                    onDismiss(rem.id);
                  }}
                  className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1"
                  title="Nhắc lại sau 10 phút nữa"
                >
                  <Clock className="w-3 h-3" />
                  <span>+10p</span>
                </button>
              )}

              {onMarkCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkCompleted(rem);
                    onDismiss(rem.id);
                  }}
                  className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold transition-colors"
                  title="Đánh dấu đã gọi xong"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
