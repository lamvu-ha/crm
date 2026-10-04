import type { Lead, SalesMember } from '../types';

export const INITIAL_SALES_MEMBERS: SalesMember[] = [
  { id: 'sandbox-user-0', name: 'Quản trị thử nghiệm', username: 'admin', email: 'admin@sandbox.invalid', phone: '0000000010', role: 'admin', title: 'Quản trị', status: 'active', password: 'Demo@2026!', color: '#2563eb', team: 'Nhóm thử nghiệm', teamName: 'Nhóm thử nghiệm', isOnlineForLead: true, maxDailyLeads: 50 },
  { id: 'sandbox-user-1', name: 'Trưởng nhóm thử nghiệm', username: 'manager', email: 'manager@sandbox.invalid', phone: '0000000011', role: 'tpkd', title: 'Trưởng nhóm', status: 'active', password: 'Demo@2026!', color: '#7c3aed', team: 'Nhóm thử nghiệm', teamName: 'Nhóm thử nghiệm', isOnlineForLead: true, maxDailyLeads: 50 },
  { id: 'sandbox-user-2', name: 'Chuyên viên 01', username: 'sale01', email: 'sale01@sandbox.invalid', phone: '0000000012', role: 'sale', title: 'Chuyên viên', status: 'active', password: 'Demo@2026!', color: '#059669', team: 'Nhóm thử nghiệm', teamName: 'Nhóm thử nghiệm', managerId: 'sandbox-user-1', managerEmail: 'manager@sandbox.invalid', isOnlineForLead: true, maxDailyLeads: 50 },
  { id: 'sandbox-user-3', name: 'Chuyên viên 02', username: 'sale02', email: 'sale02@sandbox.invalid', phone: '0000000013', role: 'sale', title: 'Chuyên viên', status: 'active', password: 'Demo@2026!', color: '#ea580c', team: 'Nhóm thử nghiệm', teamName: 'Nhóm thử nghiệm', managerId: 'sandbox-user-1', managerEmail: 'manager@sandbox.invalid', isOnlineForLead: true, maxDailyLeads: 50 },
];

export function isLeadUnassigned(lead: Lead): boolean {
  return !lead.assignee || /^(chưa phân|unassigned|tự động phân bổ)$/i.test(lead.assignee.trim());
}
export function getTpkdForMember(member: SalesMember, sales: SalesMember[] = INITIAL_SALES_MEMBERS): SalesMember | null {
  if (member.role === 'tpkd') return member;
  return sales.find(candidate => candidate.role === 'tpkd' && (candidate.id === member.managerId || candidate.email === member.managerEmail || candidate.email === member.tpkdEmail || candidate.team === member.team)) || null;
}
export function getDailyAssignedCount(member: SalesMember, leads: Lead[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return leads.filter(lead => (lead.assignedToId === member.id || lead.assigneeEmail === member.email || lead.assignee === member.name) && (lead.assignedAt || lead.date).slice(0, 10) === today).length;
}
export function getEligibleSalesForDistribution(sales: SalesMember[], respectLimit = true, leads: Lead[] = []): SalesMember[] {
  return sales.filter(member => member.role === 'sale' && member.status === 'active' && member.isOnlineForLead !== false && (!respectLimit || getDailyAssignedCount(member, leads) < (member.maxDailyLeads ?? 50)));
}
export function getNextAssignee(sales: SalesMember[], leads: Lead[] = []): { assigneeName: string; member: SalesMember | null } {
  const eligible = getEligibleSalesForDistribution(sales, true, leads);
  const member = eligible.sort((a, b) => getDailyAssignedCount(a, leads) - getDailyAssignedCount(b, leads))[0] || null;
  return { assigneeName: member?.name || '', member };
}
export function distributeLeadsToSales(leadsToDistribute: Lead[], sales: SalesMember[], startIndex = 0, existingLeads: Lead[] = []): { distributedLeads: Lead[]; countPerSale: Record<string, number>; nextIndex: number } {
  const eligible = getEligibleSalesForDistribution(sales, true, existingLeads);
  const countPerSale: Record<string, number> = {};
  if (!eligible.length) return { distributedLeads: leadsToDistribute, countPerSale, nextIndex: startIndex };
  const assignedAt = new Date().toISOString();
  const distributedLeads = leadsToDistribute.map((lead, index) => {
    const member = eligible[(startIndex + index) % eligible.length];
    countPerSale[member.name] = (countPerSale[member.name] || 0) + 1;
    return { ...lead, assignee: member.name, assignedToId: member.id, assigneeEmail: member.email, assignedAt };
  });
  return { distributedLeads, countPerSale, nextIndex: (startIndex + leadsToDistribute.length) % eligible.length };
}
