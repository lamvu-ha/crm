import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Plus,
  AlertCircle,
  Bell,
  BellRing,
  Volume2,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Appointment, Lead, SalesMember } from '../types';
import { appointmentConflicts } from '../utils/customerWorkflow';
import { formatDateVN } from '../utils/crmCalculations';
import { 
  getAppointmentTimeInfo, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestAppointmentNotification,
  isBrowserNotificationSupported
} from '../services/appointmentReminderService';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  leads: Lead[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  onSelectLeadById: (leadId: string) => void;
  currentUser?: SalesMember;
  onShowToast?: (message: string) => void;
}

export const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  leads,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onSelectLeadById,
  currentUser,
  onShowToast
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:30');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [filterMyOnly, setFilterMyOnly] = useState(false);

  // Browser notification permission state
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(() => 
    getNotificationPermission()
  );
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Live timer tick every 15 seconds to update countdowns
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermissionState(perm);
    if (perm === 'granted') {
      onShowToast?.('Đã bật quyền thông báo đẩy (Browser Push) thành công!');
    } else if (perm === 'denied') {
      onShowToast?.('Quyền thông báo bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.');
    }
  };

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      const res = await sendTestAppointmentNotification(() => {
        onShowToast?.('Bạn vừa nhấn vào thông báo đẩy lịch hẹn mẫu!');
      });
      setPermissionState(getNotificationPermission());
      onShowToast?.(res.message);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const selectedLead = leads.find((l) => l.id === selectedLeadId);

  const schedulingConflicts = selectedLead ? appointmentConflicts({date,time,assignee:selectedLead.assignee}, appointments) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const conflicts = appointmentConflicts({date, time, assignee: selectedLead.assignee}, appointments);
    if (conflicts.length) {
      onShowToast?.(`Trùng lịch của ${selectedLead.assignee}: ${conflicts.map(app=>`${app.leadName} lúc ${app.time}`).join(', ')}. Mỗi lịch dành 60 phút; vui lòng chọn giờ khác.`);
      return;
    }
    onAddAppointment({
      leadId: selectedLead.id,
      leadName: selectedLead.fullName,
      leadPhone: selectedLead.phone,
      date,
      time,
      project: selectedLead.project,
      location: location || `Dự án ${selectedLead.project}`,
      assignee: selectedLead.assignee,
      status: 'Chờ đi xem',
      note
    });

    setShowAddModal(false);
    setLocation('');
    setNote('');
  };

  // Filter by user if toggled
  const filteredAppointments = appointments.filter((a) => {
    if (filterMyOnly && currentUser) {
      return a.assignee?.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
    }
    return true;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  // Calculate upcoming appointments within 30 minutes
  const imminentAppointments = appointments.filter((a) => {
    if (a.status !== 'Chờ đi xem') return false;
    if (currentUser?.role === 'sale') {
      const isMine = a.assignee?.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
      const isUnassigned = !a.assignee || a.assignee === 'Chưa gán';
      if (!isMine && !isUnassigned) return false;
    }
    const info = getAppointmentTimeInfo(a, nowTime);
    return info.isUpcomingWithin30Min;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Browser Notification Banner & Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-4 rounded-2xl border border-amber-500/30 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
              permissionState === 'granted' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : permissionState === 'denied'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}>
              {permissionState === 'granted' ? (
                <BellRing className="w-5 h-5 animate-pulse" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                  Thông Báo Đẩy Lịch Hẹn Trình Duyệt (Browser Push)
                </h3>
                {permissionState === 'granted' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3 h-3" /> Đã kích hoạt
                  </span>
                ) : permissionState === 'denied' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    <ShieldAlert className="w-3 h-3" /> Bị chặn
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Chưa cấp quyền
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Hệ thống tự động phát chuông âm thanh và đẩy thông báo ra màn hình Desktop/Di động trước <strong className="text-amber-300">30 phút</strong> để Sales chuẩn bị đón khách, kiểm tra tài liệu và không bị lỡ hẹn.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            {permissionState !== 'granted' && isBrowserNotificationSupported() && (
              <button
                type="button"
                id="request-browser-notif-btn"
                onClick={handleRequestPermission}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Bật thông báo đẩy</span>
              </button>
            )}

            <button
              type="button"
              id="test-browser-notif-btn"
              onClick={handleTestNotification}
              disabled={isTestingNotification}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Phát chuông thử nghiệm & gửi thông báo đẩy mẫu"
            >
              <Volume2 className="w-4 h-4 text-amber-300" />
              <span>{isTestingNotification ? 'Đang gửi...' : 'Thử chuông & Thông báo'}</span>
            </button>
          </div>
        </div>

        {permissionState === 'denied' && (
          <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý:</strong> Quyền thông báo đang bị tắt trên trình duyệt. Bạn hãy bấm vào biểu tượng <strong>Ổ khoá (Lock)</strong> trên thanh địa chỉ URL của trình duyệt &gt; Chuyển <strong>Thông báo (Notifications)</strong> sang <strong>Cho phép (Allow)</strong> để nhận chuông báo.
            </span>
          </div>
        )}
      </div>

      {/* Urgent Imminent Appointments Alert (Within 30 Minutes) */}
      {imminentAppointments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border-2 border-amber-500 rounded-2xl p-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-rose-600 text-white rounded-lg shadow-xs animate-bounce">
                <BellRing className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-rose-900 tracking-wide uppercase flex items-center gap-1.5">
                  ⚡ Cảnh Báo: Có {imminentAppointments.length} cuộc hẹn gặp khách trong vòng 30 phút!
                </h3>
                <p className="text-xs text-amber-900">
                  Sales vui lòng kiểm tra xe, hồ sơ pháp lý dự án và liên hệ xác nhận trước với khách hàng.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-rose-600 text-white rounded-full">
              Khẩn cấp
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {imminentAppointments.map((appt) => {
              const timeInfo = getAppointmentTimeInfo(appt, nowTime);
              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-xl p-3.5 border-2 border-amber-400 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                        <Clock className="w-3.5 h-3.5" />
                        {timeInfo.timeRemainingText}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {appt.time} ({appt.date})
                      </span>
                    </div>

                    <div 
                      onClick={() => onSelectLeadById(appt.leadId)}
                      className="cursor-pointer group"
                    >
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {appt.leadName}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 font-medium">{appt.leadPhone}</p>
                    </div>

                    <div className="mt-2 text-xs text-slate-700 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                      <div className="font-semibold text-slate-900 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{appt.project}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{appt.location}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 font-medium truncate">
                      Sale: <strong>{appt.assignee}</strong>
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${appt.leadPhone}`}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1"
                        title="Gọi điện cho khách ngay"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Gọi ngay</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => onUpdateAppointmentStatus(appt.id, 'Đã xem')}
                        className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Đánh dấu đã gặp xong"
                      >
                        Đã xem
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-amber-600 shrink-0" />
            Lịch Hẹn Khảo Sát & Dẫn Khách Đi Xem BĐS
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng: <strong>{appointments.length}</strong> lịch hẹn • Đang chờ đi xem: <strong>{appointments.filter(a => a.status === 'Chờ đi xem').length}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <button
              type="button"
              onClick={() => setFilterMyOnly(!filterMyOnly)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${
                filterMyOnly
                  ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-amber-400'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterMyOnly ? 'Đang lọc: Lịch của tôi' : 'Lịch hẹn của tôi'}</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Lên lịch hẹn mới
          </button>
        </div>
      </div>

      {/* Appointments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {sortedAppointments.length === 0 ? (
          <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-2xl border border-slate-200 p-4">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Chưa có lịch hẹn xem nhà nào</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Nhấn nút "Lên Lịch Hẹn Mới" hoặc chọn khách hàng trong bảng để đặt lịch khảo sát thực địa.
            </p>
          </div>
        ) : (
          sortedAppointments.map((item) => {
            const isUpcoming = item.status === 'Chờ đi xem';
            const isCompleted = item.status === 'Đã xem';
            const timeInfo = getAppointmentTimeInfo(item, nowTime);
            const isUrgent30m = isUpcoming && timeInfo.isUpcomingWithin30Min;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isUrgent30m
                    ? 'border-amber-500 ring-2 ring-amber-400/40 bg-gradient-to-b from-amber-50/40 to-white'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Status & Time */}
                  <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1.5">
                    <div className="flex items-center text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                      {item.time} - {formatDateVN(item.date)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isUrgent30m && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white animate-pulse">
                          ⚡ {timeInfo.timeRemainingText}
                        </span>
                      )}

                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isUpcoming
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div
                    onClick={() => onSelectLeadById(item.leadId)}
                    className="cursor-pointer hover:text-amber-600 transition-colors mb-2.5 group"
                  >
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-amber-600 flex items-center justify-between">
                      <span>{item.leadName}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                    </h3>
                    <p className="text-xs font-mono text-slate-500 font-medium">{item.leadPhone}</p>
                  </div>

                  {/* Location & Project */}
                  <div className="space-y-1 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2.5">
                    <div className="font-bold text-slate-900 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1.5 text-rose-500 shrink-0" />
                      <span className="truncate">{item.project}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-5 leading-tight">{item.location}</p>
                  </div>

                  {item.note && (
                    <div className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60 mb-2.5">
                      "{item.note}"
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-1 gap-2">
                  <div className="text-xs text-slate-500 flex items-center font-medium truncate">
                    <User className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                    <span className="truncate">{item.assignee}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <a
                      href={`tel:${item.leadPhone}`}
                      className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="Gọi điện cho khách"
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    {item.status === 'Chờ đi xem' && (
                      <>
                        <button
                          onClick={() => onUpdateAppointmentStatus(item.id, 'Đã xem')}
                          title="Đánh dấu đã xem xong"
                          className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                        >
                          Đã xem
                        </button>
                        <button
                          onClick={() => onUpdateAppointmentStatus(item.id, 'Khách dời lịch')}
                          title="Khách dời lịch"
                          className="px-2 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          Dời lịch
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3 sm:mb-4 flex items-center shrink-0">
              <Calendar className="w-5 h-5 mr-2 text-amber-600" />
              Lên Lịch Hẹn Dẫn Khách Xem BĐS
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Chọn khách hàng <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-base sm:text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                >
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName} ({l.phone}) - {l.project}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Ngày hẹn <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-base sm:text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Giờ hẹn <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-base sm:text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <p className={schedulingConflicts.length ? 'rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800' : 'text-xs text-slate-500'}>{schedulingConflicts.length ? ('Trùng lịch: '+schedulingConflicts.map(app=>app.leadName+' lúc '+app.time).join(', ')+'. Vui lòng chọn giờ khác.') : 'Mỗi lịch hẹn dành 60 phút. Hệ thống kiểm tra trùng lịch của cùng nhân viên.'}</p>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Địa điểm gặp / Dự án xem
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={selectedLead ? `Nhà mẫu ${selectedLead.project} hoặc địa chỉ nhà` : 'Địa chỉ xem nhà'}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-base sm:text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Ghi chú chuẩn bị (Tài liệu, xe đón, quà tặng...)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Chuẩn bị 2 bộ hồ sơ pháp lý căn 3PN, đón khách tại Landmark 81..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-base sm:text-xs text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-xs transition-colors text-center"
                >
                  Lưu Lịch Hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
