import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  MessageSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Search, 
  RotateCcw, 
  ShieldCheck, 
  Eye, 
  Tag, 
  Send,
  Building,
  User,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ZaloTemplate, ZaloTemplateCategory, SalesMember } from '../types';
import { 
  ZALO_TEMPLATE_CATEGORIES, 
  TEMPLATE_AVAILABLE_TAGS, 
  DEFAULT_ZALO_TEMPLATES,
  renderZaloTemplate 
} from '../services/zaloTemplateService';

interface ZaloTemplateManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ZaloTemplate[];
  onSaveTemplates: (updated: ZaloTemplate[]) => Promise<void> | void;
  currentUser?: SalesMember;
}

export const ZaloTemplateManagementModal: React.FC<ZaloTemplateManagementModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplates,
  currentUser
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ZaloTemplate> | null>(null);
  const [editorError, setEditorError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewTestLead, setPreviewTestLead] = useState({
    fullName: 'Anh Nguyễn Minh Khang',
    phone: '0903888999',
    project: 'Nhà Phố Trung Tâm Quận 1',
    productType: 'Nhà phố mặt tiền',
    budget: '18 - 25 tỷ',
    assignee: currentUser?.name || 'Bùi Văn Trường',
    status: 'Khách mới'
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      if (selectedCategory !== 'all' && tpl.category !== selectedCategory) {
        return false;
      }
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase().trim();
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.content.toLowerCase().includes(q) ||
        (tpl.authorName || '').toLowerCase().includes(q)
      );
    });
  }, [templates, selectedCategory, searchTerm]);

  // Open add modal
  const handleAddNew = () => {
    setEditingTemplate({
      id: `zalo-tpl-${Date.now()}`,
      title: '',
      category: 'chao_hoi',
      content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}...',
      isDefault: false,
      authorName: currentUser?.name || 'Nhân sự kinh doanh'
    });
    setEditorError('');
    setIsEditing(true);
  };

  // Open edit modal
  const handleEdit = (tpl: ZaloTemplate) => {
    setEditingTemplate({ ...tpl });
    setEditorError('');
    setIsEditing(true);
  };

  // Delete template
  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu tin nhắn Zalo này?')) {
      const updated = templates.filter((t) => t.id !== id);
      onSaveTemplates(updated);
    }
  };

  // Reset to default templates
  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục danh sách mẫu tin nhắn nhanh Zalo mặc định từ hệ thống?')) {
      onSaveTemplates(DEFAULT_ZALO_TEMPLATES);
    }
  };

  // Insert tag into textarea at cursor position
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current || !editingTemplate) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const oldContent = editingTemplate.content || '';
    const newContent = oldContent.substring(0, start) + tag + oldContent.substring(end);
    
    setEditingTemplate({
      ...editingTemplate,
      content: newContent
    });

    // Move cursor right after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  // Save template from editor
  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate?.title?.trim()) {
      setEditorError('Vui lòng nhập tiêu đề cho mẫu tin nhắn.');
      return;
    }
    if (!editingTemplate?.content?.trim()) {
      setEditorError('Vui lòng nhập nội dung mẫu tin nhắn.');
      return;
    }

    const nowIso = new Date().toISOString();
    const isNew = !templates.some((t) => t.id === editingTemplate.id);

    let updatedList: ZaloTemplate[];
    if (isNew) {
      const newTpl: ZaloTemplate = {
        id: editingTemplate.id || `zalo-tpl-${Date.now()}`,
        title: editingTemplate.title.trim(),
        category: editingTemplate.category || 'chao_hoi',
        content: editingTemplate.content.trim(),
        isDefault: false,
        authorName: currentUser?.name || 'Nhân sự kinh doanh',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      updatedList = [newTpl, ...templates];
    } else {
      updatedList = templates.map((t) => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: editingTemplate.title!.trim(),
            category: editingTemplate.category || 'chao_hoi',
            content: editingTemplate.content!.trim(),
            updatedAt: nowIso
          };
        }
        return t;
      });
    }

    onSaveTemplates(updatedList);
    setIsEditing(false);
    setEditingTemplate(null);
  };

  // Copy template text
  const handleCopy = (id: string, text: string) => {
    const rendered = renderZaloTemplate(text, previewTestLead, currentUser?.name);
    navigator.clipboard.writeText(rendered);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryMeta = (cat: ZaloTemplateCategory) => {
    return ZALO_TEMPLATE_CATEGORIES.find((c) => c.id === cat) || ZALO_TEMPLATE_CATEGORIES[0];
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto touch-scroll">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Quản Lý Mẫu Tin Nhắn Nhanh Zalo
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                  {templates.length} Mẫu Sẵn Sàng
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Lưu sẵn các kịch bản tin nhắn chào hỏi, gửi thông tin dự án, bảng giá, lịch hẹn khảo sát thực tế
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

        {/* Toolbar: Category tabs, Search & Actions */}
        <div className="py-3 border-b border-slate-100 space-y-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kịch bản theo tên, nội dung hoặc dự án..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Add & Reset Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleAddNew}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Mẫu Mới</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Khôi phục danh sách mẫu mặc định"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Badges Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({templates.length})
            </button>
            {ZALO_TEMPLATE_CATEGORIES.map((cat) => {
              const count = templates.filter((t) => t.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body: Templates Grid */}
        <div className="overflow-y-auto touch-scroll py-3.5 pr-1 flex-1 space-y-3 pb-safe">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Chưa có mẫu tin nhắn nào phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">
                Bấm "Thêm Mẫu Mới" để tạo kịch bản chào hỏi hoặc gửi thông tin dự án
              </p>
              <button
                type="button"
                onClick={handleAddNew}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                + Tạo Mẫu Tin Nhắn Mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTemplates.map((tpl) => {
                const catMeta = getCategoryMeta(tpl.category);
                const isCopied = copiedId === tpl.id;
                const sampleRendered = renderZaloTemplate(tpl.content, previewTestLead, currentUser?.name);

                return (
                  <div
                    key={tpl.id}
                    className="p-4 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      {/* Top row: Category tag & Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catMeta.color}`}>
                          {catMeta.label}
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(tpl.id, tpl.content)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                            }`}
                            title="Sao chép nội dung mẫu (đã điền mẫu)"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(tpl)}
                            className="p-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                            title="Chỉnh sửa kịch bản này"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {!tpl.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleDelete(tpl.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                              title="Xóa mẫu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {tpl.title}
                      </h4>

                      {/* Content Box */}
                      <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-[11px] leading-relaxed text-slate-700 font-normal select-all">
                        {tpl.content}
                      </div>

                      {/* Live preview with sample data */}
                      <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100/80 text-[10px] text-blue-900">
                        <span className="font-bold block text-blue-950 mb-0.5">Xem trước khi gửi khách thực tế:</span>
                        <p className="italic text-slate-700 line-clamp-3">"{sampleRendered}"</p>
                      </div>
                    </div>

                    {/* Footer Info */}
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Người tạo: <strong className="text-slate-600">{tpl.authorName || 'Hệ thống'}</strong></span>
                      {tpl.isDefault && (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                          Mặc định hệ thống
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="hidden sm:inline">
            💡 Gợi ý: Dùng các biến <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono font-bold">{`{ten_khach}`}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono font-bold">{`{du_an}`}</code> để hệ thống tự động điền thông tin khách
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer ml-auto"
          >
            Hoàn tất &amp; Đóng
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-MODAL: ADD / EDIT TEMPLATE                            */}
      {/* ========================================================= */}
      {isEditing && editingTemplate && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 text-left space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                    {templates.some(t => t.id === editingTemplate.id) ? 'Chỉnh Sửa Mẫu Tin Nhắn' : 'Tạo Mẫu Tin Nhắn Zalo Mới'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cấu hình nội dung kịch bản tương tác nhanh cho nhân sự
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditingTemplate(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editorError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{editorError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditor} className="space-y-3.5 text-xs text-slate-700">
              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề kịch bản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.title || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    placeholder="VD: Chào hỏi khách mới quan tâm Nhà phố..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại kịch bản <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingTemplate.category || 'chao_hoi'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as ZaloTemplateCategory })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {ZALO_TEMPLATE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Tag Insertion Toolbar */}
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-blue-950">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bấm để chèn biến thông tin khách hàng vào tin nhắn:</span>
                  </span>
                </div>
                <div className="flex items-center flex-wrap gap-1.5">
                  {TEMPLATE_AVAILABLE_TAGS.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => handleInsertTag(t.tag)}
                      className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white border border-blue-300 rounded-lg text-[10px] font-mono font-bold text-blue-800 transition-colors shadow-2xs cursor-pointer"
                      title={`Chèn ${t.label} (Ví dụ: ${t.sample})`}
                    >
                      + {t.label} ({t.tag})
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nội dung tin nhắn Zalo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  ref={textareaRef}
                  rows={5}
                  value={editingTemplate.content || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                  placeholder="Nhập nội dung tin nhắn gửi khách qua Zalo..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Live Preview Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="font-bold text-[11px] text-slate-800 block">
                  👁️ Xem trước tin nhắn sau khi điền thông tin khách mẫu:
                </span>
                <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                  "{renderZaloTemplate(editingTemplate.content || '', previewTestLead, currentUser?.name) || 'Chưa có nội dung...'}"
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Lưu Mẫu Tin Nhắn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
