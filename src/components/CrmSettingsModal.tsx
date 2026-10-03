import React, { useState, useMemo, useRef } from 'react';
import { 
  X, 
  Settings, 
  MessageSquareText, 
  Sparkles, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Check, 
  RotateCcw, 
  Eye, 
  Send, 
  Building, 
  User, 
  CalendarDays, 
  Target, 
  Share2, 
  Lock, 
  CheckCircle2, 
  Info,
  Sliders,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  Award,
  Layers,
  FileCheck,
  Tag
} from 'lucide-react';
import { 
  ZaloTemplate, 
  ZaloTemplateCategory, 
  SalesMember, 
  KpiPolicy, 
  AutoDistributionPolicy,
  CustomerScenarioType,
  LeadStatus
} from '../types';
import { 
  ZALO_TEMPLATE_CATEGORIES, 
  CUSTOMER_SCENARIOS,
  TEMPLATE_AVAILABLE_TAGS, 
  DEFAULT_ZALO_TEMPLATES, 
  renderZaloTemplate,
  getScenarioConfig,
  detectScenarioFromStatus
} from '../services/zaloTemplateService';

interface CrmSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'zalo_templates' | 'kpi' | 'distribution' | 'account';
  templates: ZaloTemplate[];
  onSaveTemplates: (updated: ZaloTemplate[]) => Promise<void> | void;
  currentUser: SalesMember;
  kpiPolicy?: KpiPolicy;
  onSaveKpiPolicy?: (policy: KpiPolicy) => void;
  distributionPolicy?: AutoDistributionPolicy;
  onSaveDistributionPolicy?: (policy: AutoDistributionPolicy) => void;
  onOpenChangePassword?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Preset scenario suggestions for quick filling
