import React, { useState, useEffect } from 'react';
import {
  X,
  PhoneCall,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  Trash2,
  RotateCcw,
  Check,
  Phone,
  Bell,
  ArrowRight,
  Copy
} from 'lucide-react';
import { Lead, CallbackReminder, SalesMember } from '../types';
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  playCallbackPhoneChime,
  showBrowserPushCallbackNotification,
  buildCallbackReminder,
  saveStoredCallbackReminder,
  deleteStoredCallbackReminder,
  getCleanPhoneTelUrl
} from '../services/callbackReminderService';

interface CallbackReminderModalProps {
  isOpen: boolean;
  lead: Lead | null;
  onClose: () => void;
  onSaveReminder: (updatedLead: Lead, reminder: CallbackReminder) => void;
  onDeleteReminder?: (updatedLead: Lead) => void;
  currentUser?: SalesMember;
}

const QUICK_CALL_REASONS = [
  '📞 Khách đang bận họp, hẹn gọi lại sau',
  '🚗 Khách đang lái xe / đi ngoài đường',
  '💰 Báo giá chốt & chính sách chiết khấu mới',
  '👨‍👩‍👧 Khách bàn bạc với gia đình, hẹn gọi lại',
  '🏦 Tư vấn gói vay ngân hàng & phương án đóng tiền',
  '📍 Xác nhận lại địa chỉ & giờ hẹn xem nhà thực tế'
];

