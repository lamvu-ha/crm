import React, { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileUp,
  Database,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  Trash2,
  RefreshCw,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { Lead, SalesMember, LeadAssignTargetMode, LeadDuplicateHandlingMode } from '../../types';
import { profileIssues } from '../../utils/customerWorkflow';
import { parseCSVToLeads } from '../../utils/csvHelper';
import { normalizePhoneNumber } from '../../utils/phoneDuplicateUtils';
import { saveLeadsToFirestore } from '../../services/firebaseDb';
import { crmBackend } from '../../services/crmBackendService';
import { recordSystemLog } from '../../services/systemLogService';
import { distributeLeadsToSales } from '../../data/salesTeamData';

interface CustomerFileUploadTabProps {
  leads: Lead[];
  salesMembers: SalesMember[];
  currentUser: SalesMember;
  onLeadsUpdated?: (leads: Lead[]) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

interface StagedLeadRow {
  tempId: string;
  fullName: string;
  phone: string;
  email: string;
  dataSource: string;
  project: string;
  productType: string;
  budget: string;
  notes: string;
  assignee: string;
  status: string;
  isPhoneValid: boolean;
  isDuplicate: boolean;
  duplicateInfo?: {
    existingName: string;
    existingAssignee: string;
    existingStatus: string;
  };
}

export const CustomerFileUploadTab: React.FC<CustomerFileUploadTabProps> = ({
  leads,
  salesMembers,
  currentUser,
  onLeadsUpdated,
  onShowToast
}) => {
  const [stagedLeads, setStagedLeads] = useState<StagedLeadRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [assignMode, setAssignMode] = useState<LeadAssignTargetMode>('round_robin');
  const [selectedSingleSale, setSelectedSingleSale] = useState<string>(() => {
    const firstSale = salesMembers.find((m) => m.status === 'active' && m.role === 'sale') || salesMembers[0];
    return firstSale ? firstSale.name : '';
  });
  const [duplicateMode, setDuplicateMode] = useState<LeadDuplicateHandlingMode>('skip_protect_old_sale');
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    count: number;
    duplicateCount: number;
    time: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeAndStageItems = (items: Array<Partial<Lead>>, name: string = '', size: string = '') => {
    const phoneMap = new Map<string, Lead>();
    leads.forEach((l) => {
      const norm = normalizePhoneNumber(l.phone);
      if (norm && norm.length >= 8) {
        phoneMap.set(norm, l);
        if (norm.length >= 9) phoneMap.set(norm.slice(-9), l);
      }
    });

    const staged: StagedLeadRow[] = items.map((item, idx) => {
      const cleanPhone = normalizePhoneNumber(item.phone || '');
      const isPhoneValid = cleanPhone.length >= 9;
      const tail = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : cleanPhone;
      const existing = isPhoneValid ? phoneMap.get(cleanPhone) || phoneMap.get(tail) : undefined;

      return {
        tempId: `staged-file-${Date.now()}-${idx}`,
        fullName: String(item.fullName || '').trim(),
        email: String(item.email || '').trim(),
        phone: item.phone || '',
        dataSource: item.dataSource || 'Tệp nạp Database',
        project: item.project || 'Nhà Phố Trung Tâm',
        productType: item.productType || 'Nhà phố trung tâm',
        budget: item.budget || 'Thương lượng',
        notes: item.notes || '',
        assignee: item.assignee || 'Tự động phân bổ',
        status: item.status || 'Khách mới',
        isPhoneValid,
        isDuplicate: Boolean(existing),
        duplicateInfo: existing
          ? {
              existingName: existing.fullName,
              existingAssignee: existing.assignee,
              existingStatus: existing.status
            }
          : undefined
      };
    });

    setStagedLeads(staged);
    if (name) setFileName(name);
    if (size) setFileSize(size);
    setSaveResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = String(event.target?.result || '');
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          const list = Array.isArray(parsed) ? parsed : parsed.leads || [parsed];
          analyzeAndStageItems(list, file.name, sizeStr);
          onShowToast?.(`Đã đọc ${list.length} khách từ file JSON!`, 'info');
        } else {
          const parsedLeads = parseCSVToLeads(text, leads.length);
          if (parsedLeads.length > 0) {
            analyzeAndStageItems(parsedLeads, file.name, sizeStr);
            onShowToast?.(`Đã đọc và nhận diện ${parsedLeads.length} khách từ ${file.name}!`, 'info');
          } else {
            // Simple comma/tab parser fallback
            const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
            const fallbackList: Partial<Lead>[] = [];
            lines.forEach((line, i) => {
              if (i === 0 && (line.toLowerCase().includes('tên') || line.toLowerCase().includes('phone'))) return;
              const cols = line.split(/[,\t;|]/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
              if (cols.length >= 2) {
                fallbackList.push({
                  fullName: cols[0] || 'Khách hàng',
                  phone: cols[1] || '',
                  dataSource: cols[2] || 'Upload file Database',
                  project: cols[3] || 'Nhà Phố Trung Tâm',
                  productType: (cols[4] as any) || 'Nhà phố trung tâm',
                  budget: cols[5] || 'Thương lượng',
                  notes: cols.slice(6).join(' ') || ''
                });
              }
            });
            if (fallbackList.length > 0) {
              analyzeAndStageItems(fallbackList, file.name, sizeStr);
              onShowToast?.(`Đã nhận diện ${fallbackList.length} khách từ file!`, 'info');
            } else {
              onShowToast?.('Không tìm thấy dữ liệu hợp lệ trong file.', 'warning');
            }
          }
        }
      } catch (err: any) {
        onShowToast?.(`Lỗi phân tích file: ${err?.message || 'Không thể đọc tệp'}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSample = () => {
    const headers = 'Họ và tên,Số điện thoại,Nguồn khách,Dự án quan tâm,Loại sản phẩm,Khoảng tài chính,Người phụ trách,Nhu cầu ghi chú\n';
    const sample = [
      'Nguyễn Thanh Tùng,0912888999,Facebook Ads,The Global City,Biệt thự,Trên 20 tỷ,Chuyên viên 02,Khách quan tâm căn góc mặt tiền view công viên',
      'Đặng Bích Ngọc,0903777666,Website,Nhà Phố Trung Tâm,Nhà phố trung tâm,5 - 10 tỷ,Tự động phân bổ,Tìm nhà phố Quận 1 diện tích trên 60m2',
      'Phan Quốc Việt,0987555444,Giới thiệu,Eaton Park,Căn hộ cao cấp,3 - 5 tỷ,Quản trị thử nghiệm,Cần 2 phòng ngủ thanh toán linh hoạt'
    ].join('\n');

    const blob = new Blob(['\uFEFF' + headers + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CRM_Mau_File_Thong_Tin_Khach_Hang.csv';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Đã tải xuống file mẫu chuẩn CRM!', 'info');
  };

  const handleSaveFileToDatabase = async () => {
    if (stagedLeads.length === 0) {
      onShowToast?.('Chưa có file nào được tải lên để lưu vào database.', 'warning');
      return;
    }

    const invalid = stagedLeads.filter(row=>profileIssues({fullName:row.fullName,phone:row.phone,email:row.email}).some(issue=>['Thiếu tên','SĐT không hợp lệ','Email không hợp lệ'].includes(issue)));
    if(invalid.length){onShowToast?.('Có '+invalid.length+' hồ sơ thiếu tên hoặc sai SĐT/email. Vui lòng sửa file trước khi lưu.','error');return;}
    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const payloadLeads = stagedLeads.map((r) => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email,
        dataSource: r.dataSource,
        project: r.project,
        productType: r.productType,
        budget: r.budget,
        notes: r.notes,
        assignee: r.assignee,
        status: r.status
      }));

      // Call Backend API to save into leads.json with deduplication & assignment logic
      const token = localStorage.getItem('salepro_token');
      const apiRes = await fetch('/api/leads/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          leads: payloadLeads,
          assignTargetMode: assignMode,
          targetSaleName: selectedSingleSale,
          duplicateHandlingMode: duplicateMode
        })
      });

      let updatedLeads: Lead[] = [];
      let savedCount = stagedLeads.length;
      let dupCount = 0;

      if (apiRes.ok) {
        const data = await apiRes.json();
        savedCount = data.importedCount || 0;
        dupCount = data.duplicateCount || 0;
        if (Array.isArray(data.leads)) {
          updatedLeads = data.leads;
        }
      }

      if (updatedLeads.length === 0) {
        // Fallback local list construction
        const newOnes: Lead[] = stagedLeads
          .filter((r) => !r.isDuplicate || duplicateMode === 'reassign_to_new_sale')
          .map((r, i) => ({
            id: `lead-file-${Date.now()}-${i}`,
            stt: leads.length + i + 1,
            date: nowIso.split('T')[0],
            fullName: r.fullName,
            phone: r.phone,
            dataSource: r.dataSource,
            productType: r.productType as any,
            status: assignMode === 'public_pool' ? 'Kho khách chung' : 'Khách mới',
            project: r.project,
            assignee: assignMode === 'single_sale' ? selectedSingleSale : assignMode === 'public_pool' ? 'Kho khách chung' : r.assignee,
            notes: r.notes,
            budget: r.budget,
            createdAt: nowIso,
            updatedAt: nowIso,
            assignedAt: nowIso
          }));

        let distributed = newOnes;
        if (assignMode === 'round_robin') {
          distributed = distributeLeadsToSales(newOnes, salesMembers).distributedLeads;
        }

        updatedLeads = [...distributed, ...leads];
      }

      // Persist to Cloud Firestore & Server
      try {
        await saveLeadsToFirestore(updatedLeads);
      } catch {}
      await crmBackend.saveLeads(updatedLeads);
      try {
        localStorage.setItem('crm_bds_leads_v1', JSON.stringify(updatedLeads));
      } catch {}

      onLeadsUpdated?.(updatedLeads);

      // Broadcast to other tabs
      try {
        if ('BroadcastChannel' in window) {
          const ch = new BroadcastChannel('mayhomes_crm_sync');
          ch.postMessage({ type: 'LEADS_UPDATED', leads: updatedLeads, timestamp: Date.now() });
          ch.close();
        }
      } catch {}

      await recordSystemLog({
        action: 'manual_lead_upload',
        level: 'info',
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorEmail: currentUser.email,
        actorRole: currentUser.role,
        targetType: 'lead',
        summary: `Upload riêng file "${fileName || 'khách hàng'}" và lưu trực tiếp ${savedCount} khách vào Database (Không dùng Google Sheet).`
      });

      setSaveResult({
        count: savedCount,
        duplicateCount: dupCount,
        time: new Date().toLocaleTimeString('vi-VN')
      });

      setStagedLeads([]);
      setFileName('');
      onShowToast?.(`🎉 ĐÃ LƯU THÀNH CÔNG ${savedCount} KHÁCH VÀO DATABASE (KHÔNG QUA GOOGLE SHEET)!`, 'success');
    } catch (err: any) {
      onShowToast?.(err?.message || 'Lỗi lưu database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: No Google Sheets Needed! */}
      <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">Tải lên riêng tệp thông tin khách hàng</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                100% DATABASE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Toàn bộ dữ liệu khách hàng được lưu trực tiếp vào <strong>cơ sở dữ liệu máy chủ & Cloud Firestore</strong>, hoàn toàn độc lập và không phụ thuộc vào Google Sheets.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadSample}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Tải tệp Excel mẫu chuẩn</span>
        </button>
      </div>

      {saveResult && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-200">
                Đã lưu thành công {saveResult.count} khách hàng vào Database lúc {saveResult.time}!
              </p>
              <p className="text-xs text-emerald-300/80">
                Dữ liệu đã sẵn sàng trong CRM cho toàn bộ NVKD tiếp nhận làm việc.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSaveResult(null)}
            className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-lg text-xs font-semibold"
          >
            Đóng thông báo
          </button>
        </div>
      )}

      {/* Standalone File Drop Zone */}
      <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, .json, .txt"
          onChange={handleFileChange}
          className="hidden"
          id="standalone-customer-file-input"
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          className="max-w-xl mx-auto py-8 px-6 border-2 border-dashed border-slate-700 hover:border-amber-500 rounded-2xl bg-slate-900/60 hover:bg-amber-500/5 transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-white mb-1">
            Chọn tệp thông tin khách hàng từ máy tính
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Hỗ trợ định dạng file: <strong>.CSV, .XLSX, .XLS, .JSON, .TXT</strong>
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-md">
            <FileUp className="w-3.5 h-3.5" />
            <span>Bấm để chọn file nạp</span>
          </span>
        </div>

        {fileName && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Tệp đang chọn: <strong>{fileName}</strong> ({fileSize})</span>
            <button
              onClick={() => {
                setStagedLeads([]);
                setFileName('');
              }}
              className="text-slate-400 hover:text-rose-400 ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Settings Grid for Upload */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
          <Sliders className="w-4 h-4" />
          <span>Tùy chọn phân bổ & chống trùng khi lưu database</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-white">Phân bổ người phụ trách:</label>
            <select
              value={assignMode}
              onChange={(e) => setAssignMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="round_robin">🔄 Chia xoay vòng (Round-Robin) cho các NVKD đang trực</option>
              <option value="single_sale">👤 Chỉ định phân cho 1 chuyên viên cụ thể</option>
              <option value="public_pool">🌐 Cho vào Kho khách chung (Public Pool)</option>
              <option value="as_in_file">📄 Giữ nguyên theo cột người phụ trách trong file</option>
            </select>

            {assignMode === 'single_sale' && (
              <div className="pt-1">
                <select
                  value={selectedSingleSale}
                  onChange={(e) => setSelectedSingleSale(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-amber-300 font-bold"
                >
                  {salesMembers.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-bold text-white">Chính sách xử lý khi SĐT đã tồn tại:</label>
            <select
              value={duplicateMode}
              onChange={(e) => setDuplicateMode(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="skip_protect_old_sale">🛡️ Bỏ qua & Bảo vệ Sale cũ (Không chia đè lặp)</option>
              <option value="update_old_sale_note">📝 Giữ Sale cũ & Ghi thêm thông tin mới vào lịch sử</option>
              <option value="reassign_to_new_sale">🔀 Thu hồi và bàn giao sang cho Sale mới</option>
            </select>
            <p className="text-[11px] text-slate-400">
              Bảo vệ quyền lợi cho chuyên viên đã tìm kiếm và chăm sóc khách trước đó.
            </p>
          </div>
        </div>
      </div>

      {/* Live Preview & Commit Button */}
      {stagedLeads.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in">
          <div className="p-3.5 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 font-bold flex items-center justify-center text-xs">
                {stagedLeads.length}
              </span>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Bảng xem trước dữ liệu khách hàng chuẩn bị lưu vào database
                </h4>
                <p className="text-xs text-slate-400">
                  {stagedLeads.filter((r) => r.isPhoneValid && !r.isDuplicate).length} khách mới • {stagedLeads.filter((r) => r.isDuplicate).length} khách trùng SĐT
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveFileToDatabase}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-950/60 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu trực tiếp vào database...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>🚀 Xác nhận lưu vào database ({stagedLeads.length} khách)</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[360px] touch-scroll no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Số điện thoại</th>
                  <th className="py-2.5 px-3">Trạng thái SĐT</th>
                  <th className="py-2.5 px-3">Dự án</th>
                  <th className="py-2.5 px-3">Phân bổ dự kiến</th>
                  <th className="py-2.5 px-3">Ghi chú nhu cầu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stagedLeads.map((r, i) => (
                  <tr key={r.tempId} className="hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2 px-3 font-bold text-white whitespace-nowrap">{r.fullName}</td>
                    <td className="py-2 px-3 font-mono text-slate-300 whitespace-nowrap">{r.phone}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {r.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Trùng SĐT ({r.duplicateInfo?.existingAssignee || 'Sale'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Khách mới hợp lệ
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-[140px] truncate">{r.project}</td>
                    <td className="py-2 px-3 font-bold text-amber-300 whitespace-nowrap">
                      {r.isDuplicate && duplicateMode !== 'reassign_to_new_sale' ? r.duplicateInfo?.existingAssignee : assignMode === 'single_sale'
                        ? selectedSingleSale
                        : assignMode === 'public_pool'
                        ? 'Kho khách chung'
                        : assignMode === 'round_robin'
                        ? 'Tự động xoay vòng'
                        : r.assignee}
                    </td>
                    <td className="py-2 px-3 text-slate-400 max-w-[200px] whitespace-normal break-words">{r.notes || '—'}<div className="mt-1 whitespace-normal text-amber-300">{profileIssues({fullName:r.fullName,phone:r.phone,email:r.email,project:r.project,budget:r.budget,notes:r.notes}).join(' · ')}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
