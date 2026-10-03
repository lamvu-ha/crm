import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, writeBatch, setLogLevel } from "firebase/firestore";
import { generateAuthenticCampaignLeads } from "./src/data/campaignLeads";
import authRouter from "./src/backend/routes/authRoutes";
import leadRouter from "./src/backend/routes/leadRoutes";
import userRouter from "./src/backend/routes/userRoutes";
import kpiRouter from "./src/backend/routes/kpiRoutes";
import adminRouter from "./src/backend/routes/adminRoutes";
import { Database } from "./src/backend/db";
import { authenticateToken, optionalAuthenticateToken, requireRole, requireSuperAdmin, requireTeamLeaderOrAdmin } from "./src/backend/middleware";

// Silence harmless Firestore idle stream timeout warnings
try {
  setLogLevel('error');
} catch (e) {}

// Filter out harmless gRPC idle stream cancellation messages in process.stderr
const originalStderrWrite = process.stderr.write.bind(process.stderr);
(process.stderr as any).write = (chunk: any, encoding: any, callback: any) => {
  const str = typeof chunk === 'string' ? chunk : chunk?.toString?.() || '';
  if (str.includes('Disconnecting idle stream') || str.includes('Timed out waiting for new targets')) {
    if (typeof encoding === 'function') encoding();
    else if (typeof callback === 'function') callback();
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

// Isolated demo: no environment file or external credentials loaded.

const DATA_DIR = process.cwd();
if (!fs.existsSync(path.join(DATA_DIR, "DEMO_ONLY"))) throw new Error("Run this server only from demo-isolated.");
const SALES_FILE = path.join(DATA_DIR, "sales_members.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const SETTINGS_FILE = path.join(DATA_DIR, "crm_settings.json");
const CHAT_FILE = path.join(DATA_DIR, "chat_messages.json");
const SYSTEM_LOGS_FILE = path.join(DATA_DIR, "system_logs.json");
const ZALO_TEMPLATES_FILE = path.join(DATA_DIR, "zalo_templates.json");

const DEFAULT_SERVER_ZALO_TEMPLATES = [
  {
    id: 'zalo-tpl-hx-1',
    title: 'Xác nhận lịch hẹn xem thực tế & chuẩn bị đón',
    category: 'lich_hen',
    scenario: 'hen_xem',
    scenarioLabel: 'Khách hẹn xem',
    targetStatus: 'Hẹn xem BĐS',
    tags: ['Hẹn xem', 'Khảo sát thực tế', 'Xác nhận'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép xác nhận lại lịch hẹn mình đi khảo sát thực tế phân khúc {san_pham} vào {thoi_gian_hen}. Em đã chuẩn bị sẵn xe công ty, tài liệu quy hoạch và giỏ hàng đẹp đón anh/chị. Anh/chị xem thời gian trên có thuận tiện không để em giữ lịch chu đáo nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-hx-2',
    title: 'Nhắc hẹn trước giờ khởi hành (trước 2 tiếng)',
    category: 'lich_hen',
    scenario: 'hen_xem',
    scenarioLabel: 'Khách hẹn xem',
    targetStatus: 'Hẹn xem BĐS',
    tags: ['Nhắc hẹn', 'Trước giờ G', 'Định vị'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} xin phép nhắn nhắc nhẹ lịch hẹn mình đi xem thực tế dự án {du_an} lúc {thoi_gian_hen} hôm nay ạ. Em gửi anh/chị định vị vị trí điểm đón tại {dia_diem}. Em sẽ có mặt trước 15 phút đón anh/chị. Nếu có bất kỳ thay đổi nào anh/chị nhắn em ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-qt-1',
    title: 'Gửi trọn bộ pháp lý & Bảng giá cập nhật đợt 1',
    category: 'du_an',
    scenario: 'quan_tam_du_an',
    scenarioLabel: 'Khách quan tâm dự án',
    targetStatus: 'Quan tâm',
    tags: ['Bảng giá', 'Pháp lý', 'Chính sách'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép gửi anh/chị trọn bộ tài liệu: (1) Mặt bằng thiết kế chi tiết từng căn {san_pham}, (2) Bảng giá cập nhật và tiến độ thanh toán đợt này, (3) Chính sách chiết khấu trực tiếp và hỗ trợ vay 0% lãi suất. Anh/chị xem qua có điểm nào cần giải đáp thêm em hỗ trợ ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-qt-2',
    title: 'Giới thiệu 2 căn góc đẹp nhất giỏ hàng - Đúng tầm tài chính',
    category: 'doc_quyen',
    scenario: 'quan_tam_du_an',
    scenarioLabel: 'Khách quan tâm dự án',
    targetStatus: 'Quan tâm',
    tags: ['Căn góc', 'Đúng ngân sách', 'Độc quyền'],
    content: 'Dạ anh/chị {ten_khach} ơi, trong giỏ hàng độc quyền {du_an} phân khúc {san_pham} bên em vừa mở thêm 2 căn vị trí cực đẹp, view thoáng mát và đặc biệt vừa đúng khung tài chính {ngan_sach} của anh/chị. Em gửi sơ đồ căn và video flycam quay thực tế qua Zalo này, anh/chị xem qua nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-km-1',
    title: 'Lời chào kết bạn Zalo & Giới thiệu chuyên viên',
    category: 'chao_hoi',
    scenario: 'khach_moi',
    scenarioLabel: 'Khách mới tiếp nhận',
    targetStatus: 'Khách mới',
    tags: ['Lời chào', 'Kết bạn Zalo', 'Khách mới'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Em thấy anh/chị vừa để lại thông tin quan tâm phân khúc {san_pham}. Em xin phép kết bạn Zalo để gửi anh/chị thông tin chính thức, bảng giá gốc từ chủ đầu tư và hỗ trợ anh/chị nhanh nhất khi cần ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-tn-1',
    title: 'Giải pháp đòn bẩy tài chính & Hỗ trợ vay 0% lãi suất',
    category: 'du_an',
    scenario: 'tiem_nang',
    scenarioLabel: 'Khách tiềm năng / Phân vân tài chính',
    targetStatus: 'Tiềm năng',
    tags: ['Vay ngân hàng', 'Lãi suất 0%', 'Dòng tiền'],
    content: 'Dạ em chào anh/chị {ten_khach}, em {nguoi_phu_trach} đã lập bảng tính chi tiết phương án vay hỗ trợ lãi suất 0% cho căn {san_pham} tại {du_an}. Với tầm tài chính {ngan_sach}, anh/chị chỉ cần thanh toán trước 20-30%, phần còn lại được ân hạn nợ gốc và miễn lãi 18-24 tháng. Em gửi bảng dòng tiền chi tiết qua Zalo anh/chị xem nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-dp-1',
    title: 'Hướng dẫn giữ chỗ ưu tiên & Khóa căn đẹp',
    category: 'doc_quyen',
    scenario: 'dam_phan_coc',
    scenarioLabel: 'Khách đàm phán / Cọc',
    targetStatus: 'Đàm phán / Cọc',
    tags: ['Giữ chỗ', 'Khóa căn', 'Cọc ưu tiên'],
    content: 'Dạ em chào anh/chị {ten_khach}, căn {san_pham} mã đẹp tại {du_an} mà anh/chị đang chọn hiện có thêm 2 khách khác đang hỏi thăm thiện chí. Để đảm bảo giữ đúng căn này với mức giá ưu đãi đợt 1, em xin phép hỗ trợ anh/chị thủ tục đặt cọc thiện chí giữ chỗ. Em gửi thông tin số tài khoản chính thức của công ty ngay sau đây nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-cs-1',
    title: 'Căn độc quyền giá ngộp thiện chí - Tái tương tác',
    category: 'cham_soc_lai',
    scenario: 'cham_soc_lai',
    scenarioLabel: 'Khách chăm sóc lại / Nuôi dưỡng',
    targetStatus: 'Đang chăm sóc',
    tags: ['Căn ngộp', 'Tái tương tác', 'Giá tốt'],
    content: 'Dạ anh/chị {ten_khach} ơi, bên em vừa tiếp nhận 1 căn {san_pham} vị trí đắc địa tại {du_an} đúng tầm tài chính {ngan_sach} của anh/chị, chủ nhà cần xoay vốn nên để lại giá rất thiện chí thấp hơn thị trường 10%. Em gửi hình ảnh thực tế và mặt bằng qua Zalo anh/chị xem ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-knm-1',
    title: 'Nhắn Zalo xin phép sau cuộc gọi nhỡ / máy bận',
    category: 'chao_hoi',
    scenario: 'khong_nghe_may',
    scenarioLabel: 'Khách máy bận / Gọi lại sau',
    targetStatus: 'Không nghe máy',
    tags: ['Cuộc gọi nhỡ', 'Máy bận', 'Lịch hẹn gọi lại'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Vừa nãy em có gọi điện hỗ trợ anh/chị nhưng chắc anh/chị đang bận cuộc họp hoặc di chuyển ngoài đường. Em xin phép gửi thông tin qua Zalo này để anh/chị tiện xem lúc rảnh nhé. Khoảng mấy giờ em có thể liên hệ lại thuận tiện cho anh/chị ạ?',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  }
];

function getStoredZaloTemplates(): any[] {
  if (fs.existsSync(ZALO_TEMPLATES_FILE)) {
    try {
      const data = fs.readFileSync(ZALO_TEMPLATES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      return DEFAULT_SERVER_ZALO_TEMPLATES;
    }
  }
  return DEFAULT_SERVER_ZALO_TEMPLATES;
}

function saveStoredZaloTemplates(templates: any[]): void {
  try {
    fs.writeFileSync(ZALO_TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save zalo templates:", err);
  }
}

function getStoredChatMessages(): any[] {
  if (fs.existsSync(CHAT_FILE)) {
    try {
      const data = fs.readFileSync(CHAT_FILE, "utf-8");
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function saveStoredChatMessages(messages: any[]): void {
  try {
    fs.writeFileSync(CHAT_FILE, JSON.stringify(messages, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save chat messages:", err);
  }
}

function getStoredSystemLogs(): any[] {
  if (fs.existsSync(SYSTEM_LOGS_FILE)) {
    try {
      const data = fs.readFileSync(SYSTEM_LOGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}

function saveStoredSystemLogs(logs: any[]): void {
  try {
    fs.writeFileSync(SYSTEM_LOGS_FILE, JSON.stringify(logs.slice(0, 2000), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save system logs:", err);
  }
}

function appendServerSystemLog(entry: any): void {
  try {
    const current = getStoredSystemLogs();
    const newEntry = {
      id: entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      action: entry.action,
      level: entry.level || (entry.action?.includes('delete') ? 'danger' : entry.action?.includes('fail') ? 'warning' : 'info'),
      actorId: entry.actorId,
      actorName: entry.actorName || 'Hệ thống',
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole || 'system',
      targetType: entry.targetType || 'system',
      targetId: entry.targetId,
      targetName: entry.targetName,
      summary: entry.summary || '',
      details: entry.details || {},
      ip: entry.ip
    };
    current.unshift(newEntry);
    saveStoredSystemLogs(current);
  } catch (e) {
    console.warn("Could not append server system log:", e);
  }
}

// Official sales team members from Google Sheet MAY_TRUONGBV_MH5.19_NVKD_V.1
const SEED_SALES_MEMBERS = [{"id":"sandbox-user-0","name":"Quản trị thử nghiệm","username":"admin","email":"admin@sandbox.invalid","phone":"0000000010","role":"admin","status":"active","password":"Demo@2026!","color":"#2563eb","team":"Nhóm thử nghiệm","teamName":"Nhóm thử nghiệm","mustChangePassword":false,"isOnlineForLead":true,"maxDailyLeads":50},{"id":"sandbox-user-1","name":"Trưởng nhóm thử nghiệm","username":"manager","email":"manager@sandbox.invalid","phone":"0000000011","role":"tpkd","status":"active","password":"Demo@2026!","color":"#2563eb","team":"Nhóm thử nghiệm","teamName":"Nhóm thử nghiệm","mustChangePassword":false,"isOnlineForLead":true,"maxDailyLeads":50},{"id":"sandbox-user-2","name":"Chuyên viên 01","username":"sale01","email":"sale01@sandbox.invalid","phone":"0000000012","role":"sale","status":"active","password":"Demo@2026!","color":"#2563eb","team":"Nhóm thử nghiệm","teamName":"Nhóm thử nghiệm","mustChangePassword":false,"isOnlineForLead":true,"maxDailyLeads":50},{"id":"sandbox-user-3","name":"Chuyên viên 02","username":"sale02","email":"sale02@sandbox.invalid","phone":"0000000013","role":"sale","status":"active","password":"Demo@2026!","color":"#2563eb","team":"Nhóm thử nghiệm","teamName":"Nhóm thử nghiệm","mustChangePassword":false,"isOnlineForLead":true,"maxDailyLeads":50}];

const DEMO_EMAILS_BLACKLIST = new Set([
  'admin@nhaphotrungtam.com.vn',
  'tam.tran@nhaphotrungtam.com.vn',
  'nam.nguyen@nhaphotrungtam.com.vn',
  'truc.le@nhaphotrungtam.com.vn',
  'bao.tran@nhaphotrungtam.com.vn',
  'thu.pham@nhaphotrungtam.com.vn',
  'dang.do@nhaphotrungtam.com.vn',
  'wildennight@gmail.com'
]);

const DEMO_NAMES_BLACKLIST = new Set([
  'trần minh tâm',
  'trần minh tâm (mr. tâm)',
  'nguyễn hoàng nam',
  'lê thanh trúc',
  'trần quốc bảo',
  'phạm minh thư',
  'đỗ hải đăng',
  'vũ tuấn anh',
  'thang huynh'
]);

// Helper for sales members persistence
function getStoredSalesMembers(): any[] {
  try {
    if (fs.existsSync(SALES_FILE)) {
      const content = fs.readFileSync(SALES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const map = new Map<string, any>();
        SEED_SALES_MEMBERS.forEach((m) => map.set(m.email.toLowerCase().trim(), m));
        parsed.forEach((m: any) => {
          if (m && m.email && m.name) {
            const key = m.email.toLowerCase().trim();
            const nameLower = m.name.toLowerCase().trim();
            if (
              DEMO_EMAILS_BLACKLIST.has(key) ||
              key.endsWith('@nhaphotrungtam.com.vn') ||
              DEMO_NAMES_BLACKLIST.has(nameLower)
            ) {
              return;
            }
            const existing = map.get(key);
            map.set(key, existing ? { ...existing, ...m } : m);
          }
        });
        const cleaned = Array.from(map.values());
        saveStoredSalesMembers(cleaned);
        return cleaned;
      }
    }
  } catch (e) {
    console.error("Error reading sales_members.json:", e);
  }
  saveStoredSalesMembers(SEED_SALES_MEMBERS);
  return SEED_SALES_MEMBERS;
}

function saveStoredSalesMembers(members: any[]): void {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(members, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing sales_members.json:", e);
  }
}

// Helper for leads persistence
const DEMO_LEAD_PHONES = new Set([
  '0903128456',
  '0918776234',
  '0972654321',
  '0989332110',
  '0933112233',
  '0908889900',
  '0912345678',
  '0987654321',
  '0945678901',
  '0967890123',
  // Demo Leads MH5.19 (1 to 14)
  '0903889911',
  '0937662244',
  '0909556677',
  '0988771122',
  '0973115599',
  '0908332211',
  '0918443322',
  '0966338811',
  '0932889922',
  '0907119933',
  '0981223344',
  '0915667788'
]);

const DEMO_LEAD_NAMES = new Set([
  'trần văn minh',
  'lê thị thu hương',
  'phạm đức dũng',
  'võ mai anh',
  'hoàng nhật quang',
  'đặng ngọc bích',
  'ngô thanh tùng',
  'bùi phương thảo',
  'dương văn hùng',
  'nguyễn thị cẩm tú',
  // Demo Leads MH5.19 (1 to 14)
  'trịnh hoài nam',
  'hoàng thị cẩm vân',
  'vũ hoàng phúc',
  'đoàn quang khải',
  'nguyễn thị tuyết mai',
  'ngô thanh huyền',
  'bùi đức trọng',
  'lâm bích ngọc',
  'trần hữu nghĩa',
  'phạm gia bảo',
  'đỗ mai linh',
  'hà quốc việt',
  'đặng thu trang',
  'phan hoàng yến'
]);

function isDemoLead(lead: any): boolean {
  if (!lead) return false;
  const id = String(lead.id || '').toLowerCase().trim();
  if (/^lead-0[1-9]$|^lead-1[0-9]$|^lead-mh5-(0[1-9]|1[0-4])$/.test(id)) return true;
  const phone = String(lead.phone || '').trim();
  if (DEMO_LEAD_PHONES.has(phone)) return true;
  const name = String(lead.fullName || '').toLowerCase().trim();
  if (DEMO_LEAD_NAMES.has(name)) return true;
  if (name.includes('demo') || name.includes('mẫu') || name.includes('khách mẫu')) return true;
  const src = String(lead.dataSource || '').toLowerCase();
  if (src.includes('demo') || src.includes('mẫu')) return true;
  return false;
}

// The isolated demo never initializes a cloud database.
const firestoreDb: any = null;

// Background sync from Firestore to local cache on startup
async function syncFirestoreToLocal(): Promise<void> {
  if (!firestoreDb) return;
  try {
    const snap = await getDocs(collection(firestoreDb, "leads"));
    if (snap.size > 0) {
      const firestoreLeads: any[] = [];
      snap.forEach((d) => {
        const item = d.data();
        if (item && !isDemoLead(item)) {
          firestoreLeads.push(item);
        }
      });
      if (firestoreLeads.length > 0) {
        let localLeads: any[] = [];
        try {
          if (fs.existsSync(LEADS_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8"));
            if (Array.isArray(parsed)) localLeads = parsed;
          }
        } catch (_) {}

        // If local leads.json is empty, restore from Firestore
        if (localLeads.length === 0) {
          firestoreLeads.sort((a, b) => (a.stt || 0) - (b.stt || 0));
          fs.writeFileSync(LEADS_FILE, JSON.stringify(firestoreLeads, null, 2), "utf-8");
          console.log(`[Firestore Sync] Initialized ${firestoreLeads.length} leads from Firestore.`);
          return;
        }

        // Smart merge: only update local lead if Firestore lead has a strictly NEWER updatedAt!
        const localMap = new Map<string, any>();
        localLeads.forEach((l) => {
          if (l.id) localMap.set(l.id, l);
        });

        let updatedCount = 0;
        firestoreLeads.forEach((fLead) => {
          if (!fLead || !fLead.id) return;
          const local = localMap.get(fLead.id);
          if (!local) {
            localMap.set(fLead.id, fLead);
            updatedCount++;
          } else {
            const fTime = fLead.updatedAt ? new Date(fLead.updatedAt).getTime() : 0;
            const lTime = local.updatedAt ? new Date(local.updatedAt).getTime() : 0;
            if (fTime > lTime) {
              localMap.set(fLead.id, { ...local, ...fLead });
              updatedCount++;
            }
          }
        });

        if (updatedCount > 0) {
          const merged = Array.from(localMap.values()).sort((a, b) => (a.stt || 0) - (b.stt || 0));
          fs.writeFileSync(LEADS_FILE, JSON.stringify(merged, null, 2), "utf-8");
          console.log(`[Firestore Sync] Smart merged ${updatedCount} newer updates from Firestore into local storage.`);
        }
      }
    }
  } catch (err: any) {
    console.warn("[Firestore Sync] Error during startup sync from Firestore:", err?.message || err);
  }
}

// Trigger initial sync non-blocking
syncFirestoreToLocal().catch(() => {});

function getStoredLeads(): any[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const content = fs.readFileSync(LEADS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = parsed.filter((l) => !isDemoLead(l));
        if (cleaned.length > 0) {
          if (cleaned.length !== parsed.length) {
            saveStoredLeads(cleaned);
          }
          return cleaned;
        }
      }
    }
  } catch (e) {
    console.error("Error reading leads.json:", e);
  }
  return [];
}

// Circuit breaker to halt Firestore write attempts when daily quota is exhausted
const FIRESTORE_QUOTA_PATHS = [
  path.join(DATA_DIR, "data", "firestore_quota.json"),
  path.join(DATA_DIR, "firestore_quota.json"),


];

function loadFirestoreQuotaState(): boolean {
  for (const qPath of FIRESTORE_QUOTA_PATHS) {
    try {
      if (fs.existsSync(qPath)) {
        const data = JSON.parse(fs.readFileSync(qPath, "utf-8"));
        if (data && data.isExhausted) {
          const retryAfter = data.retryAfter ? new Date(data.retryAfter).getTime() : 0;
          if (!retryAfter || Date.now() < retryAfter) {
            return true;
          }
        }
      }
    } catch (e) {}
  }
  return true; // Default to true when quota was reached to guarantee zero gRPC write crashes
}

function saveFirestoreQuotaState(exhausted: boolean, reason?: string) {
  const data = {
    isExhausted: exhausted,
    reason: reason || "Free daily write units per project (free tier database) exceeded for consumer project_number:427663724712",
    exhaustedAt: new Date().toISOString(),
    retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
  for (const qPath of FIRESTORE_QUOTA_PATHS) {
    try {
      const parentDir = path.dirname(qPath);
      if (fs.existsSync(parentDir)) {
        fs.writeFileSync(qPath, JSON.stringify(data, null, 2), "utf-8");
      }
    } catch (e) {}
  }
}

let isServerFirestoreQuotaExhausted = loadFirestoreQuotaState();
let serverQuotaExhaustedUntil = Date.now() + 24 * 60 * 60 * 1000;

if (isServerFirestoreQuotaExhausted) {
  console.log("[DEMO] Cloud disabled. Synthetic data stored only in demo-isolated.");
}

function isServerQuotaExhausted(): boolean {
  if (isServerFirestoreQuotaExhausted) {
    if (Date.now() < serverQuotaExhaustedUntil) {
      return true;
    }
    if (loadFirestoreQuotaState()) {
      return true;
    }
    isServerFirestoreQuotaExhausted = false;
    return false;
  }
  return false;
}

function markServerQuotaExhausted(reason?: string) {
  if (!isServerFirestoreQuotaExhausted) {
    console.warn("[Firestore Database] Free tier daily write quota limit reached. Server Circuit Breaker ACTIVATED: all data is safely and persistently stored on server disk (leads.json).");
  }
  isServerFirestoreQuotaExhausted = true;
  serverQuotaExhaustedUntil = Date.now() + 24 * 60 * 60 * 1000;
  saveFirestoreQuotaState(true, reason);
}

function isQuotaError(err: any): boolean {
  const msg = String(err?.message || err?.code || err || '');
  return msg.includes('resource-exhausted') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded');
}

async function persistSingleLeadToFirestore(lead: any): Promise<void> {
  if (!firestoreDb || !lead || !lead.id || isDemoLead(lead)) return;
  if (isServerQuotaExhausted()) return;
  try {
    const docRef = doc(firestoreDb, "leads", lead.id);
    await setDoc(docRef, { ...lead, updatedAt: lead.updatedAt || new Date().toISOString() }, { merge: true });
  } catch (e: any) {
    if (isQuotaError(e)) {
      markServerQuotaExhausted();
    } else {
      console.warn("[Firestore Database] Warning syncing single lead to Firestore:", e?.message);
    }
  }
}

async function persistLeadsToFirestore(leads: any[]): Promise<void> {
  if (!firestoreDb) return;
  if (isServerQuotaExhausted()) return;
  try {
    const clean = leads.filter((l) => !isDemoLead(l));
    const chunkSize = 400;
    for (let i = 0; i < clean.length; i += chunkSize) {
      const chunk = clean.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((lead) => {
        const id = lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const docRef = doc(firestoreDb, "leads", id);
        batch.set(docRef, { ...lead, id, updatedAt: lead.updatedAt || new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
  } catch (e: any) {
    if (isQuotaError(e)) {
      markServerQuotaExhausted();
    } else {
      console.warn("[Firestore Database] Error syncing batch to Firestore:", e?.message || e);
    }
  }
}

async function deleteLeadFromFirestore(leadId: string): Promise<void> {
  if (!firestoreDb || !leadId) return;
  if (isServerQuotaExhausted()) return;
  try {
    await deleteDoc(doc(firestoreDb, "leads", leadId));
  } catch (e: any) {
    if (isQuotaError(e)) {
      markServerQuotaExhausted();
    } else {
      console.warn("[Firestore Database] Error deleting lead from Firestore:", e);
    }
  }
}

async function deleteBulkLeadsFromFirestore(leadIds: string[]): Promise<void> {
  if (!firestoreDb || !leadIds || leadIds.length === 0) return;
  if (isServerQuotaExhausted()) return;
  try {
    const chunkSize = 400;
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      const chunk = leadIds.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((id) => {
        batch.delete(doc(firestoreDb, "leads", id));
      });
      await batch.commit();
    }
  } catch (e: any) {
    if (isQuotaError(e)) {
      markServerQuotaExhausted();
    } else {
      console.warn("[Firestore Database] Error bulk deleting from Firestore:", e);
    }
  }
}

function saveStoredLeads(leads: any[]): void {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing leads.json:", e);
  }
  // Asynchronously persist to Firestore in background
  persistLeadsToFirestore(leads).catch(() => {});
}

// Helper for CRM settings
function getStoredSettings(): any {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error reading crm_settings.json:", e);
  }
  return {
    lastSyncAt: new Date().toISOString(),
    databaseEngine: "Express Node.js Backend + Firestore Database",
    googleSheets: {
      nvkd: "MAY_TRUONGBV_MH5.19_NVKD_V.1",
      crm: "MAY_TRUONGBV_MH5.19_CRM_V.1"
    }
  };
}

function saveStoredSettings(settings: any): void {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing crm_settings.json:", e);
  }
}

function fallbackNormalizeText(text: string): { corrected: string; changes: string[] } {
  let res = text.trim();
  const W_LEFT = "(?<![a-zA-Z\\u00C0-\\u024F\\u1EA0-\\u1EF9])";
  const W_RIGHT = "(?![a-zA-Z\\u00C0-\\u024F\\u1EA0-\\u1EF9])";

  const rules = [
    { pattern: new RegExp(`${W_LEFT}(khách|khach|kh)\\s+(đ|dang|đang)\\s+bận${W_RIGHT}`, "gi"), replacement: 'Khách hàng đang bận' },
    { pattern: new RegExp(`${W_LEFT}đ\\s+bận${W_RIGHT}`, "gi"), replacement: 'đang bận' },
    { pattern: new RegExp(`${W_LEFT}kh\\s+hang${W_RIGHT}`, "gi"), replacement: 'khách hàng' },
    { pattern: new RegExp(`${W_LEFT}kh${W_RIGHT}`, "gi"), replacement: 'khách hàng' },
    { pattern: new RegExp(`${W_LEFT}k\\s+(nghe|bắt|bat)\\s+(máy|may)${W_RIGHT}`, "gi"), replacement: 'không nghe máy' },
    { pattern: new RegExp(`${W_LEFT}(dt|sđt)${W_RIGHT}`, "gi"), replacement: 'điện thoại' },
    { pattern: new RegExp(`${W_LEFT}(k|ko|kg)${W_RIGHT}`, "gi"), replacement: 'không' },
    { pattern: new RegExp(`${W_LEFT}đ${W_RIGHT}`, "gi"), replacement: 'đang' },
    { pattern: new RegExp(`${W_LEFT}ty${W_RIGHT}`, "gi"), replacement: 'tỷ' },
    { pattern: new RegExp(`${W_LEFT}tr${W_RIGHT}`, "gi"), replacement: 'triệu' },
    { pattern: new RegExp(`${W_LEFT}2pn${W_RIGHT}`, "gi"), replacement: '2 phòng ngủ' },
    { pattern: new RegExp(`${W_LEFT}3pn${W_RIGHT}`, "gi"), replacement: '3 phòng ngủ' },
    { pattern: new RegExp(`${W_LEFT}1pn${W_RIGHT}`, "gi"), replacement: '1 phòng ngủ' },
    { pattern: new RegExp(`${W_LEFT}(bđs|bds)${W_RIGHT}`, "gi"), replacement: 'bất động sản' },
    { pattern: new RegExp(`${W_LEFT}chot\\s+coc${W_RIGHT}`, "gi"), replacement: 'đã chốt cọc' },
    { pattern: new RegExp(`${W_LEFT}da\\s+nhan\\s+tin\\s+zalo${W_RIGHT}`, "gi"), replacement: 'đã nhắn tin qua Zalo' },
    { pattern: new RegExp(`${W_LEFT}q1${W_RIGHT}`, "gi"), replacement: 'Quận 1' },
    { pattern: new RegExp(`${W_LEFT}q3${W_RIGHT}`, "gi"), replacement: 'Quận 3' },
    { pattern: new RegExp(`${W_LEFT}q7${W_RIGHT}`, "gi"), replacement: 'Quận 7' },
    { pattern: new RegExp(`${W_LEFT}q10${W_RIGHT}`, "gi"), replacement: 'Quận 10' },
    { pattern: new RegExp(`${W_LEFT}bt${W_RIGHT}`, "gi"), replacement: 'Bình Thạnh' },
    { pattern: new RegExp(`${W_LEFT}pn${W_RIGHT}`, "gi"), replacement: 'Phú Nhuận' },
  ];

  for (const r of rules) {
    res = res.replace(r.pattern, r.replacement);
  }
  if (res.length > 0) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
  }
  if (res.length > 4 && !/[.!?]$/.test(res)) {
    res += '.';
  }
  return {
    corrected: res,
    changes: res !== text ? [`Chuẩn hóa từ viết tắt BĐS`] : [],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3001;
  app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws://127.0.0.1:24679 ws://localhost:24679; frame-src 'none'; form-action 'self'; base-uri 'self'");
    next();
  });

  // Universal Cross-Browser & Cross-Device Middleware
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma");
    
    // Prevent iOS Safari and Mobile WebViews from aggressively caching dynamic API endpoints
    if (req.path.startsWith('/api')) {
      res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.header("Pragma", "no-cache");
      res.header("Expires", "0");
      res.header("X-Content-Type-Options", "nosniff");
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use((req, res, next) => {
    if (/^\/(api\/download|crm_mayhomes_php_hosting|database\.sql)/.test(req.path)) return res.status(403).json({error:"Downloads disabled in isolated demo"});
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Graceful JSON syntax error handler (prevent server crash on malformed client requests)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ", details: err.message });
    }
    next(err);
  });

  // No external AI client in the isolated demo.
  function getGeminiClient(): GoogleGenAI | null {
    return null;
  }

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      databaseEngine: "Isolated demo JSON files",
      geminiConfigured: false,
      demo: true
    });
  });

  // ==========================================
  // CORE CRM & RBAC ENGINE (STEP 2 & 3 IMPLEMENTATION)
  // ==========================================
  app.use("/api/auth", authRouter);
  app.use("/api/leads", leadRouter);
  app.use("/api/users", userRouter);
  app.use("/api/kpi", kpiRouter);
  app.use("/api/admin", adminRouter);

  // ==========================================
  // LEADS ENDPOINTS
  // ==========================================

  // Get all leads
  app.get("/api/leads", (_req, res) => {
    try {
      const leads = getStoredLeads();
      res.json(leads);
    } catch (e: any) {
      res.status(500).json({ error: "Không thể tải danh sách khách hàng", details: e?.message });
    }
  });

  // Save / Sync leads (single or full list)
  app.post("/api/leads", (req, res) => {
    try {
      const incoming = req.body;
      const isMergeMode = req.query.mode === 'merge';

      if (Array.isArray(incoming)) {
        if (isMergeMode) {
          const currentLeads = getStoredLeads();
          const currentMap = new Map<string, any>();
          currentLeads.forEach((l) => {
            if (l.phone) currentMap.set(l.phone.trim(), l);
            if (l.id) currentMap.set(l.id, l);
          });

          incoming.forEach((lead) => {
            if (!lead || isDemoLead(lead)) return;
            const key = (lead.phone || '').trim();
            const existing = (key && currentMap.get(key)) || (lead.id && currentMap.get(lead.id));
            const merged = existing ? { ...existing, ...lead, updatedAt: new Date().toISOString() } : {
              ...lead,
              id: lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              createdAt: lead.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            if (key) currentMap.set(key, merged);
            if (merged.id) currentMap.set(merged.id, merged);
          });

          const uniqueMap = new Map<string, any>();
          currentMap.forEach((val) => {
            if (val && val.id && !isDemoLead(val)) {
              uniqueMap.set(val.id, val);
            }
          });

          const updated = Array.from(uniqueMap.values());
          saveStoredLeads(updated);

          const settings = getStoredSettings();
          settings.lastSyncAt = new Date().toISOString();
          settings.totalLeads = updated.length;
          saveStoredSettings(settings);

          return res.json({ success: true, count: updated.length, leads: updated });
        } else {
          // Direct replace / save current state (prevents deleted leads from coming back!)
          const cleanList = incoming
            .filter((l) => l && !isDemoLead(l))
            .map((lead) => ({
              ...lead,
              id: lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              updatedAt: new Date().toISOString()
            }));

          saveStoredLeads(cleanList);

          const settings = getStoredSettings();
          settings.lastSyncAt = new Date().toISOString();
          settings.totalLeads = cleanList.length;
          saveStoredSettings(settings);

          return res.json({ success: true, count: cleanList.length, leads: cleanList });
        }
      } else if (incoming && typeof incoming === 'object') {
        // Single lead upsert
        if (isDemoLead(incoming)) {
          return res.status(400).json({ error: "Không được phép lưu khách hàng demo" });
        }
        const currentLeads = getStoredLeads();
        const index = currentLeads.findIndex((l) => l.id === incoming.id || (incoming.phone && l.phone === incoming.phone));
        if (index >= 0) {
          currentLeads[index] = { ...currentLeads[index], ...incoming, updatedAt: new Date().toISOString() };
        } else {
          currentLeads.push({
            ...incoming,
            id: incoming.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            createdAt: incoming.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        saveStoredLeads(currentLeads);
        return res.json({ success: true, count: currentLeads.length, leads: currentLeads });
      } else {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
      }
    } catch (e: any) {
      console.error("Error saving leads:", e);
      res.status(500).json({ error: "Không thể lưu danh sách khách hàng", details: e?.message });
    }
  });

  // Update a single lead
  app.put("/api/leads/:id", (req, res) => {
    try {
      const leadId = req.params.id;
      const updates = req.body;
      const leads = getStoredLeads();
      const index = leads.findIndex((l) => l.id === leadId);

      if (index === -1) {
        return res.status(404).json({ error: "Không tìm thấy khách hàng" });
      }

      leads[index] = {
        ...leads[index],
        ...updates,
        updatedAt: updates.updatedAt || new Date().toISOString()
      };

      try {
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
      } catch (e) {
        console.error("Error writing leads.json:", e);
      }
      persistSingleLeadToFirestore(leads[index]).catch(() => {});

      res.json({ success: true, lead: leads[index] });
    } catch (e: any) {
      res.status(500).json({ error: "Không thể cập nhật khách hàng", details: e?.message });
    }
  });

  // Fast & dedicated status update endpoint for sales/lead table
  app.patch("/api/leads/:id/status", (req, res) => {
    try {
      const leadId = req.params.id;
      const { status, author, history } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Thiếu thông tin trạng thái mới" });
      }

      const leads = getStoredLeads();
      const index = leads.findIndex((l) => l.id === leadId || (l.id && String(l.id).trim() === String(leadId).trim()));
      if (index === -1) {
        console.warn(`[Status Update 404] Cannot find lead with id: "${leadId}". Available sample IDs:`, leads.slice(0, 3).map(l => l.id));
        return res.status(404).json({ error: "Không tìm thấy khách hàng", leadId, storedCount: leads.length });
      }

      const nowIso = new Date().toISOString();
      const oldStatus = leads[index].status;
      let newHistory = leads[index].history || [];
      if (Array.isArray(history)) {
        newHistory = history;
      } else {
        newHistory = [
          {
            id: `log-${Date.now()}`,
            date: nowIso.replace('T', ' ').slice(0, 16),
            type: 'Ghi chú nội bộ',
            content: `Chuyển trạng thái từ "${oldStatus}" sang "${status}"`,
            author: author || leads[index].assignee
          },
          ...newHistory
        ];
      }

      leads[index] = {
        ...leads[index],
        status,
        history: newHistory,
        updatedAt: nowIso
      };

      try {
        fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
      } catch (e) {
        console.error("Error writing leads.json:", e);
      }
      persistSingleLeadToFirestore(leads[index]).catch(() => {});

      console.log(`[Status Update] Lead ${leadId} status updated: "${oldStatus}" -> "${status}" by ${author || 'user'}`);
      res.json({ success: true, lead: leads[index] });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi cập nhật trạng thái", details: e?.message });
    }
  });

  // Delete a single lead
  app.delete("/api/leads/:id", (req, res) => {
    try {
      const leadId = req.params.id;
      const leads = getStoredLeads();
      const filtered = leads.filter((l) => l.id !== leadId);
      saveStoredLeads(filtered);
      deleteLeadFromFirestore(leadId).catch(() => {});
      res.json({ success: true, count: filtered.length });
    } catch (e: any) {
      res.status(500).json({ error: "Không thể xóa khách hàng", details: e?.message });
    }
  });

  // Bulk delete leads
  app.post("/api/leads/bulk-delete", (req, res) => {
    try {
      const { ids = [] } = req.body || {};
      const idSet = new Set<string>(Array.isArray(ids) ? ids : [ids]);
      const leads = getStoredLeads();
      const filtered = leads.filter((l) => !idSet.has(l.id) && !isDemoLead(l));
      filtered.forEach((l, idx) => {
        l.stt = idx + 1;
      });
      saveStoredLeads(filtered);
      deleteBulkLeadsFromFirestore(Array.from(idSet)).catch(() => {});
      res.json({ success: true, count: filtered.length, deletedCount: idSet.size });
    } catch (e: any) {
      res.status(500).json({ error: "Không thể xóa hàng loạt", details: e?.message });
    }
  });

  // Distribute leads evenly across active sales members
  app.post("/api/leads/distribute", (req, res) => {
    try {
      const { forceAll = false, leads: clientLeads, targetMemberNames } = req.body || {};
      const leads = Array.isArray(clientLeads) && clientLeads.length > 0 ? clientLeads : getStoredLeads();
      
      const allMembers = getStoredSalesMembers();
      let members = allMembers.filter((m) => m.status === 'active' && m.role === 'sale');
      if (members.length === 0) {
        members = allMembers.filter((m) => m.status === 'active' && m.role !== 'admin');
      }
      if (members.length === 0) {
        members = allMembers.filter((m) => m.status === 'active');
      }

      if (Array.isArray(targetMemberNames) && targetMemberNames.length > 0) {
        const filteredByTarget = members.filter((m) => targetMemberNames.includes(m.name));
        if (filteredByTarget.length > 0) {
          members = filteredByTarget;
        }
      }

      if (members.length === 0) {
        return res.status(400).json({ error: "Không tìm thấy chuyên viên sale (NVKD) nào đang hoạt động để phân bổ." });
      }

      let pointer = 0;
      let distributedCount = 0;

      const updatedLeads = leads.map((lead: any) => {
        const cleanAssignee = (lead.assignee || '').toLowerCase().trim();
        const isUnassigned = !lead.assignee ||
          cleanAssignee === '' ||
          cleanAssignee.includes('chưa') ||
          cleanAssignee.includes('tổng') ||
          cleanAssignee.includes('tự động') ||
          cleanAssignee.includes('trống') ||
          cleanAssignee === 'admin' ||
          cleanAssignee.includes('bùi văn trường') ||
          cleanAssignee.includes('truongbv') ||
          cleanAssignee === 'null';
        const needsAssign = forceAll || isUnassigned;

        if (needsAssign) {
          const targetMember = members[pointer % members.length];
          pointer++;
          distributedCount++;
          return {
            ...lead,
            assignee: targetMember.name,
            assigneeEmail: targetMember.email,
            assignedAt: new Date().toISOString(),
            status: lead.status === 'Khách mới' ? 'Khách mới' : lead.status,
            history: [
              ...(lead.history || []),
              {
                id: `dist-${Date.now()}-${pointer}`,
                date: new Date().toLocaleString('vi-VN'),
                type: 'Ghi chú nội bộ',
                content: `Hệ thống tự động phân bổ khách hàng cho chuyên viên ${targetMember.name} (${targetMember.email}).`,
                author: 'Hệ Thống CRM SALEPRO HCM_E05'
              }
            ]
          };
        }
        return lead;
      });

      saveStoredLeads(updatedLeads);
      res.json({ success: true, distributedCount, totalLeads: updatedLeads.length, leads: updatedLeads });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi phân bổ khách hàng", details: e?.message });
    }
  });

  // Clear demo leads
  app.post("/api/leads/clear-demo", (_req, res) => {
    try {
      const leads = getStoredLeads();
      const realLeads = leads.filter(l => !isDemoLead(l));
      realLeads.forEach((l, idx) => {
        l.stt = idx + 1;
      });
      saveStoredLeads(realLeads);
      res.json({ success: true, remainingCount: realLeads.length, leads: realLeads });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi khi dọn dẹp dữ liệu demo", details: e?.message });
    }
  });

  // ==========================================
  // SYSTEM BOOTSTRAP ENDPOINT
  // ==========================================

  // System Bootstrap configuration for Frontend (FeatureFlags, UiConfigs, CustomFields)
  app.get("/api/system/bootstrap", optionalAuthenticateToken, (req, res) => {
    try {
      const featureFlags = Database.getFeatureFlags();
      const uiConfigs = Database.getUiConfigs();
      const customFields = Database.getCustomFields();
      const role = req.user?.role || 'SALES_AGENT';

      // Filter flags accessible to this role
      const filteredFlags = featureFlags.filter(f => f.allowedRoles.includes(role));

      res.json({
        success: true,
        featureFlags: filteredFlags,
        uiConfigs,
        customFields,
        role,
        user: req.user || null
      });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải cấu hình hệ thống", details: e?.message });
    }
  });


  // ==========================================
  // SYSTEM AUDIT LOGS ENDPOINTS
  // ==========================================
  app.get("/api/logs", authenticateToken, requireSuperAdmin, (req, res) => {
    try {
      const logs = getStoredSystemLogs();
      const limit = parseInt(req.query.limit as string) || 1000;
      res.json(logs.slice(0, limit));
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải nhật ký hệ thống", details: e?.message });
    }
  });

  app.post("/api/logs", authenticateToken, (req, res) => {
    try {
      const log = req.body;
      if (!log || !log.action) {
        return res.status(400).json({ error: "Thiếu dữ liệu log" });
      }
      appendServerSystemLog({
        ...log,
        ip: req.ip || log.ip
      });
      res.json({ success: true, message: "Ghi nhận nhật ký thành công" });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi ghi nhật ký", details: e?.message });
    }
  });

  app.delete("/api/logs", authenticateToken, requireSuperAdmin, (_req, res) => {
    try {
      saveStoredSystemLogs([]);
      res.json({ success: true, message: "Đã xóa toàn bộ nhật ký" });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi xóa nhật ký", details: e?.message });
    }
  });

  // Get all sales members
  app.get("/api/sales-members", authenticateToken, (_req, res) => {
    const members = getStoredSalesMembers();
    res.json(members.map(({ password, passwordHash, ...member }) => member));
  });

  // Update or import sales members
  app.post("/api/sales-members", authenticateToken, requireSuperAdmin, (req, res) => {
    try {
      const incoming = req.body;
      const current = getStoredSalesMembers();
      const map = new Map<string, any>();
      current.forEach((m) => map.set(m.email.toLowerCase().trim(), m));

      const listToAdd = Array.isArray(incoming) ? incoming : [incoming];
      listToAdd.forEach((item) => {
        if (item && item.email) {
          const key = item.email.toLowerCase().trim();
          const existing = map.get(key);
          map.set(key, existing ? { ...existing, ...item } : item);
        }
      });

      const updated = Array.from(map.values());
      saveStoredSalesMembers(updated);
      res.json({ success: true, count: updated.length, members: updated.map(({ password, passwordHash, ...member }) => member) });
    } catch (e: any) {
      console.error("Error saving sales members:", e);
      res.status(500).json({ error: "Không thể lưu danh sách nhân sự", details: e?.message });
    }
  });

  // Reset sales members to official sheet seed
  app.post("/api/sales-members/reset-to-official", authenticateToken, requireSuperAdmin, (_req, res) => {
    try {
      saveStoredSalesMembers(SEED_SALES_MEMBERS);
      res.json({ success: true, count: SEED_SALES_MEMBERS.length, members: SEED_SALES_MEMBERS.map(({ password, ...member }) => member) });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi khôi phục nhân sự", details: e?.message });
    }
  });

  // ==========================================
  // ZALO QUICK MESSAGE TEMPLATES API
  // ==========================================
  app.get("/api/zalo-templates", (_req, res) => {
    try {
      const templates = getStoredZaloTemplates();
      res.json(templates);
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải mẫu tin nhắn Zalo", details: e?.message });
    }
  });

  app.post("/api/zalo-templates", (req, res) => {
    try {
      const incoming = req.body;
      if (Array.isArray(incoming)) {
        saveStoredZaloTemplates(incoming);
        return res.json({ success: true, count: incoming.length });
      }
      res.status(400).json({ error: "Dữ liệu mẫu tin nhắn không hợp lệ" });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi lưu mẫu tin nhắn Zalo", details: e?.message });
    }
  });

  // ==========================================
  // DATABASE OPS & BACKUP ENDPOINTS
  // ==========================================

  // Status of database
  app.get("/api/database/status", (_req, res) => {
    const leads = getStoredLeads();
    const members = getStoredSalesMembers();
    const settings = getStoredSettings();

    const assignedLeads = leads.filter(l => l.assignee && !l.assignee.toLowerCase().includes('chưa')).length;
    const unassignedLeads = leads.length - assignedLeads;

    res.json({
      status: "connected",
      databaseEngine: "Node.js Server Database Engine + Cloud Firestore",
      storageType: "Persistent JSON Store + Realtime Firestore",
      totalLeads: leads.length,
      assignedLeads,
      unassignedLeads,
      totalSalesMembers: members.length,
      activeSalesMembers: members.filter(m => m.status === 'active' && m.role === 'sale').length,
      lastSyncAt: settings.lastSyncAt || new Date().toISOString(),
      googleSheets: settings.googleSheets
    });
  });

  // Firestore Quota endpoint for client synchronization
  app.get("/api/firestore-quota", (_req, res) => {
    const isExhausted = isServerQuotaExhausted();
    let quotaData: any = {};
    for (const qPath of FIRESTORE_QUOTA_PATHS) {
      try {
        if (fs.existsSync(qPath)) {
          quotaData = JSON.parse(fs.readFileSync(qPath, "utf-8"));
          break;
        }
      } catch {}
    }
    res.json({
      isExhausted,
      retryAfter: quotaData.retryAfter || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reason: quotaData.reason || "Free daily write units per project (free tier database) exceeded",
      status: isExhausted ? "quota_exhausted" : "active"
    });
  });

  // Export full DB backup
  app.get("/api/database/export", authenticateToken, requireSuperAdmin, (_req, res) => {
    const backup = {
      exportedAt: new Date().toISOString(),
      leads: getStoredLeads(),
      salesMembers: getStoredSalesMembers(),
      settings: getStoredSettings()
    };
    res.setHeader("Content-Disposition", `attachment; filename=crm_backup_${Date.now()}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(backup, null, 2));
  });

  // Download PHP & MySQL Hosting Package (.zip)
  app.get(["/api/download/php-package", "/crm_mayhomes_php_hosting.zip"], (_req, res) => {
    const zipPath = path.join(process.cwd(), "crm_mayhomes_php_hosting.zip");
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, "crm_mayhomes_php_hosting.zip");
    } else {
      res.status(404).json({ error: "Gói mã nguồn chưa được tạo, vui lòng chạy scripts/generate_php_package.js" });
    }
  });

  // Download database.sql directly
  app.get(["/api/download/database-sql", "/database.sql"], (_req, res) => {
    const sqlPath = path.join(process.cwd(), "php_hosting_package", "database.sql");
    if (fs.existsSync(sqlPath)) {
      res.setHeader("Content-Disposition", "attachment; filename=database.sql");
      res.setHeader("Content-Type", "application/sql");
      res.sendFile(sqlPath);
    } else {
      res.status(404).json({ error: "File database.sql chưa sẵn sàng" });
    }
  });

  // Restore full DB backup
  app.post("/api/database/restore", authenticateToken, requireSuperAdmin, (req, res) => {
    try {
      const { leads, salesMembers, settings } = req.body || {};
      if (Array.isArray(leads)) {
        saveStoredLeads(leads);
      }
      if (Array.isArray(salesMembers) && salesMembers.length > 0) {
        saveStoredSalesMembers(salesMembers);
      }
      if (settings) {
        saveStoredSettings(settings);
      }
      res.json({ success: true, message: "Khôi phục cơ sở dữ liệu thành công!" });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi khôi phục cơ sở dữ liệu", details: e?.message });
    }
  });

  // ========================================================
  // INTERNAL CHAT API (TPKD & NVKD Real-Time Messaging)
  // ========================================================
  app.get("/api/chat/messages", (req, res) => {
    try {
      let messages = getStoredChatMessages();
      // If empty, initialize with authentic default seed
      if (messages.length === 0) {
        messages = [
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
        saveStoredChatMessages(messages);
      }

      const { leadId, participantId } = req.query;
      let filtered = messages;
      if (leadId) {
        filtered = filtered.filter((m: any) => m.leadId === leadId);
      }
      if (participantId) {
        filtered = filtered.filter(
          (m: any) =>
            m.senderId === participantId ||
            m.recipientId === participantId ||
            !m.recipientId // Toàn bộ công ty
        );
      }
      res.json(filtered);
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi tải tin nhắn", details: e?.message });
    }
  });

  app.post("/api/chat/messages", (req, res) => {
    try {
      const messages = getStoredChatMessages();
      const newMsg = req.body;
      if (!newMsg || !newMsg.content) {
        return res.status(400).json({ error: "Nội dung tin nhắn không được để trống" });
      }
      if (!newMsg.id) {
        newMsg.id = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      }
      if (!newMsg.createdAt) {
        newMsg.createdAt = new Date().toISOString();
      }
      if (!newMsg.readBy) {
        newMsg.readBy = [newMsg.senderId];
      }
      messages.push(newMsg);
      saveStoredChatMessages(messages);
      res.json(newMsg);
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi gửi tin nhắn", details: e?.message });
    }
  });

  app.post("/api/chat/mark-read", (req, res) => {
    try {
      const { messageIds, userId } = req.body;
      if (!Array.isArray(messageIds) || !userId) {
        return res.status(400).json({ error: "Thiếu dữ liệu" });
      }
      const messages = getStoredChatMessages();
      let updated = false;
      for (const m of messages) {
        if (messageIds.includes(m.id) && Array.isArray(m.readBy) && !m.readBy.includes(userId)) {
          m.readBy.push(userId);
          updated = true;
        }
      }
      if (updated) {
        saveStoredChatMessages(messages);
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi cập nhật", details: e?.message });
    }
  });

  app.delete("/api/chat/messages/:id", (req, res) => {
    try {
      const { id } = req.params;
      let messages = getStoredChatMessages();
      messages = messages.filter((m: any) => m.id !== id);
      saveStoredChatMessages(messages);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: "Lỗi xóa tin nhắn", details: e?.message });
    }
  });

  // AI Auto-Correct & Note Enhancement Endpoint
  app.post("/api/ai/correct-text", async (req, res) => {
    const rawInput = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const { type = "interaction_log", context = "" } = req.body || {};

    if (!rawInput) {
      return res.status(400).json({ error: "Nội dung văn bản không được để trống" });
    }

    try {
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          originalText: rawInput,
          correctedText: rawInput,
          source: "fallback",
          message: "GEMINI_API_KEY chưa được cấu hình. Sử dụng bộ quy tắc chuẩn hóa BĐS cục bộ.",
        });
      }

      const prompt = `Bạn là trợ lý AI chuyên viên chuẩn hóa dữ liệu CRM cho công ty Bất Động Sản cao cấp SALEPRO HCM_E05.
Nhiệm vụ của bạn là tiếp nhận ghi chú hoặc trạng thái chăm sóc khách hàng do nhân viên sale gõ vội, sửa toàn bộ lỗi chính tả, chuẩn hóa từ ngữ viết tắt, và diễn đạt lại thành câu chuyên nghiệp, lịch sự và rõ ràng để phục vụ phân tích dữ liệu CRM chuyên sâu.

Quy tắc quan trọng:
1. Sửa tất cả các lỗi gõ sai chính tả, mất dấu tiếng Việt, viết tắt thông dụng:
   - "đ" / "dang" -> "đang" (Ví dụ kinh điển: "Khách đ bận" -> "Khách hàng đang bận")
   - "kh" / "k" -> "khách" hoặc "khách hàng" / "không" (tùy ngữ cảnh câu)
   - "dt" / "sđt" -> "điện thoại"
   - "k nghe may" / "k bat may" -> "không nghe máy"
   - "t2", "t3", "t4", "t5", "t6", "t7", "cn" -> "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy", "Chủ Nhật"
   - "2pn", "3pn" -> "2 phòng ngủ", "3 phòng ngủ"
   - "q1", "q3", "bt", "pn" -> "Quận 1", "Quận 3", "Bình Thạnh", "Phú Nhuận"
   - "tr", "ty" -> "triệu", "tỷ"
   - "coc" -> "đặt cọc"
2. Giữ nguyên 100% sự thật và nội dung mà sale muốn truyền tải, KHÔNG thêm thắt thông tin hay số liệu không có trong nội dung gốc.
3. Câu văn sau khi sửa phải chỉn chu, viết hoa chữ cái đầu câu, kết thúc bằng dấu chấm câu hoặc cấu trúc chuẩn mực.
4. Trả về ĐÚNG định dạng JSON với 3 trường:
   - "correctedText": chuỗi nội dung sau khi đã sửa chuẩn chính tả tiếng Việt
   - "changes": mảng các từ ngữ đã được sửa (ví dụ ["Khách đ bận -> Khách hàng đang bận"])
   - "suggestedIntent": phân loại ngắn về trạng thái (ví dụ "Khách đang bận", "Hẹn xem nhà", "Không nghe máy", "Từ chối nhu cầu", "Quan tâm giá")

Nội dung sale nhập vào: "${rawInput}"
Ngữ cảnh (loại nhập liệu): ${type} ${context ? `(${context})` : ''}

Chỉ trả về JSON hợp lệ, không kèm markdown \`\`\`json:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const responseText = response.text ? response.text.trim() : "";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json({
        originalText: rawInput,
        correctedText: parsed.correctedText || rawInput,
        changes: parsed.changes || [],
        suggestedIntent: parsed.suggestedIntent || "",
        source: "gemini-3.8-flash",
      });

    } catch (err: any) {
      console.warn("Gemini AI busy or error, applying CRM fallback:", err?.message || err);
      const fallback = fallbackNormalizeText(rawInput);
      return res.json({
        originalText: rawInput,
        correctedText: fallback.corrected,
        changes: fallback.changes,
        suggestedIntent: "Ghi nhận trạng thái",
        source: "rule-engine-fallback",
      });
    }
  });

  // Customer Demand & Closing Probability Analysis using Gemini 3.8 Flash
  app.post("/api/ai/analyze-customer", async (req, res) => {
    // Heuristic fallback function
    const computeHeuristicAnalysis = (l: any) => {
      let prob = 40;
      const st = (l.status || "").toLowerCase();
      if (st.includes("đã chốt") || st.includes("chốt")) prob = 95;
      else if (st.includes("cọc") || st.includes("đàm phán")) prob = 85;
      else if (st.includes("hẹn") || st.includes("xem")) prob = 70;
      else if (st.includes("tiềm năng") || st.includes("quan tâm cao")) prob = 60;
      else if (st.includes("quan tâm") || st.includes("gửi thông tin")) prob = 45;
      else if (st.includes("gọi lại") || st.includes("máy bận")) prob = 30;
      else if (st.includes("không nghe") || st.includes("thuê bao")) prob = 20;
      else if (st.includes("không nhu cầu") || st.includes("nhầm số")) prob = 10;

      const histCount = Array.isArray(l.history) ? l.history.length : 0;
      if (histCount >= 3) prob = Math.min(95, prob + 10);
      if (l.zaloConnected) prob = Math.min(95, prob + 8);
      if (l.budget) prob = Math.min(95, prob + 5);

      let level: any = "Trung bình";
      if (prob >= 80) level = "Rất cao";
      else if (prob >= 65) level = "Tiềm năng cao";
      else if (prob >= 45) level = "Trung bình";
      else if (prob >= 25) level = "Cần nuôi dưỡng";
      else level = "Nguy cơ từ chối";

      return {
        closingProbability: prob,
        closingLevel: level,
        closingSummary: `Khách hàng ${l.fullName || 'tiềm năng'} đang ở trạng thái "${l.status || 'Đang theo dõi'}" đối với dự án ${l.project || 'BĐS'}. Tỷ lệ tương tác đạt mức ${level.toLowerCase()}, cần đẩy mạnh bám sát và chăm sóc chuyên biệt.`,
        customerPersona: l.budget ? `Khách hàng quan tâm phân khúc ${l.productType || 'BĐS'}, tầm tài chính ${l.budget}` : `Khách hàng quan tâm dự án ${l.project || 'BĐS'}`,
        keyDemands: [
          `Phân khúc ${l.productType || 'Nhà phố/Căn hộ'}`,
          l.budget ? `Ngân sách ${l.budget}` : 'Tìm kiếm sản phẩm giá hợp lý',
          `Dự án ${l.project || 'Khu vực trung tâm'}`
        ],
        barriersOrRisks: [
          'Cần thêm thông tin pháp lý rõ ràng hoặc so sánh giá',
          'Đang cân nhắc thời điểm xuống tiền hoặc tham khảo ý kiến gia đình'
        ],
        nextActionRecommendations: [
          `Chủ động nhắn tin Zalo gửi thêm 2 căn giỏ hàng đẹp tại ${l.project || 'dự án'}`,
          'Đề xuất lịch hẹn khảo sát thực tế vào khung giờ thuận tiện cuối tuần',
          'Tập trung làm nổi bật chính sách ưu đãi và tiềm năng tăng giá'
        ],
        suggestedScript: `Dạ em chào anh/chị ${l.fullName || ''}, em gửi anh/chị thông tin cập nhật mới nhất về các căn đẹp tại ${l.project || 'dự án'}. Cuối tuần này em xin phép đón anh/chị đi xem thực tế vị trí nhé ạ!`,
        analyzedAt: new Date().toISOString(),
        source: 'smart-heuristic'
      };
    };

    try {
      const lead = req.body?.lead;
      if (!lead || !lead.fullName) {
        return res.status(400).json({ error: "Thiếu dữ liệu khách hàng cần phân tích" });
      }

      const ai = getGeminiClient();

      if (!ai) {
        return res.json(computeHeuristicAnalysis(lead));
      }

      // Format history logs for prompt
      const historyStr = Array.isArray(lead.history) && lead.history.length > 0
        ? lead.history.map((h: any, idx: number) => `[${idx + 1}] (${h.date} - ${h.type} bởi ${h.author || 'Sale'}): ${h.content}`).join("\n")
        : "Chưa có lịch sử cuộc gọi/tương tác chi tiết.";

      const prompt = `Bạn là Giám đốc Kinh doanh và Chuyên gia Phân tích Khách hàng Bất Động Sản cao cấp (SALEPRO HCM_E05 CRM).
Dựa trên thông tin hồ sơ khách hàng, ngân sách, phân khúc sản phẩm, dự án và toàn bộ lịch sử chăm sóc/cuộc gọi/lịch hẹn dưới đây, hãy phân tích chuyên sâu nhu cầu khách hàng, đánh giá khả năng chốt giao dịch và đưa ra hướng dẫn chăm sóc tiếp theo cho chuyên viên Sale.

THÔNG TIN KHÁCH HÀNG:
- Họ tên: ${lead.fullName}
- Số điện thoại: ${lead.phone || 'Chưa có'}
- Trạng thái hiện tại: ${lead.status || 'Khách mới'}
- Dự án quan tâm: ${lead.project || 'Chưa xác định'}
- Loại sản phẩm: ${lead.productType || 'Nhà phố / Căn hộ'}
- Ngân sách / Tầm tài chính: ${lead.budget || 'Chưa ghi rõ'}
- Nguồn khách (Data source): ${lead.dataSource || 'Chưa rõ'}
- Đã kết bạn Zalo: ${lead.zaloConnected ? 'Đã kết nối Zalo' : 'Chưa kết nối'}
- Ghi chú ban đầu: ${lead.notes || 'Không có'}
- Thẻ phân loại (Tags): ${Array.isArray(lead.tags) ? lead.tags.join(', ') : 'Không có'}

LỊCH SỬ CHĂM SÓC & TƯƠNG TÁC:
${historyStr}

YÊU CẦU PHÂN TÍCH:
1. Đánh giá tỷ lệ phần trăm khả năng chốt giao dịch (closingProbability) từ 0 đến 100%.
2. Phân cấp khả năng chốt (closingLevel): Chọn 1 trong 5 mức ["Rất cao", "Tiềm năng cao", "Trung bình", "Cần nuôi dưỡng", "Nguy cơ từ chối"].
3. Tóm tắt súc tích khả năng chốt (closingSummary): 2-3 câu đánh giá khách quan, thực tế, chỉ ra điểm mấu chốt.
4. Chân dung khách hàng (customerPersona): 1 câu mô tả động cơ mua (ở thực, đầu tư lướt, tích sản, cho thuê...).
5. Nhu cầu cốt lõi (keyDemands): Mảng 2-4 nhu cầu cụ thể (vị trí, giá cả, pháp lý, dòng tiền...).
6. Rào cản hoặc điểm băn khoăn (barriersOrRisks): Mảng 1-3 điểm khách đang vướng hoặc lo ngại.
7. Gợi ý hướng chăm sóc tiếp theo (nextActionRecommendations): Mảng 3-5 hành động cụ thể, thực chiến và khả thi ngay cho Sale (gửi tài liệu gì, gọi lúc nào, hẹn xem thế nào...).
8. Kịch bản tư vấn / tin nhắn Zalo gợi ý (suggestedScript): 1 đoạn tin nhắn ngắn gọn, thân thiện, đánh trúng tâm lý khách hàng này.

TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON:
{
  "closingProbability": 75,
  "closingLevel": "Tiềm năng cao",
  "closingSummary": "...",
  "customerPersona": "...",
  "keyDemands": ["...", "..."],
  "barriersOrRisks": ["...", "..."],
  "nextActionRecommendations": ["...", "...", "..."],
  "suggestedScript": "..."
}
Chỉ trả về JSON thuần túy không có ký tự markdown ngoài json.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text ? response.text.trim() : "";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(cleaned);
      }

      return res.json({
        closingProbability: typeof parsed.closingProbability === 'number' ? parsed.closingProbability : 50,
        closingLevel: parsed.closingLevel || "Trung bình",
        closingSummary: parsed.closingSummary || "Chưa có nhận định.",
        customerPersona: parsed.customerPersona || "Khách hàng BĐS",
        keyDemands: Array.isArray(parsed.keyDemands) ? parsed.keyDemands : [],
        barriersOrRisks: Array.isArray(parsed.barriersOrRisks) ? parsed.barriersOrRisks : [],
        nextActionRecommendations: Array.isArray(parsed.nextActionRecommendations) ? parsed.nextActionRecommendations : [],
        suggestedScript: parsed.suggestedScript || "",
        analyzedAt: new Date().toISOString(),
        source: "gemini-3.8-flash"
      });

    } catch (err: any) {
      console.warn("Gemini customer analysis error, using heuristic fallback:", err?.message || err);
      const fallback = computeHeuristicAnalysis(req.body?.lead || {});
      return res.json(fallback);
    }
  });

  // SmartLabeling endpoint using Gemini 3.8 Flash to auto-classify priority (Nóng / Ấm / Lạnh)
  const handleSmartLabeling = async (req: express.Request, res: express.Response) => {
    const fallbackHeuristic = (lead: any) => {
      const notes = (lead.notes || "").toLowerCase();
      const status = (lead.status || "").toLowerCase();
      const budget = (lead.budget || "").toLowerCase();
      const callStatus = (lead.callStatus || "").toLowerCase();

      // Check NÓNG
      const hotKeywords = [
        "gấp", "xem nhà", "xem ngay", "cọc", "đàm phán", "chốt", "đã duyệt vay", 
        "tài chính sẵn", "tiền sẵn", "trong tuần", "hẹn gặp", "đặt chỗ", "hot", 
        "rất quan tâm", "hẹn xem", "ưng", "thiện chí"
      ];
      const isHotStatus = status.includes("hẹn") || status.includes("xem") || status.includes("cọc") || status.includes("đàm phán") || status.includes("chốt");
      const hasHotNote = hotKeywords.some(kw => notes.includes(kw));

      // Check LẠNH
      const coldKeywords = [
        "không nghe", "thuê bao", "nhầm số", "không có nhu cầu", "không nhu cầu", 
        "chưa có tiền", "hỏi chơi", "quá đắt", "từ chối", "chặn số", "bận", "k nc"
      ];
      const isColdStatus = status.includes("không nghe") || status.includes("thuê bao") || status.includes("không nhu cầu") || status.includes("sai số");
      const hasColdNote = coldKeywords.some(kw => notes.includes(kw));

      if (hasHotNote || isHotStatus || callStatus.includes("quan tâm cao")) {
        return {
          leadId: lead.id,
          potentialLevel: "Nóng" as const,
          priorityReason: notes 
            ? `Nhu cầu cấp thiết: ${lead.notes}` 
            : `Đang ở trạng thái "${lead.status}", thiện chí giao dịch cao`,
          confidence: 0.9
        };
      }

      if (hasColdNote || isColdStatus) {
        return {
          leadId: lead.id,
          potentialLevel: "Lạnh" as const,
          priorityReason: notes 
            ? `Tương tác thấp: ${lead.notes}` 
            : `Trạng thái "${lead.status}", chưa sẵn sàng xuống tiền`,
          confidence: 0.85
        };
      }

      // Default is ẤM
      return {
        leadId: lead.id,
        potentialLevel: "Ấm" as const,
        priorityReason: notes 
          ? `Đang theo dõi nhu cầu: ${lead.notes}` 
          : `Khách quan tâm phân khúc ${lead.productType || 'BĐS'}, dự án ${lead.project || 'BĐS'}`,
        confidence: 0.8
      };
    };

    try {
      const rawLeads = req.body?.leads;
      if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
        return res.status(400).json({ error: "Danh sách khách hàng không hợp lệ" });
      }

      // Limit batch size to 30 leads per request
      const leadsToProcess = rawLeads.slice(0, 30);
      const ai = getGeminiClient();

      if (!ai) {
        const heuristicResults = leadsToProcess.map(fallbackHeuristic);
        return res.json({ results: heuristicResults, source: "smart-heuristic" });
      }

      const formattedList = leadsToProcess.map((l: any, i: number) => {
        return `[${i + 1}] ID: "${l.id}" | Tên: "${l.fullName}" | SĐT: "${l.phone}" | Dự án: "${l.project || 'N/A'}" | Loại: "${l.productType || 'N/A'}" | Tài chính: "${l.budget || 'N/A'}" | Trạng thái: "${l.status || 'Khách mới'}" | Ghi chú & Nhu cầu: "${l.notes || 'Chưa ghi'}" | Nguồn: "${l.dataSource || 'N/A'}"`;
      }).join("\n");

      const prompt = `Bạn là Chuyên gia Đánh giá Phân loại Lead Bất Động Sản cao cấp (SmartLabeling CRM).
Hãy đọc kỹ thông tin, nhu cầu và ghi chú của từng khách hàng dưới đây và gắn nhãn mức độ ưu tiên chính xác theo 3 cấp độ:
- "Nóng": Khách có nhu cầu cấp bách, tài chính sẵn sàng, đã xem hoặc muốn đi xem nhà ngay, hỏi giá cụ thể, cọc, đàm phán, phản hồi rất tích cực.
- "Ấm": Khách đang quan tâm tìm hiểu, so sánh giá, cần gửi thông tin tài liệu, hẹn cuối tuần hoặc cần trao đổi thêm với người thân.
- "Lạnh": Khách thuê bao, không nghe máy, từ chối, nhầm số, chưa có tài chính, không có nhu cầu thực hoặc khó tiếp cận.

DANH SÁCH KHÁCH HÀNG:
${formattedList}

YÊU CẦU:
Trả về mảng JSON với đúng các trường sau cho từng khách:
{
  "results": [
    {
      "leadId": "id-khách",
      "potentialLevel": "Nóng" | "Ấm" | "Lạnh",
      "priorityReason": "Giải thích ngắn gọn 1 câu dựa trên nhu cầu hoặc ghi chú của khách",
      "confidence": 0.95
    }
  ]
}
Chỉ trả về JSON thuần túy, không có text phụ ngoài cú pháp JSON:`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const responseText = response.text ? response.text.trim() : "";
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        const cleaned = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();
        parsed = JSON.parse(cleaned);
      }

      const resultsList = Array.isArray(parsed?.results) ? parsed.results : [];
      
      // Merge with heuristic for any missing leads
      const finalResults = leadsToProcess.map((l: any) => {
        const found = resultsList.find((r: any) => r.leadId === l.id);
        if (found && (found.potentialLevel === 'Nóng' || found.potentialLevel === 'Ấm' || found.potentialLevel === 'Lạnh')) {
          return {
            leadId: l.id,
            potentialLevel: found.potentialLevel,
            priorityReason: found.priorityReason || "Phân loại bởi Gemini 3.8 Flash",
            confidence: typeof found.confidence === 'number' ? found.confidence : 0.9
          };
        }
        return fallbackHeuristic(l);
      });

      return res.json({
        results: finalResults,
        source: "gemini-3.8-flash"
      });

    } catch (err: any) {
      console.warn("SmartLabeling AI error, using heuristic fallback:", err?.message || err);
      const fallbackList = (req.body?.leads || []).slice(0, 30).map(fallbackHeuristic);
      return res.json({
        results: fallbackList,
        source: "smart-heuristic"
      });
    }
  };

  app.post("/api/ai/smart-labeling", handleSmartLabeling);
  app.post("/api/ai/batch-smart-labeling", handleSmartLabeling);

  // Catch unmatched API routes with clean JSON 404 response
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} không tồn tại trên hệ thống CRM` });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      etag: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get("*", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "127.0.0.1", () => {
    console.log(`Server running on http://127.0.0.1:${PORT}`);
  });
}

startServer();
