import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Clock,
  Calendar,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Volume2,
  Trash2,
  RotateCcw,
  Check,
  Send,
  Zap
} from 'lucide-react';
import { Lead, ZaloReminder, SalesMember } from '../types';
import {
  getZaloChatUrl,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playNotificationChime,
  showBrowserPushNotification,
  buildZaloReminder,
  saveStoredZaloReminder,
  deleteStoredZaloReminder
} from '../services/zaloReminderService';

interface ZaloReminderModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaveReminder: (updatedLead: Lead, reminder: ZaloReminder) => void;
  onDeleteReminder?: (updatedLead: Lead) => void;
  currentUser?: SalesMember;
}

const QUICK_NOTES = [
  '📋 Gửi bảng giá & chính sách chiết khấu mới',
  '🏠 Hẹn gọi tư vấn chọn căn đẹp qua Zalo',
  '📄 Gửi hình ảnh thực tế / video flycam dự án',
  '🏦 Tư vấn bảng tính dòng tiền & gói vay 0% LS',
  '🤝 Xác nhận lại lịch hẹn xem nhà / sa bàn'
];

export const ZaloReminderModal: React.FC<ZaloReminderModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSaveReminder,
  onDeleteReminder,
  currentUser
}) => {
  if (!isOpen || !lead) return null;

  // Initial date & time calculations
  const now = new Date();
  const defaultDateStr = now.toISOString().split('T')[0];

  // Default to +30 mins rounded to next 5 minutes
  const futureMs = now.getTime() + 30 * 60 * 1000;
  const futureDate = new Date(futureMs);
  const defaultHours = futureDate.getHours().toString().padStart(2, '0');
  const defaultMinutes = (Math.ceil(futureDate.getMinutes() / 5) * 5 % 60).toString().padStart(2, '0');
  const defaultTimeStr = `${defaultHours}:${defaultMinutes}`;

  const existingReminder = lead.zaloReminder;

  // Form states
  const [targetDateStr, setTargetDateStr] = useState<string>(() => {
    if (existingReminder?.targetTime) {
      return existingReminder.targetTime.split('T')[0];
    }
    return defaultDateStr;
  });

  const [targetTimeStr, setTargetTimeStr] = useState<string>(() => {
    if (existingReminder?.targetTime) {
      const d = new Date(existingReminder.targetTime);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    }
    return defaultTimeStr;
  });

  const [advanceMinutes, setAdvanceMinutes] = useState<number>(() => {
    return existingReminder ? existingReminder.advanceMinutes : 15;
  });

  const [notes, setNotes] = useState<string>(() => {
    return existingReminder ? existingReminder.notes : QUICK_NOTES[0];
  });

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setPermissionState(getBrowserNotificationPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermissionState(res);
  };

  const handleTestNotification = () => {
    playNotificationChime();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);

    if (permissionState === 'granted') {
      const testReminder: ZaloReminder = {
        id: 'test',
        leadId: lead.id,
        leadName: lead.fullName,
        leadPhone: lead.phone,
        reminderTime: new Date().toISOString(),
        targetTime: new Date().toISOString(),
        advanceMinutes: 0,
        notes: notes || 'Thử nghiệm âm báo & thông báo đẩy trình duyệt',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      showBrowserPushNotification(testReminder);
    }
  };

  // Quick Time Presets
  const handleApplyPreset = (type: '15m' | '30m' | '1h' | 'tomorrow_morning' | 'tomorrow_afternoon') => {
    const base = new Date();
    if (type === '15m') {
      const d = new Date(base.getTime() + 15 * 60 * 1000);
      setTargetDateStr(d.toISOString().split('T')[0]);
      setTargetTimeStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      setAdvanceMinutes(5);
    } else if (type === '30m') {
      const d = new Date(base.getTime() + 30 * 60 * 1000);
      setTargetDateStr(d.toISOString().split('T')[0]);
      setTargetTimeStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      setAdvanceMinutes(10);
    } else if (type === '1h') {
      const d = new Date(base.getTime() + 60 * 60 * 1000);
      setTargetDateStr(d.toISOString().split('T')[0]);
      setTargetTimeStr(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
      setAdvanceMinutes(15);
    } else if (type === 'tomorrow_morning') {
      const tomorrow = new Date();
      tomorrow.setDate(base.getDate() + 1);
      setTargetDateStr(tomorrow.toISOString().split('T')[0]);
      setTargetTimeStr('09:00');
      setAdvanceMinutes(15);
    } else if (type === 'tomorrow_afternoon') {
      const tomorrow = new Date();
      tomorrow.setDate(base.getDate() + 1);
      setTargetDateStr(tomorrow.toISOString().split('T')[0]);
      setTargetTimeStr('14:30');
      setAdvanceMinutes(15);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Auto-request permission if not granted
    if (permissionState === 'default') {
      const res = await requestBrowserNotificationPermission();
      setPermissionState(res);
    }

    const reminder = buildZaloReminder({
      lead,
      targetDateStr,
      targetTimeStr,
      advanceMinutes,
      notes,
      createdBy: currentUser?.name
    });

    saveStoredZaloReminder(reminder);

    const updatedLead: Lead = {
      ...lead,
      zaloReminder: reminder
    };

    onSaveReminder(updatedLead, reminder);
    onClose();
  };

  const handleMarkCompleted = () => {
    if (!existingReminder) return;
    const completedReminder: ZaloReminder = {
      ...existingReminder,
      status: 'completed',
      completedAt: new Date().toISOString()
    };
    saveStoredZaloReminder(completedReminder);

    const updatedLead: Lead = {
      ...lead,
      zaloReminder: completedReminder
    };

    onSaveReminder(updatedLead, completedReminder);
    onClose();
  };

  const handleDelete = () => {
    if (!existingReminder) return;
    deleteStoredZaloReminder(existingReminder.id);

    const updatedLead: Lead = {
      ...lead,
      zaloReminder: undefined
    };

    if (onDeleteReminder) {
      onDeleteReminder(updatedLead);
    } else {
      onSaveReminder(updatedLead, { ...existingReminder, status: 'cancelled' });
    }
    onClose();
  };

  const zaloUrl = getZaloChatUrl(lead.phone);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto flex flex-col transition-all max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Bell className="w-5 h-5 animate-wiggle" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Nhắc hẹn chăm sóc Zalo
                </h3>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Push Alert
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đặt giờ chuông reo &amp; thông báo đẩy trên trình duyệt trước khi đến lịch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Quick Info Card */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 text-sm truncate">{lead.fullName}</span>
              <span className="text-[11px] text-slate-500 font-medium">({lead.project})</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 font-mono">
              <span>{lead.phone}</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700 font-semibold font-sans">{lead.status}</span>
            </div>
          </div>

          <a
            href={zaloUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Bấm để mở Zalo trực tiếp với số này"
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Zalo</span>
            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
          </a>
        </div>

        {/* Browser Push Notification Permission Banner */}
        <div className={`p-3 rounded-xl border text-xs mb-4 transition-all ${
          permissionState === 'granted'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            : permissionState === 'denied'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <Volume2 className={`w-4 h-4 shrink-0 mt-0.5 ${
                permissionState === 'granted' ? 'text-emerald-600' : 'text-amber-600'
              }`} />
              <div>
                <p className="font-bold">
                  {permissionState === 'granted'
                    ? '✓ Thông báo đẩy trình duyệt đang hoạt động'
                    : permissionState === 'denied'
                      ? '⚠️ Trình duyệt đang chặn thông báo'
                      : '🔔 Cấp quyền thông báo để chuông reo khi đến giờ'}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {permissionState === 'granted'
                    ? 'Hệ thống sẽ phát chuông và hiển thị thông báo màn hình kể cả khi đang xem tab khác.'
                    : permissionState === 'denied'
                      ? 'Vui lòng nhấn vào biểu tượng ổ khóa cạnh thanh địa chỉ web để cho phép Thông báo (Notification).'
                      : 'Bấm nút bên dưới để cấp quyền thông báo đẩy ngay trên thiết bị này.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {permissionState !== 'granted' && permissionState !== 'denied' && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  Bật thông báo
                </button>
              )}
              <button
                type="button"
                onClick={handleTestNotification}
                title="Nghe thử âm chuông & xem thông báo đẩy"
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <Volume2 className="w-3 h-3 text-indigo-600" />
                <span>{testSent ? 'Đang reo... ✓' : 'Thử chuông'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Existing Active Reminder Notice */}
        {existingReminder && existingReminder.status === 'pending' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Đang có lịch nhắc hẹn Zalo:</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMarkCompleted}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-md transition-colors"
                >
                  ✓ Đã xong
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1 text-rose-600 hover:bg-rose-100 rounded-md transition-colors"
                  title="Xoá lịch nhắc này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <p className="mt-1 text-blue-800 font-medium">
              {new Date(existingReminder.targetTime).toLocaleDateString('vi-VN')} lúc{' '}
              {new Date(existingReminder.targetTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
              (Báo trước {existingReminder.advanceMinutes} phút)
            </p>
            <p className="text-[11px] text-blue-700 italic mt-0.5">"{existingReminder.notes}"</p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Chọn nhanh thời điểm hẹn:</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('15m')}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                +15 phút nữa
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('30m')}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                +30 phút nữa
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('1h')}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-semibold rounded-lg border border-slate-200 transition-colors"
              >
                +1 giờ nữa
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('tomorrow_morning')}
                className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded-lg border border-blue-200 transition-colors"
              >
                Sáng mai 09:00
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('tomorrow_afternoon')}
                className="px-2.5 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded-lg border border-blue-200 transition-colors"
              >
                Chiều mai 14:30
              </button>
            </div>
          </div>

          {/* Date & Time Picker Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Ngày hẹn tương tác</span>
              </label>
              <input
                type="date"
                required
                value={targetDateStr}
                onChange={(e) => setTargetDateStr(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Giờ hẹn (HH:mm)</span>
              </label>
              <input
                type="time"
                required
                value={targetTimeStr}
                onChange={(e) => setTargetTimeStr(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Advance Notice (Lead Time for Push Notification) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                <span>Báo trước khi đến giờ hẹn:</span>
              </span>
              <span className="text-[11px] text-blue-600 font-semibold">
                {advanceMinutes === 0
                  ? 'Bắn thông báo đúng giờ'
                  : `Bắn thông báo trước ${advanceMinutes} phút`}
              </span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {[
                { val: 0, label: 'Đúng giờ' },
                { val: 5, label: '5 phút' },
                { val: 10, label: '10 phút' },
                { val: 15, label: '15 phút ⭐' },
                { val: 30, label: '30 phút' },
                { val: 60, label: '1 tiếng' }
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setAdvanceMinutes(opt.val)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    advanceMinutes === opt.val
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs scale-102'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes & Quick suggestions */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Nội dung / Tài liệu cần gửi qua Zalo:</span>
              </label>
              <span className="text-[10px] text-slate-400">Chọn gợi ý bên dưới</span>
            </div>

            <textarea
              rows={2}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Gửi bảng giá mới, gọi xác nhận đi xem nhà mẫu, gửi vị trí Google Maps..."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-1.5"
            />

            <div className="flex flex-wrap gap-1">
              {QUICK_NOTES.map((qn) => (
                <button
                  key={qn}
                  type="button"
                  onClick={() => setNotes(qn)}
                  className="text-[11px] px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors text-left"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{existingReminder ? 'Cập nhật lịch nhắc Zalo' : 'Lưu lịch nhắc hẹn Zalo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
