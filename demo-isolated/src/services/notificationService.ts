import { SalesMember, Lead } from '../types';
import { sendEmailViaGmail, getAccessToken } from './googleSheetsService';

export interface AppNotification {
  id: string;
  timestamp: string;
  type: 'lead_upload' | 'lead_assigned' | 'sla_warning' | 'appointment_reminder';
  title: string;
  message: string;
  targetMemberEmail?: string;
  targetMemberName?: string;
  leadCount?: number;
  leadNames?: string[];
  read: boolean;
}

export const STORAGE_KEY_NOTIFICATIONS = 'crm_bds_notifications_v1';

/**
 * Open Google Search in a new browser tab for a phone number
 * Helps sales quickly identify who the customer is, their business, social profiles, Zalo name, etc.
 */
export function openGooglePhoneSearch(phone: string): void {
  if (!phone) return;
  const rawDigits = phone.replace(/[^0-9+]/g, '');
  // Format query: phone with quotes for exact matching + common Vietnamese keywords
  // e.g. "0903128456" OR "0903 128 456"
  const encodedQuery = encodeURIComponent(`"${rawDigits}"`);
  const googleSearchUrl = `https://www.google.com/search?q=${encodedQuery}`;
  window.open(googleSearchUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Create notification records in localStorage
 */
export function saveNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification {
  const newNotif: AppNotification = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    read: false
  };

  try {
    const existingStr = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const existing: AppNotification[] = existingStr ? JSON.parse(existingStr) : [];
    const updated = [newNotif, ...existing].slice(0, 50); // Keep max 50 recent notifications
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save notification', e);
  }

  return newNotif;
}

export function getNotifications(): AppNotification[] {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    return [];
  }
}

export function markNotificationAsRead(id: string): void {
  try {
    const list = getNotifications();
    const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to mark read', e);
  }
}

export function markAllNotificationsAsRead(): void {
  try {
    const list = getNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to mark all read', e);
  }
}

/**
 * Notify sales members when new leads are uploaded to the system
 * 1. Generates in-app notification records for each affected sale
 * 2. Attempts to send an instant alert email via Gmail API if user is authenticated with Google
 */
export async function notifySalesOnLeadUpload(params: {
  uploadedLeads: Lead[];
  salesMembers: SalesMember[];
  uploaderName: string;
  sourceDescription: string;
}): Promise<{
  notifiedSalesCount: number;
  emailsSentCount: number;
  inAppCount: number;
}> {
  const { uploadedLeads, salesMembers, uploaderName, sourceDescription } = params;
  if (!uploadedLeads || uploadedLeads.length === 0) {
    return { notifiedSalesCount: 0, emailsSentCount: 0, inAppCount: 0 };
  }

  // Group leads by assignee
  const leadsByAssignee = new Map<string, Lead[]>();
  for (const lead of uploadedLeads) {
    const assigneeName = lead.assignee || 'Chưa gán';
    if (!leadsByAssignee.has(assigneeName)) {
      leadsByAssignee.set(assigneeName, []);
    }
    leadsByAssignee.get(assigneeName)!.push(lead);
  }

  let emailsSent = 0;
  let inAppCount = 0;
  const notifiedMembersSet = new Set<string>();
  const appUrl = window.location.origin;
  const isGoogleAuthed = !!getAccessToken();

  for (const [assigneeName, leadsForSale] of leadsByAssignee.entries()) {
    // Find matching sales member
    const member = salesMembers.find(
      s => s.name.trim().toLowerCase() === assigneeName.trim().toLowerCase()
    );

    const leadCount = leadsForSale.length;
    const leadNames = leadsForSale.map(l => `${l.fullName} (${l.phone})`);

    // 1. In-app notification
    saveNotification({
      type: 'lead_upload',
      title: `⚡ Khách hàng mới vừa được nạp vào hệ thống (${leadCount} khách)`,
      message: `${uploaderName} vừa nạp ${leadCount} khách từ "${sourceDescription}". Vui lòng kiểm tra và tiếp nhận sớm!`,
      targetMemberEmail: member?.email,
      targetMemberName: member?.name || assigneeName,
      leadCount,
      leadNames
    });
    inAppCount++;
    if (member) notifiedMembersSet.add(member.id);

    // 2. Email alert if Google is authenticated & member has valid email
    if (isGoogleAuthed && member?.email && member.email.includes('@')) {
      try {
        const emailSubject = `[SALEPRO HCM_E05] 🔔 THÔNG BÁO: BẠN CÓ ${leadCount} KHÁCH HÀNG MỚI ĐƯỢC PHÂN BỔ`;
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: linear-gradient(135deg, #1e293b, #0f172a); padding: 24px; color: #ffffff; }
    .badge { display: inline-block; background: #f59e0b; color: #000; font-weight: bold; font-size: 11px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; text-transform: uppercase; }
    .content { padding: 24px; line-height: 1.6; }
    .lead-box { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 16px 0; border-left: 4px solid #d97706; }
    .lead-item { padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 13px; }
    .lead-item:last-child { border-bottom: none; }
    .btn { display: inline-block; background: #d97706; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 10px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">SALEPRO HCM_E05 ALERT</span>
      <h2 style="margin: 0; font-size: 20px;">⚡ Bạn có ${leadCount} khách hàng mới</h2>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Người nạp: ${uploaderName} • Nguồn: ${sourceDescription}</p>
    </div>
    <div class="content">
      <p>Xin chào <strong>${member.name}</strong>,</p>
      <p>Hệ thống SALEPRO HCM_E05 vừa tải lên và phân bổ <strong>${leadCount} khách hàng tiềm năng</strong> cho bạn. Vui lòng đăng nhập hệ thống ngay để <strong>Tiếp nhận khách</strong> và thực hiện liên hệ chăm sóc đúng hạn SLA!</p>
      
      <div class="lead-box">
        <strong style="color: #0f172a; font-size: 13px;">Danh sách khách hàng nhận được:</strong>
        <div style="margin-top: 8px;">
          ${leadsForSale.slice(0, 10).map((l, idx) => `
            <div class="lead-item">
              <strong>${idx + 1}. ${l.fullName}</strong> - SĐT: ${l.phone} (${l.project || 'Dự án trung tâm'})
            </div>
          `).join('')}
          ${leadsForSale.length > 10 ? `<div class="lead-item" style="color: #64748b;">... và ${leadsForSale.length - 10} khách hàng khác</div>` : ''}
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${appUrl}" class="btn">🚀 Đăng Nhập CRM Để Nhận Khách Ngay</a>
      </div>

      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        * Nhắc nhở quy chế SLA: Vui lòng bấm "Tiếp nhận" trong vòng 60 phút để không bị hệ thống tự động thu hồi chuyển cho chuyên viên khác.
      </p>
    </div>
  </div>
</body>
</html>
        `.trim();

        await sendEmailViaGmail(member.email, emailSubject, emailHtml);
        emailsSent++;
      } catch (err) {
        console.warn(`Could not send email alert to ${member.email}:`, err);
      }
    }
  }

  return {
    notifiedSalesCount: notifiedMembersSet.size,
    emailsSentCount: emailsSent,
    inAppCount
  };
}
