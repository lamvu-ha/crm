import { Appointment, SalesMember } from '../types';
import { saveNotification, AppNotification } from './notificationService';

export const STORAGE_KEY_NOTIFIED_APPOINTMENTS = 'crm_bds_notified_appointments_v1';
export const NOTIFICATION_LEAD_TIME_MINUTES = 30; // 30 minutes notification threshold

export interface NotifiedRecord {
  appointmentId: string;
  stage: '30m' | '10m';
  notifiedAt: number;
}

/**
 * Check if the browser supports native Web Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return Notification.permission;
  }
}

/**
 * Synthesize a pleasant real-estate alert chime using Web Audio API.
 * 3-note ascending arpeggio (C5 -> E5 -> G5) to clearly catch sales attention
 * without jarring or requiring external audio asset files.
 */
export function playAppointmentAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.28 }, // C5
      { freq: 659.25, time: 0.12, dur: 0.32 }, // E5
      { freq: 783.99, time: 0.24, dur: 0.55 }, // G5
      { freq: 1046.50, time: 0.38, dur: 0.70 } // C6
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.28, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.02);
    });
  } catch (err) {
    console.debug('Audio chime note:', err);
  }
}

/**
 * Safely parse appointment date (YYYY-MM-DD) and time (HH:mm) into a timestamp
 */
export function parseAppointmentTime(dateStr: string, timeStr: string): number | null {
  if (!dateStr || !timeStr) return null;

  try {
    const trimmedDate = dateStr.trim();
    const trimmedTime = timeStr.trim();

    // Standard ISO parse
    const dt = new Date(`${trimmedDate}T${trimmedTime}:00`);
    if (!isNaN(dt.getTime())) {
      return dt.getTime();
    }

    // Fallback: manual parsing
    const dateParts = trimmedDate.split(/[-/]/);
    const timeParts = trimmedTime.split(':');
    if (dateParts.length >= 3 && timeParts.length >= 2) {
      let year = parseInt(dateParts[0], 10);
      let month = parseInt(dateParts[1], 10) - 1;
      let day = parseInt(dateParts[2], 10);

      // Handle DD/MM/YYYY format if inverted
      if (year < 100 && parseInt(dateParts[2], 10) > 1000) {
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        year = parseInt(dateParts[2], 10);
      }

      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);

      const parsed = new Date(year, month, day, hours, minutes, 0);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
  } catch (e) {
    console.error('Failed to parse appointment time:', dateStr, timeStr, e);
  }
  return null;
}

export interface AppointmentTimeInfo {
  timestamp: number | null;
  diffMs: number;
  diffMinutes: number;
  isUpcomingWithin30Min: boolean;
  isImminent: boolean; // within 10 minutes
  isPast: boolean;
  timeRemainingText: string;
}

/**
 * Calculate countdown and time info for an appointment
 */
export function getAppointmentTimeInfo(
  appointment: Appointment,
  nowMs: number = Date.now()
): AppointmentTimeInfo {
  const timestamp = parseAppointmentTime(appointment.date, appointment.time);
  if (!timestamp) {
    return {
      timestamp: null,
      diffMs: 0,
      diffMinutes: 0,
      isUpcomingWithin30Min: false,
      isImminent: false,
      isPast: false,
      timeRemainingText: 'Chưa xác định'
    };
  }

  const diffMs = timestamp - nowMs;
  const diffMinutes = Math.round(diffMs / (60 * 1000));
  const isPast = diffMs < 0;
  // Upcoming within 30 minutes: from now up to 30 mins (allowing 2 mins grace window after start)
  const isUpcomingWithin30Min = !isPast && diffMinutes <= NOTIFICATION_LEAD_TIME_MINUTES && diffMinutes >= 0;
  const isImminent = !isPast && diffMinutes <= 10 && diffMinutes >= 0;

  let timeRemainingText = '';
  if (isPast) {
    const overdueMins = Math.abs(diffMinutes);
    if (overdueMins < 60) {
      timeRemainingText = `Đã qua ${overdueMins} phút`;
    } else {
      const hours = Math.floor(overdueMins / 60);
      timeRemainingText = `Đã qua ${hours} giờ`;
    }
  } else if (diffMinutes === 0) {
    timeRemainingText = 'Đang diễn ra ngay bây giờ!';
  } else if (diffMinutes < 60) {
    timeRemainingText = `Còn ${diffMinutes} phút`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    timeRemainingText = mins > 0 ? `Còn ${hours}h ${mins}p` : `Còn ${hours} giờ`;
  }

  return {
    timestamp,
    diffMs,
    diffMinutes,
    isUpcomingWithin30Min,
    isImminent,
    isPast,
    timeRemainingText
  };
}

