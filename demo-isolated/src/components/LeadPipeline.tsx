import React, { useState } from 'react';
import { 
  Phone, 
  MessageSquare, 
  ChevronRight, 
  ChevronLeft, 
  Building, 
  User, 
  Clock, 
  Sparkles,
  Calendar,
  Layers,
  Search,
  Crown,
  Briefcase,
  Users
} from 'lucide-react';
import { Lead, LeadStatus, SalesMember } from '../types';
import { LEAD_STATUSES } from '../data/initialData';
import { getStatusBadgeColor, formatDateVN, getAssigneeRoleInfo } from '../utils/crmCalculations';
import { openGooglePhoneSearch } from '../services/notificationService';

interface LeadPipelineProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: LeadStatus) => void;
  onOpenMessageModal: (lead: Lead) => void;
  onScheduleAppointment: (lead: Lead) => void;
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  tpkdFilterScope?: 'all' | 'tpkd' | 'nvkd';
  onTpkdFilterScopeChange?: (scope: 'all' | 'tpkd' | 'nvkd') => void;
  tpkdLeadsCount?: number;
  nvkdLeadsCount?: number;
  deptLeadsCount?: number;
}

export const LeadPipeline: React.FC<LeadPipelineProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onOpenMessageModal,
  onScheduleAppointment,
  currentUser,
  salesMembers,
  tpkdFilterScope = 'all',
  onTpkdFilterScopeChange,
  tpkdLeadsCount = 0,
  nvkdLeadsCount = 0,
  deptLeadsCount
}) => {
  // Columns to show in pipeline flow
  const pipelineStages: LeadStatus[] = [
    'Khách mới',
    'Đang chăm sóc',
    'Tiềm năng',
    'Hẹn xem BĐS',
    'Đàm phán / Cọc',
    'Đã chốt'
  ];

  // For mobile quick focus: show all or filter to a specific stage column
  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');

  const moveStage = (leadId: string, currentStatus: LeadStatus, direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = LEAD_STATUSES.indexOf(currentStatus);
    if (direction === 'next' && currentIndex < LEAD_STATUSES.length - 1) {
      onUpdateStatus(leadId, LEAD_STATUSES[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      onUpdateStatus(leadId, LEAD_STATUSES[currentIndex - 1]);
    }
  };

  const visibleStages = activeStageFilter === 'all' 
    ? pipelineStages 
    : pipelineStages.filter(s => s === activeStageFilter);

  return (
    <div className="space-y-3">
      {/* TPKD Ownership Scope Filter */}
      {currentUser?.role === 'tpkd' && onTpkdFilterScopeChange && (
        <div className="bg-white p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-purple-700" />
            <span>Phân quyền Pipeline:</span>
          </div>
          <div className="flex items-center space-x-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => onTpkdFilterScopeChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                tpkdFilterScope === 'all'
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-white/80'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Full phòng ({deptLeadsCount ?? leads.length})</span>
            </button>
            <button
              onClick={() => onTpkdFilterScopeChange('tpkd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                tpkdFilterScope === 'tpkd'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-purple-900 bg-purple-50 hover:bg-purple-100'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>Khách TPKD ({tpkdLeadsCount})</span>
            </button>
            <button
              onClick={() => onTpkdFilterScopeChange('nvkd')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                tpkdFilterScope === 'nvkd'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-blue-900 bg-blue-50 hover:bg-blue-100'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-blue-200" />
              <span>Khách NVKD ({nvkdLeadsCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile/Tablet Quick Stage Selector */}
      <div className="md:hidden bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <button
            onClick={() => setActiveStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeStageFilter === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tất cả ({leads.length})
          </button>
          {pipelineStages.map((st) => {
            const count = leads.filter(l => l.status === st).length;
            const isCurrent = activeStageFilter === st;
            return (
              <button
                key={`tab-${st}`}
                onClick={() => setActiveStageFilter(st)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1 ${
                  isCurrent
                    ? 'bg-amber-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{st}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isCurrent ? 'bg-amber-700/80 text-white' : 'bg-white text-slate-600 font-bold'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal Swipeable Pipeline Board */}
      <div className="overflow-x-auto touch-scroll pb-4 scroll-smooth">
        {activeStageFilter === 'all' && (
          <div className="md:hidden mb-2 text-[11px] text-slate-500 font-medium px-1 flex items-center justify-between">
            <span>👈 Vuốt ngang để duyệt 6 giai đoạn bán hàng 👉</span>
          </div>
        )}

        <div className={`flex gap-3 sm:gap-4 ${activeStageFilter === 'all' ? 'min-w-[1240px] md:min-w-0' : 'w-full'}`}>
          {visibleStages.map((stage) => {
            const stageLeads = leads.filter((l) => l.status === stage);
            const badge = getStatusBadgeColor(stage);

            return (
              <div
                key={stage}
                className={`bg-slate-100/80 rounded-xl sm:rounded-2xl p-3 border border-slate-200 flex flex-col snap-start ${
                  activeStageFilter !== 'all' 
                    ? 'w-full max-w-lg mx-auto' 
                    : 'flex-1 min-w-[260px] max-w-[320px]'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${badge.dot}`}></span>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-800">{stage}</h3>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white text-slate-800 shadow-2xs border border-slate-200">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 touch-scroll">
                  {stageLeads.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200/80 rounded-xl bg-white/40">
                      Chưa có khách ở bước này
                    </div>
                  ) : (
                    stageLeads.map((lead) => {
                      const roleInfo = getAssigneeRoleInfo(lead.assignee, salesMembers, currentUser?.name);

                      return (
                        <div
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className={`bg-white rounded-xl p-3 border shadow-2xs hover:shadow-md transition-all cursor-pointer group active:scale-[0.99] ${
                            roleInfo.isTpkd
                              ? 'border-purple-200 hover:border-purple-400 bg-purple-50/10'
                              : 'border-slate-200 hover:border-amber-400'
                          }`}
                        >
                          {/* Top Row: Lead Name, Role Badge & Date */}
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex flex-col">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-amber-600 transition-colors">
                                {lead.fullName}
                              </h4>
                              <div className="mt-0.5">
                                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}>
                                  {roleInfo.badgeLabel}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 whitespace-nowrap font-medium">
                              {formatDateVN(lead.date)}
                            </span>
                          </div>

                          {/* Phone & Source */}
                          <div className="flex items-center justify-between text-xs mb-2 text-slate-600">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openGooglePhoneSearch(lead.phone);
                              }}
                              title="Tra cứu danh tính số điện thoại này trên Google"
                              className="font-mono font-bold text-slate-800 hover:text-amber-600 flex items-center space-x-1 group/p"
                            >
                              <span>{lead.phone}</span>
                              <Search className="w-2.5 h-2.5 text-slate-400 group-hover/p:text-amber-600" />
                            </button>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-medium truncate max-w-[120px]" title={lead.dataSource}>
                              {lead.dataSource}
                            </span>
                          </div>

                          {/* Project & Product */}
                          <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-700 space-y-1 mb-2 border border-slate-100">
                            <div className="flex items-center text-slate-900 font-bold truncate">
                              <Building className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                              <span className="truncate">{lead.project}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span>{lead.productType}</span>
                              {lead.budget && (
                                <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                                  {lead.budget}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Note preview if any */}
                          {lead.notes && (
                            <p className="text-xs text-slate-500 line-clamp-2 italic mb-2.5 bg-amber-50/30 p-1.5 rounded border border-amber-100/40">
                              "{lead.notes}"
                            </p>
                          )}

                          {/* Footer: Assignee & Stage shift buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                roleInfo.isTpkd
                                  ? 'bg-purple-700 text-white shadow-2xs'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {roleInfo.isTpkd ? '👑' : lead.assignee.charAt(0)}
                              </div>
                              <span className={`truncate max-w-[90px] text-[11px] ${roleInfo.isTpkd ? 'text-purple-950 font-bold' : 'text-slate-700 font-medium'}`}>
                                {lead.assignee}
                              </span>
                            </div>

                            {/* Stage transition controls */}
                          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onOpenMessageModal(lead)}
                              title="Gửi Zalo"
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onScheduleAppointment(lead)}
                              title="Hẹn xem BĐS"
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => moveStage(lead.id, lead.status, 'prev', e)}
                              disabled={stage === 'Khách mới'}
                              title="Lùi 1 bước"
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-800 disabled:opacity-20 disabled:hover:text-slate-400 rounded-lg transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => moveStage(lead.id, lead.status, 'next', e)}
                              disabled={stage === 'Đã chốt'}
                              title="Chuyển bước kế tiếp"
                              className="w-8 h-8 min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-amber-700 disabled:opacity-20 disabled:hover:text-slate-400 rounded-lg font-bold transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
