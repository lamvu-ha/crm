import { PeriodicFollowUpReminder, Lead, InteractionLog } from '../types';
import { saveNotification } from './notificationService';

export const STORAGE_KEY_PERIODIC_FOLLOW_UPS = 'crm_bds_periodic_follow_ups_v1';

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculate the next follow-up date by adding cycleDays to fromDate
 */
export function calculateNextFollowUpDate(
  fromDate: Date | string = new Date(),
  cycleDays: number = 3
): string {
  const base = typeof fromDate === 'string' ? new Date(fromDate) : new Date(fromDate);
  const target = new Date(base.getTime() + cycleDays * 24 * 60 * 60 * 1000);
  return formatDateToYYYYMMDD(target);
}

/**
 * Get days difference between a YYYY-MM-DD date and today
 * Returns:
 *  0: Today is due
 *  < 0: Overdue by abs(diff) days
 *  > 0: Remaining days until due
 */
export function getDaysUntilFollowUp(targetDateStr: string): number {
  if (!targetDateStr) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const [y, m, d] = targetDateStr.split('-').map(Number);
  if (!y || !m || !d) return 0;
  
  const target = new Date(y, m - 1, d);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Build a new PeriodicFollowUpReminder object
 */
export function buildPeriodicFollowUpReminder(
  lead: Lead,
  cycleDays: number = 3,
  nextDateStr?: string,
  timeStr: string = '09:00',
  notes: string = 'Chăm sóc, gửi rổ hàng mới và hỏi thăm tiến độ khách hàng',
  createdBy?: string
): PeriodicFollowUpReminder {
  const nowIso = new Date().toISOString();
  const actualNextDate = nextDateStr || calculateNextFollowUpDate(new Date(), cycleDays);

  return {
    id: `periodic_${lead.id}_${Date.now()}`,
    leadId: lead.id,
    leadName: lead.fullName,
    leadPhone: lead.phone,
    cycleDays: Math.max(1, cycleDays),
    lastFollowedUpAt: lead.periodicFollowUp?.lastFollowedUpAt,
    nextFollowUpDate: actualNextDate,
    nextFollowUpTime: timeStr,
    notes: notes.trim(),
    status: 'active',
    createdAt: lead.periodicFollowUp?.createdAt || nowIso,
    createdBy: createdBy || lead.assignee || 'Sale CRM',
    updatedAt: nowIso,
    completedCyclesCount: lead.periodicFollowUp?.completedCyclesCount || 0,
    history: lead.periodicFollowUp?.history || []
  };
}

/**
 * Format badge information for UI display
 */
export function formatPeriodicFollowUpBadge(reminder?: PeriodicFollowUpReminder | null): {
  label: string;
  subLabel: string;
  isDueToday: boolean;
  isOverdue: boolean;
  daysLeft: number;
  badgeClass: string;
  dotColor: string;
} {
  if (!reminder || reminder.status !== 'active') {
    return {
      label: reminder?.status === 'paused' ? 'Đang tạm dừng' : 'Chưa cài đặt',
      subLabel: reminder?.status === 'paused' ? 'Tạm dừng nhắc' : 'Chưa có chu kỳ',
      isDueToday: false,
      isOverdue: false,
      daysLeft: 999,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400'
    };
  }

  const daysLeft = getDaysUntilFollowUp(reminder.nextFollowUpDate);
  const formattedDate = reminder.nextFollowUpDate.split('-').reverse().slice(0, 2).join('/'); // DD/MM

  if (daysLeft === 0) {
    return {
      label: `Hôm nay đến hạn (Mỗi ${reminder.cycleDays}d)`,
      subLabel: `Đến hạn lúc ${reminder.nextFollowUpTime || '09:00'}`,
      isDueToday: true,
      isOverdue: false,
      daysLeft: 0,
      badgeClass: 'bg-amber-100 text-amber-950 border-amber-300 font-black animate-pulse',
      dotColor: 'bg-amber-500'
    };
  }

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return {
      label: `Quá hạn ${overdueDays} ngày (Mỗi ${reminder.cycleDays}d)`,
      subLabel: `Hạn là ${formattedDate}`,
      isDueToday: false,
      isOverdue: true,
      daysLeft,
      badgeClass: 'bg-rose-100 text-rose-950 border-rose-300 font-black',
      dotColor: 'bg-rose-600'
    };
  }

  return {
    label: `Mỗi ${reminder.cycleDays} ngày (${formattedDate})`,
    subLabel: `Còn ${daysLeft} ngày nữa`,
    isDueToday: false,
    isOverdue: false,
    daysLeft,
    badgeClass: 'bg-violet-100 text-violet-950 border-violet-300 font-bold',
    dotColor: 'bg-violet-600'
  };
}

/**
 * Action: Mark current follow-up completed and advance to next cycle
 */
