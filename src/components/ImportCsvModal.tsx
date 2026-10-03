import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  Users, 
  Shuffle, 
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  PhoneCall
} from 'lucide-react';
import { Lead, SalesMember, LeadDuplicateHandlingMode, LeadAssignTargetMode, ImportLeadsOptions } from '../types';
import { profileIssues } from '../utils/customerWorkflow';
import { parseCSVToLeads } from '../utils/csvHelper';
import { scanBulkLeadsForDuplicates } from '../utils/phoneDuplicateUtils';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (
    newLeads: Partial<Lead>[], 
    options: ImportLeadsOptions
  ) => void;
  currentLeadsCount: number;
  existingLeads?: Lead[];
  salesMembers?: SalesMember[];
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({
  isOpen,
  onClose,
  onImport,
  currentLeadsCount,
  existingLeads = [],
  salesMembers = []
}) => {
  const [csvText, setCsvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<Partial<Lead>[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  
  // Assignment target options
  const [assignTargetMode, setAssignTargetMode] = useState<LeadAssignTargetMode>('single_sale');
  const [targetSaleName, setTargetSaleName] = useState<string>(() => {
    const firstSale = salesMembers.find(m => m.role === 'sale' && m.status === 'active') || salesMembers[0];
    return firstSale?.name || '';
  });

  // Duplicate resolution options
  const [duplicateHandlingMode, setDuplicateHandlingMode] = useState<LeadDuplicateHandlingMode>('skip_protect_old_sale');
  const [showDuplicateList, setShowDuplicateList] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter active sales members for assignment dropdown
  const activeSalesMembers = useMemo(() => {
    return salesMembers.filter(m => m.status === 'active' && !m.email.toLowerCase().endsWith('@nhaphotrungtam.com.vn'));
  }, [salesMembers]);

  // Bulk duplicate phone scanning against existing CRM leads
  const duplicateReport = useMemo(() => {
    return scanBulkLeadsForDuplicates(parsedPreview, existingLeads);
  }, [parsedPreview, existingLeads]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsedPreview([]);
    setFileName(file.name);
    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      try {
        const parsed = parseCSVToLeads(text, currentLeadsCount);
        if (parsed.length === 0) {
          setError('Không tìm thấy dòng dữ liệu hợp lệ trong file. Vui lòng kiểm tra tiêu đề các cột.');
        } else {
          setParsedPreview(parsed);
        }
      } catch (err) {
        setError('Có lỗi khi đọc file CSV. Vui lòng kiểm tra định dạng.');
      }
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setCsvText(text);
    setError('');
    if (!text.trim()) {
      setParsedPreview([]);
      return;
    }
    try {
      const parsed = parseCSVToLeads(text, currentLeadsCount);
      setParsedPreview(parsed);
    } catch (err) {
      // ignore while typing
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) {
      setError('Vui lòng chọn file CSV hoặc dán nội dung dữ liệu.');
      return;
    }

    if (assignTargetMode === 'single_sale' && !targetSaleName) {
      setError('Vui lòng chọn nhân viên kinh doanh tiếp nhận đợt khách này.');
      return;
    }

    const invalidContacts = parsedPreview.filter(lead => profileIssues(lead).some(issue => ['Thiếu tên', 'SĐT không hợp lệ', 'Email không hợp lệ'].includes(issue)));
    if (invalidContacts.length) {
      setError(`Có ${invalidContacts.length} hồ sơ thiếu tên hoặc sai thông tin liên hệ. Vui lòng sửa file trước khi nhập.`);
      return;
    }
    // Determine leads to import based on duplicate handling
    let leadsToImport = parsedPreview;
    if (duplicateReport.duplicateCount > 0) {
      if (duplicateHandlingMode === 'skip_protect_old_sale' || duplicateHandlingMode === 'update_old_sale_note') {
        leadsToImport = duplicateReport.cleanItems;
      }
    }

    if (leadsToImport.length === 0 && duplicateHandlingMode === 'skip_protect_old_sale') {
      setError('Tất cả khách hàng trong file đều đã trùng số điện thoại với các Sale ở bước trước. Toàn bộ đã được bảo vệ cho Sale cũ!');
      return;
    }

    onImport(leadsToImport, {
      assignTargetMode,
      targetSaleName,
      duplicateHandlingMode
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <span>Tải lên khách hàng &amp; phân bổ cho sale</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                  Chống trùng lặp
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Tải file CSV, chọn Sale tiếp nhận và tự động bảo vệ quyền sở hữu cho Sale ở bước trước
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload area (Scrollable) */}
        <div className="space-y-4 text-xs overflow-y-auto touch-scroll pr-1 flex-1 pb-safe">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,text/csv"
            className="hidden"
          />

          {/* Drag & Drop Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl p-4 sm:p-5 text-center cursor-pointer bg-slate-50 hover:bg-amber-50/30 transition-all group"
          >
            <FileText className="w-8 h-8 mx-auto text-amber-600 group-hover:scale-110 transition-transform mb-1.5" />
            <p className="font-bold text-slate-800 text-xs sm:text-sm">
              {fileName ? fileName : 'Bấm để tải file CSV khách hàng từ thiết bị'}
            </p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Hỗ trợ file .csv (UTF-8) xuất từ Excel, Google Sheets, CRM cũ
            </p>
          </div>

          <div className="relative flex py-0.5 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">hoặc dán văn bản CSV</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <textarea
            rows={3}
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="STT,Ngày,Họ và tên,Điện thoại,Tệp dữ liệu,Loại sản phẩm,Tình trạng,Dự án,Người phụ trách,Ghi chú&#10;1,2026-09-25,Nguyễn Văn An,0903888999,Facebook Ads,Nhà phố trung tâm,Khách mới,Nhà Phố Quận 1,Nam,Khách hỏi mua nhà phố"
            className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
          />

          {error && (
            <div className="flex items-center text-rose-700 text-xs bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {parsedPreview.length > 0 && (
            <div className="space-y-3.5">
              {/* SECTION 1: TARGET ASSIGNEE SELECTION */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Bước 1: Chọn đích chuyển giao đợt khách này:</span>
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">
                    Tổng: {parsedPreview.length} khách trong file
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-all ${
                    assignTargetMode === 'single_sale'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="assignTargetMode"
                        value="single_sale"
                        checked={assignTargetMode === 'single_sale'}
                        onChange={() => setAssignTargetMode('single_sale')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-bold text-xs">Giao 1 Sale cụ thể</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 pl-5">
                      Giao toàn bộ đợt này cho 1 nhân sự kinh doanh
                    </span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-all ${
                    assignTargetMode === 'round_robin'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="assignTargetMode"
                        value="round_robin"
                        checked={assignTargetMode === 'round_robin'}
                        onChange={() => setAssignTargetMode('round_robin')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-bold text-xs">Chia đều Round-Robin</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 pl-5">
                      Tự động chia xoay vòng cho toàn bộ đội ngũ Sale
                    </span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex flex-col cursor-pointer transition-all ${
                    assignTargetMode === 'as_in_file'
                      ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="assignTargetMode"
                        value="as_in_file"
                        checked={assignTargetMode === 'as_in_file'}
                        onChange={() => setAssignTargetMode('as_in_file')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-bold text-xs">Theo file CSV</span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 pl-5">
                      Giữ nguyên cột "Người phụ trách" có sẵn
                    </span>
                  </label>
                </div>

                {/* Dropdown to pick specific sale */}
                {assignTargetMode === 'single_sale' && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Chọn chuyên viên tiếp nhận đợt khách này:
                    </label>
                    <select
                      value={targetSaleName}
                      onChange={(e) => setTargetSaleName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
                    >
                      <option value="">-- Bấm để chọn Nhân viên kinh doanh --</option>
                      {activeSalesMembers.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} • {m.role === 'admin' ? 'Ban Giám Đốc' : m.role === 'tpkd' ? 'TPKD' : 'NVKD'} ({m.team || 'MAY_MH5.19'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SECTION 2: DUPLICATE DETECTION & PROTECTION POLICIES */}
              {duplicateReport.duplicateCount > 0 ? (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2.5 text-rose-900">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                          <span>PHÁT HIỆN {duplicateReport.duplicateCount} KHÁCH HÀNG TRÙNG VỚI SALE Ở BƯỚC TRƯỚC!</span>
                        </div>
                        <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                          Trong file này có <strong>{duplicateReport.duplicateCount} số điện thoại</strong> đã từng được tải lên và <strong>đang thuộc quyền chăm sóc của Sale khác</strong> (từ bước 1).
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateList(!showDuplicateList)}
                      className="px-2.5 py-1 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      {showDuplicateList ? 'Thu gọn' : `Xem ${duplicateReport.duplicateCount} khách trùng`}
                    </button>
                  </div>

                  {/* Duplicate items list details */}
                  {showDuplicateList && (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-white rounded-lg border border-rose-200 text-[11px]">
                      {duplicateReport.duplicates.map((dup, idx) => (
                        <div key={idx} className="p-2 bg-rose-50/70 rounded-lg border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              <span>{dup.item.fullName || 'Khách hàng'}</span>
                              <span className="font-mono text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded font-bold text-[10px]">
                                {dup.phone}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Dự án mới: {dup.item.project || 'Nhà Phố Trung Tâm'} • Nguồn: {dup.item.dataSource || 'CSV mới'}
                            </div>
                          </div>
                          
                          <div className="sm:text-right bg-white sm:bg-transparent p-1.5 sm:p-0 rounded border sm:border-0 border-rose-200">
                            <div className="text-[11px] font-bold text-indigo-900 flex items-center sm:justify-end gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đang thuộc Sale: <strong className="text-indigo-700">{dup.existingLead.assignee || 'Chưa phân công'}</strong></span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Trạng thái cũ: <span className="font-semibold text-slate-700">{dup.existingLead.status}</span> (Mã: {dup.existingLead.id})
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Duplicate Handling Policy Radio Options */}
                  <div className="space-y-2 pt-2 border-t border-rose-200">
                    <div className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cấu hình xử lý khách trùng theo mong muốn của bạn:</span>
                    </div>

                    <div className="space-y-2">
                      {/* OPTION 1: PROTECT OLD SALE (DEFAULT & RECOMMENDED) */}
                      <label className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                        duplicateHandlingMode === 'skip_protect_old_sale'
                          ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="duplicateHandlingMode"
                          value="skip_protect_old_sale"
                          checked={duplicateHandlingMode === 'skip_protect_old_sale'}
                          onChange={() => setDuplicateHandlingMode('skip_protect_old_sale')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <span>🛡️ BẢO VỆ SALE Ở BƯỚC 1 (Khuyên dùng - Không chia cho Sale mới)</span>
                          </span>
                          <p className="text-[11px] text-emerald-900 mt-0.5 leading-relaxed">
                            • Tự động <strong>bỏ qua {duplicateReport.duplicateCount} khách trùng</strong>, quyền chăm sóc thuộc 100% về Sale ở bước 1.
                            <br />
                            • Sale mới ({targetSaleName || 'ở bước 2'}) <strong>chỉ nhận {duplicateReport.uniqueCount} khách mới</strong> chưa từng có trên CRM.
                            <br />
                            • Hệ thống tự động ghi nhật ký lịch sử vào khách cũ: <em>"Khách xuất hiện lại trong đợt nạp mới, bảo vệ quyền chăm sóc cho Sale cũ."</em>
                          </p>
                        </div>
                      </label>

                      {/* OPTION 2: UPDATE NOTE BUT KEEP OLD SALE */}
                      <label className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                        duplicateHandlingMode === 'update_old_sale_note'
                          ? 'bg-amber-50 border-amber-400 text-amber-950 ring-1 ring-amber-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="duplicateHandlingMode"
                          value="update_old_sale_note"
                          checked={duplicateHandlingMode === 'update_old_sale_note'}
                          onChange={() => setDuplicateHandlingMode('update_old_sale_note')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-amber-950">
                            📝 Cập nhật thông tin &amp; Giữ nguyên Sale cũ
                          </span>
                          <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                            Khách hàng vẫn thuộc Sale ở bước 1, đồng thời tự động cập nhật thêm Nhu cầu / Ghi chú mới từ file vào hồ sơ khách hàng.
                          </p>
                        </div>
                      </label>

                      {/* OPTION 3: REASSIGN TO NEW SALE */}
                      <label className={`p-2.5 rounded-xl border flex items-start space-x-2.5 cursor-pointer transition-all ${
                        duplicateHandlingMode === 'reassign_to_new_sale'
                          ? 'bg-blue-50 border-blue-400 text-blue-950 ring-1 ring-blue-400'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="duplicateHandlingMode"
                          value="reassign_to_new_sale"
                          checked={duplicateHandlingMode === 'reassign_to_new_sale'}
                          onChange={() => setDuplicateHandlingMode('reassign_to_new_sale')}
                          className="mt-0.5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-blue-950">
                            🔀 Thu hồi từ Sale cũ &amp; Chuyển giao sang Sale mới ({targetSaleName || 'ở bước 2'})
                          </span>
                          <p className="text-[11px] text-blue-900 mt-0.5 leading-relaxed">
                            Chỉ chọn khi Quản trị viên chủ động muốn chuyển khách từ Sale ở bước 1 sang cho Sale ở bước 2 (hệ thống sẽ lưu vết lịch sử bàn giao).
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center text-emerald-800 font-bold text-xs">
                    <CheckCircle className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                    <span>✓ Quét sạch 100%: Không có số điện thoại nào bị trùng lặp với hệ thống!</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 font-mono bg-emerald-100 px-2 py-0.5 rounded">
                    {parsedPreview.length} khách mới
                  </span>
                </div>
              )}

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <h3 className="mb-2 text-xs font-bold text-slate-800">Xem trước hồ sơ ({parsedPreview.length})</h3>
                <p className="mb-2 text-xs text-slate-500">Thiếu tên hoặc sai SĐT/email cần sửa trước khi nhập. Các thông tin khác có thể bổ sung sau.</p>
                <div className="max-h-60 overflow-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{['Khách hàng', 'SĐT / Email', 'Kiểm tra', 'Người nhận'].map(label=><th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{parsedPreview.map((lead,index)=>{
                  const duplicate = duplicateReport.duplicates.find(item=>item.item===lead);
                  const issues = profileIssues(lead);
                  const recipient = duplicate && duplicateHandlingMode !== 'reassign_to_new_sale' ? duplicate.existingLead.assignee : assignTargetMode === 'single_sale' ? targetSaleName : assignTargetMode === 'as_in_file' ? lead.assignee : 'Chia đều khi nhập';
                  return <tr key={index} className="border-t border-slate-100"><td className="p-2">{lead.fullName || 'Thiếu tên'}</td><td className="p-2 break-all">{lead.phone}<br/>{lead.email}</td><td className="p-2"><span className={issues.length || duplicate ? 'text-amber-800' : 'text-emerald-700'}>{[duplicate ? `Trùng: ${duplicate.existingLead.fullName}` : '', ...issues].filter(Boolean).join(' · ') || 'Hợp lệ'}</span></td><td className="p-2">{recipient || 'Chưa xác định'}</td></tr>;
                })}</tbody></table></div>
              </section>
              {/* Summary of actions */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Kết quả phân bổ dự kiến:</span>
                  <span className="font-mono text-amber-700 text-sm">
                    {duplicateReport.duplicateCount > 0 && duplicateHandlingMode === 'skip_protect_old_sale'
                      ? `${duplicateReport.uniqueCount} khách mới sẽ nạp`
                      : `${parsedPreview.length} khách`}
                  </span>
                </div>
                
                <div className="text-[11px] text-slate-600 flex flex-col gap-0.5">
                  <div>
                    • Người nhận: <strong className="text-slate-900">
                      {assignTargetMode === 'single_sale'
                        ? targetSaleName || 'Chưa chọn sale'
                        : assignTargetMode === 'round_robin'
                          ? 'Chia đều cho toàn bộ đội Sale'
                          : 'Theo cột trong file'}
                    </strong>
                  </div>
                  {duplicateReport.duplicateCount > 0 && (
                    <div className="text-emerald-700 font-medium">
                      • Xử lý trùng: {
                        duplicateHandlingMode === 'skip_protect_old_sale'
                          ? `Bảo vệ ${duplicateReport.duplicateCount} khách cho Sale cũ (Không chia đè cho Sale mới)`
                          : duplicateHandlingMode === 'update_old_sale_note'
                            ? `Cập nhật ghi chú cho ${duplicateReport.duplicateCount} khách của Sale cũ`
                            : `Chuyển giao ${duplicateReport.duplicateCount} khách cũ sang cho ${targetSaleName || 'Sale mới'}`
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={parsedPreview.length === 0}
            onClick={handleConfirmImport}
            className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition-colors text-center cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <span>Nhập &amp; phân bổ ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
