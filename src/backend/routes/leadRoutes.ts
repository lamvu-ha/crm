import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { 
  canReceiveLead,
  normalizePhone, 
  maskPhoneNumber, 
  mapStageToDisplay, 
  mapDisplayToStage, 
  getNextRoundRobinAssignee, 
  autoReclaimNeglectedLeads 
} from '../services/leadService';
import { canAccessLead, optionalAuthenticateToken, authenticateToken, requireSuperAdmin, requireTeamLeaderOrAdmin } from '../middleware';

const router = Router();
router.use(authenticateToken);
router.use((req, res, next) => {
  const id = req.path.split('/')[1];
  const lead = id && Database.findLeadById(id);
  if (lead && !canAccessLead(req.user!, lead, req.method === 'GET')) {
    return res.status(403).json({ error: 'Khách hàng ngoài phạm vi phụ trách.', code: 'FORBIDDEN_LEAD' });
  }
  if (req.method === 'DELETE' && req.user!.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Chỉ quản trị viên được xóa khách hàng.' });
  }
  next();
});

/**
 * GET /api/leads
 * Get leads list with RBAC data isolation and phone masking:
 * - SUPER_ADMIN: Can view all leads
 * - TEAM_LEADER: Can view team leads
 * - SALES_AGENT: Can view assigned leads + PUBLIC_POOL leads
 * - Mask phone 3 middle digits for SALES_AGENT if feature flag DATA_MASKING_SALES_AGENT is on
 */
router.get('/', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const rawLeads = Database.getLeads();
    const user = req.user;
    const { stage, status, priority, search, page, limit, source } = req.query;

    const featureFlags = Database.getFeatureFlags();
    const maskingFlag = featureFlags.find((f) => f.key === 'DATA_MASKING_SALES_AGENT');
    const shouldMask = maskingFlag ? maskingFlag.isEnabled : true;
    const isSalesAgent = user?.role === 'SALES_AGENT';

    let filtered = rawLeads;

    filtered = rawLeads.filter(lead => canAccessLead(user!, lead, true));

    // 2. Query Filters
    if (stage || status) {
      const targetStage = mapDisplayToStage(String(stage || status));
      filtered = filtered.filter((l) => {
        const curStage = mapDisplayToStage(l.status || l.stage);
        return curStage === targetStage || (l.status && l.status.toLowerCase() === String(stage || status).toLowerCase());
      });
    }

    if (priority) {
      filtered = filtered.filter((l) => (l.priority || '').toLowerCase() === String(priority).toLowerCase());
    }

    if (source) {
      filtered = filtered.filter((l) => (l.source || l.dataSource || '').toLowerCase().includes(String(source).toLowerCase()));
    }

    if (search) {
      const q = String(search).toLowerCase().trim();
      const qDigits = q.replace(/[^0-9]/g, '');

      filtered = filtered.filter((l) => {
        const name = (l.fullName || l.name || '').toLowerCase();
        const code = (l.code || '').toLowerCase();
        const phone = String(l.phone || '').replace(/[^0-9]/g, '');
        const email = (l.email || '').toLowerCase();
        const notes = (l.demandNotes || l.notes || '').toLowerCase();

        return (
          name.includes(q) ||
          code.includes(q) ||
          email.includes(q) ||
          notes.includes(q) ||
          (qDigits.length >= 4 && phone.includes(qDigits))
        );
      });
    }

    // 3. Data Masking for SALES_AGENT
    const resultLeads = filtered.map((l) => {
      const isOwner = user?.userId && (l.assignedToId === user.userId || (l.assigneeEmail && l.assigneeEmail === user.email));
      const shouldMaskThis = isSalesAgent && shouldMask && !isOwner;

      if (shouldMaskThis) {
        return {
          ...l,
          phone: maskPhoneNumber(l.phone),
          rawPhoneMasked: true
        };
      }
      return {
        ...l,
        rawPhoneMasked: false
      };
    });

    // 4. Pagination (if requested)
    if (page && limit) {
      const p = Math.max(1, parseInt(String(page)) || 1);
      const l = Math.max(1, parseInt(String(limit)) || 50);
      const offset = (p - 1) * l;
      const paginated = resultLeads.slice(offset, offset + l);

      return res.json({
        total: resultLeads.length,
        page: p,
        limit: l,
        totalPages: Math.ceil(resultLeads.length / l),
        data: paginated
      });
    }

    return res.json(resultLeads);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ error: 'Không thể tải danh sách khách hàng', details: error?.message });
  }
});

/**
 * POST /api/leads
 * Create new lead or handle duplicate phone number
 */
