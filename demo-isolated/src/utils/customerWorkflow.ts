import type { Lead, Appointment } from '../types';

export function profileIssues(lead: Partial<Lead>): string[] {
  const issues: string[] = [];
  if (!lead.fullName?.trim()) issues.push('Thiếu tên');
  const phone = (lead.phone || '').replace(/\D/g, '');
  if (phone.length < 9 || phone.length > 15) issues.push('SĐT không hợp lệ');
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) issues.push('Email không hợp lệ');
  if (!lead.project?.trim()) issues.push('Thiếu dự án');
  if (!lead.budget?.trim()) issues.push('Thiếu ngân sách');
  if (!lead.notes?.trim()) issues.push('Thiếu nhu cầu / ghi chú');
  return issues;
}

export function neglectedCustomer(lead: Lead, now: number): boolean {
  if (!['Quan tâm', 'Tiềm năng', 'Đang chăm sóc', 'Đàm phán / Cọc'].includes(lead.status)) return false;
  const interactions = (lead.history || []).filter(log => ['Cuộc gọi', 'Zalo', 'Gặp mặt / Xem nhà', 'Gửi báo giá'].includes(log.type));
  const times = interactions.map(log => Date.parse(log.date)).filter(Number.isFinite);
  const last = times.length ? Math.max(...times) : Date.parse(lead.firstReportedAt || lead.assignedAt || lead.createdAt || lead.date);
  const hasNextStep = lead.callbackReminder?.status === 'pending' || lead.zaloReminder?.status === 'pending' || lead.periodicFollowUp?.status === 'active';
  return !hasNextStep && Number.isFinite(last) && now - last >= 3 * 86400000;
}

export function appointmentConflicts(candidate: Pick<Appointment, 'date' | 'time' | 'assignee'>, appointments: Appointment[], durationMinutes = 60): Appointment[] {
  const start = Date.parse(`${candidate.date}T${candidate.time}`);
  if (!Number.isFinite(start)) return [];
  return appointments.filter(app => app.status !== 'Đã huỷ' && app.status !== 'Khách dời lịch' && app.assignee.trim().toLowerCase() === candidate.assignee.trim().toLowerCase() && Math.abs(Date.parse(`${app.date}T${app.time}`) - start) < durationMinutes * 60000);
}

const changeFields = {fullName: 'Tên', phone: 'SĐT', email: 'Email', status: 'Trạng thái', assignee: 'Phụ trách', project: 'Dự án', budget: 'Ngân sách', notes: 'Ghi chú'} as const;
export function describeLeadChanges(before: Lead, after: Lead): string[] {
  return Object.entries(changeFields).flatMap(([field, label]) => {
    const key = field as keyof typeof changeFields;
    const oldValue = String(before[key] || '').trim();
    const newValue = String(after[key] || '').trim();
    return oldValue === newValue ? [] : [`${label}: “${oldValue || 'Trống'}” → “${newValue || 'Trống'}”`];
  });
}
