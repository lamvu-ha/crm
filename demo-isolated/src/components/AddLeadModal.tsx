import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Tag, 
  Layers, 
  Calendar, 
  DollarSign, 
  Shuffle, 
  Sparkles, 
  Loader2, 
  PlusCircle, 
  Check, 
  AlertTriangle, 
  Eye, 
  ShieldAlert, 
  MessageSquare,
  AlertCircle,
  AlertOctagon
} from 'lucide-react';
import { Lead, LeadStatus, ProductType, SalesMember } from '../types';
import { 
  DATA_SOURCES, 
  PRODUCT_TYPES, 
  LEAD_STATUSES, 
  PROJECTS, 
  ASSIGNEES,
  getAllProductTypes,
  saveCustomProductType
} from '../data/initialData';
import { correctAndEnhanceText, applyLocalCrmRules } from '../services/aiService';
import { PRESET_TAGS } from '../utils/tagUtils';
import { findDuplicatePhoneLeads, playDuplicateAlertSound, normalizePhoneNumber } from '../utils/phoneDuplicateUtils';
import { DuplicatePhoneWarningModal } from './DuplicatePhoneWarningModal';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLead: (leadData: Omit<Lead, 'id' | 'stt'>) => void;
  nextStt: number;
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  leads?: Lead[];
  onOpenExistingLead?: (lead: Lead) => void;
  onOpenInternalChat?: (leadId?: string, targetMemberName?: string) => void;
  onShowToast?: (
    msg: string, 
    type?: 'success' | 'error' | 'warning' | 'info', 
    options?: any
  ) => void;
}

const BANNED_DEMO_NAMES = [
  'trần minh tâm (demo)',
  'nguyễn hoàng nam',
  'lê thanh trúc',
  'trần quốc bảo',
  'phạm minh thư',
  'đỗ hải đăng',
  'vũ tuấn anh'
];

