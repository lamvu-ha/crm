import { CallbackReminder, Lead } from '../types';
import { saveNotification } from './notificationService';

export const STORAGE_KEY_CALLBACK_REMINDERS = 'crm_bds_callback_reminders_v1';

/**
 * Clean phone number for tel: link (e.g. 0903 123 456 -> tel:0903123456)
 */
export function getCleanPhoneTelUrl(phone: string): string {
  if (!phone) return '#';
  const cleanDigits = phone.replace(/[^0-9+]/g, '');
  return `tel:${cleanDigits}`;
}

/**
 * Check if the current browser environment supports the Web Notification API
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission state
 */
export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Error requesting browser notification permission:', error);
    return Notification.permission;
  }
}

/**
 * Synthesize a distinct classic telephone double-ring alert chime using Web Audio API.
 * Uses 440Hz + 480Hz dual-frequency telephone supervisory tone.
 */
export function playCallbackPhoneChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Helper for a single telephone ring pulse
    const playRingBurst = (startTime: number, duration: number) => {
      [440, 480].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
        gain.gain.setValueAtTime(0.2, startTime + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };

    // Double-ring cadence: ring 1 (0.4s) -> pause (0.15s) -> ring 2 (0.4s)
    playRingBurst(now, 0.38);
    playRingBurst(now + 0.52, 0.42);
  } catch (e) {
    console.debug('Callback audio ring synthesis note:', e);
  }
}

/**
 * Show a native browser push notification for a Callback reminder
 */
export function showBrowserPushCallbackNotification(
  reminder: CallbackReminder,
  onCallNow?: () => void
): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const advanceText = reminder.advanceMinutes > 0 ? ` (Báo trước ${reminder.advanceMinutes}p)` : '';
    const title = `📞 NHẮC GỌI LẠI: ${reminder.leadName}${advanceText}`;
    const targetDate = new Date(reminder.targetTime);
    const hours = targetDate.getHours().toString().padStart(2, '0');
    const minutes = targetDate.getMinutes().toString().padStart(2, '0');
    const timeFormatted = `${hours}:${minutes}`;

    const body = `⏰ Đến giờ hẹn gọi lại lúc ${timeFormatted}!\nSĐT: ${reminder.leadPhone}\nNội dung: ${reminder.notes || 'Gọi lại tư vấn khách hàng'}`;

    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `callback-reminder-${reminder.id}`,
      requireInteraction: true // Stays on screen until user interacts
    });

    notif.onclick = () => {
      window.focus();
      if (onCallNow) {
        onCallNow();
      } else {
        const telUrl = getCleanPhoneTelUrl(reminder.leadPhone);
        window.location.href = telUrl;
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.error('Failed to trigger native Notification for callback:', err);
    return null;
  }
}

/**
 * Load all stored Callback reminders from localStorage
 */
export function getStoredCallbackReminders(): CallbackReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CALLBACK_REMINDERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read Callback reminders from localStorage:', e);
    return [];
  }
}

/**
 * Save or update a Callback reminder in localStorage
 */
