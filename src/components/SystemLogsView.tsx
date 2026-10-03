import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Trash2, 
  LogIn, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  User, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  ArrowRightLeft, 
  KeyRound, 
  Eye, 
  ChevronRight, 
  X, 
  Layers, 
  Sparkles,
  ShieldAlert,
  Edit3,
  UserCheck,
  Check,
  Building2,
  Table
} from 'lucide-react';
import { SystemLog, SystemLogAction, SystemLogLevel, SalesMember } from '../types';
import { exportLogsToCSV, clearAllSystemLogs } from '../services/systemLogService';

interface SystemLogsViewProps {
  logs: SystemLog[];
  salesMembers: SalesMember[];
  currentUser: SalesMember;
  onRefreshLogs: () => void;
  onNavigateToLeads?: () => void;
}

export const SystemLogsView: React.FC<SystemLogsViewProps> = ({
  logs,
  salesMembers,
  currentUser,
  onRefreshLogs,
  onNavigateToLeads
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('all');
  const [selectedActorFilter, setSelectedActorFilter] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '3days' | '7days'>('all');
  const [selectedLogDetail, setSelectedLogDetail] = useState<SystemLog | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Time formatters
  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' +
             d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  const getRelativeTime = (isoString: string) => {
    try {
      const now = Date.now();
      const past = new Date(isoString).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 45) return 'Vừa xong';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
      return `${Math.floor(diffSec / 86400)} ngày trước`;
    } catch {
      return '';
    }
  };

  // KPIs
  const stats = useMemo(() => {
    const total = logs.length;
    const logins = logs.filter(l => l.action === 'login' || l.action === 'login_failed').length;
    const updates = logs.filter(l => l.action === 'lead_update' || l.action === 'lead_status_change').length;
    const deletes = logs.filter(l => l.action === 'lead_delete' || l.action === 'lead_batch_delete' || l.action === 'lead_bulk_delete').length;
    const transfers = logs.filter(l => l.action === 'lead_transfer' || l.action === 'lead_reassigned_sla').length;
    const dangers = logs.filter(l => l.level === 'danger').length;
    return { total, logins, updates, deletes, transfers, dangers };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter((log) => {
      // 1. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const actorMatch = (log.actorName || '').toLowerCase().includes(q) ||
                           (log.actorEmail || '').toLowerCase().includes(q);
        const targetMatch = (log.targetName || '').toLowerCase().includes(q) ||
                            (log.targetId || '').toLowerCase().includes(q);
        const summaryMatch = (log.summary || '').toLowerCase().includes(q);
        const detailsMatch = log.details ? JSON.stringify(log.details).toLowerCase().includes(q) : false;
        if (!actorMatch && !targetMatch && !summaryMatch && !detailsMatch) return false;
      }

      // 2. Action filter
      if (selectedActionFilter !== 'all') {
        if (selectedActionFilter === 'auth') {
          if (log.action !== 'login' && log.action !== 'logout' && log.action !== 'login_failed' && log.action !== 'password_change') return false;
        } else if (selectedActionFilter === 'delete') {
          if (log.action !== 'lead_delete' && log.action !== 'lead_batch_delete' && log.action !== 'lead_bulk_delete') return false;
        } else if (selectedActionFilter === 'update') {
          if (log.action !== 'lead_update' && log.action !== 'lead_status_change') return false;
        } else if (selectedActionFilter === 'transfer') {
          if (log.action !== 'lead_transfer' && log.action !== 'lead_reassigned_sla') return false;
        } else if (selectedActionFilter === 'sync') {
          if (log.action !== 'sheet_sync' && log.action !== 'csv_import') return false;
        } else if (log.action !== selectedActionFilter) {
          return false;
        }
      }

      // 3. Actor filter
      if (selectedActorFilter !== 'all') {
        if (log.actorName !== selectedActorFilter && log.actorEmail !== selectedActorFilter && log.actorId !== selectedActorFilter) {
          return false;
        }
      }

      // 4. Level filter
      if (selectedLevelFilter !== 'all') {
        if (log.level !== selectedLevelFilter) return false;
      }

      // 5. Date filter
      if (dateRangeFilter !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const diffDays = (now - logTime) / (1000 * 60 * 60 * 24);
        if (dateRangeFilter === 'today' && diffDays > 1) return false;
        if (dateRangeFilter === '3days' && diffDays > 3) return false;
        if (dateRangeFilter === '7days' && diffDays > 7) return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedActionFilter, selectedActorFilter, selectedLevelFilter, dateRangeFilter]);

  // Action badge renderer
  const renderActionBadge = (action: SystemLogAction, level: SystemLogLevel) => {
    switch (action) {
      case 'lead_delete':
      case 'lead_batch_delete':
      case 'lead_bulk_delete':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <Trash2 className="w-3 h-3 text-rose-600 shrink-0" />
            <span>Xoá khách hàng</span>
          </span>
        );
      case 'lead_update':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Edit3 className="w-3 h-3 text-blue-600 shrink-0" />
            <span>Sửa thông tin lead</span>
          </span>
        );
      case 'lead_status_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Đổi trạng thái</span>
          </span>
        );
      case 'lead_create':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Tạo mới lead</span>
          </span>
        );
      case 'lead_transfer':
      case 'lead_reassigned_sla':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <ArrowRightLeft className="w-3 h-3 text-purple-600 shrink-0" />
            <span>Bàn giao / Chuyển Sale</span>
          </span>
        );
      case 'login':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <LogIn className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Đăng nhập</span>
          </span>
        );
      case 'login_failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
            <span>Đăng nhập thất bại</span>
          </span>
        );
      case 'password_change':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <KeyRound className="w-3 h-3 text-amber-700 shrink-0" />
            <span>Đổi mật khẩu</span>
          </span>
        );
      case 'sheet_sync':
      case 'csv_import':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
            <FileSpreadsheet className="w-3 h-3 text-teal-600 shrink-0" />
            <span>Đồng bộ / Nhập dữ liệu</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Info className="w-3 h-3 text-slate-500 shrink-0" />
            <span>{action}</span>
          </span>
        );
    }
  };

  // Role badge
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-amber-200 text-amber-900 uppercase">Admin</span>;
      case 'tpkd':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-rose-200 text-rose-900 uppercase">TPKD</span>;
      case 'sale':
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-blue-100 text-blue-800 uppercase">NVKD</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-slate-200 text-slate-700 uppercase">Hệ thống</span>;
    }
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    await clearAllSystemLogs();
    setIsClearing(false);
    setShowClearConfirm(false);
    onRefreshLogs();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-left">
      {/* Top Banner / Heading */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-amber-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (ADMIN AUDIT)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Nhật ký hệ thống &amp; Giám sát thao tác</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                Live Audit
              </span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Theo dõi toàn bộ lịch sử đăng nhập, hành vi <strong>xoá khách hàng</strong>, <strong>sửa thông tin</strong>, <strong>bàn giao Lead</strong> và đổi mật khẩu của từng nhân viên theo thời gian thực.
            </p>
          </div>

          {/* Action strip */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateToLeads && (
              <button
                type="button"
                onClick={onNavigateToLeads}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Table className="w-3.5 h-3.5 text-slate-400" />
                <span>Về Bảng Lead</span>
              </button>
            )}

            <button
              type="button"
              onClick={onRefreshLogs}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Làm mới dữ liệu nhật ký mới nhất"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => exportLogsToCSV(filteredLogs)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-colors shadow-md cursor-pointer"
              title="Tải toàn bộ nhật ký định dạng Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV ({filteredLogs.length})</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Xóa sạch nhật ký (Quyền Admin)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Xóa nhật ký</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total logs */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Tổng sự kiện</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 font-bold">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Lưu trữ trên hệ thống</div>
        </div>

        {/* Logins */}
        <div 
          onClick={() => setSelectedActionFilter(selectedActionFilter === 'auth' ? 'all' : 'auth')}
          className={`bg-white p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:border-emerald-300 ${
            selectedActionFilter === 'auth' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Lịch sử đăng nhập</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <LogIn className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{stats.logins}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Bấm để lọc đăng nhập</div>
        </div>

        {/* Lead Updates */}
        <div 
          onClick={() => setSelectedActionFilter(selectedActionFilter === 'update' ? 'all' : 'update')}
          className={`bg-white p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:border-blue-300 ${
            selectedActionFilter === 'update' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Sửa / Đổi trạng thái</span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{stats.updates}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-0.5">Bấm để lọc cập nhật</div>
        </div>

        {/* Lead Deletions (Danger) */}
        <div 
          onClick={() => setSelectedActionFilter(selectedActionFilter === 'delete' ? 'all' : 'delete')}
          className={`bg-white p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:border-rose-300 ${
            selectedActionFilter === 'delete' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Xoá khách hàng</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 font-bold">
              <Trash2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{stats.deletes}</div>
          <div className="text-[11px] text-rose-600 font-bold mt-0.5">
            {stats.deletes > 0 ? `🚨 ${stats.deletes} lượt xoá` : 'Không có vụ xoá'}
          </div>
        </div>

        {/* Lead Transfers */}
        <div 
          onClick={() => setSelectedActionFilter(selectedActionFilter === 'transfer' ? 'all' : 'transfer')}
          className={`bg-white p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:border-purple-300 ${
            selectedActionFilter === 'transfer' ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs font-semibold">Bàn giao / Điều chuyển</span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 font-bold">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-700 mt-1">{stats.transfers}</div>
          <div className="text-[11px] text-purple-600 font-medium mt-0.5">Bấm để lọc bàn giao</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên nhân viên, khách, SĐT, hành động..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedActionFilter}
              onChange={(e) => setSelectedActionFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="all">-- Tất cả loại hành động --</option>
              <option value="auth">🔑 Đăng nhập & Xác thực</option>
              <option value="delete">🚨 Xoá khách hàng (Delete)</option>
              <option value="update">✏️ Sửa thông tin & Trạng thái</option>
              <option value="transfer">🔄 Bàn giao / Điều chuyển Sale</option>
              <option value="sync">📊 Đồng bộ Google Sheet / CSV</option>
              <option value="login">✓ Đăng nhập thành công</option>
              <option value="login_failed">⚠️ Đăng nhập thất bại</option>
              <option value="password_change">🔑 Đổi mật khẩu cá nhân</option>
            </select>
          </div>

          {/* Actor / Employee filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedActorFilter}
              onChange={(e) => setSelectedActorFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="all">-- Tất cả nhân viên thực hiện --</option>
              <optgroup label="👑 Ban lãnh đạo & quản trị">
                {salesMembers.filter(m => m.role === 'admin').map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.username || m.email})
                  </option>
                ))}
              </optgroup>
              <optgroup label="💼 Trưởng phòng kinh doanh (TPKD)">
                {salesMembers.filter(m => m.role === 'tpkd').map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} - {m.team}
                  </option>
                ))}
              </optgroup>
              <optgroup label="🤝 Chuyên viên kinh doanh (NVKD)">
                {salesMembers.filter(m => m.role === 'sale').map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} - {m.team}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Date Filter Badges & Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Thời gian:</span>
            </span>
            {(['all', 'today', '3days', '7days'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setDateRangeFilter(r)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  dateRangeFilter === r
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'all' && 'Toàn thời gian'}
                {r === 'today' && 'Hôm nay'}
                {r === '3days' && '3 ngày qua'}
                {r === '7days' && '7 ngày qua'}
              </button>
            ))}
          </div>

          <div className="text-slate-500 font-medium">
            Hiển thị <strong className="text-slate-900 font-bold">{filteredLogs.length}</strong> / {logs.length} nhật ký
          </div>
        </div>
      </div>

      {/* Main Logs Container: Mobile Cards (< md) & Desktop Table (>= md) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Mobile View: Clean, readable log cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-bold text-slate-700 text-sm">Không tìm thấy nhật ký phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác</p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isDanger = log.level === 'danger' || log.action.includes('delete');
              return (
                <div 
                  key={`mobile-${log.id}`} 
                  className={`p-3.5 space-y-2.5 transition-colors ${isDanger ? 'bg-rose-50/40' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                        {log.actorName ? log.actorName.charAt(0) : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 truncate text-xs">
                            {log.actorName || 'Không rõ'}
                          </span>
                          {renderRoleBadge(log.actorRole)}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {log.actorEmail || 'Hệ thống'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-bold text-amber-600">
                        {getRelativeTime(log.timestamp)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatTime(log.timestamp)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {renderActionBadge(log.action, log.level)}
                    {log.targetName && (
                      <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 truncate max-w-[200px]">
                        Khách: {log.targetName}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs leading-relaxed ${isDanger ? 'text-rose-950 font-bold' : 'text-slate-700'}`}>
                    {log.summary}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    {log.targetId ? (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {log.targetId}
                      </span>
                    ) : <span />}

                    <button
                      type="button"
                      onClick={() => setSelectedLogDetail(log)}
                      className="px-3 py-1.5 min-h-[38px] bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-40">Thời gian</th>
                <th className="py-3 px-4 w-52">Nhân sự thực hiện</th>
                <th className="py-3 px-4 w-44">Hành động</th>
                <th className="py-3 px-4 w-48">Đối tượng</th>
                <th className="py-3 px-4">Nội dung chi tiết thao tác</th>
                <th className="py-3 px-4 w-24 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                      <Search className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-slate-700 text-sm">Không tìm thấy nhật ký phù hợp</p>
                    <p className="text-xs text-slate-400 mt-1">Thử xóa bộ lọc hoặc tìm kiếm bằng từ khóa khác</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isDanger = log.level === 'danger' || log.action.includes('delete');
                  return (
                    <tr 
                      key={log.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isDanger ? 'bg-rose-50/30' : ''}`}
                    >
                      {/* 1. Timestamp */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-800 text-xs">
                          {formatTime(log.timestamp)}
                        </div>
                        <div className="text-[11px] text-amber-600 font-medium">
                          {getRelativeTime(log.timestamp)}
                        </div>
                      </td>

                      {/* 2. Actor */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {log.actorName ? log.actorName.charAt(0) : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-slate-900 truncate text-xs">
                                {log.actorName || 'Không rõ'}
                              </span>
                              {renderRoleBadge(log.actorRole)}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {log.actorEmail || 'Hệ thống'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Action */}
                      <td className="py-3 px-4 align-top">
                        {renderActionBadge(log.action, log.level)}
                      </td>

                      {/* 4. Target */}
                      <td className="py-3 px-4 align-top">
                        {log.targetName ? (
                          <div className="font-bold text-slate-800 text-xs truncate max-w-[170px]" title={log.targetName}>
                            {log.targetName}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Toàn bộ</span>
                        )}
                        {log.targetId && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {log.targetId}
                          </div>
                        )}
                      </td>

                      {/* 5. Summary & Context */}
                      <td className="py-3 px-4 align-top">
                        <p className={`text-xs leading-relaxed ${isDanger ? 'text-rose-950 font-bold' : 'text-slate-700'}`}>
                          {log.summary}
                        </p>
                        {log.details && (
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                            {log.details.previousStatus && log.details.newStatus && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Trạng thái: {log.details.previousStatus} → <strong>{log.details.newStatus}</strong>
                              </span>
                            )}
                            {log.details.previousAssignee && log.details.newAssignee && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200">
                                Sale: {log.details.previousAssignee} → <strong>{log.details.newAssignee}</strong>
                              </span>
                            )}
                            {log.ip && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                                IP: {log.ip}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 6. View Details Action */}
                      <td className="py-3 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLogDetail(log)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: LOG DETAIL INSPECTION DRAWER                       */}
      {/* ========================================================= */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl text-left relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi tiết nhật ký hệ thống</h3>
                  <p className="text-xs text-slate-400">Mã sự kiện: <code className="font-mono text-slate-600">{selectedLogDetail.id}</code></p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-xs">Thời điểm thao tác:</span>
                  <strong className="text-slate-800">{formatTime(selectedLogDetail.timestamp)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Khoảng thời gian:</span>
                  <span className="text-amber-700 font-bold">{getRelativeTime(selectedLogDetail.timestamp)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Người thực hiện:</span>
                  <strong className="text-slate-800">{selectedLogDetail.actorName}</strong> ({selectedLogDetail.actorRole})
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Email / Tài khoản:</span>
                  <span className="text-slate-700">{selectedLogDetail.actorEmail || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-xs mb-1">Hành động ghi nhận:</span>
                <div className="flex items-center gap-2">
                  {renderActionBadge(selectedLogDetail.action, selectedLogDetail.level)}
                  <span className="text-slate-600 font-bold text-xs">{selectedLogDetail.summary}</span>
                </div>
              </div>

              {selectedLogDetail.targetName && (
                <div>
                  <span className="text-slate-400 block text-xs mb-0.5">Đối tượng tác động:</span>
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs">
                    {selectedLogDetail.targetName} {selectedLogDetail.targetId ? `(ID: ${selectedLogDetail.targetId})` : ''}
                  </div>
                </div>
              )}

              {selectedLogDetail.details && Object.keys(selectedLogDetail.details).length > 0 && (
                <div>
                  <span className="text-slate-400 block text-xs mb-1">Dữ liệu chi tiết đính kèm:</span>
                  <pre className="p-3 bg-slate-900 text-amber-300 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                    {JSON.stringify(selectedLogDetail.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CLEAR CONFIRMATION                                 */}
      {/* ========================================================= */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Xác nhận xóa toàn bộ nhật ký?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Thao tác này sẽ dọn dẹp sạch toàn bộ lịch sử thao tác đã ghi nhận trong cơ sở dữ liệu. Bạn nên tải bản xuất CSV lưu trữ trước khi xóa.
            </p>

            <div className="mt-6 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleClearLogs}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                {isClearing ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
