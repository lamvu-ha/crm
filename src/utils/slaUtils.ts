import { Lead, AutoDistributionPolicy } from '../types';
import { DEFAULT_DISTRIBUTION_POLICY } from '../services/leadDistributionService';

export type SlaStatusType = 
  | 'unassigned'         // Chưa phân công sale
  | 'completed'          // Đã hoàn thành (đã tương tác, đổi trạng thái hoặc chốt/hủy)
  | 'needs_accept'       // Đang đếm ngược chờ tiếp nhận (chưa quá hạn)
  | 'needs_interaction'  // Đã tiếp nhận, đang đếm ngược chờ gọi/tương tác lần đầu
  | 'critical'           // Sắp hết hạn (< 25% thời gian còn lại hoặc < 15 phút)
  | 'breached';          // Đã quá hạn SLA, chờ hệ thống tự động thu hồi

export interface LeadSlaInfo {
  status: SlaStatusType;
  assignedTime: number | null;
  deadlineTime: number | null;
  remainingMs: number;
  remainingMinutes: number;
  progressPercent: number; // 0 to 100% time elapsed
  countdownText: string;   // e.g. "Còn 24:15", "Còn 1h 45p", "Quá hạn 18p"
  subText: string;         // e.g. "Hạn tiếp nhận", "Hạn gọi đầu", "Thu hồi tự động"
  stageLabel: string;      // e.g. "Chờ tiếp nhận", "Chờ tương tác", "Đã xử lý"
  isBreached: boolean;
  isUrgent: boolean;       // < 15 mins or critical
  badgeClasses: {
    bg: string;
    text: string;
    border: string;
    indicator: string;
    pulse: boolean;
  };
  tooltip: string;
}

/**
 * Format milliseconds into a human-readable countdown string (e.g. 15:30 or 2h 10p)
 */
