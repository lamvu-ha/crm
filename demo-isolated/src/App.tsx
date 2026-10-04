import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Plus, 
  Download, 
  Upload, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  RotateCcw,
  Sparkles,
  PhoneForwarded,
  Layers,
  Table,
  Kanban,
  CalendarDays,
  BarChart3,
  Users,
  ArrowRightLeft,
  UserCheck,
  Shield,
  Shuffle,
  FileSpreadsheet,
  Mail,
  Crown,
  Briefcase,
  Lock,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
  X
} from 'lucide-react';
import { Lead, LeadStatus, ViewMode, Appointment, SalesMember, TransferLeadPayload, TransferRequest, isDemoLead, InteractionLog, SystemLog } from './types';
import { INITIAL_LEADS, INITIAL_APPOINTMENTS, isProductTypeMatch } from './data/initialData';
import { INITIAL_SALES_MEMBERS, getNextAssignee, distributeLeadsToSales, getTpkdForMember, isLeadUnassigned } from './data/salesTeamData';
import { calculateCRMIndicators, getQuickLeadStatus, getAssigneeRoleInfo, isLeadMatchingSource } from './utils/crmCalculations';
import { describeLeadChanges } from './utils/customerWorkflow';
import { exportLeadsToCSV } from './utils/csvHelper';
import { SaveStatus } from './components/SaveStatus';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { LeadTable } from './components/LeadTable';
import { LeadPipeline } from './components/LeadPipeline';
import { AppointmentCalendar } from './components/AppointmentCalendar';
import { AnalyticsView } from './components/AnalyticsView';
import { PerformanceOverview } from './components/PerformanceOverview';
import { SmartMarketingReports } from './components/SmartMarketingReports';
import { SalesTeamView } from './components/SalesTeamView';
import { SystemLogsView } from './components/SystemLogsView';
import { AddLeadModal, AUTO_ASSIGN_KEY } from './components/AddLeadModal';
import { LeadDetailModal } from './components/LeadDetailModal';
import { QuickMessageModal } from './components/QuickMessageModal';
import { ImportCsvModal } from './components/ImportCsvModal';
import { TransferLeadModal } from './components/TransferLeadModal';
import { TransferRequestsModal } from './components/TransferRequestsModal';
import { LoginModal } from './components/LoginModal';
import { LoginPage } from './components/LoginPage';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { SyncNvkdSheetModal } from './components/SyncNvkdSheetModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AutoDistributionPolicyModal } from './components/AutoDistributionPolicyModal';
import { ZaloReminderModal } from './components/ZaloReminderModal';
import { ZaloReminderToast } from './components/ZaloReminderToast';
import { CallbackReminderToast } from './components/CallbackReminderToast';
import { CrmToastAlert, ToastAlertData } from './components/CrmToastAlert';
import { 
  DEFAULT_DISTRIBUTION_POLICY, 
  distributeLeadsSmartly, 
  checkAndReassignSlaLeads,
  calculateSalesPerformance 
} from './services/leadDistributionService';
import { AutoDistributionPolicy, KpiPolicy, ZaloReminder, CallbackReminder, ImportLeadsOptions, LeadAssignTargetMode, LeadDuplicateHandlingMode, ZaloTemplate } from './types';
import { normalizePhoneNumber, findDuplicatePhoneLeads } from './utils/phoneDuplicateUtils';
import { ZaloTemplateManagementModal } from './components/ZaloTemplateManagementModal';
import { CrmSettingsModal } from './components/CrmSettingsModal';
import { AdminCmsModal } from './components/AdminCmsModal';
import { 
  fetchServerZaloTemplates, 
  syncZaloTemplatesToServer, 
  getStoredZaloTemplates 
} from './services/zaloTemplateService';
import { checkDueZaloReminders, saveStoredZaloReminder } from './services/zaloReminderService';
import { checkDueCallbackReminders, saveStoredCallbackReminder, markCallbackReminderCompleted } from './services/callbackReminderService';
import { PersonalPerformanceModal } from './components/PersonalPerformanceModal';
import { SundayKpiReportModal } from './components/SundayKpiReportModal';
import { WeeklyActivityPdfModal } from './components/WeeklyActivityPdfModal';
import { NotificationsModal } from './components/NotificationsModal';
import { InternalChatDrawer } from './components/InternalChatDrawer';
import { fetchInternalMessages, getUnreadCount, CHAT_UPDATE_EVENT } from './services/internalChatService';
import { 
  getNotifications, 
  notifySalesOnLeadUpload, 
  AppNotification 
} from './services/notificationService';
import { 
  checkUpcomingAppointments, 
  getAppointmentTimeInfo 
} from './services/appointmentReminderService';
import { 
  DEFAULT_KPI_POLICY, 
  STORAGE_KEY_KPI_POLICY, 
  getCurrentWeekRange 
} from './services/kpiReportService';
import { 
  fetchServerSalesMembers, 
  syncSalesMembersToServer,
  changeEmployeePassword 
} from './services/salesMembersApi';
import { TARGET_NVKD_SHEET_NAME } from './services/googleSheetsService';
import { DatabaseManagementModal } from './components/DatabaseManagementModal';
import { LeadDistributionModal } from './components/LeadDistributionModal';
import { getSaveState, resetSaveTracking } from './services/saveTracker';
import { crmBackend, StatusUpdateApiResponse } from './services/crmBackendService';
import { DateFilterRange, DateFilterField, isLeadInDateRange } from './utils/dateFilterUtils';
import { fetchSystemLogs, recordSystemLog } from './services/systemLogService';

const STORAGE_KEY_LEADS = 'crm_bds_leads_v1';
const STORAGE_KEY_APPS = 'crm_bds_appointments_v1';
const STORAGE_KEY_SALES = 'crm_bds_sales_v1';
const STORAGE_KEY_CURRENT_USER = 'crm_bds_current_user_v1';
const STORAGE_KEY_IS_LOGGED_IN = 'crm_bds_is_logged_in_v1';
const STORAGE_KEY_POLICY = 'crm_bds_distribution_policy_v1';

export const BANNED_SALES_NAMES = [
  'trần minh tâm (demo)',
  'nguyễn hoàng nam',
  'lê thanh trúc',
  'trần quốc bảo',
  'phạm minh thư',
  'đỗ hải đăng',
  'vũ tuấn anh'
];

export const isStrictlyAuthorizedSheetMember = (m?: Partial<SalesMember> | null): boolean => {
  if (!m || !m.name || !m.email) return false;
  const emailLower = m.email.trim().toLowerCase();
  const nameLower = m.name.trim().toLowerCase();

  // Explicitly whitelist Admin account
  if (emailLower === 'admin@sandbox.invalid') return true;

  // Exclude demo corporate domain accounts
  if (
    emailLower.endsWith('@nhaphotrungtam.com.vn') ||
    emailLower === 'tam.tran@nhaphotrungtam.com.vn'
  ) {
    return false;
  }
  // Exclude banned demo names
  if (BANNED_SALES_NAMES.some((banned) => nameLower === banned || (banned.length > 5 && nameLower.includes(banned)))) {
    return false;
  }

  return true;
};

const SYSTEM_ADMIN_EMAILS = new Set(['admin@sandbox.invalid']);

