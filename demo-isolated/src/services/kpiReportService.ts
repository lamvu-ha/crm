import { Lead, Appointment, SalesMember, KpiPolicy, SaleWeeklyKpiReport } from '../types';
import { getTpkdForMember } from '../data/salesTeamData';

export const DEFAULT_KPI_POLICY: KpiPolicy = {
  dailyZaloTarget: 2, // 1 ngày phải có 2 khách hàng quan tâm kết nối zalo
  weeklyMeetingTarget: 2, // sau 1 tuần phải có 2 khách hàng hẹn gặp trực tiếp hoặc tham quan dự án
  sundayReportEnabled: true,
  gdkdEmail: 'manager@sandbox.invalid', // GĐKD Trưởng nhóm thử nghiệm
  defaultAdminEmail: 'sale01@sandbox.invalid' // Admin Chuyên viên 01
};

export const STORAGE_KEY_KPI_POLICY = 'mayhomes_crm_kpi_policy_v1';

/**
 * Lấy khoảng thời gian của tuần hiện tại (từ Thứ 2 đến Chủ Nhật)
 */
export function getCurrentWeekRange(referenceDate: Date = new Date()): {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  weekLabel: string;
  isSunday: boolean;
} {
  const d = new Date(vietnamDate(referenceDate) + 'T12:00:00');
  const day = d.getDay(); // 0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7
  
  // Tính khoảng lùi về Thứ 2
  // Nếu là Chủ Nhật (day === 0), khoảng lùi là 6 ngày
  // Nếu là Thứ 2 (day === 1), khoảng lùi là 0 ngày
  const diffToMonday = day === 0 ? 6 : day - 1;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatIso = (date: Date) => 
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const formatVn = (date: Date) => 
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

  return {
    start: monday,
    end: sunday,
    startStr: formatIso(monday),
    endStr: formatIso(sunday),
    weekLabel: `Tuần từ ${formatVn(monday)} đến Chủ Nhật ${formatVn(sunday)}`,
    isSunday: day === 0
  };
}

/**
 * Kiểm tra xem khách hàng có phải đã kết nối Zalo hay không
 */
export function isLeadZaloConnected(lead: Lead): boolean {
  return Boolean(lead?.zaloConnected);
}

function vietnamDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)?.value;
  return part('year') + '-' + part('month') + '-' + part('day');
}

export function getLeadZaloDate(lead: Lead): string {
  return lead?.zaloConnectedAt ? vietnamDate(lead.zaloConnectedAt) : '';
}

/**
 * Tính toán báo cáo KPI tuần cho từng NVKD & TPKD
 */
