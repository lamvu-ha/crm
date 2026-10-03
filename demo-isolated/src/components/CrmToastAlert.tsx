import React from 'react';
import { AlertTriangle, CheckCircle, Info, AlertOctagon, X, UserCheck, Phone, ExternalLink } from 'lucide-react';

export interface ToastAlertData {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  saleName?: string;
  leadName?: string;
  phone?: string;
  project?: string;
  status?: string;
  matchedLeadId?: string;
  onActionClick?: () => void;
  actionText?: string;
}

interface CrmToastAlertProps {
  toast: ToastAlertData | null;
  onClose: () => void;
  isLoginScreen?: boolean;
}

export const CrmToastAlert: React.FC<CrmToastAlertProps> = ({
  toast,
  onClose,
  isLoginScreen = false
}) => {
  if (!toast) return null;

  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';
  const isInfo = toast.type === 'info';

  const positionClass = isLoginScreen
    ? 'fixed top-5 right-5 z-[9999] max-w-md w-[calc(100%-2.5rem)] sm:w-auto'
    : 'fixed top-4 right-3 md:top-5 md:right-5 left-3 sm:left-auto z-[9999] max-w-md w-[calc(100%-1.5rem)] sm:w-auto';

  // Red Toast for Duplicate Phone / Severe Alert
  if (isError) {
    return (
      <div 
        id="crm-red-toast-duplicate-alert"
        className={`${positionClass} bg-gradient-to-br from-rose-700 via-rose-600 to-red-600 text-white p-4 sm:p-5 rounded-2xl shadow-2xl border-2 border-rose-300 shadow-rose-950/70 ring-4 ring-rose-500/40 animate-in fade-in slide-in-from-top-3 duration-200 transition-all`}
        role="alert"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/40 shadow-inner">
              <AlertTriangle className="w-6 h-6 text-amber-200 animate-bounce" />
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-950/70 px-2 py-0.5 rounded-full border border-rose-400/50 text-rose-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Cảnh báo trùng số điện thoại
                </span>
              </div>

              <h4 className="text-sm font-black text-white leading-snug tracking-wide">
                {toast.title || 'SỐ ĐIỆN THOẠI ĐÃ TỒN TẠI TRONG CRM!'}
              </h4>

              <p className="text-xs text-rose-50 font-medium leading-relaxed">
                {toast.message}
              </p>

              {/* Highlighting details & Current Sale in charge */}
              {(toast.saleName || toast.leadName || toast.phone) && (
                <div className="mt-2.5 pt-2.5 border-t border-rose-400/40 space-y-2 text-xs">
                  {toast.saleName && (
                    <div className="flex items-center flex-wrap gap-1.5 bg-rose-900/60 p-2 rounded-xl border border-rose-400/30">
                      <span className="text-rose-100 font-bold text-[11px] whitespace-nowrap">Sale đang phụ trách:</span>
                      <span className="inline-flex items-center gap-1.5 bg-white text-rose-900 font-black px-2.5 py-0.5 rounded-lg shadow-sm text-xs border border-rose-200">
                        <UserCheck className="w-3.5 h-3.5 text-rose-700" />
                        <span>{toast.saleName}</span>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center flex-wrap gap-2 text-[11px] text-rose-100">
                    {toast.leadName && (
                      <span>Khách hiện tại: <strong className="text-amber-200">{toast.leadName}</strong></span>
                    )}
                    {toast.phone && (
                      <span>• SĐT: <strong className="font-mono text-white bg-black/30 px-1.5 py-0.5 rounded">{toast.phone}</strong></span>
                    )}
                    {toast.project && (
                      <span>• Dự án: <strong className="text-amber-100">{toast.project}</strong></span>
                    )}
                    {toast.status && (
                      <span className="bg-amber-400/20 text-amber-200 border border-amber-300/40 px-1.5 py-0.2 rounded font-bold">{toast.status}</span>
                    )}
                  </div>

                  {toast.onActionClick && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onActionClick?.();
                        onClose();
                      }}
                      className="mt-2 w-full py-1.5 px-3 bg-white hover:bg-rose-50 active:scale-98 text-rose-900 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-rose-700" />
                      <span>{toast.actionText || 'Xem hồ sơ khách & Sale phụ trách'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo"
            aria-label="Đóng cảnh báo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Warning Toast (Amber)
  if (isWarning) {
    return (
      <div 
        className={`${positionClass} bg-amber-600 text-white p-3.5 rounded-2xl shadow-xl border border-amber-400 flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-150`}
        role="alert"
      >
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-5 h-5 text-amber-200 shrink-0" />
          <span>{toast.message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/20 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Standard Success Toast (Dark slate with emerald icon)
  return (
    <div 
      className={`${positionClass} bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center justify-between gap-3 text-xs font-semibold animate-bounce`}
      role="status"
    >
      <div className="flex items-center space-x-2">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-0.5 rounded text-slate-400 hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
