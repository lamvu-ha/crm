import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Flame, Sun, Snowflake, ChevronDown, Check, Info } from 'lucide-react';
import { Lead, PriorityLevel } from '../types';
import { getPriorityBadgeMeta } from '../services/smartLabelingService';

interface SmartLabelBadgeProps {
  lead: Lead;
  onUpdateLead?: (updatedLead: Lead) => void;
  onTriggerSingleAiLabel?: (lead: Lead) => Promise<void>;
  size?: 'sm' | 'md' | 'lg';
}

export const SmartLabelBadge: React.FC<SmartLabelBadgeProps> = ({
  lead,
  onUpdateLead,
  onTriggerSingleAiLabel,
  size = 'md'
}) => {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const meta = getPriorityBadgeMeta(lead.potentialLevel);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLevel = (level: PriorityLevel) => {
    if (!onUpdateLead) return;
    const updated: Lead = {
      ...lead,
      potentialLevel: level,
      priorityUpdatedAt: new Date().toISOString(),
      priorityReason: lead.priorityReason || `Thủ công đặt sang mức ${level}`
    };
    onUpdateLead(updated);
    setIsOpenMenu(false);
  };

  const handleAiLabelThisLead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTriggerSingleAiLabel) return;
    setIsLoadingAi(true);
    try {
      await onTriggerSingleAiLabel(lead);
    } finally {
      setIsLoadingAi(false);
      setIsOpenMenu(false);
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : size === 'lg' 
      ? 'text-xs px-3 py-1.5' 
      : 'text-[11px] px-2 py-0.5';

  return (
    <div className="relative inline-block" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpenMenu(!isOpenMenu)}
        disabled={isLoadingAi}
        title={lead.priorityReason ? `Ưu tiên: ${lead.potentialLevel} - ${lead.priorityReason}` : 'Bấm để đổi mức ưu tiên hoặc gắn nhãn AI'}
        className={`inline-flex items-center gap-1 rounded-full cursor-pointer transition-all active:scale-95 select-none ${sizeClasses} ${meta.badgeClass}`}
      >
        {isLoadingAi ? (
          <Sparkles className="w-3 h-3 animate-spin text-white" />
        ) : (
          <span>{meta.icon}</span>
        )}
        <span className="tracking-wide">{meta.label}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-70 ml-0.5" />
      </button>

      {/* Popover Menu */}
      {isOpenMenu && (
        <div className="absolute left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
          <div className="px-2 py-1 border-b border-slate-100 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Mức độ ưu tiên Lead
            </span>
            {lead.priorityReason && (
              <p className="text-[11px] text-slate-600 italic mt-0.5 line-clamp-2">
                "{lead.priorityReason}"
              </p>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleSelectLevel('Nóng')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-slate-800 transition-colors text-left font-bold"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <span className="text-rose-700">NÓNG (Khách cấp bách, cần chốt ngay)</span>
              </div>
              {lead.potentialLevel === 'Nóng' && <Check className="w-3.5 h-3.5 text-rose-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectLevel('Ấm')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-slate-800 transition-colors text-left font-bold"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌤️</span>
                <span className="text-amber-700">ẤM (Khách tiềm năng, đang theo dõi)</span>
              </div>
              {lead.potentialLevel === 'Ấm' && <Check className="w-3.5 h-3.5 text-amber-600" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectLevel('Lạnh')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-sky-50 text-slate-800 transition-colors text-left font-bold"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">❄️</span>
                <span className="text-sky-700">LẠNH (Ít tương tác, thuê bao, từ chối)</span>
              </div>
              {lead.potentialLevel === 'Lạnh' && <Check className="w-3.5 h-3.5 text-sky-600" />}
            </button>
          </div>

          {onTriggerSingleAiLabel && (
            <div className="mt-2 pt-1.5 border-t border-slate-100">
              <button
                type="button"
                onClick={handleAiLabelThisLead}
                disabled={isLoadingAi}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-xs hover:from-indigo-500 hover:to-purple-500 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Gán nhãn lại bằng Gemini AI</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
