import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Trash2, 
  Users, 
  Search, 
  Check, 
  Lock, 
  Shield, 
  RefreshCw, 
  Mail, 
  Phone, 
  Briefcase,
  AlertTriangle,
  Edit2,
  KeyRound,
  X,
  UserCheck,
  UserX,
  Target,
  Award,
  Sparkles,
  Database
} from 'lucide-react';
import { SalesMember, Lead } from '../../types';
import { crmBackend } from '../../services/crmBackendService';
import { saveSalesMembersToFirestore } from '../../services/firebaseDb';
import { recordSystemLog } from '../../services/systemLogService';

interface StaffManagementTabProps {
  salesMembers: SalesMember[];
  currentUser: SalesMember;
  leads?: Lead[];
  onSalesMembersUpdated?: (members: SalesMember[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const StaffManagementTab: React.FC<StaffManagementTabProps> = ({
  salesMembers,
  currentUser,
  leads = [],
  onSalesMembersUpdated,
  onShowToast
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'tpkd' | 'sale'>('all');

  // Form states for creating new employee
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'tpkd' | 'sale'>('sale');
  const [teamName, setTeamName] = useState('Khối Kinh Doanh BĐS');
  const [password, setPassword] = useState('CHANGE_ME_BEFORE_USE');
  const [maxDailyLeads, setMaxDailyLeads] = useState(50);
  const [isOnlineForLead, setIsOnlineForLead] = useState(true);

  // Edit employee modal state
  const [editingMember, setEditingMember] = useState<SalesMember | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'tpkd' | 'sale'>('sale');
  const [editTeamName, setEditTeamName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMaxDailyLeads, setEditMaxDailyLeads] = useState(50);
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Mapping member stats
  const memberStatsMap = useMemo(() => {
    const map = new Map<string, { totalLeads: number; wonLeads: number }>();
    leads.forEach((l) => {
      const assigneeKey = (l.assignee || '').toLowerCase().trim();
      const emailKey = (l.assigneeEmail || '').toLowerCase().trim();
      const idKey = l.assignedToId || '';

      salesMembers.forEach((m) => {
        const mName = m.name.toLowerCase().trim();
        const mEmail = m.email.toLowerCase().trim();
        const isMatch = (idKey && idKey === m.id) || (emailKey && emailKey === mEmail) || (assigneeKey && (assigneeKey === mName || assigneeKey.includes(mName)));
        if (isMatch) {
          const curr = map.get(m.id) || { totalLeads: 0, wonLeads: 0 };
          const isWon = l.status === 'Đã chốt' || l.status === 'Đã chốt cọc';
          map.set(m.id, {
            totalLeads: curr.totalLeads + 1,
            wonLeads: curr.wonLeads + (isWon ? 1 : 0)
          });
        }
      });
    });
    return map;
  }, [leads, salesMembers]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return salesMembers.filter((m) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.team && m.team.toLowerCase().includes(q))
      );
    });
  }, [salesMembers, roleFilter, searchTerm]);