const PRESET_SCENARIO_TEMPLATES = [
  {
    title: 'Xác nhận lịch hẹn xem thực tế & xe đón',
    scenario: 'hen_xem' as CustomerScenarioType,
    targetStatus: 'Hẹn xem BĐS' as LeadStatus,
    category: 'lich_hen' as ZaloTemplateCategory,
    tags: ['Hẹn xem', 'Khảo sát thực tế', 'Đón tận nơi'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép xác nhận lại lịch hẹn mình đi khảo sát thực tế phân khúc {san_pham} vào {thoi_gian_hen}. Em đã chuẩn bị sẵn xe công ty, tài liệu quy hoạch và giỏ hàng đẹp đón anh/chị. Anh/chị xem thời gian trên có thuận tiện không để em giữ lịch chu đáo nhé ạ!'
  },
  {
    title: 'Nhắc hẹn trước giờ khởi hành (trước 2 tiếng)',
    scenario: 'hen_xem' as CustomerScenarioType,
    targetStatus: 'Hẹn xem BĐS' as LeadStatus,
    category: 'lich_hen' as ZaloTemplateCategory,
    tags: ['Nhắc hẹn', 'Trước giờ G', 'Định vị'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} xin phép nhắn nhắc nhẹ lịch hẹn mình đi xem thực tế dự án {du_an} lúc {thoi_gian_hen} hôm nay ạ. Em gửi anh/chị định vị vị trí điểm đón tại {dia_diem}. Em sẽ có mặt trước 15 phút đón anh/chị. Nếu có bất kỳ thay đổi nào anh/chị nhắn em ngay nhé ạ!'
  },
  {
    title: 'Follow sau buổi xem thực tế',
    scenario: 'hen_xem' as CustomerScenarioType,
    targetStatus: 'Hẹn xem BĐS' as LeadStatus,
    category: 'lich_hen' as ZaloTemplateCategory,
    tags: ['Follow sau xem', 'Hỏi thăm', 'Bảng tính dòng tiền'],
    content: 'Em chào anh/chị {ten_khach} ạ! Em cảm ơn anh/chị đã dành thời gian quý báu đi khảo sát thực tế {san_pham} tại {du_an} cùng em hôm nay. Sau khi trực tiếp xem vị trí và không gian thực tế, anh/chị ưng ý nhất phương án nào ạ? Em xin phép gửi thêm bảng tính dòng tiền và chính sách chiết khấu tốt nhất qua Zalo anh/chị tham khảo thêm nhé!'
  },
  {
    title: 'Gửi trọn bộ pháp lý & Bảng giá chiết khấu đợt 1',
    scenario: 'quan_tam_du_an' as CustomerScenarioType,
    targetStatus: 'Quan tâm' as LeadStatus,
    category: 'du_an' as ZaloTemplateCategory,
    tags: ['Bảng giá', 'Pháp lý', 'Chính sách'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép gửi anh/chị trọn bộ tài liệu: (1) Mặt bằng thiết kế chi tiết từng căn {san_pham}, (2) Bảng giá cập nhật và tiến độ thanh toán đợt này, (3) Chính sách chiết khấu trực tiếp và hỗ trợ vay 0% lãi suất. Anh/chị xem qua có điểm nào cần giải đáp thêm em hỗ trợ ngay nhé ạ!'
  },
  {
    title: 'Giới thiệu 2 căn góc đẹp nhất giỏ hàng - Đúng tầm tài chính',
    scenario: 'quan_tam_du_an' as CustomerScenarioType,
    targetStatus: 'Quan tâm' as LeadStatus,
    category: 'doc_quyen' as ZaloTemplateCategory,
    tags: ['Căn góc', 'Đúng ngân sách', 'Độc quyền'],
    content: 'Dạ anh/chị {ten_khach} ơi, trong giỏ hàng độc quyền {du_an} phân khúc {san_pham} bên em vừa mở thêm 2 căn vị trí cực đẹp, view thoáng mát và đặc biệt vừa đúng khung tài chính {ngan_sach} của anh/chị. Em gửi sơ đồ căn và video flycam quay thực tế qua Zalo này, anh/chị xem qua nhé ạ!'
  },
  {
    title: 'Follow sau 24h gửi bảng giá & tài liệu',
    scenario: 'quan_tam_du_an' as CustomerScenarioType,
    targetStatus: 'Quan tâm' as LeadStatus,
    category: 'cham_soc_lai' as ZaloTemplateCategory,
    tags: ['Follow 24h', 'Chăm sóc', 'Ưu đãi'],
    content: 'Em chào anh/chị {ten_khach}, hôm qua em {nguoi_phu_trach} có gửi bộ tài liệu và bảng giá dự án {du_an}. Không biết anh/chị đã kịp xem qua chưa ạ? Tuần này bên em đang có suất ưu đãi đặc biệt tặng gói nội thất cao cấp cho khách đăng ký sớm, anh/chị có băn khoăn điểm nào cứ nhắn em tư vấn kỹ hơn nhé ạ!'
  },
  {
    title: 'Lời chào kết bạn Zalo & Giới thiệu chuyên viên',
    scenario: 'khach_moi' as CustomerScenarioType,
    targetStatus: 'Khách mới' as LeadStatus,
    category: 'chao_hoi' as ZaloTemplateCategory,
    tags: ['Lời chào', 'Kết bạn Zalo', 'Khách mới'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Em thấy anh/chị vừa để lại thông tin quan tâm phân khúc {san_pham}. Em xin phép kết bạn Zalo để gửi anh/chị thông tin chính thức, bảng giá gốc từ chủ đầu tư và hỗ trợ anh/chị nhanh nhất khi cần ạ!'
  },
  {
    title: 'Giải pháp đòn bẩy tài chính & Hỗ trợ vay 0% lãi suất',
    scenario: 'tiem_nang' as CustomerScenarioType,
    targetStatus: 'Tiềm năng' as LeadStatus,
    category: 'du_an' as ZaloTemplateCategory,
    tags: ['Vay ngân hàng', 'Lãi suất 0%', 'Dòng tiền'],
    content: 'Dạ em chào anh/chị {ten_khach}, em {nguoi_phu_trach} đã lập bảng tính chi tiết phương án vay hỗ trợ lãi suất 0% cho căn {san_pham} tại {du_an}. Với tầm tài chính {ngan_sach}, anh/chị chỉ cần thanh toán trước 20-30%, phần còn lại được ân hạn nợ gốc và miễn lãi 18-24 tháng. Em gửi bảng dòng tiền chi tiết qua Zalo anh/chị xem nhé ạ!'
  },
  {
    title: 'Hướng dẫn giữ chỗ ưu tiên & Khóa căn đẹp',
    scenario: 'dam_phan_coc' as CustomerScenarioType,
    targetStatus: 'Đàm phán / Cọc' as LeadStatus,
    category: 'doc_quyen' as ZaloTemplateCategory,
    tags: ['Giữ chỗ', 'Khóa căn', 'Cọc ưu tiên'],
    content: 'Dạ em chào anh/chị {ten_khach}, căn {san_pham} mã đẹp tại {du_an} mà anh/chị đang chọn hiện có thêm 2 khách khác đang hỏi thăm thiện chí. Để đảm bảo giữ đúng căn này với mức giá ưu đãi đợt 1, em xin phép hỗ trợ anh/chị thủ tục đặt cọc thiện chí giữ chỗ. Em gửi thông tin số tài khoản chính thức của công ty ngay sau đây nhé ạ!'
  },
  {
    title: 'Nhắn Zalo xin phép sau cuộc gọi nhỡ / máy bận',
    scenario: 'khong_nghe_may' as CustomerScenarioType,
    targetStatus: 'Không nghe máy' as LeadStatus,
    category: 'chao_hoi' as ZaloTemplateCategory,
    tags: ['Cuộc gọi nhỡ', 'Máy bận', 'Lịch hẹn gọi lại'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Vừa nãy em có gọi điện hỗ trợ anh/chị nhưng chắc anh/chị đang bận cuộc họp hoặc di chuyển ngoài đường. Em xin phép gửi thông tin qua Zalo này để anh/chị tiện xem lúc rảnh nhé. Khoảng mấy giờ em có thể liên hệ lại thuận tiện cho anh/chị ạ?'
  }
];

export const CrmSettingsModal: React.FC<CrmSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'zalo_templates',
  templates,
  onSaveTemplates,
  currentUser,
  kpiPolicy,
  onSaveKpiPolicy,
  distributionPolicy,
  onSaveDistributionPolicy,
  onOpenChangePassword,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'zalo_templates' | 'kpi' | 'distribution' | 'account'>(initialTab);
  
  // Zalo Templates state
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<ZaloTemplate> | null>(null);
  const [editorError, setEditorError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  // Sample lead for live preview
  const previewTestLead = useMemo(() => {
    let statusText = 'Khách mới';
    if (editingTemplate?.scenario === 'hen_xem') statusText = 'Hẹn xem BĐS';
    else if (editingTemplate?.scenario === 'quan_tam_du_an') statusText = 'Quan tâm';
    else if (editingTemplate?.scenario === 'tiem_nang') statusText = 'Tiềm năng';
    else if (editingTemplate?.scenario === 'dam_phan_coc') statusText = 'Đàm phán / Cọc';
    else if (editingTemplate?.scenario === 'cham_soc_lai') statusText = 'Đang chăm sóc';
    else if (editingTemplate?.scenario === 'khong_nghe_may') statusText = 'Không nghe máy';

    return {
      fullName: 'Anh Nguyễn Minh Khang',
      phone: '0903888999',
      project: 'Nhà Phố Trung Tâm Quận 1',
      productType: 'Nhà phố mặt tiền',
      budget: '18 - 25 tỷ',
      assignee: currentUser.name || 'Bùi Văn Trường',
      status: statusText
    };
  }, [editingTemplate?.scenario, currentUser.name]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial tab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setIsEditingTemplate(false);
      setEditingTemplate(null);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    // Filter by scenario
    if (selectedScenario !== 'all') {
      const tplScenario = tpl.scenario || detectScenarioFromStatus(tpl.targetStatus);
      if (tplScenario !== selectedScenario) {
        return false;
      }
    }
    // Filter by category
    if (selectedCategory !== 'all' && tpl.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      tpl.title.toLowerCase().includes(q) ||
      tpl.content.toLowerCase().includes(q) ||
      (tpl.scenarioLabel || '').toLowerCase().includes(q) ||
      (tpl.targetStatus || '').toLowerCase().includes(q) ||
      (tpl.tags || []).some(t => t.toLowerCase().includes(q)) ||
      (tpl.authorName || '').toLowerCase().includes(q)
    );
  });

  const handleAddNewTemplate = (presetScenario?: CustomerScenarioType) => {
    const defaultScenario = presetScenario || 'hen_xem';
    const scConfig = getScenarioConfig(defaultScenario);
    const targetStatus = scConfig?.statusMatch[0] || 'Hẹn xem BĐS';

    setEditingTemplate({
      id: `zalo-tpl-${Date.now()}`,
      title: '',
      scenario: defaultScenario,
      scenarioLabel: scConfig?.label || 'Khách hẹn xem',
      targetStatus: targetStatus,
      category: defaultScenario === 'hen_xem' ? 'lich_hen' : 'du_an',
      content: defaultScenario === 'hen_xem'
        ? 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép xác nhận lại lịch hẹn mình đi khảo sát thực tế phân khúc {san_pham} vào {thoi_gian_hen}. Em đã chuẩn bị sẵn xe công ty và hồ sơ quy hoạch đón anh/chị nhé ạ!'
        : 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}...',
      tags: scConfig ? [scConfig.label] : ['Kịch bản nhanh'],
      isDefault: false,
      authorName: currentUser.name || 'Chuyên viên kinh doanh'
    });
    setEditorError('');
    setIsEditingTemplate(true);
  };

  const handleEditTemplate = (tpl: ZaloTemplate) => {
    setEditingTemplate({ ...tpl });
    setEditorError('');
    setIsEditingTemplate(true);
  };

  const handleDuplicateTemplate = async (tpl: ZaloTemplate) => {
    const duplicated: ZaloTemplate = {
      ...tpl,
      id: `zalo-tpl-${Date.now()}`,
      title: `${tpl.title} (Bản sao)`,
      isDefault: false,
      authorName: currentUser.name || 'Chuyên viên kinh doanh'
    };
    const updated = [duplicated, ...templates];
    await onSaveTemplates(updated);
    if (onShowToast) onShowToast('Đã nhân bản mẫu tin nhắn thành công!', 'success');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu tin nhắn kịch bản này khỏi hệ thống?')) {
      const updated = templates.filter((t) => t.id !== id);
      await onSaveTemplates(updated);
      if (onShowToast) onShowToast('Đã xóa mẫu tin nhắn thành công!', 'info');
    }
  };

  const handleResetDefaultTemplates = async () => {
    if (window.confirm('Khôi phục toàn bộ kho kịch bản tin nhắn Zalo chuẩn BĐS theo tình huống (Khách hẹn xem, Khách quan tâm dự án, Đàm phán cọc...)?')) {
      await onSaveTemplates(DEFAULT_ZALO_TEMPLATES);
      if (onShowToast) onShowToast('Đã khôi phục các mẫu kịch bản tình huống chuẩn BĐS!', 'success');
    }
  };

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

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleApplyPreset = (preset: typeof PRESET_SCENARIO_TEMPLATES[0]) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      title: preset.title,
      scenario: preset.scenario,
      scenarioLabel: getScenarioConfig(preset.scenario)?.label || preset.title,
      targetStatus: preset.targetStatus,
      category: preset.category,
      content: preset.content,
      tags: preset.tags
    });
    if (onShowToast) onShowToast(`Đã áp dụng mẫu: "${preset.title}"`, 'info');
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || !editingTemplate) return;
    const currentTags = editingTemplate.tags || [];
    if (!currentTags.includes(tagInput.trim())) {
      setEditingTemplate({
        ...editingTemplate,
        tags: [...currentTags, tagInput.trim()]
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      tags: (editingTemplate.tags || []).filter(t => t !== tagToRemove)
    });
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate?.title?.trim()) {
      setEditorError('Vui lòng nhập tiêu đề cho kịch bản tin nhắn.');
      return;
    }
    if (!editingTemplate?.content?.trim()) {
      setEditorError('Vui lòng nhập nội dung kịch bản tin nhắn.');
      return;
    }

    const scConfig = getScenarioConfig(editingTemplate.scenario);
    const scenarioLabel = scConfig?.label || 'Khác';

    const isNew = !templates.some((t) => t.id === editingTemplate.id);
    let updatedList: ZaloTemplate[];

    if (isNew) {
      const newTpl: ZaloTemplate = {
        id: editingTemplate.id || `zalo-tpl-${Date.now()}`,
        title: editingTemplate.title.trim(),
        scenario: editingTemplate.scenario || 'hen_xem',
        scenarioLabel: scenarioLabel,
        targetStatus: editingTemplate.targetStatus || scConfig?.statusMatch[0] || 'Hẹn xem BĐS',
        category: (editingTemplate.category as ZaloTemplateCategory) || 'chao_hoi',
        content: editingTemplate.content.trim(),
        tags: editingTemplate.tags || [scenarioLabel],
        isDefault: false,
        authorName: currentUser.name || 'Chuyên viên kinh doanh',
        updatedAt: new Date().toISOString()
      };
      updatedList = [newTpl, ...templates];
    } else {
      updatedList = templates.map((t) => {
        if (t.id === editingTemplate.id) {
          return {
            ...t,
            title: editingTemplate.title!.trim(),
            scenario: editingTemplate.scenario || t.scenario,
            scenarioLabel: scenarioLabel,
            targetStatus: editingTemplate.targetStatus || t.targetStatus,
            category: (editingTemplate.category as ZaloTemplateCategory) || t.category,
            content: editingTemplate.content!.trim(),
            tags: editingTemplate.tags || t.tags,
            authorName: currentUser.name || t.authorName,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
    }

    await onSaveTemplates(updatedList);
    setIsEditingTemplate(false);
    setEditingTemplate(null);
    if (onShowToast) {
      onShowToast(isNew ? 'Đã lưu kịch bản tin nhắn mới!' : 'Đã cập nhật kịch bản thành công!', 'success');
    }
  };

  const handleCopyPreview = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if (onShowToast) onShowToast('Đã sao chép nội dung tin nhắn!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] max-h-[860px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Settings className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Cài đặt hệ thống &amp; Tiện ích CRM</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {currentUser.role === 'admin' ? 'Quản trị viên' : 'Kinh doanh'}
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Kịch bản tin nhắn Zalo theo tình huống, KPI Chủ Nhật, phân bổ lead và bảo mật tài khoản
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('zalo_templates');
              setIsEditingTemplate(false);
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'zalo_templates'
                ? 'border-blue-600 text-blue-700 bg-white/70 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquareText className="w-4 h-4 text-blue-600" />
            <span>Mẫu tin nhắn theo tình huống</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-mono font-bold">
              {templates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('kpi');
              setIsEditingTemplate(false);
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'kpi'
                ? 'border-amber-600 text-amber-700 bg-white/70'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-4 h-4 text-amber-600" />
            <span>Chỉ tiêu KPI Zalo &amp; Hẹn gặp</span>
          </button>

          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('distribution');
                setIsEditingTemplate(false);
              }}
              className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'distribution'
                  ? 'border-indigo-600 text-indigo-700 bg-white/70'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span>Chính sách Phân bổ Lead</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('account');
              setIsEditingTemplate(false);
            }}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'account'
                ? 'border-slate-800 text-slate-900 bg-white/70'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-slate-600" />
            <span>Tài khoản &amp; Bảo mật</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* TAB 1: MẪU TIN NHẮN THEO TÌNH HUỐNG */}
          {activeTab === 'zalo_templates' && (
            <div className="space-y-4">
              
              {/* Feature Introduction Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/80 to-purple-50/60 border border-blue-200/90 text-xs text-blue-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                      <span>Mẫu tin nhắn nhanh theo tình huống khách hàng</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-blue-600 text-white">Mới</span>
                    </h4>
                    <p className="text-blue-900/90 mt-0.5 leading-relaxed">
                      Lưu trữ kịch bản Zalo chuẩn theo từng trạng thái khách hàng (VD: <strong>Khách hẹn xem</strong>, <strong>Khách quan tâm dự án</strong>, <strong>Đàm phán cọc</strong>...). Nhân viên kinh doanh có thể chèn nhanh 1 chạm khi gửi Zalo mà không phải gõ lại.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={handleResetDefaultTemplates}
                    title="Khôi phục lại kho kịch bản tình huống chuẩn BĐS từ hệ thống"
                    className="px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nạp kịch bản chuẩn BĐS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddNewTemplate(selectedScenario !== 'all' ? (selectedScenario as CustomerScenarioType) : 'hen_xem')}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>+ Thêm kịch bản mới</span>
                  </button>
                </div>
              </div>

              {/* Scenario Filter Quick Bar (Pills with icons & counters) */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chọn tình huống khách hàng:</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Bấm để lọc kịch bản theo trạng thái tương ứng
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedScenario('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedScenario === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Tất cả tình huống ({templates.length})</span>
                  </button>

                  {CUSTOMER_SCENARIOS.map((sc) => {
                    const count = templates.filter(
                      (t) => (t.scenario || detectScenarioFromStatus(t.targetStatus)) === sc.id
                    ).length;

                    const isSelected = selectedScenario === sc.id;

                    return (
                      <button
                        type="button"
                        key={sc.id}
                        onClick={() => setSelectedScenario(sc.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-xs scale-102 ring-2 ring-blue-500/40'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                        }`}
                        title={sc.description}
                      >
                        {sc.id === 'hen_xem' && <CalendarDays className={`w-3.5 h-3.5 ${isSelected ? 'text-purple-300' : 'text-purple-600'}`} />}
                        {sc.id === 'quan_tam_du_an' && <Building className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`} />}
                        {sc.id === 'khach_moi' && <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-300' : 'text-blue-600'}`} />}
                        {sc.id === 'tiem_nang' && <Target className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-amber-600'}`} />}
                        {sc.id === 'dam_phan_coc' && <CheckCircle2 className={`w-3.5 h-3.5 ${isSelected ? 'text-rose-300' : 'text-rose-600'}`} />}
                        {sc.id === 'cham_soc_lai' && <RotateCcw className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-300' : 'text-indigo-600'}`} />}
                        {sc.id === 'khong_nghe_may' && <PhoneCall className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`} />}
                        {sc.id === 'da_chot' && <Award className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-300' : 'text-teal-600'}`} />}

                        <span>{sc.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search & Sub-category Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm theo tiêu đề kịch bản, nội dung, thẻ tags..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  />
                  <MessageSquareText className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">📂 Tất cả danh mục mẫu ({templates.length})</option>
                    {ZALO_TEMPLATE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label} ({templates.filter((t) => t.category === cat.id).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Editor Drawer / Modal Form */}
              {isEditingTemplate && editingTemplate && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-blue-500/40 shadow-xl space-y-4 animate-in fade-in zoom-in-98 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <Edit3 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {templates.some((t) => t.id === editingTemplate.id) ? 'Chỉnh sửa kịch bản tin nhắn Zalo' : 'Thêm kịch bản tin nhắn Zalo theo tình huống'}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Cấu hình kịch bản sẵn sàng chèn nhanh khi khách hàng đạt trạng thái tương ứng
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTemplate(false);
                        setEditingTemplate(null);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-lg hover:bg-slate-100"
                    >
                      ✕ Đóng
                    </button>
                  </div>

                  {editorError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 text-xs border border-rose-200">
                      {editorError}
                    </div>
                  )}

                  {/* Preset Suggestions Quick Bar */}
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Chèn nhanh kịch bản mẫu gợi ý chuẩn BĐS:</span>
                      </span>
                      <span className="text-[11px] text-indigo-600">Bấm để điền mẫu ngay</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_SCENARIO_TEMPLATES.map((preset, idx) => (
                        <button
                          type="button"
                          key={idx}
                          onClick={() => handleApplyPreset(preset)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>{preset.title}</span>
                          <span className="text-[9px] px-1 py-0.1 bg-indigo-50 text-indigo-700 rounded font-normal">
                            {getScenarioConfig(preset.scenario)?.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSaveEditor} className="space-y-3.5">
                    
                    {/* Scenario and Target Status selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-blue-600" />
                          <span>Tình huống áp dụng *</span>
                        </label>
                        <select
                          value={editingTemplate.scenario || 'hen_xem'}
                          onChange={(e) => {
                            const scId = e.target.value as CustomerScenarioType;
                            const scCfg = getScenarioConfig(scId);
                            setEditingTemplate({
                              ...editingTemplate,
                              scenario: scId,
                              scenarioLabel: scCfg?.label || 'Khác',
                              targetStatus: scCfg?.statusMatch[0] || 'Hẹn xem BĐS'
                            });
                          }}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer"
                        >
                          {CUSTOMER_SCENARIOS.map((sc) => (
                            <option key={sc.id} value={sc.id}>
                              {sc.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Trạng thái khách hàng tương ứng</span>
                        </label>
                        <select
                          value={editingTemplate.targetStatus || 'Hẹn xem BĐS'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, targetStatus: e.target.value as LeadStatus })}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 cursor-pointer"
                        >
                          <option value="Hẹn xem BĐS">📅 Hẹn xem BĐS (Khách hẹn xem)</option>
                          <option value="Quan tâm">🏢 Quan tâm (Khách quan tâm dự án)</option>
                          <option value="Gửi thông tin">📄 Gửi thông tin (Cần bảng giá/pháp lý)</option>
                          <option value="Khách mới">🌟 Khách mới (Vừa tiếp nhận)</option>
                          <option value="Tiềm năng">💎 Tiềm năng (Phân vân tài chính)</option>
                          <option value="Đàm phán / Cọc">🤝 Đàm phán / Cọc (Khóa căn)</option>
                          <option value="Đang chăm sóc">🔄 Đang chăm sóc (Chăm sóc lại)</option>
                          <option value="Không nghe máy">📞 Không nghe máy / Máy bận</option>
                          <option value="Gọi lại sau">⏰ Hẹn gọi lại sau</option>
                          <option value="Đã chốt">🎉 Đã chốt (Hậu mãi / Chăm sóc sau bán)</option>
                          <option value="all">📂 Tất cả trạng thái</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Phân loại danh mục Zalo
                        </label>
                        <select
                          value={editingTemplate.category || 'chao_hoi'}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value as ZaloTemplateCategory })}
                          className="w-full px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 cursor-pointer"
                        >
                          {ZALO_TEMPLATE_CATEGORIES.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tiêu đề kịch bản tin nhắn *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTemplate.title || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                        placeholder="VD: Xác nhận lịch hẹn xem thực tế & xe đưa đón"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                      />
                    </div>

                    {/* Tag Quick Insert Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          Nội dung kịch bản tin nhắn *
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Bấm vào thẻ bên dưới để chèn biến dữ liệu tự động:
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {TEMPLATE_AVAILABLE_TAGS.map((tag) => (
                          <button
                            type="button"
                            key={tag.tag}
                            onClick={() => handleInsertTag(tag.tag)}
                            className="px-2 py-0.8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                            title={`Chèn biến: ${tag.label} (VD: ${tag.sample})`}
                          >
                            <span className="font-bold">+</span>
                            <span>{tag.tag}</span>
                            <span className="text-[9px] text-indigo-500 font-sans">({tag.label})</span>
                          </button>
                        ))}
                      </div>

                      <textarea
                        ref={textareaRef}
                        rows={5}
                        required
                        value={editingTemplate.content || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                        placeholder="Nhập nội dung kịch bản Zalo..."
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans text-slate-800 leading-relaxed"
                      />
                    </div>

                    {/* Tags input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-slate-500" />
                        <span>Thẻ phân loại tình huống (Tags)</span>
                      </label>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTag();
                            }
                          }}
                          placeholder="Thêm thẻ (VD: Hẹn xem, Bảng giá, Giá ngộp...)"
                          className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleAddTag}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                        >
                          + Thêm
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {(editingTemplate.tags || []).map((t, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold"
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(t)}
                              className="text-slate-400 hover:text-rose-600 font-bold ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Live Preview of Rendered Template */}
                    <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Xem trước khi gửi khách mẫu ({previewTestLead.fullName} - {previewTestLead.status}):</span>
                        </span>
                        <span className="text-[10px] text-slate-500 italic">
                          Dữ liệu mẫu tự động điền theo tình huống
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed italic shadow-2xs font-sans">
                        {renderZaloTemplate(editingTemplate.content || '', previewTestLead as any, currentUser.name, {
                          time: '09:30 sáng mai',
                          date: new Date().toLocaleDateString('vi-VN'),
                          location: 'Văn phòng bán hàng dự án'
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingTemplate(false);
                          setEditingTemplate(null);
                        }}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      >
                        Đóng
                      </button>

                      <button
                        type="submit"
                        className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        Lưu kịch bản tin nhắn
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Template List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTemplates.length === 0 ? (
                  <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                    <MessageSquareText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">Không tìm thấy kịch bản tin nhắn nào</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Thử đổi bộ lọc tình huống hoặc bấm <strong>"Nạp kịch bản chuẩn BĐS"</strong> để tải sẵn kịch bản mẫu.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetDefaultTemplates}
                      className="mt-3 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold hover:bg-blue-100 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Nạp kịch bản chuẩn BĐS ngay</span>
                    </button>
                  </div>
                ) : (
                  filteredTemplates.map((tpl) => {
                    const scId = tpl.scenario || detectScenarioFromStatus(tpl.targetStatus);
                    const scInfo = getScenarioConfig(scId) || CUSTOMER_SCENARIOS[0];
                    const catInfo = ZALO_TEMPLATE_CATEGORIES.find((c) => c.id === tpl.category) || ZALO_TEMPLATE_CATEGORIES[0];
                    
                    const rendered = renderZaloTemplate(tpl.content, {
                      fullName: 'Anh Nguyễn Minh Khang',
                      phone: '0903888999',
                      project: 'Nhà Phố Trung Tâm Quận 1',
                      productType: 'Nhà phố mặt tiền',
                      budget: '18 - 25 tỷ',
                      assignee: currentUser.name || 'Bùi Văn Trường',
                      status: tpl.targetStatus || 'Khách mới'
                    }, currentUser.name, {
                      time: '09:30 sáng mai',
                      date: new Date().toLocaleDateString('vi-VN'),
                      location: 'Văn phòng bán hàng dự án'
                    });

                    return (
                      <div
                        key={tpl.id}
                        className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Card Header: Badges & Actions */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {/* Scenario Badge */}
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${scInfo.badgeColor}`}>
                                  {scInfo.id === 'hen_xem' && <CalendarDays className="w-3 h-3" />}
                                  {scInfo.id === 'quan_tam_du_an' && <Building className="w-3 h-3" />}
                                  {scInfo.id === 'khach_moi' && <Sparkles className="w-3 h-3" />}
                                  {scInfo.id === 'tiem_nang' && <Target className="w-3 h-3" />}
                                  {scInfo.id === 'dam_phan_coc' && <CheckCircle2 className="w-3 h-3" />}
                                  {scInfo.id === 'cham_soc_lai' && <RotateCcw className="w-3 h-3" />}
                                  {scInfo.id === 'khong_nghe_may' && <PhoneCall className="w-3 h-3" />}
                                  {scInfo.id === 'da_chot' && <Award className="w-3 h-3" />}
                                  <span>{tpl.scenarioLabel || scInfo.label}</span>
                                </span>

                                {/* Target Status Badge */}
                                {tpl.targetStatus && tpl.targetStatus !== 'all' && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    Áp dụng: {tpl.targetStatus}
                                  </span>
                                )}

                                {/* Category Badge */}
                                <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${catInfo.color}`}>
                                  {catInfo.label}
                                </span>

                                {tpl.isDefault && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">
                                    Chuẩn CRM
                                  </span>
                                )}
                              </div>

                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                                {tpl.title}
                              </h4>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleDuplicateTemplate(tpl)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Nhân bản kịch bản này"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditTemplate(tpl)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Chỉnh sửa kịch bản"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa kịch bản"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Content Preview */}
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4 font-sans">
                            {tpl.content}
                          </div>

                          {/* Tags */}
                          {tpl.tags && tpl.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {tpl.tags.map((tag, idx) => (
                                <span key={idx} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Người tạo: <strong>{tpl.authorName || 'Hệ thống'}</strong></span>

                          <button
                            type="button"
                            onClick={() => handleCopyPreview(rendered, tpl.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors cursor-pointer"
                          >
                            {copiedId === tpl.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Sao chép mẫu</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CẤU HÌNH KPI ZALO & HẸN GẶP */}
          {activeTab === 'kpi' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>Chính sách KPI Chủ Nhật &amp; Chăm Sóc Zalo</span>
                </div>
                <p className="text-amber-900/90 leading-relaxed">
                  Hệ thống SalePro CRM áp dụng chính sách KPI tiêu chuẩn: <strong>Mỗi chuyên viên kinh doanh phải có tối thiểu 2 khách hàng kết nối Zalo mới/ngày</strong> và <strong>tối thiểu 2 cuộc hẹn xem BĐS thực tế/tuần</strong>. Tối Chủ Nhật hàng tuần, hệ thống sẽ tổng hợp bảng xếp hạng và tạo dự thảo email gửi Ban Lãnh Đạo.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <h4 className="font-bold text-sm text-slate-800">Thông số cấu hình KPI hiện tại</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Chỉ tiêu Zalo hàng ngày:</span>
                    <div className="font-black text-2xl text-blue-600 mt-1">
                      {kpiPolicy?.dailyZaloTarget || 2} <span className="text-xs font-normal text-slate-600">khách kết nối Zalo / ngày</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Chỉ tiêu Hẹn gặp thực tế hàng tuần:</span>
                    <div className="font-black text-2xl text-purple-600 mt-1">
                      {kpiPolicy?.weeklyMeetingTarget || 2} <span className="text-xs font-normal text-slate-600">cuộc hẹn xem BĐS / tuần</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700">Email nhận báo cáo tối Chủ Nhật:</span>
                  <div className="text-slate-600">
                    GĐKD: <strong>{kpiPolicy?.gdkdEmail || 'nhaphotrungtam.com.vn@gmail.com'}</strong>
                  </div>
                  <div className="text-slate-600">
                    Admin: <strong>{kpiPolicy?.defaultAdminEmail || 'truongbv.salepro@gmail.com'}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CHÍNH SÁCH PHÂN BỔ LEAD */}
          {activeTab === 'distribution' && currentUser.role === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                <span className="font-bold text-sm text-indigo-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Chính sách phân bổ Lead tự động (Round-Robin &amp; Năng lực)</span>
                </span>
                <p className="text-indigo-800">
                  Lead mới từ các chiến dịch Facebook, Google Ads, Hotline hoặc Google Sheet sẽ được thuật toán tự động chia đều cho các chuyên viên kinh doanh đang trực và chưa vượt quá giới hạn lead đang xử lý.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Chế độ phân bổ:</span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    {distributionPolicy?.enabled ? 'Đang bật tự động' : 'Tắt tự động (Chia thủ công)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Thời gian tiếp nhận tối đa (SLA):</span>
                  <strong>{distributionPolicy?.acceptTimeoutMinutes || 60} phút</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <span>Thời gian báo cáo đầu tiên:</span>
                  <strong>{distributionPolicy?.reportTimeoutHours || 4} giờ</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TÀI KHOẢN & BẢO MẬT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 font-black text-lg flex items-center justify-center">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900">{currentUser.name}</h4>
                    <p className="text-xs text-slate-500">{currentUser.email} • {currentUser.phone || 'Chưa cập nhật SĐT'}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      Vai trò: {currentUser.role === 'admin' ? 'Trưởng phòng / Quản trị viên' : 'Chuyên viên kinh doanh (Sale)'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider text-slate-400">Bảo mật tài khoản</h5>
                  
                  {onOpenChangePassword && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenChangePassword();
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-300" />
                      <span>Đổi mật khẩu tài khoản</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {activeTab === 'zalo_templates' && (
              <span>Hiển thị <strong>{filteredTemplates.length}</strong> / <strong>{templates.length}</strong> kịch bản tin nhắn theo tình huống</span>
            )}
            {activeTab === 'kpi' && <span>Chỉ tiêu áp dụng cho toàn bộ đội ngũ kinh doanh</span>}
            {activeTab === 'distribution' && <span>Được quản lý bởi Trưởng Phòng Kinh Doanh</span>}
            {activeTab === 'account' && <span>Thông tin đăng nhập của bạn</span>}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng cài đặt
          </button>
        </div>
      </div>
    </div>
  );
};
