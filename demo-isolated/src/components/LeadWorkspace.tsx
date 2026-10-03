import { CustomerHealth } from './CustomerHealth';
import { neglectedCustomer, profileIssues } from '../utils/customerWorkflow';
import React, {useEffect, useState} from 'react';
import {ArrowUpRight, ArrowRightLeft, Bell, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Edit3, FileText, MessageSquare, Phone, Sparkles, Trash2, UserRound, Building2, ShieldCheck, Search, X} from 'lucide-react';
import {Lead, LeadStatus, SalesMember, AutoDistributionPolicy} from '../types';
import {LEAD_STATUSES} from '../data/initialData';
import {formatDateVN} from '../utils/crmCalculations';
import {getLeadSlaInfo} from '../utils/slaUtils';
import {formatCallbackReminderBadge} from '../services/callbackReminderService';
import {formatZaloReminderBadge} from '../services/zaloReminderService';
import {LeadTagPicker} from './LeadTagBadge';

interface Props {
  leads: Lead[];
  selectedIds: string[];
  currentUser?: SalesMember;
  salesMembers?: SalesMember[];
  policy: AutoDistributionPolicy;
  now: number;
  onToggle: (id: string) => void;
  onSelect: (lead: Lead) => void;
  onStatus: (id: string, status: LeadStatus) => void;
  onDelete: (id: string) => void;
  onMessage: (lead: Lead) => void;
  onAppointment: (lead: Lead) => void;
  onAccept?: (id: string) => void;
  onTransfer?: (leads: Lead[]) => void;
  onChat?: (id: string) => void;
  onReminder?: (lead: Lead) => void;
  onUpdate?: (lead: Lead) => void;
  onAi: (lead: Lead) => void;
  onCall: (phone: string, event: React.MouseEvent) => void;
  onZalo: (phone: string, event: React.MouseEvent) => void;
  onCopy: (phone: string, event: React.MouseEvent) => void;
  copiedPhone: string | null;
  editingId: string | null;
  note: string;
  onNote: (text: string) => void;
  onStartNote: (lead: Lead, event: React.MouseEvent) => void;
  onSaveNote: (lead: Lead) => void;
  onCancelNote: () => void;
}

function Field({label,children}: {label:string; children:React.ReactNode}) {
  return <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-2 text-xs leading-5"><dt className="text-slate-400">{label}</dt><dd className="min-w-0 whitespace-pre-wrap break-words font-medium text-slate-700">{children || <span className="font-normal text-slate-400">Chưa có</span>}</dd></div>;
}
function Group({title,icon:Icon,children}: {title:string; icon:typeof Building2; children:React.ReactNode}) {
  return <section className="min-w-0"><h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Icon size={15} className="text-blue-500"/>{title}</h3><dl className="space-y-1">{children}</dl></section>;
}
const timestamp = (value?:string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
};
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