export const AUTO_ASSIGN_KEY = '__auto_round_robin__';

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  isOpen,
  onClose,
  onAddLead,
  nextStt,
  currentUser,
  salesMembers = [],
  leads = [],
  onOpenExistingLead,
  onOpenInternalChat,
  onShowToast
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dataSource, setDataSource] = useState(DATA_SOURCES[0]);
  const [customSource, setCustomSource] = useState('');
  
  // Loại sản phẩm hỗ trợ thêm sản phẩm mới
  const [productType, setProductType] = useState<string>('Nhà phố trung tâm');
  const [customProductType, setCustomProductType] = useState('');
  const [availableProductTypes, setAvailableProductTypes] = useState<string[]>(() => getAllProductTypes());

  const [status, setStatus] = useState<LeadStatus>('Khách mới');
  const [project, setProject] = useState(PROJECTS[0]);
  const [customProject, setCustomProject] = useState('');
  const [assignee, setAssignee] = useState(() => {
    if (currentUser?.role === 'sale') return currentUser.name;
    return AUTO_ASSIGN_KEY;
  });
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAiCorrectingNotes, setIsAiCorrectingNotes] = useState(false);
  const [allowDuplicateSubmit, setAllowDuplicateSubmit] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Form validation errors for mandatory fields
  const [formErrors, setFormErrors] = useState<{
    fullName?: string;
    phone?: string;
  }>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Validate required fields before submitting
  const validateForm = (): boolean => {
    const errors: { fullName?: string; phone?: string } = {};
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      errors.fullName = 'Vui lòng nhập họ và tên khách hàng (bắt buộc).';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Họ và tên khách hàng quá ngắn (tối thiểu 2 ký tự).';
    }

    if (!trimmedPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại liên hệ (bắt buộc).';
    } else {
      const cleanDigits = trimmedPhone.replace(/[^0-9]/g, '');
      if (cleanDigits.length < 8) {
        errors.phone = 'Số điện thoại không hợp lệ (cần ít nhất 9-10 chữ số).';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time duplicate phone detector
  const duplicatePhoneResult = useMemo(() => {
    return findDuplicatePhoneLeads(phone, leads);
  }, [phone, leads]);

  // Trigger red warning toast when duplicate phone is detected on blur or typing
  const triggerDuplicateToast = (matchedLead: Lead) => {
    if (!onShowToast) return;
    const saleInCharge = matchedLead.assignee || 'Chưa phân bổ';
    onShowToast(
      `Số điện thoại "${phone.trim()}" đã tồn tại trong hệ thống (Khách: "${matchedLead.fullName}"). Hiện do Sale "${saleInCharge}" phụ trách!`,
      'error',
      {
        title: 'CẢNH BÁO TRÙNG SỐ ĐIỆN THOẠI!',
        saleName: saleInCharge,
        leadName: matchedLead.fullName,
        phone: phone.trim(),
        project: matchedLead.project,
        status: matchedLead.status,
        duration: 10000,
        actionText: 'Xem cảnh báo tranh chấp lead',
        onActionClick: () => {
          setIsDuplicateModalOpen(true);
        }
      }
    );
  };

  const handlePhoneBlur = () => {
    if (duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead) {
      triggerDuplicateToast(duplicatePhoneResult.matchedLead);
      if (!allowDuplicateSubmit) {
        setIsDuplicateModalOpen(true);
      }
    }
  };

  // Track last alerted phone to avoid repeated chime while continuing typing
  const lastAlertedPhoneRef = React.useRef<string>('');

  // Reset duplicate override if phone changes
  useEffect(() => {
    setAllowDuplicateSubmit(false);
    const norm = normalizePhoneNumber(phone);

    // If phone length is valid phone and matches duplicate, notify immediately
    if (duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead && norm.length >= 8) {
      if (lastAlertedPhoneRef.current !== norm) {
        lastAlertedPhoneRef.current = norm;
        playDuplicateAlertSound();
        triggerDuplicateToast(duplicatePhoneResult.matchedLead);
      }
    } else {
      if (!duplicatePhoneResult.isDuplicate) {
        lastAlertedPhoneRef.current = '';
      }
    }
  }, [phone, duplicatePhoneResult]);

  // Strictly filter sales members to only include authorized members
  const filteredSalesMembers = useMemo(() => {
    return salesMembers.filter((s) => {
      if (!s || !s.name) return false;
      const nameLower = s.name.trim().toLowerCase();
      const emailLower = (s.email || '').trim().toLowerCase();
      if (emailLower.endsWith('@nhaphotrungtam.com.vn')) return false;
      if (BANNED_DEMO_NAMES.some((b) => nameLower === b || (b.length > 5 && nameLower.includes(b)))) return false;
      return true;
    });
  }, [salesMembers]);

  // Đồng bộ lại dữ liệu khi mở Modal
  useEffect(() => {
    if (isOpen) {
      setAvailableProductTypes(getAllProductTypes());
      setCustomProductType('');
      setCustomProject('');
      setCustomSource('');
      setFormErrors({});
      setHasSubmitted(false);
      if (currentUser?.role === 'sale') {
        setAssignee(currentUser.name);
      } else {
        setAssignee(AUTO_ASSIGN_KEY);
      }
    }
  }, [isOpen, currentUser]);

  const handleAiCorrectNotes = async () => {
    if (!notes.trim() || isAiCorrectingNotes) return;
    setIsAiCorrectingNotes(true);
    try {
      const activeProd = productType === 'custom' && customProductType.trim() ? customProductType.trim() : productType;
      const res = await correctAndEnhanceText(notes, {
        type: 'lead_notes',
        context: `Loại SP: ${activeProd}, Dự án: ${customProject || project}, Tài chính: ${budget}`
      });
      if (res.correctedText) {
        setNotes(res.correctedText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiCorrectingNotes(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmitted(true);

    const isValid = validateForm();
    if (!isValid) {
      const trimmedName = fullName.trim();
      const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

      if (!trimmedName || trimmedName.length < 2) {
        document.getElementById('lead-fullname-input')?.focus();
      } else if (!cleanPhone || cleanPhone.length < 8) {
        document.getElementById('lead-phone-input')?.focus();
      }

      if (onShowToast) {
        onShowToast(
          'Vui lòng điền đầy đủ các thông tin bắt buộc (Họ tên và Số điện thoại khách hàng)!',
          'error',
          {
            title: 'THIẾU THÔNG TIN BẮT BUỘC!',
            duration: 6000
          }
        );
      }
      return;
    }

    // Check duplicate phone warning: block accidental duplicate entry unless explicitly allowed
    if (duplicatePhoneResult.isDuplicate && !allowDuplicateSubmit) {
      if (duplicatePhoneResult.matchedLead) {
        triggerDuplicateToast(duplicatePhoneResult.matchedLead);
        setIsDuplicateModalOpen(true);
      }
      return;
    }

    // Xử lý loại sản phẩm (mặc định hoặc người dùng thêm mới)
    const finalProductType = (productType === 'custom' && customProductType.trim())
      ? customProductType.trim()
      : (productType || 'Nhà phố trung tâm');

    // Lưu loại sản phẩm mới vào danh mục tái sử dụng
    if (productType === 'custom' && customProductType.trim()) {
      saveCustomProductType(customProductType.trim());
      setAvailableProductTypes(getAllProductTypes());
    }

    const finalProject = customProject.trim() ? customProject.trim() : project;
    const finalSource = customSource.trim() ? customSource.trim() : dataSource;
    const finalNotes = notes.trim() ? applyLocalCrmRules(notes.trim()).corrected : '';

    onAddLead({
      date,
      fullName: fullName.trim(),
      phone: phone.trim(),
      dataSource: finalSource,
      productType: finalProductType as ProductType,
      status,
      project: finalProject,
      assignee,
      budget: budget.trim(),
      notes: finalNotes,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      history: [
        {
          id: `h-${Date.now()}`,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          type: 'Ghi chú nội bộ',
          content: 'Khởi tạo thông tin Lead trên hệ thống CRM.',
          author: assignee === AUTO_ASSIGN_KEY ? 'Hệ thống tự động' : assignee
        }
      ]
    });

    // Reset form
    setFullName('');
    setPhone('');
    setBudget('');
    setNotes('');
    setSelectedTags([]);
    setCustomSource('');
    setCustomProject('');
    setProductType('Nhà phố trung tâm');
    setCustomProductType('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div 
        className="bg-white rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto max-h-[92dvh] max-h-[92vh] flex flex-col transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs font-mono shadow-2xs">
              #{nextStt}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Thêm khách hàng (Lead) mới</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Chuẩn mẫu SALEPRO HCM_E05 (CRM PRO)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable & Cross-device Optimized) */}
        <form 
          onSubmit={handleSubmit} 
          noValidate
          className="space-y-3.5 sm:space-y-4 text-xs overflow-y-auto overscroll-contain pr-1 sm:pr-1.5 flex-1 pb-safe"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 transparent'
          }}
        >
          {/* Row 1: Họ tên & SĐT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Field: Full Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="lead-fullname-input" className="block font-bold text-slate-700">
                  Họ và tên khách hàng <span className="text-rose-500 font-bold">*</span>
                </label>
                {formErrors.fullName && (
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                    Bắt buộc
                  </span>
                )}
              </div>
              <input
                id="lead-fullname-input"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (formErrors.fullName) {
                    setFormErrors((prev) => ({ ...prev, fullName: undefined }));
                  }
                }}
                onBlur={() => {
                  if (hasSubmitted && (!fullName.trim() || fullName.trim().length < 2)) {
                    setFormErrors((prev) => ({
                      ...prev,
                      fullName: !fullName.trim()
                        ? 'Vui lòng nhập họ và tên khách hàng (bắt buộc).'
                        : 'Họ và tên khách hàng quá ngắn (tối thiểu 2 ký tự).'
                    }));
                  }
                }}
                placeholder="VD: Nguyễn Văn Nam"
                className={`w-full px-3 py-2.5 sm:py-2 border rounded-xl text-slate-900 bg-white focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all ${
                  formErrors.fullName
                    ? 'border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-500/30'
                    : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                }`}
              />
              {formErrors.fullName && (
                <div className="flex items-center gap-1.5 mt-1.5 text-rose-600 font-bold text-[11px] animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{formErrors.fullName}</span>
                </div>
              )}
            </div>

            {/* Field: Phone */}
            <div>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                <label htmlFor="lead-phone-input" className="block font-bold text-slate-700">
                  Số điện thoại liên hệ <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Real-time duplicate status badge */}
                  {duplicatePhoneResult.isDuplicate && (
                    <span className="text-[10px] font-black text-rose-700 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      <span>TRÙNG SỐ ĐÃ CÓ TRONG CRM!</span>
                    </span>
                  )}
                  {!duplicatePhoneResult.isDuplicate && phone.replace(/\D/g, '').length >= 9 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Số hợp lệ (Chưa có)</span>
                    </span>
                  )}
                  {formErrors.phone && !duplicatePhoneResult.isDuplicate && (
                    <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                      <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                      Bắt buộc
                    </span>
                  )}
                  {phone.trim().length >= 4 && (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = phone.replace(/[^0-9+]/g, '');
                        if (cleanPhone) {
                          window.open(`https://www.google.com/search?q=${encodeURIComponent(cleanPhone)}`, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      title="Check số điện thoại này trên Google Search"
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                    >
                      🔍 Check Google
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <input
                  id="lead-phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (formErrors.phone) {
                      setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    }
                  }}
                  onBlur={() => {
                    handlePhoneBlur();
                    if (hasSubmitted) {
                      const cleanDigits = phone.trim().replace(/[^0-9]/g, '');
                      if (!phone.trim()) {
                        setFormErrors((prev) => ({
                          ...prev,
                          phone: 'Vui lòng nhập số điện thoại liên hệ (bắt buộc).'
                        }));
                      } else if (cleanDigits.length < 8) {
                        setFormErrors((prev) => ({
                          ...prev,
                          phone: 'Số điện thoại không hợp lệ (cần ít nhất 9-10 chữ số).'
                        }));
                      }
                    }
                  }}
                  placeholder="VD: 0903 123 456"
                  className={`w-full pl-3 pr-10 py-2.5 sm:py-2 border rounded-xl text-slate-900 bg-white font-mono focus:outline-none text-base sm:text-xs font-bold min-h-[44px] sm:min-h-[38px] transition-all ${
                    duplicatePhoneResult.isDuplicate
                      ? 'border-rose-600 ring-4 ring-rose-500/20 bg-rose-50/40 text-rose-950 focus:border-rose-600 focus:ring-rose-500/30'
                      : formErrors.phone
                        ? 'border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/20 focus:border-rose-600 focus:ring-rose-500/30'
                        : 'border-slate-300 focus:ring-2 focus:ring-amber-500'
                  }`}
                />

                {/* Right-side status icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  {duplicatePhoneResult.isDuplicate ? (
                    <span title="Số điện thoại bị trùng lặp!"><AlertOctagon className="w-5 h-5 text-rose-600 animate-bounce" aria-label="Số điện thoại bị trùng lặp!" /></span>
                  ) : phone.replace(/\D/g, '').length >= 9 ? (
                    <span title="Số điện thoại hợp lệ và chưa có trong hệ thống"><Check className="w-5 h-5 text-emerald-600" aria-label="Số điện thoại hợp lệ và chưa có trong hệ thống" /></span>
                  ) : null}
                </div>
              </div>

              {formErrors.phone && (
                <div className="flex items-center gap-1.5 mt-1.5 text-rose-600 font-bold text-[11px] animate-in fade-in duration-150">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{formErrors.phone}</span>
                </div>
              )}

              {/* Real-Time Duplicate Phone Warning Box */}
              {duplicatePhoneResult.isDuplicate && duplicatePhoneResult.matchedLead && (
                <div className="mt-2 p-3 bg-gradient-to-b from-rose-50 to-amber-50/40 border-2 border-rose-400 rounded-2xl text-xs space-y-2 animate-in fade-in slide-in-from-top-1 duration-150 shadow-sm">
                  <div className="flex items-start gap-2 text-rose-900 font-bold">
                    <div className="p-1 rounded-lg bg-rose-600 text-white shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-rose-950 font-black text-xs sm:text-sm">
                        CẢNH BÁO: SỐ ĐIỆN THOẠI ĐÃ TỒN TẠI TRONG CRM!
                      </span>
                      <p className="font-medium text-[11px] text-rose-800 mt-0.5">
                        Hệ thống phát hiện số này đã được tạo hồ sơ trước đó bởi Sale khác:
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-rose-200 text-[11px] space-y-2 text-slate-800 shadow-2xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                      <div>
                        <span className="font-black text-slate-900 text-xs sm:text-sm">
                          {duplicatePhoneResult.matchedLead.fullName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono ml-2">
                          ({duplicatePhoneResult.matchedLead.phone})
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {duplicatePhoneResult.matchedLead.status}
                      </span>
                    </div>
                    
                    {/* Prominent Sale currently in charge badge */}
                    <div className="flex items-center justify-between flex-wrap gap-2 bg-rose-50/80 p-2 rounded-lg border border-rose-200 text-rose-900">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11px]">Sale phụ trách chính:</span>
                        <strong className="text-white bg-rose-700 px-2.5 py-0.5 rounded-md font-black text-xs shadow-2xs">
                          {duplicatePhoneResult.matchedLead.assignee || 'Chưa phân bổ'}
                        </strong>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Ngày tạo: <strong className="text-slate-800">{duplicatePhoneResult.matchedLead.date}</strong>
                      </span>
                    </div>

                    <div className="text-slate-600 flex flex-wrap gap-x-3 text-[11px]">
                      <span>Dự án/Khu vực: <strong className="text-slate-800">{duplicatePhoneResult.matchedLead.project || 'BĐS Trung Tâm'}</strong></span>
                      {duplicatePhoneResult.matchedLead.budget && (
                        <span>• Tài chính: <strong className="text-slate-800">{duplicatePhoneResult.matchedLead.budget}</strong></span>
                      )}
                    </div>

                    {duplicatePhoneResult.allMatchedLeads.length > 1 && (
                      <div className="text-[10px] text-rose-700 font-semibold bg-rose-100/60 px-2 py-1 rounded border border-rose-200">
                        ⚠️ Phát hiện tổng cộng <strong>{duplicatePhoneResult.allMatchedLeads.length} hồ sơ</strong> có cùng số điện thoại này!
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-1 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {onOpenExistingLead && (
                        <button
                          type="button"
                          onClick={() => {
                            if (duplicatePhoneResult.matchedLead) {
                              onClose();
                              onOpenExistingLead(duplicatePhoneResult.matchedLead);
                            }
                          }}
                          className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Mở hồ sơ khách cũ (1-chạm)</span>
                        </button>
                      )}

                      {onOpenInternalChat && duplicatePhoneResult.matchedLead.assignee && (
                        <button
                          type="button"
                          onClick={() => {
                            if (duplicatePhoneResult.matchedLead) {
                              onClose();
                              onOpenInternalChat(duplicatePhoneResult.matchedLead.id, duplicatePhoneResult.matchedLead.assignee);
                            }
                          }}
                          className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-purple-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                          <span>Chat với {duplicatePhoneResult.matchedLead.assignee}</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDuplicateModalOpen(true)}
                      className="w-full py-2 px-3 bg-gradient-to-r from-rose-700 via-rose-600 to-red-600 hover:from-rose-800 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-amber-200" />
                      <span>Xem cảnh báo tranh chấp &amp; Quy tắc xử lý trùng</span>
                    </button>

                    <div className="pt-1.5 border-t border-rose-200/80 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[10px] text-rose-800 font-medium">
                        {!allowDuplicateSubmit ? '⚠️ Hệ thống sẽ chặn lưu để chống trùng lặp' : '✓ Đã đồng ý tiếp tục nhập'}
                      </span>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold text-rose-950 ml-auto cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-rose-300 shadow-2xs">
                        <input
                          type="checkbox"
                          checked={allowDuplicateSubmit}
                          onChange={(e) => setAllowDuplicateSubmit(e.target.checked)}
                          className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <span>Vẫn tiếp tục nhập khách này</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Ngày tiếp nhận & Tình trạng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Ngày tiếp nhận Lead <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tình trạng ban đầu <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all cursor-pointer"
              >
                {LEAD_STATUSES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Loại sản phẩm (Hỗ trợ thêm mới) & Dự án / Khu vực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Loại sản phẩm <span className="text-rose-500">*</span>
                </label>
                {productType === 'custom' && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    + Sản phẩm mới
                  </span>
                )}
              </div>
              <select
                id="lead-product-type-select"
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all cursor-pointer"
              >
                {availableProductTypes.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
                <option value="custom">+ Nhập loại sản phẩm khác...</option>
              </select>
              {productType === 'custom' && (
                <div className="mt-1.5 relative">
                  <input
                    id="lead-custom-product-input"
                    type="text"
                    required
                    placeholder="Nhập tên loại sản phẩm mới (VD: Kho xưởng, Đất vườn...)"
                    value={customProductType}
                    onChange={(e) => setCustomProductType(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-amber-400 bg-amber-50/40 focus:bg-white rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all"
                    autoFocus
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 font-medium pointer-events-none hidden sm:inline">
                    Tự lưu danh mục
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Dự án / Khu vực <span className="text-rose-500">*</span>
                </label>
                {project === 'custom' && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    + Dự án mới
                  </span>
                )}
              </div>
              <select
                id="lead-project-select"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all cursor-pointer"
              >
                {PROJECTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="custom">+ Nhập dự án khác...</option>
              </select>
              {project === 'custom' && (
                <div className="mt-1.5 relative">
                  <input
                    id="lead-custom-project-input"
                    type="text"
                    required
                    placeholder="Nhập tên dự án / khu vực mới"
                    value={customProject}
                    onChange={(e) => setCustomProject(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-amber-400 bg-amber-50/40 focus:bg-white rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all"
                    autoFocus
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 font-medium pointer-events-none hidden sm:inline">
                    Tự lưu danh mục
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Tệp dữ liệu & Người phụ trách */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Tệp dữ liệu (Nguồn Lead) <span className="text-rose-500">*</span>
                </label>
                {dataSource === 'custom' && (
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    + Nguồn mới
                  </span>
                )}
              </div>
              <select
                id="lead-datasource-select"
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all cursor-pointer"
              >
                {DATA_SOURCES.map((ds) => (
                  <option key={ds} value={ds}>{ds}</option>
                ))}
                <option value="custom">+ Nhập nguồn khác...</option>
              </select>
              {dataSource === 'custom' && (
                <div className="mt-1.5 relative">
                  <input
                    id="lead-custom-datasource-input"
                    type="text"
                    required
                    placeholder="Nhập tên tệp dữ liệu / chiến dịch mới"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    className="w-full px-3 py-2.5 sm:py-2 border border-amber-400 bg-amber-50/40 focus:bg-white rounded-xl text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all"
                    autoFocus
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 font-medium pointer-events-none hidden sm:inline">
                    Tự lưu danh mục
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Người phụ trách (Sales) <span className="text-rose-500">*</span>
              </label>
              <select
                id="lead-assignee-select"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all cursor-pointer"
              >
                <option value={AUTO_ASSIGN_KEY}>
                  ⚡ Tự động phân bổ (Xoay vòng Round-Robin)
                </option>
                <optgroup label="Danh sách nhân viên kinh doanh">
                  {filteredSalesMembers.length > 0 ? (
                    filteredSalesMembers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.title}) {s.id === currentUser?.id ? '— (Bạn)' : ''}
                      </option>
                    ))
                  ) : (
                    ASSIGNEES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))
                  )}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Khoảng tài chính / Ngân sách dự kiến
            </label>
            <input
              id="lead-budget-input"
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="VD: 15 - 20 Tỷ, 3 - 5 Tỷ, 120 Tr/tháng..."
              className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none text-base sm:text-xs font-medium min-h-[44px] sm:min-h-[38px] transition-all"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">
                Ghi chú nhu cầu chi tiết
              </label>
              {notes.trim() && (
                <button
                  type="button"
                  onClick={handleAiCorrectNotes}
                  disabled={isAiCorrectingNotes}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
                  title="Ứng dụng AI sửa lỗi chính tả và giải mã viết tắt BĐS"
                >
                  {isAiCorrectingNotes ? (
                    <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 mr-1" />
                  )}
                  <span>{isAiCorrectingNotes ? 'AI đang sửa...' : 'AI Sửa chính tả & Viết tắt'}</span>
                </button>
              )}
            </div>
            <textarea
              id="lead-notes-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Khách cần mua nhà mặt tiền đường kinh doanh Q1, đã có nguồn tiền sẵn không vay, ưu tiên nhà có kết cấu sẵn... (Có thể gõ tắt: kh can nha q1 15ty)"
              className="w-full px-3 py-2.5 sm:py-2 border border-slate-300 rounded-xl text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none text-base sm:text-xs font-medium transition-all"
            ></textarea>
            <p className="text-[10px] text-slate-400 mt-1 italic">
              ✨ AI CRM sẽ tự động phát hiện và chuyển các từ viết tắt (&quot;đ bận&quot; ➔ &quot;đang bận&quot;, &quot;k nghe máy&quot; ➔ &quot;không nghe máy&quot;) thành văn bản chuẩn mực.
            </p>
          </div>

          {/* Gắn thẻ phân loại (Tags) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Thẻ phân loại khách hàng</span>
              </label>
              <span className="text-[11px] text-slate-400">Bấm chọn thẻ nhanh (nhiều thẻ)</span>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {PRESET_TAGS.map((preset) => {
                const isSelected = selectedTags.some((t) => t.toLowerCase() === preset.name.toLowerCase());
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter((t) => t.toLowerCase() !== preset.name.toLowerCase()));
                      } else {
                        setSelectedTags([...selectedTags, preset.name]);
                      }
                    }}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? `${preset.bg} ${preset.text} ${preset.border} font-bold ring-1 ring-amber-500/50 shadow-2xs`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.name}</span>
                    {isSelected && <Check className="w-3 h-3 ml-0.5 text-emerald-600 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Error Summary Alert (Visible after submit attempt with errors) */}
          {hasSubmitted && (formErrors.fullName || formErrors.phone) && (
            <div 
              id="addlead-error-summary-banner"
              className="p-3 bg-gradient-to-r from-rose-50 to-red-50 border-2 border-rose-300 rounded-2xl text-rose-900 flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200 shadow-2xs"
              role="alert"
            >
              <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <AlertOctagon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="font-black text-rose-950 text-xs flex items-center gap-1.5">
                  <span>CHƯA THỂ LƯU: THIẾU THÔNG TIN BẮT BUỘC!</span>
                </div>
                <div className="text-[11px] text-rose-700 leading-relaxed">
                  Vui lòng hoàn thành các trường có đánh dấu sao đỏ trước khi bấm Lưu:
                </div>
                <ul className="list-disc list-inside text-[11px] font-semibold text-rose-800 space-y-0.5">
                  {formErrors.fullName && <li>{formErrors.fullName}</li>}
                  {formErrors.phone && <li>{formErrors.phone}</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Submit Actions - Mobile & Desktop friendly */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-slate-200 shrink-0 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-all text-center min-h-[44px] sm:min-h-[38px] cursor-pointer flex items-center justify-center active:scale-[0.99]"
            >
              Huỷ bỏ
            </button>
            <button
              id="save-lead-btn"
              type="submit"
              disabled={duplicatePhoneResult.isDuplicate && !allowDuplicateSubmit}
              className={`w-full sm:w-auto px-6 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-all text-center min-h-[44px] sm:min-h-[38px] flex items-center justify-center active:scale-[0.99] ${
                duplicatePhoneResult.isDuplicate && !allowDuplicateSubmit
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
                  : 'text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 hover:shadow-md cursor-pointer'
              }`}
            >
              {duplicatePhoneResult.isDuplicate && !allowDuplicateSubmit
                ? '⚠️ Số điện thoại đã tồn tại'
                : 'Lưu khách hàng vào CRM'}
            </button>
          </div>
        </form>
      </div>

      {/* High-Impact Modal for Duplicate Phone Warning */}
      <DuplicatePhoneWarningModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        matchedLead={duplicatePhoneResult.matchedLead || null}
        inputPhone={phone}
        currentUserName={currentUser?.name}
        onViewExistingLead={(lead) => {
          setIsDuplicateModalOpen(false);
          onClose();
          if (onOpenExistingLead) onOpenExistingLead(lead);
        }}
        onOpenChatWithSale={(leadId, saleName) => {
          setIsDuplicateModalOpen(false);
          onClose();
          if (onOpenInternalChat) onOpenInternalChat(leadId, saleName);
        }}
        onConfirmContinue={() => {
          setAllowDuplicateSubmit(true);
          setIsDuplicateModalOpen(false);
          if (onShowToast) {
            onShowToast('Đã xác nhận tiếp tục nhập khách hàng này.', 'warning');
          }
        }}
        allMatchedLeads={duplicatePhoneResult.allMatchedLeads}
      />
    </div>
  );
};

