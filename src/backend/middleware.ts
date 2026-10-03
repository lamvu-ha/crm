import { Request, Response, NextFunction } from 'express';
import { Database } from './db';
import { verifyAccessToken } from './auth';
import { JwtTokenPayload, SystemRole } from './types';

// Extend Express Request to include user payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtTokenPayload;
    }
  }
}

/**
 * Middleware: Verify JWT Bearer Token
 * Rejects with 401 if missing or invalid
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({
      error: 'Yêu cầu xác thực: Vui lòng cung cấp Bearer Token hợp lệ.',
      code: 'AUTH_TOKEN_MISSING'
    });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'Phiên làm việc đã hết hạn hoặc token không hợp lệ. Vui lòng đăng nhập lại.',
      code: 'AUTH_TOKEN_INVALID'
    });
  }

  const current = Database.findUserById(payload.userId);
  if (!current || current.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Tài khoản không còn hoạt động.', code: 'ACCOUNT_INACTIVE' });
  }
  req.user = { userId: current.id, email: current.email, fullName: current.fullName, role: current.role, teamId: current.teamId };
  next();
}

/**
 * Middleware: Optional Authentication
 * Attaches user payload if valid token is provided, but does not block request if omitted
 */
export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction) {
  if (req.user) return next();
  if (req.headers.authorization) return authenticateToken(req, res, next);
  next();
}

/**
 * Middleware: Strict Role-Based Access Control (RBAC)
 * Verifies whether the authenticated user has one of the allowed roles
 */
export function requireRole(...allowedRoles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Yêu cầu đăng nhập để truy cập tài nguyên này.',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${allowedRoles.join(', ')}], quyền hiện tại: [${req.user.role}]`,
        code: 'FORBIDDEN_ROLE',
        currentRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

export const requireSuperAdmin = requireRole('SUPER_ADMIN');
export const requireTeamLeaderOrAdmin = requireRole('SUPER_ADMIN', 'TEAM_LEADER');

/** Stable identities take precedence over legacy display names. */
export function canAccessLead(user: JwtTokenPayload, lead: any, allowPool = false): boolean {
  if (user.role === 'SUPER_ADMIN') return true;
  const matches = (member: { id: string; email: string; fullName: string }) => {
    if (lead.assignedToId) return lead.assignedToId === member.id;
    if (lead.assigneeEmail) return lead.assigneeEmail.toLowerCase() === member.email.toLowerCase();
    return Boolean(lead.assignee && lead.assignee.trim().toLowerCase() === member.fullName.trim().toLowerCase());
  };
  if (matches({ id: user.userId, email: user.email, fullName: user.fullName })) return true;
  if (allowPool && user.role === 'SALES_AGENT' && (lead.stage === 'PUBLIC_POOL' || lead.status === 'Kho khách chung')) return true;
  if (user.role !== 'TEAM_LEADER' || !user.teamId) return false;
  return Database.getUsers().some(member => member.teamId === user.teamId && matches(member));
}
