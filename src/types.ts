export type CustomerStatus =
  | 'Không nghe máy'
  | 'Không nhu cầu'
  | 'Quan tâm'
  | 'Tiềm năng'
  | 'Gọi lại sau'
  | 'Máy bận'
  | 'Thuê bao'
  | 'Gửi thông tin'
  | 'Nhầm số'
  | 'Khác';

export type LeadStatus =
  | CustomerStatus
  | 'Khách mới'
  | 'Đang chăm sóc'
  | 'Hẹn xem BĐS'
  | 'Đàm phán / Cọc'
  | 'Đã chốt'
  | (string & {});

export type ProductType =
  | 'Nhà phố trung tâm'
  | 'Căn hộ chung cư'
  | 'Biệt thự / Villa'
  | 'Đất nền'
  | 'Shophouse'
  | 'BĐS Nghỉ dưỡng'
  | 'Mặt bằng kinh doanh'
  | (string & {});

export interface InteractionLog {
  id: string;
  date: string;
  type: 'Cuộc gọi' | 'Zalo' | 'Gặp mặt / Xem nhà' | 'Gửi báo giá' | 'Ghi chú nội bộ' | 'Bàn giao / Chuyển Sale';
  content: string;
  author: string;
}

export interface Appointment {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  project: string;
  location: string;
  assignee: string;
  status: 'Chờ đi xem' | 'Đã xem' | 'Khách dời lịch' | 'Đã huỷ';
  note?: string;
}

export interface Lead {
  id: string;
  stt: number;
  date: string; // YYYY-MM-DD
  fullName: string;
  phone: string;
  dataSource: string; // Tệp dữ liệu (e.g. Facebook Ads, Google Ads, Hotline, Zalo, Giới thiệu, MAY_MH5.19, v.v.)
  productType: ProductType;
  status: LeadStatus;
  project: string;
  assignee: string; // Người phụ trách
  notes: string;
  budget?: string; // Khoảng giá tài chính (VD: 5 - 8 tỷ, 15 - 20 tỷ)
  email?: string;
  address?: string;
  history?: InteractionLog[];
  dealValue?: number; // Giá trị giao dịch dự kiến (triệu VNĐ)
  campaignCode?: string; // Mã chiến dịch / Nguồn máy (VD: MAY_MH5.19)
  callStatus?: 'Đã nghe máy' | 'Máy bận / Chưa gọi' | 'Hẹn gọi lại' | 'Thuê bao' | 'Kết bạn Zalo' | 'Khách quan tâm cao';
  potentialLevel?: 'Nóng' | 'Ấm' | 'Lạnh';
  priorityReason?: string; // Lý do AI xếp hạng mức độ ưu tiên (Nóng/Ấm/Lạnh)
  priorityUpdatedAt?: string; // Thời điểm AI gắn nhãn thông minh
  sheetRowIndex?: number;
  createdAt?: string; // Thời điểm tạo hoặc đẩy về hệ thống (ISO string)
  updatedAt?: string; // Thời điểm cập nhật/tương tác gần nhất (ISO string)
  assignedToId?: string;
  assigneeEmail?: string;
  assignedAt?: string; // Thời điểm chia cho sale (ISO date string)
  acceptedAt?: string; // Thời điểm sale bấm tiếp nhận khách
  firstReportedAt?: string; // Thời điểm có báo cáo/tương tác đầu tiên
  slaWarning?: boolean; // Đang cảnh báo sắp quá hạn phản hồi
  slaBreached?: boolean; // Đã quá hạn tiếp nhận/báo cáo
  reassignedCount?: number; // Số lần bị thu hồi và chia lại cho sale khác
  previousAssignees?: string[]; // Lịch sử các sale từng được gán nhưng bị thu hồi
  zaloConnected?: boolean; // Đã kết nối Zalo với khách
  zaloConnectedAt?: string; // Thời điểm kết nối Zalo
  tags?: string[]; // Thẻ phân loại khách hàng nhanh (VD: Hot, Cần tư vấn vay, Đầu tư, Mua ở thực...)
  zaloReminder?: ZaloReminder; // Lịch nhắc hẹn Zalo và thông báo đẩy trình duyệt
  callbackReminder?: CallbackReminder; // Lịch nhắc nhở gọi lại tự động gửi thông báo push
  periodicFollowUp?: PeriodicFollowUpReminder; // Lịch nhắc nhở follow-up định kỳ theo chu kỳ (mỗi N ngày)
  aiAnalysis?: CustomerAnalysisResult; // Phân tích nhu cầu khách hàng từ Gemini AI
}

export type PriorityLevel = 'Nóng' | 'Ấm' | 'Lạnh';

