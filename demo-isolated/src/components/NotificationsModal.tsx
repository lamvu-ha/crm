import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  ExternalLink, 
  Users, 
  Calendar, 
  ArrowRight,
  Clock,
  Volume2,
  BellRing,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { AppNotification, markNotificationAsRead, markAllNotificationsAsRead } from '../services/notificationService';
import { SalesMember } from '../types';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestAppointmentNotification,
  isBrowserNotificationSupported
} from '../services/appointmentReminderService';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onRefreshNotifications: () => void;
  currentUser: SalesMember;
  onSwitchView?: (view: 'table' | 'pipeline' | 'sales_team' | 'appointments') => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onRefreshNotifications,
  currentUser,
  onSwitchView
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() => 
    getNotificationPermission()
  );
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleRequestPerm = async () => {
    const res = await requestNotificationPermission();
    setPermissionState(res);
  };

  const handleTestChime = async () => {
    setIsTesting(true);
    try {
      await sendTestAppointmentNotification();
      setPermissionState(getNotificationPermission());
    } finally {
      setIsTesting(false);
    }
  };

  // Filter notifications relevant to current user:
  // Admin sees all. Sale/TPKD sees those targeted at them or general system announcements.
  const relevantNotifications = currentUser.role === 'admin'
    ? notifications
    : notifications.filter(
        n => !n.targetMemberEmail || 
             n.targetMemberEmail.toLowerCase() === currentUser.email.toLowerCase() ||
             (n.targetMemberName && n.targetMemberName.toLowerCase() === currentUser.name.toLowerCase())
      );

  const unreadCount = relevantNotifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    markNotificationAsRead(id);
    onRefreshNotifications();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    onRefreshNotifications();
  };

  const handleClearAll = () => {
    localStorage.removeItem('crm_bds_notifications_v1');
    onRefreshNotifications();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                Trung Tâm Thông Báo CRM
                {unreadCount > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} mới
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Nhắc hẹn BĐS trước 30 phút, nạp lead mới &amp; quy chế SLA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Push Notification Permission Quick Bar */}
        <div className="my-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              permissionState === 'granted' 
                ? 'bg-emerald-100 text-emerald-700' 
                : permissionState === 'denied'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {permissionState === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800">
                Thông báo đẩy Desktop &amp; Di động:{' '}
                {permissionState === 'granted' ? (
                  <span className="text-emerald-600">Đang bật</span>
                ) : permissionState === 'denied' ? (
                  <span className="text-rose-600">Bị chặn</span>
                ) : (
                  <span className="text-amber-600">Chưa cấp quyền</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500">
                Tự động nhắc lịch hẹn xem BĐS trước 30 phút
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {permissionState !== 'granted' && isBrowserNotificationSupported() && (
              <button
                type="button"
                onClick={handleRequestPerm}
                className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
              >
                Bật ngay
              </button>
            )}
            <button
              type="button"
              onClick={handleTestChime}
              disabled={isTesting}
              className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
              title="Thử chuông báo & thông báo mẫu"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Thử chuông</span>
            </button>
          </div>
        </div>

        {/* Quick action bar */}
        {relevantNotifications.length > 0 && (
          <div className="flex items-center justify-between py-1.5 px-1 text-xs border-b border-slate-100 shrink-0">
            <button
              onClick={handleMarkAllRead}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 hover:underline"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
            <button
              onClick={handleClearAll}
              className="text-slate-400 hover:text-rose-600 flex items-center gap-1 hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xoá lịch sử</span>
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="overflow-y-auto flex-1 my-2 space-y-2.5 pr-1">
          {relevantNotifications.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center mx-auto mb-2">
                <Bell className="w-6 h-6" />
              </div>
              <p className="font-medium text-sm text-slate-600">Hiện không có thông báo mới</p>
              <p className="text-xs text-slate-400 mt-1">
                Khi có lịch hẹn sắp diễn ra trong 30 phút hoặc lead mới được nạp, hệ thống sẽ tự động phát chuông và hiển thị thông báo tại đây.
              </p>
            </div>
          ) : (
            relevantNotifications.map((notif) => {
              const isAppointment = notif.type === 'appointment_reminder';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    notif.read
                      ? 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                      : isAppointment
                      ? 'bg-rose-50/70 border-rose-300 shadow-2xs'
                      : 'bg-amber-50/70 border-amber-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          notif.read 
                            ? 'bg-slate-300' 
                            : isAppointment
                            ? 'bg-rose-500 ring-4 ring-rose-200'
                            : 'bg-amber-500 ring-4 ring-amber-200'
                        }`} />
                        <h4 className={`text-xs sm:text-sm font-bold flex items-center gap-1.5 ${
                          notif.read ? 'text-slate-700' : isAppointment ? 'text-rose-900' : 'text-slate-900'
                        }`}>
                          {isAppointment && <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                          <span>{notif.title}</span>
                        </h4>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed pl-4">
                        {notif.message}
                      </p>

                      {notif.leadNames && notif.leadNames.length > 0 && !isAppointment && (
                        <div className="mt-2 pl-4">
                          <div className="bg-white/80 rounded-lg p-2 border border-amber-200/80 text-[11px] text-slate-700 space-y-1">
                            <strong className="text-amber-900 block text-[10px] uppercase tracking-wider">
                              Danh sách khách phân bổ:
                            </strong>
                            {notif.leadNames.slice(0, 4).map((name, i) => (
                              <div key={i} className="truncate">• {name}</div>
                            ))}
                            {notif.leadNames.length > 4 && (
                              <div className="text-slate-400 italic">
                                ... và {notif.leadNames.length - 4} khách khác
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2.5 pl-4 text-[11px] text-slate-400">
                        <span>{new Date(notif.timestamp).toLocaleString('vi-VN')}</span>
                        
                        <div className="flex items-center gap-2">
                          {notif.targetMemberName && (
                            <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                              Phụ trách: {notif.targetMemberName}
                            </span>
                          )}

                          {isAppointment && onSwitchView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notif.id);
                                onClose();
                                onSwitchView('appointments');
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] transition-colors"
                            >
                              Xem lịch hẹn
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 shrink-0 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500">
            Tự động cảnh báo &amp; phát chuông cho Sales trước giờ hẹn
          </div>
          <button
            onClick={() => {
              onClose();
              if (onSwitchView) onSwitchView('table');
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
          >
            <span>Vào Bảng Lead</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
