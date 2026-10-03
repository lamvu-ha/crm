import { Lead, CRMIndicators, SalesMember } from '../types';

export const QUICK_LEAD_STATUSES = ['Đã chốt', 'Đàm phán / Cọc', 'Hẹn xem BĐS', 'Tiềm năng', 'Quan tâm', 'Khách mới', 'Gọi lại sau', 'Không nghe máy', 'Không nhu cầu', 'Khác'];

export function getQuickLeadStatus(lead: Pick<Lead, 'status' | 'callStatus'>): string {
  const status = (lead.status || '').trim();
  if (QUICK_LEAD_STATUSES.includes(status)) return status;
  const aliases: Record<string, string> = {
    'Máy bận': 'Không nghe máy', 'Máy bận / Chưa gọi': 'Không nghe máy',
    'Hẹn gọi lại': 'Gọi lại sau', 'Thuê bao': 'Không nhu cầu',
    'Khách quan tâm cao': 'Quan tâm'
  };
  if (aliases[status]) return aliases[status];
  const call = (lead.callStatus || '').trim();
  return aliases[call] || (QUICK_LEAD_STATUSES.includes(call) ? call : 'Khác');
}
export function calculateCRMIndicators(leads: Lead[]): CRMIndicators {
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'Khách mới').length;
  const inCareLeads = leads.filter(l => l.status === 'Đang chăm sóc').length;
  const potentialLeads = leads.filter(l => l.status === 'Tiềm năng').length;
  const viewingLeads = leads.filter(l => l.status === 'Hẹn xem BĐS').length;
  const negotiatingLeads = leads.filter(l => l.status === 'Đàm phán / Cọc').length;
  const closedLeads = leads.filter(l => l.status === 'Đã chốt').length;
  const lostLeads = leads.filter(l => l.status === 'Không nhu cầu').length;

  const closeRate = totalLeads > 0 
    ? Math.round((closedLeads / totalLeads) * 1000) / 10 
    : 0;

  const statusCounts: Record<string, number> = Object.fromEntries(QUICK_LEAD_STATUSES.map(status => [status, 0]));
  leads.forEach(lead => { statusCounts[getQuickLeadStatus(lead)]++; });
  return {
    totalLeads,
    newLeads,
    potentialLeads,
    closedLeads,
    closeRate,
    inCareLeads,
    viewingLeads,
    negotiatingLeads,
    lostLeads,
    statusCounts
  };
}

export function formatCurrencyVND(millionVnd?: number): string {
  if (!millionVnd) return '0 đ';
  if (millionVnd >= 1000) {
    const ty = millionVnd / 1000;
    return `${ty.toFixed(1).replace('.0', '')} Tỷ`;
  }
  return `${millionVnd.toLocaleString('vi-VN')} Triệu`;
}

export function formatDateVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function getStatusBadgeColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'Không nghe máy':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'Không nhu cầu':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400'
      };
    case 'Quan tâm':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-700',
        border: 'border-teal-200',
        dot: 'bg-teal-500'
      };
    case 'Tiềm năng':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-600'
      };
    case 'Gọi lại sau':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500'
      };
    case 'Máy bận':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500'
      };
    case 'Thuê bao':
      return {
        bg: 'bg-zinc-100',
        text: 'text-zinc-600',
        border: 'border-zinc-300',
        dot: 'bg-zinc-400'
      };
    case 'Gửi thông tin':
      return {
        bg: 'bg-violet-50',
        text: 'text-violet-700',
        border: 'border-violet-200',
        dot: 'bg-violet-500'
      };
    case 'Nhầm số':
      return {
        bg: 'bg-stone-100',
        text: 'text-stone-600',
        border: 'border-stone-300',
        dot: 'bg-stone-400'
      };
    case 'Khác':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400'
      };
    case 'Khách mới':
      return {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500'
      };
    case 'Đang chăm sóc':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500'
      };
    case 'Hẹn xem BĐS':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-600'
      };
    case 'Đàm phán / Cọc':
      return {
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        border: 'border-orange-200',
        dot: 'bg-orange-500'
      };
    case 'Đã chốt':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-600'
      };
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400'
      };
  }
}

export interface AssigneeRoleInfo {
  role: 'tpkd' | 'sale' | 'admin' | 'unassigned';
  isTpkd: boolean;
  isNvkd: boolean;
  isAdmin: boolean;
  isCurrentUser: boolean;
  displayName: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconType: 'tpkd' | 'nvkd' | 'admin' | 'unassigned';
}

