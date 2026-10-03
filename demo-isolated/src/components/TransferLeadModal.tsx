import React, { useState, useMemo, useEffect } from 'react';
import { UserCheck, ArrowRight, X, AlertCircle, CheckCircle, ShieldAlert, Users, RefreshCw } from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { TARGET_NVKD_SHEET_NAME, syncNvkdFromDriveFile, getAccessToken } from '../services/googleSheetsService';
import { INITIAL_SALES_MEMBERS } from '../data/salesTeamData';

interface TransferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadsToTransfer: Lead[];
  salesMembers: SalesMember[];
  currentUserName: string;
  onConfirmTransfer: (leadIds: string[], toAssignee: string, reason: string) => void;
  onMembersUpdated?: (members: SalesMember[]) => void;
}

const BANNED_DEMO_NAMES = [
  'trần minh tâm (demo)',
  'nguyễn hoàng nam',
  'lê thanh trúc',
  'trần quốc bảo',
  'phạm minh thư',
  'đỗ hải đăng',
  'vũ tuấn anh'
];

export const TransferLeadModal: React.FC<TransferLeadModalProps> = ({
  isOpen,
  onClose,
  leadsToTransfer,
  salesMembers,
  currentUserName,
  onConfirmTransfer,
  onMembersUpdated
}) => {
  // Ensure all authorized members from personnel roster are present
  const displaySalesList = useMemo(() => {
    const map = new Map<string, SalesMember>();

    // Initial authorized members from official roster
    INITIAL_SALES_MEMBERS.forEach((m) => {
      map.set(m.email.trim().toLowerCase(), m);
    });

    // Merge with current state sales members
    (salesMembers || []).forEach((s) => {
      if (!s || !s.email) return;
      const key = s.email.trim().toLowerCase();
      const existing = map.get(key);
      map.set(key, existing ? { ...existing, ...s } : s);
    });

    const list = Array.from(map.values()).filter((s) => {
      if (!s || !s.name) return false;
      const nameLower = s.name.trim().toLowerCase();
      const emailLower = (s.email || '').trim().toLowerCase();
      if (emailLower.endsWith('@nhaphotrungtam.com.vn')) return false;
      if (BANNED_DEMO_NAMES.some((b) => nameLower === b || (b.length > 5 && nameLower.includes(b)))) return false;
      return true;
    });

    // Sort: Sales & TPKD first (since this is for assigning to a Sale), then Management/Admin
    return list.sort((a, b) => {
      const getPriority = (m: SalesMember) => {
        if (m.role === 'sale') return 1;
        if (m.role === 'tpkd') return 2;
        return 3;
      };
      const pDiff = getPriority(a) - getPriority(b);
      if (pDiff !== 0) return pDiff;
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return a.name.localeCompare(b.name, 'vi');
    });
  }, [salesMembers]);

  const [targetAssignee, setTargetAssignee] = useState<string>('');
  const [handover, setHandover] = useState({needs: '', latest: '', next: ''});
  const [reason, setReason] = useState('Bàn giao chăm sóc khách hàng theo kế hoạch');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  useEffect(()=>{if(isOpen) setHandover({needs: leadsToTransfer.length === 1 ? leadsToTransfer[0].notes || '' : '', latest: '', next: ''});},[isOpen]);
  // When modal opens, select the best candidate (preferably an active Sale, excluding current user)
  useEffect(() => {
    if (isOpen && displaySalesList.length > 0) {

      const preferred = displaySalesList.find(
        (s) => s.status === 'active' && s.name !== currentUserName && (s.role === 'sale' || s.role === 'tpkd')
      ) || displaySalesList.find(
        (s) => s.status === 'active' && s.name !== currentUserName
      ) || displaySalesList.find(
        (s) => s.status === 'active'
      ) || displaySalesList[0];

      if (preferred) {
        setTargetAssignee(preferred.name);
      }
    }
  }, [isOpen, displaySalesList, currentUserName]);

  // Silently check and sync latest members from Google Drive file MAY_TRUONGBV_MH5.19_NVKD_V.1 if token exists
  useEffect(() => {
    if (isOpen && getAccessToken() && !isSyncingDrive) {
      let isMounted = true;
      setIsSyncingDrive(true);
      syncNvkdFromDriveFile(salesMembers)
        .then((res) => {
          if (isMounted && res.success && res.members && res.members.length > 0) {
            if (onMembersUpdated) {
              onMembersUpdated(res.members);
            }
          }
        })
        .catch((err) => {
          console.debug('Background NVKD Drive sync not needed or failed:', err);
        })
        .finally(() => {
          if (isMounted) setIsSyncingDrive(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen]);

  if (!isOpen || leadsToTransfer.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAssignee || !displaySalesList.some(member=>member.name===targetAssignee && member.status==='active')) {
      alert('Vui lòng chọn chuyên viên tiếp nhận!');
      return;
    }
    if (!handover.needs.trim() || !handover.latest.trim() || !handover.next.trim()) return;
    const leadIds = leadsToTransfer.map((l) => l.id);
    onConfirmTransfer(leadIds, targetAssignee, [reason.trim() || 'Bàn giao chuyển giao khách hàng', `Nhu cầu chính: ${handover.needs.trim()}`, `Trao đổi gần nhất: ${handover.latest.trim()}`, `Việc cần làm tiếp: ${handover.next.trim()}`].join('\n'));
    onClose();
  };

  const targetMember = displaySalesList.find((s) => s.name === targetAssignee);
  const salesGroup = displaySalesList.filter((s) => s.role === 'sale' || s.role === 'tpkd');
  const adminGroup = displaySalesList.filter((s) => s.role === 'admin');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Chuyển giao khách hàng
              </h3>
              <p className="text-[11px] text-slate-500">
                Bàn giao {leadsToTransfer.length} khách hàng cho chuyên viên sale tiếp nhận
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto touch-scroll pr-1 flex-1 space-y-4 text-xs pb-safe">
          {/* List of leads to transfer */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center justify-between">
              <span>Danh sách khách chuyển giao ({leadsToTransfer.length}):</span>
              <span className="text-amber-700 font-normal">
                {leadsToTransfer.length === 1 ? leadsToTransfer[0].phone : 'Nhiều khách'}
              </span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 no-scrollbar pr-0.5">
              {leadsToTransfer.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-[11px]"
                >
                  <div className="font-semibold text-slate-800 truncate max-w-[170px]">
                    {l.fullName}
                  </div>
                  <div className="text-slate-500 truncate max-w-[130px]">
                    {l.project}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Hiện tại: <span className="font-medium text-slate-600">{l.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Select Target Sale */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700">
                Chuyên viên Sale tiếp nhận <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {isSyncingDrive && (
                  <span className="text-[10px] text-amber-600 flex items-center gap-1 animate-pulse font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Đồng bộ file...
                  </span>
                )}
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  File: {TARGET_NVKD_SHEET_NAME}
                </span>
              </div>
            </div>
            <select
              value={targetAssignee}
              onChange={(e) => setTargetAssignee(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
            >
              {salesGroup.length > 0 && (
                <optgroup label={`Chuyên viên kinh doanh (NVKD / TPKD) — ${TARGET_NVKD_SHEET_NAME}`}>
                  {salesGroup.map((s) => (
                    <option key={s.id} value={s.name} disabled={s.status === 'paused'}>
                      {s.name} — {s.title} {s.name === currentUserName ? '(Hiện tại)' : ''} {s.status === 'paused' ? '(Đang tạm ngưng)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {adminGroup.length > 0 && (
                <optgroup label="Ban quản trị & giám đốc">
                  {adminGroup.map((s) => (
                    <option key={s.id} value={s.name} disabled={s.status === 'paused'}>
                      {s.name} — {s.title} {s.name === currentUserName ? '(Hiện tại)' : ''} {s.status === 'paused' ? '(Đang tạm ngưng)' : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Nguồn nhân sự: File Google Sheet <strong className="font-semibold text-slate-700">{TARGET_NVKD_SHEET_NAME}</strong></span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-1">
                ({displaySalesList.length} nhân sự)
              </span>
            </div>
          </div>

          {/* Selected target sale summary preview */}
          {targetMember && (
            <div className="flex items-center space-x-3 p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/70">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {targetMember.avatar ? (
                  <img src={targetMember.avatar} alt={targetMember.name} className="w-full h-full object-cover" />
                ) : (
                  targetMember.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-xs truncate">{targetMember.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{targetMember.title}</div>
                <div className="text-[10px] text-slate-400">{targetMember.phone} • {targetMember.email}</div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                Sẵn sàng nhận
              </span>
            </div>
          )}

          <fieldset className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3"><legend className="px-1 font-bold text-blue-900">Tóm tắt bàn giao</legend>{([{key: 'needs', label: 'Nhu cầu chính'}, {key: 'latest', label: 'Trao đổi gần nhất'}, {key: 'next', label: 'Việc cần làm tiếp'}] as const).map(field=><label key={field.key} className="block text-xs font-semibold text-slate-700">{field.label}<textarea required rows={2} value={handover[field.key]} onChange={event=>setHandover(previous=>({...previous,[field.key]:event.target.value}))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-xs"/></label>)}<p className="text-xs text-slate-500">Nếu chưa trao đổi, ghi rõ “Chưa liên hệ”. Chuyển nhiều khách: nêu thông tin riêng theo tên khách.</p></fieldset>
          {/* Reason / Handover Note */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              Lý do bàn giao &amp; Ghi chú tiếp nhận
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Chuyên viên cũ nghỉ phép, bàn giao chăm sóc khách VIP..."
              className="w-full bg-white border border-slate-300 text-slate-800 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              * Lịch sử chuyển giao sẽ được tự động lưu vào nhật ký tương tác của từng khách hàng.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold shadow-xs transition-colors"
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              Xác nhận chuyển {leadsToTransfer.length} khách
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