export function calculateWeeklyKpiReports(
  sales: SalesMember[],
  leads: Lead[],
  appointments: Appointment[],
  policy: KpiPolicy = DEFAULT_KPI_POLICY,
  referenceDate: Date = new Date()
): SaleWeeklyKpiReport[] {
  const weekRange = getCurrentWeekRange(referenceDate);
  const todayStr = vietnamDate(referenceDate);

  const targetGdkdEmail = (policy?.gdkdEmail || 'manager@sandbox.invalid').toLowerCase().trim();

  // Tìm GĐKD (role = admin hoặc email = policy.gdkdEmail)
  const gdkd = sales.find((s) => 
    (s.email && s.email.toLowerCase().trim() === targetGdkdEmail) ||
    (s.title && /gđkd|giám\s*đốc\s*kinh\s*doanh/i.test(s.title))
  ) || sales.find((s) => s.role === 'admin') || {
    id: 'gdkd-default',
    name: 'Trưởng nhóm thử nghiệm',
    email: policy?.gdkdEmail || 'manager@sandbox.invalid',
    phone: '0000000011',
    role: 'admin' as const,
    title: 'Giám Đốc Kinh Doanh (GĐKD)',
    status: 'active' as const
  };

  // Đối tượng áp dụng chính sách: Cả NVKD (role === 'sale') và TPKD (role === 'tpkd')
  const targetMembers = (sales || []).filter((s) => s.status === 'active' && (s.role === 'sale' || s.role === 'tpkd'));

  return targetMembers.map((member) => {
    const memberNameLower = member.name.toLowerCase().trim();
    const cleanMemberName = memberNameLower.replace(/\s*\(.*?\)\s*/g, '').trim();

    // Lọc leads của thành viên này
    const memberLeads = leads.filter((l) => {
      if (l.assignedToId) return l.assignedToId === member.id;
      if (l.assigneeEmail) return l.assigneeEmail.toLowerCase() === member.email.toLowerCase();
      const a = (l.assignee || '').toLowerCase().trim();
      const cleanA = a.replace(/\s*\(.*?\)\s*/g, '').trim();
      return a === memberNameLower || cleanA === cleanMemberName;
    });

    // 1. Chỉ tiêu Zalo:
    // Tìm các leads đã kết nối Zalo
    const zaloLeads = memberLeads.filter(isLeadZaloConnected);

    // Zalo hôm nay
    const zaloLeadsToday = zaloLeads.filter((l) => {
      const zDate = getLeadZaloDate(l);
      return zDate === todayStr;
    });

    // Zalo trong tuần này
    const zaloLeadsInWeek = zaloLeads.filter((l) => {
      const zDate = getLeadZaloDate(l);
      return zDate >= weekRange.startStr && zDate <= weekRange.endStr;
    });

    // Đếm số ngày trong tuần đạt >= 2 khách Zalo
    const zaloCountsByDay: Record<string, number> = {};
    zaloLeadsInWeek.forEach((l) => {
      const d = getLeadZaloDate(l);
      zaloCountsByDay[d] = (zaloCountsByDay[d] || 0) + 1;
    });
    const weeklyZaloDaysMet = Object.values(zaloCountsByDay).filter((cnt) => cnt >= policy.dailyZaloTarget).length;

    // 2. Chỉ tiêu Hẹn gặp trực tiếp hoặc tham quan dự án:
    // Lọc appointments trong tuần này của thành viên
    const memberAppointmentsInWeek = appointments.filter((app) => {
      const a = (app.assignee || '').toLowerCase().trim();
      const cleanA = a.replace(/\s*\(.*?\)\s*/g, '').trim();
      const isAssignee = a === memberNameLower || cleanA === cleanMemberName;
      const isInWeek = app.date >= weekRange.startStr && app.date <= weekRange.endStr;
      const isValidStatus = app.status !== 'Đã huỷ' && app.status !== 'Khách dời lịch';
      return isAssignee && isInWeek && isValidStatus;
    });

    const weeklyMeetingCount = memberAppointmentsInWeek.length;

    // Tìm TPKD phụ trách thành viên này (Đảm bảo NVKD của TPKD nào thì báo cáo cho TPKD đó)
    const isMarketing = (member.team || '').toLowerCase().includes('marketing') || (member.title || '').toLowerCase().includes('marketing') || member.role === 'admin';
    const memberTpkd = isMarketing ? null : getTpkdForMember(member, sales);
    const assignedTpkdEmail = isMarketing ? (gdkd.email || policy?.gdkdEmail || 'manager@sandbox.invalid') : (memberTpkd?.email || '');

    const isDailyZaloMetToday = zaloLeadsToday.length >= policy.dailyZaloTarget;
    const isWeeklyMeetingMet = weeklyMeetingCount >= policy.weeklyMeetingTarget;

    // Đánh giá tổng thể
    let overallStatus: 'ĐẠT XUẤT SẮC' | 'ĐẠT CHỈ TIÊU' | 'CHƯA ĐẠT' | 'CẢNH BÁO VI PHẠM';
    if (weeklyMeetingCount > policy.weeklyMeetingTarget && weeklyZaloDaysMet >= 6 && zaloLeadsInWeek.length > policy.dailyZaloTarget * 6) {
      overallStatus = 'ĐẠT XUẤT SẮC';
    } else if (isWeeklyMeetingMet && weeklyZaloDaysMet >= 6) {
      overallStatus = 'ĐẠT CHỈ TIÊU';
    } else if (zaloLeadsInWeek.length === 0 && weeklyMeetingCount === 0) {
      overallStatus = 'CẢNH BÁO VI PHẠM';
    } else {
      overallStatus = 'CHƯA ĐẠT';
    }

    return {
      member,
      tpkdMember: memberTpkd,
      gdkdMember: gdkd,
      tpkdEmail: assignedTpkdEmail,
      gdkdEmail: gdkd.email || policy?.gdkdEmail || 'manager@sandbox.invalid',
      saleEmail: member.email,
      dailyZaloCountToday: zaloLeadsToday.length,
      dailyZaloTarget: policy.dailyZaloTarget,
      isDailyZaloMetToday,
      weeklyZaloCount: zaloLeadsInWeek.length,
      weeklyZaloTarget: policy.dailyZaloTarget * 6, // 6 ngày làm việc = 12 khách Zalo/tuần
      weeklyZaloDaysMet,
      weeklyMeetingCount,
      weeklyMeetingTarget: policy.weeklyMeetingTarget,
      isWeeklyMeetingMet,
      overallStatus,
      leadsWithZalo: zaloLeadsInWeek.map((l) => ({
        leadId: l.id,
        fullName: l.fullName,
        phone: l.phone,
        project: l.project,
        date: getLeadZaloDate(l),
        status: l.status
      })),
      appointmentsInWeek: memberAppointmentsInWeek.map((a) => ({
        appointmentId: a.id,
        leadName: a.leadName,
        leadPhone: a.leadPhone,
        project: a.project,
        date: a.date,
        time: a.time,
        location: a.location,
        status: a.status
      }))
    };
  });
}