/**
 * Get notified records from localStorage
 */
function getNotifiedRecords(): Record<string, NotifiedRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFIED_APPOINTMENTS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

/**
 * Save notified record to localStorage
 */
function markAppointmentNotified(appointmentId: string, stage: '30m' | '10m'): void {
  try {
    const records = getNotifiedRecords();
    records[`${appointmentId}_${stage}`] = {
      appointmentId,
      stage,
      notifiedAt: Date.now()
    };
    // Also clean records older than 48 hours to avoid unbounded storage
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    const cleaned: Record<string, NotifiedRecord> = {};
    for (const [k, v] of Object.entries(records)) {
      if (v.notifiedAt > cutoff) {
        cleaned[k] = v;
      }
    }
    localStorage.setItem(STORAGE_KEY_NOTIFIED_APPOINTMENTS, JSON.stringify(cleaned));
  } catch (e) {
    console.error('Failed to mark appointment notified', e);
  }
}

/**
 * Check if notification was already dispatched for this appointment at this stage
 */
function hasBeenNotified(appointmentId: string, stage: '30m' | '10m'): boolean {
  try {
    const records = getNotifiedRecords();
    return Boolean(records[`${appointmentId}_${stage}`]);
  } catch (e) {
    return false;
  }
}

/**
 * Show native Browser Push Notification for an upcoming appointment
 */
export function dispatchAppointmentBrowserNotification(
  appointment: Appointment,
  minutesLeft: number,
  onOpen?: () => void
): Notification | null {
  if (!isBrowserNotificationSupported()) {
    console.warn('Browser does not support notifications');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Browser notification permission is not granted:', Notification.permission);
    return null;
  }

  try {
    const timeDisplay = minutesLeft <= 0 
      ? 'Đang diễn ra ngay bây giờ!' 
      : `Còn ${minutesLeft} phút nữa (lúc ${appointment.time})`;

    const title = `🚨 [NHẮC HẸN BĐS] ${appointment.leadName} (${timeDisplay})`;
    const body = `📍 Địa điểm: ${appointment.location || appointment.project}\n⏰ Giờ hẹn: ${appointment.time} - Ngày: ${appointment.date}\n👤 Khách hàng: ${appointment.leadName} (${appointment.leadPhone})\n👉 Nhấn để mở lịch hẹn và thông tin chi tiết!`;

    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `crm-appt-${appointment.id}-${minutesLeft <= 10 ? '10m' : '30m'}`,
      requireInteraction: true // Keeps alert visible until user acts
    });

    notification.onclick = () => {
      window.focus();
      if (onOpen) {
        onOpen();
      } else {
        window.location.hash = '#appointments';
      }
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('Error dispatching native browser notification:', error);
    return null;
  }
}

export interface UpcomingAppointmentAlert {
  appointment: Appointment;
  minutesLeft: number;
  stage: '30m' | '10m';
}

/**
 * Periodically scan appointments and fire browser notifications for those starting in <= 30 minutes
 */
