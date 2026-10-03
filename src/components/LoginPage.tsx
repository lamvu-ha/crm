import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  PhoneCall, 
  X, 
  Layers, 
  Users2, 
  Fingerprint, 
  KeyRound, 
  Shield, 
  Mail,
  Server
} from 'lucide-react';
import { SalesMember } from '../types';
import { signInWithGmail } from '../services/googleSheetsService';
import { INITIAL_SALES_MEMBERS } from '../data/salesTeamData';
import { 
  fetchServerSalesMembers, 
  loginEmployee,
  changeEmployeePassword
} from '../services/salesMembersApi';

interface LoginPageProps {
  salesMembers: SalesMember[];
  onLoginSuccess: (user: SalesMember) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  salesMembers,
  onLoginSuccess
}) => {
  // Form input states
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Modals (Strictly limited to technical support & self-change password - NO credentials directory)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showSelfChangeModal, setShowSelfChangeModal] = useState(false);

  // Self change password states
  const [selfMemberId, setSelfMemberId] = useState<string>('');
  const [selfEmail, setSelfEmail] = useState<string>('');
  const [selfCurrentPass, setSelfCurrentPass] = useState<string>('');
  const [selfNewPass, setSelfNewPass] = useState<string>('');
  const [selfConfirmPass, setSelfConfirmPass] = useState<string>('');
  const [selfShowPass, setSelfShowPass] = useState(false);
  const [selfError, setSelfError] = useState<string | null>(null);
  const [selfSuccess, setSelfSuccess] = useState<string | null>(null);
  const [isSelfSubmitting, setIsSelfSubmitting] = useState(false);

  // Consolidated authorized roster from server database & props
  const allAuthorizedMembers = useMemo(() => {
    const map = new Map<string, SalesMember>();
    
    // 1. Initial base members
    INITIAL_SALES_MEMBERS.forEach((m) => {
      const key = m.email.toLowerCase().trim();
      map.set(key, m);
    });

    // 2. Database & server members passed from props
    salesMembers.forEach((m) => {
      if (m && m.email && !m.email.toLowerCase().trim().endsWith('@nhaphotrungtam.com.vn')) {
        const key = m.email.toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, existing ? { ...existing, ...m } : m);
      }
    });

    return Array.from(map.values()).filter(
      (m) => !m.email.toLowerCase().trim().endsWith('@nhaphotrungtam.com.vn')
    );
  }, [salesMembers]);

  // Secure internal matching helper by username, email or ID
  const findMemberSecure = (inputQuery: string): SalesMember | undefined => {
    const q = inputQuery.trim().toLowerCase();
    if (!q) return undefined;

    // 1. Match by username
    const exactUsername = allAuthorizedMembers.find(
      (m) => (m.username || '').toLowerCase().trim() === q
    );
    if (exactUsername) return exactUsername;

    // 2. Match by email
    const exactEmail = allAuthorizedMembers.find(
      (m) => (m.email || '').toLowerCase().trim() === q
    );
    if (exactEmail) return exactEmail;

    // 3. Match by email prefix
    const exactPrefix = allAuthorizedMembers.find((m) => {
      const mPrefix = (m.email || '').toLowerCase().trim().split('@')[0];
      return mPrefix === q;
    });
    if (exactPrefix) return exactPrefix;

    // 4. Match by ID
    const idMatch = allAuthorizedMembers.find((m) => (m.id || '').toLowerCase() === q);
    if (idMatch) return idMatch;

    return undefined;
  };

  // Submit Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessBanner(null);

    const cleanInput = identifierInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanInput) {
      setErrorMsg('Vui lòng nhập Tên đăng nhập (username) hoặc Email công vụ.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Vui lòng nhập Mật khẩu để tiếp tục.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginEmployee(cleanInput, cleanPass);
      if (result.success && result.user) onLoginSuccess(result.user);
      else setErrorMsg(result.error || 'Đăng nhập không thành công.');
    } catch {
      setErrorMsg('Không thể kết nối máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Single Sign-On with Google Workspace
  const handleGoogleSignIn = async () => {
    setErrorMsg('Đăng nhập Google chưa được kết nối với máy chủ xác thực. Vui lòng dùng tên đăng nhập và mật khẩu.');
  };

  // Self change password submit
  const handleSelfChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSelfError(null);
    setSelfSuccess(null);

    const cleanEmail = selfEmail.trim();
    const cleanCurrent = selfCurrentPass.trim();
    const cleanNew = selfNewPass.trim();
    const cleanConfirm = selfConfirmPass.trim();

    if (!cleanEmail) {
      setSelfError('Vui lòng nhập Email công vụ hoặc Tên đăng nhập.');
      return;
    }

    if (!cleanCurrent) {
      setSelfError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }

    if (cleanNew.length < 6) {
      setSelfError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setSelfError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSelfSubmitting(true);
    try {
      const res = await changeEmployeePassword({
        email: cleanEmail,
        memberId: selfMemberId || undefined,
        currentPassword: cleanCurrent,
        newPassword: cleanNew
      });

      if (!res.success) {
        setSelfError(res.error || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
        setIsSelfSubmitting(false);
        return;
      }

      setSelfSuccess('Đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.');
      setIsSelfSubmitting(false);
      setSelfCurrentPass('');
      setSelfNewPass('');
      setSelfConfirmPass('');
      setTimeout(() => {
        setShowSelfChangeModal(false);
        setSelfSuccess(null);
        setSuccessBanner('Mật khẩu của bạn đã được cập nhật thành công.');
      }, 2000);
    } catch {
      setSelfError('Lỗi kết nối khi đổi mật khẩu. Vui lòng thử lại sau.');
      setIsSelfSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden">
      {/* Subtle Background Accent Lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Enterprise Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-8 py-3.5 sm:py-5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <span className="font-black text-base sm:text-lg tracking-tight text-white uppercase">
                SALEPRO HCM_E05
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
                CRM NỘI BỘ
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-none">
              Quản trị kinh doanh &amp; phân bổ lead BĐS
            </p>
          </div>
        </div>

        {/* Header Right Status */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs text-slate-300 bg-slate-900/90 border border-slate-800 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="hidden md:inline text-slate-400">Xác thực:</span>
            <span className="text-emerald-400 font-bold">Enterprise</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-3 sm:px-8 py-4 sm:py-10 flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center">
          
          {/* MOBILE FIRST: On mobile (<lg), the Login Card appears FIRST so users immediately log in without scrolling! On desktop (lg), it sits neatly on the right */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto order-1 lg:order-2">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-2xl shadow-black/90 backdrop-blur-md relative overflow-hidden">
              {/* Premium top accent gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-indigo-500" />

              <div className="mb-4 sm:mb-5 text-left">
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Cổng đăng nhập nhân sự CRM</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Đăng nhập hệ thống
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Nhập tài khoản được cấp phát và quản lý bởi Backend hệ thống
                </p>
              </div>

              {/* Success Alert Banner */}
              {successBanner && (
                <div className="mb-3.5 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200 text-left">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{successBanner}</div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div className="mb-3.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-2.5 animate-in fade-in duration-200 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{errorMsg}</div>
                </div>
              )}

              {/* Main Login Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                {/* Username / Email Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tên đăng nhập hoặc Email công vụ <span className="text-amber-500">*</span>
                  </label>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-identifier-input"
                      type="text"
                      value={identifierInput}
                      onChange={(e) => setIdentifierInput(e.target.value)}
                      placeholder="Nhập tên đăng nhập hoặc email..."
                      className="w-full pl-10 pr-3.5 py-3 sm:py-2.5 bg-slate-950/90 border border-slate-700/90 rounded-xl text-white text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-500 font-medium"
                      required
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Mật khẩu <span className="text-amber-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-10 pr-11 py-3 sm:py-2.5 bg-slate-950/90 border border-slate-700/90 rounded-xl text-white text-base sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder-slate-500 font-medium"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Security notice */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>Duy trì đăng nhập</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Bảo mật TLS 256-bit
                  </span>
                </div>

                {/* Primary Submit Button */}
                <button
                  id="btn-submit-login"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 disabled:opacity-70 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-98 min-h-[46px]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>ĐĂNG NHẬP VÀO HỆ THỐNG</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Single Sign-On Divider */}
              <div className="relative my-4 sm:my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-slate-900 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    Hoặc Google Workspace
                  </span>
                </div>
              </div>

              {/* Single Sign-On via Google Workspace */}
              <button
                id="btn-gmail-login"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-75 text-slate-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2.5 border border-slate-800 hover:border-slate-700 cursor-pointer min-h-[42px]"
              >
                {isGoogleLoading ? (
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Đăng nhập nhanh với Google Workspace</span>
                  </>
                )}
              </button>

              {/* Quick Actions inside Card on Mobile for convenience */}
              <div className="mt-4 pt-3.5 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelfEmail('');
                    setSelfMemberId('');
                    setShowSelfChangeModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-amber-400 font-medium cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Đổi mật khẩu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-slate-200 font-medium cursor-pointer transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Hỗ trợ tài khoản</span>
                </button>
              </div>
            </div>

            {/* Mobile Collapsible System Info: Keeps mobile login clean and compact */}
            <details className="lg:hidden group mt-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 text-left transition-all">
              <summary className="text-xs font-semibold text-slate-400 group-open:text-amber-400 cursor-pointer flex items-center justify-between select-none">
                <span className="flex items-center space-x-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thông tin hệ thống &amp; Bảo mật SLA</span>
                </span>
                <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                <p>
                  Hệ thống phân quyền 3 cấp (Lãnh đạo, TPKD, NVKD), tự động phân chia lead xoay vòng (Round-Robin) và giám sát SLA thời gian thực.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="font-bold text-amber-400 block">Round-Robin SLA</span>
                    <span className="text-slate-500">Giám sát phân bổ lead</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="font-bold text-emerald-400 block">Cơ sở dữ liệu độc lập</span>
                    <span className="text-slate-500">Bảo mật đa tầng nội bộ</span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Desktop Left Column: System Architecture & Security Assurance */}
          <div className="hidden lg:block lg:col-span-7 space-y-6 text-left order-2 lg:order-1 pt-0">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Hệ thống quản trị vận hành nội bộ • Bảo mật cơ sở dữ liệu</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Cổng quản trị &amp; tiếp nhận lead{' '}
              <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                SALEPRO HCM_E05
              </span>
            </h1>

            <p className="text-slate-300 text-base leading-relaxed max-w-2xl font-normal">
              Hệ thống điều hành kinh doanh bất động sản tập trung. Tài khoản và quyền hạn được cấp phát, quản lý và vận hành trực tiếp bởi bộ phận quản trị hệ thống Backend.
            </p>

            {/* Enterprise Feature Cards */}
            <div className="grid grid-cols-3 gap-3 pt-1 max-w-2xl">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs hover:border-amber-500/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">
                  Phân quyền vai trò nội bộ
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Phân quyền chặt chẽ giữa Ban lãnh đạo, Trưởng phòng kinh doanh (TPKD) và Chuyên viên kinh doanh (NVKD).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs hover:border-blue-500/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">
                  Phân bổ &amp; Giám sát SLA
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Tự động chia lead thông minh xoay vòng (Round-Robin), cảnh báo SLA tiếp cận khách hàng theo thời gian thực.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xs hover:border-emerald-500/40 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                  <Server className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white mb-1">
                  Cơ sở dữ liệu độc lập
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Toàn bộ dữ liệu khách hàng được lưu trữ an toàn trong Database máy chủ và Cloud Firestore, vận hành độc lập.
                </p>
              </div>
            </div>

            {/* Support Assistance Box for Desktop */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelfEmail('');
                  setSelfMemberId('');
                  setShowSelfChangeModal(true);
                }}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold transition-all cursor-pointer hover:border-amber-500/50 shadow-xs"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Đổi mật khẩu cá nhân</span>
              </button>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Hỗ trợ kỹ thuật tài khoản</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          © 2026 SALEPRO HCM_E05 CRM. Bản quyền nội bộ doanh nghiệp.
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-slate-500">
          <span>Phân quyền 3 cấp</span>
          <span>•</span>
          <span>Cơ sở dữ liệu độc lập</span>
          <span>•</span>
          <span>Giám sát SLA tự động</span>
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL: SELF CHANGE PASSWORD                               */}
      {/* ========================================================= */}
      {showSelfChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Đổi mật khẩu cá nhân
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cập nhật mật khẩu mới cho tài khoản của bạn
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSelfChangeModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selfError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{selfError}</span>
              </div>
            )}

            {selfSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selfSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSelfChangePasswordSubmit} className="space-y-3.5 text-xs text-slate-300">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tên đăng nhập hoặc Email công vụ <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={selfEmail}
                    onChange={(e) => {
                      const selVal = e.target.value;
                      setSelfEmail(selVal);
                      const found = findMemberSecure(selVal);
                      if (found) setSelfMemberId(found.id);
                    }}
                    placeholder="Nhập username hoặc email công vụ..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mật khẩu hiện tại <span className="text-amber-400">*</span>
                </label>
                <input
                  type={selfShowPass ? 'text' : 'password'}
                  value={selfCurrentPass}
                  onChange={(e) => setSelfCurrentPass(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mật khẩu mới <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={selfShowPass ? 'text' : 'password'}
                    value={selfNewPass}
                    onChange={(e) => setSelfNewPass(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setSelfShowPass(!selfShowPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {selfShowPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Xác nhận mật khẩu mới <span className="text-amber-400">*</span>
                </label>
                <input
                  type={selfShowPass ? 'text' : 'password'}
                  value={selfConfirmPass}
                  onChange={(e) => setSelfConfirmPass(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSelfChangeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSelfSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSelfSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: FORGOT PASSWORD & IT ADMIN SUPPORT                 */}
      {/* ========================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Hỗ trợ tài khoản &amp; Mật khẩu
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bộ phận Kỹ thuật &amp; Quản trị viên hệ thống
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p>
                <strong>1. Quy trình cấp lại mật khẩu:</strong> Vì lý do bảo mật nội bộ nghiêm ngặt, mật khẩu không được hiển thị công khai trên giao diện đăng nhập.
              </p>
              <p>
                <strong>2. Liên hệ Quản trị viên:</strong> Vui lòng liên hệ Trưởng phòng kinh doanh (TPKD) hoặc Quản trị viên hệ thống (Super Admin). Quản trị viên có thể đổi mật khẩu mới cho bạn ngay lập tức trong mục <strong>Quản lý nhân viên</strong> của Bảng quản trị.
              </p>
              <p>
                <strong>3. Tự đổi mật khẩu:</strong> Nếu bạn vẫn nhớ mật khẩu hiện tại, bạn có thể bấm <strong>"Đổi mật khẩu cá nhân"</strong> trên màn hình đăng nhập để tự cập nhật mật khẩu mới.
              </p>
              <p>
                <strong>4. Đăng nhập bằng Google Workspace:</strong> Nếu tài khoản Gmail công vụ của bạn đã được Admin phân quyền, bạn có thể sử dụng nút <strong>"Đăng nhập nhanh với Google Workspace"</strong>.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <PhoneCall className="w-4 h-4 text-amber-400" />
                <span>Hotline nội bộ: <a href="tel:0935555348" className="text-white hover:text-amber-400 font-bold transition-colors">093 5555 348</a></span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