export default function App() {
  // Authentication state for employees: strictly false by default for new sessions
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_IS_LOGGED_IN);
      const savedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved !== null && savedUser !== null) {
        const isAuth = JSON.parse(saved);
        const parsedUser = JSON.parse(savedUser);
        if (localStorage.getItem('salepro_token') && isAuth === true && parsedUser && (parsedUser.email || parsedUser.id)) {
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved login status', e);
    }
    // Security: Default to false so any new link recipient or new device MUST log in
    return false;
  });

  // Legacy demo assignee migration map to guarantee no orphan demo names remain
  const sanitizeAssignee = (name?: string): string => {
    if (!name) return 'Chuyên viên 01';
    const clean = name.trim();
    if (clean === 'Nguyễn Hoàng Nam') return 'Chuyên viên 02';
    if (clean === 'Lê Thanh Trúc') return 'Quản trị thử nghiệm';
    if (clean === 'Trần Quốc Bảo') return 'Trưởng nhóm thử nghiệm';
    if (clean === 'Phạm Minh Thư') return 'Nguyễn Ninh';
    if (clean === 'Đỗ Hải Đăng') return 'Chuyên viên 02';
    if (clean === 'Trần Minh Tâm' || clean === 'Trần Minh Tâm (Mr. Tâm)') return 'Trưởng nhóm thử nghiệm';
    if (clean === 'Vũ Tuấn Anh') return 'Chuyên viên 01';
    if (clean === 'Thang Huynh' || clean === 'Thắng Huỳnh') return 'Chuyên viên 02';
    if (clean === 'Quản trị thử nghiệm' || clean === 'Admin') return 'Chuyên viên 01';
    return clean;
  };

  // Load initial state with localStorage support (strictly filtering out demo leads)
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADS);
      if (saved) {
        const parsed: Lead[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed
            .filter((l) => !isDemoLead(l))
            .map((l) => ({
              ...l,
              assignee: sanitizeAssignee(l.assignee),
              createdAt: l.createdAt || l.assignedAt || (l.date ? new Date(l.date).toISOString() : new Date().toISOString()),
              updatedAt: l.updatedAt || l.firstReportedAt || l.acceptedAt || l.assignedAt || (l.date ? new Date(l.date).toISOString() : new Date().toISOString())
            }));
          return clean;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved leads', e);
    }
    return [];
  });

  // Appointments are loaded from the server after login (see the sync effects below).
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  // Customer to preselect when the appointment form opens from a lead.
  const [appointmentPrefillLeadId, setAppointmentPrefillLeadId] = useState<string | null>(null);

  // Sales team state - strictly authorized sheet members only
  const [salesMembers, setSalesMembers] = useState<SalesMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SALES);
      if (saved) {
        const parsed: SalesMember[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, SalesMember>();
          // Put initial members first
          INITIAL_SALES_MEMBERS.forEach((m) => map.set(m.email.trim().toLowerCase(), m));
          // Overlay with saved members if strictly authorized
          parsed.forEach((m) => {
            if (isStrictlyAuthorizedSheetMember(m)) {
              const key = m.email.trim().toLowerCase();
              const existingInit = map.get(key);
              if (existingInit) {
                map.set(key, { ...existingInit, ...m });
              } else {
                map.set(key, m);
              }
            }
          });
          const cleanList = Array.from(map.values()).filter(isStrictlyAuthorizedSheetMember);
          return cleanList.length > 0 ? cleanList : INITIAL_SALES_MEMBERS;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved sales', e);
    }
    return INITIAL_SALES_MEMBERS;
  });

  // Current logged in user state
  const [currentUser, setCurrentUser] = useState<SalesMember>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) {
        const parsed: SalesMember = JSON.parse(saved);
        if (isStrictlyAuthorizedSheetMember(parsed)) {
          const userEmail = (parsed.email || '').toLowerCase().trim();
          // Strictly verify admin role based on SYSTEM_ADMIN_EMAILS
          if (SYSTEM_ADMIN_EMAILS.has(userEmail)) {
            return { ...parsed, role: 'admin' };
          }
          // If not in SYSTEM_ADMIN_EMAILS, NEVER allow role: 'admin'
          if (parsed.role === 'admin') {
            return { ...parsed, role: 'sale' };
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved current user', e);
    }
    return INITIAL_SALES_MEMBERS[0];
  });

  // UI state
  const [currentView, setCurrentView] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('');
  const [filterProjects, setFilterProjects] = useState<string[]>([]);
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterProductType, setFilterProductType] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterSla, setFilterSla] = useState<string>('');
  const [tpkdFilterScope, setTpkdFilterScope] = useState<'all' | 'tpkd' | 'nvkd'>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  // Date filter state
  const [dateFilterRange, setDateFilterRange] = useState<DateFilterRange>('all');
  const [dateFilterField, setDateFilterField] = useState<DateFilterField>('createdAt');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [isSyncNvkdModalOpen, setIsSyncNvkdModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [isAdminCmsModalOpen, setIsAdminCmsModalOpen] = useState(false);
  const [adminCmsInitialTab, setAdminCmsInitialTab] = useState<'customer_file' | 'staff' | 'database'>('customer_file');
  const [systemBootstrap, setSystemBootstrap] = useState<any>(null);

  const loadSystemBootstrap = useCallback(async () => {
    try {
      const token = localStorage.getItem('salepro_token');
      const res = await fetch('/api/system/bootstrap', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSystemBootstrap(data);
      }
    } catch (e) {
      console.warn('Failed to load system bootstrap config', e);
    }
  }, []);

  useEffect(() => {
    loadSystemBootstrap();
  }, [loadSystemBootstrap]);
  const [changePasswordData, setChangePasswordData] = useState<{
    isOpen: boolean;
    user: SalesMember | null;
    isForcedFirstLogin: boolean;
  }>({
    isOpen: false,
    user: null,
    isForcedFirstLogin: false
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isSundayReportModalOpen, setIsSundayReportModalOpen] = useState(false);
  const [isWeeklyPdfModalOpen, setIsWeeklyPdfModalOpen] = useState(false);
  const [pdfTargetMemberId, setPdfTargetMemberId] = useState<string | undefined>(undefined);

  const handleOpenWeeklyPdfModal = (memberId?: string) => {
    setPdfTargetMemberId(memberId);
    setIsWeeklyPdfModalOpen(true);
  };

  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getNotifications());

  // Internal Chat State (TPKD & NVKD)
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [chatTargetLeadId, setChatTargetLeadId] = useState<string | undefined>(undefined);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Zalo Quick Message Templates & CRM Settings State
  const [zaloTemplates, setZaloTemplates] = useState<ZaloTemplate[]>(() => getStoredZaloTemplates());
  const [isZaloTemplateModalOpen, setIsZaloTemplateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'zalo_templates' | 'kpi' | 'distribution' | 'account'>('zalo_templates');

  const handleOpenSettings = (tab: 'zalo_templates' | 'kpi' | 'distribution' | 'account' = 'zalo_templates') => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };

  useEffect(() => {
    fetchServerZaloTemplates().then(setZaloTemplates);
  }, []);

  const handleSaveZaloTemplates = async (updated: ZaloTemplate[]) => {
    setZaloTemplates(updated);
    await syncZaloTemplatesToServer(updated);
    showToast(`Đã lưu và đồng bộ ${updated.length} mẫu tin nhắn nhanh Zalo!`);
  };

  // System Audit Logs State
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);

  const loadSystemLogs = useCallback(async () => {
    try {
      const logs = await fetchSystemLogs();
      if (Array.isArray(logs)) {
        setSystemLogs(logs);
      }
    } catch (e) {
      console.warn('Failed to load system logs:', e);
    }
  }, []);

  const handleOpenInternalChat = (leadId?: string) => {
    setChatTargetLeadId(leadId);
    setIsChatDrawerOpen(true);
  };

  useEffect(() => {
    const refreshChatUnread = () => {
      fetchInternalMessages().then((msgs) => {
        const count = getUnreadCount(msgs, currentUser.id);
        setUnreadChatCount(count);
      });
    };
    refreshChatUnread();
    window.addEventListener(CHAT_UPDATE_EVENT, refreshChatUnread);
    const interval = setInterval(refreshChatUnread, 5000);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, refreshChatUnread);
      clearInterval(interval);
    };
  }, [currentUser.id]);

  // In-app Delete & Reset Confirmation Dialog state (replaces window.confirm blocked in sandboxed iframes)
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk' | 'reset';
    leadId?: string;
    leadName?: string;
    count?: number;
  }>({
    isOpen: false,
    type: 'single'
  });

  // Recently updated status lead ID for gentle pulse & highlight feedback in LeadTable
  const [recentlyUpdatedStatusLeadId, setRecentlyUpdatedStatusLeadId] = useState<string | null>(null);
  const statusUpdateHighlightTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const refreshNotifications = () => {
    setNotifications(getNotifications());
  };

  const [transferModalData, setTransferModalData] = useState<{
    isOpen: boolean;
    targetLeads: Lead[];
  }>({
    isOpen: false,
    targetLeads: []
  });

  // NVKD propose transfers; TPKD/Admin approve them (server-side, see /api/transfer-requests).
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([]);
  const [isTransferRequestsOpen, setIsTransferRequestsOpen] = useState(false);
  const seenRequestStatusRef = React.useRef<Map<string, TransferRequest['status']> | null>(null);
  // Also tells the NVKD when a TPKD decided on one of their proposals.
  const loadTransferRequests = useCallback(() => {
    crmBackend.getTransferRequests().then((list) => {
      const seen = seenRequestStatusRef.current;
      if (seen && currentUser.role === 'sale') {
        // Arrives unannounced on a background refresh, so keep it on screen longer than a normal toast.
        list.filter((r) => seen.get(r.id) === 'pending' && (r.status === 'approved' || r.status === 'rejected')).forEach((r) => {
          if (r.status === 'approved') showToast(`✅ TPKD đã duyệt chuyển khách "${r.leadName}" sang ${r.toName}.`, 'success', { duration: 10000 });
          else showToast(`❌ TPKD từ chối đề xuất chuyển khách "${r.leadName}"${r.decisionNote ? `: ${r.decisionNote}` : ''}.`, 'warning', { duration: 10000 });
        });
      }
      seenRequestStatusRef.current = new Map(list.map((r) => [r.id, r.status]));
      setTransferRequests(list);
    }).catch(() => {});
  }, [currentUser.role]);

  // Auto distribution policy state
  const [distributionPolicy, setDistributionPolicy] = useState<AutoDistributionPolicy>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POLICY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse distribution policy', e);
    }
    return DEFAULT_DISTRIBUTION_POLICY;
  });

  // Sunday KPI Policy state (Daily: 2 Zalo/day, Weekly: 2 direct meetings/visits)
  const [kpiPolicy, setKpiPolicy] = useState<KpiPolicy>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KPI_POLICY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse KPI policy', e);
    }
    return DEFAULT_KPI_POLICY;
  });

  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [messagingLead, setMessagingLead] = useState<Lead | null>(null);
  const [toastAlert, setToastAlert] = useState<ToastAlertData | null>(null);
  const [zaloReminderLead, setZaloReminderLead] = useState<Lead | null>(null);
  const [activeZaloToasts, setActiveZaloToasts] = useState<ZaloReminder[]>([]);
  const [activeCallbackToasts, setActiveCallbackToasts] = useState<CallbackReminder[]>([]);
  const [isPersonalPerformanceOpen, setIsPersonalPerformanceOpen] = useState(false);
  const [personalPerformanceSaleName, setPersonalPerformanceSaleName] = useState<string | null>(null);

  const handleOpenPersonalPerformance = (saleName?: string) => {
    setPersonalPerformanceSaleName(saleName || currentUser.name);
    setIsPersonalPerformanceOpen(true);
  };

  // Periodic check for due Zalo & Callback reminders (Browser Push & In-app alert)
  useEffect(() => {
    const runReminderChecks = () => {
      checkDueZaloReminders((triggered) => {
        setActiveZaloToasts((prev) => {
          if (prev.some((p) => p.id === triggered.id)) return prev;
          return [triggered, ...prev];
        });
        refreshNotifications();
      });

      checkDueCallbackReminders((triggered) => {
        setActiveCallbackToasts((prev) => {
          if (prev.some((p) => p.id === triggered.id)) return prev;
          return [triggered, ...prev];
        });
        refreshNotifications();
      });
    };

    runReminderChecks();
    const timer = setInterval(runReminderChecks, 10000);

    return () => clearInterval(timer);
  }, []);

  // Calculate upcoming appointments within 30 minutes for current user
  const upcomingAppointments30m = useMemo(() => {
    const now = Date.now();
    return appointments.filter((a) => {
      if (a.status !== 'Chờ đi xem') return false;
      if (currentUser?.role === 'sale') {
        const isMine = a.assignee?.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
        const isUnassigned = !a.assignee || a.assignee === 'Chưa gán';
        if (!isMine && !isUnassigned) return false;
      }
      const timeInfo = getAppointmentTimeInfo(a, now);
      return timeInfo.isUpcomingWithin30Min;
    });
  }, [appointments, currentUser]);

  // Periodic Browser Push Notification scanner for appointments within 30 minutes
  useEffect(() => {
    const runAppointmentCheck = () => {
      checkUpcomingAppointments({
        appointments,
        currentUser,
        onTrigger: (alert) => {
          refreshNotifications();
          showToast(`🔔 [LỊCH HẸN BĐS] Sắp tới giờ hẹn với khách "${alert.appointment.leadName}" (${alert.minutesLeft > 0 ? `còn ${alert.minutesLeft} phút` : 'ngay bây giờ'})!`);
        },
        onOpenAppointment: () => {
          setCurrentView('appointments');
        }
      });
    };

    runAppointmentCheck();
    const timer = setInterval(runAppointmentCheck, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runAppointmentCheck();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [appointments, currentUser]);

  const handleSaveZaloReminder = (updatedLead: Lead, reminder: ZaloReminder) => {
    handleUpdateLead(updatedLead);
    if (detailLead && detailLead.id === updatedLead.id) {
      setDetailLead(updatedLead);
    }
    showToast(`✓ Đã lên lịch nhắc Zalo cho ${updatedLead.fullName}`);
  };

  const handleDeleteZaloReminder = (updatedLead: Lead) => {
    handleUpdateLead(updatedLead);
    if (detailLead && detailLead.id === updatedLead.id) {
      setDetailLead(updatedLead);
    }
    showToast(`✓ Đã xoá lịch nhắc hẹn Zalo`);
  };

  const handleDismissZaloToast = (reminderId: string) => {
    setActiveZaloToasts((prev) => prev.filter((t) => t.id !== reminderId));
  };

  const handleToastMarkCompleted = (reminder: ZaloReminder) => {
    const target = leads.find((l) => l.id === reminder.leadId);
    if (target) {
      const completedReminder: ZaloReminder = {
        ...reminder,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      saveStoredZaloReminder(completedReminder);
      const updatedLead: Lead = {
        ...target,
        zaloReminder: completedReminder
      };
      handleUpdateLead(updatedLead);
      if (detailLead && detailLead.id === target.id) {
        setDetailLead(updatedLead);
      }
    }
    handleDismissZaloToast(reminder.id);
    showToast(`✓ Đã ghi nhận hoàn thành chăm sóc Zalo`);
  };

  const handleDismissCallbackToast = (id: string) => {
    setActiveCallbackToasts((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToastMarkCallbackCompleted = (reminder: CallbackReminder) => {
    const target = leads.find((l) => l.id === reminder.leadId);
    if (target) {
      const nowStr = new Date().toISOString();
      const completedReminder: CallbackReminder = {
        ...reminder,
        status: 'completed',
        completedAt: nowStr
      };
      markCallbackReminderCompleted(reminder.id);
      const targetDate = new Date(reminder.targetTime);
      const hours = targetDate.getHours().toString().padStart(2, '0');
      const minutes = targetDate.getMinutes().toString().padStart(2, '0');
      const timeFormatted = `${hours}:${minutes} ngày ${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
      const completedLog: InteractionLog = {
        id: `log-${Date.now()}`,
        date: nowStr,
        type: 'Cuộc gọi',
        content: `📞 Đã hoàn tất cuộc gọi hẹn lại trước đó (${timeFormatted}). Ghi chú: "${reminder.notes || ''}"`,
        author: currentUser?.name || target.assignee || 'Chuyên viên'
      };
      const updatedLogs = [completedLog, ...(target.history || [])];
      const updatedLead: Lead = {
        ...target,
        callbackReminder: completedReminder,
        history: updatedLogs
      };
      handleUpdateLead(updatedLead);
      if (detailLead && detailLead.id === target.id) {
        setDetailLead(updatedLead);
      }
    }
    handleDismissCallbackToast(reminder.id);
    showToast(`✓ Đã ghi nhận hoàn tất cuộc gọi hẹn lại với ${reminder.leadName}`);
  };

  const handleToastSnoozeCallback = (reminder: CallbackReminder, minutes: number) => {
    const target = leads.find((l) => l.id === reminder.leadId);
    const newTargetMs = Date.now() + minutes * 60 * 1000;
    const newTargetIso = new Date(newTargetMs).toISOString();
    const snoozedReminder: CallbackReminder = {
      ...reminder,
      status: 'pending',
      targetTime: newTargetIso,
      reminderTime: newTargetIso,
      advanceMinutes: 0
    };
    saveStoredCallbackReminder(snoozedReminder);
    if (target) {
      const updatedLead: Lead = {
        ...target,
        callbackReminder: snoozedReminder
      };
      handleUpdateLead(updatedLead);
      if (detailLead && detailLead.id === target.id) {
        setDetailLead(updatedLead);
      }
    }
    handleDismissCallbackToast(reminder.id);
    showToast(`⏰ Đã hoãn nhắc cuộc gọi sau ${minutes} phút`);
  };

  // Sync policies with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POLICY, JSON.stringify(distributionPolicy));
    } catch (e) {
      console.error('Failed to persist policy', e);
    }
  }, [distributionPolicy]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_KPI_POLICY, JSON.stringify(kpiPolicy));
    } catch (e) {
      console.error('Failed to persist KPI policy', e);
    }
  }, [kpiPolicy]);

  // Fetch latest leads and sales members from centralized backend & database on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    // 1. Fetch leads from centralized database (strictly filtered, no demo leads)
    crmBackend.getLeads().then((backendLeads) => {
      const cleanLeads = (backendLeads || []).filter((l) => !isDemoLead(l));
      setLeads(cleanLeads);
      try {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(cleanLeads));
      } catch (e) {}
    }).catch(() => { setLeads([]); setIsLoggedIn(false); });

    crmBackend.getAppointments().then(setAppointments).catch(() => {});
    seenRequestStatusRef.current = null;
    loadTransferRequests();

    // 2. Fetch sales members from centralized database
    crmBackend.getSalesMembers().then((serverMembers) => {
      if (serverMembers && serverMembers.length > 0) {
        const cleanMembers = serverMembers.filter(isStrictlyAuthorizedSheetMember);
        if (cleanMembers.length > 0) {
          // Ensure seed admins are merged so nhaphotrungtam Admin is never omitted
          const memberMap = new Map<string, SalesMember>();
          INITIAL_SALES_MEMBERS.forEach((m) => memberMap.set(m.email.toLowerCase().trim(), m));
          cleanMembers.forEach((m) => {
            const key = m.email.toLowerCase().trim();
            const existing = memberMap.get(key);
            if (existing) {
              memberMap.set(key, { ...existing, ...m });
            } else {
              memberMap.set(key, m);
            }
          });
          const mergedMembers = Array.from(memberMap.values());
          setSalesMembers(mergedMembers);
          try {
            localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(mergedMembers));
          } catch (err) {
            console.warn('Could not save cleaned members to localStorage', err);
          }
        }
      } else if (currentUser.role === 'admin' && salesMembers && salesMembers.length > 0) {
        crmBackend.saveSalesMembers(salesMembers);
      }
    });

    // Initial load of system logs
    loadSystemLogs();
  }, [loadSystemLogs, isLoggedIn, currentUser.id]);

  // Reload system logs whenever Admin navigates to system_logs view
  useEffect(() => {
    if (currentView === 'system_logs') {
      loadSystemLogs();
    }
  }, [currentView, loadSystemLogs]);

  // Background SLA monitor: checks every 60 seconds if policy is enabled
  useEffect(() => {
    if (!distributionPolicy.enabled || !isLoggedIn || currentUser.role === 'sale') return;

    const interval = setInterval(() => {
      const { reassignedLeads, updatedLeads } = checkAndReassignSlaLeads(
        leads,
        salesMembers,
        distributionPolicy
      );
      if (reassignedLeads.length > 0) {
        setLeads(updatedLeads);
        showToast(`⚡ Hệ thống tự động thu hồi & điều phối ${reassignedLeads.length} khách quá hạn SLA cho Sale xuất sắc!`);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [leads, salesMembers, distributionPolicy, isLoggedIn, currentUser.role]);

  // Sync with localStorage and Centralized Backend Database
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(leads));
    } catch (e) {
      console.error('Failed to persist leads', e);
    }
    if (isLoggedIn && leads && leads.length > 0) {
      crmBackend.saveLeads(leads);
    }
  }, [leads, isLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(salesMembers));
    } catch (e) {
      console.error('Failed to persist sales', e);
    }

  }, [salesMembers, isLoggedIn, currentUser.role]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } catch (e) {
      console.error('Failed to persist current user', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_IS_LOGGED_IN, JSON.stringify(isLoggedIn));
    } catch (e) {
      console.error('Failed to persist login state', e);
    }
  }, [isLoggedIn]);

  const showToast = (
    msg: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'success',
    options?: {
      title?: string;
      saleName?: string;
      leadName?: string;
      phone?: string;
      project?: string;
      status?: string;
      matchedLeadId?: string;
      onActionClick?: () => void;
      actionText?: string;
      duration?: number;
    }
  ) => {
    const data: ToastAlertData = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message: msg,
      type,
      title: options?.title,
      saleName: options?.saleName,
      leadName: options?.leadName,
      phone: options?.phone,
      project: options?.project,
      status: options?.status,
      matchedLeadId: options?.matchedLeadId,
      onActionClick: options?.onActionClick,
      actionText: options?.actionText
    };
    setToastAlert(data);
    const duration = options?.duration || (type === 'error' ? 8000 : 3500);
    setTimeout(() => {
      setToastAlert((prev) => (prev?.id === data.id ? null : prev));
    }, duration);
  };

  // Broadcast helper for instant cross-tab sync
  const broadcastLeadsUpdate = (updatedLeads: Lead[]) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const channel = new BroadcastChannel('mayhomes_crm_sync');
        channel.postMessage({ type: 'LEADS_UPDATED', userId: currentUser.id, timestamp: Date.now() });
        channel.close();
      }
    } catch (e) {
      console.warn('BroadcastChannel error', e);
    }
  };

  // Real-time synchronization across open tabs
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        channel = new BroadcastChannel('mayhomes_crm_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'LEADS_UPDATED' && event.data.userId === currentUser.id && isLoggedIn && !getSaveState().pending && !getSaveState().failed) {
            crmBackend.getLeads().then(serverLeads => {
              if (!getSaveState().pending && !getSaveState().failed) setLeads(serverLeads);
            }).catch(() => {});
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel setup error', e);
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [currentUser, isLoggedIn]);

  // Poll only confirmed server state; never upload a client snapshot during refresh.
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      if (getSaveState().pending || getSaveState().failed) return;
      crmBackend.getLeads().then(serverLeads => {
        if (!getSaveState().pending && !getSaveState().failed) setLeads(serverLeads);
      }).catch(() => {});
      crmBackend.getAppointments().then(setAppointments).catch(() => {});
      loadTransferRequests();
    }, 8000);
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser.id, loadTransferRequests]);

  const handleManualRefresh = async () => {
    try {
      showToast('Đang kiểm tra và đồng bộ dữ liệu mới nhất từ máy chủ...');
      const backendLeads = await crmBackend.getLeads(true);
      const cleanLeads = (backendLeads || []).filter((l) => !isDemoLead(l));
      setLeads(cleanLeads);
      resetSaveTracking();
      if (cleanLeads.length > 0) {
        try {
          localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(cleanLeads));
        } catch (e) {}
        const myCount = cleanLeads.filter((l) => {
          const a = (l.assignee || '').toLowerCase();
          return a === currentUser.name.toLowerCase() || a.includes(currentUser.name.toLowerCase());
        }).length;
        if (currentUser.role === 'sale') {
          showToast(`✓ Đã đồng bộ: Bạn đang có ${myCount} khách hàng được phân bổ!`);
        } else {
          showToast(`✓ Đã đồng bộ ${cleanLeads.length} khách hàng từ hệ thống!`);
        }
      } else {
        showToast('Hệ thống chưa có khách hàng mới.');
      }
    } catch (e) {
      showToast('Không thể kết nối đến máy chủ.');
    }
  };

  const handleLoginSuccess = (user: SalesMember) => {
    setCurrentUser(user);
    setLeads([]);
    setIsLoggedIn(true);
    // Ensure user is in salesMembers list and synced
    setSalesMembers((prev) => {
      if (!prev.some((m) => m.email.trim().toLowerCase() === user.email.trim().toLowerCase())) {
        const updated = [user, ...prev];
        syncSalesMembersToServer(updated);
        return updated;
      }
      return prev;
    });
    // If logging in as a sale, automatically filter to their leads for convenience
    if (user.role === 'sale') {
      setFilterAssignee('');
    } else {
      setFilterAssignee('');
    }
    const roleTitle = user.role === 'admin' 
      ? 'Quản trị viên (Admin)' 
      : user.role === 'tpkd' 
        ? 'Trưởng phòng kinh doanh (TPKD)' 
        : 'Chuyên viên Sale (NVKD)';
    showToast(`Chào mừng ${user.name} (${roleTitle}) đã đăng nhập thành công!`);

    // Ghi nhận nhật ký đăng nhập hệ thống
    recordSystemLog({
      action: 'login',
      level: 'success',
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      actorRole: user.role,
      targetType: 'auth',
      targetName: user.name,
      summary: `Đăng nhập thành công vào hệ thống với vai trò ${roleTitle}.`,
      details: { username: user.username, email: user.email, role: user.role }
    }).then(() => loadSystemLogs());

    // For non-admin users with initial password, gently show change password modal without locking out
    if (user.mustChangePassword && user.role !== 'admin') {
      setChangePasswordData({
        isOpen: true,
        user,
        isForcedFirstLogin: false
      });
    }
  };

  // Check if current user requires initial password change (skip for Admin)
  useEffect(() => {
    if (isLoggedIn && currentUser?.mustChangePassword && currentUser?.role !== 'admin') {
      setChangePasswordData({
        isOpen: true,
        user: currentUser,
        isForcedFirstLogin: false
      });
    }
  }, [isLoggedIn, currentUser?.id, currentUser?.mustChangePassword, currentUser?.role]);

  const handleLogout = () => {
    recordSystemLog({
      action: 'logout',
      level: 'info',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'auth',
      targetName: currentUser.name,
      summary: `Đăng xuất khỏi phiên làm việc CRM (${currentUser.name}).`,
      details: { email: currentUser.email, role: currentUser.role }
    }).catch(() => {});

    setIsLoggedIn(false);
    try {
      localStorage.setItem(STORAGE_KEY_IS_LOGGED_IN, 'false');
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      localStorage.removeItem('salepro_token');
      localStorage.removeItem('salepro_refresh_token');
      setLeads([]);
    } catch (e) {
      console.error('Failed to clear login state on logout', e);
    }
    showToast('Đã đăng xuất khỏi tài khoản làm việc.');
  };

  // NVKD members in TPKD's department / team
  const departmentMembers = useMemo(() => {
    if (currentUser.role !== 'tpkd') return [];
    return salesMembers.filter((m) => {
      if (m.id === currentUser.id || m.name.toLowerCase() === currentUser.name.toLowerCase()) return true;
      const tpkd = getTpkdForMember(m, salesMembers);
      return (
        tpkd?.id === currentUser.id ||
        tpkd?.email?.toLowerCase() === currentUser.email.toLowerCase() ||
        tpkd?.name?.toLowerCase() === currentUser.name.toLowerCase()
      );
    });
  }, [currentUser, salesMembers]);

  const departmentMemberNames = useMemo(() => {
    const set = new Set<string>();
    departmentMembers.forEach((m) => {
      set.add(m.name.toLowerCase());
      const clean = m.name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
      if (clean) set.add(clean);
    });
    set.add(currentUser.name.toLowerCase());
    const cleanCurr = currentUser.name.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
    if (cleanCurr) set.add(cleanCurr);
    return set;
  }, [departmentMembers, currentUser.name]);

  // Scope of leads accessible by role:
  // - Admin: All leads in system
  // - TPKD: Full customers of all NVKD in their department + their own customers
  // - Sale (NVKD): Only customers assigned to them
  const authorizedLeads = useMemo(() => {
    if (currentUser.role === 'admin') {
      return leads;
    }
    if (currentUser.role === 'tpkd') {
      return leads.filter((lead) => {
        const assigneeLower = (lead.assignee || '').toLowerCase();
        const cleanAssignee = assigneeLower.replace(/\s*\(.*?\)\s*/g, '').trim();
        return (
          departmentMemberNames.has(assigneeLower) ||
          departmentMemberNames.has(cleanAssignee) ||
          assigneeLower === currentUser.name.toLowerCase()
        );
      });
    }
    // Sale (NVKD)
    const myNameLower = currentUser.name.toLowerCase();
    const cleanMy = myNameLower.replace(/\s*\(.*?\)\s*/g, '').trim();
    return leads.filter((lead) => {
      if (lead.assignedToId) return lead.assignedToId === currentUser.id;
      if (lead.assigneeEmail) return lead.assigneeEmail.toLowerCase() === currentUser.email.toLowerCase();
      const assigneeLower = (lead.assignee || '').toLowerCase();
      const cleanAssignee = assigneeLower.replace(/\s*\(.*?\)\s*/g, '').trim();
      return assigneeLower === myNameLower || cleanAssignee === cleanMy;
    });
  }, [leads, currentUser, departmentMemberNames]);

  // Scope of leads for KPIs (matching active full/tpkd/nvkd view)
  const scopedLeadsForIndicators = useMemo(() => {
    if ((currentUser.role === 'tpkd' || currentUser.role === 'admin') && tpkdFilterScope !== 'all') {
      return authorizedLeads.filter((lead) => {
        const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser.name);
        if (tpkdFilterScope === 'tpkd') return roleInfo.isTpkd;
        if (tpkdFilterScope === 'nvkd') return !roleInfo.isTpkd;
        return true;
      });
    }
    return authorizedLeads;
  }, [authorizedLeads, currentUser.role, tpkdFilterScope, salesMembers, currentUser.name]);

  // Indicators calculation based on authorized leads scope
  const indicators = useMemo(() => calculateCRMIndicators(scopedLeadsForIndicators), [scopedLeadsForIndicators]);

  // Calculate TPKD vs NVKD lead counts for TPKD
  const { tpkdLeadsCount, nvkdLeadsCount } = useMemo(() => {
    let tpkd = 0;
    let nvkd = 0;
    authorizedLeads.forEach((lead) => {
      const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser.name);
      if (roleInfo.isTpkd) {
        tpkd++;
      } else {
        nvkd++;
      }
    });
    return { tpkdLeadsCount: tpkd, nvkdLeadsCount: nvkd };
  }, [authorizedLeads, salesMembers, currentUser.name]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return authorizedLeads.filter((lead) => {
      // TPKD role scope filter ('all' | 'tpkd' | 'nvkd')
      if ((currentUser.role === 'tpkd' || currentUser.role === 'admin') && tpkdFilterScope !== 'all') {
        const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser.name);
        if (tpkdFilterScope === 'tpkd' && !roleInfo.isTpkd) {
          return false;
        }
        if (tpkdFilterScope === 'nvkd' && roleInfo.isTpkd) {
          return false;
        }
      }

      // Search term filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchName = lead.fullName.toLowerCase().includes(query);
        const matchPhone = lead.phone.includes(query);
        const matchProject = lead.project.toLowerCase().includes(query);
        const matchAssignee = lead.assignee.toLowerCase().includes(query);
        const matchSource = lead.dataSource.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchProject && !matchAssignee && !matchSource) {
          return false;
        }
      }

      // Use the same status buckets as the quick-filter counts.
      if (activeStatusFilter && getQuickLeadStatus(lead) !== activeStatusFilter) {
        return false;
      }
      // Dropdown filters
      if (filterProjects.length > 0 && !filterProjects.includes(lead.project)) {
        return false;
      }
      if (filterSource && !isLeadMatchingSource(lead, filterSource)) {
        return false;
      }
      if (filterProductType && !isProductTypeMatch(lead.productType, filterProductType)) {
        return false;
      }
      if (filterAssignee && lead.assignee !== filterAssignee) {
        return false;
      }

      // Date range filter (Hôm nay, Tuần này, Tháng này, Tùy chọn...)
      if (dateFilterRange !== 'all') {
        if (!isLeadInDateRange(lead, dateFilterRange, customStartDate, customEndDate, dateFilterField)) {
          return false;
        }
      }

      return true;
    });
  }, [
    authorizedLeads,
    currentUser.role,
    currentUser.name,
    tpkdFilterScope,
    salesMembers,
    searchTerm,
    activeStatusFilter,
    filterProjects,
    filterSource,
    filterProductType,
    filterAssignee,
    dateFilterRange,
    dateFilterField,
    customStartDate,
    customEndDate
  ]);

  // Count leads assigned directly to currently logged-in user
  const myLeadsCount = useMemo(() => {
    const myNameLower = currentUser.name.toLowerCase();
    const cleanMy = myNameLower.replace(/\s*\(.*?\)\s*/g, '').trim();
    return leads.filter((l) => {
      const a = (l.assignee || '').toLowerCase();
      const cleanA = a.replace(/\s*\(.*?\)\s*/g, '').trim();
      return a === myNameLower || cleanA === cleanMy;
    }).length;
  }, [leads, currentUser.name]);

  // Count department leads for TPKD
  const departmentLeadsCount = useMemo(() => {
    if (currentUser.role === 'tpkd') {
      return authorizedLeads.length;
    }
    return 0;
  }, [currentUser.role, authorizedLeads]);

  // Count unassigned leads
  const unassignedCount = useMemo(() => {
    return leads.filter((l) => isLeadUnassigned(l)).length;
  }, [leads]);

  // Lead CRUD Operations
  const handleAddLead = (newLeadData: Omit<Lead, 'id' | 'stt'>) => {
    let finalAssignee = newLeadData.assignee;
    if (finalAssignee === AUTO_ASSIGN_KEY || finalAssignee === 'Tự động phân bổ') {
      finalAssignee = getNextAssignee(salesMembers, leads).assigneeName;
    }

    // Check duplicate phone alert
    const dupCheck = findDuplicatePhoneLeads(newLeadData.phone, leads);
    const isDuplicate = dupCheck.isDuplicate && Boolean(dupCheck.matchedLead);
    const matchedLead = dupCheck.matchedLead;

    // Smart initial priority classification for new lead
    let initialPotential = newLeadData.potentialLevel;
    let initialReason = newLeadData.priorityReason;
    if (!initialPotential) {
      const lowerNotes = (newLeadData.notes || '').toLowerCase();
      const lowerStatus = (newLeadData.status || '').toLowerCase();
      if (
        lowerNotes.includes('gấp') || lowerNotes.includes('xem ngay') || lowerNotes.includes('cọc') ||
        lowerNotes.includes('đàm phán') || lowerStatus.includes('hẹn') || lowerStatus.includes('chốt')
      ) {
        initialPotential = 'Nóng';
        initialReason = 'Nhu cầu cấp thiết từ ghi chú ban đầu';
      } else if (
        lowerNotes.includes('không nghe') || lowerNotes.includes('thuê bao') || lowerStatus.includes('không nghe')
      ) {
        initialPotential = 'Lạnh';
        initialReason = 'Chưa liên lạc được';
      } else {
        initialPotential = 'Ấm';
        initialReason = 'Khách mới tiếp nhận cần tư vấn thêm';
      }
    }

    const nowIso = new Date().toISOString();
    const newLead: Lead = {
      ...newLeadData,
      assignee: finalAssignee,
      id: `lead-${Date.now()}`,
      stt: leads.length + 1,
      potentialLevel: initialPotential,
      priorityReason: initialReason,
      priorityUpdatedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      assignedAt: newLeadData.assignedAt || nowIso
    };

    setLeads([newLead, ...leads]);

    // Show appropriate toast: Red warning toast if duplicate phone, else green success toast
    if (isDuplicate && matchedLead) {
      const saleInCharge = matchedLead.assignee || 'Chưa phân bổ';
      showToast(
        `Số điện thoại "${newLeadData.phone}" đã tồn tại trong CRM (Khách cũ: "${matchedLead.fullName}"). Sale hiện đang phụ trách: "${saleInCharge}"!`,
        'error',
        {
          title: 'CẢNH BÁO TRÙNG SỐ ĐIỆN THOẠI!',
          saleName: saleInCharge,
          leadName: matchedLead.fullName,
          phone: newLeadData.phone,
          project: matchedLead.project,
          status: matchedLead.status,
          duration: 10000
        }
      );
    } else {
      showToast(`Đã thêm khách hàng "${newLead.fullName}" & phân bổ cho "${finalAssignee}"!`, 'success');
    }

    // Ghi nhật ký tạo mới khách hàng
    recordSystemLog({
      action: 'lead_create',
      level: 'info',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'lead',
      targetId: newLead.id,
      targetName: newLead.fullName,
      summary: `Tạo mới khách hàng "${newLead.fullName}" (${newLead.phone || 'Chưa SĐT'}) - Phân bổ cho "${finalAssignee}".`,
      details: { leadId: newLead.id, phone: newLead.phone, project: newLead.project, assignee: finalAssignee }
    }).then(() => loadSystemLogs());
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    const nowIso = new Date().toISOString();
    const leadWithTime: Lead = {
      ...updatedLead,
      updatedAt: nowIso
    };

    const previousLead = leads.find(lead=>lead.id===updatedLead.id);
    const changes = previousLead ? describeLeadChanges(previousLead, updatedLead) : [];
    if (changes.length) leadWithTime.history = [{id: `change-${Date.now()}-${updatedLead.id}`, date: nowIso, type: 'Ghi chú nội bộ', author: currentUser.name, content: `Thay đổi hồ sơ:\n${changes.join('\n')}`}, ...(leadWithTime.history || [])];
    setLeads((prevLeads) => {
      const next = prevLeads.map((l) => (l.id === updatedLead.id ? leadWithTime : l));
      try {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(next));
      } catch (e) {}
      broadcastLeadsUpdate(next);
      return next;
    });

    setDetailLead(leadWithTime);
    showToast(`✅ Đã cập nhật thông tin "${updatedLead.fullName}"`);

    // Highlight row if status was changed
    const oldLead = leads.find((l) => l.id === updatedLead.id);
    if (oldLead && oldLead.status !== updatedLead.status) {
      setRecentlyUpdatedStatusLeadId(updatedLead.id);
      if (statusUpdateHighlightTimeoutRef.current) {
        clearTimeout(statusUpdateHighlightTimeoutRef.current);
      }
      statusUpdateHighlightTimeoutRef.current = setTimeout(() => {
        setRecentlyUpdatedStatusLeadId(null);
      }, 4000);
    }

    // Ghi nhật ký chỉnh sửa thông tin khách hàng
    recordSystemLog({
      action: 'lead_update',
      level: 'info',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'lead',
      targetId: updatedLead.id,
      targetName: updatedLead.fullName,
      summary: `Chỉnh sửa thông tin khách hàng "${updatedLead.fullName}" (${updatedLead.phone || ''}). Trạng thái: "${updatedLead.status}". Phụ trách: "${updatedLead.assignee}".`,
      details: { leadId: updatedLead.id, status: updatedLead.status, assignee: updatedLead.assignee }
    }).then(() => loadSystemLogs());

    // Immediate background persistence to server disk and sync
    crmBackend.updateLead(leadWithTime).catch((err) => {
      console.error('Failed to persist lead update:', err);
    });
  };

  const handleBatchUpdateLeads = (newLeadsList: Lead[]) => {
    setLeads(newLeadsList);
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(newLeadsList));
    } catch (e) {}
    broadcastLeadsUpdate(newLeadsList);
    // Background bulk sync to backend
    crmBackend.saveLeads(newLeadsList).catch((err) => {
      console.error('Failed to persist batch leads:', err);
    });
  };

  const handleUpdateStatus = (leadId: string, newStatus: LeadStatus) => {
    const timestamp = new Date().toISOString();
    console.log('[handleUpdateStatus] === START STATUS UPDATE ===', {
      leadId,
      newStatus,
      leadIdType: typeof leadId,
      newStatusType: typeof newStatus,
      currentUser: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
      timestamp
    });

    // 1. Verify leadId and newStatus values
    if (!leadId || typeof leadId !== 'string' || leadId.trim() === '') {
      console.error('[handleUpdateStatus] FAILED VALIDATION: leadId is missing, empty, or not a string!', {
        leadId,
        newStatus
      });
      showToast('⚠️ Lỗi: Mã định danh khách hàng (leadId) không hợp lệ!');
      return;
    }

    if (!newStatus || typeof newStatus !== 'string' || newStatus.trim() === '') {
      console.error('[handleUpdateStatus] FAILED VALIDATION: newStatus is missing or invalid!', {
        leadId,
        newStatus
      });
      showToast('⚠️ Lỗi: Trạng thái mới không hợp lệ!');
      return;
    }

    // 2. Check if lead exists in in-memory leads state
    const currentLead = leads.find((l) => l.id === leadId || String(l.id).trim() === String(leadId).trim());
    console.log('[handleUpdateStatus] In-memory lead search:', {
      leadFound: Boolean(currentLead),
      leadDetails: currentLead ? {
        id: currentLead.id,
        fullName: currentLead.fullName,
        phone: currentLead.phone,
        oldStatus: currentLead.status,
        newStatusTarget: newStatus,
        assignee: currentLead.assignee
      } : null,
      totalLeadsCount: leads.length
    });

    if (!currentLead) {
      console.warn(`[handleUpdateStatus] WARNING: Lead with ID "${leadId}" was not found in the current in-memory leads list! Attempting update anyway...`);
    }

    // A viewing needs a date and time: open the booking form; saving it moves the customer to "Hẹn xem BĐS".
    const hasPendingViewing = appointments.some((a) => a.leadId === leadId && a.status === 'Chờ đi xem');
    if (newStatus === 'Hẹn xem BĐS' && currentLead && currentLead.status !== newStatus && !hasPendingViewing) {
      setDetailLead(null);
      handleScheduleFromLead(currentLead);
      showToast(`Chọn ngày giờ hẹn để chuyển "${currentLead.fullName}" sang "Hẹn xem BĐS".`);
      return;
    }

    const nowIso = timestamp;
    const oldStatus = currentLead?.status || 'Chưa xác định';
    const newHistoryEntry: InteractionLog = {
      id: `log-${Date.now()}`,
      date: nowIso.replace('T', ' ').slice(0, 16),
      type: 'Ghi chú nội bộ' as const,
      content: `Chuyển trạng thái từ "${oldStatus}" sang "${newStatus}"`,
      author: currentUser.name || currentLead?.assignee || 'User'
    };

    // Construct the updated lead object immediately
    const updatedLeadData: Lead = currentLead
      ? {
          ...currentLead,
          status: newStatus,
          history: [newHistoryEntry, ...(currentLead.history || [])],
          updatedAt: nowIso
        }
      : {
          id: leadId,
          stt: 0,
          date: nowIso.slice(0, 10),
          fullName: 'Khách hàng',
          phone: '',
          notes: '',
          project: '',
          productType: '',
          dataSource: '',
          assignee: currentUser.name || 'Admin',
          status: newStatus,
          history: [newHistoryEntry],
          createdAt: nowIso,
          updatedAt: nowIso
        };

    console.log('[handleUpdateStatus] Prepared updated lead object for local state & backend:', {
      id: updatedLeadData.id,
      status: updatedLeadData.status,
      historyCount: updatedLeadData.history?.length,
      latestHistoryEntry: newHistoryEntry
    });

    // 3. Update React local state & localStorage immediately
    setRecentlyUpdatedStatusLeadId(leadId);
    if (statusUpdateHighlightTimeoutRef.current) {
      clearTimeout(statusUpdateHighlightTimeoutRef.current);
    }
    statusUpdateHighlightTimeoutRef.current = setTimeout(() => {
      setRecentlyUpdatedStatusLeadId(null);
    }, 4000);

    setLeads((prevLeads) => {
      let matched = false;
      const nextLeads = prevLeads.map((l) => {
        if (l.id === leadId || String(l.id).trim() === String(leadId).trim()) {
          matched = true;
          return updatedLeadData;
        }
        return l;
      });

      if (!matched) {
        console.warn(`[handleUpdateStatus] Lead ${leadId} not found during setLeads mapping, prepending updatedLeadData.`);
        nextLeads.unshift(updatedLeadData);
      }

      try {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(nextLeads));
        console.log('[handleUpdateStatus] LocalStorage updated successfully.');
      } catch (storageErr) {
        console.error('[handleUpdateStatus] LocalStorage write error:', storageErr);
      }

      broadcastLeadsUpdate(nextLeads);
      return nextLeads;
    });

    if (detailLead && (detailLead.id === leadId || String(detailLead.id).trim() === String(leadId).trim())) {
      console.log('[handleUpdateStatus] Updating detailLead modal state as well.');
      setDetailLead(updatedLeadData);
    }

    // Ghi nhật ký chuyển trạng thái khách hàng
    recordSystemLog({
      action: 'lead_status_change',
      level: 'info',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'lead',
      targetId: leadId,
      targetName: currentLead?.fullName || 'Khách hàng',
      summary: `Chuyển trạng thái khách hàng "${currentLead?.fullName || 'Khách hàng'}" từ "${oldStatus}" sang "${newStatus}".`,
      details: { leadId, oldStatus, newStatus, assignee: currentLead?.assignee }
    }).then(() => loadSystemLogs());

    // 4. Send request to backend via crmBackend.updateLeadStatus with comprehensive result inspection
    console.log('[handleUpdateStatus] Invoking crmBackend.updateLeadStatus...', {
      leadId,
      newStatus,
      author: currentUser.name || updatedLeadData.assignee,
      historyLength: updatedLeadData.history?.length
    });

    crmBackend.updateLeadStatus(
      leadId,
      newStatus,
      currentUser.name || updatedLeadData.assignee,
      updatedLeadData.history
    )
      .then(async (result: StatusUpdateApiResponse) => {
        console.log('[handleUpdateStatus] crmBackend.updateLeadStatus response received:', result);

        // Check if the call returned an error or unsuccessful status
        if (!result || !result.success) {
          console.group(`[handleUpdateStatus] ❌ API FAILURE DETECTED: HTTP ${result?.status || 'N/A'} ${result?.statusText || ''}`);

          console.error('[handleUpdateStatus] General Failure Overview:', {
            leadId,
            newStatus,
            httpStatus: result?.status,
            statusText: result?.statusText,
            failureCategory: result?.failureCategory || 'unknown',
            errorMessage: result?.error,
            endpoint: result?.endpoint,
            method: result?.method
          });

          // 1. Root-cause categorization analysis
          if (result?.failureCategory === 'authentication' || result?.status === 401 || result?.status === 403) {
            console.error('🔒 [DIAGNOSTIC - AUTHENTICATION / PERMISSION ISSUE]: The backend rejected the request due to missing/invalid authentication credentials or insufficient user privileges.', {
              currentUser: { id: currentUser.id, name: currentUser.name, role: currentUser.role },
              authHeadersDetected: {
                authorization: result?.headers?.['authorization'] ? '[PRESENT]' : '[NONE]',
                cookie: result?.headers?.['cookie'] ? '[PRESENT]' : '[NONE]',
                'www-authenticate': result?.headers?.['www-authenticate'] || '[NONE]'
              }
            });
          } else if (result?.failureCategory === 'rate_limiting' || result?.status === 429) {
            console.error('⏱️ [DIAGNOSTIC - RATE LIMITING / QUOTA EXCEEDED]: The server or external resource rejected the request due to throttling or quota limits.', {
              retryAfter: result?.headers?.['retry-after'] || 'Not specified',
              rateLimitLimit: result?.headers?.['x-ratelimit-limit'],
              rateLimitRemaining: result?.headers?.['x-ratelimit-remaining'],
              rateLimitReset: result?.headers?.['x-ratelimit-reset']
            });
          } else if (result?.failureCategory === 'payload_formatting' || result?.status === 400 || result?.status === 422) {
            console.error('📝 [DIAGNOSTIC - PAYLOAD FORMATTING ISSUE]: The backend rejected the payload schema. Check if fields like status, author, or history are improperly typed or formatted.', {
              sentPayload: result?.sentPayload,
              serverValidationBody: result?.parsedBody || result?.rawBody
            });
          } else if (result?.status === 404) {
            console.error('🔍 [DIAGNOSTIC - LEAD NOT FOUND (404)]: The requested leadId does not match any record in the backend store.', {
              leadId,
              parsedBody: result?.parsedBody
            });
          } else if (result?.status && result.status >= 500) {
            console.error('💥 [DIAGNOSTIC - SERVER INTERNAL ERROR (5xx)]: The server encountered an unexpected error while executing the PATCH request.', {
              httpStatus: result.status,
              parsedBody: result.parsedBody,
              rawBody: result.rawBody
            });
          } else {
            console.error('🌐 [DIAGNOSTIC - NETWORK / CONNECTION ERROR]: Fetch failed before receiving a valid HTTP response (network dropped or CORS issue).');
          }

          // 2. Granular Response Headers Inspection
          console.log('[handleUpdateStatus] Response Headers Dictionary:', result?.headers || {});

          // 3. Full Granular Response Body (Parsed & Raw)
          console.log('[handleUpdateStatus] Response Body (Parsed JSON):', result?.parsedBody);
          console.log('[handleUpdateStatus] Response Body (Raw Text):', result?.rawBody);

          // 4. Detailed Sent Payload and Context
          console.log('[handleUpdateStatus] Exact Sent Request Details:', {
            endpoint: result?.endpoint,
            method: result?.method,
            sentPayload: result?.sentPayload,
            clientUserContext: { id: currentUser.id, name: currentUser.name, role: currentUser.role }
          });

          console.groupEnd();

          // Attempt fallback update via PUT /api/leads/:id
          console.log('[handleUpdateStatus] Initiating fallback via crmBackend.updateLead...');
          try {
            const fallbackOk = await crmBackend.updateLead(updatedLeadData);
            console.log('[handleUpdateStatus] Fallback crmBackend.updateLead result:', { fallbackOk });
            if (!fallbackOk) {
              console.error('[handleUpdateStatus] CRITICAL: Fallback updateLead also failed! The status could not be persisted to the backend server.');
              showToast(`⚠️ Không thể lưu trạng thái mới lên máy chủ (${result?.error || 'Lỗi kết nối'})`);
            } else {
              console.log('[handleUpdateStatus] Fallback updateLead succeeded! Lead status was persisted.');
            }
          } catch (fallbackError) {
            console.error('[handleUpdateStatus] CRITICAL: Fallback updateLead threw exception:', fallbackError);
            showToast(`⚠️ Lỗi khi lưu vào máy chủ: ${result?.error || 'Vui lòng thử lại'}`);
          }
        } else {
          console.log('[handleUpdateStatus] SUCCESS: Status updated and persisted successfully on backend!', {
            leadId,
            httpStatus: result.status,
            persistedStatus: result.lead?.status,
            updatedAt: result.lead?.updatedAt
          });
        }
      })
      .catch(async (err) => {
        console.group('[handleUpdateStatus] ❌ UNCAUGHT EXCEPTION DURING STATUS UPDATE');
        console.error('[handleUpdateStatus] Exception Details:', {
          errorName: err?.name,
          errorMessage: err?.message,
          errorStack: err?.stack,
          leadId,
          newStatus
        });
        console.groupEnd();

        // Attempt fallback update on exception
        try {
          console.log('[handleUpdateStatus] Attempting fallback updateLead after exception...');
          const fallbackOk = await crmBackend.updateLead(updatedLeadData);
          console.log('[handleUpdateStatus] Fallback result after exception:', { fallbackOk });
          if (!fallbackOk) {
            showToast('⚠️ Không thể lưu trạng thái lên máy chủ do lỗi kết nối!');
          }
        } catch (fallbackErr) {
          console.error('[handleUpdateStatus] Fallback updateLead after exception also failed:', fallbackErr);
        }
      });

    showToast(`✅ Đã chuyển trạng thái sang "${newStatus}" và lưu vào hệ thống`);
    console.log('[handleUpdateStatus] === END STATUS UPDATE DISPATCH ===');
  };

  const handleDeleteLead = (leadId: string) => {
    if (currentUser.role !== 'admin') {
      showToast('⚠️ Bạn không có quyền xoá khách hàng. NVKD và TPKD không được phép xoá khách hàng trên hệ thống!');
      return;
    }
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;
    setDeleteConfirmState({
      isOpen: true,
      type: 'single',
      leadId: target.id,
      leadName: target.fullName
    });
  };

  const handleBulkDelete = () => {
    if (currentUser.role !== 'admin') {
      showToast('⚠️ Bạn không có quyền xoá khách hàng. NVKD và TPKD không được phép xoá khách hàng trên hệ thống!');
      return;
    }
    if (selectedLeadIds.length === 0) return;
    setDeleteConfirmState({
      isOpen: true,
      type: 'bulk',
      count: selectedLeadIds.length
    });
  };

  const executeConfirmedDelete = () => {
    if (!deleteConfirmState.isOpen) return;

    if (deleteConfirmState.type !== 'reset' && currentUser.role !== 'admin') {
      showToast('⚠️ Thao tác bị từ chối: NVKD và TPKD không được phép xoá khách hàng trên hệ thống!');
      setDeleteConfirmState({ isOpen: false, type: 'single' });
      return;
    }

    if (deleteConfirmState.type === 'single' && deleteConfirmState.leadId) {
      const targetId = deleteConfirmState.leadId;
      const targetName = deleteConfirmState.leadName || 'Khách hàng';
      const updated = leads.filter((l) => l.id !== targetId);
      setLeads(updated);
      try {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updated));
      } catch (e) {}
      setSelectedLeadIds((prev) => prev.filter((id) => id !== targetId));
      setAppointments((prev) => prev.filter((a) => a.leadId !== targetId));
      if (detailLead?.id === targetId) setDetailLead(null);
      crmBackend.deleteLead(targetId).catch(() => {});
      crmBackend.saveLeads(updated).catch(() => {});
      showToast(`Đã xoá khách hàng "${targetName}" thành công.`);

      // Ghi nhật ký xoá khách hàng
      recordSystemLog({
        action: 'lead_delete',
        level: 'danger',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetType: 'lead',
        targetId,
        targetName,
        summary: `Đã xóa vĩnh viễn khách hàng "${targetName}" khỏi hệ thống CRM.`,
        details: { leadId: targetId, leadName: targetName }
      }).then(() => loadSystemLogs());
    } else if (deleteConfirmState.type === 'bulk') {
      const toDeleteIds = new Set<string>(selectedLeadIds);
      const toDeleteArray: string[] = Array.from(toDeleteIds);
      const count = toDeleteIds.size;
      const updated = leads.filter((l) => !toDeleteIds.has(l.id));
      setLeads(updated);
      try {
        localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updated));
      } catch (e) {}
      setSelectedLeadIds([]);
      setAppointments((prev) => prev.filter((a) => !toDeleteIds.has(a.leadId)));
      if (detailLead && toDeleteIds.has(detailLead.id)) setDetailLead(null);
      crmBackend.deleteMultipleLeads(toDeleteArray).catch(() => {});
      crmBackend.saveLeads(updated).catch(() => {});
      showToast(`Đã xoá ${count} khách hàng đã chọn thành công.`);

      // Ghi nhật ký xoá hàng loạt khách hàng
      recordSystemLog({
        action: 'lead_bulk_delete',
        level: 'danger',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetType: 'lead',
        summary: `Đã xóa hàng loạt ${count} khách hàng khỏi hệ thống CRM.`,
        details: { count, leadIds: toDeleteArray }
      }).then(() => loadSystemLogs());
    } else if (deleteConfirmState.type === 'reset') {
      setLeads(INITIAL_LEADS);
      setAppointments(INITIAL_APPOINTMENTS);
      setSalesMembers(INITIAL_SALES_MEMBERS);
      setCurrentUser(INITIAL_SALES_MEMBERS[0]);
      localStorage.removeItem(STORAGE_KEY_LEADS);
      localStorage.removeItem(STORAGE_KEY_APPS);
      localStorage.removeItem(STORAGE_KEY_SALES);
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      crmBackend.saveLeads(INITIAL_LEADS).catch(() => {});
      crmBackend.saveSalesMembers(INITIAL_SALES_MEMBERS).catch(() => {});
      showToast('Đã khôi phục toàn bộ dữ liệu CRM & đội ngũ Sale ban đầu.');
    }

    setDeleteConfirmState({ isOpen: false, type: 'single' });
  };

  const handleBulkUpdateStatus = (status: LeadStatus) => {
    if (selectedLeadIds.length === 0) return;
    setLeads(
      leads.map((l) => {
        if (selectedLeadIds.includes(l.id)) {
          return { ...l, status };
        }
        return l;
      })
    );
    setSelectedLeadIds([]);
    showToast(`Đã cập nhật ${selectedLeadIds.length} khách sang "${status}"`);
  };

  // Transfer leads handler
  const handleTransferLeads = (payload: TransferLeadPayload) => {
    const targetIds = new Set(payload.leadIds);
    setLeads((prev) =>
      prev.map((lead) => {
        if (targetIds.has(lead.id)) {
          const oldAssignee = lead.assignee;
          const nowIso = new Date().toISOString();
          const newHistory = [
            {
              id: `log-transfer-${Date.now()}-${lead.id}`,
              date: nowIso.replace('T', ' ').slice(0, 16),
              type: 'Ghi chú nội bộ' as const,
              content: `Bàn giao khách hàng từ "${oldAssignee}" sang "${payload.toAssignee}". Lý do: ${payload.reason || 'Bàn giao chuyển giao khách'}`,
              author: currentUser.name
            },
            ...(lead.history || [])
          ];
          return {
            ...lead,
            assignee: payload.toAssignee,
            assignedToId: salesMembers.find(member=>member.name===payload.toAssignee)?.id,
            assigneeEmail: salesMembers.find(member=>member.name===payload.toAssignee)?.email,
            acceptedAt: undefined,
            firstReportedAt: undefined,
            slaWarning: false,
            slaBreached: false,
            assignedAt: nowIso,
            updatedAt: nowIso,
            history: newHistory
          };
        }
        return lead;
      })
    );
    setSelectedLeadIds([]);
    showToast(`Đã bàn giao thành công ${payload.leadIds.length} khách cho chuyên viên "${payload.toAssignee}"!`);

    // Ghi nhật ký bàn giao khách hàng
    recordSystemLog({
      action: 'lead_transfer',
      level: 'warning',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'lead',
      summary: `Bàn giao ${payload.leadIds.length} khách hàng cho chuyên viên "${payload.toAssignee}". Lý do: ${payload.reason || 'Bàn giao chuyển giao khách'}.`,
      details: { leadIds: payload.leadIds, toAssignee: payload.toAssignee, reason: payload.reason }
    }).then(() => loadSystemLogs());
  };

  // NVKD: send one proposal per customer; the server keeps them until a TPKD/Admin decides.
  const handleRequestTransfer = async (leadIds: string[], suggestedName: string, reason: string, handover: TransferRequest['handover']): Promise<boolean> => {
    const suggestedToId = suggestedName ? salesMembers.find((m) => m.name === suggestedName)?.id : undefined;
    const results = await Promise.all(leadIds.map((leadId) => crmBackend.createTransferRequest({ leadId, suggestedToId, reason, handover })));
    results.forEach((r) => applyServerLead(r.lead));
    const failed = results.filter((r) => !r.success);
    const sent = results.length - failed.length;
    if (sent) showToast(`📨 Đã gửi ${sent} đề xuất chuyển khách. Chờ TPKD duyệt.`);
    if (failed.length) showToast(`⚠️ ${failed.length} đề xuất không gửi được: ${failed[0].error}`);
    if (sent) {
      setSelectedLeadIds([]);
      loadTransferRequests();
    }
    return failed.length === 0;
  };

  const handleDecideTransfer = async (id: string, action: 'approve' | 'reject' | 'cancel', toUserId?: string, note?: string): Promise<boolean> => {
    const result = await crmBackend.decideTransferRequest(id, action, toUserId, note);
    if (!result.success) {
      showToast(`⚠️ ${result.error}`);
      return false;
    }
    applyServerLead(result.lead);
    const request = result.request!;
    showToast(action === 'approve'
      ? `✅ Đã chuyển khách "${request.leadName}" sang ${request.toName}.`
      : action === 'reject' ? `Đã từ chối đề xuất chuyển khách "${request.leadName}".` : `Đã huỷ đề xuất chuyển khách "${request.leadName}".`);
    loadTransferRequests();
    return true;
  };

  // Accept lead handler (when sale accepts lead)
  const handleAcceptLead = (leadId: string) => {
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          const newHistory = [
            {
              id: `log-${Date.now()}`,
              date: now.replace('T', ' ').slice(0, 16),
              type: 'Ghi chú nội bộ' as const,
              content: `Chuyên viên ${currentUser.name} đã xác nhận tiếp nhận khách hàng. Bắt đầu tính SLA chăm sóc.`,
              author: currentUser.name
            },
            ...(l.history || [])
          ];
          return {
            ...l,
            acceptedAt: now,
            updatedAt: now,
            history: newHistory
          };
        }
        return l;
      })
    );
    showToast(`Đã tiếp nhận khách hàng thành công! Vui lòng gọi điện hoặc liên hệ sớm.`);
  };

  // Trigger SLA sweep across all active leads
  const handleTriggerSlaSweep = () => {
    const { reassignedLeads, updatedLeads } = checkAndReassignSlaLeads(
      leads,
      salesMembers,
      distributionPolicy
    );

    if (reassignedLeads.length > 0) {
      setLeads(updatedLeads);
      showToast(`⚡ Quét SLA thành công: Đã thu hồi & luân chuyển ${reassignedLeads.length} khách quá hạn sang cho Sale xuất sắc khác!`);
    } else {
      showToast(`✓ Tất cả chuyên viên Sale đều đang chấp hành tốt SLA tiếp nhận & báo cáo.`);
    }
  };

  // Distribute selected or all leads via modal
  const handleModalDistribute = async (
    targetLeads: Lead[],
    targetSales: SalesMember[],
    method: 'round_robin' | 'performance'
  ) => {
    let distributedLeads: Lead[] = [];
    if (method === 'performance' && distributionPolicy.performancePriority) {
      const res = distributeLeadsSmartly(targetLeads, targetSales, distributionPolicy, leads);
      distributedLeads = res.distributedLeads;
    } else {
      const res = distributeLeadsToSales(targetLeads, targetSales, 0, leads);
      distributedLeads = res.distributedLeads;
    }

    const distMap = new Map(distributedLeads.map((l) => [l.id, l]));
    const updatedFullList = leads.map((l) => distMap.get(l.id) || l);

    setLeads(updatedFullList);
    try {
      localStorage.setItem(STORAGE_KEY_LEADS, JSON.stringify(updatedFullList));
    } catch (e) {}

    await crmBackend.saveLeads(updatedFullList);
    broadcastLeadsUpdate(updatedFullList);

    try {
      const notifyResult = await notifySalesOnLeadUpload({
        uploadedLeads: distributedLeads,
        salesMembers: targetSales,
        uploaderName: currentUser.name,
        sourceDescription: 'Phân bổ khách hàng tự động CRM'
      });
      refreshNotifications();
      if (notifyResult.emailsSentCount > 0) {
        showToast(`🔔 Đã gửi thông báo tới ${notifyResult.emailsSentCount} chuyên viên Sale!`);
      }
    } catch (e) {
      console.warn('Lỗi khi gửi email notify:', e);
    }

    const phucCount = distributedLeads.filter((l) => (l.assignee || '').toLowerCase().includes('phúc')).length;
    showToast(`✓ Đã phân bổ thành công ${distributedLeads.length} khách cho ${targetSales.length} chuyên viên! (Trưởng nhóm thử nghiệm nhận ${phucCount} khách)`);
  };

  // Auto distribute leads (Performance-weighted or Round-robin based on policy)
  const handleAutoDistributeLeads = async (leadIds?: string[], forceAll: boolean = false) => {
    // If no leadIds specified, open the interactive distribution modal for custom configuration
    if (!leadIds || leadIds.length === 0) {
      setIsDistributionModalOpen(true);
      return;
    }

    let leadsToDistribute: Lead[] = leads.filter((l) => leadIds.includes(l.id));
    if (leadsToDistribute.length === 0) {
      setIsDistributionModalOpen(true);
      return;
    }

    const activeSales = salesMembers.filter((m) => m.status === 'active' && m.role === 'sale');
    const targetSales = activeSales.length > 0 ? activeSales : salesMembers.filter((m) => m.status === 'active');
    await handleModalDistribute(leadsToDistribute, targetSales, 'round_robin');
  };

  // Sales member CRUD
  const handleAddSalesMember = (newMemberData: Omit<SalesMember, 'id'>) => {
    const newMember: SalesMember = {
      ...newMemberData,
      id: `sales-${Date.now()}`
    };
    setSalesMembers([...salesMembers, newMember]);
    showToast(`Đã thêm chuyên viên sale "${newMember.name}" vào đội ngũ!`);
  };

  const handleUpdateSalesMember = (updatedMember: SalesMember) => {
    setSalesMembers(salesMembers.map((s) => (s.id === updatedMember.id ? updatedMember : s)));
    if (currentUser.id === updatedMember.id) {
      setCurrentUser(updatedMember);
    }
    showToast(`Đã cập nhật thông tin cho "${updatedMember.name}"`);
  };

  const handleToggleSalesMemberStatus = (id: string) => {
    setSalesMembers(
      salesMembers.map((s) => (s.id === id ? { ...s, status: s.status === 'active' ? 'paused' as const : 'active' as const } : s))
    );
    const member = salesMembers.find((s) => s.id === id);
    showToast(`Đã đổi trạng thái hoạt động của "${member?.name}"`);
  };

  // Appointment operations
  // The server books the slot, moves the customer to "Hẹn xem BĐS" and logs it in their history.
  const applyServerLead = (lead?: Lead | null) => {
    if (!lead) return;
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
    setDetailLead((current) => (current?.id === lead.id ? lead : current));
  };

  const handleAddAppointment = async (newApp: Omit<Appointment, 'id'>): Promise<boolean> => {
    const result = await crmBackend.createAppointment(newApp);
    if (!result.success || !result.appointment) {
      showToast(`⚠️ ${result.error || 'Không lưu được lịch hẹn.'}`);
      return false;
    }
    const created = result.appointment;
    setAppointments((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
    applyServerLead(result.lead);
    showToast(`Đã lên lịch hẹn xem BĐS cho khách "${newApp.leadName}"`);
    return true;
  };

  const handleUpdateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const result = await crmBackend.updateAppointmentStatus(id, status);
    if (!result.success || !result.appointment) {
      showToast(`⚠️ ${result.error || 'Không cập nhật được lịch hẹn.'}`);
      return;
    }
    const updated = result.appointment;
    setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    applyServerLead(result.lead);
    showToast(`Đã cập nhật trạng thái lịch hẹn`);
  };

  const handleScheduleFromLead = (lead: Lead) => {
    setAppointmentPrefillLeadId(lead.id);
    setCurrentView('appointments');
  };

  // CSV Import/Export
  const handleExportCSV = () => {
    if (currentUser.role !== 'admin') {
      showToast('⚠️ Chính sách bảo mật: Tài khoản TPKD và NVKD không được phép xuất danh sách khách hàng. Chỉ Admin mới có quyền xuất file!');
      return;
    }
    exportLeadsToCSV(leads);
    showToast('Đã xuất file CSV chuẩn CRM Bất Động Sản thành công!');
  };

  const handleImportLeads = async (
    newLeads: Partial<Lead>[], 
    options?: boolean | ImportLeadsOptions
  ) => {
    const nowIso = new Date().toISOString();

    // 1. Normalize options
    let assignTargetMode: LeadAssignTargetMode = 'round_robin';
    let targetSaleName = '';
    let duplicateHandlingMode: LeadDuplicateHandlingMode = 'skip_protect_old_sale';

    if (typeof options === 'boolean') {
      assignTargetMode = options ? 'round_robin' : 'as_in_file';
    } else if (options && typeof options === 'object') {
      assignTargetMode = options.assignTargetMode;
      targetSaleName = options.targetSaleName || '';
      duplicateHandlingMode = options.duplicateHandlingMode;
    }

    // 2. Build index of existing leads by normalized phone
    const phoneMap = new Map<string, Lead>();
    leads.forEach((l) => {
      const norm = normalizePhoneNumber(l.phone);
      if (norm && norm.length >= 8) {
        if (!phoneMap.has(norm)) phoneMap.set(norm, l);
        if (norm.length >= 9) {
          const tail = norm.slice(-9);
          if (!phoneMap.has(tail)) phoneMap.set(tail, l);
        }
      }
    });

    // 3. Separate clean leads from duplicates of leads from step 1
    const cleanNewItems: Partial<Lead>[] = [];
    const duplicateItems: Array<{ item: Partial<Lead>; existingLead: Lead }> = [];
    const seenInBatch = new Set<string>();

    newLeads.forEach((item) => {
      const norm = normalizePhoneNumber(item.phone);
      if (!norm || norm.length < 8) {
        cleanNewItems.push(item);
        return;
      }
      const tail = norm.length >= 9 ? norm.slice(-9) : norm;
      const existing = phoneMap.get(norm) || phoneMap.get(tail);
      if (existing) {
        duplicateItems.push({ item, existingLead: existing });
      } else if (seenInBatch.has(tail)) {
        duplicateItems.push({ item, existingLead: { ...item, assignee: 'Cùng file vừa tải' } as Lead });
      } else {
        seenInBatch.add(tail);
        cleanNewItems.push(item);
      }
    });

    // 4. Handle duplicates on existing leads (Protect Sale in Step 1)
    let updatedExistingLeads = [...leads];
    let protectedCount = 0;
    let noteUpdatedCount = 0;
    let reassignedCount = 0;

    if (duplicateItems.length > 0) {
      if (duplicateHandlingMode === 'skip_protect_old_sale') {
        // BẢO VỆ SALE Ở BƯỚC 1: Không tạo lead mới cho Sale mới, giữ nguyên 100% cho Sale cũ
        const dupLeadIds = new Set(duplicateItems.map(d => d.existingLead.id));
        updatedExistingLeads = updatedExistingLeads.map((lead) => {
          if (dupLeadIds.has(lead.id)) {
            protectedCount++;
            const matchingDup = duplicateItems.find(d => d.existingLead.id === lead.id);
            const extraNote = matchingDup?.item?.notes ? ` (Ghi chú mới trong file: "${matchingDup.item.notes}")` : '';
            return {
              ...lead,
              updatedAt: nowIso,
              history: [
                ...(lead.history || []),
                {
                  id: `h-dup-protect-${Date.now()}-${lead.id}`,
                  date: nowIso.replace('T', ' ').slice(0, 16),
                  type: 'Ghi chú nội bộ' as const,
                  content: `🛡️ [Bảo vệ Sale cũ] Khách hàng xuất hiện lại trong đợt nạp file mới. Hệ thống bảo vệ 100% quyền chăm sóc cho ${lead.assignee || 'Sale trước'}, không chia cho Sale khác.${extraNote}`,
                  author: currentUser.name
                }
              ]
            };
          }
          return lead;
        });
      } else if (duplicateHandlingMode === 'update_old_sale_note') {
        // Giữ nguyên Sale cũ, cập nhật ghi chú mới
        const dupLeadIds = new Set(duplicateItems.map(d => d.existingLead.id));
        updatedExistingLeads = updatedExistingLeads.map((lead) => {
          if (dupLeadIds.has(lead.id)) {
            noteUpdatedCount++;
            const matchingDup = duplicateItems.find(d => d.existingLead.id === lead.id);
            const extraNote = matchingDup?.item?.notes ? ` | Nhu cầu mới: ${matchingDup.item.notes}` : '';
            return {
              ...lead,
              notes: `${lead.notes || ''}${extraNote}`,
              updatedAt: nowIso,
              history: [
                ...(lead.history || []),
                {
                  id: `h-dup-update-${Date.now()}-${lead.id}`,
                  date: nowIso.replace('T', ' ').slice(0, 16),
                  type: 'Ghi chú nội bộ' as const,
                  content: `📝 Cập nhật thông tin khách hàng từ đợt nạp mới. Giữ nguyên người phụ trách: ${lead.assignee}.${extraNote}`,
                  author: currentUser.name
                }
              ]
            };
          }
          return lead;
        });
      } else if (duplicateHandlingMode === 'reassign_to_new_sale') {
        // Thu hồi từ Sale cũ và chuyển giao cho Sale mới
        const newAssignee = assignTargetMode === 'single_sale' ? (targetSaleName || currentUser.name) : 'Chưa phân công';
        const dupLeadIds = new Set(duplicateItems.map(d => d.existingLead.id));
        updatedExistingLeads = updatedExistingLeads.map((lead) => {
          if (dupLeadIds.has(lead.id)) {
            reassignedCount++;
            const prevAssignee = lead.assignee;
            return {
              ...lead,
              assignee: newAssignee,
              assignedAt: nowIso,
              updatedAt: nowIso,
              history: [
                ...(lead.history || []),
                {
                  id: `h-dup-reassign-${Date.now()}-${lead.id}`,
                  date: nowIso.replace('T', ' ').slice(0, 16),
                  type: 'Bàn giao / Chuyển Sale' as const,
                  content: `🔀 Chuyển giao quyền chăm sóc từ ${prevAssignee} sang ${newAssignee} theo đợt nạp dữ liệu mới.`,
                  author: currentUser.name
                }
              ]
            };
          }
          return lead;
        });
      }
    }

    // 5. Construct brand new leads for clean items
    const importedNewLeads: Lead[] = cleanNewItems.map((item, index) => {
      let leadAssignee = 'Chưa phân công';
      if (assignTargetMode === 'single_sale') {
        leadAssignee = targetSaleName || 'Chưa phân công';
      } else if (assignTargetMode === 'as_in_file') {
        leadAssignee = item.assignee || 'Chưa phân công';
      }

      return {
        id: `lead-import-${Date.now()}-${index}`,
        stt: updatedExistingLeads.length + index + 1,
        date: item.date || new Date().toISOString().split('T')[0],
        fullName: item.fullName || 'Khách hàng',
        phone: item.phone || '',
        dataSource: item.dataSource || 'File CSV',
        productType: item.productType || 'Nhà phố trung tâm',
        status: item.status || 'Khách mới',
        project: item.project || 'Nhà Phố Trung Tâm',
        assignee: leadAssignee,
        notes: item.notes || '',
        budget: item.budget || '',
        createdAt: nowIso,
        updatedAt: nowIso,
        assignedAt: nowIso,
        history: [
          {
            id: `h-import-${Date.now()}-${index}`,
            date: new Date().toISOString().replace('T', ' ').slice(0, 16),
            type: 'Ghi chú nội bộ' as const,
            content: `Khởi tạo từ đợt nạp file CSV${assignTargetMode === 'single_sale' ? ` (Giao cho ${targetSaleName})` : ''}.`,
            author: currentUser.name
          }
        ]
      };
    });

    let finalUploadedLeads: Lead[] = [];

    if (assignTargetMode === 'round_robin') {
      const { distributedLeads } = distributeLeadsToSales(importedNewLeads, salesMembers, 0, leads);
      finalUploadedLeads = distributedLeads;
    } else {
      finalUploadedLeads = importedNewLeads;
    }

    // Combine and update state
    const combinedLeads = [...updatedExistingLeads, ...finalUploadedLeads];
    setLeads(combinedLeads);

    // Toast feedback
    if (protectedCount > 0) {
      showToast(`✅ Đã nạp ${finalUploadedLeads.length} khách mới cho ${assignTargetMode === 'single_sale' ? targetSaleName : 'Sale'}. 🛡️ Đã bảo vệ ${protectedCount} khách trùng cho Sale ở bước 1 (không bị chia lặp)!`);
    } else if (noteUpdatedCount > 0) {
      showToast(`✅ Đã nạp ${finalUploadedLeads.length} khách mới & cập nhật ghi chú cho ${noteUpdatedCount} khách cũ!`);
    } else if (reassignedCount > 0) {
      showToast(`✅ Đã nạp ${finalUploadedLeads.length} khách mới & chuyển giao ${reassignedCount} khách sang Sale mới!`);
    } else {
      showToast(`Đã nhập thành công ${finalUploadedLeads.length} khách hàng mới vào CRM!`);
    }

    // Ghi nhật ký nhập dữ liệu từ CSV
    recordSystemLog({
      action: 'sheet_sync',
      level: 'info',
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorEmail: currentUser.email,
      actorRole: currentUser.role,
      targetType: 'sync',
      summary: `Đã nạp ${finalUploadedLeads.length} khách mới${assignTargetMode === 'single_sale' ? ` cho ${targetSaleName}` : ''}.${protectedCount > 0 ? ` 🛡️ Bảo vệ ${protectedCount} khách trùng cho Sale cũ.` : ''}`,
      details: { 
        newCount: finalUploadedLeads.length, 
        protectedDuplicates: protectedCount,
        assignMode: assignTargetMode,
        targetSale: targetSaleName
      }
    }).then(() => loadSystemLogs());

    // Gửi thông báo & email cho sale biết để đăng nhập vào làm việc
    try {
      if (finalUploadedLeads.length > 0) {
        const notifyResult = await notifySalesOnLeadUpload({
          uploadedLeads: finalUploadedLeads,
          salesMembers,
          uploaderName: currentUser.name,
          sourceDescription: `File CSV (${assignTargetMode === 'single_sale' ? targetSaleName : 'Phân bổ'})`
        });
        refreshNotifications();
        if (notifyResult.emailsSentCount > 0) {
          showToast(`🔔 Đã gửi email thông báo Gmail tới ${notifyResult.emailsSentCount} nhân viên kinh doanh!`);
        }
      }
    } catch (e) {
      console.warn('Lỗi khi gửi thông báo phân bổ lead:', e);
    }
  };

  const handleImportGoogleSheetLeads = async (
    newLeads: Lead[], 
    mode: 'append' | 'replace',
    distributionMode: 'auto_all' | 'auto_unassigned' | 'keep_sheet' = 'auto_all'
  ) => {
    const cleanNew = newLeads.filter((l) => !isDemoLead(l));
    const nowIso = new Date().toISOString();

    let processedLeads: Lead[] = cleanNew;

    // Phân bổ tự động cho đội ngũ Sale nếu được chọn
    if (distributionMode === 'auto_all') {
      if (distributionPolicy.performancePriority) {
        const res = distributeLeadsSmartly(cleanNew, salesMembers, distributionPolicy, leads);
        processedLeads = res.distributedLeads;
      } else {
        const res = distributeLeadsToSales(cleanNew, salesMembers, 0, leads);
        processedLeads = res.distributedLeads;
      }
    } else if (distributionMode === 'auto_unassigned') {
      const unassigned = cleanNew.filter((l) => isLeadUnassigned(l));
      if (unassigned.length > 0) {
        const res = distributionPolicy.performancePriority
          ? distributeLeadsSmartly(unassigned, salesMembers, distributionPolicy, leads)
          : distributeLeadsToSales(unassigned, salesMembers, 0, leads);
        const distMap = new Map(res.distributedLeads.map((l) => [l.id, l]));
        processedLeads = cleanNew.map((l) => distMap.get(l.id) || l);
      }
    }

    let finalLeadsList: Lead[] = [];

    if (mode === 'replace') {
      finalLeadsList = processedLeads.map((l, idx) => ({
        ...l,
        stt: idx + 1,
        assignedAt: l.assignedAt || (l.assignee && l.assignee !== 'Chưa phân bổ' ? nowIso : undefined),
        createdAt: l.createdAt || l.assignedAt || nowIso,
        updatedAt: l.updatedAt || l.firstReportedAt || l.acceptedAt || nowIso
      }));
      setLeads(finalLeadsList);
    } else {
      const cleanPrev = leads.filter((l) => !isDemoLead(l));
      const startStt = cleanPrev.length;
      const adjusted = processedLeads.map((l, idx) => ({
        ...l,
        stt: startStt + idx + 1,
        assignedAt: l.assignedAt || (l.assignee && l.assignee !== 'Chưa phân bổ' ? nowIso : undefined),
        createdAt: l.createdAt || l.assignedAt || nowIso,
        updatedAt: l.updatedAt || l.firstReportedAt || l.acceptedAt || nowIso
      }));
      finalLeadsList = [...cleanPrev, ...adjusted];
      setLeads(finalLeadsList);
    }

    // Lưu ngay lập tức vào database backend
    crmBackend.saveLeads(finalLeadsList);

    const distMsg = distributionMode === 'auto_all' 
      ? ' và tự động phân bổ đều cho đội ngũ Sale!' 
      : distributionMode === 'auto_unassigned' 
      ? ' và tự động chia các khách chưa có người phụ trách cho Sale!' 
      : '!';
    showToast(`Đã đồng bộ thành công ${processedLeads.length} Lead từ Google Sheet MAY_TRUONGBV_MH5.19_CRM_V.1${distMsg}`);

    // Gửi thông báo & email cho sale biết để đăng nhập vào làm việc
    try {
      const notifyResult = await notifySalesOnLeadUpload({
        uploadedLeads: processedLeads,
        salesMembers,
        uploaderName: currentUser.name,
        sourceDescription: 'Google Sheet MAY_TRUONGBV_MH5.19_CRM_V.1'
      });
      refreshNotifications();
      if (notifyResult.emailsSentCount > 0) {
        showToast(`🔔 Đã gửi email thông báo Gmail tới ${notifyResult.emailsSentCount} chuyên viên Sale phụ trách!`);
      }
    } catch (e) {
      console.warn('Lỗi khi gửi thông báo phân bổ sheet:', e);
    }
  };

  const handleImportNvkdMembers = (newMembers: SalesMember[], emailsSentCount: number) => {
    setSalesMembers((prev) => {
      const map = new Map<string, SalesMember>();
      prev.filter(isStrictlyAuthorizedSheetMember).forEach((m) => map.set(m.email.trim().toLowerCase(), m));
      newMembers.filter(isStrictlyAuthorizedSheetMember).forEach((m) => {
        const key = m.email.trim().toLowerCase();
        if (map.has(key)) {
          map.set(key, { ...map.get(key)!, ...m });
        } else {
          map.set(key, m);
        }
      });
      const updated = Array.from(map.values()).filter(isStrictlyAuthorizedSheetMember);
      const finalList = updated.length > 0 ? updated : INITIAL_SALES_MEMBERS;
      try {
        localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(finalList));
      } catch (e) {
        console.warn('Failed to save to localStorage', e);
      }
      syncSalesMembersToServer(finalList);
      return finalList;
    });
    showToast(`Đã đồng bộ thành công ${newMembers.length} tài khoản NVKD từ Google Sheet "${TARGET_NVKD_SHEET_NAME}" & gửi ${emailsSentCount} email qua Gmail!`);
  };

  const handleSaveNewPassword = async (userId: string, newPassword: string, currentPassword?: string) => {
    try {
      const member = salesMembers.find((s) => s.id === userId) || currentUser;
      const res = await changeEmployeePassword({
        memberId: userId,
        email: member.email,
        currentPassword,
        newPassword,
        isForcedFirstLogin: changePasswordData.isForcedFirstLogin
      });

      if (!res.success) {
        return { success: false, error: res.error || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.' };
      }

      setSalesMembers((prev) => {
        const updated = prev.map((s) =>
          s.id === userId
            ? { ...s, password: newPassword, mustChangePassword: false, lastPasswordChangeAt: new Date().toISOString() }
            : s
        );
        return updated;
      });

      if (currentUser.id === userId) {
        setCurrentUser((prev) => ({
          ...prev,
          password: newPassword,
          mustChangePassword: false,
          lastPasswordChangeAt: new Date().toISOString()
        }));
      }

      setChangePasswordData({ isOpen: false, user: null, isForcedFirstLogin: false });
      showToast('Đã đổi mật khẩu riêng thành công! Mật khẩu mới đã được lưu an toàn.');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Lỗi hệ thống khi cập nhật mật khẩu.' };
    }
  };

  const handleResetData = () => {
    setDeleteConfirmState({
      isOpen: true,
      type: 'reset'
    });
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };

  const upcomingAppointmentsCount = appointments.filter(
    (a) => a.status === 'Chờ đi xem'
  ).length;

  // Render dedicated Login Screen for employees if not yet logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950">
        <LoginPage
          salesMembers={salesMembers}
          onLoginSuccess={handleLoginSuccess}
        />
        <CrmToastAlert 
          toast={toastAlert} 
          onClose={() => setToastAlert(null)} 
          isLoginScreen={true} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col selection:bg-amber-500 selection:text-white overflow-x-hidden">
      {/* Toast alert - elevated on mobile so bottom nav doesn't hide it */}
      <CrmToastAlert 
        toast={toastAlert} 
        onClose={() => setToastAlert(null)} 
        isLoginScreen={false} 
      />

      {/* Dynamic Company-wide Announcement Banner from Super Admin CMS */}
      {(() => {
        const bannerConf = systemBootstrap?.uiConfigs?.find((c: any) => c.sectionKey === 'announcement_banner');
        if (!bannerConf?.data?.isEnabled || !bannerConf?.data?.message) return null;
        const type = bannerConf.data.type || 'info';
        const bgClass = type === 'warning' 
          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white' 
          : type === 'success' 
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white' 
            : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white';
        return (
          <div className={`${bgClass} px-4 py-1.5 text-xs sm:text-sm font-bold flex items-center justify-between shadow-xs z-20`}>
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <span className="p-0.5 bg-white/20 rounded">📢</span>
              <span className="truncate">{bannerConf.data.message}</span>
            </div>
          </div>
        );
      })()}

      <SaveStatus userId={currentUser.id}/>
      {/* Main Header with User profile, switch, and logout */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onExportCSV={currentUser.role === 'admin' ? handleExportCSV : () => {}}
        onOpenImportModal={currentUser.role === 'admin' ? () => setIsImportModalOpen(true) : () => {}}
        onOpenGoogleSheetSync={currentUser.role === 'admin' ? () => setIsGoogleSheetModalOpen(true) : () => {}}
        onOpenSyncNvkdSheet={currentUser.role === 'admin' ? () => setIsSyncNvkdModalOpen(true) : undefined}
        onResetData={handleResetData}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCount={selectedLeadIds.length}
        currentUser={currentUser}
        salesCount={salesMembers.length}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenSundayReportModal={() => setIsSundayReportModalOpen(true)}
        onOpenWeeklyPdfModal={handleOpenWeeklyPdfModal}
        unreadNotificationsCount={
          currentUser.role === 'admin'
            ? notifications.filter(n => !n.read).length
            : notifications.filter(n => !n.read && (!n.targetMemberEmail || n.targetMemberEmail.toLowerCase() === currentUser.email.toLowerCase() || n.targetMemberName?.toLowerCase() === currentUser.name.toLowerCase())).length
        }
        upcomingAppointments30mCount={upcomingAppointments30m.length}
        unreadChatCount={unreadChatCount}
        onOpenInternalChat={() => handleOpenInternalChat()}
        onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        onOpenDatabaseModal={() => setIsDatabaseModalOpen(true)}
        onOpenZaloTemplates={() => handleOpenSettings('zalo_templates')}
        onOpenSettings={handleOpenSettings}
        onOpenAdminCms={() => {
          setAdminCmsInitialTab('customer_file');
          setIsAdminCmsModalOpen(true);
        }}
        onOpenAdminCmsTab={(tab) => {
          setAdminCmsInitialTab(tab);
          setIsAdminCmsModalOpen(true);
        }}
        onOpenPersonalPerformance={handleOpenPersonalPerformance}
        onOpenChangePassword={() =>
          setChangePasswordData({
            isOpen: true,
            user: currentUser,
            isForcedFirstLogin: Boolean(currentUser.mustChangePassword)
          })
        }
      />

      {/* Imminent Appointment Alert Bar (<= 30 minutes) */}
      {upcomingAppointments30m.length > 0 && currentView !== 'appointments' && (
        <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white/20 rounded-md animate-bounce">⏰</span>
            <span>
              <strong>Nhắc hẹn BĐS khẩn cấp:</strong> Bạn có <strong>{upcomingAppointments30m.length}</strong> cuộc hẹn gặp khách trong vòng 30 phút!
              {upcomingAppointments30m[0] && (
                <span className="hidden md:inline ml-2 text-amber-100">
                  (Khách: <strong>{upcomingAppointments30m[0].leadName}</strong> - Lúc {upcomingAppointments30m[0].time} tại {upcomingAppointments30m[0].project})
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('appointments')}
            className="px-3 py-1 bg-white hover:bg-amber-50 text-rose-700 font-bold rounded-lg text-xs transition-colors shadow-2xs whitespace-nowrap cursor-pointer"
          >
            Mở lịch hẹn ngay &rarr;
          </button>
        </div>
      )}

      {/* Current User Role Notice & Quick Action Banner */}
      <section className="bg-amber-50/70 border-b border-amber-200/70 text-xs px-3 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0 ${
              currentUser.role === 'admin' 
                ? 'bg-amber-600' 
                : currentUser.role === 'tpkd'
                  ? 'bg-purple-600'
                  : 'bg-blue-600'
            }`}>
              {currentUser.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
            </div>
            <div className="flex items-center flex-wrap gap-1.5">
              <span>Đang đăng nhập: <strong className="text-amber-950 font-bold">{currentUser.name}</strong></span>
              <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                currentUser.role === 'admin'
                  ? 'bg-amber-200/80 text-amber-900'
                  : currentUser.role === 'tpkd'
                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                    : 'bg-blue-100 text-blue-900'
              }`}>
                {currentUser.role === 'admin' 
                  ? 'Quản trị viên (Admin)' 
                  : currentUser.role === 'tpkd' 
                    ? `TPKD: ${currentUser.team || 'Phòng MAY_MH5.19'}` 
                    : `NVKD: ${currentUser.title}`}
              </span>
              <span className="hidden md:inline text-slate-400">•</span>
              
              {currentUser.role === 'tpkd' ? (
                <>
                  <span className="text-slate-700">
                    Full phòng: <strong className="text-purple-900 font-bold">{departmentLeadsCount}</strong> khách
                  </span>
                  <span className="hidden lg:inline text-slate-400">•</span>
                  <span className="text-purple-800 font-medium">
                    👑 TPKD: <strong className="font-bold">{tpkdLeadsCount}</strong> khách
                  </span>
                  <span className="hidden lg:inline text-slate-400">•</span>
                  <span className="text-blue-800 font-medium">
                    💼 NVKD: <strong className="font-bold">{nvkdLeadsCount}</strong> khách
                  </span>
                </>
              ) : (
                <span className="text-slate-600">
                  Đang phụ trách: <strong className="text-slate-900 font-bold">{myLeadsCount}</strong> khách hàng
                </span>
              )}

              {unassignedCount > 0 && currentUser.role === 'admin' && (
                <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-[10px] font-bold">
                  {unassignedCount} khách chưa phân bổ
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 shrink-0">
            {currentUser.role === 'tpkd' && (
              <div className="flex items-center space-x-1 p-0.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <button
                  onClick={() => {
                    setTpkdFilterScope('all');
                    setFilterAssignee('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    tpkdFilterScope === 'all'
                      ? 'bg-purple-800 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Xem toàn bộ khách hàng thuộc phòng ban của bạn"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Full phòng ({departmentLeadsCount})</span>
                </button>
                <button
                  onClick={() => {
                    setTpkdFilterScope('tpkd');
                    setFilterAssignee('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    tpkdFilterScope === 'tpkd'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-900 hover:bg-purple-50'
                  }`}
                  title="Chỉ xem khách hàng do Trưởng phòng kinh doanh trực tiếp phụ trách"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Khách TPKD ({tpkdLeadsCount})</span>
                </button>
                <button
                  onClick={() => {
                    setTpkdFilterScope('nvkd');
                    setFilterAssignee('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    tpkdFilterScope === 'nvkd'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-blue-900 hover:bg-blue-50'
                  }`}
                  title="Xem khách hàng thuộc các Chuyên viên kinh doanh trong phòng"
                >
                  <Briefcase className="w-3.5 h-3.5 text-blue-200" />
                  <span>Khách NVKD ({nvkdLeadsCount})</span>
                </button>
              </div>
            )}

            {currentUser.role === 'sale' && (
              <>
                <button
                  onClick={() => setFilterAssignee(filterAssignee === currentUser.name ? '' : currentUser.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    filterAssignee === currentUser.name
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{filterAssignee === currentUser.name ? 'Đang lọc khách của tôi' : 'Xem khách của tôi'}</span>
                </button>

                <button
                  onClick={handleManualRefresh}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  title="Nhấn để kiểm tra và nhận khách hàng mới nhất từ Admin"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Làm mới ({myLeadsCount})</span>
                </button>
              </>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'tpkd') && (
              <>
                <button
                  onClick={() => setIsDistributionModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-600/20"
                  title="Mở bảng phân bổ khách hàng cho chuyên viên Sale (NVKD)"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>⚡ Phân bổ khách cho Sale {unassignedCount > 0 ? `(${unassignedCount})` : ''}</span>
                </button>

                <button
                  onClick={handleManualRefresh}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
                  title="Đồng bộ dữ liệu mới nhất từ máy chủ"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                  <span>Làm mới</span>
                </button>
              </>
            )}

            <button
              id="btn-banner-change-pass"
              onClick={() =>
                setChangePasswordData({
                  isOpen: true,
                  user: currentUser,
                  isForcedFirstLogin: false
                })
              }
              className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-950 border border-amber-300/80 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
              title="Tự đổi mật khẩu riêng tài khoản của bạn"
            >
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              <span>Đổi mật khẩu</span>
            </button>

            <button
              onClick={() => setIsSundayReportModalOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-amber-950 border border-amber-300 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-2xs"
              title="Xem tiến độ KPI: 2 Zalo/ngày, 2 hẹn gặp/tuần và xuất Email báo cáo tối Chủ Nhật"
            >
              <Mail className="w-3.5 h-3.5 text-amber-700" />
              <span>KPI Tối CN</span>
            </button>

            <div className="flex items-center space-x-1.5 border-l border-amber-200/80 pl-2">
              {currentUser.role === 'admin' && (
                <>
                  <button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="text-amber-800 hover:text-amber-950 font-bold underline text-xs cursor-pointer"
                    title="Chuyển đổi phiên làm việc (Quyền Admin)"
                  >
                    Đổi tài khoản
                  </button>
                  <span className="text-amber-300">•</span>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-rose-600 hover:text-rose-800 font-bold underline text-xs cursor-pointer"
                title="Đăng xuất khỏi hệ thống"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Body with generous bottom padding for mobile sticky navigation & safe areas */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 flex-1 pb-28 sm:pb-32 md:pb-8">
        {/* Pending transfer proposals: TPKD/Admin must decide; NVKD sees what is still waiting */}
        {(() => {
          const pendingCount = transferRequests.filter((r) => r.status === 'pending').length;
          if (!pendingCount) return null;
          const isSale = currentUser.role === 'sale';
          return (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span className="flex items-center gap-2 font-semibold"><ArrowRightLeft className="w-4 h-4" />
                {isSale ? `Bạn có ${pendingCount} đề xuất chuyển khách đang chờ TPKD duyệt.` : `Có ${pendingCount} đề xuất chuyển khách đang chờ bạn duyệt.`}
              </span>
              <button type="button" onClick={() => setIsTransferRequestsOpen(true)} className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700">
                {isSale ? 'Xem đề xuất' : 'Xem & duyệt'}
              </button>
            </div>
          );
        })()}

        {/* Executive Dashboard Overview Banner (KPIs, Status Donut Chart & Weekly Performance Bar Chart) */}
        <DashboardOverview
          indicators={indicators}
          leads={scopedLeadsForIndicators}
          activeStatusFilter={activeStatusFilter}
          onSelectStatusFilter={setActiveStatusFilter}
          upcomingAppointmentsCount={upcomingAppointmentsCount}
          salesMembers={salesMembers}
        />

        {/* Bulk Action Bar when leads are selected */}
        {selectedLeadIds.length > 0 && (
          <div className="mb-4 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-2xl p-3 sm:p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center justify-between sm:justify-start gap-2 text-amber-950 font-bold">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                <span>Đang chọn <strong className="text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md font-mono">{selectedLeadIds.length}</strong> khách hàng:</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLeadIds([])}
                className="text-amber-800 hover:text-amber-950 underline font-semibold text-[11px] sm:text-xs ml-auto sm:ml-2 cursor-pointer"
              >
                ✕ Bỏ chọn
              </button>
            </div>

            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {/* Transfer button */}
              <button
                onClick={() => {
                  const targetLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
                  setTransferModalData({ isOpen: true, targetLeads });
                }}
                className="inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 bg-amber-700 hover:bg-amber-800 active:scale-95 text-white rounded-xl font-bold transition-all shadow-2xs"
                title={currentUser.role === 'sale' ? 'Gửi TPKD đề xuất chuyển các khách đã chọn' : 'Chuyển giao khách hàng cho chuyên viên Sale khác'}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>{currentUser.role === 'sale' ? 'Đề xuất chuyển' : 'Bàn giao'} ({selectedLeadIds.length})</span>
              </button>

              {/* Auto distribute selected leads */}
              {(currentUser.role === 'admin' || currentUser.role === 'tpkd') && (
                <button
                  onClick={() => handleAutoDistributeLeads(selectedLeadIds)}
                  className="inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl font-bold transition-all shadow-2xs cursor-pointer"
                  title="Tự động phân bổ đều các khách hàng đang chọn cho các chuyên viên Sale"
                >
                  <Shuffle className="w-3.5 h-3.5 mr-1.5" />
                  <span>Tự chia đều</span>
                </button>
              )}

              <div className="hidden sm:inline-block text-slate-500 font-medium self-center px-1">Đổi:</div>
              <button
                onClick={() => handleBulkUpdateStatus('Tiềm năng')}
                className="min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
              >
                Tiềm năng
              </button>
              <button
                onClick={() => handleBulkUpdateStatus('Hẹn xem BĐS')}
                className="min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-purple-700 font-bold hover:bg-purple-50 active:scale-95 transition-all shadow-2xs"
              >
                Hẹn xem
              </button>
              <button
                onClick={() => handleBulkUpdateStatus('Đã chốt')}
                className="min-h-[38px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-emerald-700 font-bold hover:bg-emerald-50 active:scale-95 transition-all shadow-2xs"
              >
                Đã chốt
              </button>
              {currentUser.role === 'admin' && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 active:scale-95 transition-all shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Xoá ({selectedLeadIds.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* View Switcher Container */}
        {currentView === 'table' && (
          <LeadTable
            leads={filteredLeads}
            onSelectLead={(lead) => setDetailLead(lead)}
            onUpdateLead={handleUpdateLead}
            onUpdateStatus={handleUpdateStatus}
            onDeleteLead={handleDeleteLead}
            onOpenMessageModal={(lead) => setMessagingLead(lead)}
            onScheduleAppointment={handleScheduleFromLead}
            selectedLeadIds={selectedLeadIds}
            onToggleSelectLead={handleToggleSelectLead}
            onSelectAllLeads={handleSelectAllLeads}
            filterProjects={filterProjects}
            onFilterProjectsChange={setFilterProjects}
            filterProject={filterProjects[0] || ''}
            onFilterProjectChange={(proj) => setFilterProjects(proj ? [proj] : [])}
            filterSource={filterSource}
            onFilterSourceChange={setFilterSource}
            filterProductType={filterProductType}
            onFilterProductTypeChange={setFilterProductType}
            filterAssignee={filterAssignee}
            onFilterAssigneeChange={setFilterAssignee}
            currentUser={currentUser}
            salesMembers={salesMembers}
            onOpenInternalChat={handleOpenInternalChat}
            onTransferLead={(targetLeads) => setTransferModalData({ isOpen: true, targetLeads })}
            onAcceptLead={handleAcceptLead}
            onOpenZaloReminder={(lead) => setZaloReminderLead(lead)}
            tpkdFilterScope={tpkdFilterScope}
            onTpkdFilterScopeChange={(scope) => {
              setTpkdFilterScope(scope);
              setFilterAssignee('');
            }}
            tpkdLeadsCount={tpkdLeadsCount}
            nvkdLeadsCount={nvkdLeadsCount}
            deptLeadsCount={departmentLeadsCount}
            dateFilterRange={dateFilterRange}
            onDateFilterRangeChange={setDateFilterRange}
            dateFilterField={dateFilterField}
            onDateFilterFieldChange={setDateFilterField}
            customStartDate={customStartDate}
            onCustomStartDateChange={setCustomStartDate}
            customEndDate={customEndDate}
            onCustomEndDateChange={setCustomEndDate}
            unfilteredLeadsForDateCounts={authorizedLeads}
            distributionPolicy={distributionPolicy}
            onBatchUpdateLeads={handleBatchUpdateLeads}
            onShowToast={showToast}
            filterSla={filterSla}
            onFilterSlaChange={setFilterSla}
            recentlyUpdatedLeadId={recentlyUpdatedStatusLeadId}
          />
        )}

        {currentView === 'pipeline' && (
          <LeadPipeline
            leads={filteredLeads}
            onSelectLead={(lead) => setDetailLead(lead)}
            onUpdateStatus={handleUpdateStatus}
            onOpenMessageModal={(lead) => setMessagingLead(lead)}
            onScheduleAppointment={handleScheduleFromLead}
            currentUser={currentUser}
            salesMembers={salesMembers}
            tpkdFilterScope={tpkdFilterScope}
            onTpkdFilterScopeChange={(scope) => {
              setTpkdFilterScope(scope);
              setFilterAssignee('');
            }}
            tpkdLeadsCount={tpkdLeadsCount}
            nvkdLeadsCount={nvkdLeadsCount}
            deptLeadsCount={departmentLeadsCount}
          />
        )}

        {currentView === 'appointments' && (
          <AppointmentCalendar
            appointments={appointments}
            leads={leads}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
            onSelectLeadById={(leadId) => {
              const target = leads.find((l) => l.id === leadId);
              if (target) setDetailLead(target);
            }}
            currentUser={currentUser}
            onShowToast={showToast}
            prefillLeadId={appointmentPrefillLeadId}
            onPrefillHandled={() => setAppointmentPrefillLeadId(null)}
          />
        )}

        {currentView === 'sales_team' && (
          <SalesTeamView
            salesMembers={salesMembers}
            leads={leads}
            currentUser={currentUser}
            onAddSalesMember={handleAddSalesMember}
            onUpdateMemberStatus={(memberId, newStatus) => {
              setSalesMembers(salesMembers.map(s => s.id === memberId ? { ...s, status: newStatus } : s));
              showToast(`Đã đổi trạng thái chuyên viên sale.`);
            }}
            onAutoDistributeUnassigned={() => handleAutoDistributeLeads()}
            onOpenTransferModalForSale={(saleName) => {
              const targetLeads = leads.filter(l => l.assignee === saleName);
              setTransferModalData({ isOpen: true, targetLeads });
            }}
            onSwitchUser={(user) => {
              if (currentUser.role !== 'admin') {
                showToast('Chỉ Quản trị viên mới có quyền chuyển đổi tài khoản!');
                return;
              }
              setCurrentUser(user);
              showToast(`Đã chuyển sang tài khoản "${user.name}"`);
            }}
            onOpenSyncNvkdModal={currentUser.role === 'admin' ? () => setIsSyncNvkdModalOpen(true) : undefined}
            onOpenChangePasswordModal={(member) =>
              setChangePasswordData({
                isOpen: true,
                user: member,
                isForcedFirstLogin: Boolean(member.mustChangePassword)
              })
            }
            onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
            onTriggerSlaCheck={handleTriggerSlaSweep}
            onOpenSundayReportModal={() => setIsSundayReportModalOpen(true)}
            onOpenWeeklyPdfModal={handleOpenWeeklyPdfModal}
            policy={distributionPolicy}
            onOpenPersonalPerformance={handleOpenPersonalPerformance}
          />
        )}

        {currentView === 'performance_overview' && (
          <PerformanceOverview
            leads={authorizedLeads}
            salesMembers={salesMembers}
            currentUser={currentUser}
            appointments={appointments}
            onOpenPersonalPerformance={handleOpenPersonalPerformance}
            onOpenAddLead={() => setIsAddModalOpen(true)}
            onOpenWeeklyPdfModal={handleOpenWeeklyPdfModal}
            onNavigateToLeads={(filter) => {
              if (filter.project) {
                setFilterProjects([filter.project]);
              }
              if (filter.status) {
                setActiveStatusFilter(filter.status);
              }
              if (filter.assignee) {
                setFilterAssignee(filter.assignee);
              }
              setCurrentView('table');
            }}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsView 
            leads={authorizedLeads} 
            salesMembers={salesMembers}
            currentUser={currentUser}
            onSelectSale={(saleName) => {
              setFilterAssignee(saleName);
              setCurrentView('table');
            }}
            onNavigateToSmartReports={() => setCurrentView('smart_reports')}
            onNavigateToLeads={(filter) => {
              if (filter.project) {
                setFilterProjects([filter.project]);
              }
              if (filter.status) {
                setActiveStatusFilter(filter.status);
              }
              if (filter.assignee) {
                setFilterAssignee(filter.assignee);
              }
              setCurrentView('table');
            }}
            onOpenAddLead={() => setIsAddModalOpen(true)}
          />
        )}

        {currentView === 'smart_reports' && (
          <SmartMarketingReports
            leads={authorizedLeads}
            currentUser={currentUser}
            onOpenAddLead={() => setIsAddModalOpen(true)}
            onNavigateToLeads={(filter) => {
              if (filter.dataSource) {
                setFilterSource(filter.dataSource);
              }
              if (filter.project) {
                setFilterProjects([filter.project]);
              }
              if (filter.status) {
                setActiveStatusFilter(filter.status);
              }
              setCurrentView('table');
            }}
          />
        )}

        {currentView === 'system_logs' && (
          <SystemLogsView
            logs={systemLogs}
            salesMembers={salesMembers}
            currentUser={currentUser}
            onRefreshLogs={loadSystemLogs}
            onNavigateToLeads={() => setCurrentView('table')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-xs text-slate-500 mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-800">SALEPRO HCM_E05</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">BĐS PRO</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Quản trị lead • Tự động phân bổ kinh doanh Round-Robin • Đăng nhập riêng từng sale</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleResetData}
              className="text-slate-400 hover:text-slate-700 flex items-center transition-colors"
              title="Khôi phục dữ liệu mẫu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Khôi phục dữ liệu mẫu
            </button>
            <span>•</span>
            <span>Tự động lưu trình duyệt</span>
          </div>
        </div>
      </footer>

      {/* Desktop Floating Quick Chat Button (Always accessible) */}
      <div className="fixed right-6 bottom-6 z-30 hidden md:block">
        <button
          id="desktop-floating-chat-btn"
          onClick={() => handleOpenInternalChat()}
          className="group flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all border-2 border-white/80 cursor-pointer"
          title="Mở kênh trao đổi nội bộ TPKD & NVKD"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 text-amber-300" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center px-1 border-2 border-white shadow-xs animate-pulse">
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </div>
          <span className="font-extrabold text-xs tracking-tight">Chat TPKD &amp; NVKD</span>
        </button>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar & FAB for Handheld Devices */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        upcomingAppointmentsCount={upcomingAppointmentsCount}
        salesCount={salesMembers.length}
        unreadChatCount={unreadChatCount}
        onOpenInternalChat={() => handleOpenInternalChat()}
        onOpenSettings={() => handleOpenSettings('zalo_templates')}
        currentUserRole={currentUser.role}
        onOpenAdminCmsTab={(tab) => {
          setAdminCmsInitialTab(tab);
          setIsAdminCmsModalOpen(true);
        }}
      />

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLead={handleAddLead}
        nextStt={leads.length + 1}
        currentUser={currentUser}
        salesMembers={salesMembers}
        leads={leads}
        onShowToast={showToast}
        onOpenExistingLead={(lead) => {
          setIsAddModalOpen(false);
          setDetailLead(lead);
        }}
        onOpenInternalChat={(leadId) => {
          handleOpenInternalChat(leadId);
        }}
      />

      <LeadDetailModal
        lead={detailLead}
        onClose={() => setDetailLead(null)}
        onUpdateLead={handleUpdateLead}
        onDeleteLead={handleDeleteLead}
        currentUser={currentUser}
        salesMembers={salesMembers}
        appointments={appointments}
        leads={leads}
        onShowToast={showToast}
        onOpenExistingLead={(lead) => {
          setDetailLead(lead);
        }}
        onOpenInternalChat={(leadId) => {
          handleOpenInternalChat(leadId);
        }}
        onOpenZaloReminder={(lead) => setZaloReminderLead(lead)}
        onOpenMessageModal={(lead) => {
          setDetailLead(null);
          setMessagingLead(lead);
        }}
        onScheduleAppointment={(lead) => {
          setDetailLead(null);
          handleScheduleFromLead(lead);
        }}
        onTransferLead={(lead) => {
          setDetailLead(null);
          setTransferModalData({ isOpen: true, targetLeads: [lead] });
        }}
        onOpenPersonalPerformance={handleOpenPersonalPerformance}
      />

      <QuickMessageModal
        lead={messagingLead}
        onClose={() => setMessagingLead(null)}
        templates={zaloTemplates}
        onOpenTemplateManager={() => handleOpenSettings('zalo_templates')}
        currentUser={currentUser}
      />

      {/* CRM Settings & Quick Zalo Message Templates Modal */}
      <CrmSettingsModal
        isOpen={isSettingsModalOpen || isZaloTemplateModalOpen}
        onClose={() => {
          setIsSettingsModalOpen(false);
          setIsZaloTemplateModalOpen(false);
        }}
        initialTab={settingsInitialTab}
        templates={zaloTemplates}
        onSaveTemplates={handleSaveZaloTemplates}
        currentUser={currentUser}
        kpiPolicy={kpiPolicy}
        onSaveKpiPolicy={setKpiPolicy}
        distributionPolicy={distributionPolicy}
        onSaveDistributionPolicy={setDistributionPolicy}
        onOpenChangePassword={() =>
          setChangePasswordData({
            isOpen: true,
            user: currentUser,
            isForcedFirstLogin: Boolean(currentUser.mustChangePassword)
          })
        }
        onShowToast={showToast}
      />

      {/* Legacy Zalo Quick Message Templates Management Modal fallback */}
      {isZaloTemplateModalOpen && !isSettingsModalOpen && (
        <ZaloTemplateManagementModal
          isOpen={isZaloTemplateModalOpen}
          onClose={() => setIsZaloTemplateModalOpen(false)}
          templates={zaloTemplates}
          onSaveTemplates={handleSaveZaloTemplates}
          currentUser={currentUser}
        />
      )}

      {/* Zalo Reminder Modal */}
      <ZaloReminderModal
        isOpen={Boolean(zaloReminderLead)}
        lead={zaloReminderLead}
        onClose={() => setZaloReminderLead(null)}
        onSaveReminder={handleSaveZaloReminder}
        onDeleteReminder={handleDeleteZaloReminder}
        currentUser={currentUser}
      />

      {/* Zalo Reminder Push Alert Toasts */}
      <ZaloReminderToast
        reminders={activeZaloToasts}
        onDismiss={handleDismissZaloToast}
        onOpenLeadDetail={(leadId) => {
          const target = leads.find((l) => l.id === leadId);
          if (target) setDetailLead(target);
        }}
        onMarkCompleted={handleToastMarkCompleted}
      />

      {/* Callback Reminder Push Alert Toasts */}
      <CallbackReminderToast
        reminders={activeCallbackToasts}
        onDismiss={handleDismissCallbackToast}
        onOpenLeadDetail={(leadId) => {
          const target = leads.find((l) => l.id === leadId);
          if (target) setDetailLead(target);
        }}
        onMarkCompleted={handleToastMarkCallbackCompleted}
        onSnooze={handleToastSnoozeCallback}
      />

      {/* Personal Performance & Lead-to-Meeting Conversion Pie Chart Modal */}
      <PersonalPerformanceModal
        isOpen={isPersonalPerformanceOpen}
        onClose={() => setIsPersonalPerformanceOpen(false)}
        currentUser={currentUser}
        salesMembers={salesMembers}
        leads={leads}
        appointments={appointments}
        initialSaleName={personalPerformanceSaleName || currentUser.name}
        onSelectLead={(ld) => setDetailLead(ld)}
      />

      {currentUser.role === 'admin' && (
        <>
          {/* Sync NVKD Sheet Modal for MAY_TRUONGBV_MH5.19_NVKD_V.1 & Email Onboarding (Admin only) */}
          <SyncNvkdSheetModal
            isOpen={isSyncNvkdModalOpen}
            onClose={() => setIsSyncNvkdModalOpen(false)}
            existingMembers={salesMembers}
            onImportMembers={handleImportNvkdMembers}
            currentUser={currentUser}
          />

          <ImportCsvModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={handleImportLeads}
            currentLeadsCount={leads.length}
            existingLeads={leads}
            salesMembers={salesMembers}
          />

          {/* Google Sheet Sync Modal for MAY_TRUONGBV_MH5.19_CRM_V.1 */}
          <GoogleSheetSyncModal
            isOpen={isGoogleSheetModalOpen}
            onClose={() => setIsGoogleSheetModalOpen(false)}
            onImportLeads={handleImportGoogleSheetLeads}
            currentUser={currentUser}
            salesMembers={salesMembers}
            existingLeadsCount={leads.length}
            existingLeads={leads}
          />

          {/* Database & Backend Management Operations Modal */}
          <DatabaseManagementModal
            isOpen={isDatabaseModalOpen}
            onClose={() => setIsDatabaseModalOpen(false)}
            leads={leads}
            salesMembers={salesMembers}
            onLeadsUpdated={(newLeads) => {
              setLeads(newLeads);
              crmBackend.saveLeads(newLeads);
            }}
            onSalesMembersUpdated={(newMembers) => {
              setSalesMembers(newMembers);
              crmBackend.saveSalesMembers(newMembers);
            }}
            onOpenGoogleSheetSync={() => setIsGoogleSheetModalOpen(true)}
            showToast={showToast}
          />
        </>
      )}

      {/* Change Password Modal (Forced on first login or manual change) */}
      {changePasswordData.user && (
        <ChangePasswordModal
          isOpen={changePasswordData.isOpen}
          onClose={() => {
            if (currentUser && currentUser.mustChangePassword) {
              setCurrentUser((prev) => ({ ...prev, mustChangePassword: false }));
            }
            setChangePasswordData({ isOpen: false, user: null, isForcedFirstLogin: false });
          }}
          user={changePasswordData.user}
          isForcedFirstLogin={changePasswordData.isForcedFirstLogin}
          onSaveNewPassword={handleSaveNewPassword}
        />
      )}

      {/* Auto Distribution & SLA Policy Modal */}
      {currentUser.role === 'admin' && (
        <AutoDistributionPolicyModal
          isOpen={isPolicyModalOpen}
          onClose={() => setIsPolicyModalOpen(false)}
          policy={distributionPolicy}
          onSavePolicy={(newPolicy) => {
            setDistributionPolicy(newPolicy);
            showToast('Đã lưu cấu hình Chính sách phân bổ & SLA thành công!');
          }}
          performanceScores={calculateSalesPerformance(salesMembers, leads)}
          onTriggerSlaCheck={handleTriggerSlaSweep}
        />
      )}

      <TransferRequestsModal
        isOpen={isTransferRequestsOpen}
        onClose={() => setIsTransferRequestsOpen(false)}
        requests={transferRequests}
        salesMembers={salesMembers}
        currentUser={currentUser}
        onDecide={handleDecideTransfer}
      />

      {/* Transfer Lead Modal */}
      <TransferLeadModal
        isOpen={transferModalData.isOpen}
        onClose={() => setTransferModalData({ isOpen: false, targetLeads: [] })}
        leadsToTransfer={transferModalData.targetLeads}
        salesMembers={salesMembers}
        currentUserName={currentUser.name}
        onConfirmTransfer={(leadIds, toAssignee, reason) =>
          handleTransferLeads({ leadIds, toAssignee, reason })
        }
        mode={currentUser.role === 'sale' ? 'request' : 'transfer'}
        onSubmitRequest={handleRequestTransfer}
        onMembersUpdated={(updated) => {
          setSalesMembers(updated);
          try {
            localStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(updated));
          } catch (e) {
            console.error('Failed to save updated sales members', e);
          }
        }}
      />

      {/* Login / User Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        salesMembers={salesMembers}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSelectUser={(user) => {
          if (currentUser.role !== 'admin') {
            showToast('Chỉ Quản trị viên mới có quyền chuyển đổi tài khoản!');
            return;
          }
          setCurrentUser(user);
          showToast(`Đã chuyển sang tài khoản "${user.name}" (${user.role === 'admin' ? 'Quản trị viên' : 'Chuyên viên Sale'})`);
        }}
      />

      {/* Sunday KPI Report & Email Modal (Policy: 2 Zalo/day, 2 Meetings/week -> Sunday Night Email) */}
      <SundayKpiReportModal
        isOpen={isSundayReportModalOpen}
        onClose={() => setIsSundayReportModalOpen(false)}
        salesMembers={salesMembers}
        leads={leads}
        appointments={appointments}
        currentUser={currentUser}
        kpiPolicy={kpiPolicy}
        onUpdatePolicy={(newPolicy) => setKpiPolicy(newPolicy)}
        onShowToast={showToast}
        onOpenWeeklyPdfModal={handleOpenWeeklyPdfModal}
      />

      {/* Weekly Activity PDF Report Modal for Sales to report to superiors */}
      <WeeklyActivityPdfModal
        isOpen={isWeeklyPdfModalOpen}
        onClose={() => {
          setIsWeeklyPdfModalOpen(false);
          setPdfTargetMemberId(undefined);
        }}
        salesMembers={salesMembers}
        leads={leads}
        appointments={appointments}
        currentUser={currentUser}
        onShowToast={showToast}
        defaultMemberId={pdfTargetMemberId}
      />

      {/* Notifications Modal for Sales Lead Upload & SLA Alerts */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onRefreshNotifications={refreshNotifications}
        currentUser={currentUser}
        onSwitchView={(view) => setCurrentView(view)}
      />

      {/* Internal Chat Drawer / Modal (TPKD & NVKD Real-Time Discussion) */}
      <InternalChatDrawer
        isOpen={isChatDrawerOpen}
        onClose={() => {
          setIsChatDrawerOpen(false);
          setChatTargetLeadId(undefined);
        }}
        currentUser={currentUser}
        salesMembers={salesMembers}
        leads={leads}
        onOpenLeadDetail={(targetLead) => {
          setIsChatDrawerOpen(false);
          setDetailLead(targetLead);
        }}
        onShowToast={showToast}
        initialLeadId={chatTargetLeadId}
      />

      {/* Lead Distribution Modal */}
      <LeadDistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        leads={leads}
        filteredLeads={filteredLeads}
        selectedLeadIds={selectedLeadIds}
        salesMembers={salesMembers}
        distributionPolicy={distributionPolicy}
        onDistribute={handleModalDistribute}
      />

      {/* Super Admin CMS, Feature Flags, UI, Manual Lead Upload & Database Management */}
      <AdminCmsModal
        isOpen={isAdminCmsModalOpen}
        onClose={() => setIsAdminCmsModalOpen(false)}
        currentUser={currentUser}
        leads={leads}
        salesMembers={salesMembers}
        initialTab={adminCmsInitialTab}
        onLeadsUpdated={handleBatchUpdateLeads}
        onSalesMembersUpdated={setSalesMembers}
        onShowToast={showToast}
        onConfigUpdated={loadSystemBootstrap}
      />

      {/* In-App Delete & Reset Confirmation Modal */}
      {deleteConfirmState.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {deleteConfirmState.type === 'single' && 'Xác nhận xoá khách hàng'}
                  {deleteConfirmState.type === 'bulk' && 'Xác nhận xoá hàng loạt'}
                  {deleteConfirmState.type === 'reset' && 'Khôi phục dữ liệu ban đầu'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {deleteConfirmState.type === 'reset' ? 'Khôi phục cấu hình hệ thống' : 'Thao tác xoá dữ liệu CRM'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-5 text-xs text-slate-700 leading-relaxed">
              {deleteConfirmState.type === 'single' && (
                <span>
                  Bạn có chắc chắn muốn xoá khách hàng <strong className="text-slate-900 font-bold">"{deleteConfirmState.leadName}"</strong> khỏi hệ thống? Dữ liệu sẽ được đồng bộ và cập nhật lên cơ sở dữ liệu.
                </span>
              )}
              {deleteConfirmState.type === 'bulk' && (
                <span>
                  Bạn có chắc chắn muốn xoá <strong className="text-rose-600 font-bold">{deleteConfirmState.count} khách hàng</strong> đã chọn? Thao tác này không thể hoàn tác.
                </span>
              )}
              {deleteConfirmState.type === 'reset' && (
                <span>
                  Bạn có chắc chắn muốn khôi phục toàn bộ danh sách khách hàng và dữ liệu đội ngũ Sale ban đầu? Các dữ liệu tạm sẽ được đặt lại.
                </span>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmState({ isOpen: false, type: 'single' })}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 font-bold text-xs transition-colors"
              >
                Huỷ bỏ
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs transition-colors inline-flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deleteConfirmState.type === 'reset' ? 'Xác nhận khôi phục' : 'Xác nhận xoá'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