export function checkUpcomingAppointments(params: {
  appointments: Appointment[];
  currentUser: SalesMember;
  onTrigger?: (alert: UpcomingAppointmentAlert) => void;
  onOpenAppointment?: (appointment: Appointment) => void;
  nowMs?: number;
}): UpcomingAppointmentAlert[] {
  const {
    appointments,
    currentUser,
    onTrigger,
    onOpenAppointment,
    nowMs = Date.now()
  } = params;

  if (!appointments || appointments.length === 0) return [];

  const triggeredAlerts: UpcomingAppointmentAlert[] = [];

  // Filter only active appointments that haven't been completed or cancelled
  const activeAppointments = appointments.filter((a) => a.status === 'Chờ đi xem');

  for (const appt of activeAppointments) {
    // Role matching:
    // If admin, check all appointments.
    // If tpkd or sale, check appointments assigned to them (or unassigned)
    if (currentUser.role === 'sale') {
      const isAssignedToUser = appt.assignee && 
        appt.assignee.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
      const isUnassigned = !appt.assignee || appt.assignee === 'Chưa gán' || appt.assignee === 'Tự động chia';
      if (!isAssignedToUser && !isUnassigned) {
        continue;
      }
    }

    const timeInfo = getAppointmentTimeInfo(appt, nowMs);
    
    // Only check if upcoming within 30 minutes (and not past by more than 2 minutes)
    if (!timeInfo.isPast && timeInfo.diffMinutes <= NOTIFICATION_LEAD_TIME_MINUTES && timeInfo.diffMinutes >= 0) {
      const stage: '30m' | '10m' = timeInfo.diffMinutes <= 10 ? '10m' : '30m';

      // Check if already notified for this stage
      if (!hasBeenNotified(appt.id, stage)) {
        markAppointmentNotified(appt.id, stage);

        // 1. Play alert sound chime
        playAppointmentAlertChime();

        // 2. Dispatch native browser push notification
        dispatchAppointmentBrowserNotification(appt, timeInfo.diffMinutes, () => {
          if (onOpenAppointment) {
            onOpenAppointment(appt);
          }
        });

        // 3. Save into in-app notification center
        saveNotification({
          type: 'appointment_reminder',
          title: `⏰ Lịch hẹn BĐS sắp tới: ${appt.leadName} (${timeInfo.timeRemainingText})`,
          message: `Lịch hẹn lúc ${appt.time} tại ${appt.location || appt.project}. Khách: ${appt.leadName} (${appt.leadPhone}). Phụ trách: ${appt.assignee || 'Chuyên viên'}.`,
          targetMemberEmail: currentUser.email,
          targetMemberName: appt.assignee || currentUser.name,
          leadCount: 1,
          leadNames: [`${appt.leadName} (${appt.leadPhone})`]
        });

        const alertItem: UpcomingAppointmentAlert = {
          appointment: appt,
          minutesLeft: timeInfo.diffMinutes,
          stage
        };
        triggeredAlerts.push(alertItem);

        if (onTrigger) {
          onTrigger(alertItem);
        }
      }
    }
  }

  return triggeredAlerts;
}

/**
 * Dispatch a demo/test push notification to verify sound and browser permissions
 */
export async function sendTestAppointmentNotification(
  onOpen?: () => void
): Promise<{ success: boolean; message: string }> {
  if (!isBrowserNotificationSupported()) {
    return {
      success: false,
      message: 'Trình duyệt này không hỗ trợ Web Notification API.'
    };
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    return {
      success: false,
      message: 'Quyền thông báo chưa được cấp phép. Vui lòng cho phép trong cài đặt trình duyệt!'
    };
  }

  // Play audio chime
  playAppointmentAlertChime();

  // Create demo appointment
  const testAppt: Appointment = {
    id: `test-appt-${Date.now()}`,
    leadId: 'demo-lead-1',
    leadName: 'Nguyễn Văn Khang',
    leadPhone: '0903889911',
    date: new Date().toISOString().split('T')[0],
    time: '14:30',
    project: 'Nhà Phố Trung Tâm Quận 1',
    location: '128 Nguyễn Trãi, Phường Bến Thành, Quận 1',
    assignee: 'Sales MayHomes',
    status: 'Chờ đi xem',
    note: 'Khách hàng hẹn xem nhà mẫu thực tế và nhận bộ pháp lý'
  };

  dispatchAppointmentBrowserNotification(testAppt, 25, onOpen);

  return {
    success: true,
    message: 'Đã phát chuông và gửi thông báo đẩy mẫu lên màn hình thiết bị của bạn thành công!'
  };
}
