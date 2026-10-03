import React from 'react';
import {
  Bell,
  MessageSquare,
  X,
  ExternalLink,
  Check,
  User,
  Clock
} from 'lucide-react';
import { ZaloReminder } from '../types';
import { getZaloChatUrl } from '../services/zaloReminderService';

interface ZaloReminderToastProps {
  reminders: ZaloReminder[];
  onDismiss: (id: string) => void;
  onOpenLeadDetail?: (leadId: string) => void;
  onMarkCompleted?: (reminder: ZaloReminder) => void;
}

export const ZaloReminderToast: React.FC<ZaloReminderToastProps> = ({
  reminders,
  onDismiss,
  onOpenLeadDetail,
  onMarkCompleted
}) => {
  if (!reminders || reminders.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
      {reminders.map((rem) => {
        const zaloUrl = getZaloChatUrl(rem.leadPhone);
        const targetDate = new Date(rem.targetTime);
        const timeFormatted = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

        return (
          <div
            key={rem.id}
            className="pointer-events-auto bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border-2 border-blue-500 animate-slide-in flex flex-col gap-2.5 ring-4 ring-blue-500/20"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <div className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-blue-400 animate-bounce" />
                  <span className="font-extrabold text-xs text-blue-300 uppercase tracking-wider">
                    Đến giờ nhắc Zalo ({timeFormatted})
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
                <span className="font-mono text-xs text-blue-300 font-bold shrink-0">
                  {rem.leadPhone}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 line-clamp-2 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60 font-medium">
                "{rem.notes}"
              </p>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onDismiss(rem.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Mở Zalo ngay</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>

              {onOpenLeadDetail && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLeadDetail(rem.leadId);
                    onDismiss(rem.id);
                  }}
                  className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Xem thông tin chi tiết khách hàng"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
              )}

              {onMarkCompleted && (
                <button
                  type="button"
                  onClick={() => onMarkCompleted(rem)}
                  className="px-2.5 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Đã trao đổi xong qua Zalo"
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
