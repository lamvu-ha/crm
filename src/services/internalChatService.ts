import { InternalChatMessage, ChatUrgentLevel, SalesMember } from '../types';

const STORAGE_KEY_CHAT = 'crm_internal_chat_messages_v1';
export const CHAT_UPDATE_EVENT = 'crm-internal-chat-update';

// Tin nhắn mẫu chân thực khởi tạo ban đầu giữa TPKD và NVKD
const SEED_MESSAGES: InternalChatMessage[] = [
  {
    id: 'msg-seed-1',
    senderId: 'sale-nvkd-khoa',
    senderName: 'Lê Văn Khoa',
    senderRole: 'sale',
    recipientId: 'sale-tpkd-chi',
    recipientName: 'Phan Bích Chi',
    recipientRole: 'tpkd',
    leadId: 'lead-01',
    leadName: 'Nguyễn Hoàng Long',
    leadPhone: '0912345678',
    leadProject: 'Meyhomes Capital Phú Quốc',
    content: 'Chị Chi ơi, khách anh Long quan tâm căn Shophouse trục chính 36m, muốn hẹn chiều thứ 7 xem thực tế và hỏi thêm phương án thanh toán giãn 36 tháng ạ.',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    urgentLevel: 'urgent',
    readBy: ['sale-nvkd-khoa', 'sale-tpkd-chi']
  },
  {
    id: 'msg-seed-2',
    senderId: 'sale-tpkd-chi',
    senderName: 'Phan Bích Chi',
    senderRole: 'tpkd',
    recipientId: 'sale-nvkd-khoa',
    recipientName: 'Lê Văn Khoa',
    recipientRole: 'sale',
    leadId: 'lead-01',
    leadName: 'Nguyễn Hoàng Long',
    leadPhone: '0912345678',
    leadProject: 'Meyhomes Capital Phú Quốc',
    content: 'Khoa chuẩn bị sẵn bảng tính dòng tiền phương án 36 tháng nhé. Chiều thứ 7 lúc 14h30 chị sẽ sắp xếp đi cùng em để hỗ trợ tư vấn và chốt chính sách ưu đãi mở bán!',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    urgentLevel: 'normal',
    readBy: ['sale-tpkd-chi', 'sale-nvkd-khoa']
  },
  {
    id: 'msg-seed-3',
    senderId: 'sale-nvkd-vu',
    senderName: 'Võ Ngọc Vũ',
    senderRole: 'sale',
    recipientId: 'sale-tpkd-chi',
    recipientName: 'Phan Bích Chi',
    recipientRole: 'tpkd',
    leadId: 'lead-02',
    leadName: 'Trần Thị Thuỷ Tiên',
    leadPhone: '0987654321',
    leadProject: 'The Global City',
    content: 'Chị Chi hỗ trợ em kiểm tra căn góc trục nhạc nước The Global City còn hàng không ạ? Khách đang thiện chí muốn cọc 200 triệu trong hôm nay.',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    urgentLevel: 'deal_approval',
    readBy: ['sale-nvkd-vu']
  },
  {
    id: 'msg-seed-4',
    senderId: 'sale-gd-huy',
    senderName: 'Nguyễn Đức Huy',
    senderRole: 'admin',
    content: 'Thông báo toàn thể TPKD & NVKD: Tuần này dự án Meyhomes Capital có chính sách chiết khấu thêm 1.5% cho 5 giao dịch đầu tiên. Các TPKD bám sát hỗ trợ NVKD chốt cọc nhé!',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    urgentLevel: 'vip_client',
    readBy: ['sale-gd-huy']
  }
];

function notifyChatUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHAT_UPDATE_EVENT));
  }
}

/**
 * Lấy danh sách tin nhắn từ server API hoặc localStorage fallback
 */
export async function fetchInternalMessages(): Promise<InternalChatMessage[]> {
  try {
    const res = await fetch('/api/chat/messages');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(data));
        return data;
      }
    }
  } catch {
    // Fallback to localStorage on network disconnect
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_CHAT);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing local chat messages:', e);
  }

  // Khởi tạo hạt giống mặc định
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(SEED_MESSAGES));
  return SEED_MESSAGES;
}

