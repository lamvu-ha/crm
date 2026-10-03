import React, { useState } from 'react';
import {
  X,
  Target,
  Award,
  Calendar,
  Sparkles,
  TrendingUp,
  User,
  Phone,
  Mail,
  Shield,
  Clock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Zap,
  BarChart3,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Lead, SalesMember, Appointment } from '../types';
import { SaleConversionPieChart } from './SaleConversionPieChart';

interface PersonalPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SalesMember;
  salesMembers: SalesMember[];
  leads: Lead[];
  appointments?: Appointment[];
  initialSaleName?: string;
  onSelectLead?: (lead: Lead) => void;
}

export const PersonalPerformanceModal: React.FC<PersonalPerformanceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  salesMembers,
  leads,
  appointments = [],
  initialSaleName,
  onSelectLead
}) => {
  if (!isOpen) return null;

  // Selected sale member to view
  const defaultSale = initialSaleName || currentUser.name;
  const [selectedSaleName, setSelectedSaleName] = useState<string>(defaultSale);

  // Find member object
  const currentMember = salesMembers.find(
    (m) => m.name.trim().toLowerCase() === selectedSaleName.trim().toLowerCase()
  ) || {
    id: 'unknown',
    name: selectedSaleName,
    role: selectedSaleName === currentUser.name ? currentUser.role : 'sale',
    email: '',
    phone: '',
    title: 'Chuyên viên tư vấn BĐS',
    team: 'Phòng MAY_MH5.19',
    status: 'active'
  };

  const isViewingSelf = selectedSaleName.trim().toLowerCase() === currentUser.name.trim().toLowerCase();
  const canSwitchSales = currentUser.role === 'admin' || currentUser.role === 'tpkd';

  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-400/40 text-violet-300 flex items-center justify-center shadow-inner">
              <BarChart3 className="w-5 h-5 text-violet-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg leading-tight text-white">
                  {isViewingSelf ? 'Hiệu Suất Cá Nhân & Tỷ Lệ Chuyển Đổi' : `Hồ Sơ Hiệu Suất: ${selectedSaleName}`}
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-400/30">
                  Lead ➔ Hẹn Xem
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Đánh giá trực quan tỷ lệ chuyển đổi từ Lead sang Hẹn xem thực địa BĐS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sales Selector (For Admin/TPKD or to inspect team) */}
        {canSwitchSales && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-600">Đang xem chuyên viên:</span>
              <select
                value={selectedSaleName}
                onChange={(e) => setSelectedSaleName(e.target.value)}
                className="font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-violet-500 focus:outline-none"
              >
                {salesMembers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} ({m.role === 'admin' ? 'Admin' : m.role === 'tpkd' ? 'TPKD' : 'NVKD'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <span>Quyền xem: <strong className="text-indigo-600">{currentUser.role.toUpperCase()}</strong></span>
              {!isViewingSelf && (
                <button
                  type="button"
                  onClick={() => setSelectedSaleName(currentUser.name)}
                  className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-bold text-slate-700"
                >
                  Xem của tôi
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 touch-scroll modal-scroll-lock">

          {/* Profile Overview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-slate-800">
            <div className="flex items-center space-x-3.5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-white/20 shrink-0">
                {currentMember.avatar ? (
                  <img src={currentMember.avatar} alt={currentMember.name} className="w-full h-full object-cover" />
                ) : (
                  currentMember.name.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h4 className="font-black text-base sm:text-lg text-white truncate">
                    {currentMember.name}
                  </h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    currentMember.role === 'admin'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                      : currentMember.role === 'tpkd'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                  }`}>
                    {currentMember.role === 'admin' ? 'Quản trị viên' : currentMember.role === 'tpkd' ? 'Trưởng phòng KD' : 'Chuyên viên Sale'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {currentMember.title || 'Chuyên viên tư vấn BĐS'} • {currentMember.team || 'Phòng MAY_MH5.19'}
                </p>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
                  {currentMember.phone && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>{currentMember.phone}</span>
                    </span>
                  )}
                  {currentMember.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-sky-400" />
                      <span>{currentMember.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center sm:flex-col sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-5 gap-2 shrink-0">
              <span className="text-[11px] text-slate-400">Trạng thái nhận khách:</span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đang trực chiến</span>
              </span>
            </div>
          </div>

          {/* Recharts Conversion Pie Chart Widget */}
          <SaleConversionPieChart
            leads={leads}
            saleName={selectedSaleName}
            salesMember={currentMember}
            appointments={appointments}
            variant="full"
            onOpenLead={(ld) => {
              if (onSelectLead) {
                onSelectLead(ld);
                onClose();
              }
            }}
          />

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500">
            Dữ liệu được tính tự động từ cơ sở dữ liệu Lead &amp; Lịch hẹn BĐS theo thời gian thực.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
