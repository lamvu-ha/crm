import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Shield,
  Sliders,
  Palette,
  Database as DbIcon,
  FileText,
  Check,
  AlertTriangle,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Lock,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Info,
  Save,
  CheckCircle2,
  Megaphone,
  Upload,
  Download,
  FileSpreadsheet,
  Users,
  HardDrive,
  Server,
  ArrowRightLeft,
  Search,
  ShieldCheck
} from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { crmBackend, DatabaseStatus } from '../services/crmBackendService';
import { fetchSystemLogs } from '../services/systemLogService';
import { StaffManagementTab } from './admin/StaffManagementTab';
import { CustomerFileUploadTab } from './admin/CustomerFileUploadTab';

interface AdminCmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SalesMember;
  leads?: Lead[];
  salesMembers?: SalesMember[];
  initialTab?: 'customer_file' | 'staff' | 'database' | 'flags' | 'ui' | 'custom_fields' | 'audit_logs';
  onLeadsUpdated?: (leads: Lead[]) => void;
  onSalesMembersUpdated?: (members: SalesMember[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onConfigUpdated?: () => void;
}

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  allowedRoles: string[];
}

interface CustomField {
  id: string;
  entityType: 'LEAD' | 'USER';
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
  isFilterable: boolean;
  isActive: boolean;
}

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: any;
  createdAt: string;
}

