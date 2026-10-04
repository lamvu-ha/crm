import { Router, Request, Response } from 'express';
import { Database, DbUser } from '../db';
import { canReceiveLead } from '../services/leadService';
import { authenticateToken, canAccessLead } from '../middleware';
import { JwtTokenPayload } from '../types';

/**
 * NVKD cannot reassign customers themselves: they propose a transfer and a TPKD (same team) or Admin decides.
 * While a proposal is pending the customer carries `pendingTransfer`, so every screen can show it.
 */
const router = Router();
router.use(authenticateToken);

const text = (value: unknown) => String(value ?? '').trim();
const nowIso = () => new Date().toISOString();

function historyEntry(content: string, author: string) {
  return {
    id: `transfer-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: nowIso().replace('T', ' ').slice(0, 16),
    type: 'Bàn giao / Chuyển Sale',
    content,
    author
  };
}

function handoverText(request: any) {
  const h = request.handover || {};
  return `Nhu cầu chính: ${h.needs}. Trao đổi gần nhất: ${h.latest}. Việc cần làm tiếp: ${h.next}.`;
}

/** Same rules as a manager's direct reassignment in PUT /api/leads/:id. 400 = invalid choice, 409 = valid but not possible now. */
function recipientError(decider: JwtTokenPayload, target: DbUser | null, lead: any): { status: number; error: string } | null {
  if (!target) return { status: 400, error: 'Vui lòng chọn người nhận.' };
  if (target.status !== 'ACTIVE' || target.role === 'SUPER_ADMIN') return { status: 400, error: 'Người nhận không hợp lệ.' };
  if (decider.role === 'TEAM_LEADER' && (!decider.teamId || target.teamId !== decider.teamId)) return { status: 400, error: 'Người nhận không thuộc phòng của bạn.' };
  if (target.id === lead.assignedToId) return { status: 409, error: 'Người nhận đang là người phụ trách khách này.' };
  if (!canReceiveLead(target)) return { status: 409, error: `${target.fullName} đang tắt nhận khách hoặc đã đủ hạn mức hôm nay.` };
  return null;
}

/**
 * GET /api/transfer-requests
 * NVKD: their own proposals. TPKD: proposals on customers of their team. Admin: all.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const leadsById = new Map(Database.getLeads().map(lead => [lead.id, lead]));
    const visible = Database.getTransferRequests().filter(request => {
      if (user.role === 'SALES_AGENT') return request.fromUserId === user.userId;
      const lead = leadsById.get(request.leadId);
      return lead ? canAccessLead(user, lead) : user.role === 'SUPER_ADMIN';
    });
    return res.json(visible.slice(0, 300));
  } catch (error: any) {
    return res.status(500).json({ error: 'Không tải được đề xuất chuyển khách.', details: error?.message });
  }
});

/**
 * POST /api/transfer-requests
 * Propose moving one customer to another sale; a TPKD/Admin must approve.
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { leadId, suggestedToId, reason, handover } = req.body || {};
    const cleanHandover = { needs: text(handover?.needs), latest: text(handover?.latest), next: text(handover?.next) };
    if (!text(reason) || !cleanHandover.needs || !cleanHandover.latest || !cleanHandover.next) {
      return res.status(400).json({ error: 'Vui lòng nhập lý do và đủ 3 mục tóm tắt bàn giao.' });
    }

    const lead = Database.findLeadById(text(leadId));
    if (!lead) return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    if (!canAccessLead(user, lead)) return res.status(403).json({ error: 'Khách hàng ngoài phạm vi phụ trách.' });

    const requests = Database.getTransferRequests();
    if (requests.some(request => request.leadId === lead.id && request.status === 'pending')) {
      return res.status(409).json({ error: `Khách "${lead.fullName}" đã có đề xuất chuyển đang chờ duyệt.` });
    }

    let suggested: DbUser | null = null;
    if (text(suggestedToId)) {
      suggested = Database.findUserById(text(suggestedToId));
      if (!suggested || suggested.status !== 'ACTIVE' || suggested.role === 'SUPER_ADMIN' || suggested.id === lead.assignedToId) {
        return res.status(400).json({ error: 'Người được gợi ý nhận không hợp lệ.' });
      }
    }

    const request = {
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      leadId: lead.id,
      leadName: lead.fullName,
      leadPhone: lead.phone,
      fromUserId: user.userId,
      fromName: user.fullName,
      currentAssignee: lead.assignee,
      suggestedToId: suggested?.id || null,
      suggestedToName: suggested?.fullName || null,
      reason: text(reason),
      handover: cleanHandover,
      status: 'pending',
      createdAt: nowIso()
    };
    Database.saveTransferRequests([request, ...requests]);

    const { lead: updatedLead } = Database.upsertLead({
      ...lead,
      pendingTransfer: { requestId: request.id, requestedBy: user.fullName, requestedAt: request.createdAt, suggestedToName: request.suggestedToName },
      history: [
        historyEntry(`Đề xuất chuyển khách, chờ TPKD duyệt${suggested ? ` (gợi ý: ${suggested.fullName})` : ''}. Lý do: ${request.reason}`, user.fullName),
        ...(lead.history || [])
      ]
    });

    Database.recordAuditLog({
      userId: user.userId, userName: user.fullName, userRole: user.role,
      action: 'TRANSFER_REQUEST_CREATE', targetType: 'LEAD', targetId: lead.id,
      details: { requestId: request.id, suggestedTo: request.suggestedToName, reason: request.reason }
    });
    return res.status(201).json({ success: true, request, lead: updatedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Không gửi được đề xuất chuyển khách.', details: error?.message });
  }
});

/**
 * PATCH /api/transfer-requests/:id
 * { action: 'approve', toUserId?, note? } | { action: 'reject', note? } — TPKD (own team) or Admin.
 * { action: 'cancel' } — the NVKD who sent it.
 */
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const { action, toUserId, note } = req.body || {};
    if (!['approve', 'reject', 'cancel'].includes(action)) return res.status(400).json({ error: 'Thao tác không hợp lệ.' });

    const requests = Database.getTransferRequests();
    const index = requests.findIndex(request => request.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Không tìm thấy đề xuất.' });
    const request = requests[index];
    if (request.status !== 'pending') return res.status(409).json({ error: 'Đề xuất này đã được xử lý.' });

    const lead = Database.findLeadById(request.leadId);
    if (action === 'cancel') {
      if (request.fromUserId !== user.userId) return res.status(403).json({ error: 'Chỉ người gửi mới huỷ được đề xuất.' });
    } else {
      if (user.role === 'SALES_AGENT') return res.status(403).json({ error: 'Chỉ TPKD hoặc Admin được duyệt đề xuất chuyển khách.' });
      if (lead && !canAccessLead(user, lead)) return res.status(403).json({ error: 'Khách hàng ngoài phạm vi phòng của bạn.' });
    }

    let target: DbUser | null = null;
    if (action === 'approve') {
      if (!lead) return res.status(404).json({ error: 'Khách hàng không còn tồn tại.' });
      target = Database.findUserById(text(toUserId) || request.suggestedToId || '');
      const problem = recipientError(user, target, lead);
      if (problem) return res.status(problem.status).json({ error: problem.error });
    }

    const decided = {
      ...request,
      status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled',
      decidedAt: nowIso(),
      decidedBy: user.fullName,
      decisionNote: text(note),
      ...(target ? { toUserId: target.id, toName: target.fullName } : {})
    };
    requests[index] = decided;
    Database.saveTransferRequests(requests);

    let updatedLead = null;
    if (lead) {
      const noteText = decided.decisionNote ? ` Ghi chú: ${decided.decisionNote}` : '';
      const base = { ...lead, pendingTransfer: null };
      if (target) {
        const assignedAt = nowIso();
        updatedLead = Database.upsertLead({
          ...base,
          assignedToId: target.id, assignee: target.fullName, assigneeEmail: target.email,
          assignedAt, acceptedAt: null, firstReportedAt: null, slaWarning: false, slaBreached: false,
          previousAssignees: [...(lead.previousAssignees || []), lead.assignee].filter(Boolean),
          history: [
            historyEntry(`${user.fullName} duyệt chuyển khách từ "${lead.assignee}" sang "${target.fullName}". Lý do: ${request.reason}. ${handoverText(request)}${noteText}`, user.fullName),
            ...(lead.history || [])
          ]
        }).lead;
      } else {
        const verb = action === 'reject' ? `${user.fullName} từ chối đề xuất chuyển khách.` : `${user.fullName} huỷ đề xuất chuyển khách.`;
        updatedLead = Database.upsertLead({ ...base, history: [historyEntry(verb + noteText, user.fullName), ...(lead.history || [])] }).lead;
      }
    }

    Database.recordAuditLog({
      userId: user.userId, userName: user.fullName, userRole: user.role,
      action: `TRANSFER_REQUEST_${decided.status.toUpperCase()}`, targetType: 'LEAD', targetId: request.leadId,
      details: { requestId: request.id, from: request.currentAssignee, to: target?.fullName, note: decided.decisionNote }
    });
    return res.json({ success: true, request: decided, lead: updatedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Không xử lý được đề xuất.', details: error?.message });
  }
});

export default router;
