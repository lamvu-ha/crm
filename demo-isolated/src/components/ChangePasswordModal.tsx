import React, { useState } from 'react';
import { ShieldCheck, Lock, Eye, EyeOff, AlertTriangle, CheckCircle2, KeyRound } from 'lucide-react';
import { SalesMember } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
  user: SalesMember;
  isForcedFirstLogin?: boolean;
  onSaveNewPassword: (userId: string, newPassword: string, currentPassword?: string) => Promise<{ success: boolean; error?: string } | void> | void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  isForcedFirstLogin = false,
  onSaveNewPassword
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, text: '', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score, text: 'Yếu', color: 'bg-rose-500' };
    if (score <= 3) return { score, text: 'Trung bình', color: 'bg-amber-500' };
    return { score, text: 'Mạnh & An toàn', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCurrent = currentPassword.trim();
    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    // If voluntary password change, require current password
    if (!isForcedFirstLogin && !cleanCurrent) {
      setError('Vui lòng nhập mật khẩu hiện tại để xác thực tài khoản chính chủ.');
      return;
    }

    if (!cleanNew) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }

    if (cleanNew.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    if (!isForcedFirstLogin && cleanCurrent === cleanNew) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSaveNewPassword(user.id, cleanNew, cleanCurrent);
      if (result && typeof result === 'object' && !result.success) {
        setError(result.error || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => {
        setSuccess(false);
        if (onClose) onClose();
      }, 1200);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Có lỗi xảy ra trong quá trình lưu mật khẩu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="change-password-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-start justify-between border-b-4 border-amber-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isForcedFirstLogin ? 'Đổi mật khẩu tài khoản' : 'Đổi mật khẩu tài khoản riêng'}
              </h3>
              <p className="text-xs text-slate-300">
                Nhân sự: <span className="font-semibold text-amber-300">{user.name}</span> ({user.email})
              </p>
            </div>
          </div>
          {onClose && (
            <button
              id="btn-close-change-password-modal"
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg cursor-pointer bg-slate-800/80 hover:bg-slate-700"
              title="Đóng cửa sổ"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Forced first login warning banner */}
          {isForcedFirstLogin && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Yêu cầu bảo mật từ hệ thống SALEPRO HCM_E05:</p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Để tăng cường bảo mật thông tin khách hàng và dữ liệu lead được phân bổ, vui lòng <strong>cập nhật mật khẩu riêng</strong> cá nhân của bạn.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đổi mật khẩu riêng thành công! Mật khẩu đã được lưu an toàn.</span>
            </div>
          )}

          {/* Current Password (if not forced first login) */}
          {!isForcedFirstLogin && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  id="input-current-password"
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Nhập mật khẩu bạn đang dùng"
                  className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* New password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mật khẩu mới riêng của bạn <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="input-new-password"
                type={showPass ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                autoFocus={isForcedFirstLogin}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                  <span className={`font-bold ${
                    strength.score <= 2 ? 'text-rose-600' : strength.score <= 3 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {strength.text}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex gap-1">
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 1 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 2 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 3 ? strength.color : 'bg-slate-200'}`} />
                  <div className={`h-full flex-1 rounded-full transition-all ${strength.score >= 4 ? strength.color : 'bg-slate-200'}`} />
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Gợi ý: Kết hợp chữ hoa, chữ thường và chữ số để mật khẩu riêng an toàn tối đa.
            </p>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="input-confirm-password"
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại chính xác mật khẩu mới"
                className="w-full pl-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Submit & Dismiss buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {onClose ? (
              <button
                id="btn-skip-change-password"
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200"
              >
                Bỏ qua &amp; Vào bảng điều khiển (Để sau)
              </button>
            ) : <div />}
            <button
              id="btn-submit-new-password"
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  <span>Đang lưu mật khẩu...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Xác nhận lưu mật khẩu mới</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
