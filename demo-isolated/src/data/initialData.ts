import type { Appointment, Lead, ProductType } from '../types';
import { INITIAL_SALES_MEMBERS } from './salesTeamData';

export const LEAD_STATUSES = ['Khách mới', 'Không nghe máy', 'Quan tâm', 'Tiềm năng', 'Gọi lại sau', 'Đang chăm sóc', 'Hẹn xem BĐS', 'Đàm phán / Cọc', 'Đã chốt', 'Không nhu cầu', 'Khác'];
export const PRODUCT_TYPES: ProductType[] = ['Nhà phố trung tâm', 'Căn hộ chung cư', 'Biệt thự / Villa', 'Đất nền', 'Shophouse'];
export const PROJECTS = ['Dự án mẫu A', 'Dự án mẫu B', 'Dự án mẫu C'];
export const DATA_SOURCES = ['Facebook Ads', 'Google Ads', 'Hotline', 'Zalo', 'Giới thiệu'];
export const ASSIGNEES = INITIAL_SALES_MEMBERS.filter(member => member.role === 'sale').map(member => member.name);

export function getAllDataSources(leads: Lead[] = []): string[] {
  return [...new Set([...DATA_SOURCES, ...leads.map(lead => lead.dataSource).filter(Boolean)])];
}

const CUSTOM_PRODUCT_TYPES_KEY = 'crm_demo_custom_product_types';
export function getAllProductTypes(leads: Lead[] = []): string[] {
  let custom: string[] = [];
  try { custom = JSON.parse(localStorage.getItem(CUSTOM_PRODUCT_TYPES_KEY) || '[]'); } catch {}
  return [...new Set([...PRODUCT_TYPES, ...custom, ...leads.map(lead => lead.productType).filter(Boolean)])];
}
export function saveCustomProductType(value: string): void {
  const type = value.trim();
  if (!type) return;
  const types = getAllProductTypes();
  if (!types.some(item => item.toLocaleLowerCase('vi') === type.toLocaleLowerCase('vi'))) {
    try { localStorage.setItem(CUSTOM_PRODUCT_TYPES_KEY, JSON.stringify([...types, type])); } catch {}
  }
}
export function getAllProjects(leads: Lead[] = []): string[] {
  return [...new Set([...PROJECTS, ...leads.map(lead => lead.project).filter(Boolean)])];
}
export function isProductTypeMatch(value: string, filter: string): boolean {
  if (!filter) return true;
  const normalized = value.toLocaleLowerCase('vi');
  const selected = filter.toLocaleLowerCase('vi');
  if (selected === 'nhà phố') return normalized.includes('nhà phố');
  if (selected === 'biệt thự') return normalized.includes('biệt thự') || normalized.includes('villa');
  return normalized === selected || normalized.includes(selected);
}

// Only synthetic records are used in the isolated demo.
export const INITIAL_LEADS: Lead[] = Array.from({ length: 24 }, (_, index) => {
  const sale = INITIAL_SALES_MEMBERS[2 + index % 2];
  const date = new Date();
  date.setDate(date.getDate() - index % 14);
  return {
    id: `sandbox-customer-${String(index + 1).padStart(2, '0')}`,
    stt: index + 1,
    date: date.toISOString().slice(0, 10),
    fullName: `Khách thử nghiệm ${String(index + 1).padStart(2, '0')}`,
    phone: `000000${String(index + 1001).padStart(4, '0')}`,
    dataSource: ['Facebook Ads', 'Google Ads', 'Hotline'][index % 3],
    productType: PRODUCT_TYPES[index % PRODUCT_TYPES.length],
    status: LEAD_STATUSES[index % 5],
    project: PROJECTS[index % PROJECTS.length],
    assignee: sale.name,
    assignedToId: sale.id,
    assigneeEmail: sale.email,
    notes: 'Bản ghi giả lập cho môi trường demo.',
    budget: '3 - 5 tỷ',
    history: [] as Lead['history'],
  };
});
export const INITIAL_APPOINTMENTS: Appointment[] = [];
