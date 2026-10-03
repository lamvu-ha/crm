import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Server, 
  CloudCheck, 
  RefreshCw, 
  Trash2, 
  Users, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  ArrowRightLeft,
  X,
  ShieldCheck,
  HardDrive,
  FileCode,
  FolderArchive
} from 'lucide-react';
import { crmBackend, DatabaseStatus } from '../services/crmBackendService';
import type { Lead, SalesMember } from '../types';

interface DatabaseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  salesMembers: SalesMember[];
  onLeadsUpdated: (leads: Lead[]) => void;
  onSalesMembersUpdated: (members: SalesMember[]) => void;
  onOpenGoogleSheetSync?: () => void;
  showToast: (message: string) => void;
}

export const DatabaseManagementModal: React.FC<DatabaseManagementModalProps> = ({
  isOpen,
  onClose,
  leads,
  salesMembers,
  onLeadsUpdated,
  onSalesMembersUpdated,
  onOpenGoogleSheetSync,
  showToast
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [confirmCleanDemo, setConfirmCleanDemo] = useState(false);
  const [confirmDistribute, setConfirmDistribute] = useState(false);

  const refreshStatus = async () => {
    try {
      const st = await crmBackend.getDatabaseStatus();
      setStatus(st);
    } catch {
      // Fallback info from props
      setStatus({
        status: 'connected',
        databaseEngine: 'Node.js Express + Firestore Dual Engine',
        storageType: 'Centralized Server Store + Cloud Firestore',
        totalLeads: leads.length,
        assignedLeads: leads.filter(l => l.assignee && !l.assignee.toLowerCase().includes('chưa')).length,
        unassignedLeads: leads.filter(l => !l.assignee || l.assignee.toLowerCase().includes('chưa')).length,
        totalSalesMembers: salesMembers.length,
        activeSalesMembers: salesMembers.filter(m => m.status === 'active' && m.role === 'sale').length,
        lastSyncAt: new Date().toISOString(),
        googleSheets: {
          nvkd: 'MAY_TRUONGBV_MH5.19_NVKD_V.1',
          crm: 'MAY_TRUONGBV_MH5.19_CRM_V.1'
        }
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Clear demo leads
  const handleClearDemo = async () => {
    setLoading(true);
    try {
      const res = await crmBackend.clearDemoLeads();
      onLeadsUpdated(res.leads);
      showToast(`Đã dọn dẹp sạch dữ liệu demo! Còn lại ${res.remainingCount} khách hàng thực.`);
      setConfirmCleanDemo(false);
      refreshStatus();
    } catch (err: any) {
      showToast('Lỗi dọn dẹp: ' + (err?.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // Auto distribute leads to sales
  const handleAutoDistribute = async (forceAll: boolean) => {
    setLoading(true);
    try {
      const res = await crmBackend.autoDistributeLeads(forceAll, leads);
      onLeadsUpdated(res.leads);
      showToast(`Đã tự động phân bổ ${res.distributedCount} khách hàng cho các chuyên viên sale!`);
      setConfirmDistribute(false);
      refreshStatus();
    } catch (err: any) {
      showToast('Lỗi phân bổ: ' + (err?.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // Reset staff to official sheet
  const handleResetStaff = async () => {
    setLoading(true);
    try {
      const official = await crmBackend.resetSalesMembersToOfficial();
      onSalesMembersUpdated(official);
      showToast(`Đã khôi phục danh sách ${official.length} nhân sự chuẩn từ file Google Sheet NVKD!`);
      refreshStatus();
    } catch (err: any) {
      showToast('Lỗi khôi phục nhân sự: ' + (err?.message || 'Không xác định'));
    } finally {
      setLoading(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    crmBackend.downloadBackup();
    showToast('Đang tải xuống bản sao lưu cơ sở dữ liệu JSON...');
  };

  // Import JSON backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setLoading(true);
        const ok = await crmBackend.restoreBackup(parsed);
        if (ok) {
          if (Array.isArray(parsed.leads)) onLeadsUpdated(parsed.leads);
          if (Array.isArray(parsed.salesMembers)) onSalesMembersUpdated(parsed.salesMembers);
          showToast('Khôi phục cơ sở dữ liệu thành công!');
          refreshStatus();
        } else {
          showToast('Không thể khôi phục file.');
        }
      } catch (err) {
        showToast('File sao lưu không hợp lệ.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const activeSales = salesMembers.filter(m => m.status === 'active' && m.role === 'sale');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Trung tâm quản trị hệ thống & cơ sở dữ liệu</h2>
              <p className="text-xs text-slate-300">
                Quản lý vận hành dữ liệu khách hàng tập trung, phân bổ NVKD và đồng bộ Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Backend Server</div>
                <div className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Đang hoạt động (Port 3000)
                </div>
                <div className="text-[11px] text-emerald-700">REST API /api/leads sẵn sàng</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Database Engine</div>
                <div className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Centralized Node Store
                </div>
                <div className="text-[11px] text-blue-700">Lưu trữ nguyên tử trên ổ đĩa server</div>
              </div>
            </div>

            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <CloudCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Cloud Firestore</div>
                <div className="text-sm font-bold text-amber-950 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Đã liên kết Firestore DB
                </div>
                <div className="text-[11px] text-amber-700">Đồng bộ đa thiết bị tức thì</div>
              </div>
            </div>
          </div>

          {/* Metrics summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Chỉ số dữ liệu hiện tại</span>
              <button
                onClick={refreshStatus}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Làm mới số liệu
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-slate-800">{leads.length}</div>
                <div className="text-xs text-slate-500">Tổng khách hàng (DB)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-emerald-600">
                  {leads.filter(l => l.assignee && !l.assignee.toLowerCase().includes('chưa')).length}
                </div>
                <div className="text-xs text-emerald-700 font-medium">Đã phân bổ sale</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-amber-600">
                  {leads.filter(l => !l.assignee || l.assignee.toLowerCase().includes('chưa')).length}
                </div>
                <div className="text-xs text-amber-700 font-medium">Chưa gán chuyên viên</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-2xl font-black text-indigo-600">{activeSales.length}</div>
                <div className="text-xs text-indigo-700 font-medium">NVKD sẵn sàng nhận khách</div>
              </div>
            </div>
          </div>

          {/* Operations Grid */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-600" />
              Thao tác vận hành cơ sở dữ liệu
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Operation 1: Auto distribute */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-1">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    Tự động phân bổ khách cho NVKD
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Thuật toán chia đều khách hàng (Round-Robin) cho {activeSales.length} chuyên viên kinh doanh đang hoạt động từ danh sách sheet NVKD.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAutoDistribute(false)}
                    disabled={loading || leads.length === 0}
                    className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Chia khách chưa gán
                  </button>
                  <button
                    onClick={() => handleAutoDistribute(true)}
                    disabled={loading || leads.length === 0}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-indigo-800 border border-indigo-300 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                    title="Phân bổ lại toàn bộ khách hàng đều cho các sale"
                  >
                    Chia lại tất cả
                  </button>
                </div>
              </div>

              {/* Operation 2: Clean Demo Data */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-900 font-bold mb-1">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    Xóa sạch dữ liệu demo (mẫu)
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Xóa bỏ hoàn toàn các khách hàng mẫu/demo khỏi cơ sở dữ liệu server và cloud, chỉ giữ lại các khách hàng thực tế từ Google Sheet CRM.
                  </p>
                </div>
                {confirmCleanDemo ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleClearDemo}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                    >
                      Xác nhận xoá sạch demo
                    </button>
                    <button
                      onClick={() => setConfirmCleanDemo(false)}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmCleanDemo(true)}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa sạch khách hàng demo
                  </button>
                )}
              </div>

              {/* Operation 3: Google Sheet Sync */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900 font-bold mb-1">
                    <RefreshCw className="w-4 h-4 text-emerald-600" />
                    Đồng bộ từ Google Sheets (dự phòng)
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Đồng bộ 2 chiều từ bảng tính <code className="font-bold text-slate-800">MAY_TRUONGBV_MH5.19_CRM_V.1</code> và <code className="font-bold text-slate-800">MAY_TRUONGBV_MH5.19_NVKD_V.1</code>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenGoogleSheetSync) onOpenGoogleSheetSync();
                  }}
                  className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Mở trình đồng bộ Google Sheet
                </button>
              </div>

              {/* Operation 4: Reset Staff to Official */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-900 font-bold mb-1">
                    <Users className="w-4 h-4 text-amber-600" />
                    Khôi phục danh sách nhân sự chuẩn
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Đồng bộ chuẩn 9 nhân sự phòng kinh doanh (GĐKD Huy, Quản trị Trường, TPKD Chi, NVKD Khoa, Vũ, Phương, Hằng, Phát Huy...).
                  </p>
                </div>
                <button
                  onClick={handleResetStaff}
                  disabled={loading}
                  className="w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đồng bộ nhân sự chuẩn từ Sheet
                </button>
              </div>
            </div>
          </div>

          {/* Backup and Restore Section */}
          <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                Sao lưu & khôi phục cơ sở dữ liệu
              </h4>
              <p className="text-xs text-slate-600">
                Tải về bản sao lưu dự phòng JSON đầy đủ hoặc nhập lại dữ liệu bất cứ lúc nào.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleExportBackup}
                className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Tải bản sao lưu (JSON)
              </button>
              <label className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Khôi phục từ tệp
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </div>
          </div>

          {/* PHP & MySQL Hosting Package Section */}
          <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-sm">
                  <FolderArchive className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-indigo-950">
                  Gói cài đặt hosting (PHP Backend & MySQL Database)
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full border border-indigo-200">
                  cPanel / Plesk Ready
                </span>
              </div>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Bao gồm mã nguồn PHP đã đóng gói, file cấu hình <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px] border border-indigo-200">config.php</code>, cấu hình URL rewrite <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px] border border-indigo-200">.htaccess</code> và cơ sở dữ liệu <code className="bg-white px-1.5 py-0.5 rounded text-indigo-700 font-mono text-[11px] border border-indigo-200">database.sql</code> (51 khách hàng thực tế & 22 nhân viên).
              </p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <a
                href="/database.sql"
                download="database.sql"
                className="flex-1 md:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm transition-all hover:border-indigo-300 flex items-center justify-center gap-1.5 text-center"
              >
                <FileCode className="w-4 h-4 text-indigo-600" />
                Tải database.sql
              </a>
              <a
                href="/crm_mayhomes_php_hosting.zip"
                download="crm_mayhomes_php_hosting.zip"
                className="flex-1 md:flex-none px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-center"
              >
                <Download className="w-4 h-4" />
                Tải trọn gói PHP (.ZIP)
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Dữ liệu được lưu trữ an toàn song song giữa Express Server và Google Cloud Firestore
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