/**
 * Gửi tin nhắn mới
 */
export async function sendInternalMessage(params: {
  sender: SalesMember;
  recipient?: SalesMember;
  lead?: {
    id: string;
    fullName: string;
    phone: string;
    project: string;
  };
  content: string;
  urgentLevel?: ChatUrgentLevel;
}): Promise<InternalChatMessage> {
  const newMsg: InternalChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    senderId: params.sender.id,
    senderName: params.sender.name,
    senderRole: params.sender.role,
    senderAvatar: params.sender.avatar,
    recipientId: params.recipient?.id,
    recipientName: params.recipient?.name,
    recipientRole: params.recipient?.role,
    leadId: params.lead?.id,
    leadName: params.lead?.fullName,
    leadPhone: params.lead?.phone,
    leadProject: params.lead?.project,
    content: params.content.trim(),
    createdAt: new Date().toISOString(),
    urgentLevel: params.urgentLevel || 'normal',
    readBy: [params.sender.id]
  };

  // Cập nhật localStorage ngay lập tức để UI mượt mà không có độ trễ
  let currentMessages: InternalChatMessage[] = [];
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CHAT);
    currentMessages = cached ? JSON.parse(cached) : [...SEED_MESSAGES];
  } catch {
    currentMessages = [...SEED_MESSAGES];
  }

  const updatedMessages = [...currentMessages, newMsg];
  localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(updatedMessages));
  notifyChatUpdate();

  // Đồng bộ lên server API trong nền
  try {
    await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMsg)
    });
  } catch {
    // API request failed, local state still holds
  }

  return newMsg;
}

/**
 * Đánh dấu tin nhắn là đã đọc
 */
export async function markInternalMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
  if (!messageIds || messageIds.length === 0 || !userId) return;

  try {
    const cached = localStorage.getItem(STORAGE_KEY_CHAT);
    const messages: InternalChatMessage[] = cached ? JSON.parse(cached) : [];
    let hasChanged = false;

    const updated = messages.map((m) => {
      if (messageIds.includes(m.id) && !m.readBy.includes(userId)) {
        hasChanged = true;
        return {
          ...m,
          readBy: [...m.readBy, userId]
        };
      }
      return m;
    });

    if (hasChanged) {
      localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(updated));
      notifyChatUpdate();

      // Đồng bộ server API
      fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, userId })
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
}

/**
 * Đếm số tin nhắn chưa đọc cho người dùng hiện tại
 */
export function getUnreadCount(messages: InternalChatMessage[], currentUserId: string): number {
  if (!currentUserId || !Array.isArray(messages)) return 0;
  return messages.filter((m) => {
    // Không tính tin do chính mình gửi
    if (m.senderId === currentUserId) return false;
    // Nếu tin nhắn riêng tư gửi cho người khác
    if (m.recipientId && m.recipientId !== currentUserId) return false;
    // Chưa đọc
    return !m.readBy.includes(currentUserId);
  }).length;
}

/**
 * Lọc tin nhắn liên quan đến một khách hàng cụ thể
 */
export function getMessagesForLead(messages: InternalChatMessage[], leadId: string): InternalChatMessage[] {
  if (!leadId || !Array.isArray(messages)) return [];
  return messages.filter((m) => m.leadId === leadId);
}

/**
 * Xóa tin nhắn
 */
export async function deleteInternalMessage(messageId: string): Promise<void> {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CHAT);
    const messages: InternalChatMessage[] = cached ? JSON.parse(cached) : [];
    const updated = messages.filter((m) => m.id !== messageId);
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(updated));
    notifyChatUpdate();

    fetch(`/api/chat/messages/${messageId}`, {
      method: 'DELETE'
    }).catch(() => {});
  } catch (err) {
    console.error('Error deleting message:', err);
  }
}
