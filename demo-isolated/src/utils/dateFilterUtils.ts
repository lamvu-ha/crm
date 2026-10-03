import { Lead } from '../types';

export type DateFilterRange = 
  | 'all' 
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'custom';

export type DateFilterField = 'createdAt' | 'updatedAt' | 'any';

export interface DateRangeOption {
  key: DateFilterRange;
  label: string;
  shortLabel: string;
  icon?: string;
}

export interface DateFieldOption {
  key: DateFilterField;
  label: string;
  shortLabel: string;
  desc: string;
}

export const DATE_FILTER_OPTIONS: DateRangeOption[] = [
  { key: 'all', label: 'Tất cả thời gian', shortLabel: 'Tất cả' },
  { key: 'today', label: 'Hôm nay', shortLabel: 'Hôm nay' },
  { key: 'yesterday', label: 'Hôm qua', shortLabel: 'Hôm qua' },
  { key: 'this_week', label: 'Tuần này', shortLabel: 'Tuần này' },
  { key: 'last_week', label: 'Tuần trước', shortLabel: 'Tuần trước' },
  { key: 'this_month', label: 'Tháng này', shortLabel: 'Tháng này' },
  { key: 'last_month', label: 'Tháng trước', shortLabel: 'Tháng trước' },
  { key: 'custom', label: 'Tùy chọn khoảng ngày...', shortLabel: 'Tùy chọn' },
];

export const DATE_FIELD_OPTIONS: DateFieldOption[] = [
  {
    key: 'createdAt',
    label: 'Ngày tạo / Đẩy về',
    shortLabel: 'Ngày tạo',
    desc: 'Lọc theo thời điểm khách vừa được đẩy vào hệ thống CRM'
  },
  {
    key: 'updatedAt',
    label: 'Ngày cập nhật gần nhất',
    shortLabel: 'Cập nhật',
    desc: 'Lọc theo thời điểm có tương tác, đổi trạng thái hoặc chỉnh sửa gần nhất'
  },
  {
    key: 'any',
    label: 'Tạo hoặc Cập nhật',
    shortLabel: 'Tạo/Cập nhật',
    desc: 'Lọc khách thỏa mãn hoặc vừa được tạo hoặc vừa được cập nhật trong kỳ'
  }
];

/**
 * Parses a lead date string into a Date object.
 * Uses 12:00 PM for day-only formats to avoid UTC timezone offsets shifting the date.
 */
export function parseLeadDate(dateStr?: string | Date | null): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  if (typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Handle ISO format like 2026-09-22 or 2026-09-22T...
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    // If it has time component T or space, try standard parse first
    if (trimmed.includes('T') || trimmed.includes(' ')) {
      const p = new Date(trimmed);
      if (!isNaN(p.getTime())) return p;
    }
    const parts = trimmed.substring(0, 10).split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(trimmed)) {
    const parts = trimmed.split(/[/-]/);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }

  // Try standard parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Extracts creation date of a lead (fallback order: createdAt -> assignedAt -> date)
 */
export function getLeadCreationDate(lead: Lead): Date | null {
  return (
    parseLeadDate(lead.createdAt) ||
    parseLeadDate(lead.assignedAt) ||
    parseLeadDate(lead.date)
  );
}

/**
 * Extracts latest update date of a lead
 * (fallback order: updatedAt -> firstReportedAt -> acceptedAt -> assignedAt -> date)
 */
export function getLeadUpdateDate(lead: Lead): Date | null {
  return (
    parseLeadDate(lead.updatedAt) ||
    parseLeadDate(lead.firstReportedAt) ||
    parseLeadDate(lead.acceptedAt) ||
    parseLeadDate(lead.assignedAt) ||
    parseLeadDate(lead.date)
  );
}

/**
 * Format a Date to YYYY-MM-DD for date inputs
 */
export function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date to DD/MM/YYYY for Vietnamese display
 */
export function formatDateToDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Friendly relative time in Vietnamese
 * Examples: "Vừa xong", "5 phút trước", "Hôm nay 14:20", "Hôm qua 09:15", "22/09/2026"
 */
