import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Lead, Appointment, SalesMember } from '../types';
import { getTpkdForMember } from '../data/salesTeamData';

export interface WeeklyCallActivity {
  leadId: string;
  leadName: string;
  phone: string;
  project: string;
  callStatus: string;
  callDate: string;
  latestNote: string;
  potentialLevel?: 'Nóng' | 'Ấm' | 'Lạnh';
  status: string;
}

export interface WeeklyAppointmentActivity {
  appointmentId: string;
  leadName: string;
  phone: string;
  project: string;
  date: string;
  time: string;
  location: string;
  status: 'Chờ đi xem' | 'Đã xem' | 'Khách dời lịch' | 'Đã huỷ';
  note: string;
}

export interface SalesWeeklyActivityReportData {
  member: SalesMember;
  tpkd: SalesMember | null;
  gdkd: SalesMember | null;
  startDate: string;
  endDate: string;
  weekLabel: string;
  generatedAt: string;
  // Metrics
  totalLeadsAssigned: number;
  // Calls
  calls: WeeklyCallActivity[];
  totalCallsCount: number; // số khách đã gọi
  totalCallAttempts: number; // tổng lượt gọi
  successfulCallsCount: number;
  callbackCallsCount: number;
  unreachableCallsCount: number;
  callSuccessRate: number; // 0 - 100
  // Appointments
  appointments: WeeklyAppointmentActivity[];
  totalAppointmentsCount: number;
  completedAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  rescheduledOrCancelledCount: number;
  appointmentSuccessRate: number; // 0 - 100
  // Zalo & Pipeline
  zaloConnectedCount: number;
  hotLeadsCount: number;
  depositOrClosedCount: number;
  estimatedPipelineValue: number; // Triệu đồng
  // Custom Notes & Next Week Commitments
  selfAssessment: 'Xuất sắc' | 'Đạt chỉ tiêu' | 'Cần cố gắng';
  weeklyHighlights: string;
  difficultiesFaced: string;
  supervisorSupportNeeded: string;
  nextWeekTargetCalls: number;
  nextWeekTargetAppointments: number;
  nextWeekPlanNotes: string;
}

/**
 * Lấy khoảng thời gian của 1 tuần bất kỳ hoặc tuần hiện tại (Thứ 2 - Chủ Nhật)
 */
export function getWeekRangeFromDate(refDate: Date = new Date()): {
  start: Date;
  end: Date;
  startDateStr: string;
  endDateStr: string;
  weekLabel: string;
} {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ...
  const diffToMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const formatVn = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

  // Tính số thứ tự tuần trong năm (ISO Week)
  const tempDate = new Date(monday.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - (tempDate.getDay() + 6) % 7);
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber = 1 + Math.round(((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);

  return {
    start: monday,
    end: sunday,
    startDateStr: formatIso(monday),
    endDateStr: formatIso(sunday),
    weekLabel: `Tuần ${weekNumber} (${formatVn(monday)} - ${formatVn(sunday)})`
  };
}

const VN_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

/**
 * Ngày (YYYY-MM-DD, giờ Việt Nam) của một mốc trong lịch sử khách. Lịch sử có nhiều định dạng:
 * ISO đầy đủ "2026-10-04T03:00:00.000Z", ISO cắt phút "2026-10-04 03:00" (cũng là giờ UTC vì tạo từ toISOString),
 * ngày thuần "2026-10-04", hoặc kiểu vi-VN "13:45:12 4/10/2026" (đã là giờ địa phương).
 */
export function historyDayVN(raw?: string): string | null {
  const value = (raw || '').trim();
  const iso = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}:?\d{2})?$/.exec(value);
  if (iso) {
    const instant = new Date(`${iso[1]}T${iso[2]}${iso[3] || 'Z'}`);
    return Number.isNaN(instant.getTime()) ? iso[1] : VN_DAY.format(instant);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const vn = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value);
  return vn ? `${vn[3]}-${vn[2].padStart(2, '0')}-${vn[1].padStart(2, '0')}` : null;
}

// A logged "Cuộc gọi" entry that only schedules a callback is not a call made.
const isScheduleOnly = (content = '') => /lên lịch hẹn gọi lại/i.test(content);
function callOutcome(text: string): 'success' | 'callback' | 'unreachable' {
  if (/không nghe|máy bận|thuê bao|nhầm số/i.test(text)) return 'unreachable';
  if (/hẹn gọi lại|gọi lại sau/i.test(text)) return 'callback';
  return 'success';
}
const OUTCOME_LABEL = { success: 'Đã nghe máy', callback: 'Hẹn gọi lại', unreachable: 'Không liên lạc được' } as const;

/**
 * Trích xuất và tổng hợp hoạt động tuần của chuyên viên kinh doanh
 */
