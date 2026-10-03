import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  Clock, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Check,
  Flame,
  Info
} from 'lucide-react';
import { AutoDistributionPolicy, SalePerformanceScore } from '../types';

interface AutoDistributionPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: AutoDistributionPolicy;
  onSavePolicy: (newPolicy: AutoDistributionPolicy) => void;
  performanceScores: SalePerformanceScore[];
  onTriggerSlaCheck: () => void;
}

export const AutoDistributionPolicyModal: React.FC<AutoDistributionPolicyModalProps> = ({
  isOpen,
  onClose,
  policy,
  onSavePolicy,
  performanceScores,
  onTriggerSlaCheck
}) => {
  if (!isOpen) return null;

  const [formData, setFormData] = useState<AutoDistributionPolicy>({ ...policy });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePolicy(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Chính sách phân bổ &amp; Thu hồi khách tự động
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quy chế tiếp nhận lead, thời hạn báo cáo và ưu tiên nhân sự làm việc tốt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto touch-scroll py-4 space-y-4 pr-1 text-xs">
          {/* Status banner */}
          <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-3.5 rounded-xl border border-amber-200">
            <div className="flex items-start space-x-3">
              <Info className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="space-y-1 text-amber-900">
                <p className="font-bold text-xs">Nguyên lý vận hành theo yêu cầu của bạn:</p>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  1. Mỗi khi có khách mới hàng ngày, hệ thống <strong>ưu tiên chia khách cho sale có điểm hiệu suất cao</strong> (tỷ lệ chốt tốt, tiếp nhận nhanh, báo cáo đầy đủ).
                  <br />
                  2. Nếu sale được chia khách mà <strong>không bấm tiếp nhận hoặc không báo cáo lên hệ thống</strong> trong thời hạn quy định, hệ thống sẽ <strong>tự động thu hồi và chia lại cho sale khác</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-900 text-xs block">
                Kích hoạt cơ chế tự động điều phối &amp; thu hồi
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bật tính năng giám sát SLA 24/7 và luân chuyển khách hàng tự động
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Timeouts setting */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Timeout 1: Tiếp nhận */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Thời hạn bấm "Tiếp nhận" (phút)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Sau khi được chia khách, sale phải vào CRM ấn nút "Tiếp nhận" trong khoảng thời gian này.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="5"
                  max="1440"
                  step="5"
                  value={formData.acceptTimeoutMinutes}
                  onChange={(e) => setFormData({ ...formData, acceptTimeoutMinutes: Number(e.target.value) || 60 })}
                  className="w-24 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-600 font-medium text-xs">phút ({Math.round(formData.acceptTimeoutMinutes / 60 * 10) / 10} giờ)</span>
              </div>
            </div>

            {/* Timeout 2: Báo cáo tương tác */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <RotateCcw className="w-4 h-4 text-orange-600 shrink-0" />
                <span>Thời hạn báo cáo tương tác (giờ)</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Sau khi tiếp nhận, sale phải ghi nhận nhật ký (gọi điện, Zalo, dẫn khách) lên hệ thống.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="number"
                  min="1"
                  max="72"
                  step="1"
                  value={formData.reportTimeoutHours}
                  onChange={(e) => setFormData({ ...formData, reportTimeoutHours: Number(e.target.value) || 4 })}
                  className="w-24 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-600 font-medium text-xs">tiếng ({formData.reportTimeoutHours * 60} phút)</span>
              </div>
            </div>
          </div>

          {/* Performance Priority Options */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-900">Ưu tiên chia khách cho Sale làm việc tốt</span>
              </div>
              <input
                type="checkbox"
                checked={formData.performancePriority}
                onChange={(e) => setFormData({ ...formData, performancePriority: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Khi bật, các Sale có xếp hạng <strong>VIP (trọng số 3x)</strong> và <strong>Tốt (trọng số 2x)</strong> sẽ được ưu tiên nhận số lượng lead mới nhiều hơn và nhận ngay các lead bị thu hồi từ sale khác.
            </p>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-700 font-medium">Khi thu hồi lead, chia ngay cho:</span>
              <select
                value={formData.reassignPolicy}
                onChange={(e) => setFormData({ ...formData, reassignPolicy: e.target.value as any })}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <option value="top_performer">🏆 Sale hiệu suất cao nhất (Top Performer)</option>
                <option value="round_robin">🔄 Xoay vòng Round-Robin</option>
              </select>
            </div>
          </div>

          {/* Duplicate protection policy */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-emerald-700" />
                <span className="font-bold text-slate-900 text-xs">
                  Bảo vệ quyền sở hữu của Sale ở bước 1 (Chống trùng khách)
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.protectOriginalAssigneeOnDuplicate !== false}
                onChange={(e) => setFormData({ ...formData, protectOriginalAssigneeOnDuplicate: e.target.checked })}
                className="w-4 h-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed pl-6">
              Khi nạp thêm khách ở bước 2 cho Sale khác: Nếu phát hiện trùng SĐT với khách đã bàn giao cho Sale ở bước 1, hệ thống sẽ <strong>tự động bảo vệ Sale cũ</strong>, giữ nguyên quyền chăm sóc và không chia đè sang cho Sale mới.
            </p>
          </div>

          {/* Leaderboard preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                Bảng xếp hạng hiệu suất sale hiện tại ({performanceScores.length} chuyên viên)
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Cập nhật theo thời gian thực</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
              {performanceScores.slice(0, 6).map((score, idx) => (
                <div key={score.member.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50 text-xs">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      idx === 0 ? 'bg-amber-400 text-slate-900' :
                      idx === 1 ? 'bg-slate-300 text-slate-800' :
                      idx === 2 ? 'bg-amber-700/30 text-amber-900' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{score.member.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          score.tier === 'VIP' ? 'bg-rose-100 text-rose-700' :
                          score.tier === 'Tốt' ? 'bg-emerald-100 text-emerald-700' :
                          score.tier === 'Đạt' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {score.tier}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Chăm: {score.leadCount} | Đã chốt: {score.closedCount} ({score.closeRate}%) | Phạt quá hạn: {score.slaBreachCount}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono text-sm text-amber-600">
                      {score.performanceScore} <span className="text-[10px] text-slate-400 font-normal">điểm</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onTriggerSlaCheck}
            className="w-full sm:w-auto px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
            title="Quét ngay toàn bộ danh sách lead và tự động thu hồi những lead đã quá hạn"
          >
            <Play className="w-3.5 h-3.5 text-slate-600" />
            <span>Chạy quét SLA ngay</span>
          </button>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center space-x-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã lưu thành công!</span>
                </>
              ) : (
                <span>Lưu chính sách</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