export const AdminCmsModal: React.FC<AdminCmsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  leads = [],
  salesMembers = [],
  initialTab,
  onLeadsUpdated,
  onSalesMembersUpdated,
  onShowToast,
  onConfigUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'customer_file' | 'staff' | 'database' | 'flags' | 'ui' | 'custom_fields' | 'audit_logs'>(initialTab || 'customer_file');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Database Tab States
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [isCleaningDemo, setIsCleaningDemo] = useState(false);
  const [isAutoDistributing, setIsAutoDistributing] = useState(false);

  // Feature Flags State
  const [flags, setFlags] = useState<FeatureFlag[]>([]);

  // UI Config State
  const [appTitle, setAppTitle] = useState('SALEPRO HCM_E05');
  const [appSubtitle, setAppSubtitle] = useState('Quản trị lead • Phân bổ kinh doanh • Phễu chốt cọc');
  const [brandTheme, setBrandTheme] = useState('amber');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState('Chiến dịch MAY_MH5.19: Thưởng nóng 50.000.000 VNĐ cho NVKD chốt deal BĐS đầu tiên trong tuần!');
  const [announcementType, setAnnouncementType] = useState<'info' | 'warning' | 'success'>('info');

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'BOOLEAN'>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldFilterable, setNewFieldFilterable] = useState(true);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logFilterAction, setLogFilterAction] = useState<string>('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Fetch all CMS data
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('salepro_token');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'x-user-role': 'SUPER_ADMIN',
        'x-user-email': currentUser.email
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch Feature Flags
      fetch('/api/admin/feature-flags', { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.flags) setFlags(data.flags); })
        .catch(() => {});

      // 2. Fetch UI Configs
      fetch('/api/admin/ui-config', { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && Array.isArray(data.configs)) {
            const themeConf = data.configs.find((c: any) => c.sectionKey === 'theme_layout');
            if (themeConf?.data) {
              if (themeConf.data.appTitle) setAppTitle(themeConf.data.appTitle);
              if (themeConf.data.appSubtitle) setAppSubtitle(themeConf.data.appSubtitle);
              if (themeConf.data.brandTheme) setBrandTheme(themeConf.data.brandTheme);
            }
            const bannerConf = data.configs.find((c: any) => c.sectionKey === 'announcement_banner');
            if (bannerConf?.data) {
              setAnnouncementEnabled(Boolean(bannerConf.data.isEnabled));
              if (bannerConf.data.message) setAnnouncementText(bannerConf.data.message);
              if (bannerConf.data.type) setAnnouncementType(bannerConf.data.type);
            }
          }
        })
        .catch(() => {});

      // 3. Fetch Custom Fields
      fetch('/api/admin/custom-fields', { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.fields) setCustomFields(data.fields); })
        .catch(() => {});

      // 4. Fetch Audit Logs with fallback
      try {
        const logsRes = await fetch('/api/admin/audit-logs?limit=300', { headers });
        if (logsRes.ok) {
          const data = await logsRes.json();
          if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
            setAuditLogs(data.logs);
          } else {
            const sysLogs = await fetchSystemLogs();
            setAuditLogs(sysLogs.map(s => ({
              id: s.id,
              userId: s.actorId || 'system',
              userName: s.actorName || 'Quản trị viên',
              userRole: s.actorRole || 'SUPER_ADMIN',
              action: s.action.toUpperCase(),
              targetType: s.targetType || 'SYSTEM',
              targetId: s.targetId,
              details: s.summary || s.details,
              createdAt: s.timestamp || new Date().toISOString()
            })));
          }
        } else {
          const sysLogs = await fetchSystemLogs();
          setAuditLogs(sysLogs.map(s => ({
            id: s.id,
            userId: s.actorId || 'system',
            userName: s.actorName || 'Quản trị viên',
            userRole: s.actorRole || 'SUPER_ADMIN',
            action: s.action.toUpperCase(),
            targetType: s.targetType || 'SYSTEM',
            targetId: s.targetId,
            details: s.summary || s.details,
            createdAt: s.timestamp || new Date().toISOString()
          })));
        }
      } catch {
        const sysLogs = await fetchSystemLogs();
        setAuditLogs(sysLogs.map(s => ({
          id: s.id,
          userId: s.actorId || 'system',
          userName: s.actorName || 'Quản trị viên',
          userRole: s.actorRole || 'SUPER_ADMIN',
          action: s.action.toUpperCase(),
          targetType: s.targetType || 'SYSTEM',
          targetId: s.targetId,
          details: s.summary || s.details,
          createdAt: s.timestamp || new Date().toISOString()
        })));
      }

      // 5. Database Status
      crmBackend.getDatabaseStatus().then(st => setDbStatus(st)).catch(() => {
        setDbStatus({
          status: 'connected',
          databaseEngine: 'Node.js Express + Firestore Dual Engine',
          storageType: 'Centralized Server Store + Cloud Firestore',
          totalLeads: leads.length,
          assignedLeads: leads.filter(l => l.assignee && !l.assignee.toLowerCase().includes('chưa')).length,
          unassignedLeads: leads.filter(l => !l.assignee || l.assignee.toLowerCase().includes('chưa')).length,
          totalSalesMembers: salesMembers.length,
          activeSalesMembers: salesMembers.filter(m => m.status === 'active' && m.role === 'sale').length,
          lastSyncAt: new Date().toISOString()
        });
      });

    } catch (err) {
      console.warn('Error loading CMS data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Toggle Feature Flag
  const handleToggleFlag = async (key: string, currentVal: boolean) => {
    try {
      const token = localStorage.getItem('salepro_token');
      const res = await fetch(`/api/admin/feature-flags/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ isEnabled: !currentVal })
      });

      if (res.ok) {
        setFlags((prev) =>
          prev.map((f) => (f.key === key ? { ...f, isEnabled: !currentVal } : f))
        );
        onShowToast?.(`Đã ${!currentVal ? 'bật' : 'tắt'} tính năng thành công!`, 'success');
        onConfigUpdated?.();
      } else {
        const err = await res.json();
        onShowToast?.(err.error || 'Lỗi cập nhật cờ tính năng.', 'error');
      }
    } catch (e: any) {
      onShowToast?.(e.message || 'Lỗi mạng khi cập nhật cờ tính năng.', 'error');
    }
  };

  // Save UI Config
  const handleSaveUiConfig = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('salepro_token');
      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': 'SUPER_ADMIN',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      await fetch('/api/admin/ui-config/theme_layout', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          data: { appTitle, appSubtitle, brandTheme }
        })
      });

      await fetch('/api/admin/ui-config/announcement_banner', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          data: { isEnabled: announcementEnabled, message: announcementText, type: announcementType }
        })
      });

      onShowToast?.('Đã lưu cấu hình giao diện CMS thành công!', 'success');
      onConfigUpdated?.();
    } catch (e: any) {
      onShowToast?.(e.message || 'Lỗi lưu cấu hình giao diện.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Create Custom Field
  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldLabel.trim()) {
      onShowToast?.('Vui lòng nhập tên trường hiển thị.', 'warning');
      return;
    }

    const fieldKey = newFieldKey.trim() || newFieldLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const options = newFieldType === 'SELECT'
      ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
      : [];

    try {
      const token = localStorage.getItem('salepro_token');
      const res = await fetch('/api/admin/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          entityType: 'LEAD',
          fieldKey,
          fieldLabel: newFieldLabel.trim(),
          fieldType: newFieldType,
          options,
          isRequired: newFieldRequired,
          isFilterable: newFieldFilterable
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCustomFields((prev) => [...prev, data.customField]);
        setIsAddingField(false);
        setNewFieldLabel('');
        setNewFieldKey('');
        setNewFieldOptions('');
        onShowToast?.('Đã tạo trường dữ liệu động thành công!', 'success');
      } else {
        const err = await res.json();
        onShowToast?.(err.error || 'Lỗi tạo trường dữ liệu.', 'error');
      }
    } catch (err: any) {
      onShowToast?.(err.message || 'Lỗi kết nối khi tạo trường.', 'error');
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa trường tùy biến này?')) return;
    try {
      const token = localStorage.getItem('salepro_token');
      const res = await fetch(`/api/admin/custom-fields/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        setCustomFields((prev) => prev.filter((f) => f.id !== id));
        onShowToast?.('Đã xóa trường dữ liệu thành công!', 'success');
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi khi xóa trường.', 'error');
    }
  };

  // Database Tools Handlers
  const handleClearDemoLeads = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn dọn dẹp sạch toàn bộ dữ liệu Lead mẫu (demo)? Các khách hàng thực sẽ được giữ nguyên.')) return;
    setIsCleaningDemo(true);
    try {
      const res = await crmBackend.clearDemoLeads();
      onLeadsUpdated?.(res.leads);
      onShowToast?.(`Đã dọn dẹp sạch dữ liệu demo! Còn lại ${res.remainingCount} khách hàng thực tế.`, 'success');
      fetchData();
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi dọn dẹp demo.', 'error');
    } finally {
      setIsCleaningDemo(false);
    }
  };

  const handleAutoDistributeUnassigned = async () => {
    setIsAutoDistributing(true);
    try {
      const res = await crmBackend.autoDistributeLeads(false, leads);
      onLeadsUpdated?.(res.leads);
      onShowToast?.(`Đã tự động phân bổ ${res.distributedCount} khách hàng cho các chuyên viên đang trực!`, 'success');
      fetchData();
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi phân bổ.', 'error');
    } finally {
      setIsAutoDistributing(false);
    }
  };

  const handleDownloadDbBackup = () => {
    crmBackend.downloadBackup();
    onShowToast?.('Đang tải xuống bản sao lưu toàn bộ cơ sở dữ liệu dạng JSON...', 'info');
  };

  const handleRestoreDbBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        const ok = await crmBackend.restoreBackup(parsed);
        if (ok) {
          if (Array.isArray(parsed.leads)) onLeadsUpdated?.(parsed.leads);
          if (Array.isArray(parsed.salesMembers)) onSalesMembersUpdated?.(parsed.salesMembers);
          onShowToast?.('Khôi phục cơ sở dữ liệu từ file Backup thành công!', 'success');
          fetchData();
        } else {
          onShowToast?.('Không thể áp dụng file sao lưu.', 'error');
        }
      } catch {
        onShowToast?.('File sao lưu JSON không đúng định dạng.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      if (logFilterAction !== 'ALL' && !l.action.toLowerCase().includes(logFilterAction.toLowerCase())) {
        return false;
      }
      if (logSearch) {
        const q = logSearch.toLowerCase();
        const mUser = (l.userName || '').toLowerCase().includes(q);
        const mAct = (l.action || '').toLowerCase().includes(q);
        const mDetails = typeof l.details === 'string' ? l.details.toLowerCase().includes(q) : JSON.stringify(l.details || '').toLowerCase().includes(q);
        if (!mUser && !mAct && !mDetails) return false;
      }
      return true;
    });
  }, [auditLogs, logFilterAction, logSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl h-[95dvh] sm:h-[92vh] max-h-[920px] bg-slate-900 border border-slate-700/80 rounded-xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* ========================================================= */}
        {/* MODAL HEADER: Enterprise Backend Title & Live DB Status   */}
        {/* ========================================================= */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight truncate">
                  Trung tâm quản trị hệ thống & cơ sở dữ liệu
                </h2>
                <span className="px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                  SUPER_ADMIN
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>100% Database (Cloud & Server)</span>
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Tự thêm nhân viên, tải lên tệp khách hàng lưu vào database, cấu hình tính năng & quản trị CMS
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-all border border-transparent hover:border-slate-700 cursor-pointer"
              title="Làm mới dữ liệu từ Database máy chủ"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition-all border border-transparent hover:border-rose-500/30 cursor-pointer"
              title="Đóng bảng quản trị"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABS NAVIGATION BAR                                       */}
        {/* ========================================================= */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full min-w-0 [&>button]:shrink-0">
            
            {/* Tab 1: Upload Riêng File Khách Hàng (Key Request) */}
            <button
              onClick={() => setActiveTab('customer_file')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'customer_file'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-md shadow-amber-950/50 border border-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-200" />
              <span>Tải lên tệp khách hàng</span>
              <span className="px-1.5 py-0.2 text-[9px] font-black rounded-md bg-emerald-400 text-slate-950">
                DB
              </span>
            </button>

            {/* Tab 2: Quản Lý & Tự Thêm Nhân Viên (Key Request) */}
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'staff'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-950/50 border border-indigo-400/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-300" />
              <span>Quản lý nhân viên</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-900/60 text-indigo-200">
                {salesMembers.length}
              </span>
            </button>

            {/* Tab 3: Database & Backup */}
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'database'
                  ? 'bg-slate-700 text-white shadow-md border border-slate-500/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <DbIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
              <span>Cơ sở dữ liệu & sao lưu</span>
            </button>

            {/* Tab 4: Feature Flags */}
            <button
              onClick={() => setActiveTab('flags')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'flags'
                  ? 'bg-amber-600/90 text-white shadow-md shadow-amber-950/50 border border-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span>Cờ tính năng</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-900/60 text-amber-300">
                {flags.length}
              </span>
            </button>

            {/* Tab 5: UI Customization */}
            <button
              onClick={() => setActiveTab('ui')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ui'
                  ? 'bg-amber-600/90 text-white shadow-md shadow-amber-950/50 border border-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span>Tùy biến giao diện</span>
            </button>

            {/* Tab 6: Custom Fields */}
            <button
              onClick={() => setActiveTab('custom_fields')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'custom_fields'
                  ? 'bg-amber-600/90 text-white shadow-md shadow-amber-950/50 border border-amber-400/30'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
              <span>Trường tùy biến</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-900/60 text-amber-300">
                {customFields.length}
              </span>
            </button>

            {/* Tab 7: Audit Logs */}
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit_logs'
                  ? 'bg-rose-600/90 text-white shadow-md shadow-rose-950/50 border border-rose-400/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-300" />
              <span>Nhật ký kiểm toán</span>
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-900/60 text-rose-200">
                {filteredAuditLogs.length}
              </span>
            </button>

          </div>

          <div className="hidden lg:flex items-center space-x-3 text-xs text-slate-400">
            <span>Tổng Leads: <strong className="text-white">{leads.length}</strong></span>
            <span>NVKD: <strong className="text-white">{salesMembers.length}</strong></span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL MAIN CONTENT BODY (Scrollable Container)            */}
        {/* ========================================================= */}
        <div className="flex-1 min-h-0 min-w-0 overflow-y-auto p-3 sm:p-6 bg-slate-900/90 touch-scroll overscroll-contain">

          {/* TAB 1: UPLOAD RIÊNG FILE KHÁCH HÀNG (LƯU DATABASE) */}
          {activeTab === 'customer_file' && (
            <CustomerFileUploadTab
              leads={leads}
              salesMembers={salesMembers}
              currentUser={currentUser}
              onLeadsUpdated={onLeadsUpdated}
              onShowToast={onShowToast}
            />
          )}

          {/* TAB 2: QUẢN LÝ & TỰ THÊM NHÂN VIÊN (LƯU DATABASE) */}
          {activeTab === 'staff' && (
            <StaffManagementTab
              salesMembers={salesMembers}
              currentUser={currentUser}
              leads={leads}
              onSalesMembersUpdated={onSalesMembersUpdated}
              onShowToast={onShowToast}
            />
          )}

          {/* TAB 3: DATABASE ENGINE & BACKUPS */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                        <span>Cơ sở dữ liệu kép (Dual Engine Database)</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🟢 HOẠT ĐỘNG
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Đồng bộ trực tiếp giữa tập tin lưu trữ máy chủ (`leads.json`) và Cloud Firestore Database (không phụ thuộc Google Sheet)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleDownloadDbBackup}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải bản sao lưu JSON</span>
                    </button>
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Khôi phục từ tệp sao lưu</span>
                      <input type="file" accept=".json" onChange={handleRestoreDbBackup} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Tổng số Lead trong DB</span>
                    <span className="text-xl font-black text-white">{leads.length}</span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Khách đã phân công</span>
                    <span className="text-xl font-black text-amber-400">
                      {leads.filter((l) => l.assignee && !l.assignee.toLowerCase().includes('chưa') && l.assignee !== 'Kho khách chung').length}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Khách trong Kho chung</span>
                    <span className="text-xl font-black text-indigo-400">
                      {leads.filter((l) => !l.assignee || l.assignee.toLowerCase().includes('chưa') || l.assignee === 'Kho khách chung').length}
                    </span>
                  </div>
                  <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Tổng Nhân sự Sales</span>
                    <span className="text-xl font-black text-emerald-400">{salesMembers.length}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Dọn dẹp dữ liệu khách hàng mẫu (Demo Leads)</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Xóa các bản ghi demo mẫu, giữ nguyên toàn bộ khách hàng thực đã được lưu vào Database.
                  </p>
                  <button
                    onClick={handleClearDemoLeads}
                    disabled={isCleaningDemo}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {isCleaningDemo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Xoá dữ liệu mẫu demo</span>
                  </button>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                    <span>Tự động phân bổ lại khách chưa gán</span>
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tự động chia đều xoay vòng (Round-Robin) cho các chuyên viên đang trực online trong Database.
                  </p>
                  <button
                    onClick={handleAutoDistributeUnassigned}
                    disabled={isAutoDistributing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md"
                  >
                    {isAutoDistributing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                    <span>Phân bổ lại ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURE FLAGS */}
          {activeTab === 'flags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Quản trị cờ tính năng hệ thống (Feature Flags)</h3>
                  <p className="text-xs text-slate-400">Bật/tắt tính năng theo thời gian thực mà không cần khởi động lại máy chủ</p>
                </div>
              </div>

              <div className="space-y-3">
                {flags.map((flag) => (
                  <div key={flag.key} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{flag.name}</span>
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                          {flag.key}
                        </code>
                      </div>
                      <p className="text-xs text-slate-400">{flag.description || 'Chưa có mô tả'}</p>
                    </div>

                    <button
                      onClick={() => handleToggleFlag(flag.key, flag.isEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        flag.isEnabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          flag.isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: UI CONFIG */}
          {activeTab === 'ui' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white">Tùy biến giao diện & thương hiệu (CMS)</h3>
                <p className="text-xs text-slate-400">Thay đổi tên ứng dụng, tiêu đề phụ và thông báo đẩy toàn hệ thống</p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Tên ứng dụng CRM</label>
                    <input
                      type="text"
                      value={appTitle}
                      onChange={(e) => setAppTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Khẩu hiệu / Tiêu đề phụ</label>
                    <input
                      type="text"
                      value={appSubtitle}
                      onChange={(e) => setAppSubtitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>Thông báo đầu trang toàn hệ thống (Announcement Banner)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={announcementEnabled}
                        onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>Bật hiển thị</span>
                    </label>
                  </div>

                  <textarea
                    rows={2}
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="Nội dung thông báo thưởng nóng hoặc chỉ đạo..."
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleSaveUiConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi giao diện'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CUSTOM FIELDS */}
          {activeTab === 'custom_fields' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Quản lý trường dữ liệu tùy biến (Custom Fields)</h3>
                  <p className="text-xs text-slate-400">Mở rộng cấu trúc thông tin khách hàng bất động sản theo từng chiến dịch</p>
                </div>
                <button
                  onClick={() => setIsAddingField(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm trường mới</span>
                </button>
              </div>

              {isAddingField && (
                <form onSubmit={handleCreateCustomField} className="bg-slate-950/80 border border-amber-500/40 rounded-xl p-4 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-bold text-amber-300 uppercase">Thêm trường dữ liệu động</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Tên hiển thị (*)</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Hướng nhà hợp tuổi"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Mã trường (Field Key)</label>
                      <input
                        type="text"
                        placeholder="VD: huong_nha"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Kiểu dữ liệu</label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      >
                        <option value="TEXT">Văn bản (Text)</option>
                        <option value="NUMBER">Số (Number)</option>
                        <option value="SELECT">Lựa chọn (Select Dropdown)</option>
                        <option value="DATE">Ngày tháng (Date)</option>
                        <option value="BOOLEAN">Đúng / Sai (Checkbox)</option>
                      </select>
                    </div>
                  </div>

                  {newFieldType === 'SELECT' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">Các tùy chọn (cách nhau bởi dấu phẩy)</label>
                      <input
                        type="text"
                        placeholder="Đông Tứ Trạch, Tây Tứ Trạch..."
                        value={newFieldOptions}
                        onChange={(e) => setNewFieldOptions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center space-x-4 text-xs">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldRequired}
                          onChange={(e) => setNewFieldRequired(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span className="text-slate-300">Bắt buộc nhập</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newFieldFilterable}
                          onChange={(e) => setNewFieldFilterable(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span className="text-slate-300">Cho phép lọc</span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingField(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Huỷ bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs"
                      >
                        Lưu Trường Mới
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customFields.map((f) => (
                  <div key={f.id} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white">{f.fieldLabel}</span>
                        <code className="text-[10px] px-1 bg-slate-800 text-amber-300 rounded">{f.fieldKey}</code>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span>Kiểu: <strong className="text-slate-200">{f.fieldType}</strong></span>
                        {f.isRequired && <span className="text-rose-400">• Bắt buộc</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomField(f.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Xóa trường này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <span>Nhật ký kiểm toán toàn hệ thống (Audit Logs)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Theo dõi toàn bộ hoạt động đăng nhập, sửa, xoá, nạp file khách hàng và nhân sự</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={logFilterAction}
                    onChange={(e) => setLogFilterAction(e.target.value)}
                    className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="ALL">Tất cả hành động ({filteredAuditLogs.length})</option>
                    <option value="LOGIN">Đăng nhập</option>
                    <option value="USER">Thao tác Nhân sự</option>
                    <option value="LEAD">Thao tác Lead</option>
                    <option value="IMPORT">Nạp Lead</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm người, thao tác..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none w-48"
                    />
                  </div>
                </div>
              </div>

              {filteredAuditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <FileText className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
                  <p className="text-xs">Không có bản ghi nhật ký kiểm toán nào phù hợp bộ lọc.</p>
                </div>
              ) : (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden max-h-[480px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Thời gian</th>
                        <th className="py-2.5 px-3">Người thực hiện</th>
                        <th className="py-2.5 px-3">Hành động</th>
                        <th className="py-2.5 px-3">Đối tượng</th>
                        <th className="py-2.5 px-3">Chi tiết thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2 px-3 text-slate-400 font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 font-semibold text-white whitespace-nowrap">
                            {log.userName || log.userId}
                            {log.userRole && (
                              <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-slate-800 text-amber-300">
                                {log.userRole}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-mono whitespace-nowrap">
                            {log.targetType} {log.targetId ? `#${log.targetId.slice(-6)}` : ''}
                          </td>
                          <td className="py-2 px-3 text-slate-300 max-w-xs truncate" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
