import React, { useState, useRef, useEffect } from 'react';
import { Tag, Plus, X, Check, Sparkles } from 'lucide-react';
import { Lead } from '../types';
import { 
  getTagMeta, 
  PRESET_TAGS, 
  getAllAvailableTags, 
  addTagToLead, 
  removeTagFromLead, 
  toggleTagOnLead 
} from '../utils/tagUtils';

interface LeadTagBadgeProps {
  tag: string;
  onRemove?: (tag: string) => void;
  size?: 'sm' | 'md';
  onClick?: (tag: string) => void;
}

export const LeadTagBadge: React.FC<LeadTagBadgeProps> = ({
  tag,
  onRemove,
  size = 'sm',
  onClick
}) => {
  const meta = getTagMeta(tag);
  const isSm = size === 'sm';

  return (
    <span
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(tag);
        }
      }}
      className={`inline-flex items-center gap-1 font-bold rounded-lg border transition-all select-none ${meta.bg} ${meta.text} ${meta.border} ${
        isSm ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
      } ${onClick ? 'cursor-pointer hover:shadow-2xs' : ''}`}
      title={`Thẻ: ${tag}`}
    >
      <span className="text-[10px] leading-none shrink-0">{meta.icon}</span>
      <span className="truncate max-w-[120px]">{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(tag);
          }}
          className="ml-0.5 -mr-0.5 p-0.5 hover:bg-black/10 rounded-full transition-colors opacity-60 hover:opacity-100"
          title={`Gỡ thẻ "${tag}"`}
        >
          <X className={isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        </button>
      )}
    </span>
  );
};

interface LeadTagPickerProps {
  lead: Lead;
  onUpdateLead: (updatedLead: Lead) => void;
  allLeads?: Lead[];
  buttonClassName?: string;
  showIconOnly?: boolean;
}

export const LeadTagPicker: React.FC<LeadTagPickerProps> = ({
  lead,
  onUpdateLead,
  allLeads,
  buttonClassName,
  showIconOnly = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const currentTags = Array.isArray(lead.tags) ? lead.tags : [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleTag = (tagName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleTagOnLead(lead, tagName);
    onUpdateLead(updated);
  };

  const handleAddCustomTag = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = customTagInput.trim();
    if (!trimmed) return;

    const updated = addTagToLead(lead, trimmed);
    onUpdateLead(updated);
    setCustomTagInput('');
  };

  const allKnownTags = getAllAvailableTags(allLeads);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={
          buttonClassName ||
          "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:text-amber-700 hover:border-amber-400 hover:bg-amber-50/60 transition-all active:scale-95 bg-white shadow-2xs"
        }
        title="Gắn thêm thẻ phân loại khách hàng"
      >
        <Plus className="w-3 h-3 text-slate-400 group-hover:text-amber-600" />
        {!showIconOnly && <span>Thẻ</span>}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 top-full mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 text-slate-800 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Gắn thẻ cho khách</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Input to Add Custom Tag */}
          <form onSubmit={handleAddCustomTag} className="mb-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="Tên thẻ mới (VD: Cần mua gấp)..."
                className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              />
              <button
                type="submit"
                disabled={!customTagInput.trim()}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-[11px] font-bold rounded-xl transition-all shrink-0"
              >
                Thêm
              </button>
            </div>
          </form>

          {/* Preset Suggestions */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              Thẻ thông dụng & gợi ý
            </div>
            <div className="flex flex-wrap gap-1 pt-0.5">
              {PRESET_TAGS.map((preset) => {
                const isChecked = currentTags.some(
                  (t) => t.toLowerCase() === preset.name.toLowerCase()
                );
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={(e) => handleToggleTag(preset.name, e)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                      isChecked
                        ? `${preset.bg} ${preset.text} ${preset.border} ring-1 ring-amber-500/40 shadow-2xs font-bold`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                    {isChecked && <Check className="w-3 h-3 ml-0.5 text-emerald-600 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>

            {/* Other existing custom tags in system */}
            {allKnownTags.filter((t) => !PRESET_TAGS.some((p) => p.name.toLowerCase() === t.toLowerCase())).length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1">
                  Thẻ tùy chỉnh khác
                </div>
                <div className="flex flex-wrap gap-1">
                  {allKnownTags
                    .filter((t) => !PRESET_TAGS.some((p) => p.name.toLowerCase() === t.toLowerCase()))
                    .map((customName) => {
                      const isChecked = currentTags.some(
                        (t) => t.toLowerCase() === customName.toLowerCase()
                      );
                      const meta = getTagMeta(customName);
                      return (
                        <button
                          key={customName}
                          type="button"
                          onClick={(e) => handleToggleTag(customName, e)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                            isChecked
                              ? `${meta.bg} ${meta.text} ${meta.border} ring-1 ring-amber-500/40 shadow-2xs font-bold`
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{meta.icon}</span>
                          <span>{customName}</span>
                          {isChecked && <Check className="w-3 h-3 ml-0.5 text-emerald-600 stroke-[2.5]" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