export function buildSalesWeeklyActivityData(
  member: SalesMember,
  allSales: SalesMember[],
  leads: Lead[],
  appointments: Appointment[],
  startDateStr: string,
  endDateStr: string,
  weekLabel: string,
  customNotes?: {
    selfAssessment?: 'Xuất sắc' | 'Đạt chỉ tiêu' | 'Cần cố gắng';
    weeklyHighlights?: string;
    difficultiesFaced?: string;
    supervisorSupportNeeded?: string;
    nextWeekTargetCalls?: number;
    nextWeekTargetAppointments?: number;
    nextWeekPlanNotes?: string;
  }
): SalesWeeklyActivityReportData {
  const memberNameLower = (member.name || '').toLowerCase().trim();
  const cleanMemberName = memberNameLower.replace(/\s*\(.*?\)\s*/g, '').trim();

  // Tìm TPKD & GĐKD
  const tpkd = getTpkdForMember(member, allSales);
  const gdkd = allSales.find((s) => s.title && /gđkd|giám\s*đốc\s*kinh\s*doanh/i.test(s.title))
    || allSales.find((s) => s.role === 'admin') || null;

  // Lọc leads của chuyên viên này
  const memberLeads = leads.filter((l) => {
    const a = (l.assignee || '').toLowerCase().trim();
    const cleanA = a.replace(/\s*\(.*?\)\s*/g, '').trim();
    return a === memberNameLower || cleanA === cleanMemberName;
  });

  // 1. Phân tích cuộc gọi trong tuần
  const calls: WeeklyCallActivity[] = [];
  let successfulCallsCount = 0;
  let callbackCallsCount = 0;
  let unreachableCallsCount = 0;

  const inRange = (day: string | null | undefined) => Boolean(day && day >= startDateStr && day <= endDateStr);
  let totalCallAttempts = 0;

  // Only logged calls ("Cuộc gọi" entries) inside the week count; one row per customer, judged by the latest call.
  memberLeads.forEach((lead) => {
    const callLogs = (lead.history || [])
      .filter((h) => h.type === 'Cuộc gọi' && !isScheduleOnly(h.content))
      .map((h) => ({ log: h, day: historyDayVN(h.date) }))
      .filter((entry) => inRange(entry.day));
    if (!callLogs.length) return;
    totalCallAttempts += callLogs.length;

    const latest = callLogs.reduce((best, entry) => (entry.day! > best.day! ? entry : best));
    const outcome = callOutcome((latest.log.content || '').split('\n')[0]); // the result sits on the first line
    if (outcome === 'success') successfulCallsCount++;
    else if (outcome === 'callback') callbackCallsCount++;
    else unreachableCallsCount++;

    calls.push({
      leadId: lead.id,
      leadName: lead.fullName,
      phone: lead.phone,
      project: lead.project || 'BĐS Trung Tâm',
      callStatus: OUTCOME_LABEL[outcome],
      callDate: latest.day!,
      latestNote: latest.log.content || lead.notes || 'Đã liên hệ tư vấn nhu cầu',
      potentialLevel: lead.potentialLevel,
      status: lead.status
    });
  });

  const totalCallsCount = calls.length;
  const callSuccessRate = totalCallsCount > 0 ? Math.round((successfulCallsCount / totalCallsCount) * 100) : 0;

  // 2. Phân tích Lịch hẹn trong tuần
  const memberAppointments = appointments.filter((app) => {
    const a = (app.assignee || '').toLowerCase().trim();
    const cleanA = a.replace(/\s*\(.*?\)\s*/g, '').trim();
    const isAssignee = a === memberNameLower || cleanA === cleanMemberName;
    const isLeadOfMember = memberLeads.some((l) => l.id === app.leadId);
    const inRange = app.date >= startDateStr && app.date <= endDateStr;
    return (isAssignee || isLeadOfMember) && inRange;
  });

  const appointmentItems: WeeklyAppointmentActivity[] = memberAppointments.map((app) => ({
    appointmentId: app.id,
    leadName: app.leadName,
    phone: app.leadPhone,
    project: app.project,
    date: app.date,
    time: app.time,
    location: app.location || 'Dự án / Nhà mẫu',
    status: app.status,
    note: app.note || 'Lịch hẹn trực tiếp'
  }));

  const totalAppointmentsCount = appointmentItems.length;
  const completedAppointmentsCount = appointmentItems.filter((a) => a.status === 'Đã xem').length;
  const upcomingAppointmentsCount = appointmentItems.filter((a) => a.status === 'Chờ đi xem').length;
  const rescheduledOrCancelledCount = appointmentItems.filter((a) => a.status === 'Khách dời lịch' || a.status === 'Đã huỷ').length;
  const appointmentSuccessRate = totalAppointmentsCount > 0 
    ? Math.round((completedAppointmentsCount / totalAppointmentsCount) * 100) 
    : (totalAppointmentsCount > 0 ? 50 : 0);

  // 3. Phân tích Zalo & Pipeline
  // Connected during the period; without a connection time, fall back to the customer's data date.
  const zaloConnectedCount = memberLeads.filter((l) => {
    const isConnected = l.zaloConnected || l.callStatus === 'Kết bạn Zalo';
    return isConnected && inRange(l.zaloConnectedAt ? historyDayVN(l.zaloConnectedAt) : l.date);
  }).length;

  // Snapshot "as of now" — shown as such in the report.
  const hotLeadsCount = memberLeads.filter((l) =>
    l.potentialLevel === 'Nóng' || l.callStatus === 'Khách quan tâm cao' || l.status === 'Hẹn xem BĐS'
  ).length;

  // Deposits/closings that happened inside the period: closing time, a status change logged then, or created then already closed.
  const reachedClosingInRange = (l: Lead) =>
    inRange(historyDayVN((l as Lead & { closedAt?: string }).closedAt)) ||
    (l.history || []).some((h) => inRange(historyDayVN(h.date)) && /sang:? "(Đàm phán \/ Cọc|Đã chốt)"/.test(h.content || '')) ||
    (!(l.history || []).length && inRange(l.date));
  const depositOrClosedCount = memberLeads.filter((l) =>
    (l.status === 'Đàm phán / Cọc' || l.status === 'Đã chốt') && reachedClosingInRange(l)
  ).length;

  const estimatedPipelineValue = memberLeads.reduce((sum, l) => sum + (Number(l.dealValue) || 0), 0);

  // Tự động đánh giá nếu chưa có tùy chỉnh
  let autoAssessment: 'Xuất sắc' | 'Đạt chỉ tiêu' | 'Cần cố gắng' = 'Cần cố gắng';
  if (completedAppointmentsCount >= 2 && totalCallsCount >= 20) {
    autoAssessment = 'Xuất sắc';
  } else if (totalAppointmentsCount >= 1 && totalCallsCount >= 10) {
    autoAssessment = 'Đạt chỉ tiêu';
  }

  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const generatedAt = `${pad(now.getHours())}:${pad(now.getMinutes())} ngày ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

  return {
    member,
    tpkd,
    gdkd,
    startDate: startDateStr,
    endDate: endDateStr,
    weekLabel,
    generatedAt,
    totalLeadsAssigned: memberLeads.length,
    calls,
    totalCallsCount,
    totalCallAttempts,
    successfulCallsCount,
    callbackCallsCount,
    unreachableCallsCount,
    callSuccessRate,
    appointments: appointmentItems,
    totalAppointmentsCount,
    completedAppointmentsCount,
    upcomingAppointmentsCount,
    rescheduledOrCancelledCount,
    appointmentSuccessRate,
    zaloConnectedCount,
    hotLeadsCount,
    depositOrClosedCount,
    estimatedPipelineValue,
    selfAssessment: customNotes?.selfAssessment || autoAssessment,
    weeklyHighlights: customNotes?.weeklyHighlights || `Đã liên hệ ${totalCallsCount} khách hàng, tạo được ${totalAppointmentsCount} lịch hẹn gặp thực tế.`,
    difficultiesFaced: customNotes?.difficultiesFaced || 'Một số khách hàng hẹn lại lịch xem dự án vào cuối tuần.',
    supervisorSupportNeeded: customNotes?.supervisorSupportNeeded || 'Hỗ trợ tư vấn chuyên sâu bảng hàng và chính sách chiết khấu tốt cho khách quan tâm cao.',
    nextWeekTargetCalls: customNotes?.nextWeekTargetCalls || Math.max(30, totalCallsCount + 10),
    nextWeekTargetAppointments: customNotes?.nextWeekTargetAppointments || Math.max(2, totalAppointmentsCount + 1),
    nextWeekPlanNotes: customNotes?.nextWeekPlanNotes || 'Tập trung bám sát danh sách khách quan tâm cao và chốt lịch tham quan dự án cuối tuần.'
  };
}

/**
 * Xuất element DOM thành file PDF và tự động tải xuống
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string = 'Bao_Cao_Tuan_Sales.pdf'
): Promise<void> {
  // Tạm ẩn các phần tử không in
  const noPrintEls = element.querySelectorAll('.no-print');
  noPrintEls.forEach((el) => {
    (el as HTMLElement).style.display = 'none';
  });

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x độ phân giải nét cao
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

    // Tính kích thước ảnh tương ứng với khổ A4 (lề 10mm mỗi bên)
    const margin = 8;
    const contentWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    // Trang đầu tiên
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    // Nếu nội dung dài hơn 1 trang A4, tự động thêm trang tiếp theo
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    pdf.save(fileName);
  } finally {
    // Khôi phục các phần tử no-print
    noPrintEls.forEach((el) => {
      (el as HTMLElement).style.display = '';
    });
  }
}
