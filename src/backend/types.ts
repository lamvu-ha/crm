export type SystemRole = 'SUPER_ADMIN' | 'TEAM_LEADER' | 'SALES_AGENT';

// Mapping helper between legacy roles and Prisma RBAC roles
export function mapLegacyToSystemRole(role?: string): SystemRole {
  if (!role) return 'SALES_AGENT';
  const clean = role.toLowerCase().trim();
  if (clean === 'admin' || clean === 'super_admin' || clean === 'superadmin') {
    return 'SUPER_ADMIN';
  }
  if (clean === 'tpkd' || clean === 'team_leader' || clean === 'leader' || clean === 'manager') {
    return 'TEAM_LEADER';
  }
  return 'SALES_AGENT';
}

export function mapSystemRoleToLegacy(role: SystemRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'admin';
    case 'TEAM_LEADER':
      return 'tpkd';
    case 'SALES_AGENT':
    default:
      return 'sale';
  }
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  username?: string;
  avatarUrl?: string;
  role: SystemRole;
  legacyRole: string;
  status: UserStatus;
  teamId?: string;
  teamName?: string;
  isOnlineForLead: boolean;
  maxDailyLeads: number;
  mustChangePassword?: boolean;
}

export interface JwtTokenPayload {
  userId: string;
  email: string;
  role: SystemRole;
  teamId?: string;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  permissions: {
    canViewAllLeads: boolean;
    canViewTeamLeads: boolean;
    canExportLeads: boolean;
    canDeleteLeads: boolean;
    canAssignLeads: boolean;
    canManageUsers: boolean;
    canManageUiConfig: boolean;
    canManageFeatureFlags: boolean;
  };
  message?: string;
}