export function formatSlaCountdown(ms: number): string {
  const isNegative = ms < 0;
  const absMs = Math.abs(ms);
  const totalSeconds = Math.floor(absMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (isNegative) {
    if (hours > 0) {
      return `Trễ ${hours}h ${minutes}p`;
    }
    return `Trễ ${minutes}p ${seconds < 10 ? '0' : ''}${seconds}s`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}p`;
  }

  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/**
 * Compute SLA status, deadline, and countdown for a lead based on assignedAt and policy
 */
export function getLeadSlaInfo(
  lead: Lead,
  policy: AutoDistributionPolicy = DEFAULT_DISTRIBUTION_POLICY,
  now: number = Date.now()
): LeadSlaInfo {
  // 1. Kiểm tra nếu lead chưa gán sale
  const isUnassigned = 
    !lead.assignee || 
    lead.assignee === 'Chưa phân công' || 
    lead.assignee === 'Chưa gán' ||
    lead.assignee.trim() === '';

  if (isUnassigned) {
    return {
      status: 'unassigned',
      assignedTime: null,
      deadlineTime: null,
      remainingMs: 0,
      remainingMinutes: 0,
      progressPercent: 0,
      countdownText: 'Chưa phân công',
      subText: 'Chưa kích hoạt SLA',
      stageLabel: 'Chưa giao',
      isBreached: false,
      isUrgent: false,
      badgeClasses: {
        bg: 'bg-slate-50',
        text: 'text-slate-500',
        border: 'border-slate-200',
        indicator: 'bg-slate-400',
        pulse: false
      },
      tooltip: 'Khách hàng chưa được giao cho chuyên viên kinh doanh. SLA sẽ tính khi được chia.'
    };
  }

  // 2. Kiểm tra nếu lead đã hoàn thành (Chốt, Hủy, Không nhu cầu)
  const isClosedOrIrrelevant = 
    lead.status === 'Đã chốt' || 
    lead.status === 'Không nhu cầu';

  if (isClosedOrIrrelevant) {
    return {
      status: 'completed',
      assignedTime: lead.assignedAt ? new Date(lead.assignedAt).getTime() : null,
      deadlineTime: null,
      remainingMs: 0,
      remainingMinutes: 0,
      progressPercent: 100,
      countdownText: lead.status === 'Đã chốt' ? '🎉 Đã chốt deal' : 'Đã đóng hồ sơ',
      subText: 'SLA hoàn tất',
      stageLabel: 'Hoàn thành',
      isBreached: false,
      isUrgent: false,
      badgeClasses: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        indicator: 'bg-emerald-500',
        pulse: false
      },
      tooltip: 'Khách hàng đã kết thúc chu kỳ chăm sóc ban đầu.'
    };
  }

  // 3. Xác định thời điểm bắt đầu chia lead
  let assignedTime: number | null = null;
  if (lead.assignedAt) {
    const t = new Date(lead.assignedAt).getTime();
    if (!isNaN(t)) assignedTime = t;
  }
  if (!assignedTime) {
    const info = getLeadSlaInfo({ ...lead, assignee: '' }, policy, now);
    return { ...info, countdownText: 'Chưa có ngày giao', stageLabel: 'Chưa tính SLA', tooltip: 'Cần xác định ngày giao khách trước khi tính SLA.' };
  }

  // Kiểm tra xem Sale đã bấm tiếp nhận chưa
  const hasAccepted = Boolean(lead.acceptedAt);

  // Kiểm tra xem Sale đã tương tác / báo cáo lần đầu chưa
  const hasReported = Boolean(lead.firstReportedAt && new Date(lead.firstReportedAt).getTime() >= assignedTime);

  // 4. Nếu đã cả tiếp nhận VÀ đã tương tác/cập nhật qua trạng thái khác (an toàn)
  if (hasAccepted && hasReported) {
    return {
      status: 'completed',
      assignedTime,
      deadlineTime: null,
      remainingMs: 0,
      remainingMinutes: 0,
      progressPercent: 100,
      countdownText: '✓ Đã chăm sóc',
      subText: 'Đúng hạn SLA',
      stageLabel: 'Đã hoàn thành SLA',
      isBreached: false,
      isUrgent: false,
      badgeClasses: {
        bg: 'bg-emerald-50/80',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        indicator: 'bg-emerald-500',
        pulse: false
      },
      tooltip: `Đã tiếp nhận và tương tác thành công. Sale phụ trách: ${lead.assignee}.`
    };
  }

  // 5. GIAI ĐOẠN 1: Chờ tiếp nhận (Sale chưa bấm nút "Tiếp nhận")
  if (!hasAccepted) {
    const acceptTimeoutMinutes = policy.acceptTimeoutMinutes || 60;
    const totalDurationMs = acceptTimeoutMinutes * 60 * 1000;
    const deadlineTime = assignedTime + totalDurationMs;
    const remainingMs = deadlineTime - now;
    const remainingMinutes = Math.round(remainingMs / (1000 * 60));
    const elapsedMs = now - assignedTime;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));

    const isBreached = remainingMs <= 0 || lead.slaBreached;

    if (isBreached) {
      return {
        status: 'breached',
        assignedTime,
        deadlineTime,
        remainingMs,
        remainingMinutes,
        progressPercent: 100,
        countdownText: formatSlaCountdown(remainingMs),
        subText: '⚠️ Quá hạn tiếp nhận - Chờ thu hồi!',
        stageLabel: 'Quá hạn tiếp nhận',
        isBreached: true,
        isUrgent: true,
        badgeClasses: {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-300',
          indicator: 'bg-rose-600',
          pulse: true
        },
        tooltip: `Quá hạn tiếp nhận quy định (${acceptTimeoutMinutes} phút)! Hệ thống sẽ tự động thu hồi và điều phối cho Sale khác.`
      };
    }

    // Kiểm tra mức độ khẩn cấp (< 15 phút hoặc < 25% thời gian)
    const isCritical = remainingMinutes <= 15 || remainingMs / totalDurationMs <= 0.25;

    if (isCritical) {
      return {
        status: 'critical',
        assignedTime,
        deadlineTime,
        remainingMs,
        remainingMinutes,
        progressPercent,
        countdownText: `Còn ${formatSlaCountdown(remainingMs)}`,
        subText: '⚡ Cần tiếp nhận gấp!',
        stageLabel: 'Chờ tiếp nhận',
        isBreached: false,
        isUrgent: true,
        badgeClasses: {
          bg: 'bg-amber-50',
          text: 'text-amber-900',
          border: 'border-amber-300',
          indicator: 'bg-amber-500',
          pulse: true
        },
        tooltip: `Sắp hết hạn tiếp nhận! Còn ${remainingMinutes} phút trước khi hệ thống thu hồi tự động.`
      };
    }

    return {
      status: 'needs_accept',
      assignedTime,
      deadlineTime,
      remainingMs,
      remainingMinutes,
      progressPercent,
      countdownText: `Còn ${formatSlaCountdown(remainingMs)}`,
      subText: 'Hạn tiếp nhận',
      stageLabel: 'Chờ tiếp nhận',
      isBreached: false,
      isUrgent: false,
      badgeClasses: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        indicator: 'bg-blue-500',
        pulse: false
      },
      tooltip: `Thời hạn tiếp nhận: ${acceptTimeoutMinutes} phút từ khi giao. Vui lòng bấm tiếp nhận để bắt đầu chăm sóc.`
    };
  }

  // 6. GIAI ĐOẠN 2: Đã tiếp nhận nhưng CHƯA tương tác / báo cáo (Lead vẫn ở 'Khách mới' và chưa có ghi chú tương tác)
  const reportTimeoutHours = policy.reportTimeoutHours || 4;
  const totalReportDurationMs = reportTimeoutHours * 60 * 60 * 1000;
  const deadlineTime = new Date(lead.acceptedAt!).getTime() + totalReportDurationMs;
  const remainingMs = deadlineTime - now;
  const remainingMinutes = Math.round(remainingMs / (1000 * 60));
  const elapsedMs = now - new Date(lead.acceptedAt!).getTime();
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalReportDurationMs) * 100)));

  const isBreached = remainingMs <= 0 || lead.slaBreached;

  if (isBreached) {
    return {
      status: 'breached',
      assignedTime,
      deadlineTime,
      remainingMs,
      remainingMinutes,
      progressPercent: 100,
      countdownText: formatSlaCountdown(remainingMs),
      subText: '⚠️ Quá hạn gọi đầu - Nguy cơ thu hồi!',
      stageLabel: 'Quá hạn báo cáo',
      isBreached: true,
      isUrgent: true,
      badgeClasses: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-300',
        indicator: 'bg-rose-600',
        pulse: true
      },
      tooltip: `Quá hạn gọi điện và cập nhật báo cáo tương tác đầu tiên (${reportTimeoutHours} giờ)! Hệ thống sẽ thu hồi nếu không cập nhật.`
    };
  }

  // Sắp hết hạn gọi đầu (< 45 phút)
  const isCritical = remainingMinutes <= 45;

  if (isCritical) {
    return {
      status: 'critical',
      assignedTime,
      deadlineTime,
      remainingMs,
      remainingMinutes,
      progressPercent,
      countdownText: `Còn ${formatSlaCountdown(remainingMs)}`,
      subText: '⚡ Hạn gọi điện đầu',
      stageLabel: 'Chờ tương tác',
      isBreached: false,
      isUrgent: true,
      badgeClasses: {
        bg: 'bg-orange-50',
        text: 'text-orange-900',
        border: 'border-orange-300',
        indicator: 'bg-orange-500',
        pulse: true
      },
      tooltip: `Đã nhận khách. Vui lòng gọi điện hoặc gửi tin nhắn cho khách trước khi hết hạn (${remainingMinutes} phút còn lại).`
    };
  }

  return {
    status: 'needs_interaction',
    assignedTime,
    deadlineTime,
    remainingMs,
    remainingMinutes,
    progressPercent,
    countdownText: `Còn ${formatSlaCountdown(remainingMs)}`,
    subText: 'Hạn gọi đầu',
    stageLabel: 'Chờ tương tác',
    isBreached: false,
    isUrgent: false,
    badgeClasses: {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      indicator: 'bg-indigo-500',
      pulse: false
    },
    tooltip: `Đã tiếp nhận khách. Cần gọi điện hoặc cập nhật tình trạng trước ${new Date(deadlineTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
  };
}

/**
 * Standard SLA contact window in hours (default: 2 hours).
 * Sale must contact or update the lead within this timeframe from assignment.
 */
export const DEFAULT_SLA_CONTACT_WINDOW_HOURS = 2;

export interface LeadSlaContactWarning {
  /** True if lead hasn't been contacted within SLA window (e.g. 2 hours) */
  isOverdue: boolean;
  /** True if lead is in warning zone (< 30 minutes remaining before breaching SLA) */
  isUrgentWarning: boolean;
  /** SLA window in milliseconds (default: 2 hours = 7,200,000 ms) */
  slaWindowMs: number;
  /** SLA window in hours */
  slaWindowHours: number;
  /** Milliseconds elapsed since assignment / creation */
  elapsedMs: number;
  /** Milliseconds remaining before breaching SLA (negative if overdue) */
  remainingMs: number;
  /** Human readable overdue or remaining text (e.g. "Quá hạn 1h 45p", "Còn 25p") */
  timeText: string;
  /** Whether the lead has been contacted / interacted with */
  hasBeenContacted: boolean;
  /** Contact status description */
  contactStatusDesc: string;
  /** Detailed reason / alert message */
  message: string;
}

/**
 * Checks whether a lead has been contacted within the required SLA window (default: 2 hours).
 * Flags leads in the UI with a red border if they haven't been contacted within this window.
 */
export function checkLeadSlaContactWarning(
  lead: Lead,
  slaWindowHours: number = DEFAULT_SLA_CONTACT_WINDOW_HOURS,
  nowMs: number = Date.now()
): LeadSlaContactWarning {
  // If lead is closed or irrelevant, SLA contact is no longer pending
  if (lead.status === 'Đã chốt' || lead.status === 'Không nhu cầu') {
    return {
      isOverdue: false,
      isUrgentWarning: false,
      slaWindowMs: slaWindowHours * 3600 * 1000,
      slaWindowHours,
      elapsedMs: 0,
      remainingMs: 0,
      timeText: 'Đã đóng hồ sơ',
      hasBeenContacted: true,
      contactStatusDesc: 'Hồ sơ đã hoàn tất',
      message: ''
    };
  }

  // 1. Status has progressed beyond 'Khách mới'
  const isStatusAdvanced = Boolean(
    lead.status && 
    lead.status !== 'Khách mới' && 
    lead.status.trim() !== ''
  );

  // 2. Call status is recorded
  const hasCallStatus = Boolean(lead.callStatus && lead.callStatus.trim() !== '');

  // 3. First reported timestamp is recorded
  const hasFirstReport = Boolean(lead.firstReportedAt);

  // 4. History contains calls, notes, or messages from sales
  const hasContactHistory = Boolean(
    Array.isArray(lead.history) &&
    lead.history.some((h) => 
      h.type === 'Cuộc gọi' || 
      h.type === 'Zalo' || 
      h.type === 'Gặp mặt / Xem nhà' ||
      h.type === 'Gửi báo giá' ||
      (h.type === 'Ghi chú nội bộ' && !h.author?.includes('Hệ thống') && !h.author?.includes('Sync') && !h.author?.includes('Google Sheet')) ||
      (h.content && (h.content.toLowerCase().includes('gọi') || h.content.toLowerCase().includes('liên hệ') || h.content.toLowerCase().includes('tiếp cận') || h.content.toLowerCase().includes('chăm sóc')))
    )
  );

  const hasBeenContacted = isStatusAdvanced || hasCallStatus || hasFirstReport || hasContactHistory;

  if (hasBeenContacted) {
    return {
      isOverdue: false,
      isUrgentWarning: false,
      slaWindowMs: slaWindowHours * 3600 * 1000,
      slaWindowHours,
      elapsedMs: 0,
      remainingMs: 0,
      timeText: 'Đã liên hệ',
      hasBeenContacted: true,
      contactStatusDesc: 'Đã liên hệ chăm sóc',
      message: ''
    };
  }

  // Determine starting timestamp (assignedAt -> createdAt -> date)
  let startTime = 0;
  if (lead.assignedAt) {
    const t = new Date(lead.assignedAt).getTime();
    if (!isNaN(t)) startTime = t;
  }
  if (!startTime && lead.createdAt) {
    const t = new Date(lead.createdAt).getTime();
    if (!isNaN(t)) startTime = t;
  }
  if (!startTime && lead.date) {
    const t = new Date(lead.date).getTime();
    if (!isNaN(t)) startTime = t;
  }
  if (!startTime) {
    startTime = nowMs - 60 * 60 * 1000;
  }

  const slaWindowMs = slaWindowHours * 3600 * 1000;
  const elapsedMs = Math.max(0, nowMs - startTime);
  const remainingMs = slaWindowMs - elapsedMs;
  const isOverdue = remainingMs <= 0 || Boolean(lead.slaBreached);
  const isUrgentWarning = !isOverdue && remainingMs <= 30 * 60 * 1000; // Under 30 mins remaining

  let timeText = '';
  let message = '';

  if (isOverdue) {
    const overdueMs = Math.abs(remainingMs);
    const overdueHours = Math.floor(overdueMs / (3600 * 1000));
    const overdueMins = Math.floor((overdueMs % (3600 * 1000)) / (60 * 1000));

    if (overdueHours > 0) {
      timeText = `Quá hạn ${overdueHours}h ${overdueMins}p`;
    } else {
      timeText = `Quá hạn ${overdueMins}p`;
    }
    const totalElapsedHours = Math.round(elapsedMs / (3600 * 1000));
    message = `Chưa liên hệ sau ${totalElapsedHours > 0 ? `${totalElapsedHours}h` : `${Math.round(elapsedMs / 60000)}p`} (Hạn SLA: ${slaWindowHours}h)`;
  } else {
    const remHours = Math.floor(remainingMs / (3600 * 1000));
    const remMins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
    timeText = remHours > 0 ? `Còn ${remHours}h ${remMins}p` : `Còn ${remMins}p`;
    message = `Cần liên hệ trong vòng ${timeText}`;
  }

  return {
    isOverdue,
    isUrgentWarning,
    slaWindowMs,
    slaWindowHours,
    elapsedMs,
    remainingMs,
    timeText,
    hasBeenContacted: false,
    contactStatusDesc: isOverdue ? 'Chưa liên hệ (Quá hạn SLA 2h)' : 'Chưa liên hệ (Trong hạn)',
    message
  };
}