  // Statistics counters
  const totalCount = salesMembers.length;
  const activeCount = salesMembers.filter((m) => m.status === 'active' && m.isOnlineForLead !== false).length;
  const adminCount = salesMembers.filter((m) => m.role === 'admin').length;
  const tpkdCount = salesMembers.filter((m) => m.role === 'tpkd').length;
  const salesCount = salesMembers.filter((m) => m.role === 'sale').length;

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      onShowToast?.('Vui lòng điền Họ tên và Email nhân viên.', 'warning');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (salesMembers.some((m) => m.email.toLowerCase().trim() === cleanEmail)) {
      onShowToast?.(`Email "${cleanEmail}" đã tồn tại trong danh bạ nhân sự!`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await crmBackend.createSalesMember({
        fullName: fullName.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role,
        teamName: teamName.trim(),
        password: password.trim(),
        maxDailyLeads: Number(maxDailyLeads) || 50,
        isOnlineForLead
      });

      if (!res.success || !res.member) {
        throw new Error(res.error || 'Lỗi khi lưu nhân viên vào Database');
      }

      const updatedList = [...salesMembers, res.member];
      onSalesMembersUpdated?.(updatedList);
      try {
        localStorage.setItem('crm_bds_sales_v1', JSON.stringify(updatedList));
      } catch {}

      await recordSystemLog({
        action: 'login',
        level: 'info',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetType: 'member',
        targetId: res.member.id,
        targetName: res.member.name,
        summary: `Tự thêm nhân viên mới "${res.member.name}" (${res.member.role.toUpperCase()}) và lưu trực tiếp vào Database.`
      });

      onShowToast?.(`🎉 Đã thêm thành công nhân viên "${res.member.name}" vào Database hệ thống!`, 'success');

      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('CHANGE_ME_BEFORE_USE');
      setIsAdding(false);
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi tạo nhân viên.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleOnline = async (member: SalesMember) => {
    const updatedStatus = member.status === 'active' ? 'paused' : 'active';
    const updatedOnline = !member.isOnlineForLead;

    const updatedList = salesMembers.map((m) =>
      m.id === member.id ? { ...m, status: updatedStatus as any, isOnlineForLead: updatedOnline } : m
    );

    onSalesMembersUpdated?.(updatedList);
    try {
      localStorage.setItem('crm_bds_sales_v1', JSON.stringify(updatedList));
      await crmBackend.saveSalesMembers(updatedList);
      await saveSalesMembersToFirestore(updatedList);
    } catch {}

    onShowToast?.(`Đã đổi trạng thái nhận khách của "${member.name}" sang ${updatedOnline ? 'ĐANG TRỰC' : 'TẠM DỪNG'}.`, 'info');
  };

  const handleOpenEdit = (member: SalesMember) => {
    setEditingMember(member);
    setEditFullName(member.name);
    setEditPhone(member.phone || '');
    setEditRole(member.role || 'sale');
    setEditTeamName(member.team || 'Khối Kinh Doanh BĐS');
    setEditPassword('');
    setEditMaxDailyLeads(member.maxDailyLeads || 50);
    setEditStatus((member.status as any) === 'paused' ? 'paused' : 'active');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setIsSavingEdit(true);
    try {
      const res = await crmBackend.updateSalesMember(editingMember.id, {
        fullName: editFullName.trim(),
        phone: editPhone.trim(),
        role: editRole,
        teamName: editTeamName.trim(),
        password: editPassword.trim() || undefined,
        status: editStatus,
        maxDailyLeads: Number(editMaxDailyLeads) || 50,
        isOnlineForLead: editStatus === 'active'
      });

      if (!res.success) {
        throw new Error(res.error || 'Không thể cập nhật nhân viên');
      }

      const updatedList = salesMembers.map((m) => {
        if (m.id === editingMember.id) {
          return {
            ...m,
            name: editFullName.trim(),
            phone: editPhone.trim(),
            role: editRole,
            team: editTeamName.trim(),
            status: editStatus,
            isOnlineForLead: editStatus === 'active',
            maxDailyLeads: Number(editMaxDailyLeads) || 50,
            title: editRole === 'admin' ? 'Quản trị viên' : editRole === 'tpkd' ? 'Trưởng phòng KD' : 'Chuyên viên Sale'
          };
        }
        return m;
      });

      onSalesMembersUpdated?.(updatedList);
      try {
        localStorage.setItem('crm_bds_sales_v1', JSON.stringify(updatedList));
        await saveSalesMembersToFirestore(updatedList);
      } catch {}

      onShowToast?.(`Đã cập nhật thông tin nhân viên "${editFullName}" vào Database!`, 'success');
      setEditingMember(null);
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi cập nhật nhân viên.', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteEmployee = async (member: SalesMember) => {
    if (member.id === currentUser.id) {
      onShowToast?.('Bạn không thể tự xóa tài khoản của chính mình!', 'warning');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${member.name}" (${member.email}) khỏi Database hệ thống?`)) {
      return;
    }

    try {
      await crmBackend.deleteSalesMember(member.id);
      const updatedList = salesMembers.filter((m) => m.id !== member.id);
      onSalesMembersUpdated?.(updatedList);
      try {
        localStorage.setItem('crm_bds_sales_v1', JSON.stringify(updatedList));
        await saveSalesMembersToFirestore(updatedList);
      } catch {}

      onShowToast?.(`Đã xóa nhân viên "${member.name}" khỏi Database thành công!`, 'success');
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi xóa nhân viên.', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Header */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
              <span>Quản lý & tự thêm nhân viên kinh doanh</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" />
                <span>Lưu trực tiếp vào database</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Tạo tài khoản, phân quyền TPKD/NVKD, cấp mật khẩu, cài đặt định mức lead và lưu hoàn toàn trên cơ sở dữ liệu máy chủ & Firestore
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-950/50 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>{isAdding ? 'Đóng form' : '+ Thêm nhân viên mới'}</span>
        </button>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng nhân sự</span>
            <span className="text-lg font-black text-white">{totalCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Đang trực nhận lead</span>
            <span className="text-lg font-black text-emerald-300">{activeCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">
            <UserCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Trưởng phòng (TPKD)</span>
            <span className="text-lg font-black text-purple-300">{tpkdCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs">
            <Shield className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Chuyên viên (NVKD)</span>
            <span className="text-lg font-black text-blue-300">{salesCount}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center font-bold text-xs">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Inline Add Employee Form */}
      {isAdding && (
        <form onSubmit={handleCreateEmployee} className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-5 space-y-4 animate-in fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h4 className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              <span>Điền thông tin nhân viên mới (tự động lưu vào database)</span>
            </h4>
            <span className="text-[11px] text-slate-400">* Bắt buộc nhập đầy đủ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Họ và tên nhân viên <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Hoàng"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email đăng nhập <span className="text-rose-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: hoang.nv@mayhomes.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0912345678"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Vai trò & quyền hạn
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="sale">Chuyên viên kinh doanh (NVKD)</option>
                <option value="tpkd">Trưởng phòng kinh doanh (TPKD)</option>
                <option value="admin">Quản trị viên (Super Admin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Phòng ban / Đội ngũ
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="VD: Team Chi - MAY_MH5.19"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mật khẩu đăng nhập ban đầu
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="CHANGE_ME_BEFORE_USE"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-800">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOnlineForLead}
                  onChange={(e) => setIsOnlineForLead(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>Bật trạng thái nhận khách tự động (Online)</span>
              </label>
              <span className="text-xs text-slate-400">
                Định mức tối đa: <strong className="text-white">{maxDailyLeads} khách/ngày</strong>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu vào database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu nhân viên vào database</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Staff List Table with Live Search & Role Filter */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {filteredMembers.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Danh sách nhân sự trong database</h4>
              <p className="text-xs text-slate-400">
                {activeCount} đang trực nhận lead • {salesMembers.length - activeCount} tạm dừng
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Role Filter Chips */}
            <div className="flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-0.5 text-[11px]">
              {(['all', 'sale', 'tpkd', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    roleFilter === r ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r === 'all' ? 'Tất cả' : r === 'sale' ? 'NVKD' : r === 'tpkd' ? 'TPKD' : 'Admin'}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm theo tên, email, sđt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 w-full sm:w-52"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px] touch-scroll no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Nhân viên</th>
                <th className="py-2.5 px-3">Email đăng nhập</th>
                <th className="py-2.5 px-3">Số điện thoại</th>
                <th className="py-2.5 px-3">Vai trò</th>
                <th className="py-2.5 px-3">Phòng ban / Đội ngũ</th>
                <th className="py-2.5 px-3 text-center">Khách đang giữ</th>
                <th className="py-2.5 px-3 text-center">Trực nhận lead</th>
                <th className="py-2.5 px-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMembers.map((member) => {
                const stats = memberStatsMap.get(member.id) || { totalLeads: 0, wonLeads: 0 };
                return (
                  <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{member.name}</span>
                          {member.id === currentUser.id && (
                            <span className="text-[10px] text-amber-400 font-semibold">(Tài khoản của bạn)</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono whitespace-nowrap">{member.email}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono whitespace-nowrap">{member.phone || '—'}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          member.role === 'admin'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : member.role === 'tpkd'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {member.role === 'admin' ? 'Super Admin' : member.role === 'tpkd' ? 'TPKD' : 'NVKD'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{member.team || 'Khối BĐS'}</td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-200">
                        <span>{stats.totalLeads} lead</span>
                        {stats.wonLeads > 0 && (
                          <span className="text-emerald-400">({stats.wonLeads} chốt)</span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleOnline(member)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                          member.status === 'active' && member.isOnlineForLead !== false
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            member.status === 'active' && member.isOnlineForLead !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        ></span>
                        <span>{member.status === 'active' && member.isOnlineForLead !== false ? 'Đang Trực' : 'Tạm Dừng'}</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(member)}
                          className="p-1.5 text-slate-400 hover:text-indigo-300 rounded-lg hover:bg-indigo-500/10 transition-colors cursor-pointer"
                          title="Sửa thông tin / Đổi mật khẩu"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {member.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteEmployee(member)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xoá nhân viên khỏi Database"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Employee Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">
                  Sửa nhân viên: <span className="text-indigo-300">{editingMember.name}</span>
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Vai trò</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="sale">NVKD</option>
                    <option value="tpkd">TPKD</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Trạng thái</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Đang trực online</option>
                    <option value="paused">Tạm dừng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Phòng ban / Đội ngũ</label>
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Mật khẩu mới (để trống nếu không đổi)</span>
                  <span className="text-[10px] text-amber-400 font-mono">Tối thiểu 6 ký tự</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-300 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu thay đổi vào database</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
