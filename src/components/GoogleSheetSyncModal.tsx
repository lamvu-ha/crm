import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Search, 
  Table, 
  Users, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Layers,
  X,
  Plus,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signOutGoogle, 
  getAccessToken, 
  searchDriveSheets, 
  fetchSpreadsheetMetadata, 
  fetchSheetData, 
  detectColumnMapping, 
  parseMayMh5SheetToLeads,
  SAMPLE_MAY_MH5_SHEET_LEADS,
  ColumnMappingResult,
  TARGET_CRM_SHEET_NAME
} from '../services/googleSheetsService';
import { GoogleDriveFile, GoogleSheetTabInfo, Lead, SalesMember } from '../types';
import { scanBulkLeadsForDuplicates } from '../utils/phoneDuplicateUtils';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportLeads: (leads: Lead[], mode: 'append' | 'replace', distributionMode?: 'auto_all' | 'auto_unassigned' | 'keep_sheet') => void;
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  existingLeadsCount?: number;
  existingLeads?: Lead[];
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  onImportLeads,
  currentUser,
  salesMembers = [],
  existingLeadsCount = 0,
  existingLeads = []
}) => {
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [googleUserName, setGoogleUserName] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Search & Files
  const [isSearching, setIsSearching] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [customSheetUrl, setCustomSheetUrl] = useState<string>('');

  // Sheet Data
  const [sheetMetadata, setSheetMetadata] = useState<{ title: string; sheets: GoogleSheetTabInfo[] } | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [parsedPreviewLeads, setParsedPreviewLeads] = useState<Lead[]>([]);
  const [detectedMapping, setDetectedMapping] = useState<ColumnMappingResult | null>(null);

  // Import & Distribution mode & Duplicate filtering
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoDistribute, setAutoDistribute] = useState<boolean>(true);
  const [distributionMode, setDistributionMode] = useState<'auto_all' | 'auto_unassigned' | 'keep_sheet'>('auto_all');
  const [excludeDuplicates, setExcludeDuplicates] = useState<boolean>(true);
  const [showDuplicateList, setShowDuplicateList] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bulk phone duplicate detection for Google Sheet leads
  const duplicateReport = useMemo(() => {
    if (importMode === 'replace') {
      // In replace mode, check intra-batch duplicates only
      return scanBulkLeadsForDuplicates(parsedPreviewLeads, []);
    }
    return scanBulkLeadsForDuplicates(parsedPreviewLeads, existingLeads);
  }, [parsedPreviewLeads, existingLeads, importMode]);

  // Check auth state when opening modal
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      handleSearchFiles(TARGET_CRM_SHEET_NAME);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const result = await signInWithGoogle();
      if (result) {
        setGoogleUserEmail(result.user.email);
        setGoogleUserName(result.user.displayName || result.user.email);
        // Automatically search for target sheet MAY_TRUONGBV_MH5.19_CRM_V.1
        await handleSearchFiles(TARGET_CRM_SHEET_NAME);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Không thể đăng nhập Google. Vui lòng thử lại.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogle();
    setGoogleUserEmail(null);
    setGoogleUserName(null);
    setDriveFiles([]);
    setSheetMetadata(null);
    setRawRows([]);
    setParsedPreviewLeads([]);
  };

  const handleSearchFiles = async (query: string = TARGET_CRM_SHEET_NAME) => {
    setIsSearching(true);
    setAuthError(null);
    try {
      // First search specifically for TARGET_CRM_SHEET_NAME
      let files: GoogleDriveFile[] = await searchDriveSheets(query);
      
      // If none found with specific full name, fall back to searching "MAY_TRUONGBV" or all sheets
      if (!files || files.length === 0) {
        files = await searchDriveSheets('MAY_TRUONGBV');
      }
      if (!files || files.length === 0) {
        files = await searchDriveSheets('');
      }

      setDriveFiles(files);
      // Prioritize selecting MAY_TRUONGBV_MH5.19_CRM_V.1
      const target = files.find(f => 
        f.name.includes(TARGET_CRM_SHEET_NAME) || 
        f.name.toUpperCase().includes('MAY_TRUONGBV') ||
        f.name.toUpperCase().includes('MH5.19_CRM')
      );
      if (target) {
        setSelectedFileId(target.id);
        handleLoadSpreadsheet(target.id);
      } else if (files.length > 0) {
        setSelectedFileId(files[0].id);
        handleLoadSpreadsheet(files[0].id);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setAuthError(err.message || 'Không thể tìm kiếm tệp trên Google Drive.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadSpreadsheet = async (fileId: string) => {
    if (!fileId) return;
    setIsLoadingSheet(true);
    setAuthError(null);
    try {
      const meta = await fetchSpreadsheetMetadata(fileId);
      setSheetMetadata(meta);
      const firstTab = meta.sheets[0]?.title || 'Sheet1';
      setSelectedTab(firstTab);
      await handleLoadTabValues(fileId, firstTab);
    } catch (err: any) {
      console.error('Load sheet error:', err);
      setAuthError(err.message || 'Không thể tải thông tin bảng tính Google Sheet.');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleLoadTabValues = async (fileId: string, tabTitle: string) => {
    setIsLoadingSheet(true);
    try {
      const rows = await fetchSheetData(fileId, tabTitle);
      setRawRows(rows);
      if (rows && rows.length > 0) {
        const mapping = detectColumnMapping(rows);
        setDetectedMapping(mapping);
        const leads = parseMayMh5SheetToLeads(rows, existingLeadsCount, salesMembers);
        setParsedPreviewLeads(leads);
      } else {
        setParsedPreviewLeads([]);
      }
    } catch (err: any) {
      console.error('Fetch values error:', err);
      setAuthError(err.message || 'Lỗi đọc dữ liệu sheet');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const handleExtractIdAndLoad = () => {
    if (!customSheetUrl.trim()) return;
    // Extract ID from URL
    const match = customSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const id = match ? match[1] : customSheetUrl.trim();
    setSelectedFileId(id);
    handleLoadSpreadsheet(id);
  };

  const handleApplySampleTemplate = () => {
    // Apply authentic sample of TARGET_CRM_SHEET_NAME
    setParsedPreviewLeads(SAMPLE_MAY_MH5_SHEET_LEADS);
    setSheetMetadata({
      title: `${TARGET_CRM_SHEET_NAME} (Mẫu chuẩn cấu trúc CRM BĐS)`,
      sheets: [
        { sheetId: 1, title: 'CRM_LEAD_MH5.19', rowCount: 15, columnCount: 12 },
        { sheetId: 2, title: 'BÁO CÁO CHỐT CỌC', rowCount: 10, columnCount: 8 }
      ]
    });
    setSuccessMessage(`Đã tải cấu trúc chuẩn của file Google Sheet "${TARGET_CRM_SHEET_NAME}" với đầy đủ trường dữ liệu thực tế.`);
  };

  const handleExecuteImport = () => {
    if (parsedPreviewLeads.length === 0) return;
    const finalDistMode = autoDistribute ? distributionMode : 'keep_sheet';
    
    // Check duplicate filtering
    const leadsToImport = (excludeDuplicates && duplicateReport.duplicateCount > 0)
      ? duplicateReport.cleanItems
      : parsedPreviewLeads;

    if (leadsToImport.length === 0) {
      alert('Tất cả khách hàng từ Google Sheet đều đã trùng số điện thoại với dữ liệu hiện có trong CRM!');
      return;
    }

    onImportLeads(leadsToImport, importMode, finalDistMode);
    setSuccessMessage(`Đã đồng bộ thành công ${leadsToImport.length} khách hàng từ file ${TARGET_CRM_SHEET_NAME} và cập nhật phân bổ cho đội Sale!`);
    setTimeout(() => {
      onClose();
    }, 1800);
  };

  const hasGoogleToken = !!getAccessToken();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold">Đồng bộ Google Sheet: {TARGET_CRM_SHEET_NAME}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-400/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-0.5">
                Đọc dữ liệu từ Google Drive, tự động nhận diện cột và đồng bộ dữ liệu vào CRM từ file {TARGET_CRM_SHEET_NAME}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Auth Error Banner */}
          {authError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Step 1: Google Connection */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Bước 1: Kết nối tài khoản Google</span>
                <h4 className="text-sm font-bold text-slate-800 mt-0.5">Xác thực quyền đọc Google Drive & Google Sheets</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quyền an toàn chỉ đọc (ReadOnly) đối với file bảng tính trong Google Drive của bạn.
                </p>
              </div>

              {hasGoogleToken ? (
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Đã kết nối Google Drive
                    </span>
                    {googleUserEmail && (
                      <p className="text-[11px] text-slate-500 truncate max-w-[200px]">{googleUserEmail}</p>
                    )}
                  </div>
                  <button
                    onClick={handleGoogleSignOut}
                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium border border-rose-200"
                  >
                    Đăng xuất Google
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isAuthenticating}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-300 rounded-xl shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isAuthenticating ? 'Đang mở cửa sổ xác thực...' : 'Đăng nhập với Google'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplySampleTemplate}
                    className="px-3 py-2 bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition-colors"
                    title={`Trải nghiệm ngay cấu trúc ${TARGET_CRM_SHEET_NAME} mà không cần đăng nhập`}
                  >
                    ⚡ Nạp mẫu CRM MH5.19 ngay
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Select File in Drive or Paste URL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Bước 2: Tìm & Chọn file trong Google Drive</span>
                <h4 className="text-sm font-bold text-slate-800">
                  File mục tiêu: <span className="font-mono text-emerald-700 font-bold">{TARGET_CRM_SHEET_NAME}</span>
                </h4>
              </div>
              {hasGoogleToken && (
                <button
                  onClick={() => handleSearchFiles(TARGET_CRM_SHEET_NAME)}
                  disabled={isSearching}
                  className="inline-flex items-center space-x-1 text-xs text-emerald-700 font-semibold hover:underline"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                  <span>Quét lại Google Drive</span>
                </button>
              )}
            </div>

            {hasGoogleToken && driveFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {driveFiles.map((file) => {
                  const isMatch = file.name.includes(TARGET_CRM_SHEET_NAME) || file.name.toUpperCase().includes('MAY_TRUONGBV') || file.name.toUpperCase().includes('MH5.19_CRM');
                  const isSelected = selectedFileId === file.id;

                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        setSelectedFileId(file.id);
                        handleLoadSpreadsheet(file.id);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400/20'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <FileSpreadsheet className={`w-5 h-5 shrink-0 mt-0.5 ${isMatch ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                          {isMatch && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              🎯 Khớp file CRM
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">ID: {file.id}</p>
                      </div>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-emerald-600 p-1"
                          title="Mở trên Google Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alternative: Direct URL or ID input */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="text"
                value={customSheetUrl}
                onChange={(e) => setCustomSheetUrl(e.target.value)}
                placeholder="Hoặc dán Link Google Sheet hoặc ID file (VD: https://docs.google.com/spreadsheets/d/...)"
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                onClick={handleExtractIdAndLoad}
                disabled={!customSheetUrl.trim() || isLoadingSheet}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition-colors"
              >
                {isLoadingSheet ? 'Đang đọc...' : 'Đọc dữ liệu'}
              </button>
            </div>
          </div>

          {/* Step 3: Analysis & Column Mapping for CRM MH5.19 */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Bước 3: Nhận diện Cấu trúc CRM ({TARGET_CRM_SHEET_NAME})</span>
                <h4 className="text-sm font-bold text-slate-800">
                  {sheetMetadata ? sheetMetadata.title : 'Đang phân tích cấu trúc cột...'}
                </h4>
              </div>

              {sheetMetadata && sheetMetadata.sheets.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Chọn Sheet tab:</span>
                  <select
                    value={selectedTab}
                    onChange={(e) => {
                      setSelectedTab(e.target.value);
                      if (selectedFileId) handleLoadTabValues(selectedFileId, e.target.value);
                    }}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium"
                  >
                    {sheetMetadata.sheets.map((s) => (
                      <option key={s.sheetId} value={s.title}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Column badges preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>Các cột cốt lõi được nhận diện tự động từ {TARGET_CRM_SHEET_NAME}:</span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-700">
                  🔢 STT
                </span>
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-700">
                  📅 Ngày nhận Lead
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-300 font-bold text-emerald-800">
                  👤 Họ tên khách hàng
                </span>
                <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-300 font-bold text-emerald-800">
                  📞 Số điện thoại
                </span>
                <span className="px-2 py-1 rounded-md bg-blue-50 border border-blue-300 font-bold text-blue-800">
                  🏷️ Nguồn Lead: MAY_TRUONGBV_MH5.19
                </span>
                <span className="px-2 py-1 rounded-md bg-purple-50 border border-purple-300 font-bold text-purple-800">
                  🏢 Sản phẩm / Mã MH5.19
                </span>
                <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-300 font-bold text-amber-800">
                  💰 Khoảng giá tài chính
                </span>
                <span className="px-2 py-1 rounded-md bg-teal-50 border border-teal-300 font-bold text-teal-800">
                  📲 Tình trạng cuộc gọi
                </span>
                <span className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-300 font-bold text-indigo-800">
                  📊 Trạng thái Phễu CRM
                </span>
                <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-300 font-bold text-rose-800">
                  👔 Chuyên viên phụ trách
                </span>
                <span className="px-2 py-1 rounded-md bg-white border border-slate-200 font-medium text-slate-700">
                  📝 Lịch hẹn & Ghi chú
                </span>
              </div>
            </div>

            {/* Preview Leads Table */}
            {parsedPreviewLeads.length > 0 && (
              <div className="space-y-3">
                {/* Duplicate Phone Warning Box */}
                {duplicateReport.duplicateCount > 0 ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2 text-rose-800">
                        <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-xs block text-rose-950">
                            CẢNH BÁO: PHÁT HIỆN {duplicateReport.duplicateCount} KHÁCH HÀNG TRÙNG SỐ ĐIỆN THOẠI!
                          </span>
                          <span className="text-[11px] text-rose-700 block mt-0.5">
                            File Google Sheet có {duplicateReport.duplicateCount} số điện thoại đã tồn tại trên CRM hoặc bị trùng nhau.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDuplicateList(!showDuplicateList)}
                        className="px-2.5 py-1 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                      >
                        {showDuplicateList ? 'Ẩn danh sách' : `Xem ${duplicateReport.duplicateCount} khách trùng`}
                      </button>
                    </div>

                    {showDuplicateList && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-white/95 rounded-lg border border-rose-200 text-[11px]">
                        {duplicateReport.duplicates.map((dup, idx) => (
                          <div key={idx} className="p-1.5 bg-rose-50/70 rounded border border-rose-100 flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-800">{dup.item.fullName}</span>
                              <span className="font-mono text-rose-700 ml-1.5 font-bold">({dup.phone})</span>
                            </div>
                            <div className="text-[10px] text-slate-500 text-right">
                              <span>Trùng khách: <strong>{dup.existingLead.fullName}</strong></span>
                              <span className="ml-1 text-indigo-700 font-semibold">(Sale: {dup.existingLead.assignee})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="flex items-center space-x-2 pt-1 border-t border-rose-200/80 cursor-pointer text-xs font-bold text-rose-900">
                      <input
                        type="checkbox"
                        checked={excludeDuplicates}
                        onChange={(e) => setExcludeDuplicates(e.target.checked)}
                        className="w-4 h-4 rounded border-rose-400 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <span>
                        Tự động loại bỏ {duplicateReport.duplicateCount} khách trùng SĐT (Chỉ nạp {duplicateReport.uniqueCount} khách mới vào CRM)
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>✓ Đã quét SĐT: Không có khách hàng nào bị trùng lặp với CRM!</span>
                    </div>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      {parsedPreviewLeads.length} khách mới
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold">
                    Xem trước {parsedPreviewLeads.length} Lead được trích xuất từ file:
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    ✓ Đã chuẩn hóa danh tính, SĐT và phân bổ dữ liệu CRM
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                        <th className="py-2 px-3">STT</th>
                        <th className="py-2 px-3">Ngày</th>
                        <th className="py-2 px-3">Khách hàng</th>
                        <th className="py-2 px-3">SĐT</th>
                        <th className="py-2 px-3">Nguồn / Máy</th>
                        <th className="py-2 px-3">Dự án MH5.19</th>
                        <th className="py-2 px-3">Tài chính</th>
                        <th className="py-2 px-3">Cuộc gọi</th>
                        <th className="py-2 px-3">Trạng thái</th>
                        <th className="py-2 px-3">Phụ trách</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {parsedPreviewLeads.map((lead, idx) => (
                        <tr key={lead.id || idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono text-slate-400">{lead.stt || idx + 1}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-500">{lead.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{lead.fullName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{lead.phone}</td>
                          <td className="py-2 px-3">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-semibold">
                              {lead.dataSource}
                            </span>
                          </td>
                          <td className="py-2 px-3 max-w-[140px] truncate text-slate-700" title={lead.project}>
                            {lead.project}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-amber-700">{lead.budget}</td>
                          <td className="py-2 px-3 whitespace-nowrap text-slate-600">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                              {lead.callStatus || 'Đã nghe máy'}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              {lead.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-700">
                            {lead.assignee === 'Chưa phân bổ' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Chưa phân bổ {autoDistribute && '(→ Sẽ chia cho Sale)'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-800">
                                <UserCheck className="w-3 h-3 text-emerald-600" />
                                {lead.assignee}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Distribution Configuration Section */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDistribute}
                  onChange={(e) => setAutoDistribute(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5 flex-wrap">
                  <span>⚡ Tự động phân bổ khách hàng cho Đội ngũ Sale (NVKD)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-200/70 text-amber-900 border border-amber-300 font-semibold">
                    {salesMembers.filter((s) => s.status === 'active' && s.role === 'sale').length} NVKD (gồm Trần Minh Phúc)
                  </span>
                </span>
              </label>
              <span className="text-[11px] text-amber-800 font-medium hidden sm:inline">
                {autoDistribute ? 'Sẽ tự động điều phối cho chuyên viên sale' : 'Giữ nguyên phân công trong file Sheet'}
              </span>
            </div>

            {autoDistribute && (
              <div className="pl-6 pt-1 flex flex-col sm:flex-row gap-3 text-xs text-amber-950">
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sheetDistMode"
                    checked={distributionMode === 'auto_all'}
                    onChange={() => setDistributionMode('auto_all')}
                    className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="font-medium">
                    <strong>Phân bổ đều tất cả Lead (Round-Robin)</strong> cho các Sale (NVKD)
                  </span>
                </label>

                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="sheetDistMode"
                    checked={distributionMode === 'auto_unassigned'}
                    onChange={() => setDistributionMode('auto_unassigned')}
                    className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="font-medium">
                    Chỉ chia khách <strong>chưa có người phụ trách</strong> (giữ nguyên sale đã có)
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Import Settings & Actions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-xs font-semibold text-slate-700">Phương thức nạp:</span>
              <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Thêm vào danh sách hiện có ({existingLeadsCount} Lead)</span>
              </label>
              <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span>Ghi đè bằng dữ liệu Google Sheet</span>
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={parsedPreviewLeads.length === 0}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center space-x-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>
                  Nhập {excludeDuplicates && duplicateReport.duplicateCount > 0 ? duplicateReport.uniqueCount : parsedPreviewLeads.length} Lead & Phân bổ cho Sale
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
