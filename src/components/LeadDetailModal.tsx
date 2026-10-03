import { CustomerHealth } from './CustomerHealth';
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Building2, 
  User, 
  Tag, 
  DollarSign, 
  Layers,
  Clock, 
  Check, 
  Send,
  PlusCircle,
  FileText,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Smartphone,
  CheckCheck,
  Wand2,
  Loader2,
  Bot,
  Trash2,
  Bell,
  PhoneCall,
  MapPin,
  ArrowUpDown,
  Filter,
  Copy,
  MessageSquareText,
  ListPlus,
  PieChart as PieChartIcon,
  Target,
  AlertOctagon
} from 'lucide-react';
import { Lead, LeadStatus, InteractionLog, SalesMember, Appointment, PeriodicFollowUpReminder } from '../types';
import { getStatusBadgeColor, formatDateVN, getAssigneeRoleInfo } from '../utils/crmCalculations';
import { LEAD_STATUSES, PROJECTS, PRODUCT_TYPES, ASSIGNEES, getAllProductTypes, saveCustomProductType } from '../data/initialData';
import { openGooglePhoneSearch } from '../services/notificationService';
import { correctAndEnhanceText, applyLocalCrmRules } from '../services/aiService';
import { LeadTagBadge, LeadTagPicker } from './LeadTagBadge';
import { PRESET_TAGS, removeTagFromLead, toggleTagOnLead } from '../utils/tagUtils';
import { getZaloChatUrl, formatZaloReminderBadge } from '../services/zaloReminderService';
import { detectScenarioFromStatus, getScenarioConfig } from '../services/zaloTemplateService';
import { 
  formatCallbackReminderBadge, 
  getCleanPhoneTelUrl, 
  deleteStoredCallbackReminder, 
  markCallbackReminderCompleted 
} from '../services/callbackReminderService';
import { CallbackReminderModal } from './CallbackReminderModal';
import { PeriodicFollowUpModal } from './PeriodicFollowUpModal';
import {
  formatPeriodicFollowUpBadge,
  completePeriodicFollowUpCycle,
  pausePeriodicFollowUp,
  resumePeriodicFollowUp,
  deletePeriodicFollowUp,
  playPeriodicFollowUpChime
} from '../services/periodicFollowUpService';
import { LeadInternalChatPanel } from './LeadInternalChatPanel';
import { fetchInternalMessages, getMessagesForLead, CHAT_UPDATE_EVENT } from '../services/internalChatService';
import { CustomerAiAnalysisCard } from './CustomerAiAnalysisCard';
import { findDuplicatePhoneLeads, playDuplicateAlertSound, normalizePhoneNumber, DuplicateCheckResult } from '../utils/phoneDuplicateUtils';
import { DuplicatePhoneWarningModal } from './DuplicatePhoneWarningModal';
import { SaleConversionPieChart } from './SaleConversionPieChart';
import { crmBackendService } from '../services/crmBackendService';