router.post('/', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Backward-compatibility: if body is an array, handle batch save
    if (Array.isArray(body)) {
      if (req.user!.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Không có quyền lưu hàng loạt.' });
      const current = Database.getLeads();
      for (const item of body) {
        const existing = current.find(lead => lead.id === item.id);
        if (existing && existing.updatedAt !== item.updatedAt) {
          return res.status(409).json({ error: 'Dữ liệu đã thay đổi. Vui lòng tải lại.', code: 'VERSION_CONFLICT' });
        }
      }
      Database.saveLeads([...current.filter(lead => !body.some(item => item.id === lead.id)), ...body.map(item => ({ ...item, updatedAt: new Date().toISOString() }))]);
      return res.json({ success: true, count: body.length, leads: body });
    }

    const {
      fullName,
      phone,
      email,
      source = body.dataSource || 'Website',
      priority = 'WARM',
      stage = 'NEW_LEAD',
      status,
      productType,
      budget,
      estimatedValue = 0,
      tags = [],
      customData = {},
      demandNotes = '',
      assignedToId,
      assignee
    } = body;

    if (!fullName || !phone) {
      return res.status(400).json({
        error: 'Vui lòng cung cấp đầy đủ Tên khách hàng và Số điện thoại.',
        code: 'MISSING_FIELDS'
      });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 9) {
      return res.status(400).json({
        error: 'Số điện thoại không hợp lệ (cần ít nhất 9 chữ số).',
        code: 'INVALID_PHONE'
      });
    }

    if (req.user!.role === 'SALES_AGENT') {
      body.assignedToId = req.user!.userId;
      body.assignee = req.user!.fullName;
    }
    if (body.id && Database.findLeadById(body.id)) return res.status(409).json({ error: 'Mã hồ sơ đã tồn tại. Hãy cập nhật hồ sơ hiện có.' });

    // 1. SMART DEDUPLICATION CHECK
    const existing = Database.findLeadByNormalizedPhone(cleanPhone);
    if (existing) {
      if (!canAccessLead(req.user!, existing)) return res.status(409).json({ error: 'SĐT đã có người phụ trách. Liên hệ quản lý để phối hợp.', code: 'DUPLICATE_OUT_OF_SCOPE' });
      const nowIso = new Date().toISOString();
      const logContent = `Khách hàng liên hệ lại qua nguồn "${source}". Ghi chú mới: "${demandNotes || 'Không có ghi chú'}"`;

      const newHistoryItem = {
        id: `recontact-${Date.now()}`,
        date: new Date().toLocaleString('vi-VN'),
        type: 'Khách liên hệ lại',
        content: logContent,
        author: req.user?.fullName || 'Hệ thống AI'
      };

      const updatedExisting = {
        ...existing,
        lastContactedAt: nowIso,
        updatedAt: nowIso,
        history: [newHistoryItem, ...(existing.history || [])]
      };

      Database.upsertLead(updatedExisting);

      Database.recordAuditLog({
        userId: req.user?.userId || 'system',
        userName: req.user?.fullName || 'Khách/Hệ thống',
        action: 'LEAD_RECONTACT_DUPLICATE',
        targetType: 'LEAD',
        targetId: existing.id,
        details: { phone: cleanPhone, existingAssignee: existing.assignee }
      });

      return res.status(200).json({
        success: true,
        isDuplicate: true,
        message: `Khách hàng với SĐT "${phone}" đã tồn tại trong hệ thống. Đã ghi nhận lịch sử tương tác mới cho chuyên viên ${existing.assignee || 'phụ trách'}.`,
        lead: updatedExisting,
        assignedTo: {
          id: existing.assignedToId,
          name: existing.assignee,
          email: existing.assigneeEmail
        }
      });
    }

    // 2. ASSIGNMENT LOGIC (Round-Robin or Specified Assignee)
    let finalAssigneeId = req.user!.role === 'SALES_AGENT' ? req.user!.userId : assignedToId;
    let finalAssigneeName = req.user!.role === 'SALES_AGENT' ? req.user!.fullName : assignee;
    let finalAssigneeEmail: string | undefined = req.user!.role === 'SALES_AGENT' ? req.user!.email : body.assigneeEmail;

    if (!finalAssigneeName || finalAssigneeName === 'Tự động phân bổ' || finalAssigneeName.toLowerCase().includes('tự động')) {
      const { agent } = getNextRoundRobinAssignee(0, req.user!.role === 'TEAM_LEADER' ? req.user!.teamId : undefined);
      if (agent) {
        finalAssigneeId = agent.id;
        finalAssigneeName = agent.fullName;
        finalAssigneeEmail = agent.email;
      }
    } else {
      const targetUser = finalAssigneeId ? Database.findUserById(finalAssigneeId) : Database.getUsers().find(member => member.fullName === finalAssigneeName);
      if (!targetUser && req.user!.role === 'TEAM_LEADER') return res.status(403).json({ error: 'Hãy chọn người phụ trách hợp lệ trong phòng ban.' });
      if (targetUser && req.user!.role === 'TEAM_LEADER' && (!req.user!.teamId || targetUser.teamId !== req.user!.teamId)) return res.status(403).json({ error: 'Người nhận ngoài phòng ban.' });
      if (targetUser) {
        finalAssigneeId = targetUser.id;
        finalAssigneeName = targetUser.fullName;
        finalAssigneeEmail = targetUser.email;
      }
    }

    // 3. CREATE LEAD OBJECT
    const displayStatus = status || mapStageToDisplay(stage);
    const nowIso = new Date().toISOString();

    const newLeadData = {
      ...body,
      fullName: String(fullName).trim(),
      phone: cleanPhone,
      email: email ? String(email).trim() : '',
      source: source || 'Website',
      dataSource: source || 'Website',
      priority: priority || 'WARM',
      stage: mapDisplayToStage(displayStatus),
      status: displayStatus,
      productType: productType || 'Nhà phố trung tâm',
      budget: budget || 'Thương lượng',
      estimatedValue: Number(estimatedValue) || 0,
      actualValue: 0,
      tags: Array.isArray(tags) ? tags : [],
      customData: customData || {},
      demandNotes: demandNotes || '',
      assignedToId: finalAssigneeId,
      assignee: finalAssigneeName || 'Chưa phân bổ',
      assigneeEmail: finalAssigneeEmail,
      assignedAt: finalAssigneeName ? nowIso : undefined,
      lastContactedAt: nowIso,
      createdById: req.user?.userId,
      createdBy: req.user?.fullName || 'Hệ thống Web',
      history: [
        {
          id: `create-${Date.now()}`,
          date: new Date().toLocaleString('vi-VN'),
          type: 'Tiếp nhận Lead',
          content: `Tạo mới hồ sơ khách hàng. Chuyên viên phụ trách: ${finalAssigneeName || 'Chưa gán'}.`,
          author: req.user?.fullName || 'Hệ thống Quản trị'
        }
      ]
    };

    const { lead: createdLead } = Database.upsertLead(newLeadData);

    Database.recordAuditLog({
      userId: req.user?.userId || 'system',
      userName: req.user?.fullName || 'Người tạo',
      action: 'CREATE_LEAD',
      targetType: 'LEAD',
      targetId: createdLead.id,
      details: { code: createdLead.code, phone: cleanPhone, assignee: finalAssigneeName }
    });

    return res.status(201).json({
      success: true,
      isDuplicate: false,
      lead: createdLead,
      message: 'Thêm mới khách hàng thành công!'
    });
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ error: 'Lỗi máy chủ khi tạo khách hàng', details: error?.message });
  }
});

