import React from 'react';
import { 
  AlertTriangle, 
  UserCheck, 
  Phone, 
  Building, 
  Calendar, 
  ExternalLink, 
  MessageSquare, 
  ShieldAlert, 
  X, 
  ArrowRight,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Lead } from '../types';

interface DuplicatePhoneWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedLead: Lead | null;
  inputPhone: string;
  currentUserName?: string;
  onViewExistingLead?: (lead: Lead) => void;
  onOpenChatWithSale?: (leadId?: string, saleName?: string) => void;
  onConfirmContinue?: () => void;
  allMatchedLeads?: Lead[];
}

export const DuplicatePhoneWarningModal: React.FC<DuplicatePhoneWarningModalProps> = ({
  isOpen,
  onClose,
  matchedLead,
  inputPhone,
  currentUserName,
  onViewExistingLead,
  onOpenChatWithSale,
  onConfirmContinue,
  allMatchedLeads = []
}) => {
  if (!isOpen || !matchedLead) return null;

  const saleInCharge = matchedLead.assignee || 'Chưa phân bổ';
  const isAssignedToCurrentUser = currentUserName && saleInCharge.toLowerCase().trim() === currentUserName.toLowerCase().trim();

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-rose-500 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dup-modal-title"
      >
        {/* Header - Danger Gradient with Alarm Icon */}
        <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 text-white p-4 sm:p-5 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-start space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center text-amber-200 shadow-inner shrink-0">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-400/40 text-rose-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  Cảnh báo xung đột &amp; Tranh chấp Lead
                </span>
              </div>
              <h3 id="dup-modal-title" className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                SỐ ĐIỆN THOẠI ĐÃ TỒN TẠI TRONG CRM!
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Vui lòng kiểm tra kỹ thông tin nhân sự đang chăm sóc để bảo vệ quyền lợi đội ngũ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0"
            title="Đóng cảnh báo"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Highlight: Sale in Charge Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-2 border-rose-300 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-rose-900 font-bold uppercase text-[11px] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-rose-600" />
                <span>Nhân sự (Sale) hiện đang trực tiếp phụ trách:</span>
              </span>
              {isAssignedToCurrentUser && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                  Chính bạn đang phụ trách
                </span>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                  {saleInCharge.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">
                    {saleInCharge}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Chuyên viên tư vấn bất động sản HCM_E05
                  </p>
                </div>
              </div>

              {onOpenChatWithSale && !isAssignedToCurrentUser && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenChatWithSale(matchedLead.id, saleInCharge);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  title="Nhắn tin nội bộ trao đổi với Sale này"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat nội bộ với {saleInCharge}</span>
                </button>
              )}
            </div>

            <div className="p-2.5 bg-white/90 rounded-xl border border-rose-200 text-slate-700 text-[11px] leading-relaxed">
              <strong className="text-rose-700">Quy định chống tranh chấp:</strong> Khách hàng này đã được phân bổ cho <strong>{saleInCharge}</strong>. Để tránh trùng lặp tiếp cận gây phản cảm cho khách hàng hoặc mâu thuẫn hoa hồng, bạn không nên tạo thêm hồ sơ mới khi chưa có sự thống nhất từ Trưởng Phòng Kinh Doanh.
            </div>
          </div>

          {/* Details of Existing Customer */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Hồ sơ khách hàng trùng khớp trong CRM:</span>
              </span>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                {matchedLead.status || 'Khách mới'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Họ và tên khách:</span>
                <strong className="text-slate-900 text-sm">{matchedLead.fullName}</strong>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Số điện thoại:</span>
                <strong className="text-rose-700 font-mono text-sm bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                  {matchedLead.phone}
                </strong>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Dự án quan tâm:</span>
                <strong className="text-slate-800">{matchedLead.project || 'Chưa cập nhật'}</strong>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Phân khúc &amp; Ngân sách:</span>
                <span className="text-slate-700 font-medium">
                  {matchedLead.productType || 'Nhà phố'} • {matchedLead.budget || 'Chưa rõ ngân sách'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Nguồn tiếp nhận:</span>
                <span className="text-slate-700">{matchedLead.dataSource || 'Google / Facebook Ads'}</span>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Ngày nạp hệ thống:</span>
                <span className="text-slate-700">{matchedLead.date || 'Chưa rõ'}</span>
              </div>
            </div>

            {matchedLead.notes && (
              <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600 italic">
                <strong>Ghi chú gần nhất:</strong> "{matchedLead.notes}"
              </div>
            )}

            {allMatchedLeads.length > 1 && (
              <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                ⚠️ Hệ thống tìm thấy tổng cộng <strong>{allMatchedLeads.length} hồ sơ</strong> có cùng số điện thoại này trong cơ sở dữ liệu!
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer text-center"
          >
            Đổi số điện thoại khác
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {onViewExistingLead && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewExistingLead(matchedLead);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem hồ sơ khách cũ</span>
              </button>
            )}

            {onConfirmContinue && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirmContinue();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                title="Bỏ qua cảnh báo và tiếp tục lưu"
              >
                Vẫn tiếp tục nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
