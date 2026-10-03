import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  Calendar,
  Filter,
  UserCheck,
  Users,
  Crown,
  Briefcase,
  LayoutGrid,
  List,
  Building,
  DollarSign,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Sparkles,
  RefreshCw,
  Zap,
  ArrowDownUp,
  Tag,
  X,
  Bell,
  PhoneCall,
  AlertCircle,
  Share2,
  MessageSquareText,
  Flame
} from 'lucide-react';
import { Lead, LeadStatus, SalesMember, AutoDistributionPolicy, PriorityLevel } from '../types';
import { SmartLabelBadge } from './SmartLabelBadge';
import { SmartLabelingModal } from './SmartLabelingModal';
import { runSmartLabeling } from '../services/smartLabelingService';
import { 
  formatDateVN, 
  getStatusBadgeColor, 
  getAssigneeRoleInfo,
  isLeadMatchingSource,
  getSourceDisplayLabel
} from '../utils/crmCalculations';
import { 
  LEAD_STATUSES, 
  PROJECTS, 
  PRODUCT_TYPES, 
  ASSIGNEES, 
  getAllProductTypes, 
  getAllProjects,
  getAllDataSources,
  isProductTypeMatch
} from '../data/initialData';
import { ProjectMultiSelectFilter, ProjectFilterChips } from './ProjectMultiSelectFilter';
import { getTpkdForMember } from '../data/salesTeamData';
import { openGooglePhoneSearch } from '../services/notificationService';
import { DEFAULT_DISTRIBUTION_POLICY } from '../services/leadDistributionService';
import { 
  getLeadSlaInfo, 
  LeadSlaInfo, 
  checkLeadSlaContactWarning, 
  LeadSlaContactWarning, 
  DEFAULT_SLA_CONTACT_WINDOW_HOURS 
} from '../utils/slaUtils';
import { LeadTagBadge, LeadTagPicker } from './LeadTagBadge';
import { getAllAvailableTags, getTagMeta, removeTagFromLead } from '../utils/tagUtils';
import { formatZaloReminderBadge } from '../services/zaloReminderService';
import { formatCallbackReminderBadge } from '../services/callbackReminderService';
import { 
  DateFilterRange, 
  DateFilterField,
  countLeadsByDatePresets,
  getLeadCreationDate,
  getLeadUpdateDate,
  parseLeadDate,
  isLeadCreatedToday,
  isLeadUpdatedToday,
  formatRelativeTimeVN,
  formatFullDateTimeVN
} from '../utils/dateFilterUtils';
import { LeadDateFilter } from './LeadDateFilter';

/**
 * Checks if a lead has updatedAt older than 3 days without new internal notes/interaction logs.
 * Triggers a red warning highlight so sales know they need to follow up immediately.
 */
export interface LeadNeglectWarning {
  isNeglected: boolean;
  daysDiff: number;
  latestNoteDate: Date | null;
  hasAnyInternalNote: boolean;
  message: string;
}

/**
 * SLA Filter values for fast filtering on LeadTable toolbar
 */
export type SlaFilterValue = 
  | ''
  | 'urgent_all'
  | 'expiring_accept'
  | 'urgent_followup'
  | 'critical'
  | 'breached'
  | 'completed';

export function checkLeadNeglectWarning(lead: Lead, nowMs: number = Date.now()): LeadNeglectWarning {
  // If lead is already closed or deal is done, don't flag as neglected
  if (lead.status === 'Đã chốt') {
    return {
      isNeglected: false,
      daysDiff: 0,
      latestNoteDate: null,
      hasAnyInternalNote: false,
      message: ''
    };
  }

  // Find the latest internal note / interaction log in lead history
  let latestNoteDate: Date | null = null;
  let hasAnyInternalNote = false;

  if (Array.isArray(lead.history) && lead.history.length > 0) {
    for (const log of lead.history) {
      if (log.type === 'Ghi chú nội bộ' || log.content) {
        hasAnyInternalNote = true;
        const parsed = parseLeadDate(log.date);
        if (parsed && (!latestNoteDate || parsed.getTime() > latestNoteDate.getTime())) {
          latestNoteDate = parsed;
        }
      }
    }
  }

  // Get the effective reference update date (updatedAt or fallback)
  const updateDate = getLeadUpdateDate(lead);
  if (!updateDate) {
    return {
      isNeglected: false,
      daysDiff: 0,
      latestNoteDate: null,
      hasAnyInternalNote,
      message: ''
    };
  }

  // Calculate days elapsed since last update
  const diffMs = nowMs - updateDate.getTime();
  const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // If latest internal note is within 3 days, it's not neglected
  if (latestNoteDate) {
    const noteDiffMs = nowMs - latestNoteDate.getTime();
    const noteDaysDiff = Math.floor(noteDiffMs / (1000 * 60 * 60 * 24));
    if (noteDaysDiff < 3) {
      return {
        isNeglected: false,
        daysDiff,
        latestNoteDate,
        hasAnyInternalNote: true,
        message: ''
      };
    }
  }

  // If updatedAt is older than 3 days and no new internal note in the last 3 days
  if (daysDiff >= 3) {
    return {
      isNeglected: true,
      daysDiff,
      latestNoteDate,
      hasAnyInternalNote,
      message: `Quá ${daysDiff} ngày chưa cập nhật ghi chú mới`
    };
  }

  return {
    isNeglected: false,
    daysDiff,
    latestNoteDate,
    hasAnyInternalNote,
    message: ''
  };
}

