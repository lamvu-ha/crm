import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { hashPassword } from '../auth';
import { authenticateToken, requireSuperAdmin, requireTeamLeaderOrAdmin, optionalAuthenticateToken } from '../middleware';
import { mapLegacyToSystemRole } from '../types';

const router = Router();
router.use(authenticateToken);

/**
 * GET /api/users
 * Retrieve users / sales members list
 */
router.get('/', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const { status, role, teamId } = req.query;
    let users = Database.getUsers();

    if (status) {
      users = users.filter((u) => u.status.toLowerCase() === String(status).toLowerCase());
    }

    if (role) {
      const targetRole = mapLegacyToSystemRole(String(role));
      users = users.filter((u) => u.role === targetRole);
    }

    if (teamId) {
      users = users.filter((u) => u.teamId === String(teamId) || u.teamName === String(teamId));
    }

    // Hide password hashes from response
    const sanitized = users.map(({ passwordHash, ...rest }) => ({
      ...rest,
      name: rest.fullName,
      team: rest.teamName
    }));

    return res.json(sanitized);
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải danh sách nhân sự.', details: error?.message });
  }
});

/**
 * GET /api/users/sales-stats
 * Real-time sales performance metrics:
 * - Won deals count
 * - Won revenue
 * - Total assigned leads
 * - Contacted leads
 * - Conversion rate
 * - Monthly KPI target & achievement
 */
router.get('/sales-stats', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const users = Database.getUsers();
    const leads = Database.getLeads();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const stats = users
      .filter((u) => u.status === 'ACTIVE' && u.role !== 'SUPER_ADMIN')
      .map((user) => {
        const userLeads = leads.filter(
          (l) =>
            l.assignedToId === user.id ||
            (l.assigneeEmail && l.assigneeEmail.toLowerCase() === user.email.toLowerCase()) ||
            (l.assignee && l.assignee.toLowerCase() === user.fullName.toLowerCase())
        );

        const wonLeads = userLeads.filter(
          (l) => l.stage === 'WON' || l.status === 'Đã chốt cọc'
        );

        const totalRevenue = wonLeads.reduce(
          (sum, l) => sum + (Number(l.actualValue) || Number(l.estimatedValue) || 0),
          0
        );

        const contactedLeads = userLeads.filter(
          (l) => l.stage !== 'NEW_LEAD' && l.status !== 'Khách mới'
        );

        const kpi = Database.getUserKpiTarget(user.id, currentMonth, currentYear);
        const achievedRev = Math.max(kpi.achievedRevenue, totalRevenue);

        const conversionRate = userLeads.length > 0 
          ? Math.round((wonLeads.length / userLeads.length) * 100 * 10) / 10 
          : 0;

        return {
          userId: user.id,
          name: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          team: user.teamName,
          isOnlineForLead: user.isOnlineForLead,
          maxDailyLeads: user.maxDailyLeads,
          metrics: {
            totalLeads: userLeads.length,
            contactedLeads: contactedLeads.length,
            wonDeals: wonLeads.length,
            totalRevenue: achievedRev,
            conversionRate,
            kpiTargetRevenue: kpi.targetRevenue,
            kpiTargetDeals: kpi.targetDeals,
            kpiProgressPercent: kpi.targetRevenue > 0 
              ? Math.min(100, Math.round((achievedRev / kpi.targetRevenue) * 100)) 
              : 0
          }
        };
      });

    return res.json({
      success: true,
      month: currentMonth,
      year: currentYear,
      stats
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tính toán hiệu suất bán hàng.', details: error?.message });
  }
});

/**
 * POST /api/users
 * Create a new user (Super Admin)
 */
router.post('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      email,
      phone,
      username,
      password = 'CHANGE_ME_BEFORE_USE',
      role = 'SALES_AGENT',
      status = 'ACTIVE',
      teamName,
      isOnlineForLead = true,
      maxDailyLeads = 50
    } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ Tên và Email.' });
    }

    const existing = Database.findUserByIdentifier(email);
    if (existing) {
      return res.status(400).json({ error: `Tài khoản với email "${email}" đã tồn tại trong hệ thống.` });
    }

    const passwordHash = await hashPassword(String(password).trim());
    const sysRole = mapLegacyToSystemRole(role);

    const newUser = Database.createUser({
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : undefined,
      username: username ? String(username).trim() : email.split('@')[0],
      passwordHash,
      role: sysRole,
      status: status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      teamName: teamName || 'Khối Kinh Doanh BĐS',
      isOnlineForLead: Boolean(isOnlineForLead),
      maxDailyLeads: Number(maxDailyLeads) || 50,
      mustChangePassword: false
    });

    Database.recordAuditLog({
      userId: req.user?.userId || 'admin',
      userName: req.user?.fullName || 'Quản trị viên',
      action: 'CREATE_USER',
      targetType: 'USER',
      targetId: newUser.id,
      details: { email: newUser.email, role: newUser.role, fullName: newUser.fullName }
    });

    const { passwordHash: _, ...sanitized } = newUser;
    return res.status(201).json({
      success: true,
      user: {
        ...sanitized,
        name: sanitized.fullName,
        team: sanitized.teamName
      },
      message: 'Tạo tài khoản nhân viên thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tạo tài khoản nhân viên.', details: error?.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user information
 */
router.put('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const existing = Database.findUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const {
      fullName,
      email,
      phone,
      role,
      status,
      teamName,
      isOnlineForLead,
      maxDailyLeads,
      password
    } = req.body;

    const updates: any = {};
    if (fullName) updates.fullName = fullName;
    if (email) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role) {
      updates.role = mapLegacyToSystemRole(role);
    }
    if (status) updates.status = status.toUpperCase();
    if (teamName !== undefined) updates.teamName = teamName;
    if (isOnlineForLead !== undefined) updates.isOnlineForLead = Boolean(isOnlineForLead);
    if (maxDailyLeads !== undefined) updates.maxDailyLeads = Number(maxDailyLeads);
    if (password && String(password).trim().length >= 6) {
      updates.passwordHash = await hashPassword(String(password).trim());
    }

    const updated = Database.updateUser(userId, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Không thể cập nhật người dùng.' });
    }

    Database.recordAuditLog({
      userId: req.user?.userId || 'admin',
      userName: req.user?.fullName || 'Quản trị viên',
      action: 'UPDATE_USER',
      targetType: 'USER',
      targetId: userId,
      details: { updates }
    });

    const { passwordHash: _, ...sanitized } = updated;
    return res.json({ 
      success: true, 
      user: {
        ...sanitized,
        name: sanitized.fullName,
        team: sanitized.teamName
      },
      message: 'Cập nhật thông tin nhân viên thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật người dùng.', details: error?.message });
  }
});

/**
 * DELETE /api/users/:id
 * Remove a user from database
 */
router.delete('/:id', requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const existing = Database.findUserById(userId);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng để xóa.' });
    }

    const ok = Database.deleteUser(userId);
    if (!ok) {
      return res.status(500).json({ error: 'Không thể xóa người dùng.' });
    }

    Database.recordAuditLog({
      userId: req.user?.userId || 'admin',
      userName: req.user?.fullName || 'Quản trị viên',
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: userId,
      details: { fullName: existing.fullName, email: existing.email }
    });

    return res.json({
      success: true,
      message: `Đã xóa nhân viên "${existing.fullName}" khỏi hệ thống thành công!`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi xóa người dùng.', details: error?.message });
  }
});

export default router;