export function formatRelativeTimeVN(dateInput?: string | Date | null): string {
  const d = parseLeadDate(dateInput);
  if (!d) return 'Chưa cập nhật';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // If timestamp is slightly in the future (due to clock drift)
  if (diffMs < 0 && diffMs > -60000) {
    return 'Vừa xong';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'Vừa xong';
  }
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (isToday) {
    return `Hôm nay ${timeStr}`;
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Hôm qua ${timeStr}`;
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} lúc ${timeStr}`;
  }

  return `${formatDateToDMY(d)}`;
}

/**
 * Format date and time for tooltips (e.g. "14:35 22/09/2026")
 */
export function formatFullDateTimeVN(dateInput?: string | Date | null): string {
  const d = parseLeadDate(dateInput);
  if (!d) return 'Chưa có dữ liệu';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ngày ${formatDateToDMY(d)}`;
}

export interface DateBoundsInfo {
  start?: Date;
  end?: Date;
  label: string;
  rangeText: string;
}

/**
 * Computes exact start and end bounds for any selected DateFilterRange
 */
export function getDateRangeBounds(
  range: DateFilterRange,
  customStart?: string,
  customEnd?: string
): DateBoundsInfo {
  const now = new Date();

  switch (range) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Hôm nay',
        rangeText: formatDateToDMY(now)
      };
    }

    case 'yesterday': {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Hôm qua',
        rangeText: formatDateToDMY(y)
      };
    }

    case 'this_week': {
      // Monday to Sunday of current week
      const day = now.getDay(); // 0 is Sunday, 1 is Monday...
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      return {
        start: monday,
        end: sunday,
        label: 'Tuần này',
        rangeText: `${formatDateToDMY(monday)} - ${formatDateToDMY(sunday)}`
      };
    }

    case 'last_week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday - 7, 0, 0, 0, 0);
      const lastSunday = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + 6, 23, 59, 59, 999);
      return {
        start: lastMonday,
        end: lastSunday,
        label: 'Tuần trước',
        rangeText: `${formatDateToDMY(lastMonday)} - ${formatDateToDMY(lastSunday)}`
      };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Tháng này',
        rangeText: `Tháng ${now.getMonth() + 1}/${now.getFullYear()} (${formatDateToDMY(start)} - ${formatDateToDMY(end)})`
      };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: 'Tháng trước',
        rangeText: `Tháng ${start.getMonth() + 1}/${start.getFullYear()} (${formatDateToDMY(start)} - ${formatDateToDMY(end)})`
      };
    }

    case 'custom': {
      let start: Date | undefined;
      let end: Date | undefined;

      if (customStart) {
        const p = parseLeadDate(customStart);
        if (p) {
          start = new Date(p.getFullYear(), p.getMonth(), p.getDate(), 0, 0, 0, 0);
        }
      }

      if (customEnd) {
        const p = parseLeadDate(customEnd);
        if (p) {
          end = new Date(p.getFullYear(), p.getMonth(), p.getDate(), 23, 59, 59, 999);
        }
      }

      let text = 'Tùy chỉnh khoảng ngày';
      if (start && end) {
        text = `${formatDateToDMY(start)} - ${formatDateToDMY(end)}`;
      } else if (start) {
        text = `Từ ${formatDateToDMY(start)}`;
      } else if (end) {
        text = `Đến ${formatDateToDMY(end)}`;
      }

      return {
        start,
        end,
        label: 'Tùy chọn',
        rangeText: text
      };
    }

    case 'all':
    default:
      return {
        label: 'Tất cả thời gian',
        rangeText: 'Toàn bộ danh sách'
      };
  }
}

/**
 * Checks if a specific date timestamp falls within bounds
 */
function isDateWithinBounds(d: Date | null, bounds: DateBoundsInfo): boolean {
  if (!d) return false;
  const time = d.getTime();
  if (bounds.start && time < bounds.start.getTime()) {
    return false;
  }
  if (bounds.end && time > bounds.end.getTime()) {
    return false;
  }
  return true;
}

/**
 * Checks whether a given lead belongs to the specified date filter range and date field criteria
 */
export function isLeadInDateRange(
  lead: Lead,
  range: DateFilterRange,
  customStart?: string,
  customEnd?: string,
  field: DateFilterField = 'createdAt'
): boolean {
  if (range === 'all') return true;

  const bounds = getDateRangeBounds(range, customStart, customEnd);

  if (field === 'createdAt') {
    const creationDate = getLeadCreationDate(lead);
    return isDateWithinBounds(creationDate, bounds);
  }

  if (field === 'updatedAt') {
    const updateDate = getLeadUpdateDate(lead);
    return isDateWithinBounds(updateDate, bounds);
  }

  // 'any': matches if created OR updated within bounds
  const cDate = getLeadCreationDate(lead);
  const uDate = getLeadUpdateDate(lead);
  return isDateWithinBounds(cDate, bounds) || isDateWithinBounds(uDate, bounds);
}

/**
 * Checks if lead was created/pushed today
 */
export function isLeadCreatedToday(lead: Lead): boolean {
  const c = getLeadCreationDate(lead);
  if (!c) return false;
  const now = new Date();
  return (
    c.getDate() === now.getDate() &&
    c.getMonth() === now.getMonth() &&
    c.getFullYear() === now.getFullYear()
  );
}

/**
 * Checks if lead was updated today
 */
export function isLeadUpdatedToday(lead: Lead): boolean {
  const u = getLeadUpdateDate(lead);
  if (!u) return false;
  const now = new Date();
  return (
    u.getDate() === now.getDate() &&
    u.getMonth() === now.getMonth() &&
    u.getFullYear() === now.getFullYear()
  );
}

/**
 * Counts leads for presets and quick buttons
 */
export function countLeadsByDatePresets(
  leads: Lead[],
  field: DateFilterField = 'createdAt'
): {
  all: number;
  today: number;
  yesterday: number;
  this_week: number;
  this_month: number;
  createdToday: number;
  updatedToday: number;
} {
  let todayCount = 0;
  let yesterdayCount = 0;
  let weekCount = 0;
  let monthCount = 0;
  let createdTodayCount = 0;
  let updatedTodayCount = 0;

  const todayBounds = getDateRangeBounds('today');
  const yesterdayBounds = getDateRangeBounds('yesterday');
  const weekBounds = getDateRangeBounds('this_week');
  const monthBounds = getDateRangeBounds('this_month');

  leads.forEach((l) => {
    // Check specific counts for created & updated today
    if (isLeadCreatedToday(l)) {
      createdTodayCount++;
    }
    if (isLeadUpdatedToday(l)) {
      updatedTodayCount++;
    }

    const checkDate =
      field === 'createdAt'
        ? getLeadCreationDate(l)
        : field === 'updatedAt'
        ? getLeadUpdateDate(l)
        : null;

    if (field === 'any') {
      const c = getLeadCreationDate(l);
      const u = getLeadUpdateDate(l);
      if (isDateWithinBounds(c, todayBounds) || isDateWithinBounds(u, todayBounds)) todayCount++;
      if (isDateWithinBounds(c, yesterdayBounds) || isDateWithinBounds(u, yesterdayBounds)) yesterdayCount++;
      if (isDateWithinBounds(c, weekBounds) || isDateWithinBounds(u, weekBounds)) weekCount++;
      if (isDateWithinBounds(c, monthBounds) || isDateWithinBounds(u, monthBounds)) monthCount++;
    } else if (checkDate) {
      if (isDateWithinBounds(checkDate, todayBounds)) todayCount++;
      if (isDateWithinBounds(checkDate, yesterdayBounds)) yesterdayCount++;
      if (isDateWithinBounds(checkDate, weekBounds)) weekCount++;
      if (isDateWithinBounds(checkDate, monthBounds)) monthCount++;
    }
  });

  return {
    all: leads.length,
    today: todayCount,
    yesterday: yesterdayCount,
    this_week: weekCount,
    this_month: monthCount,
    createdToday: createdTodayCount,
    updatedToday: updatedTodayCount
  };
}
