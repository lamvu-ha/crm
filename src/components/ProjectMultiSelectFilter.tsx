import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building, Check, ChevronDown, Search, X, Layers, Filter } from 'lucide-react';
import { Lead } from '../types';

interface ProjectMultiSelectFilterProps {
  allProjects: string[];
  selectedProjects: string[];
  onChange: (projects: string[]) => void;
  leads?: Lead[];
  className?: string;
}

export const ProjectMultiSelectFilter: React.FC<ProjectMultiSelectFilterProps> = ({
  allProjects,
  selectedProjects,
  onChange,
  leads = [],
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute lead count per project
  const leadCountByProject = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const proj = l.project?.trim();
      if (proj) {
        map.set(proj, (map.get(proj) || 0) + 1);
      }
    });
    return map;
  }, [leads]);

  // Compute total leads for selected projects
  const totalLeadsInSelection = useMemo(() => {
    if (selectedProjects.length === 0) return leads.length;
    return leads.filter((l) => selectedProjects.includes(l.project)).length;
  }, [leads, selectedProjects]);

  // Filter project list based on search
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return allProjects;
    const q = searchQuery.toLowerCase().trim();
    return allProjects.filter((p) => p.toLowerCase().includes(q));
  }, [allProjects, searchQuery]);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const toggleProject = (project: string) => {
    if (selectedProjects.includes(project)) {
      onChange(selectedProjects.filter((p) => p !== project));
    } else {
      onChange([...selectedProjects, project]);
    }
  };

  const selectOnly = (project: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([project]);
  };

  const selectAll = () => {
    onChange([...allProjects]);
  };

  const clearAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange([]);
  };

  // Label to show in trigger button
  const triggerLabel = useMemo(() => {
    if (selectedProjects.length === 0) {
      return 'Tất cả dự án';
    }
    if (selectedProjects.length === 1) {
      return selectedProjects[0];
    }
    return `${selectedProjects.length} dự án đã chọn`;
  }, [selectedProjects]);

  const hasSelection = selectedProjects.length > 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[36px] max-w-[220px] sm:max-w-[260px] border shadow-2xs cursor-pointer select-none ${
          hasSelection
            ? 'bg-amber-50/90 border-amber-400 text-amber-950 hover:bg-amber-100/90 ring-1 ring-amber-400/50'
            : 'bg-white border-slate-300 text-slate-700 hover:border-amber-400 hover:text-slate-900'
        }`}
        title={hasSelection ? `Dự án: ${selectedProjects.join(', ')}` : 'Lọc dự án BĐS (Đa lựa chọn)'}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-1.5 truncate min-w-0">
          <Building className={`w-3.5 h-3.5 shrink-0 ${hasSelection ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-600'}`} />
          <span className="truncate text-xs">{triggerLabel}</span>
        </div>

        <div className="flex items-center space-x-1 shrink-0 ml-1">
          {hasSelection && (
            <>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-600 text-white shadow-2xs">
                {selectedProjects.length}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={clearAll}
                onKeyDown={(e) => { if (e.key === 'Enter') clearAll(); }}
                className="p-0.5 hover:bg-amber-200/80 rounded-full text-amber-700 transition-colors cursor-pointer"
                title="Bỏ chọn tất cả dự án"
              >
                <X className="w-3 h-3" />
              </span>
            </>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="font-extrabold text-xs text-slate-900">Lọc đa dự án BĐS</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedProjects.length}/{allProjects.length} đã chọn
              </span>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm dự án..."
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center justify-between pt-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
              >
                Chọn tất cả ({allProjects.length})
              </button>
              {hasSelection && (
                <button
                  type="button"
                  onClick={() => clearAll()}
                  className="font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Bỏ chọn ({selectedProjects.length})
                </button>
              )}
            </div>
          </div>

          {/* Project List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 touch-scroll">
            {filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Không tìm thấy dự án phù hợp
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = selectedProjects.includes(project);
                const count = leadCountByProject.get(project) || 0;

                return (
                  <div
                    key={project}
                    onClick={() => toggleProject(project)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-50/80 text-amber-950 font-bold'
                        : 'text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1 mr-2">
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-slate-300 bg-white group-hover:border-amber-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate text-xs">{project}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Solo Select Button */}
                      <button
                        type="button"
                        onClick={(e) => selectOnly(project, e)}
                        className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100 rounded-md transition-opacity cursor-pointer hidden xs:inline-block"
                        title={`Chỉ xem khách hàng dự án ${project}`}
                      >
                        Chỉ chọn
                      </button>

                      {/* Lead count badge */}
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                          isSelected
                            ? 'bg-amber-200/80 text-amber-900'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                        }`}
                        title={`${count} khách hàng thuộc dự án này`}
                      >
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500">
              Khớp: <strong className="text-slate-900 font-bold">{totalLeadsInSelection}</strong> khách hàng
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ProjectFilterChipsProps {
  selectedProjects: string[];
  onRemoveProject: (project: string) => void;
  onClearAll: () => void;
  leads?: Lead[];
}

export const ProjectFilterChips: React.FC<ProjectFilterChipsProps> = ({
  selectedProjects,
  onRemoveProject,
  onClearAll,
  leads = []
}) => {
  if (selectedProjects.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-1.5 py-1">
      <span className="text-[11px] font-bold text-slate-500 flex items-center mr-0.5">
        <Filter className="w-3 h-3 mr-1 text-amber-600" />
        Dự án ({selectedProjects.length}):
      </span>

      {selectedProjects.map((project) => {
        const count = leads.filter((l) => l.project === project).length;
        return (
          <span
            key={project}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold shadow-2xs animate-in fade-in-50 duration-150"
          >
            <Building className="w-3 h-3 text-amber-600 shrink-0" />
            <span className="truncate max-w-[160px]">{project}</span>
            {count > 0 && (
              <span className="text-[10px] font-mono font-extrabold bg-amber-200/80 px-1 rounded-md text-amber-950 ml-0.5">
                {count}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemoveProject(project)}
              className="p-0.5 hover:bg-amber-200/80 rounded-full text-amber-700 hover:text-amber-900 transition-colors ml-0.5 cursor-pointer"
              title={`Bỏ lọc dự án ${project}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}

      {selectedProjects.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline px-1.5 py-0.5 cursor-pointer"
        >
          Xoá tất cả
        </button>
      )}
    </div>
  );
};