export const CallbackReminderModal: React.FC<CallbackReminderModalProps> = ({
  isOpen,
  lead,
  onClose,
  onSaveReminder,
  onDeleteReminder,
  currentUser
}) => {
  if (!isOpen || !lead) return null;

  const now = new Date();
  const defaultDateStr = now.toISOString().split('T')[0];

  // Default time: +30 minutes rounded to nearest 5 minutes
  const futureMs = now.getTime() + 30 * 60 * 1000;
  const futureDate = new Date(futureMs);
  const defaultHours = futureDate.getHours().toString().padStart(2, '0');
  const defaultMinutes = (Math.ceil(futureDate.getMinutes() / 5) * 5 % 60).toString().padStart(2, '0');
  const defaultTimeStr = `${defaultHours}:${defaultMinutes}`;

  const existingReminder = lead.callbackReminder;

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
    return existingReminder ? existingReminder.advanceMinutes : 5;
  });

  const [notes, setNotes] = useState<string>(() => {
    return existingReminder ? existingReminder.notes : QUICK_CALL_REASONS[0];
  });

  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [testSent, setTestSent] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPermissionState(getBrowserNotificationPermission());
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermissionState(res);
  };

  const handleTestAudioAndPush = () => {
    playCallbackPhoneChime();
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);

    if (permissionState === 'granted') {
      const testReminder: CallbackReminder = {
        id: 'test-callback',
        leadId: lead.id,
        leadName: lead.fullName,
        leadPhone: lead.phone,
        reminderTime: new Date().toISOString(),
        targetTime: new Date().toISOString(),
        advanceMinutes: 0,
        notes: notes || 'Kiểm tra thử thông báo nhắc cuộc gọi CRM',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      showBrowserPushCallbackNotification(testReminder);
    }
  };

  // Quick preset handlers
  const applyQuickOffsetMinutes = (minutes: number) => {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    setTargetDateStr(d.toISOString().split('T')[0]);
    const h = d.getHours().toString().padStart(2, '0');
    const m = (Math.ceil(d.getMinutes() / 5) * 5 % 60).toString().padStart(2, '0');
    setTargetTimeStr(`${h}:${m}`);
  };

  const applyTomorrowPreset = (hour: number, minute: number) => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setTargetDateStr(d.toISOString().split('T')[0]);
    setTargetTimeStr(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
  };

  const handleSave = () => {
    const reminder = buildCallbackReminder({
      lead,
      targetDateStr,
      targetTimeStr,
      advanceMinutes,
      notes,
      createdBy: currentUser?.name || lead.assignee
    });

    saveStoredCallbackReminder(reminder);

    const updatedLead: Lead = {
      ...lead,
      callbackReminder: reminder
    };

    onSaveReminder(updatedLead, reminder);
    onClose();
  };

  const handleDelete = () => {
    if (existingReminder) {
      deleteStoredCallbackReminder(existingReminder.id);
    }
    const updatedLead: Lead = {
      ...lead,
      callbackReminder: undefined
    };
    if (onDeleteReminder) {
      onDeleteReminder(updatedLead);
    } else {
      onSaveReminder(updatedLead, undefined as unknown as CallbackReminder);
    }
    onClose();
  };

  // Calculate preview diff
  const previewTarget = new Date(`${targetDateStr}T${targetTimeStr}:00`);
  const diffMinutes = Math.round((previewTarget.getTime() - Date.now()) / 60000);
  const isValidFuture = !isNaN(previewTarget.getTime()) && diffMinutes > -5;

  const copyPhone = () => {
    navigator.clipboard.writeText(lead.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <PhoneCall className="w-5 h-5 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Nhắc Nhở Gọi Lại (Callback Reminder)
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Tự động gửi thông báo push & chuông điện thoại đúng giờ hẹn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Badge */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="font-bold text-slate-800 truncate">{lead.fullName}</span>
            <span className="text-slate-400">•</span>
            <span className="font-mono text-emerald-700 font-bold">{lead.phone}</span>
            <button 
              type="button" 
              onClick={copyPhone}
              className="text-slate-400 hover:text-slate-600"
              title="Sao chép SĐT"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <a
            href={getCleanPhoneTelUrl(lead.phone)}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span>Gọi thử</span>
          </a>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 touch-scroll modal-scroll-lock">

          {/* Browser Notification Permission Banner */}
          {permissionState !== 'granted' ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start space-x-3 text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0 text-xs flex-1">
                <p className="font-bold">Chưa bật Thông báo đẩy trình duyệt!</p>
                <p className="text-amber-800 mt-0.5">
                  Để chuông báo và thông báo nhắc nhở tự động hiện lên khi bạn đang dùng tab khác hoặc thu nhỏ trình duyệt, hãy cấp quyền thông báo.
                </p>
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-extrabold rounded-lg shadow-2xs transition-all inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Cho phép nhận thông báo push ngay</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Thông báo đẩy (Web Push) đã sẵn sàng hoạt động</span>
              </div>
              <button
                type="button"
                onClick={handleTestAudioAndPush}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline inline-flex items-center space-x-1"
                title="Bấm để nghe thử chuông điện thoại reo"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{testSent ? 'Đã phát chuông!' : 'Thử chuông 🔔'}</span>
              </button>
            </div>
          )}

          {/* Quick Shortcuts */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ⚡ Chọn nhanh thời gian gọi lại:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(15)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                +15 phút nữa
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(30)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                +30 phút nữa
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(60)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                +1 tiếng nữa
              </button>
              <button
                type="button"
                onClick={() => applyQuickOffsetMinutes(120)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                +2 tiếng nữa
              </button>
              <button
                type="button"
                onClick={() => applyTomorrowPreset(9, 0)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                Sáng mai (09:00)
              </button>
              <button
                type="button"
                onClick={() => applyTomorrowPreset(14, 30)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                Chiều mai (14:30)
              </button>
              <button
                type="button"
                onClick={() => applyTomorrowPreset(17, 0)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                Chiều mai (17:00)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(Date.now() + 48 * 60 * 60 * 1000);
                  setTargetDateStr(d.toISOString().split('T')[0]);
                  setTargetTimeStr('09:30');
                }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-slate-700"
              >
                Ngày mốt (09:30)
              </button>
            </div>
          </div>

          {/* Date & Time Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ngày hẹn gọi lại:</span>
              </label>
              <input
                type="date"
                value={targetDateStr}
                onChange={(e) => setTargetDateStr(e.target.value)}
                min={defaultDateStr}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Giờ cụ thể:</span>
              </label>
              <input
                type="time"
                value={targetTimeStr}
                onChange={(e) => setTargetTimeStr(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Advance Minutes Alert */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                <span>Thời điểm bắn thông báo push:</span>
              </label>
              <select
                value={advanceMinutes}
                onChange={(e) => setAdvanceMinutes(Number(e.target.value))}
                className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={0}>Đúng giờ hẹn (0 phút)</option>
                <option value={5}>Báo trước 5 phút</option>
                <option value={10}>Báo trước 10 phút</option>
                <option value={15}>Báo trước 15 phút</option>
                <option value={30}>Báo trước 30 phút</option>
              </select>
            </div>
          </div>

          {/* Time Diff Preview */}
          <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
            isValidFuture
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className="font-medium">
              {isValidFuture ? (
                <>
                  ⏰ Hẹn gọi: <span className="font-bold">{targetTimeStr} ngày {targetDateStr.split('-').reverse().join('/')}</span>
                  {diffMinutes > 0 && <span className="text-emerald-700 ml-1">({diffMinutes > 60 ? `sau ${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}p` : `sau ${diffMinutes} phút`})</span>}
                </>
              ) : (
                '⚠️ Thời gian chọn nằm trong quá khứ! Vui lòng chọn giờ trong tương lai.'
              )}
            </span>
            {advanceMinutes > 0 && isValidFuture && (
              <span className="text-[11px] font-bold px-1.5 py-0.5 bg-white rounded border border-emerald-300 text-emerald-800">
                Push trước {advanceMinutes}p
              </span>
            )}
          </div>

          {/* Reason / Notes */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              📝 Nội dung / Lý do cần gọi lại:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_CALL_REASONS.map((reason, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setNotes(reason)}
                  className={`text-[11px] px-2 py-1 rounded-md border text-left transition-colors ${
                    notes === reason
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú cần trao đổi khi gọi lại cho khách..."
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            {existingReminder && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors inline-flex items-center space-x-1"
                title="Hủy lịch nhắc gọi lại này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hủy nhắc</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={!isValidFuture}
              onClick={handleSave}
              className={`px-4 py-2 text-xs font-extrabold rounded-xl shadow-md transition-all inline-flex items-center space-x-1.5 ${
                isValidFuture
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white cursor-pointer'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>{existingReminder ? 'Cập nhật lịch gọi' : 'Lưu lịch gọi lại'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
