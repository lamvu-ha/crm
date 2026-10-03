import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  MessageSquare, 
  ShieldCheck, 
  User, 
  AlertCircle, 
  Sparkles, 
  Clock, 
  Flame, 
  Check, 
  CheckCheck,
  Building2,
  Phone,
  HelpCircle,
  Award
} from 'lucide-react';
import { Lead, SalesMember, InternalChatMessage, ChatUrgentLevel } from '../types';
import { 
  fetchInternalMessages, 
  sendInternalMessage, 
  markInternalMessagesAsRead,
  CHAT_UPDATE_EVENT 
} from '../services/internalChatService';
import { getTpkdForMember } from '../data/salesTeamData';

interface LeadInternalChatPanelProps {
  lead: Lead;
  currentUser: SalesMember;
  salesMembers: SalesMember[];
  onShowToast?: (msg: string) => void;
}

export const LeadInternalChatPanel: React.FC<LeadInternalChatPanelProps> = ({
  lead,
  currentUser,
  salesMembers,
  onShowToast
}) => {
  const [messages, setMessages] = useState<InternalChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [urgentLevel, setUrgentLevel] = useState<ChatUrgentLevel>('normal');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Xác định TPKD phụ trách NVKD này
  const tpkdMember = getTpkdForMember(currentUser, salesMembers);

  const loadMessages = async () => {
    const all = await fetchInternalMessages();
    const leadMessages = all.filter((m) => m.leadId === lead.id);
    setMessages(leadMessages);

    // Đánh dấu đã đọc các tin chưa đọc gửi cho mình hoặc liên quan đến khách
    const unreadIds = leadMessages
      .filter((m) => m.senderId !== currentUser.id && !m.readBy.includes(currentUser.id))
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      markInternalMessagesAsRead(unreadIds, currentUser.id);
    }
  };

  useEffect(() => {
    loadMessages();

    const handleChatUpdate = () => {
      loadMessages();
    };

    window.addEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);
    const interval = setInterval(loadMessages, 5000); // Polling every 5s

    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handleChatUpdate);
      clearInterval(interval);
    };
  }, [lead.id, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      // Xác định người nhận mặc định
      let recipient: SalesMember | undefined = undefined;
      if (currentUser.role === 'sale') {
        recipient = tpkdMember || salesMembers.find((s) => s.role === 'tpkd') || undefined;
      } else if (currentUser.role === 'tpkd' || currentUser.role === 'admin') {
        // Nếu TPKD đang nhắn về khách này, gửi cho Sale đang được gán lead
        const assignedSale = salesMembers.find(
          (s) => s.name.toLowerCase().trim() === (lead.assignee || '').toLowerCase().trim()
        );
        recipient = assignedSale || undefined;
      }

      await sendInternalMessage({
        sender: currentUser,
        recipient,
        lead: {
          id: lead.id,
          fullName: lead.fullName,
          phone: lead.phone,
          project: lead.project
        },
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
      console.error('Lỗi gửi tin nhắn:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Mẫu câu gợi ý nhanh cho Sale trao đổi với TPKD
  const quickSuggestions = [
    { label: 'Cần TPKD đi cùng chốt cọc', level: 'urgent' as ChatUrgentLevel },
    { label: 'Xin duyệt chiết khấu đặc biệt', level: 'deal_approval' as ChatUrgentLevel },
    { label: 'Khách hẹn xem dự án cuối tuần', level: 'normal' as ChatUrgentLevel },
    { label: 'Nhờ TPKD check tình trạng căn', level: 'normal' as ChatUrgentLevel },
    { label: 'Khách VIP yêu cầu làm việc với Ban QL', level: 'vip_client' as ChatUrgentLevel }
  ];

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-[520px] bg-slate-50/70 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
      {/* Top Context Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-white flex items-center justify-center font-bold shadow-2xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Trao đổi nội bộ: {lead.fullName}
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                {lead.project || 'BĐS Trung Tâm'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
              <span>NVKD phụ trách: <strong>{lead.assignee || 'Chưa gán'}</strong></span>
              <span>•</span>
              <span>TPKD hỗ trợ: <strong>{tpkdMember?.name || 'Quản trị thử nghiệm'}</strong></span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Kênh trao đổi riêng khách này
          </span>
        </div>
      </div>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 touch-scroll">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-3 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="font-extrabold text-slate-700 text-sm">Chưa có tin nhắn trao đổi về khách này</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              NVKD và Trưởng phòng kinh doanh (TPKD) có thể nhắn tin trực tiếp tại đây để xin ý kiến, nhờ hỗ trợ đi gặp khách, hoặc duyệt phương án giá/chiết khấu.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isTpkd = msg.senderRole === 'tpkd';
            const isAdmin = msg.senderRole === 'admin';

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Sender Title */}
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
                    {isAdmin ? 'GĐKD/Admin' : isTpkd ? 'TPKD' : 'NVKD'}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div 
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs ${
                    isMe 
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-xs' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {/* Urgency Badge if any */}
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

      {/* Quick Action Suggestion Pills */}
      <div className="bg-white border-t border-slate-100 px-3 py-2 shrink-0">
        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Gợi ý trao đổi nhanh:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {quickSuggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(s.label);
                setUrgentLevel(s.level);
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-amber-50 hover:text-amber-900 border border-slate-200 hover:border-amber-300 whitespace-nowrap transition-colors shrink-0"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="bg-white border-t border-slate-200 p-2.5 sm:p-3 shrink-0">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-[11px] text-slate-500 font-bold">Mức độ ưu tiên:</span>
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
            placeholder={
              currentUser.role === 'sale'
                ? `Nhắn cho TPKD ${tpkdMember?.name || ''} về khách ${lead.fullName}... (Enter để gửi)`
                : `Nhắn phản hồi cho chuyên viên ${lead.assignee || ''}... (Enter để gửi)`
            }
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="h-[44px] px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-extrabold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </div>
      </form>
    </div>
  );
};