// Gợi ý bullet point nhanh thông dụng cho sale BĐS
const QUICK_NOTE_PRESETS = [
  'Khách tài chính sẵn, cần nhà hẻm xe hơi trung tâm',
  'Đã xem sổ hồng, hẹn cuối tuần dẫn người nhà đi xem',
  'Khách đang cân nhắc đàm phán thêm giá chốt',
  'Cần tư vấn gói vay ngân hàng 30-50%',
  'Ưu tiên nhà hướng Đông Nam / có thang máy',
  'Đã gọi điện tư vấn, hẹn 2 ngày sau gọi lại',
  'Đã gửi định vị & sa bàn dự án qua Zalo',
  'Khách chưa bắt máy, sẽ gọi lại sau',
  'Khách cần thương lượng bớt 100-200 triệu',
  'Khách thích vị trí nhưng chê hẻm trước nhà',
  'Khách yêu cầu gửi thêm danh sách 3 căn tương đương'
];

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
  onOpenMessageModal: (lead: Lead) => void;
  onScheduleAppointment: (lead: Lead) => void;
  onOpenZaloReminder?: (lead: Lead) => void;
  onTransferLead?: (lead: Lead) => void;
  onAcceptLead?: (leadId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  appointments?: Appointment[];
  initialTab?: 'info' | 'history' | 'chat' | 'ai' | 'performance';
  leads?: Lead[];
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
  onOpenExistingLead?: (lead: Lead) => void;
  onOpenInternalChat?: (leadId?: string, targetMemberName?: string) => void;
  onOpenPersonalPerformance?: (saleName?: string) => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onUpdateLead,
  onOpenMessageModal,
  onScheduleAppointment,
  onOpenZaloReminder,
  onTransferLead,
  onAcceptLead,
  onDeleteLead,
  currentUser,
  salesMembers,
  appointments = [],
  initialTab = 'info',
  leads = [],
  onShowToast,
  onOpenExistingLead,
  onOpenInternalChat,
  onOpenPersonalPerformance
}) => {
  if (!lead) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'chat' | 'ai' | 'performance'>(initialTab);
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<'all' | 'call' | 'zalo' | 'appointment' | 'note'>('all');
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [leadChatCount, setLeadChatCount] = useState<number>(0);

  useEffect(() => {
    if (lead?.id) {
      const updateCount = () => {
        fetchInternalMessages().then((msgs) => {
          const related = getMessagesForLead(msgs, lead.id);
          setLeadChatCount(related.length);
        });
      };
      updateCount();
      window.addEventListener(CHAT_UPDATE_EVENT, updateCount);
      return () => {
        window.removeEventListener(CHAT_UPDATE_EVENT, updateCount);
      };
    }
  }, [lead?.id]);

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Lead>({ ...lead });

  useEffect(() => {
    if (lead) {
      setFormData({ ...lead });
      setIsQuickNoteOpen(false);
      setQuickNoteText('');

      // Background freshness sync from backend API
      if (lead.id) {
        crmBackendService.getLeadById(lead.id).then((freshLead) => {
          if (freshLead && freshLead.id === lead.id) {
            setFormData((current) => {
              // Only merge if not currently editing
              if (!isEditing) {
                return { ...current, ...freshLead };
              }
              return current;
            });
          }
        }).catch(() => {});
      }
    }
  }, [lead?.id]);
  const [newLogType, setNewLogType] = useState<InteractionLog['type']>('Cuộc gọi');
  const [newLogContent, setNewLogContent] = useState('');
  const [isAiCorrecting, setIsAiCorrecting] = useState(false);
  const [aiAutoCorrectEnabled, setAiAutoCorrectEnabled] = useState(true);
  const [aiLastChangeNotice, setAiLastChangeNotice] = useState<{ from: string; to: string } | null>(null);
  const [isAiEnhancingNotes, setIsAiEnhancingNotes] = useState(false);
  const [customProductType, setCustomProductType] = useState('');
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [allowDuplicatePhoneEdit, setAllowDuplicatePhoneEdit] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Nhắc nhở gọi lại (Callback Reminder)
  const [isCallbackModalOpen, setIsCallbackModalOpen] = useState(false);

  const handleCompleteCallbackReminder = () => {
    if (!formData.callbackReminder) return;
    const nowStr = new Date().toISOString();
    const completedReminder = markCallbackReminderCompleted(formData.callbackReminder.id) || {
      ...formData.callbackReminder,
      status: 'completed' as const,
      completedAt: nowStr
    };
    const targetDate = new Date(formData.callbackReminder.targetTime);
    const timeFormatted = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')} ngày ${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
    const completedLog: InteractionLog = {
      id: `log-${Date.now()}`,
      date: nowStr.replace('T', ' ').slice(0, 16),
      type: 'Cuộc gọi',
      content: `📞 Đã hoàn tất cuộc gọi hẹn lại (lịch hẹn: ${timeFormatted}) - Ghi chú trước đó: "${formData.callbackReminder.notes || ''}"`,
      author: currentUser?.name || formData.assignee || 'Chuyên viên'
    };
    const currentHistory = formData.history || [];
    const updatedHistory = [completedLog, ...currentHistory];
    const updatedLead: Lead = {
      ...formData,
      callbackReminder: completedReminder,
      history: updatedHistory
    };
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    if (onShowToast) {
      onShowToast('✓ Đã xác nhận hoàn tất cuộc gọi nhắc nhở!', 'success');
    }
  };

  const handleCancelCallbackReminder = () => {
    if (!formData.callbackReminder) return;
    deleteStoredCallbackReminder(formData.callbackReminder.id);
    const updatedLead: Lead = {
      ...formData,
      callbackReminder: undefined
    };
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    if (onShowToast) {
      onShowToast('Đã hủy lịch nhắc gọi lại.', 'info');
    }
  };

  // Nhắc nhở Follow-up định kỳ theo chu kỳ (Periodic Follow-up)
  const [isPeriodicModalOpen, setIsPeriodicModalOpen] = useState(false);

  const handleSavePeriodicFollowUp = (updatedLead: Lead, reminder: PeriodicFollowUpReminder) => {
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    if (onShowToast) {
      onShowToast(
        `✓ Đã cài đặt lịch follow-up định kỳ mỗi ${reminder.cycleDays} ngày! Lần tiếp theo: ${reminder.nextFollowUpDate.split('-').reverse().join('/')}`,
        'success'
      );
    }
  };

  const handleCompletePeriodicFollowUpCycle = (completionNote?: string) => {
    const res = completePeriodicFollowUpCycle(formData, completionNote, currentUser?.name);
    setFormData(res.updatedLead);
    onUpdateLead(res.updatedLead);
    playPeriodicFollowUpChime();
    if (onShowToast) {
      onShowToast(
        `✓ Đã hoàn thành chăm sóc! Đã tự động dời sang chu kỳ kế tiếp (${res.reminder.nextFollowUpDate.split('-').reverse().join('/')})`,
        'success'
      );
    }
  };

  const handleTogglePausePeriodicFollowUp = () => {
    if (!formData.periodicFollowUp) return;
    let updatedLead: Lead;
    if (formData.periodicFollowUp.status === 'active') {
      updatedLead = pausePeriodicFollowUp(formData);
      if (onShowToast) onShowToast('Đã tạm dừng chu kỳ follow-up.', 'info');
    } else {
      updatedLead = resumePeriodicFollowUp(formData);
      if (onShowToast) onShowToast('Đã tiếp tục kích hoạt chu kỳ follow-up.', 'success');
    }
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
  };

  const handleDeletePeriodicFollowUp = (updatedLead: Lead) => {
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    if (onShowToast) {
      onShowToast('Đã hủy lịch follow-up định kỳ.', 'info');
    }
  };

  // Ghi chú nhanh dạng bullet points (Quick Note)
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [includeTimestamp, setIncludeTimestamp] = useState(true);

  const handleAddPresetBullet = (presetText: string) => {
    setQuickNoteText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return presetText;
      return `${trimmed}\n${presetText}`;
    });
  };

  const handleSaveQuickNote = () => {
    const rawText = quickNoteText.trim();
    if (!rawText) return;

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const timeLabel = `[${day}/${month} ${hour}:${minute}]`;

    // Chuẩn hóa từng dòng thành định dạng bullet point •
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const formattedBullets = lines
      .map((line) => {
        const clean = line.replace(/^[•\-\*]\s*/, '');
        if (includeTimestamp) {
          return `• ${timeLabel} ${clean}`;
        }
        return `• ${clean}`;
      })
      .join('\n');

    const existingNotes = (formData.notes || '').trim();
    const newNotes = existingNotes
      ? `${existingNotes}\n${formattedBullets}`
      : formattedBullets;

    const newHistoryEntry = {
      id: `quick-note-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      type: 'Ghi chú nội bộ' as const,
      content: `Ghi chú nhanh: ${lines.join(' | ')}`,
      author: currentUser?.name || formData.assignee || 'Sale'
    };

    const updatedLead: Lead = {
      ...formData,
      notes: newNotes,
      history: [newHistoryEntry, ...(formData.history || [])]
    };

    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    setQuickNoteText('');
    setIsQuickNoteOpen(false);

    if (onShowToast) {
      onShowToast('Đã thêm ghi chú nhanh thành công!', 'success');
    }
  };

  // Check duplicate phone against other leads (excluding this lead itself)
  const duplicatePhoneResult = React.useMemo<DuplicateCheckResult>(() => {
    if (!leads || !formData.phone) return { isDuplicate: false, matchType: 'none', normalizedInputPhone: '', allMatchedLeads: [] };
    return findDuplicatePhoneLeads(formData.phone, leads, formData.id);
  }, [formData.phone, leads, formData.id]);

  const triggerDuplicateToast = (matchedLead: Lead) => {
    if (!onShowToast) return;
    const saleInCharge = matchedLead.assignee || 'Chưa phân bổ';
    onShowToast(
      `Số điện thoại "${formData.phone.trim()}" đã thuộc về khách "${matchedLead.fullName}". Hiện do Sale "${saleInCharge}" phụ trách!`,
      'error',
      {
        title: 'CẢNH BÁO TRÙNG SỐ ĐIỆN THOẠI!',
        saleName: saleInCharge,
        leadName: matchedLead.fullName,
        phone: formData.phone.trim(),
        project: matchedLead.project,
        status: matchedLead.status,
        duration: 10000,
        actionText: 'Xem cảnh báo tranh chấp lead',
        onActionClick: () => {
          setIsDuplicateModalOpen(true);
        }
      }
    );
  };

  const handlePhoneBlur = () => {
    if (duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead) {
      triggerDuplicateToast(duplicatePhoneResult.matchedLead);
      if (!allowDuplicatePhoneEdit) {
        setIsDuplicateModalOpen(true);
      }
    }
  };

  // Track last alerted phone to avoid repeated chime while continuing typing
  const lastAlertedPhoneRef = React.useRef<string>('');

  useEffect(() => {
    setAllowDuplicatePhoneEdit(false);
    const norm = normalizePhoneNumber(formData.phone);
    if (isEditing && duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead && norm.length >= 8) {
      if (lastAlertedPhoneRef.current !== norm) {
        lastAlertedPhoneRef.current = norm;
        playDuplicateAlertSound();
        triggerDuplicateToast(duplicatePhoneResult.matchedLead);
      }
    } else {
      if (!duplicatePhoneResult.isDuplicate) {
        lastAlertedPhoneRef.current = '';
      }
    }
  }, [formData.phone, isEditing, duplicatePhoneResult]);

  const badge = getStatusBadgeColor(formData.status);
  const roleInfo = getAssigneeRoleInfo(formData.assignee, salesMembers, currentUser?.name);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicatePhoneResult.isDuplicate && !allowDuplicatePhoneEdit) {
      if (duplicatePhoneResult.matchedLead) {
        triggerDuplicateToast(duplicatePhoneResult.matchedLead);
        setIsDuplicateModalOpen(true);
      }
      return;
    }

    const finalProduct = (isCustomProduct && customProductType.trim()) 
      ? customProductType.trim() 
      : formData.productType;
    
    if (isCustomProduct && customProductType.trim()) {
      saveCustomProductType(customProductType.trim());
    }

    const updated = {
      ...formData,
      productType: finalProduct as any
    };
    setFormData(updated);
    onUpdateLead(updated);
    setIsEditing(false);
    setIsCustomProduct(false);
    setCustomProductType('');
  };

  const handleAcceptLead = () => {
    if (onAcceptLead) onAcceptLead(formData.id);
    const nowIso = new Date().toISOString();
    const updated = {
      ...formData,
      acceptedAt: nowIso,
      history: [
        {
          id: `accept-log-${Date.now()}`,
          date: nowIso.replace('T', ' ').slice(0, 16),
          type: 'Ghi chú nội bộ' as const,
          content: `Chuyên viên "${formData.assignee}" đã xác nhận TIẾP NHẬN chăm sóc khách hàng`,
          author: formData.assignee
        },
        ...(formData.history || [])
      ]
    };
    setFormData(updated);
    onUpdateLead(updated);
  };

  const handleManualAiCorrect = async () => {
    if (!newLogContent.trim() || isAiCorrecting) return;
    setIsAiCorrecting(true);
    try {
      const res = await correctAndEnhanceText(newLogContent, {
        type: 'interaction_log',
        context: `Khách hàng: ${formData.fullName}, Dự án: ${formData.project || 'Nhà phố'}`
      });
      if (res.correctedText && res.correctedText.trim() !== newLogContent.trim()) {
        setAiLastChangeNotice({ from: newLogContent.trim(), to: res.correctedText.trim() });
        setNewLogContent(res.correctedText.trim());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiCorrecting(false);
    }
  };

  const handleAiEnhanceNotes = async () => {
    const currentNotes = formData.notes || '';
    if (!currentNotes.trim() || isAiEnhancingNotes) return;
    setIsAiEnhancingNotes(true);
    try {
      const res = await correctAndEnhanceText(currentNotes, {
        type: 'lead_notes',
        context: `Dự án: ${formData.project}, Khách: ${formData.fullName}`
      });
      if (res.correctedText && res.correctedText.trim() !== currentNotes.trim()) {
        const updated = { ...formData, notes: res.correctedText.trim() };
        setFormData(updated);
        onUpdateLead(updated);
        setAiLastChangeNotice({ from: currentNotes, to: res.correctedText.trim() });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiEnhancingNotes(false);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogContent.trim()) return;

    let finalContent = newLogContent.trim();
    setIsAiCorrecting(true);

    if (aiAutoCorrectEnabled) {
      try {
        const res = await correctAndEnhanceText(finalContent, {
          type: 'interaction_log',
          context: `Khách hàng: ${formData.fullName}, BĐS: ${formData.project || 'Nhà phố'}`
        });
        if (res.correctedText && res.correctedText.toLowerCase() !== finalContent.toLowerCase()) {
          setAiLastChangeNotice({ from: finalContent, to: res.correctedText });
          finalContent = res.correctedText;
        }
      } catch (err) {
        const local = applyLocalCrmRules(finalContent);
        if (local.changed) {
          finalContent = local.corrected;
        }
      }
    }
    setIsAiCorrecting(false);

    const newLog: InteractionLog = {
      id: `log-${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      type: newLogType,
      content: finalContent,
      author: formData.assignee
    };

    const nowIso = new Date().toISOString();
    const updatedLead: Lead = {
      ...formData,
      acceptedAt: formData.acceptedAt || nowIso,
      firstReportedAt: formData.firstReportedAt || nowIso,
      slaWarning: false,
      history: [newLog, ...(formData.history || [])]
    };

    setFormData(updatedLead);
    onUpdateLead(updatedLead);
    setNewLogContent('');
  };

  const handleToggleZaloConnected = () => {
    const nowIso = new Date().toISOString();
    const isConnecting = !formData.zaloConnected;
    const updatedLead: Lead = {
      ...formData,
      zaloConnected: isConnecting,
      zaloConnectedAt: isConnecting ? nowIso : undefined,
      callStatus: isConnecting ? 'Kết bạn Zalo' : formData.callStatus,
      history: [
        {
          id: `log-${Date.now()}`,
          date: nowIso.replace('T', ' ').slice(0, 16),
          type: 'Zalo' as const,
          content: isConnecting 
            ? 'Đã xác nhận KẾT NỐI ZALO với khách hàng (Tính vào chỉ tiêu KPI: 2 khách Zalo/ngày)'
            : 'Hủy đánh dấu kết nối Zalo',
          author: formData.assignee
        },
        ...(formData.history || [])
      ]
    };
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
  };

  const handleQuickStatus = (newStatus: LeadStatus) => {
    const updatedLead: Lead = {
      ...formData,
      status: newStatus,
      history: [
        {
          id: `log-${Date.now()}`,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          type: 'Ghi chú nội bộ',
          content: `Đổi trạng thái sang: "${newStatus}"`,
          author: formData.assignee
        },
        ...(formData.history || [])
      ]
    };
    setFormData(updatedLead);
    onUpdateLead(updatedLead);
  };

  // Helper to copy text to clipboard
  const handleCopyText = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedLogId(id);
      setTimeout(() => setCopiedLogId(null), 2000);
    } catch {
      // Ignore clipboard fallback
    }
  };

  const parseTimestamp = (dateStr?: string): number => {
    if (!dateStr) return 0;
    try {
      const norm = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const t = new Date(norm).getTime();
      return isNaN(t) ? 0 : t;
    } catch {
      return 0;
    }
  };

  interface UnifiedTimelineEvent {
    id: string;
    timestamp: number;
    dateFormatted: string;
    category: 'call' | 'zalo' | 'appointment' | 'note';
    title: string;
    content: string;
    author: string;
    badgeLabel: string;
    badgeClass: string;
    iconType: 'call' | 'zalo' | 'appointment' | 'note';
    appointmentData?: Appointment;
    phone?: string;
  }

  // 1. History logs
  const historyEvents: UnifiedTimelineEvent[] = (formData.history || []).map((log) => {
    const ts = parseTimestamp(log.date);
    const dateFormatted = log.date;
    const lower = (log.content + ' ' + (log.type || '')).toLowerCase();

    if (
      log.type === 'Cuộc gọi' || 
      lower.includes('gọi') || 
      lower.includes('bắt máy') || 
      lower.includes('nghe máy') ||
      lower.includes('telesale')
    ) {
      return {
        id: log.id,
        timestamp: ts,
        dateFormatted,
        category: 'call',
        title: 'Cuộc gọi trao đổi',
        content: log.content,
        author: log.author,
        badgeLabel: 'Cuộc gọi',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        iconType: 'call',
        phone: formData.phone
      };
    }

    if (
      log.type === 'Zalo' || 
      lower.includes('zalo') ||
      lower.includes('kết bạn')
    ) {
      return {
        id: log.id,
        timestamp: ts,
        dateFormatted,
        category: 'zalo',
        title: 'Tin nhắn / Kết nối Zalo',
        content: log.content,
        author: log.author,
        badgeLabel: 'Tin Zalo',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        iconType: 'zalo',
        phone: formData.phone
      };
    }

    if (
      log.type === 'Gặp mặt / Xem nhà' || 
      lower.includes('xem nhà') || 
      lower.includes('hẹn gặp') ||
      lower.includes('khảo sát') ||
      lower.includes('sa bàn')
    ) {
      return {
        id: log.id,
        timestamp: ts,
        dateFormatted,
        category: 'appointment',
        title: 'Cuộc hẹn xem BĐS / Khảo sát thực tế',
        content: log.content,
        author: log.author,
        badgeLabel: 'Cuộc hẹn',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        iconType: 'appointment',
        phone: formData.phone
      };
    }

    return {
      id: log.id,
      timestamp: ts,
      dateFormatted,
      category: 'note',
      title: log.type || 'Ghi chú nội bộ',
      content: log.content,
      author: log.author,
      badgeLabel: log.type || 'Ghi chú',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      iconType: 'note'
    };
  });

  // 2. Appointments from calendar/system
  const customerAppointments = (appointments || []).filter(
    (a) => a.leadId === formData.id || (a.leadPhone && normalizePhoneNumber(a.leadPhone) === normalizePhoneNumber(formData.phone))
  );

  const appointmentEvents: UnifiedTimelineEvent[] = customerAppointments.map((appt) => {
    const ts = parseTimestamp(`${appt.date}T${appt.time || '09:00'}:00`);
    const dateFormatted = `${appt.date} ${appt.time || ''}`.trim();
    
    let statusClass = 'bg-purple-100 text-purple-800 border-purple-300';
    if (appt.status === 'Đã xem') statusClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    else if (appt.status === 'Khách dời lịch') statusClass = 'bg-amber-100 text-amber-800 border-amber-300';
    else if (appt.status === 'Đã huỷ') statusClass = 'bg-rose-100 text-rose-800 border-rose-300';

    return {
      id: `appt-${appt.id}`,
      timestamp: ts,
      dateFormatted,
      category: 'appointment',
      title: `Cuộc hẹn xem BĐS: ${appt.project}`,
      content: `Địa điểm: ${appt.location}${appt.note ? ` • Ghi chú: "${appt.note}"` : ''}`,
      author: appt.assignee,
      badgeLabel: appt.status,
      badgeClass: statusClass,
      iconType: 'appointment',
      appointmentData: appt,
      phone: appt.leadPhone
    };
  });

  // 3. Zalo Reminder if any
  const reminderEvents: UnifiedTimelineEvent[] = formData.zaloReminder ? [
    {
      id: `rem-${formData.zaloReminder.id}`,
      timestamp: parseTimestamp(formData.zaloReminder.targetTime),
      dateFormatted: formData.zaloReminder.targetTime.replace('T', ' ').slice(0, 16),
      category: 'zalo',
      title: 'Lịch nhắc hẹn Zalo (Thông báo đẩy)',
      content: `Nội dung cần trao đổi: "${formData.zaloReminder.notes}" (Báo trước ${formData.zaloReminder.advanceMinutes} phút)`,
      author: formData.zaloReminder.createdBy || formData.assignee,
      badgeLabel: formData.zaloReminder.status === 'completed' 
        ? 'Đã hoàn thành' 
        : formData.zaloReminder.status === 'triggered' 
          ? 'Đã phát chuông' 
          : 'Đang chờ',
      badgeClass: formData.zaloReminder.status === 'completed' 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
        : 'bg-blue-100 text-blue-800 border-blue-300',
      iconType: 'zalo',
      phone: formData.phone
    }
  ] : [];

  // 4. Callback Reminder if any
  const callbackEvents: UnifiedTimelineEvent[] = formData.callbackReminder ? [
    {
      id: `callrem-${formData.callbackReminder.id}`,
      timestamp: parseTimestamp(formData.callbackReminder.targetTime),
      dateFormatted: formData.callbackReminder.targetTime.replace('T', ' ').slice(0, 16),
      category: 'call',
      title: 'Lịch nhắc nhở gọi lại (Thông báo push)',
      content: `Lý do hẹn gọi lại: "${formData.callbackReminder.notes}" (Báo trước ${formData.callbackReminder.advanceMinutes} phút)`,
      author: formData.callbackReminder.createdBy || formData.assignee,
      badgeLabel: formData.callbackReminder.status === 'completed' 
        ? 'Đã gọi xong' 
        : formData.callbackReminder.status === 'triggered' 
          ? 'Đã phát chuông' 
          : 'Chờ gọi lại',
      badgeClass: formData.callbackReminder.status === 'completed' 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
        : 'bg-amber-100 text-amber-800 border-amber-300',
      iconType: 'call',
      phone: formData.phone
    }
  ] : [];

  // Combine and sort chronologically
  const allEvents = [...historyEvents, ...appointmentEvents, ...reminderEvents, ...callbackEvents].sort((a, b) => {
    if (historySortOrder === 'desc') {
      return b.timestamp - a.timestamp;
    }
    return a.timestamp - b.timestamp;
  });

  const callCount = allEvents.filter((e) => e.category === 'call').length;
  const zaloCount = allEvents.filter((e) => e.category === 'zalo').length;
  const appointmentCount = allEvents.filter((e) => e.category === 'appointment').length;
  const noteCount = allEvents.filter((e) => e.category === 'note').length;
  const totalInteractions = allEvents.length;

  const filteredEvents = historyCategoryFilter === 'all'
    ? allEvents
    : allEvents.filter((e) => e.category === historyCategoryFilter);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92dvh] sm:max-h-[95vh] flex flex-col transition-all">
        
        {/* ================================================================ */}
        {/* MODAL HEADER */}
        {/* ================================================================ */}
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-200 shrink-0 gap-2">
          <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center font-extrabold text-xs sm:text-sm font-mono shadow-2xs shrink-0 mt-0.5">
              #{lead.stt}
            </div>

            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight truncate">
                  {formData.fullName}
                </h2>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${badge.bg} ${badge.text} ${badge.border}`}>
                  {formData.status}
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                  {roleInfo.badgeLabel}
                </span>
              </div>

              {/* Phone & Source Meta */}
              <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs text-slate-500 mt-1">
                <a
                  href={`tel:${formData.phone}`}
                  title="Gọi trực tiếp"
                  className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg border border-emerald-300 transition-colors"
                >
                  <Phone className="w-3 h-3 text-emerald-700" />
                  <span>{formData.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => openGooglePhoneSearch(formData.phone)}
                  title="Tra cứu số điện thoại trên Google"
                  className="hidden sm:inline-flex items-center text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded hover:bg-amber-100 transition-colors"
                >
                  <Search className="w-2.5 h-2.5 mr-0.5 text-amber-700" />
                  Check Google
                </button>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] sm:text-xs text-slate-500">{formatDateVN(formData.date)}</span>
                <span className="text-slate-400">•</span>
                <span className="text-[11px] sm:text-xs text-slate-600 font-medium truncate max-w-[140px] sm:max-w-[200px]">{formData.dataSource}</span>
              </div>

              {/* SLA Reassignment Alert if any */}
              {formData.reassignedCount ? (
                <div className="mt-1.5 inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 leading-snug">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-rose-600 shrink-0" />
                  <span>Khách từng bị thu hồi &amp; chia lại do Sale trước chậm phản hồi (x{formData.reassignedCount})</span>
                </div>
              ) : null}

              {/* Lead Tags in Header */}
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                {Array.isArray(formData.tags) && formData.tags.map((tag) => (
                  <LeadTagBadge
                    key={tag}
                    tag={tag}
                    size="sm"
                    onRemove={(t) => {
                      const updated = removeTagFromLead(formData, t);
                      setFormData(updated);
                      onUpdateLead(updated);
                    }}
                  />
                ))}
                <LeadTagPicker
                  lead={formData}
                  onUpdateLead={(updated) => {
                    setFormData(updated);
                    onUpdateLead(updated);
                  }}
                  showIconOnly={Array.isArray(formData.tags) && formData.tags.length > 0}
                />
              </div>
            </div>
          </div>

          {/* Top Right Clean Controls: Edit & Close */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {currentUser?.role === 'admin' && onDeleteLead && (
              <button
                type="button"
                onClick={() => {
                  onDeleteLead(lead.id);
                }}
                className="hidden sm:inline-flex text-xs font-bold px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 active:scale-95 transition-all shadow-2xs items-center space-x-1"
                title="Xoá khách hàng này khỏi hệ thống (Chỉ Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xoá khách</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing) setIsQuickNoteOpen(false);
              }}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border active:scale-95 transition-all shadow-2xs cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isEditing ? 'Đóng sửa' : 'Sửa'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 flex items-center justify-center font-bold transition-colors cursor-pointer"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* OPTIMIZED CRM ACTION BAR - CLEAN, TOUCH-FRIENDLY & ERGONOMIC */}
        {/* ================================================================ */}
        <div className="py-2.5 sm:py-3 border-b border-slate-200 bg-slate-50/70 -mx-4 sm:-mx-6 px-4 sm:px-6 shrink-0 space-y-2.5">
          
          {/* URGENT ACTION: Tiếp nhận khách (When not accepted yet) */}
          {!formData.acceptedAt && (
            <div className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-3 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-fadeIn">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold leading-tight">Khách mới chưa xác nhận tiếp nhận!</p>
                  <p className="text-[11px] text-emerald-100 mt-0.5">
                    Bấm nhận ngay để giữ quyền chăm sóc và tránh bị hệ thống tự động thu hồi.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAcceptLead}
                className="w-full sm:w-auto px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 text-xs font-extrabold rounded-xl shadow-sm transition-all whitespace-nowrap flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span>Tiếp nhận khách ngay</span>
              </button>
            </div>
          )}

          {/* Active Reminders Banners (Callback & Zalo) */}
          {formData.callbackReminder && formData.callbackReminder.status === 'pending' && (
            <div className="w-full bg-emerald-50 border-2 border-emerald-300 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs animate-fadeIn">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs text-emerald-950">Lịch hẹn gọi lại:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${formatCallbackReminderBadge(formData.callbackReminder).badgeClass}`}>
                      {formatCallbackReminderBadge(formData.callbackReminder).text}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 truncate mt-0.5 font-medium">"{formData.callbackReminder.notes}"</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <a
                  href={`tel:${formData.phone}`}
                  onClick={handleCompleteCallbackReminder}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>Gọi ngay</span>
                </a>
                <button
                  type="button"
                  onClick={handleCompleteCallbackReminder}
                  className="px-2 py-1.5 bg-white text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Đã gọi xong
                </button>
                <button
                  type="button"
                  onClick={() => setIsCallbackModalOpen(true)}
                  className="px-2 py-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Đổi giờ
                </button>
              </div>
            </div>
          )}

          {formData.zaloReminder && formData.zaloReminder.status === 'pending' && (
            <div className="w-full bg-blue-50 border border-blue-200 rounded-xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 animate-wiggle" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-blue-950">Nhắc hẹn Zalo:</span>
                    <span className="text-xs font-bold text-blue-700">{formatZaloReminderBadge(formData.zaloReminder).text}</span>
                  </div>
                  <p className="text-xs text-blue-800 truncate mt-0.5">"{formData.zaloReminder.notes}"</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <a
                  href={getZaloChatUrl(formData.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Mở Zalo</span>
                </a>
                <button
                  type="button"
                  onClick={() => onOpenZaloReminder && onOpenZaloReminder(formData)}
                  className="px-2 py-1.5 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Đổi giờ
                </button>
              </div>
            </div>
          )}

          {/* ROW 1: PRIMARY DIRECT ACTIONS (Large, high-priority, instant reach) */}
          <div className="grid grid-cols-3 gap-2">
            {/* 1. Gọi ngay */}
            <a
              href={`tel:${formData.phone}`}
              className="inline-flex items-center justify-center px-3 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-sm transition-all whitespace-nowrap min-h-[42px] cursor-pointer"
              title="Bấm gọi trực tiếp cho khách hàng"
            >
              <Phone className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Gọi ngay</span>
            </a>

            {/* 2. Zalo Chat */}
            <a
              href={getZaloChatUrl(formData.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-3 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-sm transition-all whitespace-nowrap min-h-[42px] cursor-pointer"
              title="Mở nhắn tin Zalo với số điện thoại này"
            >
              <MessageSquare className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Zalo Chat</span>
            </a>

            {/* 3. Lên lịch hẹn */}
            <button
              type="button"
              onClick={() => onScheduleAppointment(formData)}
              className="inline-flex items-center justify-center px-3 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-sm transition-all whitespace-nowrap min-h-[42px] cursor-pointer"
              title="Lên lịch hẹn xem nhà hoặc tham quan dự án"
            >
              <Calendar className="w-4 h-4 mr-1.5 shrink-0" />
              <span>Hẹn xem</span>
            </button>
          </div>

          {/* ROW 2: SECONDARY ACTIONS TOOLBAR (Scrollable or responsive grid) */}
          <div className="flex flex-wrap items-center gap-1.5 py-0.5">
            {/* Hẹn gọi lại */}
            <button
              type="button"
              onClick={() => setIsCallbackModalOpen(true)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px] ${
                formData.callbackReminder && formData.callbackReminder.status === 'pending'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Đặt lịch nhắc nhở gọi lại"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hẹn gọi lại</span>
            </button>

            {/* Nhắc hẹn Zalo */}
            <button
              type="button"
              onClick={() => onOpenZaloReminder && onOpenZaloReminder(formData)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px] ${
                formData.zaloReminder && formData.zaloReminder.status === 'pending'
                  ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Đặt giờ nhắc hẹn Zalo"
            >
              <Bell className="w-3.5 h-3.5 text-blue-600" />
              <span>Nhắc Zalo</span>
            </button>

            {/* Follow-up chu kỳ */}
            <button
              type="button"
              onClick={() => setIsPeriodicModalOpen(true)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px] ${
                formData.periodicFollowUp && formData.periodicFollowUp.status === 'active'
                  ? 'bg-violet-100 text-violet-950 border-violet-300 font-extrabold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Follow-up định kỳ theo chu kỳ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-violet-600" />
              <span>Follow-up {formData.periodicFollowUp?.status === 'active' ? `(${formData.periodicFollowUp.cycleDays}d)` : ''}</span>
            </button>

            {/* Mẫu tin nhắn SMS/Zalo tư vấn theo tình huống */}
            {(() => {
              const scConfig = getScenarioConfig(detectScenarioFromStatus(formData.status));
              return (
                <button
                  type="button"
                  onClick={() => onOpenMessageModal(formData)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-blue-50/80 text-blue-900 border-blue-200 hover:bg-blue-100 shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px]"
                  title={`Mở kịch bản tin nhắn Zalo theo tình huống: ${scConfig?.label || 'Chăm sóc'}`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kịch bản Zalo {scConfig ? `(${scConfig.label})` : ''}</span>
                </button>
              );
            })()}

            {/* Chat TPKD */}
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-white text-amber-900 border-amber-200 hover:bg-amber-50 shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px]"
              title="Trao đổi nội bộ về khách này"
            >
              <MessageSquareText className="w-3.5 h-3.5 text-amber-600" />
              <span>Chat TPKD</span>
              {leadChatCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-black">
                  {leadChatCount}
                </span>
              )}
            </button>

            {/* Gemini AI */}
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 border-indigo-200 hover:border-indigo-300 shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px]"
              title="Phân tích nhu cầu bằng AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Gemini AI {formData.aiAnalysis ? `(${formData.aiAnalysis.closingProbability}%)` : ''}</span>
            </button>

            {/* Chuyển Sale */}
            {onTransferLead && (
              <button
                type="button"
                onClick={() => onTransferLead(formData)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border bg-white text-slate-700 border-slate-200 hover:bg-slate-100 shrink-0 flex items-center space-x-1.5 transition-all cursor-pointer min-h-[34px]"
                title="Bàn giao khách cho chuyên viên khác"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600" />
                <span>Chuyển Sale</span>
              </button>
            )}
          </div>

          {/* COMPACT WORKFLOW & ZALO KPI BAR (Streamlined into 1 space-saving row) */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-1 px-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="text-[11px] text-slate-500 font-bold shrink-0">Trạng thái:</span>
              {formData.status !== 'Tiềm năng' && (
                <button
                  type="button"
                  onClick={() => handleQuickStatus('Tiềm năng')}
                  className="px-2 py-0.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-lg border border-indigo-200 transition-all shrink-0 cursor-pointer"
                >
                  Tiềm năng
                </button>
              )}
              {formData.status !== 'Hẹn xem BĐS' && (
                <button
                  type="button"
                  onClick={() => handleQuickStatus('Hẹn xem BĐS')}
                  className="px-2 py-0.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-95 rounded-lg border border-purple-200 transition-all shrink-0 cursor-pointer"
                >
                  Hẹn xem BĐS
                </button>
              )}
              {formData.status !== 'Đã chốt' && (
                <button
                  type="button"
                  onClick={() => handleQuickStatus('Đã chốt')}
                  className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-95 rounded-lg border border-emerald-200 transition-all shrink-0 cursor-pointer"
                >
                  Đã chốt
                </button>
              )}
            </div>

            {/* Zalo KPI 1-tap toggle */}
            <button
              type="button"
              onClick={handleToggleZaloConnected}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                formData.zaloConnected
                  ? 'bg-teal-50 text-teal-800 border border-teal-300 hover:bg-teal-100'
                  : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 border border-slate-200'
              }`}
              title="Ghi nhận chỉ tiêu KPI 2 khách kết nối Zalo/ngày"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${formData.zaloConnected ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>{formData.zaloConnected ? 'Đã kết nối Zalo (KPI ✓)' : '+ Đánh dấu Zalo KPI'}</span>
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TABS NAVIGATION: TOUCH-SCROLLABLE ON MOBILE, NO OVERFLOW */}
        {/* ================================================================ */}
        <div className="flex flex-wrap items-center border-b border-slate-200 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 shrink-0 pt-1">
          <div className="flex flex-wrap items-center gap-x-1 sm:gap-x-2 gap-y-1 w-full min-w-0">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 pt-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'info'
                  ? 'border-amber-600 text-amber-800 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Thông tin & Nhu cầu</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 pt-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'history'
                  ? 'border-amber-600 text-amber-800 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Lịch sử chăm sóc</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'history'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {totalInteractions}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className={`pb-2.5 pt-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'chat'
                  ? 'border-amber-600 text-amber-800 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquareText className="w-4 h-4 text-amber-600" />
              <span>Chat TPKD</span>
              {leadChatCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'chat'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {leadChatCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`pb-2.5 pt-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'ai'
                  ? 'border-indigo-600 text-indigo-800 font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-indigo-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gemini AI</span>
              {formData.aiAnalysis ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {formData.aiAnalysis.closingProbability}%
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('performance')}
              className={`pb-2.5 pt-1.5 px-3 font-bold text-xs sm:text-sm flex items-center gap-1.5 border-b-2 transition-all cursor-pointer shrink-0 ${
                activeTab === 'performance'
                  ? 'border-violet-600 text-violet-800 font-extrabold bg-violet-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-violet-700'
              }`}
            >
              <PieChartIcon className="w-4 h-4 text-violet-600" />
              <span>Tỷ lệ Hẹn xem</span>
            </button>
          </div>

          {activeTab === 'info' && totalInteractions > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline hidden sm:flex items-center gap-1 shrink-0"
            >
              <span>Xem {totalInteractions} nhật ký</span>
              <span>➔</span>
            </button>
          )}
        </div>

        {/* ================================================================ */}
        {/* CONTENT BODY */}
        {/* ================================================================ */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto touch-scroll py-3.5 space-y-4 sm:space-y-5 text-xs pr-1 pb-safe">
          
          {/* TAB 1: THÔNG TIN & NHU CẦU */}
          {activeTab === 'info' && (
            <>
              <CustomerHealth lead={formData}/>
              {/* If Editing Mode */}
              {isEditing ? (
            <form onSubmit={handleSaveEdit} className="space-y-3.5 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">Chỉnh sửa thông tin khách hàng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                    <label className="block font-bold text-slate-700">Số điện thoại</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {duplicatePhoneResult.isDuplicate && (
                        <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>TRÙNG SỐ TRONG CRM!</span>
                        </span>
                      )}
                      {!duplicatePhoneResult.isDuplicate && formData.phone.replace(/\D/g, '').length >= 9 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Số hợp lệ</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      onBlur={handlePhoneBlur}
                      className={`w-full pl-3 pr-10 py-2 border rounded-xl text-base sm:text-xs font-mono font-bold focus:outline-none transition-all ${
                        duplicatePhoneResult.isDuplicate
                          ? 'border-rose-600 ring-4 ring-rose-500/20 bg-rose-50/40 text-rose-950 focus:border-rose-600 focus:ring-rose-500/30'
                          : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                      }`}
                      required
                    />

                    {/* Right-side status icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                      {duplicatePhoneResult.isDuplicate ? (
                        <span title="Số điện thoại bị trùng lặp!"><AlertOctagon className="w-5 h-5 text-rose-600 animate-bounce" aria-label="Số điện thoại bị trùng lặp!" /></span>
                      ) : formData.phone.replace(/\D/g, '').length >= 9 ? (
                        <span title="Số điện thoại hợp lệ và chưa trùng"><Check className="w-5 h-5 text-emerald-600" aria-label="Số điện thoại hợp lệ và chưa trùng" /></span>
                      ) : null}
                    </div>
                  </div>

                  {/* Duplicate Phone Warning Box in LeadDetailModal */}
                  {duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead && (
                    <div className="mt-2 p-3 bg-gradient-to-b from-rose-50 to-amber-50/40 border-2 border-rose-400 rounded-2xl text-xs space-y-2 animate-in fade-in duration-150 shadow-xs">
                      <div className="flex items-start gap-2 text-rose-900 font-bold">
                        <div className="p-1 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                          <AlertTriangle className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-rose-950 font-black text-xs sm:text-sm">
                            CẢNH BÁO: SỐ ĐIỆN THOẠI ĐÃ TỒN TẠI TRONG CRM!
                          </span>
                          <p className="font-medium text-[11px] text-rose-800 mt-0.5">
                            Số điện thoại này đã thuộc về khách hàng: <strong>{duplicatePhoneResult.matchedLead.fullName}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 bg-white p-2.5 rounded-xl border border-rose-200 text-rose-900 text-[11px] shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">Sale đang phụ trách:</span>
                          <strong className="text-white bg-rose-700 px-2.5 py-0.5 rounded-md font-black text-xs shadow-2xs">
                            {duplicatePhoneResult.matchedLead.assignee || 'Chưa phân bổ'}
                          </strong>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          Trạng thái: <strong className="text-slate-800">{duplicatePhoneResult.matchedLead.status}</strong>
                        </span>
                      </div>

                      <div className="pt-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {onOpenExistingLead && (
                            <button
                              type="button"
                              onClick={() => {
                                if (duplicatePhoneResult.matchedLead) {
                                  onClose();
                                  onOpenExistingLead(duplicatePhoneResult.matchedLead);
                                }
                              }}
                              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Mở hồ sơ khách trùng</span>
                            </button>
                          )}

                          {onOpenInternalChat && duplicatePhoneResult.matchedLead.assignee && (
                            <button
                              type="button"
                              onClick={() => {
                                if (duplicatePhoneResult.matchedLead) {
                                  onClose();
                                  onOpenInternalChat(duplicatePhoneResult.matchedLead.id, duplicatePhoneResult.matchedLead.assignee);
                                }
                              }}
                              className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-purple-200 transition-all cursor-pointer shadow-2xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                              <span>Chat với {duplicatePhoneResult.matchedLead.assignee}</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsDuplicateModalOpen(true)}
                          className="w-full py-1.5 px-3 bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 hover:from-rose-800 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-amber-200" />
                          <span>Xem cảnh báo tranh chấp &amp; Quy tắc xử lý</span>
                        </button>

                        <div className="pt-1 border-t border-rose-200/80 flex items-center justify-between flex-wrap gap-2">
                          <span className="text-[10px] text-rose-800 font-medium">
                            {!allowDuplicatePhoneEdit ? '⚠️ Cần xác nhận để lưu số điện thoại này' : '✓ Đã đồng ý tiếp tục dùng số này'}
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] font-bold text-rose-950 ml-auto cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-300 shadow-2xs">
                            <input
                              type="checkbox"
                              checked={allowDuplicatePhoneEdit}
                              onChange={(e) => setAllowDuplicatePhoneEdit(e.target.checked)}
                              className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                            <span>Vẫn tiếp tục dùng số này</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tình trạng</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {LEAD_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dự án</label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Loại sản phẩm</label>
                    {isCustomProduct && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        + Sản phẩm mới
                      </span>
                    )}
                  </div>
                  <select
                    value={isCustomProduct ? 'custom' : formData.productType}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setIsCustomProduct(true);
                      } else {
                        setIsCustomProduct(false);
                        setFormData({ ...formData, productType: e.target.value as any });
                      }
                    }}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white cursor-pointer"
                  >
                    {getAllProductTypes([formData]).map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                    <option value="custom">+ Thêm / Nhập sản phẩm mới...</option>
                  </select>
                  {isCustomProduct && (
                    <input
                      type="text"
                      placeholder="Nhập tên loại sản phẩm mới"
                      value={customProductType}
                      onChange={(e) => setCustomProductType(e.target.value)}
                      className="mt-1.5 w-full p-2 border border-amber-400 bg-amber-50/40 focus:bg-white rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Người phụ trách</label>
                  <select
                    value={formData.assignee}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {ASSIGNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Khoảng tài chính</label>
                  <input
                    type="text"
                    value={formData.budget || ''}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="VD: 15 - 20 Tỷ"
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tệp dữ liệu</label>
                  <input
                    type="text"
                    value={formData.dataSource}
                    onChange={(e) => setFormData({ ...formData, dataSource: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Ghi chú nhu cầu</label>
                  {formData.notes && (
                    <button
                      type="button"
                      onClick={handleAiEnhanceNotes}
                      disabled={isAiEnhancingNotes}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-bold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all shadow-2xs"
                    >
                      {isAiEnhancingNotes ? (
                        <Loader2 className="w-3 h-3 text-indigo-600 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-indigo-600 mr-1" />
                      )}
                      <span>{isAiEnhancingNotes ? 'AI đang sửa...' : 'AI Chuẩn hóa chính tả'}</span>
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú nhu cầu, tài chính, yêu cầu cụ thể..."
                  className="w-full p-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Tag selector in edit mode */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Thẻ phân loại khách hàng</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Bấm để gắn / gỡ thẻ nhanh</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {PRESET_TAGS.map((preset) => {
                    const isChecked = Array.isArray(formData.tags) && formData.tags.some((t) => t.toLowerCase() === preset.name.toLowerCase());
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(formData.tags) ? formData.tags : [];
                          const updatedTags = isChecked
                            ? current.filter((t) => t.toLowerCase() !== preset.name.toLowerCase())
                            : [...current, preset.name];
                          setFormData({ ...formData, tags: updatedTags });
                        }}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all active:scale-95 ${
                          isChecked
                            ? `${preset.bg} ${preset.text} ${preset.border} font-bold ring-1 ring-amber-500/50 shadow-2xs`
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                        {isChecked && <Check className="w-3 h-3 ml-0.5 text-emerald-600 stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          ) : (
            /* Lead Details Summary Cards - Enterprise Real Estate Layout */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              <div className="bg-gradient-to-b from-slate-50 to-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center space-x-1 text-slate-500 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Dự án quan tâm</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate" title={formData.project}>
                  {formData.project || 'Chưa chọn'}
                </p>
              </div>

              <div className="bg-gradient-to-b from-slate-50 to-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                <div className="flex items-center space-x-1 text-slate-500 mb-1">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Loại hình BĐS</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate" title={formData.productType}>
                  {formData.productType || 'Chưa xác định'}
                </p>
              </div>

              <div className="bg-gradient-to-b from-amber-50/40 to-white p-2.5 sm:p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                <div className="flex items-center space-x-1 text-amber-700 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Khoảng tài chính</span>
                </div>
                <p className="font-extrabold text-amber-900 text-xs sm:text-sm truncate" title={formData.budget || 'Chưa rõ'}>
                  {formData.budget || 'Chưa rõ'}
                </p>
              </div>

              <div className={`p-2.5 sm:p-3 rounded-xl border shadow-2xs ${roleInfo.isTpkd ? 'bg-purple-50/50 border-purple-200' : 'bg-gradient-to-b from-slate-50 to-white border-slate-200/90'}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1 text-slate-500">
                    <User className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Phụ trách</span>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                    {roleInfo.badgeLabel}
                  </span>
                </div>
                <p className={`font-extrabold text-xs sm:text-sm truncate flex items-center gap-1 ${roleInfo.isTpkd ? 'text-purple-950' : 'text-slate-900'}`} title={formData.assignee}>
                  <span>{formData.assignee}</span>
                </p>
                {/* Shortcut to view personal conversion pie chart */}
                <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('performance')}
                    className="text-[10px] font-bold text-violet-700 hover:text-violet-900 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Xem biểu đồ tỷ lệ chuyển đổi Hẹn xem của chuyên viên này"
                  >
                    <PieChartIcon className="w-3 h-3 text-violet-600" />
                    <span>Tỷ lệ hẹn</span>
                  </button>
                  {onOpenPersonalPerformance && (
                    <button
                      type="button"
                      onClick={() => onOpenPersonalPerformance(formData.assignee)}
                      className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 hover:bg-violet-200 text-violet-800 rounded transition-colors"
                      title="Mở hồ sơ đầy đủ"
                    >
                      Profile ➔
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Ghi chú chính */}
          <div className="bg-amber-50/60 p-3 sm:p-3.5 rounded-xl border border-amber-200/80">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
              <h4 className="font-bold text-slate-900 text-xs flex items-center">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                <span>Nội dung nhu cầu &amp; Ghi chú</span>
              </h4>

              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Nút Ghi chú nhanh (Quick Note) */}
                <button
                  type="button"
                  onClick={() => setIsQuickNoteOpen(!isQuickNoteOpen)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-bold rounded-lg border active:scale-95 transition-all shadow-2xs cursor-pointer ${
                    isQuickNoteOpen
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-white border-amber-300 text-amber-900 hover:bg-amber-100'
                  }`}
                  title="Thêm ghi chú ngắn dạng bullet points mà không cần mở sửa toàn bộ"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>{isQuickNoteOpen ? 'Đóng nhanh' : '+ Ghi chú nhanh'}</span>
                </button>

                {formData.notes && (
                  <button
                    type="button"
                    onClick={handleAiEnhanceNotes}
                    disabled={isAiEnhancingNotes}
                    className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                    title="Ứng dụng AI chuẩn hóa chính tả và thuật ngữ BĐS cho ghi chú này"
                  >
                    {isAiEnhancingNotes ? (
                      <Loader2 className="w-3 h-3 text-amber-600 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-600 mr-1" />
                    )}
                    <span>{isAiEnhancingNotes ? 'AI đang sửa...' : 'AI Chuẩn hóa'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Note Composer Form */}
            {isQuickNoteOpen && (
              <div className="my-2.5 p-3 sm:p-3.5 bg-white border-2 border-amber-400 rounded-xl shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <ListPlus className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">
                      Ghi chú nhanh (Tự động thêm dấu Bullet •)
                    </span>
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTimestamp}
                      onChange={(e) => setIncludeTimestamp(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span>Kèm ngày giờ</span>
                  </label>
                </div>

                {/* Preset suggestions chips */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Gợi ý mẫu nhanh (1 chạm để thêm):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {QUICK_NOTE_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddPresetBullet(preset)}
                        className="text-[10px] sm:text-[11px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input area */}
                <div>
                  <textarea
                    rows={2}
                    value={quickNoteText}
                    onChange={(e) => setQuickNoteText(e.target.value)}
                    placeholder="Nhập nội dung bullet point (VD: Khách cần thương lượng bớt 100tr, cuối tuần xem lại)..."
                    className="w-full p-2.5 border border-amber-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSaveQuickNote();
                      }
                    }}
                  />
                  <div className="text-[10px] text-slate-400 mt-0.5 flex justify-between">
                    <span>Mỗi dòng sẽ được lưu thành 1 bullet point •</span>
                    <span>Phím tắt: Ctrl + Enter để lưu</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickNoteOpen(false);
                      setQuickNoteText('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuickNote}
                    disabled={!quickNoteText.trim()}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-all ${
                      !quickNoteText.trim()
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white cursor-pointer'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu vào ghi chú</span>
                  </button>
                </div>
              </div>
            )}

            {/* Render Notes (Supporting bullet points and clean line breaks) */}
            <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-line space-y-1">
              {formData.notes ? (
                formData.notes.split('\n').map((line, idx) => {
                  const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                  return (
                    <div key={idx} className={isBullet ? 'flex items-start gap-1.5 pl-0.5' : ''}>
                      <span>{line}</span>
                    </div>
                  );
                })
              ) : (
                <span className="text-slate-400 italic">Chưa có ghi chú chi tiết. Bấm nút "+ Ghi chú nhanh" để thêm.</span>
              )}
            </div>
          </div>

            {/* Quick Card redirecting to Tab Lịch sử tương tác */}
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 border border-blue-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-blue-950 text-xs sm:text-sm">
                    Lịch sử tương tác & Chăm sóc ({totalInteractions} sự kiện)
                  </p>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    {callCount} cuộc gọi • {zaloCount} tin Zalo • {appointmentCount} cuộc hẹn xem BĐS
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-2xs shrink-0 cursor-pointer"
              >
                <span>Mở tab Lịch sử tương tác</span>
                <span>➔</span>
              </button>
            </div>

            {/* GEMINI AI CUSTOMER DEMAND & CLOSING ANALYSIS CARD */}
            <CustomerAiAnalysisCard
              lead={formData}
              onUpdateLead={(updated) => {
                setFormData(updated);
                onUpdateLead(updated);
              }}
              onOpenMessageModal={onOpenMessageModal}
            />
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2: LỊCH SỬ TƯƠNG TÁC (CHRONOLOGICAL TIMELINE) */}
        {/* ================================================================ */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* 1. Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setHistoryCategoryFilter(historyCategoryFilter === 'call' ? 'all' : 'call')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  historyCategoryFilter === 'call'
                    ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Cuộc gọi</span>
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-emerald-950 mt-1">
                  {callCount}
                </p>
                <span className="text-[10px] text-slate-400">Cuộc gọi trao đổi</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryCategoryFilter(historyCategoryFilter === 'zalo' ? 'all' : 'zalo')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  historyCategoryFilter === 'zalo'
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Tin Zalo</span>
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-blue-950 mt-1">
                  {zaloCount}
                </p>
                <span className="text-[10px] text-slate-400">Tin nhắn & Kết bạn</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryCategoryFilter(historyCategoryFilter === 'appointment' ? 'all' : 'appointment')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  historyCategoryFilter === 'appointment'
                    ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Cuộc hẹn BĐS</span>
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-purple-950 mt-1">
                  {appointmentCount}
                </p>
                <span className="text-[10px] text-slate-400">Xem nhà & Dự án</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryCategoryFilter(historyCategoryFilter === 'note' ? 'all' : 'note')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  historyCategoryFilter === 'note'
                    ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/40 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">Ghi chú</span>
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <p className="text-base sm:text-lg font-extrabold text-amber-950 mt-1">
                  {noteCount}
                </p>
                <span className="text-[10px] text-slate-400">Nhật ký & Hệ thống</span>
              </button>
            </div>

            {/* 2. Filter Pills & Chronological Sort Order Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 flex items-center mr-1">
                  <Filter className="w-3 h-3 mr-1" />
                  Lọc:
                </span>

                <button
                  type="button"
                  onClick={() => setHistoryCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({totalInteractions})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryCategoryFilter('call')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === 'call'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  📞 Cuộc gọi ({callCount})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryCategoryFilter('zalo')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === 'zalo'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  💬 Zalo ({zaloCount})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryCategoryFilter('appointment')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === 'appointment'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  🏡 Cuộc hẹn ({appointmentCount})
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryCategoryFilter('note')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyCategoryFilter === 'note'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  📝 Ghi chú ({noteCount})
                </button>
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setHistorySortOrder(historySortOrder === 'desc' ? 'asc' : 'desc')}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
                  title="Đổi thứ tự thời gian"
                >
                  <ArrowUpDown className="w-3 h-3 mr-1 text-slate-500" />
                  <span>{historySortOrder === 'desc' ? 'Mới nhất trước ↓' : 'Cũ nhất trước ↑'}</span>
                </button>
              </div>
            </div>

            {/* 3. Form Ghi nhận tương tác mới */}
            <div className="bg-slate-50 p-3 sm:p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
                  <span>Ghi nhận tương tác mới</span>
                </h4>

                {/* AI Auto-Correct Mode Toggle */}
                <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 font-bold cursor-pointer select-none bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-200">
                  <input
                    type="checkbox"
                    checked={aiAutoCorrectEnabled}
                    onChange={(e) => setAiAutoCorrectEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <Sparkles className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span>AI sửa chính tả & viết tắt BĐS</span>
                </label>
              </div>

              {/* AI Change Notice Banner if recently corrected */}
              {aiLastChangeNotice && (
                <div className="p-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 flex items-start justify-between gap-2 text-xs">
                  <div className="flex items-start space-x-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-indigo-950 text-[11px] flex items-center gap-1.5">
                        <span>AI đã chuẩn hóa nội dung:</span>
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-mono">Chuẩn CRM</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                        <span className="line-through text-slate-400">{aiLastChangeNotice.from}</span>
                        <span className="mx-1 font-bold text-indigo-600">➔</span>
                        <span className="font-bold text-slate-900">{aiLastChangeNotice.to}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiLastChangeNotice(null)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleAddLog} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <select
                    value={newLogType}
                    onChange={(e) => setNewLogType(e.target.value as any)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="Cuộc gọi">📞 Cuộc gọi tư vấn</option>
                    <option value="Zalo">💬 Tin nhắn / Trao đổi Zalo</option>
                    <option value="Gặp mặt / Xem nhà">🏡 Dẫn khách xem nhà / Dự án</option>
                    <option value="Gửi báo giá">📑 Gửi báo giá / Mặt bằng</option>
                    <option value="Ghi chú nội bộ">📝 Ghi chú nội bộ</option>
                  </select>
                  <span className="text-[10px] text-slate-400 hidden xs:inline">
                    Gõ tắt: "Khách đ bận", "dt k bat may", "hen t7 xem nha"... AI sẽ tự sửa
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newLogContent}
                      onChange={(e) => setNewLogContent(e.target.value)}
                      placeholder="Nhập nội dung tương tác (VD: Gọi điện khách bận, hẹn tối gọi lại...)"
                      className="w-full pl-3 pr-20 py-2 border border-slate-300 rounded-xl text-base sm:text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                    />
                    {newLogContent.trim() && (
                      <button
                        type="button"
                        onClick={handleManualAiCorrect}
                        disabled={isAiCorrecting}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 active:scale-95 rounded-lg text-[11px] font-extrabold border border-indigo-200 transition-all flex items-center space-x-1"
                        title="Bấm để AI sửa chính tả và giải mã từ viết tắt ngay"
                      >
                        {isAiCorrecting ? (
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                        ) : (
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                        )}
                        <span>{isAiCorrecting ? 'Sửa...' : 'AI sửa'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isAiCorrecting || !newLogContent.trim()}
                    className="px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 active:scale-95 transition-all flex items-center justify-center shadow-xs shrink-0 disabled:opacity-50 min-h-[38px] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Ghi nhận</span>
                  </button>
                </div>

                {/* Quick tap phrases */}
                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Gõ nhanh:</span>
                  {[
                    'Khách hàng đang bận, hẹn gọi lại sau',
                    'Gọi điện thoại không nghe máy',
                    'Hẹn thứ Bảy dẫn khách xem nhà thực tế',
                    'Đã gửi bảng giá & video flycam qua Zalo',
                    'Khách quan tâm căn góc, xin thêm chiết khấu'
                  ].map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => setNewLogContent(phrase)}
                      className="text-[11px] font-medium bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </form>
            </div>

            {/* 4. Unified Chronological Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center">
                  <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                  <span>Dòng thời gian tương tác ({filteredEvents.length} mục)</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  {historySortOrder === 'desc' ? 'Mới nhất trên cùng' : 'Cũ nhất trên cùng'}
                </span>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-slate-500 font-bold text-xs">
                    Chưa có tương tác nào thuộc bộ lọc này.
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    Bấm gọi điện, nhắn Zalo hoặc lên lịch hẹn để ghi nhận vào lịch sử.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {filteredEvents.map((event) => {
                    const isCall = event.category === 'call';
                    const isZalo = event.category === 'zalo';
                    const isAppt = event.category === 'appointment';
                    const isNote = event.category === 'note';

                    return (
                      <div key={event.id} className="relative group">
                        {/* Dot on timeline line */}
                        <div className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
                          isCall 
                            ? 'bg-emerald-500 text-white' 
                            : isZalo 
                              ? 'bg-blue-500 text-white' 
                              : isAppt 
                                ? 'bg-purple-500 text-white' 
                                : 'bg-amber-500 text-white'
                        }`}>
                          {isCall && <Phone className="w-2.5 h-2.5" />}
                          {isZalo && <MessageSquare className="w-2.5 h-2.5" />}
                          {isAppt && <Calendar className="w-2.5 h-2.5" />}
                          {isNote && <FileText className="w-2.5 h-2.5" />}
                        </div>

                        {/* Card Content */}
                        <div className={`p-3 sm:p-3.5 rounded-xl border text-xs space-y-2 bg-white shadow-2xs transition-all hover:shadow-xs ${
                          isCall 
                            ? 'border-emerald-200 hover:border-emerald-300' 
                            : isZalo 
                              ? 'border-blue-200 hover:border-blue-300' 
                              : isAppt 
                                ? 'border-purple-200 hover:border-purple-300' 
                                : 'border-slate-200 hover:border-amber-300'
                        }`}>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${event.badgeClass}`}>
                                {event.badgeLabel}
                              </span>
                              <span className="font-extrabold text-slate-800 text-xs">
                                {event.title}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center space-x-1.5">
                              <span className="font-bold text-slate-600">{event.author}</span>
                              <span>•</span>
                              <span className="font-mono">{event.dateFormatted}</span>
                            </div>
                          </div>

                          {/* Message / Description */}
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
                            {event.content}
                          </p>

                          {/* Bottom Card Actions */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                            <div className="flex items-center space-x-2">
                              {isCall && (
                                <a
                                  href={`tel:${formData.phone}`}
                                  className="px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center space-x-1 transition-colors"
                                >
                                  <Phone className="w-3 h-3 text-emerald-600" />
                                  <span>Gọi lại ({formData.phone})</span>
                                </a>
                              )}

                              {isZalo && (
                                <a
                                  href={getZaloChatUrl(formData.phone)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 flex items-center space-x-1 transition-colors"
                                >
                                  <MessageSquare className="w-3 h-3 text-blue-600" />
                                  <span>Mở Zalo</span>
                                </a>
                              )}

                              {isAppt && (
                                <button
                                  type="button"
                                  onClick={() => onScheduleAppointment(formData)}
                                  className="px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200 flex items-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <Calendar className="w-3 h-3 text-purple-600" />
                                  <span>Lên lịch mới</span>
                                </button>
                              )}
                            </div>

                            {/* Copy content button */}
                            <button
                              type="button"
                              onClick={() => handleCopyText(event.id, event.content)}
                              className="text-slate-400 hover:text-slate-700 font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                              title="Sao chép nội dung tương tác"
                            >
                              {copiedLogId === event.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHAT NỘI BỘ TPKD & NVKD */}
        {activeTab === 'chat' && currentUser && (
          <div className="py-1">
            <LeadInternalChatPanel
              lead={formData}
              currentUser={currentUser}
              salesMembers={salesMembers || []}
            />
          </div>
        )}

        {/* TAB 4: PHÂN TÍCH NHU CẦU & DỰ BÁO CHỐT GEMINI AI */}
        {activeTab === 'ai' && (
          <div className="py-1">
            <CustomerAiAnalysisCard
              lead={formData}
              onUpdateLead={(updated) => {
                setFormData(updated);
                onUpdateLead(updated);
              }}
              onOpenMessageModal={onOpenMessageModal}
            />
          </div>
        )}

        {/* TAB 5: TỶ LỆ CHUYỂN ĐỔI LEAD ➔ HẸN XEM BĐS (RECHARTS PIE CHART) */}
        {activeTab === 'performance' && (
          <div className="py-1 animate-fadeIn">
            <SaleConversionPieChart
              leads={leads}
              saleName={formData.assignee}
              appointments={appointments}
              variant="full"
              onOpenLead={(ld) => {
                if (onOpenExistingLead) {
                  onOpenExistingLead(ld);
                }
              }}
            />
          </div>
        )}
        </div>

        {/* ================================================================ */}
        {/* FOOTER */}
        {/* ================================================================ */}
        <div className="pt-2.5 sm:pt-3 border-t border-slate-200 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-1.5">
            {currentUser?.role === 'admin' && onDeleteLead && (
              <button
                type="button"
                onClick={() => {
                  onDeleteLead(lead.id);
                }}
                className="inline-flex items-center space-x-1.5 px-2.5 sm:px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all active:scale-95 shadow-2xs cursor-pointer"
                title="Xoá khách hàng này (Chỉ Admin)"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xoá khách hàng</span>
                <span className="sm:hidden">Xoá</span>
              </button>
            )}

            {/* Mobile Bottom Quick Direct Connect */}
            <a
              href={`tel:${formData.phone}`}
              className="sm:hidden inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-2xs active:scale-95"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Gọi</span>
            </a>
            <a
              href={getZaloChatUrl(formData.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-2xs active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Zalo</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-5 sm:px-6 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl transition-colors text-center shadow-2xs cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* High-Impact Modal for Duplicate Phone Warning in Edit Mode */}
      <DuplicatePhoneWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        matchedLead={duplicatePhoneResult.matchedLead || null}
        inputPhone={formData.phone}
        currentUserName={currentUser?.name}
        onViewExistingLead={(existingLead) => {
          setIsDuplicateModalOpen(false);
          onClose();
          if (onOpenExistingLead) onOpenExistingLead(existingLead);
        }}
        onOpenChatWithSale={(leadId, saleName) => {
          setIsDuplicateModalOpen(false);
          onClose();
          if (onOpenInternalChat) onOpenInternalChat(leadId, saleName);
        }}
        onConfirmContinue={() => {
          setAllowDuplicatePhoneEdit(true);
          setIsDuplicateModalOpen(false);
          if (onShowToast) {
            onShowToast('Đã cho phép lưu số điện thoại này.', 'warning');
          }
        }}
        allMatchedLeads={duplicatePhoneResult.allMatchedLeads}
      />

      {/* Callback Reminder Modal */}
      <CallbackReminderModal
        isOpen={isCallbackModalOpen}
        lead={formData}
        onClose={() => setIsCallbackModalOpen(false)}
        onSaveReminder={(updatedLead, reminder) => {
          setFormData(updatedLead);
          onUpdateLead(updatedLead);
          // Add interaction log to history
          if (reminder) {
            const targetDate = new Date(reminder.targetTime);
            const timeFormatted = `${targetDate.getHours().toString().padStart(2, '0')}:${targetDate.getMinutes().toString().padStart(2, '0')} ngày ${targetDate.getDate()}/${targetDate.getMonth() + 1}`;
            const logText = `⏰ Đã lên lịch hẹn gọi lại lúc ${timeFormatted} - Ghi chú: "${reminder.notes}"`;
            const currentHistory = formData.history || [];
            const newHistoryItem: InteractionLog = {
              id: `log-${Date.now()}`,
              date: new Date().toISOString().replace('T', ' ').slice(0, 16),
              type: 'Cuộc gọi',
              content: logText,
              author: currentUser?.name || formData.assignee || 'Chuyên viên'
            };
            const updatedHistory = [newHistoryItem, ...currentHistory];
            const leadWithLog: Lead = {
              ...updatedLead,
              history: updatedHistory
            };
            setFormData(leadWithLog);
            onUpdateLead(leadWithLog);
          }
          if (onShowToast) {
            onShowToast('✓ Đã lưu lịch nhắc gọi lại! Hệ thống sẽ gửi thông báo push vào đúng giờ hẹn.', 'success');
          }
        }}
        onDeleteReminder={(updatedLead) => {
          setFormData(updatedLead);
          onUpdateLead(updatedLead);
          if (onShowToast) {
            onShowToast('Đã hủy lịch nhắc gọi lại.', 'info');
          }
        }}
        currentUser={currentUser}
      />
    </div>
  );
};