/**
 * Tạo nội dung Email HTML báo cáo tối Chủ Nhật cho từng Sale
 * Gửi: GĐKD và TPKD tương ứng | CC: Chính sale đó
 */
export function generateSundayReportEmailHtml(
  report: SaleWeeklyKpiReport,
  weekRangeStr: string,
  appUrl: string = window.location.origin
): string {
  const { member, tpkdMember, gdkdMember, dailyZaloTarget, weeklyMeetingTarget, overallStatus } = report;
  const loginUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

  const statusBadge = 
    overallStatus === 'ĐẠT XUẤT SẮC' 
      ? '<span style="background-color: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px;">🏆 ĐẠT XUẤT SẮC</span>'
      : overallStatus === 'ĐẠT CHỈ TIÊU'
        ? '<span style="background-color: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px;">✓ ĐẠT CHỈ TIÊU TUẦN</span>'
        : overallStatus === 'CHƯA ĐẠT'
          ? '<span style="background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px;">⚠️ CHƯA ĐẠT CHỈ TIÊU</span>'
          : '<span style="background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px;">🚨 CẢNH BÁO VI PHẠM KPI</span>';

  const zaloRowsHtml = report.leadsWithZalo.length > 0
    ? report.leadsWithZalo.slice(0, 8).map((l, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px; color: #64748b; font-size: 12px;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: 600; color: #0f172a; font-size: 13px;">${l.fullName}</td>
          <td style="padding: 8px; font-family: monospace; color: #475569; font-size: 12px;">${l.phone}</td>
          <td style="padding: 8px; color: #0284c7; font-size: 12px;">${l.project}</td>
          <td style="padding: 8px; color: #16a34a; font-size: 12px; font-weight: 600;">${l.date}</td>
          <td style="padding: 8px; color: #64748b; font-size: 12px;">${l.status}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="6" style="padding: 14px; text-align: center; color: #94a3b8; font-style: italic;">Chưa ghi nhận khách hàng kết nối Zalo trong tuần này</td></tr>`;

  const meetingRowsHtml = report.appointmentsInWeek.length > 0
    ? report.appointmentsInWeek.map((a, idx) => `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px; color: #64748b; font-size: 12px;">${idx + 1}</td>
          <td style="padding: 8px; font-weight: 600; color: #0f172a; font-size: 13px;">${a.leadName}</td>
          <td style="padding: 8px; font-family: monospace; color: #475569; font-size: 12px;">${a.leadPhone}</td>
          <td style="padding: 8px; color: #7c3aed; font-weight: 600; font-size: 12px;">${a.project}</td>
          <td style="padding: 8px; color: #0f172a; font-weight: 600; font-size: 12px;">${a.date} (${a.time})</td>
          <td style="padding: 8px; color: #0284c7; font-size: 12px;">${a.location}</td>
          <td style="padding: 8px; color: #059669; font-weight: 600; font-size: 12px;">${a.status}</td>
        </tr>
      `).join('')
    : `<tr><td colspan="7" style="padding: 14px; text-align: center; color: #ef4444; font-weight: 600;">Chưa ghi nhận lịch hẹn gặp trực tiếp / tham quan dự án trong tuần này (Chỉ tiêu: tối thiểu 2 cuộc)</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo tuần KPI Zalo & Lịch hẹn - ${member.name}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="680" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header Branding -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid #d97706;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">SALEPRO HCM_E05</h1>
              <div style="display: inline-block; margin-top: 6px; padding: 4px 14px; background-color: rgba(217, 119, 6, 0.2); border: 1px solid #d97706; border-radius: 20px; color: #f59e0b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">
                BĐS PRO (CRM)
              </div>
              <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">
                BÁO CÁO TUẦN: KẾT QUẢ THỰC HIỆN CHÍNH SÁCH KPI NVKD &amp; TPKD
              </p>
              <p style="color: #cbd5e1; font-size: 12px; margin: 4px 0 0 0; font-weight: 500;">
                📅 Thời gian chốt số liệu: <strong>Tối Chủ Nhật (${weekRangeStr})</strong>
              </p>
            </td>
          </tr>

          <!-- Recipients Notice Box -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
              <table width="100%" border="0" cellspacing="0" cellpadding="2">
                <tr>
                  <td width="18%" style="font-weight: 700; color: #0f172a;">Gửi đến (To):</td>
                  <td width="82%">
                    ${
                      member.role === 'tpkd'
                        ? `<strong>GĐKD:</strong> ${gdkdMember?.name || 'Trưởng nhóm thử nghiệm'} (&lt;${report.gdkdEmail}&gt;)`
                        : `<strong>TPKD:</strong> ${tpkdMember?.name || 'Chuyên viên 01'} (&lt;${report.tpkdEmail}&gt;)`
                    }
                  </td>
                </tr>
                <tr>
                  <td style="font-weight: 700; color: #0f172a;">Đồng gửi (Cc):</td>
                  <td>
                    ${
                      member.role === 'tpkd'
                        ? `<strong>Trưởng phòng thực hiện:</strong> ${member.name} (&lt;${report.saleEmail}&gt;)`
                        : `<strong>GĐKD:</strong> ${gdkdMember?.name || 'Trưởng nhóm thử nghiệm'} (&lt;${report.gdkdEmail}&gt;) &amp; <strong>Chuyên viên thực hiện:</strong> ${member.name} (&lt;${report.saleEmail}&gt;)`
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 24px 28px; color: #334155;">
              <!-- Employee Info Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="4">
                      <tr>
                        <td width="65%">
                          <div style="font-size: 16px; font-weight: 800; color: #0f172a;">
                            ${member.name}
                            <span style="font-size: 12px; font-weight: normal; color: #64748b; margin-left: 6px;">(${member.role === 'tpkd' ? 'Trưởng Phòng Kinh Doanh' : 'Chuyên Viên Kinh Doanh'})</span>
                          </div>
                          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                            Đội nhóm: <strong>${member.team || 'MAY_MH5.19'}</strong> • SĐT: <strong>${member.phone}</strong>
                          </div>
                        </td>
                        <td width="35%" align="right">
                          ${statusBadge}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Policy Rule Highlight -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 12px 16px; font-size: 13px; color: #92400e; line-height: 1.5;">
                    📌 <strong>QUY ĐỊNH CHÍNH SÁCH KPI BẮT BUỘC:</strong><br/>
                    • <strong>Chỉ tiêu ngày:</strong> 1 ngày phải có tối thiểu <strong>2 khách hàng quan tâm kết nối Zalo</strong>.<br/>
                    • <strong>Chỉ tiêu tuần:</strong> Sau 1 tuần phải có tối thiểu <strong>2 khách hàng hẹn gặp trực tiếp hoặc tham quan dự án</strong>.
                  </td>
                </tr>
              </table>

              <!-- KPI Metric Summary Grid -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <!-- Metric 1: Zalo Daily Target -->
                  <td width="48%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; vertical-align: top;">
                    <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase;">
                      📱 Chỉ tiêu 1: Kết nối Zalo
                    </div>
                    <div style="margin-top: 8px; font-size: 26px; font-weight: 900; color: #15803d;">
                      ${report.weeklyZaloCount} <span style="font-size: 14px; font-weight: normal; color: #4b5563;">khách trong tuần</span>
                    </div>
                    <div style="margin-top: 6px; font-size: 12px; color: #14532d;">
                      • Chỉ tiêu: <strong>${dailyZaloTarget} khách/ngày</strong><br/>
                      • Số ngày đạt chỉ tiêu: <strong>${report.weeklyZaloDaysMet}/6 ngày làm việc</strong><br/>
                      • Kết nối hôm nay: <strong>${report.dailyZaloCountToday}/${dailyZaloTarget} khách</strong> ${report.isDailyZaloMetToday ? '✓' : '⚠️'}
                    </div>
                  </td>

                  <td width="4%"></td>

                  <!-- Metric 2: Weekly Direct Meetings -->
                  <td width="48%" style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 16px; vertical-align: top;">
                    <div style="font-size: 12px; font-weight: 700; color: #6b21a8; text-transform: uppercase;">
                      🤝 Chỉ tiêu 2: Hẹn gặp / Dự án
                    </div>
                    <div style="margin-top: 8px; font-size: 26px; font-weight: 900; color: ${report.isWeeklyMeetingMet ? '#7e22ce' : '#dc2626'};">
                      ${report.weeklyMeetingCount} / ${weeklyMeetingTarget} <span style="font-size: 14px; font-weight: normal; color: #4b5563;">cuộc hẹn</span>
                    </div>
                    <div style="margin-top: 6px; font-size: 12px; color: #581c87;">
                      • Chỉ tiêu tuần: <strong>Tối thiểu ${weeklyMeetingTarget} khách gặp/xem</strong><br/>
                      • Đánh giá: <strong>${report.isWeeklyMeetingMet ? 'ĐÃ ĐẠT CHỈ TIÊU TUẦN ✓' : 'CHƯA ĐẠT CHỈ TIÊU TUẦN ⚠️'}</strong>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Section 1 Detail: Direct Meeting / Project Visits -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px; display: flex; align-items: center;">
                  📍 CHI TIẾT LỊCH HẸN GẶP TRỰC TIẾP &amp; THAM QUAN DỰ ÁN TRONG TUẦN (${report.appointmentsInWeek.length})
                </div>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 12px;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; text-align: left;">
                      <th style="padding: 8px;">STT</th>
                      <th style="padding: 8px;">Khách hàng</th>
                      <th style="padding: 8px;">SĐT</th>
                      <th style="padding: 8px;">Dự án</th>
                      <th style="padding: 8px;">Thời gian</th>
                      <th style="padding: 8px;">Địa điểm</th>
                      <th style="padding: 8px;">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${meetingRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Section 2 Detail: Zalo Connected Leads -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                  💬 DANH SÁCH KHÁCH HÀNG KẾT NỐI ZALO TRONG TUẦN (${report.leadsWithZalo.length})
                </div>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-size: 12px;">
                  <thead>
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569; text-align: left;">
                      <th style="padding: 8px;">STT</th>
                      <th style="padding: 8px;">Khách hàng</th>
                      <th style="padding: 8px;">SĐT</th>
                      <th style="padding: 8px;">Dự án quan tâm</th>
                      <th style="padding: 8px;">Ngày Zalo</th>
                      <th style="padding: 8px;">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${zaloRowsHtml}
                  </tbody>
                </table>
              </div>

              <!-- Director Instruction Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">
                      📋 Ý KIẾN CHỈ ĐẠO &amp; KẾ HOẠCH TUẦN TIẾP THEO
                    </div>
                    <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.6;">
                      ${
                        overallStatus === 'ĐẠT XUẤT SẮC' || overallStatus === 'ĐẠT CHỈ TIÊU'
                          ? `Chúc mừng chuyên viên <strong>${member.name}</strong> đã hoàn thành tốt chính sách KPI của tuần. Đề nghị TPKD tiếp tục đôn đốc, hỗ trợ chốt cọc trong các buổi hẹn tiếp theo.`
                          : `Chuyên viên <strong>${member.name}</strong> chưa đạt đầy đủ chỉ tiêu tuần (Zalo hoặc Lịch hẹn trực tiếp). Đề nghị TPKD (${tpkdMember?.name || 'Chuyên viên 01'}) tổ chức họp 1-1 vào sáng Thứ 2 đầu tuần để rà soát nguồn khách, chỉnh sửa kịch bản gọi điện và hỗ trợ chốt lịch hẹn.`
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Login CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                      Xem khách hàng
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">Báo cáo tự động tối Chủ Nhật hàng tuần theo chính sách quản trị của SALEPRO HCM_E05.</p>
              <p style="margin: 0; font-weight: 600; color: #64748b;">© 2026 SALEPRO HCM_E05 • Hệ thống Quản trị BĐS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
