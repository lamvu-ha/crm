import { ZaloReminder, Lead } from '../types';
import { saveNotification } from './notificationService';

export const STORAGE_KEY_ZALO_REMINDERS = 'crm_bds_zalo_reminders_v1';

/**
 * Clean phone number for direct Zalo Chat URL (e.g. 0903123456 -> https://zalo.me/0903123456)
 */
export function getZaloChatUrl(phone: string): string {
  if (!phone) return 'https://zalo.me';
  const cleanDigits = phone.replace(/[^0-9]/g, '');
  return `https://zalo.me/${cleanDigits}`;
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
 * Synthesize a friendly 2-tone chime using Web Audio API
 * Ensures reliable sound notification without requiring external audio assets
 */
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.66);
  } catch (e) {
    console.debug('Audio chime synthesis note:', e);
  }
}

/**
 * Show a native browser push notification for a Zalo reminder
 */
export function showBrowserPushNotification(
  reminder: ZaloReminder,
  onOpenZalo?: () => void
): Notification | null {
  if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
    return null;
  }

  try {
    const advanceText = reminder.advanceMinutes > 0 ? ` (Báo trước ${reminder.advanceMinutes}p)` : '';
    const title = `🔔 Nhắc hẹn Zalo: ${reminder.leadName}${advanceText}`;
    const targetDate = new Date(reminder.targetTime);
    const timeFormatted = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')}`;

    const body = `⏰ Đến giờ chăm sóc Zalo lúc ${timeFormatted}!\nSĐT: ${reminder.leadPhone}\nNội dung: ${reminder.notes || 'Chăm sóc & gửi thông tin khách hàng'}`;

    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `zalo-reminder-${reminder.id}`,
      requireInteraction: true // Stays on screen until user interacts
    });

    notif.onclick = () => {
      window.focus();
      if (onOpenZalo) {
        onOpenZalo();
      } else {
        const zaloUrl = getZaloChatUrl(reminder.leadPhone);
        window.open(zaloUrl, '_blank', 'noopener,noreferrer');
      }
      notif.close();
    };

    return notif;
  } catch (err) {
    console.error('Failed to trigger native Notification:', err);
    return null;
  }
}

/**
 * Load all stored Zalo reminders from localStorage
 */
export function getStoredZaloReminders(): ZaloReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZALO_REMINDERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read Zalo reminders from localStorage:', e);
    return [];
  }
}

/**
 * Save or update a Zalo reminder in localStorage
 */
export function saveStoredZaloReminder(reminder: ZaloReminder): void {
  try {
    const existing = getStoredZaloReminders();
    const index = existing.findIndex((r) => r.id === reminder.id);
    let updated: ZaloReminder[];
    if (index >= 0) {
      updated = [...existing];
      updated[index] = reminder;
    } else {
      updated = [reminder, ...existing];
    }
    localStorage.setItem(STORAGE_KEY_ZALO_REMINDERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save Zalo reminder to localStorage:', e);
  }
}

/**
 * Delete a Zalo reminder from localStorage
 */
export function deleteStoredZaloReminder(reminderId: string): void {
  try {
    const existing = getStoredZaloReminders();
    const updated = existing.filter((r) => r.id !== reminderId);
    localStorage.setItem(STORAGE_KEY_ZALO_REMINDERS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete Zalo reminder from localStorage:', e);
  }
}

/**
 * Create a new Zalo reminder object with calculated reminderTime
 */
export function buildZaloReminder(params: {
  lead: Lead;
  targetDateStr: string; // YYYY-MM-DD
  targetTimeStr: string; // HH:mm
  advanceMinutes: number; // 0, 5, 10, 15, 30, 60, etc.
  notes: string;
  createdBy?: string;
}): ZaloReminder {
  const { lead, targetDateStr, targetTimeStr, advanceMinutes, notes, createdBy } = params;

  // Combine target date and time into a Date object
  const targetDate = new Date(`${targetDateStr}T${targetTimeStr}:00`);
  const targetTimeIso = targetDate.toISOString();

  // Calculate reminder trigger time (subtract advanceMinutes)
  const reminderMs = targetDate.getTime() - advanceMinutes * 60 * 1000;
  const reminderDate = new Date(reminderMs);
  const reminderTimeIso = reminderDate.toISOString();

  return {
    id: `zalo-rem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    leadId: lead.id,
    leadName: lead.fullName,
    leadPhone: lead.phone,
    reminderTime: reminderTimeIso,
    targetTime: targetTimeIso,
    advanceMinutes,
    notes: notes.trim() || 'Tương tác chăm sóc khách hàng qua Zalo',
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy
  };
}

/**
 * Check and trigger due reminders
 */
export function checkDueZaloReminders(
  onTrigger: (reminder: ZaloReminder) => void
): void {
  const now = Date.now();
  const reminders = getStoredZaloReminders();
  let changed = false;

  const updatedList = reminders.map((r) => {
    if (r.status === 'pending') {
      const triggerTime = new Date(r.reminderTime).getTime();
      // If reminder time has arrived or passed (within the last 2 hours to avoid ancient stale notifications)
      if (triggerTime <= now && now - triggerTime < 2 * 60 * 60 * 1000) {
        changed = true;
        const triggeredReminder: ZaloReminder = {
          ...r,
          status: 'triggered',
          triggeredAt: new Date().toISOString()
        };

        // Play audio chime
        playNotificationChime();

        // Native push notification
        showBrowserPushNotification(triggeredReminder);

        // Record in in-app notification center
        saveNotification({
          type: 'lead_assigned',
          title: `⏰ Nhắc hẹn Zalo: ${r.leadName}`,
          message: `Đến giờ hẹn Zalo: ${r.notes} (SĐT: ${r.leadPhone})`,
          targetMemberName: r.createdBy,
          leadNames: [r.leadName]
        });

        // Trigger callback for React state (Banner toast)
        onTrigger(triggeredReminder);

        return triggeredReminder;
      }
    }
    return r;
  });

  if (changed) {
    localStorage.setItem(STORAGE_KEY_ZALO_REMINDERS, JSON.stringify(updatedList));
  }
}

/**
 * Format relative remaining time for UI badge
 * e.g. "Hôm nay 14:30 (còn 20p)" or "Ngày mai 09:00"
 */
export function formatZaloReminderBadge(reminder: ZaloReminder, now: number = Date.now()): {
  text: string;
  isUrgent: boolean;
  isOverdue: boolean;
  badgeClass: string;
} {
  const targetTime = new Date(reminder.targetTime).getTime();
  const diffMs = targetTime - now;
  const diffMins = Math.round(diffMs / 60000);

  const d = new Date(reminder.targetTime);
  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const dayStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  let datePrefix = dayStr;
  if (isToday) datePrefix = 'Hôm nay';
  else if (isTomorrow) datePrefix = 'Ngày mai';

  if (reminder.status === 'completed') {
    return {
      text: `✓ Đã xong (${datePrefix} ${timeStr})`,
      isUrgent: false,
      isOverdue: false,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }

  if (diffMs < 0) {
    const overdueMins = Math.abs(diffMins);
    return {
      text: `Trễ ${overdueMins > 60 ? `${Math.floor(overdueMins / 60)}h` : `${overdueMins}p`} (${timeStr})`,
      isUrgent: true,
      isOverdue: true,
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
    };
  }

  if (diffMins <= 30) {
    return {
      text: `Còn ${diffMins}p (${timeStr})`,
      isUrgent: true,
      isOverdue: false,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
    };
  }

  return {
    text: `${datePrefix} ${timeStr}`,
    isUrgent: false,
    isOverdue: false,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
  };
}