export interface SmartLabelResult {
  leadId: string;
  potentialLevel: PriorityLevel;
  priorityReason: string;
  confidence?: number;
}

export type ClosingLevel = 'Rất cao' | 'Tiềm năng cao' | 'Trung bình' | 'Cần nuôi dưỡng' | 'Nguy cơ từ chối';

export interface CustomerAnalysisResult {
  closingProbability: number; // 0 - 100%
  closingLevel: ClosingLevel;
  closingSummary: string; // Tóm tắt súc tích khả năng chốt
  customerPersona: string; // Chân dung & tâm lý khách hàng
  keyDemands: string[]; // Nhu cầu cốt lõi
  barriersOrRisks: string[]; // Rào cản hoặc điểm khách băn khoăn
  nextActionRecommendations: string[]; // Gợi ý hướng chăm sóc tiếp theo cụ thể
  suggestedScript: string; // Kịch bản tin nhắn Zalo hoặc câu nói tư vấn tiếp theo
  analyzedAt: string; // ISO datetime
  source: 'gemini-3.8-flash' | 'smart-heuristic';
}

export interface ZaloReminder {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  reminderTime: string; // ISO string thời điểm thông báo đẩy bắn ra
  targetTime: string; // ISO string thời điểm hẹn chăm sóc Zalo thực tế
  advanceMinutes: number; // Báo trước bao nhiêu phút (0: đúng giờ, 5, 10, 15, 30, 60, 120)
  notes: string; // Nội dung kịch bản / ghi chú cần trao đổi qua Zalo
  status: 'pending' | 'triggered' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy?: string;
  triggeredAt?: string;
  completedAt?: string;
}

export interface CallbackReminder {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  targetTime: string; // ISO string thời điểm hẹn gọi lại thực tế
  reminderTime: string; // ISO string thời điểm thông báo đẩy bắn ra (targetTime - advanceMinutes)
  advanceMinutes: number; // Báo trước bao nhiêu phút (0: đúng giờ, 5, 10, 15, 30, 60)
  notes: string; // Lý do hoặc nội dung cần gọi lại tư vấn
  status: 'pending' | 'triggered' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy?: string;
  triggeredAt?: string;
  completedAt?: string;
}

export interface PeriodicFollowUpReminder {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  cycleDays: number; // Chu kỳ lặp lại theo ngày (VD: 1, 2, 3, 5, 7, 10, 14, 30)
  lastFollowedUpAt?: string; // Thời điểm follow-up chăm sóc gần nhất (ISO)
  nextFollowUpDate: string; // Ngày hẹn follow-up tiếp theo (YYYY-MM-DD)
  nextFollowUpTime?: string; // Giờ nhắc trong ngày (HH:mm, mặc định 09:00)
  notes: string; // Mục tiêu hoặc nội dung chăm sóc định kỳ
  status: 'active' | 'paused' | 'completed'; // active: đang chạy | paused: tạm dừng | completed: đã dừng/đã chốt
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  completedCyclesCount?: number; // Số chu kỳ đã hoàn thành
  history?: Array<{
    cycleIndex: number;
    completedAt: string;
    completedBy?: string;
    notes?: string;
  }>;
}

export interface KpiPolicy {
  dailyZaloTarget: number; // Chỉ tiêu: 1 ngày phải có 2 khách quan tâm kết nối Zalo
  weeklyMeetingTarget: number; // Chỉ tiêu: Sau 1 tuần phải có 2 khách hẹn gặp trực tiếp / tham quan dự án
  sundayReportEnabled: boolean; // Tối Chủ Nhật tự động chuẩn bị email báo cáo
  gdkdEmail: string; // Email GĐKD (ví dụ: happyhuy2812@gmail.com)
  defaultAdminEmail: string; // Email Admin/Hệ thống
}

export interface SaleWeeklyKpiReport {
  member: SalesMember;
  tpkdMember?: SalesMember;
  gdkdMember?: SalesMember;
  tpkdEmail: string;
  gdkdEmail: string;
  saleEmail: string;
  dailyZaloCountToday: number;
  dailyZaloTarget: number;
  isDailyZaloMetToday: boolean;
  weeklyZaloCount: number;
  weeklyZaloTarget: number; // 2/ngày * 7 = 14 hoặc theo ngày làm việc
  weeklyZaloDaysMet: number; // Số ngày trong tuần đạt >= 2 khách Zalo
  weeklyMeetingCount: number; // Số khách hẹn gặp trực tiếp / tham quan dự án trong tuần
  weeklyMeetingTarget: number; // Chỉ tiêu 2 khách/tuần
  isWeeklyMeetingMet: boolean;
  overallStatus: 'ĐẠT XUẤT SẮC' | 'ĐẠT CHỈ TIÊU' | 'CHƯA ĐẠT' | 'CẢNH BÁO VI PHẠM';
  leadsWithZalo: {
    leadId: string;
    fullName: string;
    phone: string;
    project: string;
    date: string;
    status: string;
  }[];
  appointmentsInWeek: {
    appointmentId: string;
    leadName: string;
    leadPhone: string;
    project: string;
    date: string;
    time: string;
    location: string;
    status: string;
  }[];
}

