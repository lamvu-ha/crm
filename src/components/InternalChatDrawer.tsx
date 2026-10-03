import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Search, 
  Users, 
  User, 
  ShieldCheck, 
  Flame, 
  Building2, 
  Phone, 
  Sparkles, 
  Clock, 
  Check, 
  CheckCheck, 
  ExternalLink,
  Filter,
  Plus,
  Trash2,
  Bell,
  MessageCircle,
  HelpCircle,
  Award,
  ChevronLeft,
  ArrowLeft
} from 'lucide-react';
import { Lead, SalesMember, InternalChatMessage, ChatUrgentLevel } from '../types';
import { 
  fetchInternalMessages, 
  sendInternalMessage, 
  markInternalMessagesAsRead, 
  deleteInternalMessage,
  CHAT_UPDATE_EVENT 
} from '../services/internalChatService';
import { getTpkdForMember } from '../data/salesTeamData';

interface InternalChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SalesMember;
  salesMembers: SalesMember[];
  leads: Lead[];
  onOpenLeadDetail?: (lead: Lead) => void;
  onShowToast?: (msg: string) => void;
  initialLeadId?: string;
}

export const InternalChatDrawer: React.FC<InternalChatDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  salesMembers,
  leads,
  onOpenLeadDetail,
  onShowToast,
  initialLeadId
}) => {
  const [messages, setMessages] = useState<InternalChatMessage[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'leads' | 'direct' | 'announcements'>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialLeadId || null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [urgentLevel, setUrgentLevel] = useState<ChatUrgentLevel>('normal');
  const [attachedLeadId, setAttachedLeadId] = useState<string>(initialLeadId || '');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TPKD của người dùng hiện tại
  const myTpkd = useMemo(() => getTpkdForMember(currentUser, salesMembers), [currentUser, salesMembers]);

  // Load tin nhắn
  const loadMessages = async () => {
    const data = await fetchInternalMessages();
    setMessages(data);
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      if (initialLeadId) {
        setSelectedLeadId(initialLeadId);
        setAttachedLeadId(initialLeadId);
      }
    }
  }, [isOpen, initialLeadId]);

  useEffect(() => {
    const handleUpdate = () => {
      loadMessages();
    };
    window.addEventListener(CHAT_UPDATE_EVENT, handleUpdate);
    const interval = setInterval(loadMessages, 4000);
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleUpdate);
      clearInterval(interval);
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedLeadId, selectedRecipientId, selectedFilter]);

  // Đánh dấu đã đọc cho các tin đang hiển thị
  useEffect(() => {
    if (!isOpen || messages.length === 0) return;
    const unread = messages.filter((m) => 
      m.senderId !== currentUser.id && 
      !m.readBy.includes(currentUser.id) &&
      (!m.recipientId || m.recipientId === currentUser.id)
    );
    if (unread.length > 0) {
      markInternalMessagesAsRead(unread.map(u => u.id), currentUser.id);
    }
  }, [isOpen, messages, currentUser.id]);

  // Danh sách các Lead có trao đổi tin nhắn
  const leadsWithMessages = useMemo(() => {
    const leadMap = new Map<string, { lead: Lead | undefined; leadId: string; lastMessage: InternalChatMessage; count: number }>();
    
    messages.forEach((m) => {
      if (m.leadId) {
        const foundLead = leads.find((l) => l.id === m.leadId);
        const existing = leadMap.get(m.leadId);
        if (!existing) {
          leadMap.set(m.leadId, {
            lead: foundLead,
            leadId: m.leadId,
            lastMessage: m,
            count: 1
          });
        } else {
          existing.count += 1;
          if (new Date(m.createdAt).getTime() > new Date(existing.lastMessage.createdAt).getTime()) {
            existing.lastMessage = m;
          }
        }
      }
    });

    return Array.from(leadMap.values());
  }, [messages, leads]);

  // Lọc tin nhắn hiển thị theo bộ lọc đang chọn
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Lọc theo tìm kiếm từ khóa
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => 
        m.content.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        (m.leadName && m.leadName.toLowerCase().includes(q)) ||
        (m.leadPhone && m.leadPhone.includes(q)) ||
        (m.leadProject && m.leadProject.toLowerCase().includes(q))
      );
    }

    // Lọc theo tab
    if (selectedFilter === 'leads') {
      if (selectedLeadId) {
        result = result.filter((m) => m.leadId === selectedLeadId);
      } else {
        result = result.filter((m) => Boolean(m.leadId));
      }
    } else if (selectedFilter === 'direct') {
      if (selectedRecipientId) {
        result = result.filter((m) => 
          (m.senderId === currentUser.id && m.recipientId === selectedRecipientId) ||
          (m.senderId === selectedRecipientId && m.recipientId === currentUser.id)
        );
      } else {
        result = result.filter((m) => Boolean(m.recipientId));
      }
    } else if (selectedFilter === 'announcements') {
      result = result.filter((m) => !m.leadId && !m.recipientId);
    } else {
      // 'all': Nếu có chọn lead cụ thể
      if (selectedLeadId) {
        result = result.filter((m) => m.leadId === selectedLeadId);
      }
    }

    return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedFilter, selectedLeadId, selectedRecipientId, searchQuery, currentUser.id]);

  if (!isOpen) return null;

  // Xử lý gửi tin nhắn
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      // Lấy thông tin lead được gắn kèm (nếu có)
      let attachedLead: Lead | undefined = undefined;
      const targetLeadId = attachedLeadId || selectedLeadId;
      if (targetLeadId) {
        attachedLead = leads.find((l) => l.id === targetLeadId);
      }

      // Xác định người nhận
      let recipient: SalesMember | undefined = undefined;
      if (selectedRecipientId) {
        recipient = salesMembers.find((s) => s.id === selectedRecipientId);
      } else if (attachedLead && currentUser.role === 'sale') {
        recipient = myTpkd || undefined;
      }

      await sendInternalMessage({
        sender: currentUser,
        recipient,
        lead: attachedLead ? {
          id: attachedLead.id,
          fullName: attachedLead.fullName,
          phone: attachedLead.phone,
          project: attachedLead.project
        } : undefined,
        content: text,
        urgentLevel
      });

      setInputText('');
      setUrgentLevel('normal');
      await loadMessages();
      if (onShowToast) {
        onShowToast('Đã gửi tin nhắn trao đổi nội bộ thành công!');
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (confirm('Bạn có chắc muốn xóa tin nhắn này?')) {
      await deleteInternalMessage(msgId);
      await loadMessages();
      if (onShowToast) onShowToast('Đã xóa tin nhắn.');
    }
  };

  // Mẫu câu gợi ý nhanh
  const quickPills = [
    { text: 'Chị Chi/Anh Vinh hỗ trợ em chốt cọc khách VIP này với ạ', level: 'urgent' as ChatUrgentLevel },
    { text: 'Xin phép TPKD duyệt chính sách chiết khấu thanh toán sớm', level: 'deal_approval' as ChatUrgentLevel },
    { text: 'Khách hẹn chiều thứ 7 đi xem thực tế dự án', level: 'normal' as ChatUrgentLevel },
    { text: 'Khách yêu cầu kiểm tra tình trạng còn trống của căn', level: 'normal' as ChatUrgentLevel }
  ];

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* HEADER BAR */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                  Trao Đổi Nội Bộ TPKD &amp; NVKD
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase">
                  Real-Time
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 font-medium">
                Hỗ trợ tư vấn khách hàng, xin duyệt giá/chiết khấu &amp; hỗ trợ chốt deal
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 bg-white/10 px-2.5 py-1 rounded-xl text-xs font-semibold">
              <User className="w-3.5 h-3.5 text-amber-300" />
              <span>{currentUser.name}</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'tpkd' ? 'TPKD' : 'NVKD'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Đóng cửa sổ chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (Sidebar & Chat Area) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDEBAR: FILTERS & CONVERSATION THREADS */}
          <div className="w-72 sm:w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
            {/* Search */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tin nhắn, khách, SĐT..."
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-4 p-1.5 bg-slate-200/70 border-b border-slate-200 text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('all');
                  setSelectedLeadId(null);
                  setSelectedRecipientId(null);
                }}
                className={`py-1 rounded-lg transition-colors ${
                  selectedFilter === 'all' && !selectedLeadId
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('leads')}
                className={`py-1 rounded-lg transition-colors ${
                  selectedFilter === 'leads'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Lead
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter('direct')}
                className={`py-1 rounded-lg transition-colors ${
                  selectedFilter === 'direct'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1-1 TPKD
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedFilter('announcements');
                  setSelectedLeadId(null);
                  setSelectedRecipientId(null);
                }}
                className={`py-1 rounded-lg transition-colors ${
                  selectedFilter === 'announcements'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thông báo
              </button>
            </div>

            {/* List of Threads / Leads */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 touch-scroll">
              {selectedFilter === 'leads' || selectedFilter === 'all' ? (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                    <span>Khách hàng có trao đổi ({leadsWithMessages.length})</span>
                    {selectedLeadId && (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadId(null)}
                        className="text-amber-700 hover:underline capitalize"
                      >
                        Bỏ lọc
                      </button>
                    )}
                  </div>

                  {leadsWithMessages.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs">
                      Chưa có trao đổi nào gắn với khách hàng.
                    </div>
                  ) : (
                    leadsWithMessages.map((item) => {
                      const isSelected = selectedLeadId === item.leadId;
                      return (
                        <div
                          key={item.leadId}
                          onClick={() => {
                            setSelectedLeadId(item.leadId);
                            setAttachedLeadId(item.leadId);
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50 border-amber-300 shadow-2xs ring-1 ring-amber-400'
                              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-extrabold text-slate-900 truncate">
                              {item.lead?.fullName || item.lastMessage.leadName || 'Khách hàng'}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-900">
                              {item.count} tin
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.lead?.project || item.lastMessage.leadProject || 'BĐS'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 truncate">
                            <span className="font-bold text-slate-600">{item.lastMessage.senderName}:</span> {item.lastMessage.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              ) : null}

              {/* Direct 1-1 with TPKD / Teammates */}
              {selectedFilter === 'direct' && (
                <>
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Chuyên viên &amp; Trưởng phòng
                  </div>
                  {salesMembers
                    .filter((s) => s.id !== currentUser.id && s.status === 'active')
                    .map((member) => {
                      const isSelected = selectedRecipientId === member.id;
                      return (
                        <div
                          key={member.id}
                          onClick={() => {
                            setSelectedRecipientId(member.id);
                            setSelectedLeadId(null);
                          }}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-amber-50 border-amber-300 shadow-2xs ring-1 ring-amber-400'
                              : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {member.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">{member.name}</div>
                              <div className="text-[10px] text-slate-500 truncate">{member.title || member.role}</div>
                            </div>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold shrink-0 ${
                            member.role === 'admin' ? 'bg-purple-100 text-purple-800' : member.role === 'tpkd' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role === 'admin' ? 'GĐKD' : member.role === 'tpkd' ? 'TPKD' : 'NVKD'}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
            </div>

            {/* Quick Context Footer in Sidebar */}
            <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-600 space-y-1 shrink-0">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>TPKD phụ trách bạn:</span>
              </div>
              <div className="text-amber-900 font-extrabold">{myTpkd?.name || 'Phan Bích Chi'}</div>
              <div className="text-[10px] text-slate-400 font-mono">Email: {myTpkd?.email}</div>
            </div>
          </div>

          {/* RIGHT CHAT AREA */}
          <div className="flex-1 flex flex-col bg-slate-100/60 overflow-hidden">
            
            {/* Active Thread Banner */}
            <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                {selectedLeadId ? (
                  (() => {
                    const l = leads.find((x) => x.id === selectedLeadId);
                    return (
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                            Đang trao đổi về: {l?.fullName || 'Khách hàng'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            Dự án: <strong>{l?.project}</strong> • SĐT: {l?.phone} • Sale: {l?.assignee}
                          </div>
                        </div>
                        {l && onOpenLeadDetail && (
                          <button
                            type="button"
                            onClick={() => onOpenLeadDetail(l)}
                            className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors ml-2"
                            title="Xem chi tiết hồ sơ khách hàng này"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Mở Lead</span>
                          </button>
                        )}
                      </div>
                    );
                  })()
                ) : selectedRecipientId ? (
                  (() => {
                    const r = salesMembers.find((x) => x.id === selectedRecipientId);
                    return (
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                            Trao đổi 1-1 với: {r?.name} ({r?.role === 'tpkd' ? 'TPKD' : 'NVKD'})
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Email: {r?.email} • ĐT: {r?.phone}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Kênh trao đổi chung &amp; Tất cả thảo luận
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Hiển thị toàn bộ trao đổi giữa NVKD, TPKD &amp; Ban Quản trị
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedLeadId && (
                <button
                  type="button"
                  onClick={() => setSelectedLeadId(null)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shrink-0"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 touch-scroll">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3 shadow-2xs">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <p className="font-extrabold text-slate-700 text-sm">Chưa có tin nhắn nào</p>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Gõ tin nhắn bên dưới để bắt đầu trao đổi với Trưởng phòng kinh doanh (TPKD) hoặc đồng nghiệp về khách hàng.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isTpkd = msg.senderRole === 'tpkd';
                  const isAdmin = msg.senderRole === 'admin';

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender Meta */}
                      <div className="flex items-center space-x-1.5 mb-1 px-1 text-[11px]">
                        <span className={`font-bold ${isMe ? 'text-amber-800' : 'text-slate-800'}`}>
                          {isMe ? 'Bạn' : msg.senderName}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold ${
                          isAdmin 
                            ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                            : isTpkd 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isAdmin ? 'GĐKD' : isTpkd ? 'TPKD' : 'NVKD'}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formatTime(msg.createdAt)}
                        </span>

                        {(isMe || currentUser.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-600 transition-opacity ml-1"
                            title="Xóa tin nhắn này"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Bubble */}
                      <div 
                        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-2xs text-xs ${
                          isMe 
                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-xs' 
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        {/* Tagged Customer Reference Card inside Bubble */}
                        {msg.leadId && (
                          <div 
                            onClick={() => {
                              const found = leads.find((l) => l.id === msg.leadId);
                              if (found && onOpenLeadDetail) onOpenLeadDetail(found);
                            }}
                            className={`mb-2 p-2 rounded-xl border text-[11px] cursor-pointer transition-colors ${
                              isMe 
                                ? 'bg-amber-800/40 border-amber-400/40 hover:bg-amber-800/60 text-amber-50' 
                                : 'bg-slate-50 border-slate-200 hover:bg-amber-50 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1 truncate">
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{msg.leadName} ({msg.leadProject || 'BĐS'})</span>
                              </span>
                              <span className="font-mono text-[10px] shrink-0">{msg.leadPhone}</span>
                            </div>
                          </div>
                        )}

                        {/* Urgency Badge */}
                        {msg.urgentLevel && msg.urgentLevel !== 'normal' && (
                          <div className="mb-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black ${
                              msg.urgentLevel === 'urgent'
                                ? 'bg-rose-500 text-white'
                                : msg.urgentLevel === 'deal_approval'
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-amber-400 text-slate-950'
                            }`}>
                              <Flame className="w-3 h-3" />
                              {msg.urgentLevel === 'urgent' ? 'Cần hỗ trợ gấp' : msg.urgentLevel === 'deal_approval' ? 'Duyệt giá / Chiết khấu' : 'Khách VIP'}
                            </span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                        <div className={`flex items-center justify-end space-x-1 mt-1 text-[9px] ${
                          isMe ? 'text-amber-200' : 'text-slate-400'
                        }`}>
                          {isMe && (
                            msg.readBy.length > 1 ? (
                              <span title="Đã xem"><CheckCheck className="w-3 h-3 text-emerald-300" aria-label="Đã xem" /></span>
                            ) : (
                              <span title="Đã gửi"><Check className="w-3 h-3 text-amber-200" aria-label="Đã gửi" /></span>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Action Suggestion Strip */}
            <div className="bg-white border-t border-slate-200 px-3 py-2 shrink-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Gợi ý câu mẫu phản hồi nhanh:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {quickPills.map((pill, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(pill.text);
                      setUrgentLevel(pill.level);
                    }}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 hover:border-amber-300 whitespace-nowrap transition-colors shrink-0"
                  >
                    {pill.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="bg-white border-t border-slate-200 p-3 shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                {/* Select Tagged Lead */}
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="text-[11px] text-slate-500 font-bold shrink-0">Gắn khách:</span>
                  <select
                    value={attachedLeadId}
                    onChange={(e) => setAttachedLeadId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-amber-500 max-w-[200px] truncate"
                  >
                    <option value="">-- Không gắn khách --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName} ({l.project || 'BĐS'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Urgency Selector */}
                <div className="flex items-center space-x-1 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setUrgentLevel('normal')}
                    className={`px-2 py-0.5 rounded-lg border transition-colors ${
                      urgentLevel === 'normal'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Bình thường
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgentLevel('urgent')}
                    className={`px-2 py-0.5 rounded-lg border transition-colors ${
                      urgentLevel === 'urgent'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    🔥 Cần gấp
                  </button>
                  <button
                    type="button"
                    onClick={() => setUrgentLevel('deal_approval')}
                    className={`px-2 py-0.5 rounded-lg border transition-colors ${
                      urgentLevel === 'deal_approval'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    💎 Duyệt giá/CK
                  </button>
                </div>
              </div>

              <div className="flex items-end space-x-2">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập nội dung trao đổi... (Enter để gửi, Shift+Enter xuống dòng)"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="h-[44px] px-5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-40 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
