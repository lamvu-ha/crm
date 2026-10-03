import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Flame, 
  Sun, 
  Snowflake, 
  Bot, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Target,
  Filter
} from 'lucide-react';
import { Lead, SmartLabelResult, PriorityLevel } from '../types';
import { runSmartLabeling } from '../services/smartLabelingService';

interface SmartLabelingModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  selectedLeadIds?: string[];
  onBatchUpdateLeads: (updatedLeads: Lead[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export const SmartLabelingModal: React.FC<SmartLabelingModalProps> = ({
  isOpen,
  onClose,
  leads,
  selectedLeadIds = [],
  onBatchUpdateLeads,
  onShowToast
}) => {
  const [scope, setScope] = useState<'new_unlabeled' | 'selected' | 'all'>('new_unlabeled');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<SmartLabelResult[] | null>(null);

  if (!isOpen) return null;

  // Filter candidates based on scope
  const unlabeledLeads = leads.filter(l => !l.potentialLevel);
  const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));

  let candidateLeads: Lead[] = [];
  if (scope === 'selected' && selectedLeads.length > 0) {
    candidateLeads = selectedLeads;
  } else if (scope === 'all') {
    candidateLeads = leads;
  } else {
    candidateLeads = unlabeledLeads.length > 0 ? unlabeledLeads : leads;
  }

  const handleStartSmartLabeling = async () => {
    if (candidateLeads.length === 0) return;
    setIsProcessing(true);
    setResults(null);

    try {
      const labelResults = await runSmartLabeling(candidateLeads);
      setResults(labelResults);

      // Create updated leads
      const resultMap = new Map(labelResults.map(r => [r.leadId, r]));
      const nowIso = new Date().toISOString();

      const updatedLeadsList = leads.map(l => {
        const res = resultMap.get(l.id);
        if (res) {
          return {
            ...l,
            potentialLevel: res.potentialLevel,
            priorityReason: res.priorityReason,
            priorityUpdatedAt: nowIso
          };
        }
        return l;
      });

      onBatchUpdateLeads(updatedLeadsList);

      const hotCount = labelResults.filter(r => r.potentialLevel === 'Nóng').length;
      const warmCount = labelResults.filter(r => r.potentialLevel === 'Ấm').length;
      const coldCount = labelResults.filter(r => r.potentialLevel === 'Lạnh').length;

      if (onShowToast) {
        onShowToast(
          `✨ Đã gắn nhãn SmartLabeling thành công cho ${labelResults.length} khách hàng! (🔥 ${hotCount} Nóng, 🌤️ ${warmCount} Ấm, ❄️ ${coldCount} Lạnh)`,
          'success'
        );
      }
    } catch (err) {
      console.error('SmartLabeling process failed:', err);
      if (onShowToast) {
        onShowToast('Có lỗi xảy ra khi gắn nhãn AI. Vui lòng thử lại!', 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const hotCount = results?.filter(r => r.potentialLevel === 'Nóng').length || 0;
  const warmCount = results?.filter(r => r.potentialLevel === 'Ấm').length || 0;
  const coldCount = results?.filter(r => r.potentialLevel === 'Lạnh').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-amber-100 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">SmartLabeling AI</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Tự động quét nội dung ghi chú & nhu cầu để phân loại ưu tiên Nóng / Ấm / Lạnh
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Scope selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Chọn nhóm khách hàng cần AI gắn nhãn:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setScope('new_unlabeled')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'new_unlabeled'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                  <span>Khách chưa gắn</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-indigo-100 text-indigo-800 font-bold">
                    {unlabeledLeads.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ưu tiên khách mới & chưa phân loại
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('selected')}
                disabled={selectedLeads.length === 0}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  scope === 'selected'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                  <span>Đã chọn ở bảng</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-amber-100 text-amber-900 font-bold">
                    {selectedLeads.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Chỉ phân tích các hàng đã tick
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                  <span>Toàn bộ danh sách</span>
                  <span className="text-[11px] px-1.5 py-0.2 rounded-full font-mono bg-slate-200 text-slate-800 font-bold">
                    {leads.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Quét và cập nhật lại toàn bộ
                </p>
              </button>
            </div>
          </div>

          {/* AI Criteria Explanation */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Tiêu chí gắn nhãn thông minh của Gemini AI:</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-red-50/80 border border-red-200">
                <span className="font-black text-rose-800 flex items-center gap-1">
                  <span>🔥 NÓNG:</span>
                </span>
                <p className="text-rose-900/80 mt-0.5">
                  Cần mua gấp trong tuần, tài chính sẵn, muốn xem nhà ngay, hỏi cọc hoặc đàm phán giá.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200">
                <span className="font-black text-amber-800 flex items-center gap-1">
                  <span>🌤️ ẤM:</span>
                </span>
                <p className="text-amber-900/80 mt-0.5">
                  Quan tâm tìm hiểu, xin bảng giá/pháp lý, hẹn cuối tuần hoặc cần trao đổi thêm với người thân.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-sky-50/80 border border-sky-200">
                <span className="font-black text-sky-800 flex items-center gap-1">
                  <span>❄️ LẠNH:</span>
                </span>
                <p className="text-sky-900/80 mt-0.5">
                  Thuê bao, chưa nghe máy, từ chối, nhầm số, chưa có tài chính hoặc tạm ngưng nhu cầu.
                </p>
              </div>
            </div>
          </div>

          {/* Results summary after run */}
          {results && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Hoàn tất gắn nhãn SmartLabeling cho {results.length} khách hàng!</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-white rounded-lg border border-red-200 shadow-2xs">
                  <span className="text-base">🔥</span>
                  <div className="font-black text-rose-700 text-lg">{hotCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Khách Nóng</div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-base">🌤️</span>
                  <div className="font-black text-amber-700 text-lg">{warmCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Khách Ấm</div>
                </div>

                <div className="p-2 bg-white rounded-lg border border-sky-200 shadow-2xs">
                  <span className="text-base">❄️</span>
                  <div className="font-black text-sky-700 text-lg">{coldCount}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Khách Lạnh</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Số lượng xử lý: <strong className="text-slate-800">{candidateLeads.length} khách hàng</strong>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>

            <button
              type="button"
              disabled={isProcessing || candidateLeads.length === 0}
              onClick={handleStartSmartLabeling}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 active:scale-95 transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Đang gắn nhãn bằng AI...' : 'Bắt đầu gắn nhãn AI'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