export interface AutoDistributionPolicy {
  enabled: boolean; // Bật/tắt tự động điều phối & thu hồi
  acceptTimeoutMinutes: number; // Thời gian tối đa để Sale bấm 'Tiếp nhận' (mặc định 60 phút)
  reportTimeoutHours: number; // Thời gian tối đa để Sale báo cáo/ghi nhận tương tác (mặc định 4 giờ)
  performancePriority: boolean; // Ưu tiên sale có điểm hiệu suất & tỷ lệ chốt cao
  reassignPolicy: 'top_performer' | 'round_robin'; // Cách chọn sale mới khi thu hồi
  protectOriginalAssigneeOnDuplicate?: boolean; // Tự động bảo vệ Sale ở bước 1, không chia đè sang Sale mới ở bước 2
}

export type LeadDuplicateHandlingMode = 
  | 'skip_protect_old_sale'     // Bảo vệ Sale cũ (Mặc định): Bỏ qua khách trùng, giữ nguyên cho Sale ở Bước 1
  | 'update_old_sale_note'      // Giữ nguyên Sale cũ, gộp ghi chú mới từ file
  | 'reassign_to_new_sale';     // Chuyển giao cho Sale mới (Thu hồi từ Sale cũ)

export type LeadAssignTargetMode =
  | 'public_pool'
  | 'single_sale'    // Chuyển đích danh cho 1 Sale cụ thể (VD: Bước 1 chuyển Sale A, Bước 2 chuyển Sale B)
  | 'round_robin'    // Tự động phân bổ đều cho toàn bộ đội ngũ Sale
  | 'as_in_file';    // Giữ nguyên theo cột Người phụ trách có trong file

export interface ImportLeadsOptions {
  assignTargetMode: LeadAssignTargetMode;
  targetSaleName?: string;
  duplicateHandlingMode: LeadDuplicateHandlingMode;
}

export type CustomerScenarioType = 
  | 'hen_xem'          // 'Khách hẹn xem' (Hẹn xem BĐS, Khảo sát thực tế)
  | 'quan_tam_du_an'   // 'Khách quan tâm dự án' (Quan tâm, Gửi thông tin)
  | 'khach_moi'        // 'Khách mới' (Tiếp nhận lời chào đầu tiên)
  | 'tiem_nang'        // 'Khách tiềm năng' (Cân nhắc tài chính, dòng tiền)
  | 'dam_phan_coc'     // 'Khách đàm phán / Cọc' (Giữ chỗ, chuyển cọc)
  | 'cham_soc_lai'     // 'Khách chăm sóc lại' (Tái kích hoạt, giỏ hàng mới)
  | 'khong_nghe_may'   // 'Không nghe máy / Gọi lại sau'
  | 'da_chot'          // 'Khách đã chốt / Hậu mãi'
  | 'khac';            // Tình huống khác

export interface CustomerScenarioConfig {
  id: CustomerScenarioType;
  label: string; // VD: 'Khách hẹn xem', 'Khách quan tâm dự án'
  statusMatch: LeadStatus[];
  iconName: string;
  badgeColor: string;
  description: string;
}

export type ZaloTemplateCategory = 
  | 'chao_hoi' 
  | 'du_an' 
  | 'doc_quyen' 
  | 'lich_hen' 
  | 'cham_soc_lai' 
  | 'khac';

export interface ZaloTemplate {
  id: string;
  title: string;
  category: ZaloTemplateCategory;
  content: string;
  isDefault?: boolean;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  scenario?: CustomerScenarioType; // Tình huống khách hàng: 'hen_xem' | 'quan_tam_du_an' | ...
  scenarioLabel?: string; // Tên hiển thị tình huống (VD: 'Khách hẹn xem', 'Khách quan tâm dự án')
  targetStatus?: LeadStatus | 'all'; // Trạng thái khách hàng tương ứng (VD: 'Hẹn xem BĐS', 'Quan tâm', 'Tất cả trạng thái')
  tags?: string[]; // Thẻ phân loại kịch bản
}

