import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { optionalAuthenticateToken, authenticateToken, requireTeamLeaderOrAdmin } from '../middleware';

const router = Router();
router.use(authenticateToken);
const inScope = (req: Request, id: string) => {
  if (req.user!.role === 'SUPER_ADMIN' || req.user!.userId === id) return true;
  const member = Database.findUserById(id);
  return req.user!.role === 'TEAM_LEADER' && Boolean(req.user!.teamId && member?.teamId === req.user!.teamId);
};

/**
 * GET /api/kpi
 * Get monthly KPI targets for all or specific sales
 */
router.get('/', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(String(req.query.month)) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(String(req.query.year)) : now.getFullYear();
    const userId = req.query.userId ? String(req.query.userId) : undefined;

    if (userId) {
      if (!inScope(req, userId)) return res.status(403).json({ error: 'Chỉ tiêu ngoài phạm vi quản lý.' });
      const target = Database.getUserKpiTarget(userId, month, year);
      return res.json({ success: true, target });
    }

    const allTargets = Database.getKpiTargets(month, year);
    const users = Database.getUsers().filter((u) => u.status === 'ACTIVE' && u.role !== 'SUPER_ADMIN' && inScope(req, u.id));

    // Merge each user with their corresponding KPI
    const enriched = users.map((user) => {
      const target = allTargets.find((t) => t.userId === user.id) || Database.getUserKpiTarget(user.id, month, year);
      return {
        ...target,
        userName: user.fullName,
        userEmail: user.email,
        teamName: user.teamName
      };
    });

    return res.json({
      success: true,
      month,
      year,
      targets: enriched
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải chỉ tiêu KPI.', details: error?.message });
  }
});

/**
 * POST /api/kpi
 * Set or update monthly KPI target (Super Admin or Team Leader)
 */
router.post('/', authenticateToken, requireTeamLeaderOrAdmin, (req: Request, res: Response) => {
  try {
    const {
      userId,
      month,
      year,
      targetRevenue,
      targetDeals,
      targetCalls,
      commissionRate
    } = req.body;

    if (!userId || !month || !year) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ userId, tháng và năm.' });
    }

    if (!inScope(req, userId)) return res.status(403).json({ error: 'Chỉ tiêu ngoài phạm vi quản lý.' });
    const updated = Database.upsertKpiTarget({
      userId,
      month: Number(month),
      year: Number(year),
      targetRevenue: targetRevenue !== undefined ? Number(targetRevenue) : undefined,
      targetDeals: targetDeals !== undefined ? Number(targetDeals) : undefined,
      targetCalls: targetCalls !== undefined ? Number(targetCalls) : undefined,
      commissionRate: commissionRate !== undefined ? Number(commissionRate) : undefined
    });

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      action: 'SET_KPI_TARGET',
      targetType: 'KPI',
      targetId: updated.id,
      details: { targetUserId: userId, month, year, targetRevenue, targetDeals }
    });

    return res.json({
      success: true,
      target: updated,
      message: 'Cập nhật chỉ tiêu KPI thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật KPI.', details: error?.message });
  }
});

export default router;
