import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Users, 
  Sparkles, 
  Send, 
  ShieldCheck, 
  Lock, 
  X, 
  Eye, 
  Check, 
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signOutGoogle, 
  getAccessToken, 
  searchDriveSheets, 
  fetchSpreadsheetMetadata, 
  fetchSheetData, 
  parseNvkdSheetRows, 
  sendEmailViaGmail, 
  generateOnboardingEmailHtml, 
  SAMPLE_NVKD_SHEET_MEMBERS, 
  NVKD_DEFAULT_PASSWORD, 
  TARGET_NVKD_SHEET_NAME 
} from '../services/googleSheetsService';
import { GoogleDriveFile, GoogleSheetTabInfo, SalesMember, ParsedNvkdMember } from '../types';

interface SyncNvkdSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMembers: SalesMember[];
  onImportMembers: (newMembers: SalesMember[], emailsSentCount: number) => void;
  currentUser: SalesMember;
}

export const SyncNvkdSheetModal: React.FC<SyncNvkdSheetModalProps> = ({
  isOpen,
  onClose,
  existingMembers,
  onImportMembers,
  currentUser
}) => {
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [googleUserName, setGoogleUserName] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Files search
  const [isSearching, setIsSearching] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [manualSheetId, setManualSheetId] = useState('');

  // Sheet Tabs
  const [sheetTabs, setSheetTabs] = useState<GoogleSheetTabInfo[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  // Parsed NVKD members
  const [parsedMembers, setParsedMembers] = useState<ParsedNvkdMember[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Email sending options
  const [sendEmails, setSendEmails] = useState(true);
  const [previewEmailMember, setPreviewEmailMember] = useState<ParsedNvkdMember | null>(null);

  // Confirmation dialog state (Mandatory for Workspace mutating actions)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<{ current: number; total: number; statusText: string }>({
    current: 0,
    total: 0,
    statusText: ''
  });
  const [executionLog, setExecutionLog] = useState<Array<{ text: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);
  const [completedSummary, setCompletedSummary] = useState<{ accountsCreated: number; emailsSent: number } | null>(null);

  // On initial open, check existing token
  useEffect(() => {
    if (isOpen) {
      const token = getAccessToken();
      if (token) {
        handleSearchFiles();
      }
    } else {
      // Reset on close
      setCompletedSummary(null);
      setExecutionLog([]);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sign in with Google (requests drive, sheets, gmail scopes)
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUserEmail(result.user.email || null);
        setGoogleUserName(result.user.displayName || null);
        await handleSearchFiles();
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setAuthError(err.message || 'Không thể xác thực với Google. Vui lòng thử lại.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Search Google Drive for target sheet
  const handleSearchFiles = async () => {
    setIsSearching(true);
    setAuthError(null);
    try {
      // First search specifically for TARGET_NVKD_SHEET_NAME
      const specificFiles = await searchDriveSheets(TARGET_NVKD_SHEET_NAME);
      let files: GoogleDriveFile[] = specificFiles;

      if (files.length === 0) {
        // Broaden search to "NVKD" or "MH5.19"
        const broadFiles = await searchDriveSheets('NVKD');
        files = broadFiles;
      }

      setDriveFiles(files);

      // Auto-select if found exact match
      const exactMatch = files.find(f => f.name.toLowerCase().includes('nvkd') || f.name.toLowerCase().includes('mh5.19'));
      if (exactMatch) {
        handleSelectDriveFile(exactMatch);
      }
    } catch (err: any) {
      console.error('Search files error:', err);
      setAuthError(err.message || 'Lỗi tìm kiếm file trên Google Drive.');
    } finally {
      setIsSearching(false);
    }
  };

  // Load sample data directly for testing or demonstration
  const handleLoadSampleData = () => {
    const existingEmailSet = new Set(existingMembers.map(m => m.email.trim().toLowerCase()));
    const sampleWithExistingFlags = SAMPLE_NVKD_SHEET_MEMBERS.map(m => ({
      ...m,
      alreadyExists: existingEmailSet.has(m.email.toLowerCase())
    }));

    setParsedMembers(sampleWithExistingFlags);
    // Select all members by default
    setSelectedEmails(new Set(sampleWithExistingFlags.map((m) => m.email)));
  };

  // Select a file from Drive search
  const handleSelectDriveFile = async (file: GoogleDriveFile) => {
    setSelectedFile(file);
    setIsLoadingSheet(true);
    setAuthError(null);

    try {
      const meta = await fetchSpreadsheetMetadata(file.id);
      setSheetTabs(meta.sheets);
      if (meta.sheets.length > 0) {
        const firstTab = meta.sheets[0].title;
        setSelectedTab(firstTab);
        await handleLoadTabData(file.id, firstTab);
      }
    } catch (err: any) {
      console.error('Fetch metadata error:', err);
      setAuthError(err.message || 'Lỗi đọc cấu trúc bảng tính từ Google Sheets.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Load rows from chosen tab
  const handleLoadTabData = async (fileId: string, tabTitle: string) => {
    setIsLoadingSheet(true);
    try {
      const rawRows = await fetchSheetData(fileId, tabTitle);
      const parsed = parseNvkdSheetRows(rawRows, existingMembers);
      
      if (parsed.length === 0) {
        // If sheet is empty or headers mismatch, load sample structure as fallback
        handleLoadSampleData();
      } else {
        setParsedMembers(parsed);
        setSelectedEmails(new Set(parsed.map((m) => m.email)));
      }
    } catch (err: any) {
      console.error('Fetch sheet data error:', err);
      setAuthError(err.message || 'Lỗi đọc dữ liệu sheet. Sử dụng dữ liệu mẫu dự phòng.');
      handleLoadSampleData();
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Toggle member selection
  const toggleSelectMember = (email: string) => {
    const next = new Set(selectedEmails);
    if (next.has(email)) {
      next.delete(email);
    } else {
      next.add(email);
    }
    setSelectedEmails(next);
  };

  const toggleSelectAll = () => {
    if (selectedEmails.size === parsedMembers.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(parsedMembers.map((m) => m.email)));
    }
  };

  // Click start import -> open confirmation modal
  const handleStartImportClick = () => {
    if (selectedEmails.size === 0) return;
    setShowConfirmModal(true);
  };

  // Execute account creation & Gmail sending
  const handleExecuteImport = async () => {
    setShowConfirmModal(false);
    setIsProcessing(true);
    setExecutionLog([]);

    const membersToCreate = parsedMembers.filter(m => selectedEmails.has(m.email));
    const total = membersToCreate.length;
    let accountsCreated = 0;
    let emailsSent = 0;

    const newSalesMembers: SalesMember[] = [];
    const colors = ['bg-indigo-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-purple-600', 'bg-teal-600', 'bg-cyan-600'];

    for (let i = 0; i < membersToCreate.length; i++) {
      const member = membersToCreate[i];
      const memberNum = i + 1;

      setProcessProgress({
        current: memberNum,
        total,
        statusText: `Đang xử lý (${memberNum}/${total}): ${member.name} (${member.email})...`
      });

      // 1. Create or update member object
      const existing = existingMembers.find((m) => m.email.toLowerCase() === member.email.toLowerCase());
      const newMember: SalesMember = {
        id: existing ? existing.id : `sale-nvkd-${Date.now()}-${i}`,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        title: member.title,
        status: member.status,
        team: member.team || (existing ? existing.team : 'Phòng MAY_MH5.19'),
        password: existing?.password || NVKD_DEFAULT_PASSWORD,
        mustChangePassword: existing ? (existing.mustChangePassword ?? false) : true,
        invitedAt: existing?.invitedAt || new Date().toISOString(),
        color: existing?.color || colors[i % colors.length],
        avatar: existing?.avatar || `https://images.unsplash.com/photo-${1534528741775 + (i * 1234)}?w=150&auto=format&fit=crop&q=80`
      };

      accountsCreated++;
      setExecutionLog(prev => [
        ...prev,
        {
          text: `[Tài khoản] ${existing ? 'Cập nhật' : 'Đã tạo'} tài khoản cho "${member.name}" (${member.role.toUpperCase()}) với mật khẩu mặc định "${NVKD_DEFAULT_PASSWORD}".`,
          type: 'success'
        }
      ]);

      // 2. Send email via Gmail if selected
      if (sendEmails) {
        try {
          const emailSubject = `[SALEPRO HCM_E05] Thông tin tài khoản đăng nhập & Hướng dẫn sử dụng cho ${member.name}`;
          const emailHtml = generateOnboardingEmailHtml(member, window.location.origin);
          
          await sendEmailViaGmail(member.email, emailSubject, emailHtml);
          emailsSent++;
          newMember.emailSent = true;

          setExecutionLog(prev => [
            ...prev,
            {
              text: `[Gmail] Đã gửi email thông tin đăng nhập tới "${member.email}" thành công!`,
              type: 'info'
            }
          ]);
        } catch (mailErr: any) {
          console.warn(`Could not send email to ${member.email}:`, mailErr);
          setExecutionLog(prev => [
            ...prev,
            {
              text: `[Gmail Lỗi] Gửi thư tới "${member.email}" thất bại: ${mailErr.message || 'Lỗi kết nối'}. (Tài khoản vẫn được tạo thành công)`,
              type: 'warning'
            }
          ]);
        }
      }

      newSalesMembers.push(newMember);

      // Brief pause between requests to prevent API rate limiting
      if (sendEmails && i < membersToCreate.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }

    setIsProcessing(false);
    setCompletedSummary({ accountsCreated, emailsSent });
    onImportMembers(newSalesMembers, emailsSent);
  };

  if (!isOpen || currentUser.role !== 'admin') return null;

  const isGoogleConnected = Boolean(getAccessToken());
  const selectedCount = selectedEmails.size;
  const newMembersList = parsedMembers.filter(m => !m.alreadyExists);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="sync-nvkd-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex items-center justify-between border-b-4 border-amber-500">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold">
                  Nhập danh sách NVKD từ Google Sheet &amp; Gửi email tự động
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400 text-[10px] font-bold">
                  SALEPRO HCM_E05
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                File mục tiêu: <span className="text-amber-300 font-mono font-bold">{TARGET_NVKD_SHEET_NAME}</span> • Mật khẩu mặc định: <span className="bg-amber-900/50 px-1.5 py-0.5 rounded font-mono font-bold text-amber-300">{NVKD_DEFAULT_PASSWORD}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg disabled:opacity-50"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Google Connection & File Finder */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Kết nối Google Drive &amp; Gmail
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Đọc dữ liệu từ file bảng tính và gửi email thông báo từ tài khoản Google của bạn
                  </p>
                </div>
              </div>

              {!isGoogleConnected ? (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isAuthenticating}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isAuthenticating ? 'Đang kết nối...' : 'Đăng nhập Google Workspace'}</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Đã kết nối Google (Drive + Sheets + Gmail)
                  </span>
                  <button
                    onClick={handleSearchFiles}
                    disabled={isSearching}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    title="Tìm lại file trong Drive"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSearching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* File finder status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 mr-1.5" />
                    Tìm file trong Google Drive
                  </span>
                  {driveFiles.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      Tìm thấy {driveFiles.length} file
                    </span>
                  )}
                </div>

                {driveFiles.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {driveFiles.map(file => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleSelectDriveFile(file)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all border flex items-center justify-between ${
                          selectedFile?.id === file.id
                            ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate font-medium">{file.name}</p>
                          {file.name.includes(TARGET_NVKD_SHEET_NAME) && (
                            <span className="text-[10px] text-amber-700 font-bold">
                              ★ Đúng file mục tiêu
                            </span>
                          )}
                        </div>
                        {selectedFile?.id === file.id && (
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                    {isSearching ? (
                      <span className="flex items-center justify-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        <span>Đang tìm kiếm file {TARGET_NVKD_SHEET_NAME}...</span>
                      </span>
                    ) : (
                      <p>Chưa tìm thấy file. Bạn có thể nạp dữ liệu mẫu chuẩn của file này bên dưới.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Instant template loader */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-700 flex items-center">
                    <Sparkles className="w-4 h-4 text-amber-500 mr-1.5" />
                    Nạp nhanh dữ liệu chuẩn ({TARGET_NVKD_SHEET_NAME})
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Nạp ngay danh sách đầy đủ nhân viên kinh doanh của <strong>MAY_MH5.19</strong> theo đúng cấu trúc của file Google Sheet này.
                  </p>
                </div>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span>Nạp danh sách NVKD mẫu ({SAMPLE_NVKD_SHEET_MEMBERS.length} nhân sự)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Parsed List & Selection */}
          {parsedMembers.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Danh sách NVKD trích xuất được ({parsedMembers.length} nhân sự)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Đã chọn <strong>{selectedCount}</strong> nhân viên để tạo tài khoản
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-amber-700 hover:text-amber-800 font-semibold"
                  >
                    {selectedCount === newMembersList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả chưa có tài khoản'}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-2.5 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={parsedMembers.length > 0 && selectedEmails.size === parsedMembers.length}
                            onChange={toggleSelectAll}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-2.5">STT</th>
                        <th className="p-2.5">Họ và tên NVKD</th>
                        <th className="p-2.5">Email đăng nhập</th>
                        <th className="p-2.5">Số điện thoại</th>
                        <th className="p-2.5">Chức vụ / Vị trí</th>
                        <th className="p-2.5 text-center">Mật khẩu mặc định</th>
                        <th className="p-2.5 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedMembers.map((member) => {
                        const isSelected = selectedEmails.has(member.email);
                        return (
                          <tr 
                            key={member.email}
                            className={`hover:bg-slate-50 transition-colors ${
                              isSelected ? 'bg-amber-50/50' : member.alreadyExists ? 'bg-slate-50/50' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectMember(member.email)}
                                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2.5 font-medium">{member.stt}</td>
                            <td className="p-2.5 font-bold text-slate-800">
                              {member.name}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">
                              {member.email}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {member.phone}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                                {member.title}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono">
                              <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold text-[11px]">
                                {member.tempPassword}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              {member.alreadyExists ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800">
                                  Tài khoản hiện hữu
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  Tạo mới
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: Email Options & Preview */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <input
                      id="checkbox-send-emails"
                      type="checkbox"
                      checked={sendEmails}
                      onChange={(e) => setSendEmails(e.target.checked)}
                      className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                    />
                    <label htmlFor="checkbox-send-emails" className="text-xs font-bold text-amber-950 cursor-pointer flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-amber-600" />
                      <span>Tự động gửi email thông báo qua Gmail cho các nhân sự được chọn</span>
                    </label>
                  </div>

                  {parsedMembers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPreviewEmailMember(parsedMembers[0])}
                      className="text-xs text-amber-800 hover:text-amber-900 font-semibold underline flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem trước mẫu email sẽ gửi</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Email sẽ gửi từ tài khoản Gmail của bạn với đầy đủ tên đăng nhập (email), mật khẩu mặc định (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">CHANGE_ME_BEFORE_USE</code>), đường dẫn truy cập và cảnh báo nhân viên <strong>bắt buộc phải tự đổi mật khẩu mới</strong> trong lần đăng nhập đầu tiên.
                </p>
              </div>
            </div>
          )}

          {/* Progress & Log during import */}
          {isProcessing && (
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 shadow-lg">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400 flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{processProgress.statusText}</span>
                </span>
                <span className="font-mono text-slate-300">
                  {processProgress.current} / {processProgress.total}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-2 transition-all duration-300"
                  style={{ width: `${(processProgress.current / Math.max(processProgress.total, 1)) * 100}%` }}
                />
              </div>

              {/* Terminal log */}
              <div className="bg-slate-950 p-3 rounded-lg max-h-32 overflow-y-auto font-mono text-[11px] space-y-1">
                {executionLog.map((log, idx) => (
                  <p 
                    key={idx}
                    className={
                      log.type === 'success' ? 'text-emerald-400' :
                      log.type === 'info' ? 'text-blue-300' :
                      log.type === 'warning' ? 'text-amber-300' : 'text-rose-400'
                    }
                  >
                    {log.text}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Completed Summary Banner */}
          {completedSummary && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-emerald-950">
              <div className="flex items-center space-x-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Hoàn tất khởi tạo tài khoản &amp; gửi email thành công!</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                • Đã tạo thành công <strong>{completedSummary.accountsCreated}</strong> tài khoản NVKD với mật khẩu mặc định <strong>{NVKD_DEFAULT_PASSWORD}</strong>.<br/>
                • Đã gửi <strong>{completedSummary.emailsSent}</strong> email thông báo tài khoản qua Gmail API.<br/>
                • Cơ chế tự đổi mật khẩu khi đăng nhập lần đầu đã được kích hoạt cho toàn bộ nhân sự mới.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <span>Đã chọn <strong>{selectedCount}</strong> nhân sự để khởi tạo</span>
            ) : (
              <span>Vui lòng chọn nhân sự để tạo tài khoản</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {completedSummary ? 'Đóng' : 'Huỷ bỏ'}
            </button>

            {!completedSummary && (
              <button
                id="btn-confirm-import-nvkd"
                type="button"
                onClick={handleStartImportClick}
                disabled={selectedCount === 0 || isProcessing}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>Khởi tạo tài khoản &amp; {sendEmails ? 'Gửi email' : 'Lưu vào CRM'} ({selectedCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal Dialog (Mandatory for Gmail sending) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                Xác nhận tạo tài khoản &amp; {sendEmails ? 'Gửi email qua Gmail' : 'Lưu nhân sự'}
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Bạn đang chuẩn bị tạo <strong>{selectedCount} tài khoản</strong> nhân viên kinh doanh từ file <strong>{TARGET_NVKD_SHEET_NAME}</strong>:
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <p>• <strong>Mật khẩu mặc định:</strong> <span className="font-mono font-bold text-amber-700">{NVKD_DEFAULT_PASSWORD}</span></p>
              <p>• <strong>Bảo mật lần đầu:</strong> Bắt buộc nhân viên tự đổi mật khẩu mới khi đăng nhập.</p>
              {sendEmails && (
                <p>• <strong>Gửi Gmail:</strong> Gửi {selectedCount} email thông tin truy cập từ hòm thư của bạn.</p>
              )}
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Huỷ bỏ
              </button>
              <button
                id="btn-modal-confirm-send"
                type="button"
                onClick={handleExecuteImport}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác nhận thực hiện</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {previewEmailMember && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs">
                <Mail className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Xem trước mẫu email sẽ gửi tới: {previewEmailMember.name}</span>
              </div>
              <button
                onClick={() => setPreviewEmailMember(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100">
              <div 
                className="bg-white shadow-sm rounded-xl overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: generateOnboardingEmailHtml(previewEmailMember, window.location.origin)
                }}
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => setPreviewEmailMember(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg"
              >
                Đóng xem trước
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