export interface SalePerformanceScore {
  member: SalesMember;
  leadCount: number;
  acceptedCount: number;
  reportedCount: number;
  closedCount: number;
  closeRate: number; // %
  responseTimeAvg: string; // VD: '15 phút'
  performanceScore: number; // Thang 100 điểm
  tier: 'VIP' | 'Tốt' | 'Đạt' | 'Cần cải thiện';
  slaBreachCount: number; // Số lần bị phạt quá hạn
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleSheetTabInfo {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface CRMIndicators {
  totalLeads: number; // Tổng Lead
  newLeads: number; // Khách mới
  potentialLeads: number; // Tiềm năng
  closedLeads: number; // Đã chốt
  closeRate: number; // Tỷ lệ chốt (%)
  inCareLeads: number; // Đang chăm sóc
  viewingLeads: number; // Hẹn xem BĐS
  negotiatingLeads: number; // Đàm phán / Cọc
  lostLeads: number; // Không nhu cầu
  statusCounts: Record<string, number>; // Số lượng theo 10 tình trạng khách hàng
}

export type ViewMode = 
  | 'table' 
  | 'pipeline' 
  | 'appointments' 
  | 'analytics' 
  | 'sales_team' 
  | 'smart_reports' 
  | 'performance_overview'
  | 'system_logs';

export type UserRole = 'admin' | 'tpkd' | 'sale';

export type SystemLogAction =
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'lead_create'
  | 'lead_update'
  | 'lead_delete'
  | 'lead_batch_delete'
  | 'lead_bulk_delete'
  | 'lead_status_change'
  | 'lead_transfer'
  | 'lead_reassigned_sla'
  | 'lead_accept'
  | 'password_change'
  | 'password_reset'
  | 'csv_import'
  | 'manual_lead_upload'
  | 'sheet_sync'
  | 'policy_update';

export type SystemLogLevel = 'info' | 'warning' | 'danger' | 'success';

export interface SystemLog {
  id: string;
  timestamp: string; // ISO string
  action: SystemLogAction;
  level: SystemLogLevel;
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  actorRole: UserRole | 'system';
  targetType: 'lead' | 'auth' | 'member' | 'sync' | 'security';
  targetId?: string;
  targetName?: string;
  summary: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

export interface SalesMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  title: string;
  avatar?: string;
  status: 'active' | 'paused'; // active: đang nhận lead tự động, paused: tạm ngưng nhận lead
  isOnlineForLead?: boolean;
  maxDailyLeads?: number;
  password?: string;
  color?: string;
  team?: string;
  managerId?: string;
  managerName?: string;
  managerEmail?: string;
  tpkdEmail?: string;
  username?: string;
  mustChangePassword?: boolean;
  lastPasswordChangeAt?: string;
  invitedAt?: string;
  emailSent?: boolean;
}

export interface ParsedNvkdMember {
  stt: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  role: UserRole;
  team?: string;
  status: 'active' | 'paused';
  username?: string;
  tempPassword: string;
  alreadyExists?: boolean;
}

export interface TransferLeadPayload {
  leadIds: string[];
  toAssignee: string;
  reason?: string;
}

export interface FilterState {
  search: string;
  status: string;
  project: string;
  productType: string;
  assignee: string;
  dataSource: string;
  dateRange: string;
}

export const DEMO_LEAD_PHONES = new Set([
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

export const DEMO_LEAD_NAMES = new Set([
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

export function isDemoLead(lead?: Partial<Lead> | null): boolean {
  if (!lead) return false;
  const id = (lead.id || '').toLowerCase().trim();
  // Filter out any demo lead IDs (lead-01..10, lead-mh5-01..14)
  if (/^lead-0[1-9]$|^lead-1[0-9]$|^lead-mh5-(0[1-9]|1[0-4])$/.test(id)) return true;
  const phone = (lead.phone || '').trim();
  if (DEMO_LEAD_PHONES.has(phone)) return true;
  const name = (lead.fullName || '').toLowerCase().trim();
  if (DEMO_LEAD_NAMES.has(name)) return true;
  if (name.includes('demo') || name.includes('mẫu') || name.includes('khách mẫu')) return true;
  const src = (lead.dataSource || '').toLowerCase();
  if (src.includes('demo') || src.includes('mẫu')) return true;
  return false;
}

export type ChatUrgentLevel = 'normal' | 'urgent' | 'deal_approval' | 'vip_client';

export interface InternalChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'tpkd' | 'sale';
  senderAvatar?: string;
  recipientId?: string; // ID người nhận (nếu chat 1-1 riêng tư)
  recipientName?: string;
  recipientRole?: 'admin' | 'tpkd' | 'sale';
  leadId?: string; // Khách hàng được gắn kèm trao đổi
  leadName?: string;
  leadPhone?: string;
  leadProject?: string;
  content: string;
  createdAt: string; // ISO string
  urgentLevel?: ChatUrgentLevel;
  readBy: string[]; // Danh sách userId đã đọc
}
