import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtTokenPayload, SystemRole, AuthUser } from './types';

const JWT_SECRET = 'isolated-demo-access-only-2026';
const REFRESH_SECRET = 'isolated-demo-refresh-only-2026';
const ACCESS_TOKEN_EXPIRES_IN = '8h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Hash a plain password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password against stored hash or legacy plain text.
 * Automatically detects whether stored string is bcrypt hash or plain text.
 */
export async function comparePassword(candidatePassword: string, storedHashOrPlain: string): Promise<{ isValid: boolean; needsRehash: boolean }> {
  if (!storedHashOrPlain || !candidatePassword) {
    return { isValid: false, needsRehash: false };
  }

  const isBcrypt = storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2b$');

  if (isBcrypt) {
    const isValid = await bcrypt.compare(candidatePassword, storedHashOrPlain);
    return { isValid, needsRehash: false };
  }

  // Legacy plain-text fallback
  const isValid = candidatePassword.trim() === storedHashOrPlain.trim();
  return { isValid, needsRehash: isValid };
}

/**
 * Sign JWT Access Token
 */
export function signAccessToken(payload: Omit<JwtTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Sign JWT Refresh Token
 */
export function signRefreshToken(payload: { userId: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verify JWT Access Token
 */
export function verifyAccessToken(token: string): JwtTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtTokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify JWT Refresh Token
 */
export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
}

/**
 * Build permissions matrix based on RBAC role
 */
export function buildPermissions(role: SystemRole) {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isTeamLeader = role === 'TEAM_LEADER';

  return {
    canViewAllLeads: isSuperAdmin,
    canViewTeamLeads: isSuperAdmin || isTeamLeader,
    canExportLeads: isSuperAdmin,
    canDeleteLeads: isSuperAdmin,
    canAssignLeads: isSuperAdmin || isTeamLeader,
    canManageUsers: isSuperAdmin,
    canManageUiConfig: isSuperAdmin,
    canManageFeatureFlags: isSuperAdmin
  };
}