export function completePeriodicFollowUpCycle(
  lead: Lead,
  completionNote?: string,
  completedBy?: string
): { updatedLead: Lead; reminder: PeriodicFollowUpReminder; newLog: InteractionLog } {
  const current = lead.periodicFollowUp || buildPeriodicFollowUpReminder(lead);
  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = formatDateToYYYYMMDD(now);
  const nextDate = calculateNextFollowUpDate(now, current.cycleDays);
  const newCompletedCount = (current.completedCyclesCount || 0) + 1;

  const historyItem = {
    cycleIndex: newCompletedCount,
    completedAt: nowIso,
    completedBy: completedBy || lead.assignee || 'Sale CRM',
    notes: completionNote || current.notes
  };

  const updatedReminder: PeriodicFollowUpReminder = {
    ...current,
    status: 'active',
    lastFollowedUpAt: nowIso,
    nextFollowUpDate: nextDate,
    updatedAt: nowIso,
    completedCyclesCount: newCompletedCount,
    history: [historyItem, ...(current.history || [])]
  };

  const logText = completionNote
    ? `[Follow-up định kỳ #chu_ky_${current.cycleDays}d] Đã chăm sóc lần ${newCompletedCount}: ${completionNote.trim()}`
    : `[Follow-up định kỳ #chu_ky_${current.cycleDays}d] Đã hoàn thành chăm sóc chu kỳ lần ${newCompletedCount}. Lịch hẹn tiếp theo: ${nextDate.split('-').reverse().join('/')}`;

  const newLog: InteractionLog = {
    id: `log_periodic_${Date.now()}`,
    date: nowIso.replace('T', ' ').slice(0, 16),
    type: 'Ghi chú nội bộ',
    content: logText,
    author: completedBy || lead.assignee || 'Sale CRM'
  };

  const updatedLead: Lead = {
    ...lead,
    periodicFollowUp: updatedReminder,
    updatedAt: nowIso,
    history: [newLog, ...(lead.history || [])]
  };

  // Persist to local storage
  saveStoredPeriodicFollowUp(updatedReminder);

  return {
    updatedLead,
    reminder: updatedReminder,
    newLog
  };
}

/**
 * Action: Pause periodic follow-up
 */
export function pausePeriodicFollowUp(lead: Lead): Lead {
  if (!lead.periodicFollowUp) return lead;
  const updatedReminder: PeriodicFollowUpReminder = {
    ...lead.periodicFollowUp,
    status: 'paused',
    updatedAt: new Date().toISOString()
  };
  saveStoredPeriodicFollowUp(updatedReminder);
  return {
    ...lead,
    periodicFollowUp: updatedReminder
  };
}

/**
 * Action: Resume periodic follow-up
 */
export function resumePeriodicFollowUp(lead: Lead): Lead {
  if (!lead.periodicFollowUp) return lead;
  const now = new Date();
  const currentNext = lead.periodicFollowUp.nextFollowUpDate;
  const daysLeft = getDaysUntilFollowUp(currentNext);
  
  // If next date is already in the past, reset next date from today
  const actualNextDate = daysLeft < 0 ? calculateNextFollowUpDate(now, lead.periodicFollowUp.cycleDays) : currentNext;

  const updatedReminder: PeriodicFollowUpReminder = {
    ...lead.periodicFollowUp,
    status: 'active',
    nextFollowUpDate: actualNextDate,
    updatedAt: now.toISOString()
  };
  saveStoredPeriodicFollowUp(updatedReminder);
  return {
    ...lead,
    periodicFollowUp: updatedReminder
  };
}

/**
 * Action: Cancel/Delete periodic follow-up
 */
export function deletePeriodicFollowUp(lead: Lead): Lead {
  if (lead.periodicFollowUp) {
    deleteStoredPeriodicFollowUp(lead.id);
  }
  const cloned = { ...lead };
  delete cloned.periodicFollowUp;
  return cloned;
}

/**
 * Synthesize a distinct audio chime for periodic reminder
 */
export function playPeriodicFollowUpChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Ascending 3-chord chime: 523Hz (C5) -> 659Hz (E5) -> 784Hz (G5)
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + idx * 0.12;
      const duration = 0.28;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 700);
  } catch {
    // Ignore audio restriction
  }
}

/**
 * Storage helpers
 */
export function getStoredPeriodicFollowUps(): PeriodicFollowUpReminder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERIODIC_FOLLOW_UPS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredPeriodicFollowUp(reminder: PeriodicFollowUpReminder): void {
  try {
    const list = getStoredPeriodicFollowUps().filter((r) => r.leadId !== reminder.leadId);
    list.push(reminder);
    localStorage.setItem(STORAGE_KEY_PERIODIC_FOLLOW_UPS, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export function deleteStoredPeriodicFollowUp(leadId: string): void {
  try {
    const list = getStoredPeriodicFollowUps().filter((r) => r.leadId !== leadId);
    localStorage.setItem(STORAGE_KEY_PERIODIC_FOLLOW_UPS, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Check leads for due periodic follow-ups today
 */
export function getDuePeriodicFollowUps(leads: Lead[]): Array<{ lead: Lead; reminder: PeriodicFollowUpReminder; daysLeft: number }> {
  const result: Array<{ lead: Lead; reminder: PeriodicFollowUpReminder; daysLeft: number }> = [];

  leads.forEach((l) => {
    if (l.periodicFollowUp && l.periodicFollowUp.status === 'active') {
      const days = getDaysUntilFollowUp(l.periodicFollowUp.nextFollowUpDate);
      if (days <= 0) {
        result.push({
          lead: l,
          reminder: l.periodicFollowUp,
          daysLeft: days
        });
      }
    }
  });

  return result;
}
