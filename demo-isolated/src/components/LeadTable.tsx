import React, { useState } from 'react';
import { LeadWorkspace } from './LeadWorkspace';
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

            <div className="whitespace-nowrap flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Hiển thị:</span>
              <strong className="text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs font-bold text-xs">
                {leads.length} khách
              </strong>
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Category & Staff Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs py-2 border-t border-slate-200/70 w-full">
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

      {/* Full customer workspace on desktop, tablet and phone. */}
      <LeadWorkspace
        leads={displayedLeads}
        salesMembers={salesMembers}
        selectedIds={selectedLeadIds}
        currentUser={currentUser}
        policy={distributionPolicy}
        now={nowTime}
        onToggle={onToggleSelectLead}
        onSelect={onSelectLead}
        onStatus={handleStatusChangeWithFeedback}
        onDelete={onDeleteLead}
        onMessage={onOpenMessageModal}
        onAppointment={onScheduleAppointment}
        onAccept={onAcceptLead}
        onTransfer={onTransferLead}
        onChat={onOpenInternalChat}
        onReminder={onOpenZaloReminder}
        onUpdate={onUpdateLead}
        onAi={handleSingleAiLabel}
        onCall={handleCall}
        onZalo={handleOpenZalo}
        onCopy={handleCopyPhone}
        copiedPhone={copiedPhone}
        editingId={editingNoteLeadId}
        note={quickNoteText}
        onNote={setQuickNoteText}
        onStartNote={handleStartQuickNote}
        onSaveNote={handleSaveQuickNote}
        onCancelNote={() => setEditingNoteLeadId(null)}
      />

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