export function saveStoredCallbackReminder(reminder: CallbackReminder): void {
  try {
    const existing = getStoredCallbackReminders();
    const index = existing.findIndex((r) => r.id === reminder.id);
    let updated: CallbackReminder[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = reminder;
    } else {
      updated = [reminder, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_CALLBACK_REMINDERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save Callback reminder to localStorage:', e);
  }
}

/**
 * Delete a Callback reminder from localStorage
 */
export function deleteStoredCallbackReminder(reminderId: string): void {
  try {
    const existing = getStoredCallbackReminders();
    const updated = existing.filter((r) => r.id !== reminderId);
    localStorage.setItem(STORAGE_KEY_CALLBACK_REMINDERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete Callback reminder from localStorage:', e);
  }
}

/**
 * Mark a Callback reminder as completed in localStorage
 */
export function markCallbackReminderCompleted(reminderId: string): CallbackReminder | null {
  try {
    const existing = getStoredCallbackReminders();
    const index = existing.findIndex((r) => r.id === reminderId);
    if (index >= 0) {
      const updatedItem: CallbackReminder = {
        ...existing[index],
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      existing[index] = updatedItem;
      localStorage.setItem(STORAGE_KEY_CALLBACK_REMINDERS, JSON.stringify(existing));
      return updatedItem;
    }
    return null;
  } catch (e) {
    console.error('Failed to mark Callback reminder completed:', e);
    return null;
  }
}

/**
 * Create a new Callback reminder object with calculated reminderTime
 */
export function buildCallbackReminder(params: {
  lead: Lead;
  targetDateStr: string; // YYYY-MM-DD
  targetTimeStr: string; // HH:mm
  advanceMinutes: number; // 0, 5, 10, 15, 30, 60
  notes: string;
  createdBy?: string;
}): CallbackReminder {
  const { lead, targetDateStr, targetTimeStr, advanceMinutes, notes, createdBy } = params;

  // Combine target date and time into a Date object
  const targetDate = new Date(`${targetDateStr}T${targetTimeStr}:00`);
  const targetTimeIso = targetDate.toISOString();

  // Calculate reminder trigger time (subtract advanceMinutes)
  const reminderMs = targetDate.getTime() - advanceMinutes * 60 * 1000;
  const reminderDate = new Date(reminderMs);
  const reminderTimeIso = reminderDate.toISOString();

  return {
    id: `call-rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    leadId: lead.id,
    leadName: lead.fullName,
    leadPhone: lead.phone,
    reminderTime: reminderTimeIso,
    targetTime: targetTimeIso,
    advanceMinutes,
    notes: notes.trim() || 'Gọi lại chăm sóc & tư vấn khách hàng',
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy
  };
}

/**
 * Check and trigger due callback reminders
 */
export function checkDueCallbackReminders(
  onTrigger: (reminder: CallbackReminder) => void
): void {
  const now = Date.now();
  const reminders = getStoredCallbackReminders();
  let changed = false;

  const updatedList = reminders.map((r) => {
    if (r.status === 'pending') {
      const triggerTime = new Date(r.reminderTime).getTime();
      // If reminder time has arrived or passed (within the last 2 hours to avoid ancient stale notifications)
      if (triggerTime <= now && now - triggerTime < 2 * 60 * 60 * 1000) {
        changed = true;
        const triggeredReminder: CallbackReminder = {
          ...r,
          status: 'triggered',
          triggeredAt: new Date().toISOString()
        };

        // Play phone ring chime
        playCallbackPhoneChime();

        // Native push notification
        showBrowserPushCallbackNotification(triggeredReminder);

        // Record in in-app notification center
        saveNotification({
          type: 'lead_assigned',
          title: `📞 Nhắc hẹn gọi lại: ${r.leadName}`,
          message: `Đến giờ hẹn gọi lại: ${r.notes} (SĐT: ${r.leadPhone})`,
          targetMemberName: r.createdBy,
          leadNames: [r.leadName]
        });

        // Callback hook to UI
        onTrigger(triggeredReminder);

        return triggeredReminder;
      }
    }
    return r;
  });

  if (changed) {
    localStorage.setItem(STORAGE_KEY_CALLBACK_REMINDERS, JSON.stringify(updatedList));
  }
}

/**
 * Human-readable badge text and styling for a Callback reminder
 */
export function formatCallbackReminderBadge(reminder: CallbackReminder): {
  text: string;
  badgeClass: string;
  isOverdue: boolean;
} {
  try {
    const targetDate = new Date(reminder.targetTime);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);

    const isToday = targetDate.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();

    const hours = targetDate.getHours().toString().padStart(2, '0');
    const minutes = targetDate.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (reminder.status === 'completed') {
      return {
        text: `Đã gọi lại (${timeStr})`,
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        isOverdue: false
      };
    }

    if (diffMinutes < -10) {
      return {
        text: `Quá hạn gọi ${Math.abs(diffMinutes)}p (${timeStr})`,
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
        isOverdue: true
      };
    }

    if (diffMinutes <= 0) {
      return {
        text: `Đến giờ gọi ngay (${timeStr})`,
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 animate-pulse',
        isOverdue: false
      };
    }

    if (isToday) {
      if (diffMinutes < 60) {
        return {
          text: `Hôm nay ${timeStr} (còn ${diffMinutes}p)`,
          badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
          isOverdue: false
        };
      }
      return {
        text: `Hôm nay ${timeStr}`,
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
        isOverdue: false
      };
    }

    if (isTomorrow) {
      return {
        text: `Ngày mai ${timeStr}`,
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        isOverdue: false
      };
    }

    const day = targetDate.getDate().toString().padStart(2, '0');
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    return {
      text: `${timeStr} (${day}/${month})`,
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
      isOverdue: false
    };
  } catch (e) {
    return {
      text: 'Đã hẹn gọi',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      isOverdue: false
    };
  }
}