/**
 * GET /api/leads/:id
 * Retrieve single lead details with phone reveal check
 */
router.get('/:id', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const lead = Database.findLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin khách hàng.' });
    }

    const isSalesAgent = req.user?.role === 'SALES_AGENT';
    const isOwner = req.user?.userId && (lead.assignedToId === req.user.userId || lead.assigneeEmail === req.user.email);
    const maskingFlag = Database.getFeatureFlags().find((f) => f.key === 'DATA_MASKING_SALES_AGENT');

    if (isSalesAgent && maskingFlag?.isEnabled && !isOwner) {
      return res.json({
        ...lead,
        phone: maskPhoneNumber(lead.phone),
        rawPhoneMasked: true
      });
    }

    return res.json({
      ...lead,
      rawPhoneMasked: false
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi tải chi tiết khách hàng.', details: error?.message });
  }
});

/**
 * PUT /api/leads/:id
 * Update lead full profile
 */
router.put('/:id', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const existing = Database.findLeadById(leadId);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng để cập nhật.' });
    }

    if (!('expectedUpdatedAt' in req.body)) return res.status(428).json({ error: 'Cần phiên bản hồ sơ để cập nhật an toàn.', code: 'VERSION_REQUIRED' });
    const updates = req.body;
    if ('expectedUpdatedAt' in updates && updates.expectedUpdatedAt !== (existing.updatedAt || null)) {
      return res.status(409).json({ error: 'Hồ sơ đã được người khác sửa. Vui lòng tải lại.', code: 'VERSION_CONFLICT' });
    }
    delete updates.expectedUpdatedAt;
    delete updates.closedAt;
    delete updates.closedById;
    if (updates.status) updates.stage = mapDisplayToStage(updates.status);
    const changedOwner = ['assignedToId', 'assignee', 'assigneeEmail'].some(key => key in updates && updates[key] !== existing[key]);
    if (changedOwner && req.user!.role !== 'SALES_AGENT') {
      const target = updates.assignedToId ? Database.findUserById(updates.assignedToId) : Database.getUsers().find(member => member.fullName === updates.assignee);
      if (!target || target.status !== 'ACTIVE' || target.role === 'SUPER_ADMIN' || (req.user!.role === 'TEAM_LEADER' && (!req.user!.teamId || target.teamId !== req.user!.teamId))) return res.status(403).json({ error: 'Người nhận không hợp lệ hoặc ngoài phòng ban.' });
      if (!canReceiveLead(target)) return res.status(409).json({ error: 'Người nhận tắt nhận lead hoặc đã hết hạn mức ngày.' });
      Object.assign(updates, { assignedToId: target.id, assignee: target.fullName, assigneeEmail: target.email, assignedAt: new Date().toISOString(), acceptedAt: null, firstReportedAt: null, slaWarning: false, slaBreached: false });
    }
    if (req.user!.role === 'SALES_AGENT' && ['assignedToId', 'assignee', 'assigneeEmail', 'team'].some(key => key in updates && updates[key] !== existing[key])) {
      return res.status(403).json({ error: 'Không có quyền thay đổi người phụ trách.' });
    }
    const { lead: updatedLead } = Database.upsertLead({
      ...existing,
      ...updates,
      id: leadId
    });

    Database.recordAuditLog({
      userId: req.user?.userId || 'anonymous',
      userName: req.user?.fullName,
      action: 'UPDATE_LEAD',
      targetType: 'LEAD',
      targetId: leadId,
      details: { updates }
    });

    return res.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật khách hàng.', details: error?.message });
  }
});

/**
 * PATCH /api/leads/:id/stage
 * Kanban drag-and-drop stage change
 * When moving to WON (Đã chốt cọc), automatically credits actualValue to Sales KPI target
 */
router.patch('/:id/stage', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const { stage, status, actualValue = 0, note, author } = req.body;

    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const newStage = stage ? mapDisplayToStage(stage) : (status ? mapDisplayToStage(status) : 'NEW_LEAD');
    const newDisplayStatus = status || mapStageToDisplay(newStage);
    const oldStatus = lead.status || mapStageToDisplay(lead.stage);

    if ('expectedUpdatedAt' in req.body && req.body.expectedUpdatedAt !== (lead.updatedAt || null)) return res.status(409).json({ error: 'Hồ sơ đã thay đổi. Vui lòng tải lại.', code: 'VERSION_CONFLICT' });
    const nowIso = new Date().toISOString();
    const updatedLead = {
      ...lead,
      stage: newStage,
      status: newDisplayStatus,
      actualValue: Number(actualValue) > 0 ? Number(actualValue) : lead.actualValue || 0,
      updatedAt: nowIso,
      history: [
        {
          id: `stage-${Date.now()}`,
          date: new Date().toLocaleString('vi-VN'),
          type: 'Chuyển trạng thái phễu',
          content: `Chuyển trạng thái từ "${oldStatus}" sang "${newDisplayStatus}". ${note ? `Ghi chú: ${note}` : ''}`,
          author: author || req.user?.fullName || lead.assignee || 'Hệ thống'
        },
        ...(lead.history || [])
      ]
    };

    const { lead: savedLead } = Database.upsertLead(updatedLead);

    // Database.upsertLead applies the idempotent KPI credit for all update routes.
    if (newStage === 'WON' && mapDisplayToStage(lead.status || lead.stage) !== 'WON') {
      const revenue = Math.max(0, Number(actualValue) || Number(lead.actualValue) || 0);
      Database.recordAuditLog({
        userId: req.user?.userId || 'system',
        userName: req.user?.fullName || lead.assignee,
        action: 'LEAD_WON',
        targetType: 'LEAD',
        targetId: lead.id,
        details: {
          revenue,
          assignee: lead.assignee,
          assignedToId: lead.assignedToId
        }
      });
    }

    return res.json({
      success: true,
      lead: savedLead,
      message: `Đã chuyển khách sang "${newDisplayStatus}" thành công!`
    });
  } catch (error: any) {
    console.error('Stage transition error:', error);
    return res.status(500).json({ error: 'Lỗi cập nhật trạng thái phễu.', details: error?.message });
  }
});

