import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { 
  comparePassword, 
  hashPassword, 
  signAccessToken, 
  signRefreshToken, 
  verifyRefreshToken, 
  buildPermissions 
} from '../auth';
import { authenticateToken, optionalAuthenticateToken } from '../middleware';
import { mapSystemRoleToLegacy, AuthUser } from '../types';

const router = Router();

/**
 * POST /api/auth/login
 * Public endpoint: Authenticate user, issue JWT access + refresh tokens, return profile & RBAC permissions
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp đầy đủ thông tin đăng nhập (Tài khoản/Email và Mật khẩu).',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const cleanInput = String(identifier).trim();
    const cleanPassword = String(password).trim();

    // 1. Find user in repository
    const found = Database.findUserByIdentifier(cleanInput);

    if (!found) {
      Database.recordAuditLog({
        userId: 'anonymous',
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        details: { identifier: cleanInput, reason: 'USER_NOT_FOUND', ip: req.ip }
      });

      return res.status(404).json({
        error: `Không tìm thấy tài khoản "${cleanInput}" trong danh bạ nhân sự. Vui lòng kiểm tra lại Email hoặc Tên đăng nhập.`,
        code: 'USER_NOT_FOUND'
      });
    }

    const { user, rawMember } = found;

    // 2. Check user status
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Tài khoản của bạn hiện đang bị tạm khóa hoặc chưa được kích hoạt. Vui lòng liên hệ Quản trị viên.',
        code: 'USER_INACTIVE'
      });
    }

    // 3. Verify password (supports bcrypt hash or legacy plain-text)
    const storedSecret = rawMember.passwordHash || rawMember.password || '';
    const { isValid, needsRehash } = await comparePassword(cleanPassword, storedSecret);

    if (!isValid) {
      Database.recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        userRole: user.role,
        action: 'LOGIN_FAILED',
        targetType: 'USER',
        targetId: user.id,
        details: { identifier: cleanInput, reason: 'INVALID_PASSWORD', ip: req.ip }
      });

      return res.status(401).json({
        error: 'Mật khẩu không chính xác. Vui lòng thử lại hoặc liên hệ Quản trị viên để đặt lại mật khẩu.',
        code: 'INVALID_PASSWORD'
      });
    }

    // 4. If password was plain text, automatically upgrade to bcrypt in the background
    if (needsRehash) {
      try {
        const newHash = await hashPassword(cleanPassword);
        Database.updateUserPassword(user.id, newHash, false);
      } catch (err) {
        console.warn('Failed to upgrade password to bcrypt:', err);
      }
    }

    // 5. Generate JWT tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      fullName: user.fullName
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken({ userId: user.id });
    const permissions = buildPermissions(user.role);

    // 6. Record successful login audit log
    Database.recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      targetType: 'USER',
      targetId: user.id,
      details: {
        role: user.role,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    // 7. Format user object ensuring backward compatibility with frontend legacy properties
    const legacyRole = mapSystemRoleToLegacy(user.role);
    const formattedUser = {
      ...Object.fromEntries(Object.entries(user).filter(([key]) => !['password', 'passwordHash'].includes(key))),
      name: user.fullName, // legacy property
      role: legacyRole,    // legacy role: 'admin' | 'tpkd' | 'sale'
      systemRole: user.role, // standard RBAC: 'SUPER_ADMIN' | 'TEAM_LEADER' | 'SALES_AGENT'
      legacyRole: legacyRole,
      team: user.teamName,
      mustChangePassword: user.role !== 'SUPER_ADMIN' && Boolean(user.mustChangePassword)
    };

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      user: formattedUser,
      permissions,
      message: 'Đăng nhập thành công!'
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Lỗi máy chủ khi xử lý đăng nhập.',
      details: error?.message
    });
  }
});

/**
 * GET /api/auth/me
 * Protected: Return currently authenticated user profile, RBAC role, permissions and settings
 */
router.get('/me', authenticateToken, (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = Database.findUserById(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Không tìm thấy thông tin tài khoản người dùng.',
        code: 'USER_NOT_FOUND'
      });
    }

    const legacyRole = mapSystemRoleToLegacy(user.role);
    const permissions = buildPermissions(user.role);

    const formattedUser = {
      ...Object.fromEntries(Object.entries(user).filter(([key]) => !['password', 'passwordHash'].includes(key))),
      name: user.fullName,
      role: legacyRole,
      systemRole: user.role,
      legacyRole: legacyRole,
      team: user.teamName,
      mustChangePassword: user.role !== 'SUPER_ADMIN' && Boolean(user.mustChangePassword)
    };

    return res.json({
      success: true,
      user: formattedUser,
      permissions
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Lỗi kiểm tra phiên làm việc.',
      details: error?.message
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using valid refresh token
 */
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp Refresh Token.',
        code: 'MISSING_REFRESH_TOKEN'
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload || !payload.userId) {
      return res.status(401).json({
        error: 'Refresh token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    const user = Database.findUserById(payload.userId);
    if (!user || user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Tài khoản không tồn tại hoặc đã bị khóa.',
        code: 'USER_INACTIVE'
      });
    }

    const newAccessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      fullName: user.fullName
    });

    return res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Lỗi gia hạn phiên làm việc.',
      details: error?.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Record logout in audit log and invalidate session client-side
 */
router.post('/logout', optionalAuthenticateToken, (req: Request, res: Response) => {
  if (req.user) {
    Database.recordAuditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      userName: req.user.fullName,
      userRole: req.user.role,
      action: 'LOGOUT',
      targetType: 'USER',
      targetId: req.user.userId,
      details: { ip: req.ip }
    });
  }

  return res.json({
    success: true,
    message: 'Đăng xuất thành công.'
  });
});

/**
 * POST /api/auth/change-password
 * Change password and hash with bcrypt
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user!.userId;

    if (!newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({
        error: 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    const user = Database.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // If current password provided, verify it first
    if (currentPassword) {
      const { isValid } = await comparePassword(String(currentPassword).trim(), user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          error: 'Mật khẩu hiện tại không đúng.',
          code: 'CURRENT_PASSWORD_INCORRECT'
        });
      }
    }

    const newHash = await hashPassword(String(newPassword).trim());
    const updated = Database.updateUserPassword(userId, newHash, true);

    if (!updated) {
      return res.status(500).json({ error: 'Không thể cập nhật mật khẩu.' });
    }

    Database.recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      userName: user.fullName,
      userRole: user.role,
      action: 'CHANGE_PASSWORD',
      targetType: 'USER',
      targetId: user.id,
      details: { ip: req.ip }
    });

    return res.json({
      success: true,
      message: 'Đổi mật khẩu thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Lỗi cập nhật mật khẩu.',
      details: error?.message
    });
  }
});

export default router;
