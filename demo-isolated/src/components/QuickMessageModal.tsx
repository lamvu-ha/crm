import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  MessageSquare, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Search, 
  Settings, 
  Sparkles,
  Phone,
  Building,
  User,
  CalendarDays,
  Target,
  CheckCircle2,
  RotateCcw,
  PhoneCall,
  Award,
  Layers,
  Zap
} from 'lucide-react';
import { Lead, SalesMember, ZaloTemplate, CustomerScenarioType } from '../types';
import { 
  getStoredZaloTemplates, 
  renderZaloTemplate, 
  ZALO_TEMPLATE_CATEGORIES,
  CUSTOMER_SCENARIOS,
  detectScenarioFromStatus,
  getScenarioConfig
} from '../services/zaloTemplateService';
import { openGooglePhoneSearch } from '../services/notificationService';

interface QuickMessageModalProps {
  lead: Lead | null;
  onClose: () => void;
  templates?: ZaloTemplate[];
  onOpenTemplateManager?: () => void;
  currentUser?: SalesMember;
}

export const QuickMessageModal: React.FC<QuickMessageModalProps> = ({
  lead,
  onClose,
  templates: propTemplates,
  onOpenTemplateManager,
  currentUser
}) => {
  const templates = useMemo(() => {
    if (propTemplates && propTemplates.length > 0) return propTemplates;
    return getStoredZaloTemplates();
  }, [propTemplates]);

  // Detected scenario from lead's status
  const detectedScenarioId = useMemo<CustomerScenarioType>(() => {
    return detectScenarioFromStatus(lead?.status);
  }, [lead?.status]);

  const detectedScenarioConfig = useMemo(() => {
    return getScenarioConfig(detectedScenarioId);
  }, [detectedScenarioId]);

  // Selected filter mode: 'recommended' | 'all' | specific scenario
  const [selectedScenarioFilter, setSelectedScenarioFilter] = useState<string>('recommended');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pick default template matching detected scenario if available
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize selected template when lead changes
  useEffect(() => {
    if (!lead) return;
    
    // Find best template matching lead's scenario
    const matchingTpl = templates.find((t) => {
      const sc = t.scenario || detectScenarioFromStatus(t.targetStatus);
      return sc === detectedScenarioId;
    }) || templates[0];

    if (matchingTpl) {
      setSelectedTemplateId(matchingTpl.id);
      const rendered = renderZaloTemplate(matchingTpl.content, lead, currentUser?.name);
      setCustomText(rendered);
    }
  }, [lead, detectedScenarioId, templates, currentUser]);

  // Filtered templates list
  const filteredTemplates = useMemo(() => {
    let list = templates;

    // Filter by scenario
    if (selectedScenarioFilter === 'recommended') {
      const scenarioMatches = list.filter((t) => {
        const sc = t.scenario || detectScenarioFromStatus(t.targetStatus);
        return sc === detectedScenarioId;
      });
      if (scenarioMatches.length > 0) {
        list = scenarioMatches;
      }
    } else if (selectedScenarioFilter !== 'all') {
      list = list.filter((t) => {
        const sc = t.scenario || detectScenarioFromStatus(t.targetStatus);
        return sc === selectedScenarioFilter;
      });
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }

    return list;
  }, [templates, selectedScenarioFilter, selectedCategory, detectedScenarioId]);

  if (!lead) return null;

  const handleSelectTemplate = (tpl: ZaloTemplate) => {
    setSelectedTemplateId(tpl.id);
    const rendered = renderZaloTemplate(tpl.content, lead, currentUser?.name);
    setCustomText(rendered);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendZalo = () => {
    // Copy to clipboard first so employee can paste directly into Zalo chat
    navigator.clipboard.writeText(customText);
    // Normalize phone number for Zalo
    const cleanPhone = lead.phone.replace(/\D/g, '');
    const zaloPhone = cleanPhone.startsWith('0') ? '84' + cleanPhone.slice(1) : cleanPhone;
    window.open(`https://zalo.me/${zaloPhone}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Gửi Tin Nhắn Zalo Chăm Sóc Khách
                </h3>
                {lead.status && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    {lead.status}
                  </span>
                )}
              </div>
              <div className="flex items-center flex-wrap gap-1 text-xs text-slate-500 mt-0.5">
                <span>Khách: <strong className="text-slate-800">{lead.fullName}</strong> ({lead.phone})</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-medium">{lead.project || 'Nhà Phố Trung Tâm'}</span>
                <button
                  type="button"
                  onClick={() => openGooglePhoneSearch(lead.phone)}
                  title="Check số điện thoại này trên Google"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-[10px] cursor-pointer"
                >
                  <Search className="w-2.5 h-2.5 text-amber-700" />
                  <span>Google</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {onOpenTemplateManager && (
              <button
                type="button"
                onClick={onOpenTemplateManager}
                className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                title="Quản lý và thêm kịch bản tin nhắn theo tình huống"
                aria-label="Cài đặt mẫu kịch bản"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto touch-scroll pr-1 flex-1 space-y-3.5 text-xs pb-safe">
          
          {/* Smart Scenario Recommendation Banner */}
          <div className="p-3 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 font-semibold">Tình huống khách hàng:</span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.2 rounded-full border ${detectedScenarioConfig?.badgeColor || 'bg-blue-100 text-blue-800'}`}>
                    {detectedScenarioConfig?.label || 'Khách quan tâm dự án'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    (Khớp trạng thái "{lead.status}")
                  </span>
                </div>
                <p className="text-[11px] text-blue-900 mt-0.5">
                  {detectedScenarioConfig?.description}
                </p>
              </div>
            </div>

            {onOpenTemplateManager && (
              <button
                type="button"
                onClick={onOpenTemplateManager}
                className="text-[11px] text-blue-700 hover:text-blue-900 font-bold underline shrink-0 cursor-pointer self-end sm:self-center"
              >
                Cài đặt kịch bản
              </button>
            )}
          </div>

          {/* Scenario Filter Quick Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <span>Chọn kịch bản nhanh theo tình huống:</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Hiển thị {filteredTemplates.length} kịch bản
              </span>
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedScenarioFilter('recommended')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  selectedScenarioFilter === 'recommended'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Đề xuất: {detectedScenarioConfig?.label}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenarioFilter('hen_xem')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  selectedScenarioFilter === 'hen_xem'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <CalendarDays className="w-3 h-3" />
                <span>Khách hẹn xem</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenarioFilter('quan_tam_du_an')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  selectedScenarioFilter === 'quan_tam_du_an'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Building className="w-3 h-3" />
                <span>Quan tâm dự án</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenarioFilter('khach_moi')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  selectedScenarioFilter === 'khach_moi'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>Khách mới</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedScenarioFilter('all')}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedScenarioFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả kịch bản
              </button>
            </div>

            {/* Template Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-2xl">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-2 py-4 text-center text-slate-400">
                  Không có kịch bản nào cho nhóm này. Bấm <strong>"Tất cả kịch bản"</strong> để xem thêm.
                </div>
              ) : (
                filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const scConfig = getScenarioConfig(tpl.scenario || detectScenarioFromStatus(tpl.targetStatus));

                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-2.5 rounded-xl text-left text-xs transition-all flex flex-col justify-between gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'border-blue-500 bg-white text-blue-900 shadow-xs ring-1 ring-blue-500/30'
                          : 'border-slate-200/70 bg-white/80 hover:bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5 w-full">
                        <div className="min-w-0">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border inline-block mb-1 ${scConfig?.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                            {tpl.scenarioLabel || scConfig?.label || 'Kịch bản'}
                          </span>
                          <h5 className="font-bold text-xs truncate text-slate-900">{tpl.title}</h5>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                      </div>

                      <p className="text-[11px] text-slate-500 line-clamp-1 italic font-sans">
                        {tpl.content.slice(0, 60)}...
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Editable Message Content Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 block">
                Nội dung tin nhắn Zalo (Đã tự động điền họ tên, dự án, phân khúc):
              </label>
              <span className="text-[10px] text-slate-500">
                Có thể gõ chỉnh sửa trước khi gửi
              </span>
            </div>
            
            <textarea
              rows={6}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-900 leading-relaxed font-sans focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white shadow-inner"
              placeholder="Nhập nội dung tin nhắn gửi khách qua Zalo..."
            />
          </div>

          {/* Helper tip */}
          <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 flex items-center justify-between text-[11px] text-blue-950">
            <span>
              💡 <strong>Mẹo Sale:</strong> Bấm <strong>"Mở Zalo Gửi Ngay"</strong>, nội dung tin nhắn sẽ tự động được sao chép vào bộ nhớ tạm để bạn chỉ cần dán (Ctrl+V / Paste) vào khung chat Zalo của khách hàng.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                <span className="text-emerald-800 font-extrabold">Đã sao chép tin nhắn!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1.5 text-slate-500" />
                <span>Sao chép nội dung</span>
              </>
            )}
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSendZalo}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors cursor-pointer gap-1.5"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở Zalo Gửi Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