/**
 * PATCH /api/leads/:id/status
 * Backward-compatibility endpoint for frontend status updates
 */
router.patch('/:id/status', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    if (!('expectedUpdatedAt' in req.body)) return res.status(428).json({ error: 'Cần phiên bản hồ sơ để cập nhật an toàn.', code: 'VERSION_REQUIRED' });
    const { status, author, history } = req.body;

    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    if ('expectedUpdatedAt' in req.body && req.body.expectedUpdatedAt !== (lead.updatedAt || null)) return res.status(409).json({ error: 'Hồ sơ đã thay đổi. Vui lòng tải lại.', code: 'VERSION_CONFLICT' });
    const nowIso = new Date().toISOString();
    const oldStatus = lead.status;
    const stage = mapDisplayToStage(status);

    let updatedHistory = lead.history || [];
    if (Array.isArray(history)) {
      updatedHistory = history;
    } else {
      updatedHistory = [
        {
          id: `log-${Date.now()}`,
          date: new Date().toLocaleString('vi-VN'),
          type: 'Ghi chú nội bộ',
          content: `Chuyển trạng thái từ "${oldStatus}" sang "${status}"`,
          author: author || req.user?.fullName || lead.assignee || 'Hệ thống'
        },
        ...updatedHistory
      ];
    }

    const updated = {
      ...lead,
      status,
      stage,
      history: updatedHistory,
      updatedAt: nowIso
    };

    const { lead: savedLead } = Database.upsertLead(updated);

    return res.json({ success: true, lead: savedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật trạng thái.', details: error?.message });
  }
});

/**
 * POST /api/leads/:id/activities
 * Record interaction activities (CALL, ZALO_MESSAGE, EMAIL, MEETING, NOTE)
 */
router.post('/:id/activities', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const { type = 'NOTE', title, content, attachments = [], durationSec } = req.body;

    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const nowIso = new Date().toISOString();
    const authorName = req.user?.fullName || lead.assignee || 'Chuyên viên';

    const activity = {
      id: `act-${Date.now()}`,
      leadId,
      userId: req.user?.userId || 'unknown',
      type,
      title: title || `Tương tác ${type}`,
      content: content || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      durationSec: durationSec ? Number(durationSec) : undefined,
      createdAt: nowIso
    };

    const historyItem = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleString('vi-VN'),
      type: title || type,
      content: content || '',
      author: authorName
    };

    const updatedLead = {
      ...lead,
      lastContactedAt: nowIso,
      updatedAt: nowIso,
      firstReportedAt: ['CALL', 'ZALO_MESSAGE', 'EMAIL', 'MEETING'].includes(type) && String(content || '').trim() ? (lead.firstReportedAt || nowIso) : lead.firstReportedAt,
      activities: [activity, ...(lead.activities || [])],
      history: [historyItem, ...(lead.history || [])]
    };

    Database.upsertLead(updatedLead);

    // If activity was a call, increment user KPI achieved calls
    if (type === 'CALL' && req.user?.userId) {
      const now = new Date();
      const currentKpi = Database.getUserKpiTarget(req.user.userId, now.getMonth() + 1, now.getFullYear());
      Database.upsertKpiTarget({
        userId: req.user.userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        achievedCalls: (currentKpi.achievedCalls || 0) + 1
      });
    }

    return res.json({
      success: true,
      activity,
      lead: updatedLead,
      message: 'Ghi nhận tương tác thành công!'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi ghi nhận tương tác.', details: error?.message });
  }
});

/**
 * POST /api/leads/:id/quick-note
 * Append quick note with author and optional timestamp to lead
 */
