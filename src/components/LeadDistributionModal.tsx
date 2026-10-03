import React, { useState, useMemo } from 'react';
import { 
  X, 
  Shuffle, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Check, 
  Square, 
  CheckSquare, 
  ArrowRight,
  ShieldCheck,
  Building,
  Briefcase
} from 'lucide-react';
import { Lead, SalesMember, AutoDistributionPolicy } from '../types';
import { isLeadUnassigned } from '../data/salesTeamData';

interface LeadDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  filteredLeads: Lead[];
  selectedLeadIds: string[];
  salesMembers: SalesMember[];
  distributionPolicy: AutoDistributionPolicy;
  onDistribute: (
    leadsToDistribute: Lead[],
    targetSalesMembers: SalesMember[],
    method: 'round_robin' | 'performance'
  ) => Promise<void>;
}

export const LeadDistributionModal: React.FC<LeadDistributionModalProps> = ({
  isOpen,
  onClose,
  leads,
  filteredLeads,
  selectedLeadIds,
  salesMembers,
  distributionPolicy,
  onDistribute
}) => {
  if (!isOpen) return null;

  // 1. Scope selection
  // 'all': Tất cả lead trong hệ thống
  // 'unassigned': Khách chưa phân bổ hoặc thuộc Admin / file Sheet gốc (Bùi Văn Trường)
  // 'selected': Khách đang được tích chọn
  // 'filtered': Khách đang xem trong bộ lọc
  const initialScope = selectedLeadIds.length > 0 ? 'selected' : 'all';
  const [scope, setScope] = useState<'all' | 'unassigned' | 'selected' | 'filtered'>(initialScope);

  // Distribution method
  const [method, setMethod] = useState<'round_robin' | 'performance'>('round_robin');

  // Filter sales members: active NVKD (role === 'sale') + active TPKD
  const activeNvkdMembers = useMemo(() => {
    return salesMembers.filter((m) => m.status === 'active' && m.role === 'sale');
  }, [salesMembers]);

  const activeTpkdMembers = useMemo(() => {
    return salesMembers.filter((m) => m.status === 'active' && m.role === 'tpkd');
  }, [salesMembers]);

  // Selected sales members to receive leads (default to all active NVKD)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    return activeNvkdMembers.map((m) => m.id);
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Determine target leads based on scope
  const targetLeads = useMemo(() => {
    if (scope === 'selected') {
      return leads.filter((l) => selectedLeadIds.includes(l.id));
    }
    if (scope === 'filtered') {
      return filteredLeads;
    }
    if (scope === 'unassigned') {
      return leads.filter((l) => {
        if (isLeadUnassigned(l)) return true;
        const assignee = (l.assignee || '').toLowerCase().trim();
        // Also treat leads with sheet creator / admin as unassigned for distribution
        return (
          assignee === '' ||
          assignee.includes('chưa') ||
          assignee.includes('tự động') ||
          assignee.includes('admin') ||
          assignee.includes('bùi văn trường') ||
          assignee.includes('truongbv') ||
          assignee === 'nhà phố trung tâm (admin)'
        );
      });
    }
    // 'all'
    return leads;
  }, [scope, leads, filteredLeads, selectedLeadIds]);

  // Target sales members
  const targetSales = useMemo(() => {
    return salesMembers.filter((m) => selectedMemberIds.includes(m.id));
  }, [salesMembers, selectedMemberIds]);

  // Toggle member
  const handleToggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  // Quick select actions
  const handleSelectAllNvkd = () => {
    setSelectedMemberIds(activeNvkdMembers.map((m) => m.id));
  };

  const handleSelectAllNvkdAndTpkd = () => {
    setSelectedMemberIds([...activeNvkdMembers, ...activeTpkdMembers].map((m) => m.id));
  };

  const handleClearAll = () => {
    setSelectedMemberIds([]);
  };

  // Preview estimation per sale
  const avgLeadsPerSale = targetSales.length > 0 ? (targetLeads.length / targetSales.length).toFixed(1) : '0';

  const tranMinhPhucMember = salesMembers.find((m) => m.name.toLowerCase().includes('trần minh phúc'));
  const isPhucSelected = tranMinhPhucMember && selectedMemberIds.includes(tranMinhPhucMember.id);

  const handleConfirmDistribute = async () => {
    if (targetLeads.length === 0) {
      alert('Không có khách hàng nào trong nhóm đã chọn để phân bổ.');
      return;
    }
    if (targetSales.length === 0) {
      alert('Vui lòng chọn ít nhất 1 chuyên viên Sale nhận khách hàng.');
      return;
    }

    setIsProcessing(true);
    try {
      await onDistribute(targetLeads, targetSales, method);
      setSuccessInfo(
        `Đã phân bổ thành công ${targetLeads.length} khách hàng cho ${targetSales.length} chuyên viên kinh doanh!`
      );
      setTimeout(() => {
        setIsProcessing(false);
        setSuccessInfo(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Lỗi khi phân bổ:', err);
      alert('Có lỗi xảy ra: ' + (err?.message || 'Không thể phân bổ khách hàng.'));
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/20">
              <Shuffle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Phân bổ khách hàng cho Đội ngũ Sale</h3>
              <p className="text-xs text-amber-100/90 mt-0.5">
                Chia đều Data khách hàng cho các chuyên viên kinh doanh (NVKD) đang trực
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Success Banner */}
          {successInfo && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Section 1: Scope */}
          <div>
            <label className="font-bold text-slate-800 text-xs block mb-2">
              1. Chọn nhóm khách hàng cần phân bổ:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                  scope === 'all'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="distScope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold">Chia đều toàn bộ khách ({leads.length} khách)</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200 text-amber-900 font-bold">
                      Khuyên dùng
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Chia đều tất cả lead cho các Sale được chọn, bất kể người phụ trách cũ.
                  </p>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                  scope === 'unassigned'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="distScope"
                  checked={scope === 'unassigned'}
                  onChange={() => setScope('unassigned')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold">
                    Khách chưa có người phụ trách (hoặc thuộc Admin / Sheet gốc)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                    Giữ nguyên các khách đã có sale cụ thể, chỉ chia các khách chưa có sale.
                  </p>
                </div>
              </label>

              {selectedLeadIds.length > 0 && (
                <label
                  className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                    scope === 'selected'
                      ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="distScope"
                    checked={scope === 'selected'}
                    onChange={() => setScope('selected')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold">
                      Các khách hàng đang chọn ({selectedLeadIds.length} khách)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Chỉ chia các khách hàng bạn đã tích chọn trong bảng dữ liệu.
                    </p>
                  </div>
                </label>
              )}

              {filteredLeads.length !== leads.length && (
                <label
                  className={`p-3 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                    scope === 'filtered'
                      ? 'border-amber-500 bg-amber-50/70 text-amber-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="distScope"
                    checked={scope === 'filtered'}
                    onChange={() => setScope('filtered')}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold">
                      Khách đang hiển thị theo bộ lọc ({filteredLeads.length} khách)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
                      Chỉ chia các khách hàng thuộc dự án hoặc tệp đang lọc.
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Section 2: Sales Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span>2. Chọn chuyên viên Sale (NVKD) sẽ nhận khách:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Đã chọn {selectedMemberIds.length}/{salesMembers.filter((m) => m.status === 'active' && m.role !== 'admin').length} nhân sự
                </span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleSelectAllNvkd}
                  className="text-amber-700 hover:text-amber-900 font-bold text-[11px] underline cursor-pointer"
                >
                  Tất cả NVKD ({activeNvkdMembers.length})
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleSelectAllNvkdAndTpkd}
                  className="text-amber-700 hover:text-amber-900 font-bold text-[11px] underline cursor-pointer"
                >
                  Gồm cả TPKD
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-500 hover:text-slate-700 text-[11px] underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* Members Grid */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60 max-h-56 overflow-y-auto space-y-1.5">
              {salesMembers
                .filter((m) => m.status === 'active' && m.role !== 'admin')
                .map((member) => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  const isPhuc = member.name.toLowerCase().includes('trần minh phúc');
                  const currentLeadCount = leads.filter(
                    (l) => (l.assignee || '').toLowerCase().trim() === member.name.toLowerCase().trim()
                  ).length;

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? isPhuc
                            ? 'bg-amber-100/80 border-amber-400 font-bold ring-2 ring-amber-400/30'
                            : 'bg-white border-amber-300 shadow-2xs font-semibold'
                          : 'bg-white/60 border-slate-200 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(member.id)}
                          className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-xs">
                            {member.name}
                          </span>
                          {isPhuc && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-600 text-white font-extrabold animate-pulse">
                              Nhân viên cần nhận
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              member.role === 'tpkd'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {member.role === 'tpkd' ? 'TPKD' : 'NVKD'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-[11px] text-slate-500">
                        <span>Đang có: <strong>{currentLeadCount}</strong> khách</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Section 3: Distribution Method */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <label className="font-bold text-slate-800 text-xs block">
              3. Phương thức phân chia:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="distMethod"
                  checked={method === 'round_robin'}
                  onChange={() => setMethod('round_robin')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800">Chia đều Round-Robin (Khuyên dùng)</span>
                  <p className="text-[11px] text-slate-500">Mỗi chuyên viên nhận số lượng lead bằng nhau.</p>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="distMethod"
                  checked={method === 'performance'}
                  onChange={() => setMethod('performance')}
                  className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-xs text-slate-800">Ưu tiên theo hiệu suất &amp; SLA</span>
                  <p className="text-[11px] text-slate-500">Sale xếp hạng VIP/Tốt sẽ được chia tỉ trọng cao hơn.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Live Preview Summary */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Dự tính phân bổ trực tiếp:
              </span>
              <span className="text-xs font-bold text-emerald-800">
                {targetLeads.length} khách → {targetSales.length} chuyên viên
              </span>
            </div>
            <p className="text-xs text-emerald-950 font-medium leading-relaxed">
              Mỗi chuyên viên Sale được chọn sẽ nhận trung bình khoảng <strong>~{avgLeadsPerSale} khách hàng mới</strong>.
            </p>
            {isPhucSelected && (
              <p className="text-xs text-amber-900 bg-amber-100/80 px-2.5 py-1.5 rounded-lg border border-amber-300 font-bold flex items-center gap-1.5">
                <span>👉 Chuyên viên <strong>Trần Minh Phúc</strong> sẽ nhận được ngay khách hàng trên màn hình của mình!</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isProcessing || targetLeads.length === 0 || targetSales.length === 0}
            onClick={handleConfirmDistribute}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition-all cursor-pointer ${
              isProcessing || targetLeads.length === 0 || targetSales.length === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-98 text-white shadow-amber-600/30'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang phân bổ dữ liệu...</span>
              </>
            ) : (
              <>
                <Shuffle className="w-4 h-4" />
                <span>Xác nhận phân bổ {targetLeads.length} khách cho {targetSales.length} Sale</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
