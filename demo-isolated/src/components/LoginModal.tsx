import React, { useState } from 'react';
import { 
  Users, 
  LogIn, 
  ShieldCheck, 
  UserCheck, 
  X, 
  KeyRound, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight,
  Lock
} from 'lucide-react';
import { SalesMember } from '../types';
import { loginEmployee } from '../services/salesMembersApi';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SalesMember;
  salesMembers: SalesMember[];
  onSelectUser: (user: SalesMember) => void;
  onLogout?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  salesMembers,
  onSelectUser,
  onLogout
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [roleTab, setRoleTab] = useState<'all' | 'admin' | 'tpkd' | 'sale'>('all');

  if (!isOpen) return null;

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = await loginEmployee(email.trim(), password.trim());
    if (!result.success || !result.user) {
      setError(result.error || 'Đăng nhập không thành công.');
      return;
    }
    onSelectUser(result.user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>Đăng nhập &amp; Chuyển đổi tài khoản</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Hệ thống quản trị &amp; phân bổ lead SALEPRO HCM_E05
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

        <div className="overflow-y-auto touch-scroll pr-1 flex-1 space-y-4 text-xs pb-safe">
          {/* Currently logged in status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-700">
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Đang đăng nhập hiện tại:</div>
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                    currentUser.role === 'admin'
                      ? 'bg-amber-100 text-amber-800'
                      : currentUser.role === 'tpkd'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                  }`}>
                    {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'tpkd' ? 'TPKD' : 'NVKD'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{currentUser.email}</div>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs flex items-center space-x-1 transition-colors"
                title="Đăng xuất khỏi phiên làm việc"
              >
                <LogIn className="w-3.5 h-3.5 rotate-180" />
                <span>Đăng xuất</span>
              </button>
            )}
          </div>

          {/* Form Login with Email & Password */}
          <form onSubmit={handleManualLogin} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Đăng nhập bằng Tên đăng nhập / Email &amp; Mật khẩu riêng:</span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center space-x-1.5">
                <Lock className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên đăng nhập hoặc Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập username (vd: sale01) hoặc email..."
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-semibold">Mật khẩu riêng</label>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5" />
                <input
                  id="modal-pass-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu riêng..."
                  required
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 sm:py-2 text-base sm:text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập tài khoản này</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
