import fs from 'fs';
import path from 'path';
import { AuthUser, SystemRole, mapLegacyToSystemRole, UserStatus } from './types';

const DATA_DIR = process.cwd();
const SALES_FILE = path.join(DATA_DIR, 'sales_members.json');
const SYSTEM_LOGS_FILE = path.join(DATA_DIR, 'system_logs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'crm_settings.json');
const FEATURE_FLAGS_FILE = path.join(DATA_DIR, 'feature_flags.json');
const UI_CONFIGS_FILE = path.join(DATA_DIR, 'ui_configs.json');
const CUSTOM_FIELDS_FILE = path.join(DATA_DIR, 'custom_fields.json');
const KPI_TARGETS_FILE = path.join(DATA_DIR, 'kpi_targets.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const TRANSFER_REQUESTS_FILE = path.join(DATA_DIR, 'transfer_requests.json');

// Interface definitions mirroring schema.prisma
export interface DbUser {
  id: string;
  email: string;
  phone?: string;
  passwordHash: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  role: SystemRole;
  status: UserStatus;
  teamId?: string;
  teamName?: string;
  isOnlineForLead: boolean;
  maxDailyLeads: number;
  mustChangePassword?: boolean;
  color?: string;
  managerId?: string;
  managerName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DbTeam {
  id: string;
  name: string;
  description?: string;
  leaderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbKpiTarget {
  id: string;
  userId: string;
  month: number;
  year: number;
  targetRevenue: number;
  achievedRevenue: number;
  targetDeals: number;
  achievedDeals: number;
  wonCredits?: Record<string, number>;
  targetCalls: number;
  achievedCalls: number;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbFeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  allowedRoles: SystemRole[];
  configJson?: Record<string, any>;
  updatedAt: string;
}

export interface DbUiConfig {
  id: string;
  sectionKey: string;
  title: string;
  data: Record<string, any>;
  isActive: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface DbCustomFieldDefinition {
  id: string;
  entityType: 'LEAD' | 'USER';
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'BOOLEAN';
  options?: string[];
  isRequired: boolean;
  isFilterable: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface DbAuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Helper file read/write utilities with safe fallback
// -------------------------------------------------------------
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    throw err;
  }
}

// Default system Feature Flags matching Specification
const DEFAULT_FEATURE_FLAGS: DbFeatureFlag[] = [
  {
    id: 'ff-1',
    key: 'ENABLE_PUBLIC_LEAD_POOL',
    name: 'Kho khách hàng chung (Public Pool)',
    description: 'Tự động thu hồi lead không chăm sóc sau thời gian quy định vào kho chung để các Sales khác có thể nhận (Claim)',
    isEnabled: true,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_LEADER', 'SALES_AGENT'],
    configJson: { reclaimDays: 7, notifyBeforeHours: 24 },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ff-2',
    key: 'DATA_MASKING_SALES_AGENT',
    name: 'Che số điện thoại khách hàng cho NVKD',
    description: 'Ẩn 3 số giữa của SĐT với SALES_AGENT, yêu cầu bấm để mở và ghi nhận Audit Log',
    isEnabled: true,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_LEADER', 'SALES_AGENT'],
    configJson: { maxRevealsPerHour: 30 },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ff-3',
    key: 'ENABLE_ROUND_ROBIN_ASSIGNMENT',
    name: 'Phân bổ khách hàng tự động xoay vòng (Round-Robin)',
    description: 'Tự động chia khách cho chuyên viên kinh doanh đang Online và chưa vượt định mức ngày',
    isEnabled: true,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_LEADER'],
    configJson: { defaultMaxDailyLeads: 50 },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ff-4',
    key: 'ENABLE_AI_ASSISTANT',
    name: 'Trợ lý AI Gemini phân tích khách hàng & chính tả',
    description: 'Chuẩn hóa ghi chú cuộc gọi, nhận diện nhu cầu đầu tư và dự báo xác suất chốt cọc',
    isEnabled: true,
    allowedRoles: ['SUPER_ADMIN', 'TEAM_LEADER', 'SALES_AGENT'],
    configJson: { model: 'gemini-2.5-flash' },
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ff-5',
    key: 'ALLOW_SALES_EXPORT',
    name: 'Cho phép nhân viên kinh doanh xuất file Excel/CSV',
    description: 'Mặc định chỉ SUPER_ADMIN được phép xuất file để bảo vệ tài sản dữ liệu',
    isEnabled: false,
    allowedRoles: ['SUPER_ADMIN'],
    configJson: {},
    updatedAt: new Date().toISOString()
  }
];

// Default UI Configurations
const DEFAULT_UI_CONFIGS: DbUiConfig[] = [
  {
    id: 'ui-1',
    sectionKey: 'THEME_SETTINGS',
    title: 'Cấu hình giao diện & Thương hiệu',
    data: {
      brandName: 'SALEPRO HCM_E05',
      companySubtitle: 'Hệ thống Quản trị & Phân bổ Lead BĐS Chuyên nghiệp',
      primaryColor: '#0284c7',
      accentColor: '#f59e0b',
      logoUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=120&auto=format&fit=crop&q=80',
      announcementBanner: {
        enabled: true,
        text: '🔥 Chiến dịch Khai Xuân 2025: Thưởng nóng 10 triệu đồng cho hợp đồng cọc đầu tiên!',
        type: 'info'
      }
    },
    isActive: true,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ui-2',
    sectionKey: 'SIDEBAR_MENU',
    title: 'Cấu hình Menu Điều Hướng',
    data: {
      items: [
        { key: 'table', label: 'Danh Sách Khách', icon: 'Table', minRole: 'SALES_AGENT' },
        { key: 'pipeline', label: 'Phễu Bán Hàng', icon: 'Kanban', minRole: 'SALES_AGENT' },
        { key: 'calendar', label: 'Lịch Hẹn Đi Xem', icon: 'CalendarDays', minRole: 'SALES_AGENT' },
        { key: 'performance', label: 'Hiệu Suất & KPI', icon: 'BarChart3', minRole: 'TEAM_LEADER' },
        { key: 'team', label: 'Đội Ngũ Kinh Doanh', icon: 'Users', minRole: 'TEAM_LEADER' },
        { key: 'reports', label: 'Báo Cáo Tiếp Thị', icon: 'FileSpreadsheet', minRole: 'SUPER_ADMIN' },
        { key: 'logs', label: 'Nhật Ký Hệ Thống', icon: 'Shield', minRole: 'SUPER_ADMIN' }
      ]
    },
    isActive: true,
    updatedAt: new Date().toISOString()
  }
];

// Default Custom Field Definitions
const DEFAULT_CUSTOM_FIELDS: DbCustomFieldDefinition[] = [
  {
    id: 'cf-1',
    entityType: 'LEAD',
    fieldKey: 'interested_project',
    fieldLabel: 'Dự án quan tâm',
    fieldType: 'SELECT',
    options: ['Vinhomes Grand Park', 'The Global City', 'Masteri Centre Point', 'Eaton Park', 'Khu Đô Thị Sala'],
    isRequired: false,
    isFilterable: true,
    displayOrder: 1,
    isActive: true
  },
  {
    id: 'cf-2',
    entityType: 'LEAD',
    fieldKey: 'budget_range',
    fieldLabel: 'Khoảng tài chính',
    fieldType: 'SELECT',
    options: ['Dưới 3 tỷ', '3 - 5 tỷ', '5 - 10 tỷ', '10 - 20 tỷ', 'Trên 20 tỷ'],
    isRequired: false,
    isFilterable: true,
    displayOrder: 2,
    isActive: true
  },
  {
    id: 'cf-3',
    entityType: 'LEAD',
    fieldKey: 'investment_purpose',
    fieldLabel: 'Mục đích mua',
    fieldType: 'SELECT',
    options: ['Ở thực', 'Đầu tư cho thuê', 'Đầu tư lướt sóng', 'Tích sản lâu dài'],
    isRequired: false,
    isFilterable: true,
    displayOrder: 3,
    isActive: true
  }
];

// -------------------------------------------------------------
// Database Repositories
// -------------------------------------------------------------
export class Database {
  // Users repository
  static getUsers(): DbUser[] {
    const raw = readJsonFile<any[]>(SALES_FILE, []);
    return raw.map((item) => {
      const role = mapLegacyToSystemRole(item.role);
      const isStatusActive = (item.status || 'active').toLowerCase() === 'active';
      return {
        id: item.id || `user-${Date.now()}`,
        email: item.email || '',
        phone: item.phone,
        passwordHash: item.passwordHash || item.password || '',
        fullName: item.name || item.fullName || 'Chuyên viên BĐS',
        username: item.username,
        avatarUrl: item.avatar || item.avatarUrl,
        role: role,
        status: isStatusActive ? 'ACTIVE' : 'INACTIVE',
        teamId: item.teamId || (item.team ? item.team.toLowerCase().replace(/\s+/g, '-') : undefined),
        teamName: item.team,
        isOnlineForLead: item.isOnlineForLead !== false,
        maxDailyLeads: item.maxDailyLeads ?? 50,
        mustChangePassword: Boolean(item.mustChangePassword),
        color: item.color,
        managerId: item.managerId,
        managerName: item.managerName,
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString()
      };
    });
  }

  static findUserById(id: string): DbUser | null {
    const users = this.getUsers();
    return users.find((u) => u.id === id) || null;
  }

  static findUserByIdentifier(identifier: string): { user: DbUser; rawMember: any } | null {
    const cleanInput = String(identifier).trim().toLowerCase();
    const cleanInputNorm = cleanInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    const inputDigits = cleanInput.replace(/[^0-9]/g, '');

    const rawMembers = readJsonFile<any[]>(SALES_FILE, []);
    for (const raw of rawMembers) {
      const email = (raw.email || '').toLowerCase().trim();
      const emailNorm = email.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      const name = (raw.name || '').toLowerCase().trim();
      const nameNorm = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
      const username = (raw.username || '').toLowerCase().trim();
      const phoneDigits = (raw.phone || '').replace(/[^0-9]/g, '');
      const id = (raw.id || '').toLowerCase().trim();

      const isMatch =
        (username && (username === cleanInput || username === cleanInputNorm)) ||
        email === cleanInput ||
        emailNorm === cleanInputNorm ||
        email.split('@')[0] === cleanInput ||
        (inputDigits.length >= 9 && phoneDigits === inputDigits) ||
        name === cleanInput ||
        nameNorm === cleanInputNorm ||
        id === cleanInput ||
        (cleanInput === 'admin' && (raw.role === 'admin' || username === 'admin'));

      if (isMatch) {
        const role = mapLegacyToSystemRole(raw.role);
        const user: DbUser = {
          id: raw.id,
          email: raw.email,
          phone: raw.phone,
          passwordHash: raw.passwordHash || raw.password || '',
          fullName: raw.name,
          username: raw.username,
          avatarUrl: raw.avatar,
          role: role,
          status: (raw.status || 'active').toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE',
          teamId: raw.teamId,
          teamName: raw.team,
          isOnlineForLead: raw.isOnlineForLead !== false,
          maxDailyLeads: raw.maxDailyLeads ?? 50,
          mustChangePassword: Boolean(raw.mustChangePassword),
          color: raw.color,
          managerId: raw.managerId,
          managerName: raw.managerName
        };
        return { user, rawMember: raw };
      }
    }
    return null;
  }

  static updateUserPassword(userId: string, newHash: string, clearMustChange: boolean = true): boolean {
    const rawMembers = readJsonFile<any[]>(SALES_FILE, []);
    const index = rawMembers.findIndex((m) => m.id === userId);
    if (index === -1) return false;

    rawMembers[index].password = newHash;
    rawMembers[index].passwordHash = newHash;
    if (clearMustChange) {
      rawMembers[index].mustChangePassword = false;
    }
    rawMembers[index].updatedAt = new Date().toISOString();
    writeJsonFile(SALES_FILE, rawMembers);
    return true;
  }

  // Feature Flags repository
  static getFeatureFlags(): DbFeatureFlag[] {
    const flags = readJsonFile<DbFeatureFlag[]>(FEATURE_FLAGS_FILE, []);
    if (!flags || flags.length === 0) {
      writeJsonFile(FEATURE_FLAGS_FILE, DEFAULT_FEATURE_FLAGS);
      return DEFAULT_FEATURE_FLAGS;
    }
    return flags;
  }

  static updateFeatureFlag(key: string, updates: Partial<DbFeatureFlag>): DbFeatureFlag | null {
    const flags = this.getFeatureFlags();
    const index = flags.findIndex((f) => f.key === key);
    if (index === -1) return null;

    flags[index] = {
      ...flags[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeJsonFile(FEATURE_FLAGS_FILE, flags);
    return flags[index];
  }

  // UI Configs repository
  static getUiConfigs(): DbUiConfig[] {
    const configs = readJsonFile<DbUiConfig[]>(UI_CONFIGS_FILE, []);
    if (!configs || configs.length === 0) {
      writeJsonFile(UI_CONFIGS_FILE, DEFAULT_UI_CONFIGS);
      return DEFAULT_UI_CONFIGS;
    }
    return configs;
  }

  static getUiConfigBySection(sectionKey: string): DbUiConfig | null {
    const configs = this.getUiConfigs();
    return configs.find((c) => c.sectionKey === sectionKey) || null;
  }

  static updateUiConfig(sectionKey: string, data: Record<string, any>, updatedBy?: string): DbUiConfig {
    const configs = this.getUiConfigs();
    const index = configs.findIndex((c) => c.sectionKey === sectionKey);
    const now = new Date().toISOString();

    if (index >= 0) {
      configs[index].data = { ...configs[index].data, ...data };
      configs[index].updatedAt = now;
      if (updatedBy) configs[index].updatedBy = updatedBy;
      writeJsonFile(UI_CONFIGS_FILE, configs);
      return configs[index];
    }

    const newConfig: DbUiConfig = {
      id: `ui-${Date.now()}`,
      sectionKey,
      title: sectionKey,
      data,
      isActive: true,
      updatedBy,
      updatedAt: now
    };
    configs.push(newConfig);
    writeJsonFile(UI_CONFIGS_FILE, configs);
    return newConfig;
  }

  // Custom Fields repository
  static getCustomFields(): DbCustomFieldDefinition[] {
    const fields = readJsonFile<DbCustomFieldDefinition[]>(CUSTOM_FIELDS_FILE, []);
    if (!fields || fields.length === 0) {
      writeJsonFile(CUSTOM_FIELDS_FILE, DEFAULT_CUSTOM_FIELDS);
      return DEFAULT_CUSTOM_FIELDS;
    }
    return fields;
  }

  static createCustomField(field: Omit<DbCustomFieldDefinition, 'id'>): DbCustomFieldDefinition {
    const fields = this.getCustomFields();
    const newField: DbCustomFieldDefinition = {
      ...field,
      id: `cf-${Date.now()}`
    };
    fields.push(newField);
    writeJsonFile(CUSTOM_FIELDS_FILE, fields);
    return newField;
  }

  static updateCustomField(id: string, updates: Partial<DbCustomFieldDefinition>): DbCustomFieldDefinition | null {
    const fields = this.getCustomFields();
    const index = fields.findIndex((f) => f.id === id);
    if (index === -1) return null;

    fields[index] = {
      ...fields[index],
      ...updates
    };
    writeJsonFile(CUSTOM_FIELDS_FILE, fields);
    return fields[index];
  }

  static deleteCustomField(id: string): boolean {
    const fields = this.getCustomFields();
    const filtered = fields.filter((f) => f.id !== id);
    if (filtered.length === fields.length) return false;
    writeJsonFile(CUSTOM_FIELDS_FILE, filtered);
    return true;
  }

  // Audit Logs repository
  static recordAuditLog(entry: Omit<DbAuditLog, 'id' | 'createdAt'>): DbAuditLog {
    const logs = readJsonFile<any[]>(SYSTEM_LOGS_FILE, []);
    const newLog: DbAuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    logs.unshift(newLog);
    // Keep max 2000 logs
    if (logs.length > 2000) {
      logs.splice(2000);
    }
    writeJsonFile(SYSTEM_LOGS_FILE, logs);
    return newLog;
  }

  static getAuditLogs(limit: number = 100): DbAuditLog[] {
    const logs = readJsonFile<any[]>(SYSTEM_LOGS_FILE, []);
    return logs.slice(0, limit);
  }

  // Teams repository
  static getTeams(): DbTeam[] {
    const users = this.getUsers();
    const teamMap = new Map<string, DbTeam>();

    users.forEach((u) => {
      if (u.teamName) {
        const id = u.teamId || u.teamName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!teamMap.has(id)) {
          teamMap.set(id, {
            id,
            name: u.teamName,
            leaderId: u.role === 'TEAM_LEADER' ? u.id : undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
    });

    return Array.from(teamMap.values());
  }

  // -------------------------------------------------------------
  // User Management
  // -------------------------------------------------------------
  static createUser(userData: Omit<DbUser, 'id' | 'createdAt' | 'updatedAt'>): DbUser {
    const rawMembers = readJsonFile<any[]>(SALES_FILE, []);
    const now = new Date().toISOString();
    const newUser: DbUser = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now
    };

    // Store in format matching sales_members.json
    const rawMember = {
      id: newUser.id,
      name: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      username: newUser.username || newUser.email.split('@')[0],
      role: newUser.role === 'SUPER_ADMIN' ? 'admin' : (newUser.role === 'TEAM_LEADER' ? 'tpkd' : 'sale'),
      team: newUser.teamName,
      status: newUser.status.toLowerCase(),
      password: newUser.passwordHash,
      passwordHash: newUser.passwordHash,
      avatar: newUser.avatarUrl,
      color: newUser.color || 'bg-blue-600',
      isOnlineForLead: newUser.isOnlineForLead,
      maxDailyLeads: newUser.maxDailyLeads,
      mustChangePassword: newUser.mustChangePassword,
      managerId: newUser.managerId,
      managerName: newUser.managerName,
      createdAt: now,
      updatedAt: now
    };

    rawMembers.push(rawMember);
    writeJsonFile(SALES_FILE, rawMembers);
    return newUser;
  }

  static updateUser(userId: string, updates: Partial<DbUser>): DbUser | null {
    const rawMembers = readJsonFile<any[]>(SALES_FILE, []);
    const index = rawMembers.findIndex((m) => m.id === userId);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const current = rawMembers[index];

    if (updates.fullName !== undefined) current.name = updates.fullName;
    if (updates.email !== undefined) current.email = updates.email;
    if (updates.phone !== undefined) current.phone = updates.phone;
    if (updates.username !== undefined) current.username = updates.username;
    if (updates.role !== undefined) {
      current.role = updates.role === 'SUPER_ADMIN' ? 'admin' : (updates.role === 'TEAM_LEADER' ? 'tpkd' : 'sale');
    }
    if (updates.status !== undefined) current.status = updates.status.toLowerCase();
    if (updates.teamName !== undefined) current.team = updates.teamName;
    if (updates.passwordHash !== undefined) {
      current.password = updates.passwordHash;
      current.passwordHash = updates.passwordHash;
    }
    if (updates.isOnlineForLead !== undefined) current.isOnlineForLead = updates.isOnlineForLead;
    if (updates.maxDailyLeads !== undefined) current.maxDailyLeads = updates.maxDailyLeads;
    if (updates.mustChangePassword !== undefined) current.mustChangePassword = updates.mustChangePassword;
    if (updates.managerId !== undefined) current.managerId = updates.managerId;
    if (updates.managerName !== undefined) current.managerName = updates.managerName;
    current.updatedAt = now;

    rawMembers[index] = current;
    writeJsonFile(SALES_FILE, rawMembers);

    return this.findUserById(userId);
  }

  static deleteUser(userId: string): boolean {
    const rawMembers = readJsonFile<any[]>(SALES_FILE, []);
    const filtered = rawMembers.filter((m) => m.id !== userId);
    if (filtered.length === rawMembers.length) return false;
    writeJsonFile(SALES_FILE, filtered);
    return true;
  }

  // -------------------------------------------------------------
  // Leads Management
  // -------------------------------------------------------------
  static getLeads(): any[] {
    return readJsonFile<any[]>(LEADS_FILE, []);
  }

  static saveLeads(leads: any[]): void {
    writeJsonFile(LEADS_FILE, leads);
  }

  static findLeadById(id: string): any | null {
    const leads = this.getLeads();
    return leads.find((l) => l.id === id) || null;
  }

  static findLeadByNormalizedPhone(cleanPhone: string): any | null {
    if (!cleanPhone || cleanPhone.length < 9) return null;
    const leads = this.getLeads();
    return leads.find((l) => {
      const p = String(l.phone || '').replace(/[^0-9]/g, '');
      return p === cleanPhone || (p.length >= 9 && cleanPhone.endsWith(p.slice(-9)));
    }) || null;
  }

  static upsertLead(lead: any): { lead: any; isNew: boolean } {
    const leads = this.getLeads();
    const index = leads.findIndex((l) => l.id === lead.id);
    const now = new Date(Math.max(Date.now(), index >= 0 ? Date.parse(leads[index].updatedAt || '') + 1 || 0 : 0)).toISOString();
    const isWon = ['WON', 'Đã chốt', 'Đã chốt cọc'].includes(lead.status || lead.stage);
    if (isWon) {
      lead = { ...lead, closedAt: (index >= 0 && leads[index].closedAt) || now, closedById: (index >= 0 && leads[index].closedById) || lead.assignedToId };
    }

    if (index >= 0) {
      leads[index] = {
        ...leads[index],
        ...lead,
        updatedAt: now
      };
      this.saveLeads(leads);
      this.syncWonKpi(leads[index]);
      return { lead: leads[index], isNew: false };
    } else {
      const newLead = {
        ...lead,
        id: lead.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        code: lead.code || `KH-${String(leads.length + 1).padStart(4, '0')}`,
        createdAt: lead.createdAt || now,
        updatedAt: now
      };
      leads.unshift(newLead);
      this.saveLeads(leads);
      this.syncWonKpi(newLead);
      return { lead: newLead, isNew: true };
    }
  }

  static deleteLead(id: string): boolean {
    const leads = this.getLeads();
    const filtered = leads.filter((l) => l.id !== id);
    if (filtered.length === leads.length) return false;
    this.saveLeads(filtered);
    return true;
  }

  static deleteBulkLeads(ids: string[]): number {
    const idSet = new Set(ids);
    const leads = this.getLeads();
    const filtered = leads.filter((l) => !idSet.has(l.id));
    const deletedCount = leads.length - filtered.length;
    this.saveLeads(filtered);
    return deletedCount;
  }

  // -------------------------------------------------------------
  // Appointments (lịch hẹn xem BĐS)
  // -------------------------------------------------------------
  static getAppointments(): any[] {
    return readJsonFile<any[]>(APPOINTMENTS_FILE, []);
  }

  static saveAppointments(appointments: any[]): void {
    writeJsonFile(APPOINTMENTS_FILE, appointments);
  }

  // Transfer requests (NVKD đề xuất chuyển khách, TPKD/Admin duyệt)
  static getTransferRequests(): any[] {
    return readJsonFile<any[]>(TRANSFER_REQUESTS_FILE, []);
  }

  static saveTransferRequests(requests: any[]): void {
    writeJsonFile(TRANSFER_REQUESTS_FILE, requests);
  }

  // -------------------------------------------------------------
  // KPI Targets Management
  // -------------------------------------------------------------
  static getKpiTargets(month?: number, year?: number): DbKpiTarget[] {
    const targets = readJsonFile<DbKpiTarget[]>(KPI_TARGETS_FILE, []);
    return targets.filter((t) => {
      if (month !== undefined && t.month !== month) return false;
      if (year !== undefined && t.year !== year) return false;
      return true;
    });
  }

  static getUserKpiTarget(userId: string, month: number, year: number): DbKpiTarget {
    const targets = readJsonFile<DbKpiTarget[]>(KPI_TARGETS_FILE, []);
    const found = targets.find((t) => t.userId === userId && t.month === month && t.year === year);
    if (found) return found;

    // Return default empty target if not initialized yet
    return {
      id: `kpi-${userId}-${month}-${year}`,
      userId,
      month,
      year,
      targetRevenue: 500000000, // 500 triệu mặc định
      achievedRevenue: 0,
      targetDeals: 2,
      achievedDeals: 0,
      targetCalls: 60,
      achievedCalls: 0,
      commissionRate: 1.5, // 1.5%
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static upsertKpiTarget(targetData: Partial<DbKpiTarget> & { userId: string; month: number; year: number }): DbKpiTarget {
    const targets = readJsonFile<DbKpiTarget[]>(KPI_TARGETS_FILE, []);
    const index = targets.findIndex((t) => t.userId === targetData.userId && t.month === targetData.month && t.year === targetData.year);
    const now = new Date().toISOString();

    if (index >= 0) {
      targets[index] = {
        ...targets[index],
        ...targetData,
        updatedAt: now
      };
      writeJsonFile(KPI_TARGETS_FILE, targets);
      return targets[index];
    }

    const newTarget: DbKpiTarget = {
      id: `kpi-${targetData.userId}-${targetData.month}-${targetData.year}`,
      userId: targetData.userId,
      month: targetData.month,
      year: targetData.year,
      targetRevenue: targetData.targetRevenue || 500000000,
      achievedRevenue: targetData.achievedRevenue || 0,
      targetDeals: targetData.targetDeals || 2,
      achievedDeals: targetData.achievedDeals || 0,
      wonCredits: targetData.wonCredits || {},
      targetCalls: targetData.targetCalls || 60,
      achievedCalls: targetData.achievedCalls || 0,
      commissionRate: targetData.commissionRate || 1.5,
      createdAt: now,
      updatedAt: now
    };
    targets.push(newTarget);
    writeJsonFile(KPI_TARGETS_FILE, targets);
    return newTarget;
  }

  /** Apply a per-customer credit delta, preserving historical/manual totals. */
  private static syncWonKpi(lead: any): void {
    if (!lead.closedAt || !lead.closedById) return;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', month: 'numeric', year: 'numeric' }).formatToParts(new Date(lead.closedAt));
    const month = Number(parts.find(part => part.type === 'month')!.value), year = Number(parts.find(part => part.type === 'year')!.value);
    const current = this.getUserKpiTarget(lead.closedById, month, year);
    const credits = { ...(current.wonCredits || {}) };
    const wasCredited = Object.prototype.hasOwnProperty.call(credits, lead.id);
    const previous = credits[lead.id] || 0;
    const isWon = ['WON', 'Đã chốt', 'Đã chốt cọc'].includes(lead.status || lead.stage);
    const amount = isWon ? Math.max(0, Number(lead.actualValue) || 0) : 0;
    if (isWon) credits[lead.id] = amount;
    else delete credits[lead.id];
    this.upsertKpiTarget({ userId: lead.closedById, month, year, wonCredits: credits,
      achievedDeals: Math.max(0, current.achievedDeals + Number(isWon) - Number(wasCredited)),
      achievedRevenue: Math.max(0, current.achievedRevenue + amount - previous) });
  }
}