router.post('/:id/quick-note', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const { note, includeTimestamp, author } = req.body;
    if (!note || !String(note).trim()) {
      return res.status(400).json({ error: 'Nội dung ghi chú không được để trống.' });
    }

    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const nowIso = new Date().toISOString();
    const authorName = author || req.user?.fullName || lead.assignee || 'Chuyên viên';
    
    const now = new Date();
    const timeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}`;
    const cleanNote = String(note).trim();
    const bulletPrefix = includeTimestamp ? `• [${timeFormatted}] ` : '• ';
    const formattedBullet = cleanNote.startsWith('•') || cleanNote.startsWith('-') ? cleanNote : `${bulletPrefix}${cleanNote}`;

    const currentNotes = lead.notes || lead.demandNotes || '';
    const newNotes = currentNotes ? `${currentNotes}\n${formattedBullet}` : formattedBullet;

    const newHistoryItem = {
      id: `note-${Date.now()}`,
      date: new Date().toLocaleString('vi-VN'),
      type: 'Ghi chú',
      content: formattedBullet,
      author: authorName
    };

    const updated = {
      ...lead,
      notes: newNotes,
      demandNotes: newNotes,
      history: [newHistoryItem, ...(lead.history || [])],
      updatedAt: nowIso
    };

    const { lead: updatedLead } = Database.upsertLead(updated);

    Database.recordAuditLog({
      userId: req.user?.userId || 'anonymous',
      userName: authorName,
      action: 'ADD_QUICK_NOTE',
      targetType: 'LEAD',
      targetId: leadId,
      details: { note: formattedBullet }
    });

    return res.json({ success: true, lead: updatedLead, note: formattedBullet });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi thêm ghi chú nhanh.', details: error?.message });
  }
});

/**
 * POST /api/leads/:id/zalo-connect
 * Toggle Zalo connection status for lead
 */
router.post('/:id/zalo-connect', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const { connected } = req.body;

    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const isConnected = connected !== undefined ? Boolean(connected) : !lead.zaloConnected;
    const nowIso = new Date().toISOString();
    const authorName = req.user?.fullName || lead.assignee || 'Chuyên viên';

    const historyItem = {
      id: `zalo-${Date.now()}`,
      date: new Date().toLocaleString('vi-VN'),
      type: 'Kết nối Zalo',
      content: isConnected ? 'Đã kết nối Zalo với khách hàng' : 'Đã hủy trạng thái kết nối Zalo',
      author: authorName
    };

    const updated = {
      ...lead,
      zaloConnected: isConnected,
      zaloConnectedAt: isConnected ? nowIso : undefined,
      history: [historyItem, ...(lead.history || [])],
      updatedAt: nowIso
    };

    const { lead: updatedLead } = Database.upsertLead(updated);

    return res.json({ success: true, lead: updatedLead, zaloConnected: isConnected });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi cập nhật trạng thái Zalo.', details: error?.message });
  }
});

/**
 * POST /api/leads/:id/reveal-phone
 * Unmask phone number for SALES_AGENT and immediately record Audit Log
 */
router.post('/:id/reveal-phone', authenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    }

    const user = req.user!;

    // Audit log recording
    Database.recordAuditLog({
      userId: user.userId,
      userEmail: user.email,
      userName: user.fullName,
      userRole: user.role,
      action: 'VIEW_PHONE_NUMBER',
      targetType: 'LEAD',
      targetId: lead.id,
      details: {
        customerCode: lead.code,
        customerName: lead.fullName,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    return res.json({
      success: true,
      phone: lead.phone,
      fullPhone: lead.phone,
      message: 'Đã giải mã số điện thoại và ghi nhận nhật ký kiểm toán.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi mở số điện thoại.', details: error?.message });
  }
});

/**
 * POST /api/leads/assign
 * Reassign leads:
 * Mode 1: Manual assign (SUPER_ADMIN / TEAM_LEADER)
 * Mode 2: Round-Robin distribute
 * Mode 3: Claim lead from PUBLIC_POOL (SALES_AGENT)
 */
router.post('/assign', (req, res, next) => req.body?.mode === 'claim' ? next() : requireTeamLeaderOrAdmin(req, res, next), (req: Request, res: Response) => {
  try {
    const { leadIds, targetUserId, mode = 'manual' } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 khách hàng để phân bổ.' });
    }

    const leads = Database.getLeads();
    if (mode !== 'claim' && leadIds.some(id => { const lead = leads.find(item => item.id === id); return lead && !canAccessLead(req.user!, lead); })) {
      return res.status(403).json({ error: 'Không có quyền phân bổ khách ngoài phạm vi phụ trách.' });
    }
    const leadMap = new Map(leads.map((l) => [l.id, l]));
    const nowIso = new Date().toISOString();

    // Mode 3: SALES_AGENT Claim Lead from PUBLIC_POOL
    if (mode === 'claim') {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Vui lòng đăng nhập để nhận khách từ kho chung.' });
      }

      const leadId = leadIds[0];
      const lead = leadMap.get(leadId);
      if (!lead) return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });

      const stage = mapDisplayToStage(lead.status || lead.stage);
      if (stage !== 'PUBLIC_POOL' && lead.status !== 'Kho khách chung') {
        return res.status(400).json({ error: 'Khách hàng này hiện không nằm trong Kho khách chung.' });
      }

      const receiver = Database.findUserById(user.userId);
      if (!receiver || !canReceiveLead(receiver)) return res.status(409).json({ error: 'Không thể nhận thêm lead trong ngày.' });
      const updated = {
        ...lead,
        assignedToId: user.userId,
        assignee: user.fullName,
        assigneeEmail: user.email,
        stage: 'NEW_LEAD',
        status: 'Khách mới',
        assignedAt: nowIso,
        acceptedAt: undefined,
        firstReportedAt: undefined,
        slaWarning: false,
        slaBreached: false,
        lastContactedAt: nowIso,
        history: [
          {
            id: `claim-${Date.now()}`,
            date: new Date().toLocaleString('vi-VN'),
            type: 'Nhận khách',
            content: `Chuyên viên ${user.fullName} đã tiếp nhận khách từ Kho khách chung.`,
            author: user.fullName
          },
          ...(lead.history || [])
        ]
      };

      Database.upsertLead(updated);

      Database.recordAuditLog({
        userId: user.userId,
        userName: user.fullName,
        action: 'CLAIM_PUBLIC_LEAD',
        targetType: 'LEAD',
        targetId: leadId,
        details: { leadCode: lead.code }
      });

      return res.json({
        success: true,
        message: `Bạn đã nhận thành công khách hàng ${lead.fullName}!`,
        lead: updated
      });
    }

    // Mode 1: Manual Assign to a specific user
    if (targetUserId) {
      const targetUser = Database.findUserById(targetUserId);
      if (targetUser && (targetUser.status !== 'ACTIVE' || targetUser.role === 'SUPER_ADMIN' || (req.user!.role === 'TEAM_LEADER' && (!req.user!.teamId || targetUser.teamId !== req.user!.teamId)))) return res.status(403).json({ error: 'Người nhận không thuộc phạm vi phân bổ.' });
      if (!targetUser) {
        return res.status(404).json({ error: 'Không tìm thấy nhân viên được chỉ định.' });
      }

      if (!canReceiveLead(targetUser) || leadIds.length > targetUser.maxDailyLeads - Database.getLeads().filter(lead => lead.assignedToId === targetUser.id && lead.assignedAt && new Date(lead.assignedAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })).length) return res.status(409).json({ error: 'Người nhận đang tắt nhận lead hoặc vượt hạn mức ngày.' });
      leadIds.forEach((id) => {
        const lead = leadMap.get(id);
        if (lead) {
          lead.assignedToId = targetUser.id;
          lead.assignee = targetUser.fullName;
          lead.assigneeEmail = targetUser.email;
          lead.assignedAt = nowIso;
          lead.acceptedAt = undefined;
          lead.firstReportedAt = undefined;
          lead.slaBreached = false;
          lead.slaWarning = false;
          lead.history = [
            {
              id: `assign-${Date.now()}-${id}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Phân bổ nhân sự',
              content: `Điều chuyển phụ trách sang chuyên viên ${targetUser.fullName} (${targetUser.email}).`,
              author: req.user?.fullName || 'Hệ thống Quản trị'
            },
            ...(lead.history || [])
          ];
          Database.upsertLead(lead);
        }
      });

      Database.recordAuditLog({
        userId: req.user?.userId || 'system',
        userName: req.user?.fullName,
        action: 'ASSIGN_LEADS_MANUAL',
        targetType: 'LEAD',
        details: { assignedCount: leadIds.length, targetSales: targetUser.fullName }
      });

      return res.json({
        success: true,
        count: leadIds.length,
        message: `Đã phân bổ ${leadIds.length} khách hàng cho ${targetUser.fullName}.`
      });
    }

    // Mode 2: Round-Robin distribution across active online agents
    let roundRobinPointer = 0;
    let distributedCount = 0;

    leadIds.forEach((id) => {
      const lead = leadMap.get(id);
      if (lead) {
        const { agent, nextIndex } = getNextRoundRobinAssignee(roundRobinPointer, req.user!.role === 'TEAM_LEADER' ? req.user!.teamId : undefined);
        roundRobinPointer = nextIndex;

        if (agent) {
          lead.assignedToId = agent.id;
          lead.assignee = agent.fullName;
          lead.assigneeEmail = agent.email;
          lead.assignedAt = nowIso;
          lead.acceptedAt = undefined;
          lead.firstReportedAt = undefined;
          lead.slaBreached = false;
          lead.slaWarning = false;
          lead.history = [
            {
              id: `dist-${Date.now()}-${id}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Phân bổ tự động',
              content: `Hệ thống phân bổ xoay vòng (Round-Robin) cho chuyên viên ${agent.fullName}.`,
              author: 'Hệ thống CRM SalePro'
            },
            ...(lead.history || [])
          ];
          Database.upsertLead(lead);
          distributedCount++;
        }
      }
    });

    Database.recordAuditLog({
      userId: req.user?.userId || 'system',
      userName: req.user?.fullName,
      action: 'ASSIGN_LEADS_ROUND_ROBIN',
      targetType: 'LEAD',
      details: { distributedCount }
    });

    return res.json({
      success: true,
      distributedCount,
      message: `Đã phân bổ xoay vòng thành công ${distributedCount} khách hàng.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi phân bổ khách hàng.', details: error?.message });
  }
});

/**
 * POST /api/leads/auto-reclaim
 * Trigger automated sweep to move neglected leads to PUBLIC_POOL
 */
router.post('/auto-reclaim', requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { reclaimDays = 7 } = req.body || {};
    const result = autoReclaimNeglectedLeads(Number(reclaimDays) || 7);

    return res.json({
      success: true,
      reclaimedCount: result.reclaimedCount,
      message: `Đã kiểm tra và thu hồi ${result.reclaimedCount} khách hàng vào Kho khách chung.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi thu hồi khách hàng tự động.', details: error?.message });
  }
});

/**
 * DELETE /api/leads/:id
 * Delete a single lead (Super Admin or Team Leader)
 */
router.delete('/:id', optionalAuthenticateToken, (req: Request, res: Response) => {
  try {
    const leadId = req.params.id;
    const lead = Database.findLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Không tìm thấy khách hàng để xóa.' });
    }

    Database.deleteLead(leadId);

    Database.recordAuditLog({
      userId: req.user?.userId || 'anonymous',
      userName: req.user?.fullName,
      action: 'DELETE_LEAD',
      targetType: 'LEAD',
      targetId: leadId,
      details: { code: lead.code, name: lead.fullName, phone: lead.phone }
    });

    return res.json({ success: true, message: 'Đã xóa khách hàng thành công.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi khi xóa khách hàng.', details: error?.message });
  }
});

/**
 * POST /api/leads/bulk-delete
 */
router.post('/bulk-delete', requireSuperAdmin, (req: Request, res: Response) => {
  try {
    const { ids = [] } = req.body || {};
    const deletedCount = Database.deleteBulkLeads(Array.isArray(ids) ? ids : [ids]);

    Database.recordAuditLog({
      userId: req.user?.userId || 'anonymous',
      userName: req.user?.fullName,
      action: 'BULK_DELETE_LEADS',
      targetType: 'LEAD',
      details: { deletedCount, ids }
    });

    return res.json({ success: true, deletedCount });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi xóa hàng loạt khách hàng.', details: error?.message });
  }
});

/**
 * POST /api/leads/import
 * Import list of leads from Excel/CSV with deduplication and assignment
 */
router.post('/import', requireTeamLeaderOrAdmin, (req: Request, res: Response) => {
  try {
    const { 
      leads: incomingLeads = [], 
      autoDistribute = false, 
      targetUserId,
      targetSaleName,
      assignTargetMode = 'round_robin',
      duplicateHandlingMode = 'skip_protect_old_sale'
    } = req.body || {};

    if (!Array.isArray(incomingLeads) || incomingLeads.length === 0) {
      return res.status(400).json({ error: 'Danh sách khách hàng import rỗng.' });
    }

    let importedCount = 0;
    let duplicateCount = 0;
    let noteUpdatedCount = 0;
    let reassignedCount = 0;
    const duplicates: any[] = [];
    const newLeadsToAdd: any[] = [];
    let currentLeads = Database.getLeads();

    let targetUser: any = null;
    if (targetUserId) {
      targetUser = Database.findUserById(targetUserId);
    } else if (targetSaleName) {
      targetUser = Database.findUserByIdentifier(targetSaleName)?.user || Database.getUsers().find(u => u.fullName.toLowerCase() === targetSaleName.toLowerCase());
    }

    if (req.user!.role === 'TEAM_LEADER') {
      if (!req.user!.teamId || !targetUser || targetUser.teamId !== req.user!.teamId) return res.status(403).json({ error: 'Hãy chọn người nhận trong phòng ban của bạn.' });
      if (incomingLeads.some(item => { const existing = Database.findLeadByNormalizedPhone(normalizePhone(item.phone)); return existing && !canAccessLead(req.user!, existing); })) return res.status(403).json({ error: 'File chứa khách hàng ngoài phạm vi quản lý.' });
    }
    let roundRobinPointer = 0;
    const nowIso = new Date().toISOString();

    for (const item of incomingLeads) {
      if (!item || !item.fullName || !item.phone) continue;

      const cleanPhone = normalizePhone(item.phone);
      if (cleanPhone.length < 9) continue;

      // Smart Deduplication check
      const existing = Database.findLeadByNormalizedPhone(cleanPhone);
      if (existing) {
        duplicateCount++;
        duplicates.push({
          fullName: item.fullName,
          phone: cleanPhone,
          existingAssignee: existing.assignee
        });

        if (duplicateHandlingMode === 'skip_protect_old_sale') {
          // Protect old sale, record interaction note
          const updatedHistory = [
            {
              id: `protect-${Date.now()}-${existing.id}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Bảo vệ khách cũ',
              content: `🛡️ Khách xuất hiện lại trong đợt nạp file mới. Giữ nguyên quyền chăm sóc cho ${existing.assignee || 'Sale cũ'}. Ghi chú mới: "${item.notes || 'Không có'}"`,
              author: req.user?.fullName || 'Hệ thống Quản trị'
            },
            ...(existing.history || [])
          ];
          Database.upsertLead({ ...existing, history: updatedHistory, updatedAt: nowIso });
        } else if (duplicateHandlingMode === 'update_old_sale_note') {
          // Append note to existing lead
          noteUpdatedCount++;
          const extraNote = item.notes ? ` | Nhu cầu nạp mới: ${item.notes}` : '';
          const updatedHistory = [
            {
              id: `update-note-${Date.now()}-${existing.id}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Cập nhật ghi chú',
              content: `📝 Bổ sung thông tin từ đợt nạp mới. Giữ nguyên ${existing.assignee}.${extraNote}`,
              author: req.user?.fullName || 'Hệ thống Quản trị'
            },
            ...(existing.history || [])
          ];
          Database.upsertLead({
            ...existing,
            notes: `${existing.notes || ''}${extraNote}`,
            history: updatedHistory,
            updatedAt: nowIso
          });
        } else if (duplicateHandlingMode === 'reassign_to_new_sale') {
          // Reassign to new target
          reassignedCount++;
          const newAssignee = targetUser?.fullName || targetSaleName || 'Chưa phân công';
          const updatedHistory = [
            {
              id: `reassign-${Date.now()}-${existing.id}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Bàn giao chuyển Sale',
              content: `🔀 Điều chuyển quyền chăm sóc từ ${existing.assignee} sang ${newAssignee} theo đợt nạp dữ liệu.`,
              author: req.user?.fullName || 'Hệ thống Quản trị'
            },
            ...(existing.history || [])
          ];
          Database.upsertLead({
            ...existing,
            assignee: newAssignee,
            assignedToId: targetUser?.id,
              assigneeEmail: targetUser?.email,
              acceptedAt: undefined,
              firstReportedAt: undefined,
              slaWarning: false,
              slaBreached: false,
            assignedAt: nowIso,
            history: updatedHistory,
            updatedAt: nowIso
          });
        }

        continue;
      }

      // Assignment for clean new lead
      let assigneeId: string | undefined;
      let assigneeName = item.assignee || 'Chưa phân bổ';
      let assigneeEmail: string | undefined;

      if (assignTargetMode === 'single_sale' || targetUser) {
        if (targetUser) {
          assigneeId = targetUser.id;
          assigneeName = targetUser.fullName;
          assigneeEmail = targetUser.email;
        } else if (targetSaleName) {
          assigneeName = targetSaleName;
        }
      } else if (assignTargetMode === 'public_pool') {
        assigneeName = 'Kho khách chung';
      } else if (assignTargetMode === 'round_robin' || autoDistribute) {
        const { agent, nextIndex } = getNextRoundRobinAssignee(roundRobinPointer);
        roundRobinPointer = nextIndex;
        if (agent) {
          assigneeId = agent.id;
          assigneeName = agent.fullName;
          assigneeEmail = agent.email;
        }
      }

      const displayStatus = assignTargetMode === 'public_pool' 
        ? 'Kho khách chung' 
        : (item.status || mapStageToDisplay(item.stage || 'NEW_LEAD'));

      const newLead = {
        ...item,
        id: item.id || `lead-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        code: item.code || `KH-${String(currentLeads.length + newLeadsToAdd.length + 1).padStart(4, '0')}`,
        fullName: String(item.fullName).trim(),
        phone: cleanPhone,
        email: item.email ? String(item.email).trim() : '',
        source: item.source || item.dataSource || 'Import Excel',
        dataSource: item.dataSource || item.source || 'Import Excel',
        priority: item.priority || 'WARM',
        stage: mapDisplayToStage(displayStatus),
        status: displayStatus,
        assignedToId: assigneeId,
        assignee: assigneeName,
        assigneeEmail: assigneeEmail,
        assignedAt: (assigneeName !== 'Chưa phân bổ' && assigneeName !== 'Kho khách chung') ? nowIso : undefined,
        lastContactedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso,
        history: [
          {
            id: `import-${Date.now()}-${importedCount}`,
            date: new Date().toLocaleString('vi-VN'),
            type: 'Import Excel/CSV',
            content: `Import dữ liệu vào hệ thống. Phụ trách: ${assigneeName}.`,
            author: req.user?.fullName || 'Hệ thống Quản trị'
          }
        ]
      };

      newLeadsToAdd.push(newLead);
      importedCount++;
    }

    if (newLeadsToAdd.length > 0) {
      currentLeads = Database.getLeads();
      Database.saveLeads([...newLeadsToAdd, ...currentLeads]);
    }

    Database.recordAuditLog({
      userId: req.user?.userId || 'anonymous',
      userName: req.user?.fullName,
      action: 'IMPORT_LEADS',
      targetType: 'LEAD',
      details: {
        totalIncoming: incomingLeads.length,
        importedCount,
        duplicateCount,
        noteUpdatedCount,
        reassignedCount,
        assignTargetMode,
        targetSaleName: targetSaleName || targetUser?.fullName
      }
    });

    const allFinalLeads = Database.getLeads();

    return res.json({
      success: true,
      importedCount,
      duplicateCount,
      noteUpdatedCount,
      reassignedCount,
      duplicates,
      newLeads: newLeadsToAdd,
      leads: allFinalLeads,
      message: `Đã lưu thành công ${importedCount} khách hàng vào Database (${duplicateCount} khách bị trùng SĐT đã được xử lý an toàn).`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi import khách hàng.', details: error?.message });
  }
});

/**
 * POST /api/leads/distribute
 * Backward-compatible distribute endpoint for UI distribution modal
 */
router.post('/distribute', requireTeamLeaderOrAdmin, (req: Request, res: Response) => {
  try {
    const { forceAll = false, targetMemberNames } = req.body || {};
    const leads = Database.getLeads();
    const allUsers = Database.getUsers();

    let eligible = allUsers.filter((u) => u.status === 'ACTIVE' && u.role === 'SALES_AGENT' && u.isOnlineForLead && (req.user!.role === 'SUPER_ADMIN' || (req.user!.teamId && u.teamId === req.user!.teamId)));

    if (Array.isArray(targetMemberNames) && targetMemberNames.length > 0) {
      const filteredByTarget = eligible.filter((u) => targetMemberNames.includes(u.fullName));
      eligible = filteredByTarget;
    }

    if (eligible.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy chuyên viên kinh doanh nào để phân bổ.' });
    }

    const assignedInBatch: Record<string, number> = {};
    let pointer = 0;
    let distributedCount = 0;
    const nowIso = new Date().toISOString();

    const updatedLeads = leads.map((lead: any) => {
      const cleanAssignee = (lead.assignee || '').toLowerCase().trim();
      const isUnassigned =
        !lead.assignee ||
        cleanAssignee === '' ||
        cleanAssignee.includes('chưa') ||
        cleanAssignee.includes('tổng') ||
        cleanAssignee.includes('tự động') ||
        cleanAssignee.includes('trống') ||
        cleanAssignee === 'admin' ||
        cleanAssignee.includes('bùi văn trường') ||
        cleanAssignee.includes('kho khách chung') ||
        cleanAssignee === 'null';

      const needsAssign = (forceAll || isUnassigned) && (req.user!.role === 'SUPER_ADMIN' || canAccessLead(req.user!, lead));

      if (needsAssign) {
        const available = eligible.filter(member => canReceiveLead(member, leads, assignedInBatch[member.id] || 0));
        if (!available.length) return lead;
        const targetMember = available[pointer % available.length];
        assignedInBatch[targetMember.id] = (assignedInBatch[targetMember.id] || 0) + 1;
        pointer++;
        distributedCount++;

        return {
          ...lead,
          assignedToId: targetMember.id,
          assignee: targetMember.fullName,
          assigneeEmail: targetMember.email,
          assignedAt: nowIso,
          acceptedAt: undefined,
          firstReportedAt: undefined,
          slaWarning: false,
          slaBreached: false,
          history: [
            ...(lead.history || []),
            {
              id: `dist-${Date.now()}-${pointer}`,
              date: new Date().toLocaleString('vi-VN'),
              type: 'Phân bổ tự động',
              content: `Hệ thống phân bổ cho chuyên viên ${targetMember.fullName} (${targetMember.email}).`,
              author: req.user?.fullName || 'Hệ thống Quản trị SalePro'
            }
          ]
        };
      }
      return lead;
    });

    Database.saveLeads(updatedLeads);

    return res.json({
      success: true,
      distributedCount,
      totalLeads: updatedLeads.length,
      leads: updatedLeads,
      message: `Đã phân bổ thành công ${distributedCount} khách hàng.`
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi phân bổ khách hàng.', details: error?.message });
  }
});

/**
 * POST /api/leads/clear-demo
 */
router.post('/clear-demo', requireSuperAdmin, (_req: Request, res: Response) => {
  try {
    const leads = Database.getLeads();
    // Keep only real leads
    const realLeads = leads.filter((l) => {
      const name = (l.fullName || '').toLowerCase();
      return !name.includes('demo') && !name.includes('mẫu') && !name.includes('khách mẫu');
    });

    realLeads.forEach((l, idx) => {
      l.stt = idx + 1;
    });

    Database.saveLeads(realLeads);

    return res.json({
      success: true,
      remainingCount: realLeads.length,
      leads: realLeads,
      message: 'Đã dọn dẹp các lead demo thành công.'
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Lỗi xóa dữ liệu demo.', details: error?.message });
  }
});

export default router;