interface LeadTableProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: LeadStatus) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenMessageModal: (lead: Lead) => void;
  onScheduleAppointment: (lead: Lead) => void;
  selectedLeadIds: string[];
  onToggleSelectLead: (leadId: string) => void;
  onSelectAllLeads: () => void;
  // Filters
  filterProject?: string;
  onFilterProjectChange?: (proj: string) => void;
  filterProjects?: string[];
  onFilterProjectsChange?: (projects: string[]) => void;
  filterSource?: string;
  onFilterSourceChange?: (source: string) => void;
  filterProductType: string;
  onFilterProductTypeChange: (prod: string) => void;
  filterAssignee: string;
  onFilterAssigneeChange: (assignee: string) => void;
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  onOpenInternalChat?: (leadId?: string) => void;
  onTransferLead?: (leads: Lead[]) => void;
  onAcceptLead?: (leadId: string) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  onOpenZaloReminder?: (lead: Lead) => void;
  tpkdFilterScope?: 'all' | 'tpkd' | 'nvkd';
  onTpkdFilterScopeChange?: (scope: 'all' | 'tpkd' | 'nvkd') => void;
  tpkdLeadsCount?: number;
  nvkdLeadsCount?: number;
  deptLeadsCount?: number;
  distributionPolicy?: AutoDistributionPolicy;
  // Date Filters
  dateFilterRange?: DateFilterRange;
  onDateFilterRangeChange?: (range: DateFilterRange) => void;
  dateFilterField?: DateFilterField;
  onDateFilterFieldChange?: (field: DateFilterField) => void;
  customStartDate?: string;
  onCustomStartDateChange?: (val: string) => void;
  customEndDate?: string;
  onCustomEndDateChange?: (val: string) => void;
  unfilteredLeadsForDateCounts?: Lead[];
  onBatchUpdateLeads?: (leads: Lead[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  // SLA Filter
  filterSla?: string;
  onFilterSlaChange?: (slaFilter: string) => void;
  // Status Update Highlight / Pulse
  recentlyUpdatedLeadId?: string | null;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onDeleteLead,
  onOpenMessageModal,
  onScheduleAppointment,
  selectedLeadIds,
  onToggleSelectLead,
  onSelectAllLeads,
  filterProject = '',
  onFilterProjectChange,
  filterProjects,
  onFilterProjectsChange,
  filterSource,
  onFilterSourceChange,
  filterProductType,
  onFilterProductTypeChange,
  filterAssignee,
  onFilterAssigneeChange,
  currentUser,
  salesMembers,
  onOpenInternalChat,
  onTransferLead,
  onAcceptLead,
  onUpdateLead,
  onOpenZaloReminder,
  tpkdFilterScope = 'all',
  onTpkdFilterScopeChange,
  tpkdLeadsCount = 0,
  nvkdLeadsCount = 0,
  deptLeadsCount,
  distributionPolicy = DEFAULT_DISTRIBUTION_POLICY,
  dateFilterRange,
  onDateFilterRangeChange,
  dateFilterField,
  onDateFilterFieldChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  unfilteredLeadsForDateCounts,
  onBatchUpdateLeads,
  onShowToast,
  filterSla,
  onFilterSlaChange,
  recentlyUpdatedLeadId
}) => {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterPriorityLevel, setFilterPriorityLevel] = useState<string>('');
  const [isSmartLabelModalOpen, setIsSmartLabelModalOpen] = useState<boolean>(false);
  const [filterNeglectedOnly, setFilterNeglectedOnly] = useState<boolean>(false);
  const [filterPriorityOnly, setFilterPriorityOnly] = useState<boolean>(false);
  const [internalFilterSla, setInternalFilterSla] = useState<SlaFilterValue>('');
  const activeFilterSla = (filterSla !== undefined ? filterSla : internalFilterSla) as SlaFilterValue;
  const handleFilterSlaChange = (val: SlaFilterValue) => {
    if (onFilterSlaChange) {
      onFilterSlaChange(val);
    } else {
      setInternalFilterSla(val);
    }
  };
  const [internalFilterSource, setInternalFilterSource] = useState<string>('');
  const activeSource = filterSource !== undefined ? filterSource : internalFilterSource;
  const handleSourceChange = onFilterSourceChange || setInternalFilterSource;
  const [internalFilterProductType, setInternalFilterProductType] = useState<string>('');
  const activeProductType = filterProductType !== undefined ? filterProductType : internalFilterProductType;
  const handleProductTypeChange = onFilterProductTypeChange || setInternalFilterProductType;
  const [internalDateRange, setInternalDateRange] = useState<DateFilterRange>('all');
  const [internalDateField, setInternalDateField] = useState<DateFilterField>('createdAt');
  const [internalCustomStart, setInternalCustomStart] = useState('');
  const [internalCustomEnd, setInternalCustomEnd] = useState('');
  const [sortMode, setSortMode] = useState<'default' | 'created_desc' | 'updated_desc' | 'created_asc' | 'sla_urgent' | 'neglected_urgent'>('default');

  // Quick Note inline editing state
  const [editingNoteLeadId, setEditingNoteLeadId] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState<string>('');
  const [justUpdatedStatusId, setJustUpdatedStatusId] = useState<string | null>(null);
  // Recently updated status tracking map: leadId -> timestamp
  const [localUpdatedLeadIds, setLocalUpdatedLeadIds] = useState<Record<string, number>>({});
  const prevLeadsStatusRef = React.useRef<Map<string, LeadStatus>>(new Map());

  // Automatically detect whenever any lead's status changes (from modal, batch update, or external sync)
  React.useEffect(() => {
    const newlyChangedIds: string[] = [];
    leads.forEach((l) => {
      const prevStatus = prevLeadsStatusRef.current.get(l.id);
      if (prevStatus && prevStatus !== l.status) {
        newlyChangedIds.push(l.id);
      }
      prevLeadsStatusRef.current.set(l.id, l.status);
    });

    if (newlyChangedIds.length > 0) {
      const now = Date.now();
      setLocalUpdatedLeadIds((prev) => {
        const next = { ...prev };
        newlyChangedIds.forEach((id) => {
          next[id] = now;
        });
        return next;
      });

      const timer = setTimeout(() => {
        setLocalUpdatedLeadIds((prev) => {
          const next = { ...prev };
          newlyChangedIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [leads]);

  // Helper to determine if a customer row or card has just had its status updated
  const isRowStatusUpdated = (leadId: string): boolean => {
    if (recentlyUpdatedLeadId === leadId) return true;
    if (justUpdatedStatusId === leadId) return true;
    const updateTime = localUpdatedLeadIds[leadId];
    if (updateTime && Date.now() - updateTime < 3500) return true;
    return false;
  };

  // Live ticker updating every 1 second for accurate real-time SLA countdown
  const [nowTime, setNowTime] = React.useState(() => Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartQuickNote = (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNoteLeadId(lead.id);
    setQuickNoteText('');
  };

  const handleSaveQuickNote = (lead: Lead, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (!quickNoteText.trim() || !onUpdateLead) return;

    const nowIso = new Date().toISOString();
    const dateStr = nowIso.replace('T', ' ').slice(0, 16);
    const authorName = currentUser?.name || lead.assignee || 'Sales';

    const newLog = {
      id: `log-${Date.now()}`,
      date: dateStr,
      type: 'Ghi chú nội bộ' as const,
      content: quickNoteText.trim(),
      author: authorName
    };

    const combinedNotes = lead.notes
      ? `[${dateStr.slice(5)}] ${quickNoteText.trim()} • ${lead.notes}`
      : `[${dateStr.slice(5)}] ${quickNoteText.trim()}`;

    const updatedLead: Lead = {
      ...lead,
      notes: combinedNotes,
      history: [newLog, ...(lead.history || [])],
      updatedAt: nowIso
    };

    onUpdateLead(updatedLead);
    setEditingNoteLeadId(null);
    setQuickNoteText('');
  };

  const handleStatusChangeWithFeedback = (leadId: string, newStatus: LeadStatus) => {
    setJustUpdatedStatusId(leadId);
    setLocalUpdatedLeadIds((prev) => ({ ...prev, [leadId]: Date.now() }));
    setTimeout(() => {
      setJustUpdatedStatusId((cur) => (cur === leadId ? null : cur));
    }, 3500);
    onUpdateStatus(leadId, newStatus);
  };

  const handleSingleAiLabel = async (lead: Lead) => {
    try {
      const res = await runSmartLabeling([lead]);
      if (res && res[0] && onUpdateLead) {
        const item = res[0];
        const updated: Lead = {
          ...lead,
          potentialLevel: item.potentialLevel,
          priorityReason: item.priorityReason,
          priorityUpdatedAt: new Date().toISOString()
        };
        onUpdateLead(updated);
        if (onShowToast) {
          onShowToast(`✨ Gemini AI đã gắn nhãn "${item.potentialLevel}" cho khách "${lead.fullName}"!`, 'success');
        }
      }
    } catch (err) {
      console.error('Failed to run AI SmartLabel for lead:', err);
      if (onShowToast) {
        onShowToast('Không thể gắn nhãn AI cho khách hàng này. Vui lòng thử lại!', 'error');
      }
    }
  };

  const activeDateRange = dateFilterRange !== undefined ? dateFilterRange : internalDateRange;
  const handleRangeChange = onDateFilterRangeChange || setInternalDateRange;
  const activeDateField = dateFilterField !== undefined ? dateFilterField : internalDateField;
  const handleDateFieldChange = onDateFilterFieldChange || setInternalDateField;
  const activeCustomStart = customStartDate !== undefined ? customStartDate : internalCustomStart;
  const handleCustomStartChange = onCustomStartDateChange || setInternalCustomStart;
  const activeCustomEnd = customEndDate !== undefined ? customEndDate : internalCustomEnd;
  const handleCustomEndChange = onCustomEndDateChange || setInternalCustomEnd;

  // Active selected projects for multi-select
  const activeProjects = React.useMemo(() => {
    if (Array.isArray(filterProjects)) return filterProjects;
    return filterProject ? [filterProject] : [];
  }, [filterProjects, filterProject]);

  const handleProjectsChange = (newProjects: string[]) => {
    if (onFilterProjectsChange) {
      onFilterProjectsChange(newProjects);
    }
    if (onFilterProjectChange) {
      onFilterProjectChange(newProjects.length === 1 ? newProjects[0] : (newProjects[0] || ''));
    }
  };

  const availableProjects = React.useMemo(() => {
    return getAllProjects(unfilteredLeadsForDateCounts || leads);
  }, [unfilteredLeadsForDateCounts, leads]);

  // Source statistics and unique dataset sources for origin filter dropdown
  const availableSourceStats = React.useMemo(() => {
    const baseLeads = unfilteredLeadsForDateCounts || leads;
    let total = baseLeads.length;
    let facebook = 0;
    let referral = 0;
    let website = 0;
    let google = 0;
    let zalo = 0;
    let vipBank = 0;
    const detailedMap = new Map<string, number>();

    baseLeads.forEach((l) => {
      const src = (l.dataSource || '').trim();
      if (src) {
        detailedMap.set(src, (detailedMap.get(src) || 0) + 1);
      }
      if (isLeadMatchingSource(l, 'facebook')) facebook++;
      if (isLeadMatchingSource(l, 'referral')) referral++;
      if (isLeadMatchingSource(l, 'website')) website++;
      if (isLeadMatchingSource(l, 'google')) google++;
      if (isLeadMatchingSource(l, 'zalo')) zalo++;
      if (isLeadMatchingSource(l, 'vip_bank')) vipBank++;
    });

    const detailedList = Array.from(detailedMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      facebook,
      referral,
      website,
      google,
      zalo,
      vipBank,
      detailedList
    };
  }, [unfilteredLeadsForDateCounts, leads]);

  // Product type statistics and categories for product filter dropdown & quick buttons
  const availableProductTypeStats = React.useMemo(() => {
    const baseLeads = unfilteredLeadsForDateCounts || leads;
    const allTypes = getAllProductTypes(baseLeads);
    const countMap = new Map<string, number>();

    baseLeads.forEach((l) => {
      const pt = (l.productType || '').trim();
      if (pt) {
        countMap.set(pt, (countMap.get(pt) || 0) + 1);
      }
    });

    const list = allTypes.map((type) => {
      let count = countMap.get(type) || 0;
      if (!count) {
        const lower = type.toLowerCase();
        for (const [key, val] of countMap.entries()) {
          if (key.toLowerCase() === lower || key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
            count += val;
          }
        }
      }
      return {
        type,
        count
      };
    });

    let nhaPhoCount = 0;
    let bietThuCount = 0;
    let shophouseCount = 0;
    let canHoCount = 0;

    baseLeads.forEach((l) => {
      const pt = (l.productType || '').toLowerCase();
      if (pt.includes('nhà phố') || pt.includes('nha pho')) nhaPhoCount++;
      if (pt.includes('biệt thự') || pt.includes('villa') || pt.includes('biet thu')) bietThuCount++;
      if (pt.includes('shophouse') || pt.includes('nhà phố thương mại')) shophouseCount++;
      if (pt.includes('căn hộ') || pt.includes('chung cư') || pt.includes('apartment')) canHoCount++;
    });

    return {
      total: baseLeads.length,
      list,
      nhaPhoCount,
      bietThuCount,
      shophouseCount,
      canHoCount
    };
  }, [unfilteredLeadsForDateCounts, leads]);

  // Live counts for preset tabs
  const datePresetCounts = React.useMemo(() => {
    return countLeadsByDatePresets(unfilteredLeadsForDateCounts || leads, activeDateField);
  }, [unfilteredLeadsForDateCounts, leads, activeDateField]);

  // Sorted Leads based on sortMode
  const sortedLeads = React.useMemo(() => {
    const list = [...leads];
    if (sortMode === 'sla_urgent') {
      return list.sort((a, b) => {
        const slaA = getLeadSlaInfo(a, distributionPolicy, nowTime);
        const slaB = getLeadSlaInfo(b, distributionPolicy, nowTime);

        // Priority ranking:
        // 0: breached (negative remaining time - most urgent!)
        // 1: critical (< 15 mins)
        // 2: needs_accept (waiting for acceptance)
        // 3: needs_interaction (accepted, waiting for first call/report)
        // 4: completed (handled / closed)
        // 5: unassigned
        const getPriority = (sla: LeadSlaInfo) => {
          if (sla.status === 'breached') return 0;
          if (sla.status === 'critical') return 1;
          if (sla.status === 'needs_accept') return 2;
          if (sla.status === 'needs_interaction') return 3;
          if (sla.status === 'completed') return 4;
          return 5;
        };

        const prioA = getPriority(slaA);
        const prioB = getPriority(slaB);

        if (prioA !== prioB) return prioA - prioB;
        return slaA.remainingMs - slaB.remainingMs;
      });
    }
    if (sortMode === 'neglected_urgent') {
      return list.sort((a, b) => {
        const warnA = checkLeadNeglectWarning(a, nowTime);
        const warnB = checkLeadNeglectWarning(b, nowTime);
        if (warnA.isNeglected && !warnB.isNeglected) return -1;
        if (!warnA.isNeglected && warnB.isNeglected) return 1;
        return warnB.daysDiff - warnA.daysDiff;
      });
    }
    if (sortMode === 'created_desc') {
      return list.sort((a, b) => {
        const timeA = getLeadCreationDate(a)?.getTime() || 0;
        const timeB = getLeadCreationDate(b)?.getTime() || 0;
        return timeB - timeA;
      });
    }
    if (sortMode === 'updated_desc') {
      return list.sort((a, b) => {
        const timeA = getLeadUpdateDate(a)?.getTime() || 0;
        const timeB = getLeadUpdateDate(b)?.getTime() || 0;
        return timeB - timeA;
      });
    }
    if (sortMode === 'created_asc') {
      return list.sort((a, b) => {
        const timeA = getLeadCreationDate(a)?.getTime() || 0;
        const timeB = getLeadCreationDate(b)?.getTime() || 0;
        return timeA - timeB;
      });
    }
    return list;
  }, [leads, sortMode, distributionPolicy, nowTime]);

  // All available tags for filter dropdown
  const availableTags = React.useMemo(() => {
    return getAllAvailableTags(leads);
  }, [leads]);

  // Total count of leads that have updatedAt > 3 days without new internal notes
  const neglectedLeadsCount = React.useMemo(() => {
    return leads.filter((l) => checkLeadNeglectWarning(l, nowTime).isNeglected).length;
  }, [leads, nowTime]);

  // Total count of urgent priority leads that haven't been contacted within SLA window (e.g. 2 hours)
  const urgentPriorityLeadsCount = React.useMemo(() => {
    return leads.filter((l) => checkLeadSlaContactWarning(l, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime).isOverdue).length;
  }, [leads, nowTime]);

  // Real-time counts for SLA filter options
  const slaFilterCounts = React.useMemo(() => {
    let urgentAll = 0;
    let expiringAccept = 0;
    let urgentFollowup = 0;
    let critical = 0;
    let breached = 0;
    let completed = 0;

    leads.forEach((l) => {
      const sla = getLeadSlaInfo(l, distributionPolicy, nowTime);
      const contactWarn = checkLeadSlaContactWarning(l, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);

      const isExpiringAccept = !l.acceptedAt && sla.status !== 'unassigned' && sla.status !== 'completed' && (sla.status === 'needs_accept' || sla.status === 'critical');
      const isUrgentFollowup = (sla.status === 'needs_interaction' || (sla.status === 'critical' && Boolean(l.acceptedAt))) || contactWarn.isOverdue || contactWarn.isUrgentWarning;
      const isCrit = sla.status === 'critical' || contactWarn.isUrgentWarning;
      const isBreach = sla.status === 'breached' || contactWarn.isOverdue || Boolean(l.slaBreached);
      const isComp = sla.status === 'completed' || contactWarn.hasBeenContacted;

      if (isExpiringAccept) expiringAccept++;
      if (isUrgentFollowup) urgentFollowup++;
      if (isCrit) critical++;
      if (isBreach) breached++;
      if (isComp) completed++;

      if (isExpiringAccept || isUrgentFollowup || isCrit || isBreach) {
        urgentAll++;
      }
    });

    return {
      urgentAll,
      expiringAccept,
      urgentFollowup,
      critical,
      breached,
      completed
    };
  }, [leads, distributionPolicy, nowTime]);

  // Filter sortedLeads by active tag filter, neglected toggle, priority SLA filter, SLA status filter, product type, or source
  const displayedLeads = React.useMemo(() => {
    let result = sortedLeads;
    if (activeSource) {
      result = result.filter((l) => isLeadMatchingSource(l, activeSource));
    }
    if (activeProductType) {
      result = result.filter((l) => isProductTypeMatch(l.productType, activeProductType));
    }
    if (filterTag) {
      const lowerTag = filterTag.toLowerCase();
      result = result.filter(
        (l) => Array.isArray(l.tags) && l.tags.some((t) => t.toLowerCase() === lowerTag)
      );
    }
    if (filterNeglectedOnly) {
      result = result.filter((l) => checkLeadNeglectWarning(l, nowTime).isNeglected);
    }
    if (filterPriorityLevel) {
      if (filterPriorityLevel === 'unlabeled') {
        result = result.filter((l) => !l.potentialLevel);
      } else {
        result = result.filter((l) => l.potentialLevel === filterPriorityLevel);
      }
    }
    if (filterPriorityOnly) {
      result = result.filter((l) => checkLeadSlaContactWarning(l, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime).isOverdue);
    }
    // Filter by comprehensive SLA status
    if (activeFilterSla) {
      result = result.filter((l) => {
        const sla = getLeadSlaInfo(l, distributionPolicy, nowTime);
        const contactWarn = checkLeadSlaContactWarning(l, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);

        if (activeFilterSla === 'urgent_all') {
          const isExpiringAccept = !l.acceptedAt && sla.status !== 'unassigned' && sla.status !== 'completed' && (sla.status === 'needs_accept' || sla.status === 'critical');
          const isUrgentFollowup = (sla.status === 'needs_interaction' || (sla.status === 'critical' && Boolean(l.acceptedAt))) || contactWarn.isOverdue || contactWarn.isUrgentWarning;
          const isCrit = sla.status === 'critical' || contactWarn.isUrgentWarning;
          const isBreach = sla.status === 'breached' || contactWarn.isOverdue || Boolean(l.slaBreached);
          return isExpiringAccept || isUrgentFollowup || isCrit || isBreach;
        }

        if (activeFilterSla === 'expiring_accept') {
          return !l.acceptedAt && sla.status !== 'unassigned' && sla.status !== 'completed' && (sla.status === 'needs_accept' || sla.status === 'critical');
        }

        if (activeFilterSla === 'urgent_followup') {
          return (sla.status === 'needs_interaction' || (sla.status === 'critical' && Boolean(l.acceptedAt))) || contactWarn.isOverdue || contactWarn.isUrgentWarning;
        }

        if (activeFilterSla === 'critical') {
          return sla.status === 'critical' || contactWarn.isUrgentWarning;
        }

        if (activeFilterSla === 'breached') {
          return sla.status === 'breached' || contactWarn.isOverdue || Boolean(l.slaBreached);
        }

        if (activeFilterSla === 'completed') {
          return sla.status === 'completed' || contactWarn.hasBeenContacted;
        }

        return true;
      });
    }

    // If Priority filter or SLA Filter is active and default sort is chosen, place the most urgent cases at top
    if (activeFilterSla && activeFilterSla !== 'completed' && sortMode === 'default') {
      result = [...result].sort((a, b) => {
        const slaA = getLeadSlaInfo(a, distributionPolicy, nowTime);
        const slaB = getLeadSlaInfo(b, distributionPolicy, nowTime);
        const getPriority = (sla: LeadSlaInfo) => {
          if (sla.status === 'breached') return 0;
          if (sla.status === 'critical') return 1;
          if (sla.status === 'needs_accept') return 2;
          if (sla.status === 'needs_interaction') return 3;
          if (sla.status === 'completed') return 4;
          return 5;
        };
        const prioA = getPriority(slaA);
        const prioB = getPriority(slaB);
        if (prioA !== prioB) return prioA - prioB;
        return slaA.remainingMs - slaB.remainingMs;
      });
    } else if (filterPriorityOnly && sortMode === 'default') {
      result = [...result].sort((a, b) => {
        const warnA = checkLeadSlaContactWarning(a, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);
        const warnB = checkLeadSlaContactWarning(b, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);
        return warnA.remainingMs - warnB.remainingMs;
      });
    }
    return result;
  }, [sortedLeads, activeSource, activeProductType, filterTag, filterPriorityLevel, filterNeglectedOnly, filterPriorityOnly, activeFilterSla, sortMode, distributionPolicy, nowTime]);

  // Compute assignees based on current user role (TPKD sees department sales, Sale sees only self)
  const availableAssignees = React.useMemo(() => {
    if (!currentUser) return ASSIGNEES;
    if (currentUser.role === 'admin') {
      if (salesMembers && salesMembers.length > 0) {
        return Array.from(new Set(salesMembers.map((s) => s.name)));
      }
      return ASSIGNEES;
    }
    if (currentUser.role === 'tpkd') {
      if (salesMembers && salesMembers.length > 0) {
        const deptSales = salesMembers.filter((m) => {
          if (m.id === currentUser.id || m.name.toLowerCase() === currentUser.name.toLowerCase()) return true;
          const tpkd = getTpkdForMember(m, salesMembers);
          return (
            tpkd?.id === currentUser.id ||
            tpkd?.email?.toLowerCase() === currentUser.email.toLowerCase() ||
            tpkd?.name?.toLowerCase() === currentUser.name.toLowerCase() ||
            (m.managerId && m.managerId === currentUser.id) ||
            (m.managerName && m.managerName.toLowerCase() === currentUser.name.toLowerCase()) ||
            (m.team && currentUser.team && m.team.toLowerCase() === currentUser.team.toLowerCase())
          );
        });
        const leadAssignees = leads.map((l) => l.assignee).filter(Boolean);
        const allNames = [...deptSales.map((s) => s.name), ...leadAssignees];
        if (allNames.length > 0) {
          return Array.from(new Set(allNames));
        }
      }
      return salesMembers && salesMembers.length > 0
        ? Array.from(new Set(salesMembers.map((s) => s.name)))
        : ASSIGNEES;
    }
    // For sale: only their own name
    return [currentUser.name];
  }, [currentUser, salesMembers, leads]);

  const handleCopyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1800);
  };

  const handleCall = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${phone}`;
  };

  const handleOpenZalo = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = phone.replace(/\D/g, '');
    const zaloPhone = cleanPhone.startsWith('0') ? '84' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://zalo.me/${zaloPhone}`, '_blank');
  };

  const isAllSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Filter Sub-bar */}
      <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5">
        {/* Row 1: Date Filter Bar + Quick Presets + Matching Tag + View Toggle & Total Count */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          <div className="flex items-center overflow-x-auto touch-scroll no-scrollbar py-0.5 w-full lg:w-auto">
            <LeadDateFilter
              currentRange={activeDateRange}
              onRangeChange={handleRangeChange}
              dateField={activeDateField}
              onDateFieldChange={handleDateFieldChange}
              customStartDate={activeCustomStart}
              onCustomStartDateChange={handleCustomStartChange}
              customEndDate={activeCustomEnd}
              onCustomEndDateChange={handleCustomEndChange}
              presetCounts={datePresetCounts}
              totalMatchingCount={leads.length}
            />
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2 text-xs text-slate-500 font-medium shrink-0 flex-wrap">
            {/* Sort Order Selector */}
            <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg shrink-0">
              <span className="text-[11px] font-bold text-slate-600 pl-1.5 hidden xl:inline-flex items-center gap-1">
                <ArrowDownUp className="w-3 h-3 text-slate-500" />
                Xếp:
              </span>
              <select
                id="select-lead-sort-mode"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as any)}
                className="bg-white text-slate-800 rounded-md px-2 py-1 text-[11px] font-bold border-0 focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[30px] cursor-pointer shadow-2xs"
                title="Chọn tiêu chuẩn sắp xếp thứ tự khách hàng trong bảng"
              >
                <option value="default">🔢 STT ban đầu (#)</option>
                <option value="sla_urgent">🚨 Quá hạn SLA (Cần gọi ngay) ↓</option>
                <option value="neglected_urgent">⚠️ Cần chăm sóc lại (&gt;3 ngày) ↓</option>
                <option value="created_desc">⚡ Mới tạo / Đẩy về trước ↓</option>
                <option value="updated_desc">🔄 Cập nhật gần nhất ↓</option>
                <option value="created_asc">📅 Cũ nhất trước ↑</option>
              </select>
            </div>

            {/* Mobile Display Toggle (Card vs Table) */}
            <div className="flex items-center bg-slate-200/90 p-1 rounded-xl md:hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileViewMode('cards')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] active:scale-95 cursor-pointer ${
                  mobileViewMode === 'cards'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Xem dạng thẻ (Tối ưu cho màn hình điện thoại)"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                <span>Dạng thẻ</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] active:scale-95 cursor-pointer ${
                  mobileViewMode === 'table'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
                title="Xem dạng bảng (Có ghim cố định tên khách và thao tác)"
              >
                <List className="w-4 h-4 mr-1.5" />
                <span>Dạng bảng</span>
              </button>
            </div>

            <div className="whitespace-nowrap flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Hiển thị:</span>
              <strong className="text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs font-bold text-xs">
                {leads.length} khách
              </strong>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Category & Staff Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto touch-scroll no-scrollbar py-0.5 pt-1.5 border-t border-slate-200/70 w-full shrink-0">
          <div className="flex items-center text-slate-600 font-bold mr-0.5 shrink-0">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
            <span>Phân loại:</span>
          </div>

          {/* Quick filter for TPKD: 3-mode scope selector */}
          {currentUser?.role === 'tpkd' && (
            <div className="flex items-center space-x-1 p-0.5 bg-slate-200/70 rounded-xl shrink-0 border border-slate-300/80">
              <button
                type="button"
                onClick={() => {
                  if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('all');
                  onFilterAssigneeChange('');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[34px] ${
                  tpkdFilterScope === 'all' && !filterAssignee
                    ? 'bg-purple-800 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-white/80'
                }`}
                title="Xem toàn bộ khách hàng của phòng ban (Cả TPKD & NVKD)"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Full phòng ({deptLeadsCount ?? leads.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('tpkd');
                  onFilterAssigneeChange('');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[34px] ${
                  tpkdFilterScope === 'tpkd' && !filterAssignee
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-900 bg-purple-50/80 hover:bg-purple-100'
                }`}
                title="Chỉ hiển thị các khách hàng do Trưởng Phòng (bạn) trực tiếp phụ trách"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Khách TPKD ({tpkdLeadsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('nvkd');
                  onFilterAssigneeChange('');
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[34px] ${
                  tpkdFilterScope === 'nvkd' && !filterAssignee
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-900 bg-blue-50/80 hover:bg-blue-100'
                }`}
                title="Chỉ hiển thị các khách hàng do các chuyên viên NVKD trong phòng phụ trách"
              >
                <Briefcase className="w-3.5 h-3.5 text-blue-200" />
                <span>Khách NVKD ({nvkdLeadsCount})</span>
              </button>
            </div>
          )}

          {/* Quick filter: Khách của tôi (For Sale or Admin) */}
          {currentUser && currentUser.role !== 'tpkd' && (
            <button
              onClick={() => onFilterAssigneeChange(filterAssignee === currentUser.name ? '' : currentUser.name)}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 shrink-0 min-h-[36px] ${
                filterAssignee === currentUser.name
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-amber-400'
              }`}
              title="Chỉ hiển thị các khách hàng được phân bổ cho bạn"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Khách của tôi</span>
            </button>
          )}

          {/* Quick filter for Admin: MAY_TRUONGBV_MH5.19 */}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                const targetProj = 'MAY_TRUONGBV_MH5.19';
                if (activeProjects.includes(targetProj)) {
                  handleProjectsChange(activeProjects.filter((p) => p !== targetProj));
                } else {
                  handleProjectsChange([...activeProjects, targetProj]);
                }
              }}
              className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer ${
                activeProjects.includes('MAY_TRUONGBV_MH5.19')
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Lọc các khách hàng thuộc file MAY_TRUONGBV_MH5.19_CRM_V.1"
            >
              <span>🎯 MAY_TRUONGBV_MH5.19</span>
            </button>
          )}

          {/* Multi-select Real Estate Projects Filter */}
          <ProjectMultiSelectFilter
            allProjects={availableProjects}
            selectedProjects={activeProjects}
            onChange={handleProjectsChange}
            leads={unfilteredLeadsForDateCounts || leads}
          />

          {/* Nguồn khách hàng (Source / Origin Filter Dropdown) */}
          <div className="relative shrink-0">
            <select
              id="filter-source-select"
              value={activeSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className={`rounded-xl pl-8 pr-7 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shrink-0 min-w-[145px] max-w-[215px] truncate min-h-[36px] font-medium cursor-pointer transition-colors appearance-none ${
                activeSource
                  ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 font-bold shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-800 hover:border-amber-400'
              }`}
              title="Lọc khách hàng theo nguồn tiếp nhận (Facebook, Referral, Website...)"
            >
              <option value="">Tất cả nguồn ({availableSourceStats.total})</option>

              <optgroup label="── Phân loại theo nguồn gốc (Origin) ──">
                <option value="facebook">🌐 Facebook ({availableSourceStats.facebook})</option>
                <option value="referral">🤝 Giới thiệu / Referral ({availableSourceStats.referral})</option>
                <option value="website">💻 Website / Hotline ({availableSourceStats.website})</option>
                <option value="google">🔍 Google ({availableSourceStats.google})</option>
                <option value="zalo">💬 Zalo ({availableSourceStats.zalo})</option>
                {availableSourceStats.vipBank > 0 && (
                  <option value="vip_bank">🏦 Data VIP / Ngân Hàng ({availableSourceStats.vipBank})</option>
                )}
              </optgroup>

              {availableSourceStats.detailedList.length > 0 && (
                <optgroup label="── Tệp nguồn dữ liệu cụ thể ──">
                  {availableSourceStats.detailedList.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name} ({item.count})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <Share2 className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Loại sản phẩm Dropdown */}
          <div className="relative shrink-0">
            <select
              id="filter-product-select"
              value={activeProductType}
              onChange={(e) => handleProductTypeChange(e.target.value)}
              className={`rounded-xl pl-8 pr-7 py-1.5 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none shrink-0 min-w-[155px] max-w-[215px] truncate min-h-[36px] font-medium cursor-pointer transition-colors appearance-none ${
                activeProductType
                  ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-800 hover:border-emerald-400'
              }`}
              title="Lọc nhanh khách hàng theo danh mục loại bất động sản (Nhà phố, Biệt thự, Shophouse, Căn hộ...)"
            >
              <option value="">🏠 Tất cả loại SP ({availableProductTypeStats.total})</option>
              {availableProductTypeStats.list.map(({ type, count }) => (
                <option key={type} value={type}>
                  {type} ({count})
                </option>
              ))}
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Building className={`w-3.5 h-3.5 ${activeProductType ? 'text-emerald-700' : 'text-slate-500'}`} />
            </div>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Buttons: Loại sản phẩm hot (Nhà phố, Biệt thự, Shophouse) */}
          <button
            type="button"
            id="filter-pt-nhapho-btn"
            onClick={() => handleProductTypeChange(isProductTypeMatch(activeProductType, 'Nhà phố') && activeProductType ? '' : 'Nhà phố')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeProductType && isProductTypeMatch(activeProductType, 'Nhà phố')
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 shadow-2xs'
            }`}
            title="Lọc nhanh danh mục Nhà phố trung tâm"
          >
            <span>🏡 Nhà phố</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeProductType && isProductTypeMatch(activeProductType, 'Nhà phố')
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {availableProductTypeStats.nhaPhoCount}
            </span>
          </button>

          <button
            type="button"
            id="filter-pt-bietthu-btn"
            onClick={() => handleProductTypeChange(isProductTypeMatch(activeProductType, 'Biệt thự') && activeProductType ? '' : 'Biệt thự')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeProductType && isProductTypeMatch(activeProductType, 'Biệt thự')
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 shadow-2xs'
            }`}
            title="Lọc nhanh danh mục Biệt thự / Villa"
          >
            <span>🏰 Biệt thự</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeProductType && isProductTypeMatch(activeProductType, 'Biệt thự')
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {availableProductTypeStats.bietThuCount}
            </span>
          </button>

          <button
            type="button"
            id="filter-pt-shophouse-btn"
            onClick={() => handleProductTypeChange(isProductTypeMatch(activeProductType, 'Shophouse') && activeProductType ? '' : 'Shophouse')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeProductType && isProductTypeMatch(activeProductType, 'Shophouse')
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50 hover:text-emerald-900 hover:border-emerald-300 shadow-2xs'
            }`}
            title="Lọc nhanh danh mục Shophouse / Nhà phố thương mại"
          >
            <span>🏢 Shophouse</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeProductType && isProductTypeMatch(activeProductType, 'Shophouse')
                ? 'bg-emerald-800 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {availableProductTypeStats.shophouseCount}
            </span>
          </button>

          {/* Người phụ trách */}
          <select
            id="filter-assignee-select"
            value={
              tpkdFilterScope === 'tpkd' && !filterAssignee
                ? '__all_tpkd__'
                : tpkdFilterScope === 'nvkd' && !filterAssignee
                ? '__all_nvkd__'
                : filterAssignee
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__all_tpkd__') {
                if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('tpkd');
                onFilterAssigneeChange('');
              } else if (val === '__all_nvkd__') {
                if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('nvkd');
                onFilterAssigneeChange('');
              } else if (val === '__all_dept__' || val === '') {
                if (onTpkdFilterScopeChange) onTpkdFilterScopeChange('all');
                onFilterAssigneeChange('');
              } else {
                onFilterAssigneeChange(val);
              }
            }}
            className="bg-white border border-slate-300 text-slate-800 rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shrink-0 min-w-[150px] max-w-[210px] truncate min-h-[36px]"
          >
            <option value="">
              {currentUser?.role === 'tpkd'
                ? `Tất cả nhân sự phòng (${availableAssignees.length})`
                : currentUser?.role === 'sale'
                  ? 'Tất cả khách được giao'
                  : `Tất cả nhân sự (${availableAssignees.length})`}
            </option>
            {currentUser?.role === 'tpkd' && (
              <optgroup label="── Nhóm phân quyền ──">
                <option value="__all_dept__">🏢 Tất cả khách phòng ({deptLeadsCount ?? leads.length})</option>
                <option value="__all_tpkd__">👑 Tất cả khách của TPKD ({tpkdLeadsCount})</option>
                <option value="__all_nvkd__">💼 Tất cả khách của NVKD ({nvkdLeadsCount})</option>
              </optgroup>
            )}
            <optgroup label={currentUser?.role === 'tpkd' ? '── Từng nhân sự cụ thể ──' : '── Danh sách nhân sự ──'}>
              {availableAssignees.map((a) => {
                const info = getAssigneeRoleInfo(a, salesMembers, currentUser?.name);
                return (
                  <option key={a} value={a}>
                    {info.isTpkd ? `👑 TPKD: ${a}` : `💼 NVKD: ${a}`} {info.isCurrentUser ? '(Bạn)' : ''}
                  </option>
                );
              })}
            </optgroup>
          </select>

          {/* SLA Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              id="filter-sla-status-select"
              value={activeFilterSla}
              onChange={(e) => handleFilterSlaChange(e.target.value as SlaFilterValue)}
              className={`rounded-xl pl-8 pr-7 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shrink-0 min-w-[155px] max-w-[230px] truncate min-h-[36px] font-medium cursor-pointer transition-colors appearance-none ${
                activeFilterSla
                  ? activeFilterSla === 'breached'
                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 font-bold shadow-2xs'
                    : activeFilterSla === 'expiring_accept' || activeFilterSla === 'critical'
                      ? 'bg-amber-50 border-2 border-amber-500 text-amber-950 font-bold shadow-2xs'
                      : activeFilterSla === 'urgent_followup'
                        ? 'bg-orange-50 border-2 border-orange-500 text-orange-950 font-bold shadow-2xs'
                        : activeFilterSla === 'urgent_all'
                          ? 'bg-red-50 border-2 border-red-500 text-red-950 font-bold shadow-2xs'
                          : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold shadow-2xs'
                  : 'bg-white border border-slate-300 text-slate-800 hover:border-amber-400'
              }`}
              title="Lọc nhanh khách hàng theo chính sách SLA: Sắp đến hạn tiếp nhận, Cần follow-up gấp, hoặc Quá hạn"
            >
              <option value="">⏱️ Bộ lọc SLA ({leads.length})</option>
              <option value="urgent_all">
                ⚡ CẦN XỬ LÝ GẤP ({slaFilterCounts.urgentAll})
              </option>
              <option value="expiring_accept">
                ⏳ Sắp đến hạn tiếp nhận ({slaFilterCounts.expiringAccept})
              </option>
              <option value="urgent_followup">
                📞 Cần follow-up gấp ({slaFilterCounts.urgentFollowup})
              </option>
              <option value="critical">
                🔥 Sắp hết hạn (&lt;15p-45p) ({slaFilterCounts.critical})
              </option>
              <option value="breached">
                ⚠️ Quá hạn SLA ({slaFilterCounts.breached})
              </option>
              <option value="completed">
                ✅ Đã hoàn tất SLA ({slaFilterCounts.completed})
              </option>
            </select>
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Clock className={`w-3.5 h-3.5 ${activeFilterSla ? 'text-amber-700' : 'text-slate-500'}`} />
            </div>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Quick Button: Sắp đến hạn tiếp nhận */}
          <button
            type="button"
            id="filter-sla-expiring-accept-btn"
            onClick={() => handleFilterSlaChange(activeFilterSla === 'expiring_accept' ? '' : 'expiring_accept')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeFilterSla === 'expiring_accept'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-400/40'
                : slaFilterCounts.expiringAccept > 0
                  ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Lọc nhanh khách hàng đang chờ Sale bấm Tiếp Nhận trước khi hết hạn SLA"
          >
            <Clock className={`w-3.5 h-3.5 ${activeFilterSla === 'expiring_accept' ? 'text-white' : 'text-amber-600'} ${slaFilterCounts.expiringAccept > 0 ? 'animate-pulse' : ''}`} />
            <span>Chờ tiếp nhận</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeFilterSla === 'expiring_accept'
                ? 'bg-amber-800 text-white'
                : slaFilterCounts.expiringAccept > 0
                  ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-300'
                  : 'bg-slate-200 text-slate-700'
            }`}>
              {slaFilterCounts.expiringAccept}
            </span>
          </button>

          {/* Quick Button: Cần follow-up gấp */}
          <button
            type="button"
            id="filter-sla-urgent-followup-btn"
            onClick={() => handleFilterSlaChange(activeFilterSla === 'urgent_followup' ? '' : 'urgent_followup')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeFilterSla === 'urgent_followup'
                ? 'bg-orange-600 text-white border-orange-700 shadow-md ring-2 ring-orange-400/40'
                : slaFilterCounts.urgentFollowup > 0
                  ? 'bg-orange-50 text-orange-900 border-orange-300 hover:bg-orange-100 hover:border-orange-400 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Lọc nhanh khách hàng đã tiếp nhận nhưng cần gọi điện hoặc follow-up tương tác gấp theo chính sách SLA"
          >
            <PhoneCall className={`w-3.5 h-3.5 ${activeFilterSla === 'urgent_followup' ? 'text-white' : 'text-orange-600'} ${slaFilterCounts.urgentFollowup > 0 ? 'animate-pulse' : ''}`} />
            <span>Cần follow-up gấp</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeFilterSla === 'urgent_followup'
                ? 'bg-orange-800 text-white'
                : slaFilterCounts.urgentFollowup > 0
                  ? 'bg-orange-200 text-orange-950 ring-1 ring-orange-300'
                  : 'bg-slate-200 text-slate-700'
            }`}>
              {slaFilterCounts.urgentFollowup}
            </span>
          </button>

          {/* Priority SLA Filter: Urgent cases overdue SLA */}
          <button
            type="button"
            id="filter-priority-sla-btn"
            onClick={() => handleFilterSlaChange(activeFilterSla === 'breached' ? '' : 'breached')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              activeFilterSla === 'breached' || filterPriorityOnly
                ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-400/40'
                : slaFilterCounts.breached > 0
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:border-red-400 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Lọc nhanh danh sách khách hàng QUÁ HẠN SLA (nguy cơ bị hệ thống tự động thu hồi!)"
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${activeFilterSla === 'breached' || filterPriorityOnly ? 'text-white' : 'text-red-600'} ${slaFilterCounts.breached > 0 ? 'animate-bounce' : ''}`} />
            <span>Quá hạn SLA</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              activeFilterSla === 'breached' || filterPriorityOnly
                ? 'bg-red-800 text-white'
                : slaFilterCounts.breached > 0
                  ? 'bg-red-200 text-red-950 ring-1 ring-red-300'
                  : 'bg-slate-200 text-slate-700'
            }`}>
              {slaFilterCounts.breached}
            </span>
          </button>

          {/* Quick Warning Filter: Khách quá 3 ngày chưa cập nhật ghi chú */}
          <button
            type="button"
            onClick={() => setFilterNeglectedOnly(!filterNeglectedOnly)}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer border ${
              filterNeglectedOnly
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-400/30'
                : neglectedLeadsCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 hover:border-rose-400'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title="Lọc nhanh danh sách khách hàng có updatedAt quá 3 ngày mà chưa có ghi chú nội bộ mới"
          >
            <AlertCircle className={`w-3.5 h-3.5 ${filterNeglectedOnly ? 'text-white' : 'text-rose-600'} ${neglectedLeadsCount > 0 ? 'animate-bounce' : ''}`} />
            <span>Cần chăm sóc lại (&gt;3 ngày)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-extrabold ${
              filterNeglectedOnly
                ? 'bg-rose-800 text-white'
                : neglectedLeadsCount > 0
                  ? 'bg-rose-200 text-rose-900'
                  : 'bg-slate-200 text-slate-700'
            }`}>
              {neglectedLeadsCount}
            </span>
          </button>

          {/* Priority Level Filter Dropdown */}
          <select
            id="filter-priority-level-select"
            value={filterPriorityLevel}
            onChange={(e) => setFilterPriorityLevel(e.target.value)}
            className={`rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shrink-0 min-w-[130px] max-w-[170px] truncate min-h-[36px] font-medium cursor-pointer transition-colors ${
              filterPriorityLevel
                ? 'bg-rose-50 border-2 border-rose-500 text-rose-900 font-bold shadow-2xs'
                : 'bg-white border border-slate-300 text-slate-800'
            }`}
            title="Lọc khách hàng theo mức độ ưu tiên (Nóng / Ấm / Lạnh)"
          >
            <option value="">🎯 Tất cả ưu tiên ({leads.length})</option>
            <option value="Nóng">🔥 NÓNG ({leads.filter((l) => l.potentialLevel === 'Nóng').length})</option>
            <option value="Ấm">🌤️ ẤM ({leads.filter((l) => l.potentialLevel === 'Ấm').length})</option>
            <option value="Lạnh">❄️ LẠNH ({leads.filter((l) => l.potentialLevel === 'Lạnh').length})</option>
            <option value="unlabeled">🏷️ Chưa gắn ({leads.filter((l) => !l.potentialLevel).length})</option>
          </select>

          {/* SmartLabeling AI Button */}
          <button
            type="button"
            id="btn-smart-labeling-ai"
            onClick={() => setIsSmartLabelModalOpen(true)}
            className="px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 shrink-0 min-h-[36px] cursor-pointer bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white shadow-sm shadow-indigo-600/20 active:scale-95 border border-indigo-400/40"
            title="Tự động phân tích nhu cầu và ghi chú bằng Gemini 3.8 Flash để gắn nhãn Nóng/Ấm/Lạnh"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
            <span>SmartLabeling AI</span>
            {leads.filter((l) => !l.potentialLevel).length > 0 && (
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono font-black border border-white/30">
                {leads.filter((l) => !l.potentialLevel).length} mới
              </span>
            )}
          </button>

          {/* Tag Filter Dropdown */}
          <select
            id="filter-tag-select"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className={`rounded-xl px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none shrink-0 min-w-[130px] max-w-[170px] truncate min-h-[36px] font-medium cursor-pointer transition-colors ${
              filterTag 
                ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 font-bold shadow-2xs' 
                : 'bg-white border border-slate-300 text-slate-800'
            }`}
            title="Lọc khách hàng theo thẻ nhãn phân loại (Hot, Cần tư vấn vay, Đầu tư...)"
          >
            <option value="">🏷️ Tất cả thẻ ({leads.length})</option>
            {availableTags.map((tag) => {
              const meta = getTagMeta(tag);
              const count = leads.filter((l) => Array.isArray(l.tags) && l.tags.some((t) => t.toLowerCase() === tag.toLowerCase())).length;
              return (
                <option key={tag} value={tag}>
                  {meta.icon} {tag} ({count})
                </option>
              );
            })}
          </select>

          {/* Active Tag Filter Chip */}
          {filterTag && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
              <span>Đang lọc: {getTagMeta(filterTag).icon} {filterTag} ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => setFilterTag('')}
                className="p-0.5 hover:bg-amber-200 rounded-full transition-colors text-amber-700"
                title="Bỏ lọc thẻ này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Neglected Only Chip */}
          {filterNeglectedOnly && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Đang lọc: Cần chăm sóc lại ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => setFilterNeglectedOnly(false)}
                className="p-0.5 hover:bg-rose-200 rounded-full transition-colors text-rose-700"
                title="Bỏ lọc cảnh báo này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active SLA Status Filter Chip */}
          {activeFilterSla && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 shadow-2xs ${
              activeFilterSla === 'breached'
                ? 'bg-rose-100 border border-rose-300 text-rose-950 animate-pulse-subtle'
                : activeFilterSla === 'expiring_accept'
                  ? 'bg-amber-100 border border-amber-300 text-amber-950'
                  : activeFilterSla === 'urgent_followup'
                    ? 'bg-orange-100 border border-orange-300 text-orange-950'
                    : activeFilterSla === 'urgent_all'
                      ? 'bg-red-100 border border-red-300 text-red-950 animate-pulse-subtle'
                      : 'bg-emerald-100 border border-emerald-300 text-emerald-950'
            }`}>
              <Clock className={`w-3.5 h-3.5 ${
                activeFilterSla === 'breached' || activeFilterSla === 'urgent_all' ? 'text-red-700' : 'text-amber-700'
              }`} />
              <span>
                Đang lọc SLA: {
                  activeFilterSla === 'urgent_all' ? '⚡ Cần xử lý gấp' :
                  activeFilterSla === 'expiring_accept' ? '⏳ Sắp đến hạn tiếp nhận' :
                  activeFilterSla === 'urgent_followup' ? '📞 Cần follow-up gấp' :
                  activeFilterSla === 'critical' ? '🔥 Sắp hết hạn' :
                  activeFilterSla === 'breached' ? '⚠️ Quá hạn SLA' : '✅ Đã hoàn tất'
                } ({displayedLeads.length})
              </span>
              <button
                type="button"
                onClick={() => handleFilterSlaChange('')}
                className="p-0.5 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
                title="Bỏ lọc SLA này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Product Type Filter Chip */}
          {activeProductType && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
              <Building className="w-3.5 h-3.5 text-emerald-700" />
              <span>Loại SP: {activeProductType} ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => handleProductTypeChange('')}
                className="p-0.5 hover:bg-emerald-200 rounded-full transition-colors text-emerald-800 cursor-pointer"
                title="Bỏ lọc loại sản phẩm này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Priority SLA Filter Chip */}
          {filterPriorityOnly && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-300 text-red-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs animate-pulse-subtle">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Đang lọc: Quá hạn SLA ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => setFilterPriorityOnly(false)}
                className="p-0.5 hover:bg-red-200 rounded-full transition-colors text-red-700"
                title="Bỏ lọc Quá hạn SLA"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Source Filter Chip */}
          {activeSource && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
              <Share2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Nguồn: {getSourceDisplayLabel(activeSource)} ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => handleSourceChange('')}
                className="p-0.5 hover:bg-amber-200 rounded-full transition-colors text-amber-700"
                title="Bỏ lọc nguồn này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Priority Level Filter Chip */}
          {filterPriorityLevel && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs">
              <span>Đang lọc: Ưu tiên {filterPriorityLevel === 'unlabeled' ? 'Chưa gắn nhãn' : filterPriorityLevel} ({displayedLeads.length})</span>
              <button
                type="button"
                onClick={() => setFilterPriorityLevel('')}
                className="p-0.5 hover:bg-rose-200 rounded-full transition-colors text-rose-700"
                title="Bỏ lọc mức ưu tiên này"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {(activeProjects.length > 0 || activeSource || activeProductType || filterAssignee || filterTag || filterPriorityLevel || filterNeglectedOnly || filterPriorityOnly || activeFilterSla || activeDateRange !== 'all') && (
            <button
              onClick={() => {
                handleProjectsChange([]);
                handleSourceChange('');
                handleProductTypeChange('');
                onFilterAssigneeChange('');
                setFilterTag('');
                setFilterPriorityLevel('');
                setFilterNeglectedOnly(false);
                setFilterPriorityOnly(false);
                handleFilterSlaChange('');
                handleRangeChange('all');
                handleCustomStartChange('');
                handleCustomEndChange('');
              }}
              className="text-amber-700 hover:text-amber-900 text-xs font-bold underline px-2 py-1 shrink-0 whitespace-nowrap min-h-[36px] flex items-center cursor-pointer"
            >
              ✕ Đặt lại tất cả
            </button>
          )}
        </div>

        {/* Multi-Select Active Project Filter Chips */}
        {activeProjects.length > 0 && (
          <div className="px-3 sm:px-4 py-1.5 border-t border-slate-100 bg-amber-50/40">
            <ProjectFilterChips
              selectedProjects={activeProjects}
              onRemoveProject={(p) => handleProjectsChange(activeProjects.filter((proj) => proj !== p))}
              onClearAll={() => handleProjectsChange([])}
              leads={unfilteredLeadsForDateCounts || leads}
            />
          </div>
        )}
      </div>

      {/* Automated SLA Urgent Notification Banner */}
      {urgentPriorityLeadsCount > 0 && (
        <div className="mx-3 sm:mx-4 mt-3 mb-1 p-3 bg-red-50/95 border-2 border-red-500 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-600 text-white rounded-lg shadow-2xs shrink-0">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-red-950 uppercase tracking-wide">
                  Cảnh báo tự động: Có {urgentPriorityLeadsCount} khách hàng chưa liên hệ quá hạn SLA (2 giờ)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-950 font-extrabold text-[10px] animate-pulse">
                  Gắn viền đỏ khẩn cấp
                </span>
              </div>
              <p className="text-[11px] text-red-700 font-medium mt-0.5">
                Các khách hàng chưa được gọi hoặc ghi nhận tương tác sau 2 giờ giao việc. Nhấn nút bên cạnh để lọc nhanh danh sách cần xử lý gấp.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterPriorityOnly(!filterPriorityOnly)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              filterPriorityOnly
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{filterPriorityOnly ? 'Đang lọc Quá hạn SLA (Xem tất cả)' : `Lọc xem ${urgentPriorityLeadsCount} khách quá hạn SLA`}</span>
          </button>
        </div>
      )}

      {/* MOBILE CARD VIEW (Optimized for phone & portrait tablet) */}
      <div className={`p-3 space-y-3.5 ${mobileViewMode === 'cards' ? 'block md:hidden' : 'hidden'}`}>
        {displayedLeads.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="text-sm font-semibold text-slate-700">Không tìm thấy khách hàng nào</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc thêm lead mới.</p>
          </div>
        ) : (
          displayedLeads.map((lead, idx) => {
            const badge = getStatusBadgeColor(lead.status);
            const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser?.name);
            const isSelected = selectedLeadIds.includes(lead.id);
            const neglectWarning = checkLeadNeglectWarning(lead, nowTime);
            const slaContactWarning = checkLeadSlaContactWarning(lead, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);
            const isUpdated = isRowStatusUpdated(lead.id);

            return (
              <div
                key={`card-${lead.id}`}
                onClick={() => onSelectLead(lead)}
                className={`p-4 sm:p-5 rounded-2xl transition-all duration-300 cursor-pointer relative shadow-xs ${
                  isUpdated
                    ? 'animate-card-status-update bg-emerald-50/90 border-2 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                    : isSelected 
                      ? 'border-2 border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20' 
                      : slaContactWarning.isOverdue
                        ? 'border-2 border-red-500 bg-red-50/75 hover:bg-red-50/95 shadow-md ring-2 ring-red-400/40'
                        : neglectWarning.isNeglected
                          ? 'border-2 border-rose-400/90 bg-rose-50/40 hover:bg-rose-50/70 shadow-sm ring-1 ring-rose-300/40'
                          : roleInfo.isTpkd
                            ? 'border border-purple-200 bg-purple-50/20 hover:border-purple-300'
                            : 'border border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Status Update Banner on Mobile Card */}
                {isUpdated && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-emerald-100/95 border border-emerald-400 text-emerald-950 flex items-center justify-between text-xs sm:text-sm font-bold shadow-2xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Trạng thái vừa cập nhật thành công!</span>
                    </div>
                    <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded font-extrabold shadow-2xs">
                      {lead.status}
                    </span>
                  </div>
                )}

                {/* Red Overdue Warning Banner for SLA Overdue Leads */}
                {slaContactWarning.isOverdue && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-red-100 border border-red-400 text-red-950 flex items-center justify-between text-xs sm:text-sm font-bold shadow-2xs animate-pulse-subtle">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 animate-bounce" />
                      <span className="truncate">Ưu tiên SLA: {slaContactWarning.message}</span>
                    </div>
                    <span className="text-[11px] bg-red-600 text-white px-2 py-0.5 rounded font-extrabold shrink-0 shadow-2xs uppercase">
                      {slaContactWarning.timeText}
                    </span>
                  </div>
                )}

                {/* Red Overdue Warning Banner for Neglected Leads */}
                {!slaContactWarning.isOverdue && neglectWarning.isNeglected && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-rose-100/90 border border-rose-300/80 text-rose-900 flex items-center justify-between text-xs sm:text-sm font-bold shadow-2xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
                      <span className="truncate">Cảnh báo: {neglectWarning.message}</span>
                    </div>
                    <span className="text-[11px] bg-rose-200 text-rose-950 px-2 py-0.5 rounded font-extrabold shrink-0">
                      Cần chăm sóc ngay
                    </span>
                  </div>
                )}

                {/* Card Top: Checkbox, STT, Date & Status Dropdown */}
                <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center space-x-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelectLead(lead.id)}
                      className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold font-mono text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formatDateVN(lead.date)}
                    </span>
                    {isLeadCreatedToday(lead) && (
                      <span className="inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                        <Sparkles className="w-3 h-3 mr-0.5 text-amber-600" />
                        Mới về
                      </span>
                    )}
                  </div>

                  {/* Status Dropdown with touch-friendly height */}
                  <div className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChangeWithFeedback(lead.id, e.target.value as LeadStatus)}
                      className={`appearance-none text-xs sm:text-sm font-bold min-h-[38px] px-3 py-1.5 pr-7 rounded-xl border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-2xs ${badge.bg} ${badge.text} ${badge.border} ${
                        isUpdated ? 'ring-2 ring-emerald-500 scale-105 shadow-xs' : ''
                      }`}
                    >
                      {LEAD_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                      {lead.status && !LEAD_STATUSES.includes(lead.status as any) && (
                        <option value={lead.status}>{lead.status}</option>
                      )}
                    </select>
                    <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${badge.text}`} />
                    {isUpdated && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-fadeIn" />
                    )}
                  </div>
                </div>

                {/* Card Body: Name, Role Pill, Budget, Phone */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 leading-snug">
                        {lead.fullName}
                      </h3>
                      <SmartLabelBadge
                        lead={lead}
                        onUpdateLead={onUpdateLead}
                        onTriggerSingleAiLabel={handleSingleAiLabel}
                        size="md"
                      />
                      <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                        {roleInfo.badgeLabel}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1.5">
                      <span className="font-mono text-sm sm:text-base text-slate-900 font-bold tracking-tight">{lead.phone}</span>
                      <button
                        onClick={(e) => handleCopyPhone(lead.phone, e)}
                        title="Sao chép SĐT"
                        className="min-h-[34px] min-w-[34px] p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                      >
                        {copiedPhone === lead.phone ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openGooglePhoneSearch(lead.phone);
                        }}
                        title="Tra cứu danh tính số điện thoại này trên Google"
                        className="min-h-[34px] px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Search className="w-3 h-3 text-amber-600" />
                        <span>Google</span>
                      </button>
                    </div>
                  </div>

                  {lead.budget && (
                    <span className="text-xs sm:text-sm font-black text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
                      {lead.budget}
                    </span>
                  )}
                </div>

                {/* Card Tags Row */}
                <div className="flex items-center flex-wrap gap-1.5 mb-2.5" onClick={(e) => e.stopPropagation()}>
                  {Array.isArray(lead.tags) && lead.tags.map((tag) => (
                    <LeadTagBadge
                      key={tag}
                      tag={tag}
                      size="sm"
                      onRemove={onUpdateLead ? (t) => {
                        const updated = removeTagFromLead(lead, t);
                        onUpdateLead(updated);
                      } : undefined}
                      onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                    />
                  ))}
                  {onUpdateLead && (
                    <LeadTagPicker
                      lead={lead}
                      onUpdateLead={onUpdateLead}
                      allLeads={leads}
                      showIconOnly={Array.isArray(lead.tags) && lead.tags.length > 0}
                    />
                  )}
                </div>

                {/* Card Project & Details */}
                <div className="bg-slate-50/90 rounded-xl p-3 text-xs sm:text-sm text-slate-700 space-y-2 mb-2.5 border border-slate-200/80">
                  <div className="flex items-center justify-between gap-1 font-medium">
                    <span className="text-slate-900 font-bold text-sm truncate">{lead.project}</span>
                    <span className="text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md font-semibold text-xs shrink-0">{lead.productType}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200/70">
                    <span className="truncate">Nguồn: <strong className="text-slate-900">{lead.dataSource}</strong></span>
                    <span className="shrink-0 flex items-center gap-1 text-[11px] text-slate-500" title={`Cập nhật: ${formatFullDateTimeVN(getLeadUpdateDate(lead))}`}>
                      <RefreshCw className="w-3 h-3 text-slate-400" />
                      <span>{formatRelativeTimeVN(getLeadUpdateDate(lead))}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                    <span className="shrink-0 flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Phụ trách:</span>
                      <strong className={roleInfo.isTpkd ? 'text-purple-950 font-bold' : 'text-slate-900 font-bold'}>
                        {lead.assignee}
                      </strong>
                    </span>
                    {lead.zaloConnected && (
                      <span className="text-[11px] text-teal-800 bg-teal-50 border border-teal-300 px-1.5 py-0.2 rounded font-extrabold">
                        Zalo KPI ✓
                      </span>
                    )}
                  </div>

                  {/* Real-time SLA Countdown strip on mobile card */}
                  {(() => {
                    const sla = getLeadSlaInfo(lead, distributionPolicy, nowTime);
                    return (
                      <div className={`p-2.5 rounded-xl border text-xs sm:text-sm mb-1 transition-all ${sla.badgeClasses.bg} ${sla.badgeClasses.border}`} title={sla.tooltip}>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="relative flex h-2.5 w-2.5 shrink-0">
                              {sla.badgeClasses.pulse && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sla.badgeClasses.indicator}`} />
                              )}
                              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sla.badgeClasses.indicator}`} />
                            </span>
                            <div className="min-w-0">
                              <span className={`font-mono font-bold text-xs sm:text-sm ${sla.badgeClasses.text}`}>
                                {sla.countdownText}
                              </span>
                              <span className="text-[11px] text-slate-600 ml-1.5 font-medium">
                                • {sla.subText}
                              </span>
                            </div>
                          </div>

                          {onAcceptLead && !lead.acceptedAt && sla.status !== 'unassigned' && sla.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAcceptLead(lead.id);
                              }}
                              className="px-2.5 py-1 min-h-[34px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-lg shadow-2xs text-xs shrink-0 cursor-pointer"
                            >
                              Tiếp nhận ngay
                            </button>
                          )}
                        </div>

                        {/* Progress Bar for active countdown */}
                        {(sla.status === 'needs_accept' || sla.status === 'needs_interaction' || sla.status === 'critical') && (
                          <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                sla.isUrgent ? 'bg-rose-500' : sla.status === 'needs_accept' ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${sla.progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Notes & Quick Note */}
                <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
                  {editingNoteLeadId === lead.id ? (
                    <div className="flex flex-col gap-2 bg-white p-3 rounded-xl border-2 border-amber-500 shadow-md">
                      <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-amber-600" />
                          <span>Ghi chú nhanh cho {lead.fullName}</span>
                        </span>
                      </div>
                      <textarea
                        autoFocus
                        rows={2}
                        value={quickNoteText}
                        onChange={(e) => setQuickNoteText(e.target.value)}
                        placeholder="Nhập ghi chú nhanh: Đã gọi khách, khách hẹn cuối tuần xem nhà..."
                        className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 bg-amber-50/20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveQuickNote(lead, e);
                          }
                        }}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingNoteLeadId(null)}
                          className="px-3 py-1.5 min-h-[38px] text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                        >
                          Huỷ
                        </button>
                        <button
                          type="button"
                          disabled={!quickNoteText.trim()}
                          onClick={(e) => handleSaveQuickNote(lead, e)}
                          className="px-4 py-1.5 min-h-[38px] text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-40 cursor-pointer active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>Lưu ghi chú</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {lead.notes && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic line-clamp-2 mb-2 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                          "{lead.notes}"
                        </p>
                      )}
                      {onUpdateLead && (
                        <button
                          type="button"
                          onClick={(e) => handleStartQuickNote(lead, e)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 min-h-[34px] rounded-lg transition-all active:scale-95 shadow-2xs cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                          <span>+ Ghi chú nhanh</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Callback Reminder Banner */}
                {lead.callbackReminder && lead.callbackReminder.status === 'pending' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectLead(lead);
                    }}
                    className={`inline-flex items-center gap-2 text-xs sm:text-sm font-bold min-h-[42px] px-3 py-2 rounded-xl border cursor-pointer mb-2 transition-all active:scale-98 w-full shadow-2xs ${
                      formatCallbackReminderBadge(lead.callbackReminder).badgeClass
                    }`}
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                    <span className="font-extrabold text-emerald-950">Hẹn gọi lại:</span>
                    <span>{formatCallbackReminderBadge(lead.callbackReminder).text}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-normal truncate">{lead.callbackReminder.notes}</span>
                  </div>
                )}

                {/* Active Zalo Reminder Banner */}
                {lead.zaloReminder && lead.zaloReminder.status === 'pending' && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenZaloReminder && onOpenZaloReminder(lead);
                    }}
                    className={`inline-flex items-center gap-2 text-xs sm:text-sm font-bold min-h-[42px] px-3 py-2 rounded-xl border cursor-pointer mb-2.5 transition-all active:scale-98 w-full shadow-2xs ${
                      formatZaloReminderBadge(lead.zaloReminder).badgeClass
                    }`}
                  >
                    <Bell className="w-4 h-4 text-blue-600 shrink-0 animate-wiggle" />
                    <span className="font-extrabold text-blue-900">Nhắc Zalo:</span>
                    <span>{formatZaloReminderBadge(lead.zaloReminder).text}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-normal truncate">{lead.zaloReminder.notes}</span>
                  </div>
                )}

                {/* Card Action Buttons: Ergonomic 2-row layout for Mobile & Tablet */}
                <div className="pt-2.5 border-t border-slate-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {/* Row 1: Primary Communication & Booking (Full width touch targets) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCall(lead.phone, e)}
                      className="min-h-[46px] inline-flex items-center justify-center py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                      title="Gọi điện thoại trực tiếp"
                    >
                      <Phone className="w-4 h-4 mr-1.5 shrink-0" />
                      <span>Gọi điện</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleOpenZalo(lead.phone, e)}
                      className="min-h-[46px] inline-flex items-center justify-center py-2.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                      title="Mở Zalo nhắn tin cho khách"
                    >
                      <MessageSquare className="w-4 h-4 mr-1.5 shrink-0" />
                      <span>Nhắn Zalo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onScheduleAppointment(lead)}
                      title="Lên lịch hẹn xem nhà / sa bàn BĐS"
                      className="min-h-[46px] inline-flex items-center justify-center py-2.5 px-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 mr-1.5 shrink-0" />
                      <span>Lịch hẹn</span>
                    </button>
                  </div>

                  {/* Row 2: Secondary Quick Actions & Utilities */}
                  <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {/* Nhắc hẹn Zalo */}
                    <button
                      type="button"
                      onClick={() => onOpenZaloReminder && onOpenZaloReminder(lead)}
                      title="Đặt giờ nhắc hẹn Zalo (Thông báo đẩy)"
                      className={`flex-1 min-h-[42px] px-2.5 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all relative cursor-pointer ${
                        lead.zaloReminder && lead.zaloReminder.status === 'pending'
                          ? 'text-blue-800 bg-blue-100 border border-blue-300 font-bold'
                          : 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Bell className="w-4 h-4 shrink-0" />
                      <span className="text-xs">Nhắc Zalo</span>
                      {lead.zaloReminder && lead.zaloReminder.status === 'pending' && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-ping shrink-0" />
                      )}
                    </button>

                    {/* Mẫu kịch bản */}
                    <button
                      type="button"
                      onClick={() => onOpenMessageModal(lead)}
                      title="Mẫu kịch bản SMS / Zalo"
                      className="flex-1 min-h-[42px] px-2.5 flex items-center justify-center gap-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-95 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Mẫu tin</span>
                    </button>

                    {/* Chuyển lead */}
                    {onTransferLead && (
                      <button
                        type="button"
                        onClick={() => onTransferLead([lead])}
                        title="Chuyển giao cho Sale khác"
                        className="flex-1 min-h-[42px] px-2.5 flex items-center justify-center gap-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        <ArrowRightLeft className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Chuyển</span>
                      </button>
                    )}

                    {/* Chat nội bộ */}
                    {onOpenInternalChat && (
                      <button
                        type="button"
                        onClick={() => onOpenInternalChat(lead.id)}
                        title="Chat nội bộ TPKD & NVKD về khách này"
                        className="flex-1 min-h-[42px] px-2.5 flex items-center justify-center gap-1.5 text-amber-900 bg-amber-50/80 hover:bg-amber-100 active:scale-95 border border-amber-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                      >
                        <MessageSquareText className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Chat</span>
                      </button>
                    )}

                    {/* Xóa lead (Admin) */}
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => onDeleteLead(lead.id)}
                        title="Xoá khách hàng (Chỉ Quản trị viên)"
                        className="w-11 min-h-[42px] flex items-center justify-center text-rose-600 hover:bg-rose-50 active:scale-95 border border-rose-200 rounded-xl transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FULL SPREADSHEET TABLE (Desktop, Tablet, or when toggled to table mode on mobile) */}
      <div className={`overflow-x-auto touch-scroll ${mobileViewMode === 'cards' ? 'hidden md:block' : 'block'}`}>
        {/* Swipe hint on mobile when table is active */}
        <div className="md:hidden px-3.5 py-2 bg-gradient-to-r from-amber-50 to-amber-100/70 text-amber-950 text-xs font-bold border-b border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
          <span>👈 <strong>Mẹo:</strong> Cột họ tên &amp; thao tác được ghim cố định. Bạn có thể vuốt ngang thoải mái để xem đủ dữ liệu CRM 👉</span>
        </div>

        <table className="w-full text-left text-xs border-collapse min-w-[1120px]">
          <thead>
            <tr className="bg-slate-100/95 text-slate-700 border-b border-slate-200 uppercase tracking-wider font-bold select-none text-[11px] whitespace-nowrap">
              <th className="py-3 px-3 w-11 text-center whitespace-nowrap sticky left-0 z-20 bg-slate-100 border-r border-slate-200">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAllLeads}
                  className="w-4.5 h-4.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-2 w-12 text-center whitespace-nowrap sticky left-11 z-20 bg-slate-100 border-r border-slate-200 font-mono">
                STT
              </th>
              <th className="py-3 px-3 min-w-[175px] whitespace-nowrap sticky left-[92px] z-20 bg-slate-100 border-r border-slate-200 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                Họ và tên
              </th>
              <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Điện thoại</th>
              <th className="py-3 px-3 min-w-[130px] whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode((prev) =>
                      prev === 'created_desc' ? 'updated_desc' : prev === 'updated_desc' ? 'default' : 'created_desc'
                    );
                  }}
                  className="flex items-center gap-1 font-bold text-slate-700 hover:text-amber-700 uppercase tracking-wider text-[11px] cursor-pointer transition-colors"
                  title="Bấm để đổi sắp xếp: Mới tạo/đẩy về -> Vừa cập nhật -> Mặc định"
                >
                  <span>Thời gian</span>
                  {sortMode === 'created_desc' ? (
                    <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-extrabold flex items-center">⚡ Mới về ↓</span>
                  ) : sortMode === 'updated_desc' ? (
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-extrabold flex items-center">🔄 Cập nhật ↓</span>
                  ) : (
                    <ArrowDownUp className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 min-w-[155px] whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setSortMode((prev) => (prev === 'sla_urgent' ? 'default' : 'sla_urgent'));
                  }}
                  className="flex items-center gap-1 font-bold text-slate-700 hover:text-amber-700 uppercase tracking-wider text-[11px] cursor-pointer transition-colors"
                  title="Sắp xếp theo hạn SLA đếm ngược: Khách sắp bị thu hồi / quá hạn sẽ được ưu tiên lên đầu"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Thời hạn SLA</span>
                  {sortMode === 'sla_urgent' ? (
                    <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-extrabold flex items-center shadow-2xs">
                      ⏳ Gấp nhất ↓
                    </span>
                  ) : (
                    <ArrowDownUp className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>Ưu tiên AI</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[170px] whitespace-nowrap">
                <div className="flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Thẻ phân loại</span>
                </div>
              </th>
              <th className="py-3 px-3 min-w-[135px] whitespace-nowrap">Tệp dữ liệu</th>
              <th className="py-3 px-3 min-w-[135px] whitespace-nowrap">Loại sản phẩm</th>
              <th className="py-3 px-3 min-w-[140px] whitespace-nowrap">Tình trạng</th>
              <th className="py-3 px-3 min-w-[145px] whitespace-nowrap">Dự án</th>
              <th className="py-3 px-3 min-w-[145px] whitespace-nowrap">Người phụ trách</th>
              <th className="py-3 px-3 min-w-[180px] whitespace-nowrap">Ghi chú</th>
              <th className="py-3 px-3 min-w-[125px] text-center sticky right-0 z-20 bg-slate-100 border-l border-slate-200 backdrop-blur-xs whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedLeads.length === 0 ? (
              <tr>
                <td colSpan={15} className="py-12 text-center text-slate-400">
                  <div className="max-w-sm mx-auto space-y-1">
                    <p className="text-sm font-semibold text-slate-600">Không tìm thấy khách hàng nào</p>
                    <p className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc thêm lead mới vào hệ thống.</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedLeads.map((lead, idx) => {
                const badge = getStatusBadgeColor(lead.status);
                const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser?.name);
                const isSelected = selectedLeadIds.includes(lead.id);
                const neglectWarning = checkLeadNeglectWarning(lead, nowTime);
                const slaContactWarning = checkLeadSlaContactWarning(lead, DEFAULT_SLA_CONTACT_WINDOW_HOURS, nowTime);
                const isUpdated = isRowStatusUpdated(lead.id);

                const stickyBg = isUpdated
                  ? 'bg-emerald-50'
                  : isSelected 
                    ? 'bg-amber-50' 
                    : slaContactWarning.isOverdue
                      ? 'bg-red-50'
                      : neglectWarning.isNeglected
                        ? 'bg-rose-50'
                        : roleInfo.isTpkd
                          ? 'bg-purple-50/25'
                          : 'bg-white group-hover:bg-slate-50';

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    className={`cursor-pointer transition-all duration-500 group relative ${
                      isUpdated
                        ? 'animate-row-status-update bg-emerald-50/90 text-emerald-950 font-medium'
                        : isSelected 
                          ? 'bg-amber-50/50' 
                          : slaContactWarning.isOverdue
                            ? 'bg-red-50/80 hover:bg-red-100/95 shadow-[inset_4px_0_0_0_#dc2626,inset_0_2px_0_0_#ef4444,inset_0_-2px_0_0_#ef4444] border-y-2 border-red-500 font-medium'
                            : neglectWarning.isNeglected
                              ? 'bg-rose-50/60 hover:bg-rose-100/70 border-l-4 border-l-rose-500'
                              : roleInfo.isTpkd
                                ? 'bg-purple-50/15 hover:bg-purple-50/50'
                                : 'hover:bg-slate-50/90'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className={`py-2.5 px-3 text-center sticky left-0 z-10 border-r border-slate-200/80 transition-colors ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectLead(lead.id)}
                        className="w-4.5 h-4.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>

                    {/* STT */}
                    <td className={`py-2.5 px-2 text-center font-mono text-[11px] whitespace-nowrap sticky left-11 z-10 border-r border-slate-200/80 transition-colors ${stickyBg}`}>
                      <div className="flex items-center justify-center gap-1">
                        {isUpdated && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" title="Trạng thái vừa cập nhật" />
                        )}
                        <span className={isUpdated ? 'text-emerald-800 font-bold' : 'text-slate-400'}>
                          {idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Họ và tên (Sticky Column 3) */}
                    <td className={`py-2.5 px-3 sticky left-[92px] z-10 border-r border-slate-200/80 shadow-[4px_0_6px_-2px_rgba(0,0,0,0.06)] transition-colors ${stickyBg}`}>
                      <div className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors flex items-center flex-wrap gap-1.5">
                        <span className="text-xs sm:text-sm font-extrabold">{lead.fullName}</span>
                        {slaContactWarning.isOverdue && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-red-100 text-red-950 border border-red-400 shadow-2xs animate-pulse"
                            title={`Cảnh báo SLA: Chưa liên hệ sau 2 giờ (${slaContactWarning.timeText}). Cần gọi điện hoặc tương tác ngay!`}
                          >
                            <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                            Quá hạn SLA ({slaContactWarning.timeText})
                          </span>
                        )}
                        <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                          {roleInfo.badgeLabel}
                        </span>
                        {lead.zaloConnected && (
                          <span className="text-[10px] text-teal-700 bg-teal-50 border border-teal-200 px-1 py-0.2 rounded font-bold" title="Đã kết nối Zalo (Chỉ tiêu KPI ngày)">
                            Zalo ✓
                          </span>
                        )}
                        {lead.callbackReminder && lead.callbackReminder.status === 'pending' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead);
                            }}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border cursor-pointer hover:opacity-90 transition-all ${
                              formatCallbackReminderBadge(lead.callbackReminder).badgeClass
                            }`}
                            title={`Lịch hẹn gọi lại: ${lead.callbackReminder.notes} - Bấm để xem`}
                          >
                            <PhoneCall className="w-2.5 h-2.5 shrink-0 animate-bounce text-emerald-600" />
                            <span>{formatCallbackReminderBadge(lead.callbackReminder).text}</span>
                          </button>
                        )}
                        {lead.zaloReminder && lead.zaloReminder.status === 'pending' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenZaloReminder && onOpenZaloReminder(lead);
                            }}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded border cursor-pointer hover:opacity-90 transition-all ${
                              formatZaloReminderBadge(lead.zaloReminder).badgeClass
                            }`}
                            title={`Lịch hẹn Zalo: ${lead.zaloReminder.notes} - Bấm để chỉnh sửa`}
                          >
                            <Bell className="w-2.5 h-2.5 shrink-0 animate-wiggle" />
                            <span>{formatZaloReminderBadge(lead.zaloReminder).text}</span>
                          </button>
                        )}
                      </div>
                      {lead.budget && (
                        <div className="text-[10px] text-amber-700 font-bold bg-amber-50 inline-block px-1.5 py-0.2 rounded border border-amber-100 mt-0.5">
                          TC: {lead.budget}
                        </div>
                      )}
                    </td>

                    {/* Điện thoại */}
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openGooglePhoneSearch(lead.phone)}
                          title="Bấm để tra cứu số điện thoại này trên Google (Xem danh tính, công ty, Zalo, mạng xã hội)"
                          className="font-mono text-slate-900 font-bold hover:text-amber-600 hover:underline transition-colors flex items-center space-x-1 text-left group/phone text-xs sm:text-sm"
                        >
                          <span>{lead.phone}</span>
                          <span className="opacity-60 group-hover/phone:opacity-100 p-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] flex items-center gap-0.5">
                            <Search className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-semibold hidden md:inline">Google</span>
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleCopyPhone(lead.phone, e)}
                          title="Sao chép số điện thoại"
                          className="min-h-[32px] min-w-[32px] p-1 text-slate-400 hover:text-slate-700 rounded transition-colors flex items-center justify-center cursor-pointer"
                        >
                          {copiedPhone === lead.phone ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Thời gian: Ngày tạo & Cập nhật gần nhất */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-bold text-xs">
                            {formatDateVN(lead.date)}
                          </span>
                          {isLeadCreatedToday(lead) && (
                            <span
                              className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                              title={`Khách vừa được đẩy về hệ thống hôm nay (${formatFullDateTimeVN(getLeadCreationDate(lead))})`}
                            >
                              <Sparkles className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                              Mới về
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                            neglectWarning.isNeglected ? 'text-rose-700 font-bold' : 'text-slate-500'
                          }`}
                          title={`Cập nhật gần nhất: ${formatFullDateTimeVN(getLeadUpdateDate(lead))}`}
                        >
                          <RefreshCw className={`w-2.5 h-2.5 shrink-0 ${neglectWarning.isNeglected ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className="truncate max-w-[125px]">
                            {formatRelativeTimeVN(getLeadUpdateDate(lead))}
                          </span>
                        </div>
                        {neglectWarning.isNeglected && (
                          <div className="mt-1">
                            <span 
                              className="inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs"
                              title="Khách hàng có ngày cập nhật quá 3 ngày mà chưa ghi chú nội bộ mới. Cần chăm sóc ngay!"
                            >
                              <AlertCircle className="w-2.5 h-2.5 text-rose-600 animate-bounce" />
                              &gt;3 ngày chưa note
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Thời hạn SLA: Đếm ngược thời gian còn lại trước khi thu hồi */}
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const sla = getLeadSlaInfo(lead, distributionPolicy, nowTime);
                        return (
                          <div className="flex flex-col min-w-[145px]" title={sla.tooltip}>
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border transition-colors ${sla.badgeClasses.bg} ${sla.badgeClasses.text} ${sla.badgeClasses.border}`}
                              >
                                <span className="relative flex h-2 w-2 mr-1.5 shrink-0">
                                  {sla.badgeClasses.pulse && (
                                    <span
                                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sla.badgeClasses.indicator}`}
                                    />
                                  )}
                                  <span
                                    className={`relative inline-flex rounded-full h-2 w-2 ${sla.badgeClasses.indicator}`}
                                  />
                                </span>
                                {sla.countdownText}
                              </span>

                              {/* Quick Accept button if lead is waiting for acceptance */}
                              {onAcceptLead && !lead.acceptedAt && sla.status !== 'unassigned' && sla.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => onAcceptLead(lead.id)}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-transform active:scale-95 shrink-0"
                                  title="Bấm tiếp nhận ngay để bắt đầu chăm sóc khách"
                                >
                                  Nhận ngay
                                </button>
                              )}
                            </div>

                            {/* Subtext and mini progress bar */}
                            <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                              <span className="truncate max-w-[130px]">
                                {sla.subText}
                              </span>
                            </div>

                            {/* Overdue SLA Contact Indicator */}
                            {slaContactWarning.isOverdue && (
                              <div className="text-[10px] text-red-700 font-extrabold flex items-center gap-1 mt-0.5 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 text-red-600 shrink-0" />
                                <span>Chưa liên hệ ({slaContactWarning.timeText})</span>
                              </div>
                            )}

                            {/* Mini elapsed bar for active countdowns */}
                            {(sla.status === 'needs_accept' || sla.status === 'needs_interaction' || sla.status === 'critical') && (
                              <div className="w-full bg-slate-200/80 rounded-full h-1 mt-1 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    sla.isUrgent ? 'bg-rose-500' : sla.status === 'needs_accept' ? 'bg-amber-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${sla.progressPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>

                    {/* Điện thoại */}
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openGooglePhoneSearch(lead.phone)}
                          title="Bấm để tra cứu số điện thoại này trên Google (Xem danh tính, công ty, Zalo, mạng xã hội)"
                          className="font-mono text-slate-900 font-bold hover:text-amber-600 hover:underline transition-colors flex items-center space-x-1 text-left group/phone"
                        >
                          <span>{lead.phone}</span>
                          <span className="opacity-60 group-hover/phone:opacity-100 p-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] flex items-center gap-0.5">
                            <Search className="w-2.5 h-2.5" />
                            <span className="text-[9px] font-semibold hidden md:inline">Google</span>
                          </span>
                        </button>
                        <button
                          onClick={(e) => handleCopyPhone(lead.phone, e)}
                          title="Sao chép số điện thoại"
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                        >
                          {copiedPhone === lead.phone ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Mức ưu tiên (SmartLabeling AI) */}
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <SmartLabelBadge
                        lead={lead}
                        onUpdateLead={onUpdateLead}
                        onTriggerSingleAiLabel={handleSingleAiLabel}
                        size="md"
                      />
                    </td>

                    {/* Thẻ phân loại (Tags) */}
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center flex-wrap gap-1 min-w-[150px]">
                        {Array.isArray(lead.tags) && lead.tags.map((tag) => (
                          <LeadTagBadge
                            key={tag}
                            tag={tag}
                            size="sm"
                            onRemove={onUpdateLead ? (t) => {
                              const updated = removeTagFromLead(lead, t);
                              onUpdateLead(updated);
                            } : undefined}
                            onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                          />
                        ))}
                        {onUpdateLead && (
                          <LeadTagPicker
                            lead={lead}
                            onUpdateLead={onUpdateLead}
                            allLeads={leads}
                            showIconOnly={Array.isArray(lead.tags) && lead.tags.length > 0}
                          />
                        )}
                      </div>
                    </td>

                    {/* Tệp dữ liệu */}
                    <td className="py-2.5 px-3">
                      {lead.campaignCode === 'MAY_MH5.19' || lead.dataSource.includes('MAY_MH5') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] font-bold max-w-[150px] truncate shadow-2xs" title={lead.dataSource}>
                          🎯 {lead.dataSource}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium max-w-[140px] truncate" title={lead.dataSource}>
                          {lead.dataSource}
                        </span>
                      )}
                      {lead.callStatus && (
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          📞 {lead.callStatus}
                        </div>
                      )}
                    </td>

                    {/* Loại sản phẩm */}
                    <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                      {lead.productType}
                    </td>

                    {/* Tình trạng (Editable dropdown) */}
                    <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center gap-1.5">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChangeWithFeedback(lead.id, e.target.value as LeadStatus)}
                          className={`appearance-none text-xs font-bold px-2.5 py-1 pr-6 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${badge.bg} ${badge.text} ${badge.border} ${
                            isUpdated ? 'ring-2 ring-emerald-500 scale-105 shadow-xs' : ''
                          }`}
                        >
                          {LEAD_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                          {lead.status && !LEAD_STATUSES.includes(lead.status as any) && (
                            <option value={lead.status}>{lead.status}</option>
                          )}
                        </select>
                        <ChevronDown className={`w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${badge.text}`} />
                        {isUpdated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black text-emerald-800 bg-emerald-100/95 border border-emerald-300 rounded-md shadow-2xs animate-fadeIn">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 animate-pulse" />
                            <span>Vừa đổi</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Dự án */}
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div className="max-w-[150px] truncate" title={lead.project}>
                        {lead.project}
                      </div>
                    </td>

                    {/* Người phụ trách */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            roleInfo.isTpkd 
                              ? 'bg-purple-700 text-white shadow-2xs ring-1 ring-purple-300' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {roleInfo.isTpkd ? '👑' : lead.assignee.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-xs ${roleInfo.isTpkd ? 'text-purple-950 font-bold' : 'text-slate-800 font-medium'}`}>
                              {lead.assignee}
                            </span>
                          </div>
                        </div>
                        {/* SLA badge status */}
                        <div className="flex items-center space-x-1">
                          <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                            {roleInfo.isTpkd ? '👑 TPKD' : '💼 NVKD'}
                          </span>
                          {lead.acceptedAt ? (
                            <span className="inline-flex items-center text-[10px] text-emerald-700 font-medium">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                              Đã nhận
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded border border-amber-200">
                              <Clock className="w-2.5 h-2.5 mr-0.5 text-amber-600 animate-pulse" />
                              Chưa nhận
                            </span>
                          )}
                          {lead.reassignedCount ? (
                            <span className="text-[9px] text-rose-700 font-bold bg-rose-50 px-1 rounded border border-rose-200" title={`Đã thu hồi & chuyển ${lead.reassignedCount} lần`}>
                              Chuyển x{lead.reassignedCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* Ghi chú & Quick Note */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs" onClick={(e) => e.stopPropagation()}>
                      {neglectWarning.isNeglected && (
                        <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/90 border border-rose-300 px-1.5 py-0.5 rounded shadow-2xs">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0 animate-pulse" />
                          <span className="truncate">Quá 3 ngày chưa ghi chú mới ({neglectWarning.message})</span>
                        </div>
                      )}

                      {editingNoteLeadId === lead.id ? (
                        <div className="flex flex-col gap-1.5 bg-white p-2 rounded-xl border-2 border-amber-500 shadow-md">
                          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                            <span className="flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-amber-600" />
                              <span>Ghi chú nhanh cho {lead.fullName}</span>
                            </span>
                          </div>
                          <textarea
                            autoFocus
                            rows={2}
                            value={quickNoteText}
                            onChange={(e) => setQuickNoteText(e.target.value)}
                            placeholder="Nhập ghi chú nhanh (VD: Đã hẹn mai xem nhà, gọi lại sau 15h...)"
                            className="w-full text-xs p-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 bg-amber-50/20"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveQuickNote(lead, e);
                              } else if (e.key === 'Escape') {
                                setEditingNoteLeadId(null);
                              }
                            }}
                          />
                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Enter lưu • Esc huỷ</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingNoteLeadId(null)}
                                className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                              >
                                Huỷ
                              </button>
                              <button
                                type="button"
                                disabled={!quickNoteText.trim()}
                                onClick={(e) => handleSaveQuickNote(lead, e)}
                                className="px-2.5 py-0.5 text-[11px] rounded bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1 shadow-2xs disabled:opacity-40"
                              >
                                <Check className="w-3 h-3" />
                                <span>Lưu</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="line-clamp-2 text-xs text-slate-700" title={lead.notes}>
                            {lead.notes || <span className="text-slate-300 italic">Chưa có ghi chú</span>}
                          </p>
                          {onUpdateLead && (
                            <button
                              type="button"
                              onClick={(e) => handleStartQuickNote(lead, e)}
                              title="Thêm ghi chú nhanh trực tiếp không cần mở modal chi tiết"
                              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded transition-all active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <Edit3 className="w-2.5 h-2.5 text-amber-600" />
                              <span>+ Ghi chú nhanh</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Thao tác (Quick actions) */}
                    <td className={`py-2.5 px-3 text-center sticky right-0 z-10 border-l border-slate-200/80 shadow-[-3px_0_6px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center space-x-1">
                        {/* Quick Accept Lead button */}
                        {!lead.acceptedAt && onAcceptLead && (
                          <button
                            onClick={() => onAcceptLead(lead.id)}
                            title="Xác nhận tiếp nhận khách hàng này"
                            className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Call */}
                        <button
                          onClick={(e) => handleCall(lead.phone, e)}
                          title="Gọi điện trực tiếp"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* Zalo Message */}
                        <button
                          onClick={() => onOpenMessageModal(lead)}
                          title="Mở mẫu tin nhắn Zalo / SMS"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {/* Chat nội bộ TPKD & NVKD */}
                        {onOpenInternalChat && (
                          <button
                            onClick={() => onOpenInternalChat(lead.id)}
                            title="Chat nội bộ TPKD về khách này"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <MessageSquareText className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}

                        {/* Nhắc hẹn Zalo & Thông báo đẩy */}
                        <button
                          onClick={() => onOpenZaloReminder && onOpenZaloReminder(lead)}
                          title={
                            lead.zaloReminder && lead.zaloReminder.status === 'pending'
                              ? `Đã đặt lịch nhắc Zalo: ${formatZaloReminderBadge(lead.zaloReminder).text} - "${lead.zaloReminder.notes}". Bấm để xem hoặc đổi giờ`
                              : 'Đặt lịch nhắc hẹn Zalo (Thông báo đẩy trên trình duyệt)'
                          }
                          className={`p-1.5 rounded-lg transition-all relative cursor-pointer ${
                            lead.zaloReminder && lead.zaloReminder.status === 'pending'
                              ? 'text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-300 shadow-2xs'
                              : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          {lead.zaloReminder && lead.zaloReminder.status === 'pending' && (
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full animate-ping" />
                          )}
                        </button>

                        {/* Schedule Tour */}
                        <button
                          onClick={() => onScheduleAppointment(lead)}
                          title="Lên lịch hẹn xem nhà / dự án"
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        {/* Transfer */}
                        {onTransferLead && (
                          <button
                            onClick={() => onTransferLead([lead])}
                            title="Chuyển giao khách cho Sale khác"
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Edit */}
                        <button
                          onClick={() => onSelectLead(lead)}
                          title="Xem chi tiết & lịch sử chăm sóc"
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete (Admin only) */}
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => onDeleteLead(lead.id)}
                            title="Xoá khách hàng này (Chỉ Quản trị viên)"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SmartLabeling AI Modal */}
      <SmartLabelingModal
        isOpen={isSmartLabelModalOpen}
        onClose={() => setIsSmartLabelModalOpen(false)}
        leads={leads}
        selectedLeadIds={selectedLeadIds}
        onBatchUpdateLeads={(updatedList) => {
          if (onBatchUpdateLeads) {
            onBatchUpdateLeads(updatedList);
          } else {
            updatedList.forEach((ul) => onUpdateLead && onUpdateLead(ul));
          }
        }}
        onShowToast={onShowToast}
      />
    </div>
  );
};