const customerStatusStyles: Record<string, {badge: string; stripe: string; glow: string; icon: typeof UserRound}> = {
  'Khách mới': {badge: 'bg-sky-700 border-sky-800 text-white', stripe: 'border-l-sky-600', glow: 'bg-sky-500', icon: UserRound},
  'Đang chăm sóc': {badge: 'bg-amber-300 border-amber-500 text-amber-950', stripe: 'border-l-amber-500', glow: 'bg-amber-500', icon: Phone},
  'Quan tâm': {badge: 'bg-teal-700 border-teal-800 text-white', stripe: 'border-l-teal-600', glow: 'bg-teal-500', icon: MessageSquare},
  'Tiềm năng': {badge: 'bg-indigo-700 border-indigo-800 text-white', stripe: 'border-l-indigo-600', glow: 'bg-indigo-500', icon: Sparkles},
  'Hẹn xem BĐS': {badge: 'bg-purple-700 border-purple-800 text-white', stripe: 'border-l-purple-600', glow: 'bg-purple-500', icon: CalendarDays},
  'Đàm phán / Cọc': {badge: 'bg-orange-700 border-orange-800 text-white', stripe: 'border-l-orange-600', glow: 'bg-orange-500', icon: Building2},
  'Đã chốt': {badge: 'bg-emerald-700 border-emerald-800 text-white', stripe: 'border-l-emerald-600', glow: 'bg-emerald-500', icon: CheckCircle2},
  'Gọi lại sau': {badge: 'bg-blue-700 border-blue-800 text-white', stripe: 'border-l-blue-600', glow: 'bg-blue-500', icon: Clock},
  'Không nghe máy': {badge: 'bg-rose-700 border-rose-800 text-white', stripe: 'border-l-rose-600', glow: 'bg-rose-500', icon: Phone},
  'Không nhu cầu': {badge: 'bg-slate-600 border-slate-700 text-white', stripe: 'border-l-slate-500', glow: 'bg-slate-400', icon: X},
};
const defaultCustomerStatusStyle = {badge: 'bg-slate-600 border-slate-700 text-white', stripe: 'border-l-slate-500', glow: 'bg-slate-400', icon: UserRound};
export function LeadWorkspace(p: Props) {
  const [page,setPage] = useState(1);
  const [size,setSize] = useState(8);
  const [search,setSearch] = useState('');
  const [healthFilter,setHealthFilter] = useState<'all'|'neglected'|'incomplete'>('all');
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const query = normalize(search.trim());
  const phoneQuery = search.replace(/\D/g, '');
  const filteredLeads = p.leads.filter(lead => (healthFilter === 'all' || (healthFilter === 'neglected' ? neglectedCustomer(lead,p.now) : profileIssues(lead).length > 0)) && (!query ||
    normalize(lead.fullName || '').includes(query) ||
    (lead.email || '').toLowerCase().includes(search.trim().toLowerCase()) ||
    (phoneQuery.length > 0 && /^[\d\s+().-]+$/.test(search.trim()) && (lead.phone || '').replace(/\D/g, '').includes(phoneQuery))
  ));
  const pages = Math.max(1,Math.ceil(filteredLeads.length/size));
  const current = Math.min(page,pages);
  const resultKey = filteredLeads.map(l=>l.id).join('|');
  useEffect(()=>setPage(1),[resultKey,size,search,healthFilter]);
  const visible = filteredLeads.slice((current-1)*size,current*size);
  return <section className="bg-slate-50/80" aria-label="Hồ sơ khách hàng đầy đủ">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:px-4"><div><h2 className="flex items-center gap-2 text-base font-bold text-slate-900">Hồ sơ khách hàng <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{filteredLeads.length}</span></h2><p className="mt-1 text-xs text-slate-500">Liên hệ, nhu cầu, tiến độ chăm sóc và phân công trong cùng một hồ sơ.</p></div><div className="flex items-center gap-3"><span className="text-xs text-slate-500">{p.selectedIds.length ? `Đã chọn ${p.selectedIds.length} khách` : 'Số hồ sơ mỗi trang'}</span><select aria-label="Số hồ sơ mỗi trang" value={size} onChange={e=>setSize(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">{[8,16,24].map(n=><option key={n} value={n}>{n} hồ sơ</option>)}</select></div><div className="relative w-full sm:max-w-md"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input type="search" aria-label="Tìm khách hàng theo tên, số điện thoại hoặc email" placeholder="Tìm tên khách hàng, số điện thoại hoặc email..." value={search} onChange={event=>setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 [&::-webkit-search-cancel-button]:hidden"/>{search&&<button type="button" aria-label="Xóa tìm kiếm khách hàng" onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15}/></button>}</div><div className="flex w-full flex-wrap gap-2">{([{value:'all',label:'Tất cả'}, {value:'neglected',label:'Cần chăm sóc lại'}, {value:'incomplete',label:'Cần bổ sung hồ sơ'}] as const).map(filter=><button key={filter.value} type="button" onClick={()=>setHealthFilter(filter.value)} aria-pressed={healthFilter===filter.value} className={healthFilter===filter.value ? 'rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white' : 'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600'}>{filter.label} ({p.leads.filter(lead=>filter.value==='all'||(filter.value==='neglected'?neglectedCustomer(lead,p.now):profileIssues(lead).length>0)).length})</button>)}</div></header>
    <div className="space-y-3 p-2 sm:p-3">
      {!visible.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><UserRound className="mx-auto mb-3 text-slate-300" size={32}/><h3 className="font-semibold text-slate-700">Không có khách hàng phù hợp</h3><p className="mt-2 text-sm text-slate-500">Thử thay đổi bộ lọc hoặc thêm khách hàng mới.</p></div>}
      {visible.map(lead=>{
        const statusStyle = customerStatusStyles[lead.status] || defaultCustomerStatusStyle;
        const StatusIcon = statusStyle.icon;
        const sla = getLeadSlaInfo(lead,p.policy,p.now);
        const selected = p.selectedIds.includes(lead.id);
        const members = p.salesMembers || [];
        const owner = members.find(member => member.name === lead.assignee);
        const ownerRole = owner?.role === 'sale' ? 'NVKD' : owner?.role === 'tpkd' ? 'TPKD' : owner?.role === 'admin' ? 'Admin' : '';
        const manager = owner?.role === 'tpkd' ? owner : owner ? members.find(member => member.role === 'tpkd' && (
          (!!owner.managerId && member.id === owner.managerId) ||
          (!!owner.managerName && member.name === owner.managerName) ||
          (!!owner.managerEmail && member.email.toLowerCase() === owner.managerEmail.toLowerCase()) ||
          (!!owner.tpkdEmail && member.email.toLowerCase() === owner.tpkdEmail.toLowerCase())
        )) : undefined;
        return <article key={lead.id} className={`min-w-0 overflow-visible rounded-2xl border border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md ${statusStyle.stripe} ${selected?'border-blue-400 ring-2 ring-blue-100':'border-slate-200'}`}>
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-start gap-3"><input aria-label={`Chọn ${lead.fullName}`} type="checkbox" checked={selected} onChange={()=>p.onToggle(lead.id)} className="mt-3 h-4 w-4 shrink-0 accent-blue-600"/><span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">{lead.fullName.split(' ').filter(Boolean).slice(-2).map(n=>n[0]).join('')}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><button onClick={()=>p.onSelect(lead)} className="break-words text-left text-sm font-bold text-slate-900 hover:text-blue-700">{lead.fullName}</button><span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">#{String(lead.stt).padStart(3,'0')}</span></div><div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1.5"><Phone size={12}/>{lead.phone||'Chưa có số điện thoại'}</span><span>{lead.email||'Chưa có email'}</span></div></div></div>
            <div className="flex flex-wrap items-center gap-2"><div className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 shadow-sm transition duration-200 hover:brightness-110 focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2 ${statusStyle.badge}`}><StatusIcon size={15} aria-hidden="true" className={`shrink-0 ${lead.status === 'Khách mới' || lead.status === 'Gọi lại sau' ? 'motion-safe:animate-pulse' : ''}`}/><select aria-label={`Tình trạng ${lead.fullName}`} value={lead.status} onChange={e=>p.onStatus(lead.id,e.target.value)} className="min-w-0 max-w-full cursor-pointer rounded-lg border-0 bg-transparent py-2 pr-1 text-xs font-extrabold text-inherit outline-none [&>option]:bg-white [&>option]:text-slate-900">{Array.from(new Set([...LEAD_STATUSES,lead.status])).map(s=><option key={s} value={s}>{s}</option>)}</select></div><button className={buttonClass} onClick={()=>p.onSelect(lead)}>Hồ sơ & lịch sử<ArrowUpRight size={14}/></button></div>
          </div>
          <div className="px-3 pt-2 sm:px-4"><CustomerHealth lead={lead} now={p.now}/></div>
          <div className="grid gap-4 px-3 py-3 md:grid-cols-2 xl:grid-cols-4 sm:px-4">
            <Group title="Khách hàng & nguồn" icon={UserRound}><Field label="Điện thoại"><span className="inline-flex flex-wrap items-center gap-2">{lead.phone}<button aria-label={`Sao chép số ${lead.fullName}`} onClick={e=>p.onCopy(lead.phone,e)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600">{p.copiedPhone===lead.phone?<Check size={13}/>:<Copy size={13}/>}</button></span></Field><Field label="Email">{lead.email}</Field><Field label="Địa chỉ">{lead.address}</Field><Field label="Tệp dữ liệu">{lead.dataSource}</Field><Field label="Chiến dịch">{lead.campaignCode}</Field><Field label="Ngày dữ liệu">{formatDateVN(lead.date)}</Field></Group>
            <Group title="Nhu cầu & giao dịch" icon={Building2}><Field label="Dự án">{lead.project}</Field><Field label="Sản phẩm">{lead.productType}</Field><Field label="Ngân sách">{lead.budget}</Field><Field label="Giá trị dự kiến">{lead.dealValue!=null?`${lead.dealValue.toLocaleString('vi-VN')} triệu VNĐ`:''}</Field><Field label="Mức tiềm năng">{lead.potentialLevel||'Chưa đánh giá'}</Field><Field label="Lý do ưu tiên">{lead.priorityReason}</Field></Group>
            <Group title="Chăm sóc & tương tác" icon={MessageSquare}><Field label="Cuộc gọi">{lead.callStatus}</Field><Field label="Kết nối Zalo">{lead.zaloConnected?'Đã kết nối':'Chưa kết nối'}</Field><Field label="Ngày kết nối">{timestamp(lead.zaloConnectedAt)}</Field><Field label="Lần cập nhật">{timestamp(lead.updatedAt)}</Field><Field label="Báo cáo đầu">{timestamp(lead.firstReportedAt)}</Field><Field label="Tương tác">{`${lead.history?.length||0} hoạt động`}</Field></Group>
            <Group title="Phân công & thời hạn" icon={ShieldCheck}><Field label="Phụ trách"><span className="inline-flex flex-wrap items-center gap-2">{lead.assignee||'Chưa phân công'}{ownerRole&&<span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${owner?.role === 'tpkd' ? 'border-purple-200 bg-purple-50 text-purple-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>{ownerRole}</span>}</span></Field><Field label="TPKD quản lý">{manager?.name || owner?.managerName || 'Chưa xác định'}</Field><Field label="Ngày chia">{timestamp(lead.assignedAt)}</Field><Field label="Tiếp nhận">{timestamp(lead.acceptedAt)||'Chờ tiếp nhận'}</Field><Field label="SLA"><span className={`inline-flex rounded-md border px-2 py-1 ${sla.badgeClasses.bg} ${sla.badgeClasses.text} ${sla.badgeClasses.border}`}>{sla.stageLabel}</span></Field><Field label="Thời hạn">{sla.countdownText}</Field><Field label="Chia lại">{`${lead.reassignedCount||0} lần`}</Field>{!!lead.previousAssignees?.length&&<Field label="Trước đó">{lead.previousAssignees.join(', ')}</Field>}</Group>
          </div>
          <div className="grid gap-3 border-t border-slate-100 px-3 py-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] sm:px-6">
            <section className="min-w-0"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><FileText size={14}/>Ghi chú chăm sóc</h3>{p.onUpdate&&p.editingId!==lead.id&&<button className="flex items-center gap-1 text-xs font-semibold text-blue-600" onClick={e=>p.onStartNote(lead,e)}><Edit3 size={13}/>Thêm ghi chú</button>}</div>
              {p.editingId===lead.id?<div className="space-y-2"><textarea autoFocus aria-label={`Ghi chú cho ${lead.fullName}`} rows={3} value={p.note} onChange={e=>p.onNote(e.target.value)} className="w-full rounded-xl border border-blue-200 bg-blue-50/30 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"/><div className="flex justify-end gap-2"><button className={buttonClass} onClick={p.onCancelNote}>Hủy</button><button className={buttonClass} disabled={!p.note.trim()} onClick={()=>p.onSaveNote(lead)}><Check size={14}/>Lưu ghi chú</button></div></div>:<p className="whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-slate-50 p-2 text-xs leading-5 text-slate-600">{lead.notes||'Chưa có ghi chú chăm sóc.'}</p>}
            </section>
            <section className="min-w-0"><h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Thẻ phân loại & nhắc hẹn</h3><div className="flex flex-wrap items-center gap-2">{lead.tags?.map(tag=><span key={tag} className="break-words rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700">{tag}{p.onUpdate&&<button aria-label={`Gỡ thẻ ${tag}`} className="ml-2 text-blue-400 hover:text-blue-800" onClick={()=>p.onUpdate?.({...lead,tags:lead.tags?.filter(t=>t!==tag),updatedAt:new Date().toISOString()})}>×</button>}</span>)}{p.onUpdate&&<LeadTagPicker lead={lead} onUpdateLead={p.onUpdate} allLeads={p.leads}/>}</div><div className="mt-3 space-y-2 text-xs text-slate-500">{lead.callbackReminder?.status==='pending'&&<p className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 p-2 text-emerald-700"><Phone size={13}/>Gọi lại: {formatCallbackReminderBadge(lead.callbackReminder).text} {lead.callbackReminder.notes}</p>}{lead.zaloReminder?.status==='pending'&&<p className="flex flex-wrap items-center gap-2 rounded-lg bg-blue-50 p-2 text-blue-700"><Bell size={13}/>Zalo: {formatZaloReminderBadge(lead.zaloReminder).text} {lead.zaloReminder.notes}</p>}{!lead.callbackReminder&&!lead.zaloReminder&&<span>Chưa có lịch nhắc hẹn.</span>}</div></section>
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/60 px-3 py-2.5 sm:px-4"><div className="flex flex-wrap gap-2"><button className={buttonClass} onClick={e=>p.onCall(lead.phone,e)}><Phone size={14}/>Gọi điện</button><button className={buttonClass} onClick={e=>p.onZalo(lead.phone,e)}><MessageSquare size={14}/>Zalo</button><button className={buttonClass} onClick={()=>p.onMessage(lead)}><Edit3 size={14}/>Mẫu tin nhắn</button><button className={buttonClass} onClick={()=>p.onAppointment(lead)}><CalendarDays size={14}/>Lịch hẹn</button>{p.onReminder&&<button className={buttonClass} onClick={()=>p.onReminder?.(lead)}><Bell size={14}/>Nhắc Zalo</button>}{p.onChat&&<button className={buttonClass} onClick={()=>p.onChat?.(lead.id)}><MessageSquare size={14}/>Chat nội bộ</button>}</div><div className="flex flex-wrap gap-2">{!lead.acceptedAt&&p.onAccept&&<button className={buttonClass} onClick={()=>p.onAccept?.(lead.id)}><CheckCircle2 size={14}/>Tiếp nhận</button>}{p.onTransfer&&<button className={buttonClass} onClick={()=>p.onTransfer?.([lead])}><ArrowRightLeft size={14}/>Chuyển khách</button>}<button className={buttonClass} onClick={()=>p.onAi(lead)}><Sparkles size={14}/>Đánh giá AI</button>{p.currentUser?.role==='admin'&&<button className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50" onClick={()=>p.onDelete(lead.id)}><Trash2 size={14}/>Xóa</button>}</div></footer>
        </article>;
      })}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500"><span>Hiển thị {filteredLeads.length?`${(current-1)*size+1}–${Math.min(current*size,filteredLeads.length)}`:'0'} / {filteredLeads.length} hồ sơ</span><div className="flex items-center gap-3"><button aria-label="Trang trước" className={buttonClass} disabled={current===1} onClick={()=>setPage(current-1)}><ChevronLeft size={14}/></button><span>Trang {current} / {pages}</span><button aria-label="Trang sau" className={buttonClass} disabled={current===pages} onClick={()=>setPage(current+1)}><ChevronRight size={14}/></button></div></div>
  </section>;
}