export function getAssigneeRoleInfo(
  assigneeName: string,
  salesMembers?: SalesMember[],
  currentUserName?: string
): AssigneeRoleInfo {
  if (!assigneeName || assigneeName === 'Chưa phân công' || assigneeName === 'Chưa gán') {
    return {
      role: 'unassigned',
      isTpkd: false,
      isNvkd: false,
      isAdmin: false,
      isCurrentUser: false,
      displayName: 'Chưa phân công',
      badgeLabel: 'Chưa phân bổ',
      badgeBg: 'bg-slate-100',
      badgeText: 'text-slate-600',
      badgeBorder: 'border-slate-200',
      iconType: 'unassigned'
    };
  }

  const cleanAssignee = assigneeName.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  const cleanCurrent = (currentUserName || '').replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  const isCurr = !!cleanCurrent && (cleanAssignee === cleanCurrent || assigneeName.toLowerCase() === currentUserName?.toLowerCase());

  let memberRole: 'admin' | 'tpkd' | 'sale' | undefined = undefined;

  if (salesMembers && salesMembers.length > 0) {
    const matched = salesMembers.find((m) => {
      const cleanM = m.name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      return cleanM === cleanAssignee || m.name.toLowerCase() === assigneeName.toLowerCase();
    });
    if (matched) {
      memberRole = matched.role;
    }
  }

  if (!memberRole) {
    if (/giám\s*đốc|admin|quản\s*trị/i.test(assigneeName)) {
      memberRole = 'admin';
    } else if (/trưởng\s*phòng|tpkd|bích chi|đình quang|thành tâm|quang vinh/i.test(assigneeName)) {
      memberRole = 'tpkd';
    } else {
      memberRole = 'sale';
    }
  }

  if (memberRole === 'admin') {
    return {
      role: 'admin',
      isTpkd: false,
      isNvkd: false,
      isAdmin: true,
      isCurrentUser: isCurr,
      displayName: assigneeName,
      badgeLabel: isCurr ? '👑 Admin (Bạn)' : '👑 Admin',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-900',
      badgeBorder: 'border-amber-300',
      iconType: 'admin'
    };
  }

  if (memberRole === 'tpkd') {
    return {
      role: 'tpkd',
      isTpkd: true,
      isNvkd: false,
      isAdmin: false,
      isCurrentUser: isCurr,
      displayName: assigneeName,
      badgeLabel: isCurr ? '👑 Khách TPKD (Bạn)' : '👑 Khách TPKD',
      badgeBg: 'bg-purple-100',
      badgeText: 'text-purple-800',
      badgeBorder: 'border-purple-300',
      iconType: 'tpkd'
    };
  }

  // NVKD (role === 'sale')
  return {
    role: 'sale',
    isTpkd: false,
    isNvkd: true,
    isAdmin: false,
    isCurrentUser: isCurr,
    displayName: assigneeName,
    badgeLabel: isCurr ? '💼 Khách NVKD (Bạn)' : '💼 Khách NVKD',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    iconType: 'nvkd'
  };
}

/**
 * Checks if a lead matches a selected source filter.
 * Supports both origin categories (Facebook, Referral, Website, Google, Zalo)
 * and specific campaign/data source strings.
 */
export function isLeadMatchingSource(lead: Lead, filterSource: string): boolean {
  if (!filterSource) return true;
  const raw = (lead.dataSource || '').trim();
  const rawLower = raw.toLowerCase();
  const filterLower = filterSource.trim().toLowerCase();

  // Exact match
  if (raw === filterSource || rawLower === filterLower) return true;

  // Origin segmentation presets
  if (filterLower === 'facebook' || filterLower === 'fb') {
    return (
      rawLower.includes('facebook') ||
      rawLower.includes('fb') ||
      rawLower.includes('fanpage')
    );
  }
  if (filterLower === 'referral' || filterLower === 'gioi_thieu') {
    return (
      rawLower.includes('referral') ||
      rawLower.includes('giới thiệu') ||
      rawLower.includes('khách cũ') ||
      rawLower.includes('người quen') ||
      rawLower.includes('đối tác')
    );
  }
  if (filterLower === 'website' || filterLower === 'hotline') {
    return (
      rawLower.includes('website') ||
      rawLower.includes('web') ||
      rawLower.includes('hotline') ||
      rawLower.includes('landing') ||
      rawLower.includes('nhaphotrungtam')
    );
  }
  if (filterLower === 'google') {
    return rawLower.includes('google') || rawLower.includes('search') || rawLower.includes('adwords');
  }
  if (filterLower === 'zalo') {
    return rawLower.includes('zalo');
  }
  if (filterLower === 'vip_bank') {
    return rawLower.includes('ngân hàng') || rawLower.includes('bank') || rawLower.includes('vip');
  }

  // Fallback substring matching
  return rawLower.includes(filterLower);
}

/**
 * Returns a friendly display label for a source filter key
 */
export function getSourceDisplayLabel(sourceKey: string): string {
  if (!sourceKey) return 'Tất cả nguồn';
  const lower = sourceKey.toLowerCase();
  if (lower === 'facebook') return '🌐 Facebook';
  if (lower === 'referral') return '🤝 Giới thiệu / Referral';
  if (lower === 'website') return '💻 Website / Hotline';
  if (lower === 'google') return '🔍 Google';
  if (lower === 'zalo') return '💬 Zalo';
  if (lower === 'vip_bank') return '🏦 Data VIP Ngân Hàng';
  return sourceKey;
}
