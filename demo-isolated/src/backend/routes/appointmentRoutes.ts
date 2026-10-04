import { Router, Request, Response } from 'express';
import { Database } from '../db';
import { mapDisplayToStage } from '../services/leadService';
import { authenticateToken, canAccessLead } from '../middleware';
import { JwtTokenPayload } from '../types';

const router = Router();
router.use(authenticateToken);

const APPOINTMENT_STATUSES = ['Chờ đi xem', 'Đã xem', 'Khách dời lịch', 'Đã huỷ'];
// Statuses at or beyond the viewing step; booking a viewing must not move these backwards.
const KEEP_STATUS_ON_BOOKING = new Set(['Hẹn xem BĐS', 'Đàm phán / Cọc', 'Đã chốt']);
const SLOT_MINUTES = 60;

const formatDate = (date: string) => date.split('-').reverse().join('/');

/** Appointments follow the visibility of their customer; orphaned ones are admin-only. */
function canSeeAppointment(user: JwtTokenPayload, appointment: any, leadsById: Map<string, any>): boolean {
  const lead = leadsById.get(appointment.leadId);
  return lead ? canAccessLead(user, lead) : user.role === 'SUPER_ADMIN';
}

function findConflicts(appointments: any[], candidate: { date: string; time: string; assignee: string }, ignoreId?: string) {
  const start = Date.parse(`${candidate.date}T${candidate.time}`);
  const assignee = (candidate.assignee || '').trim().toLowerCase();
  return appointments.filter(app =>
    app.id !== ignoreId &&
    app.status === 'Chờ đi xem' &&
    (app.assignee || '').trim().toLowerCase() === assignee &&
    Math.abs(Date.parse(`${app.date}T${app.time}`) - start) < SLOT_MINUTES * 60000
  );
}

function appendLeadHistory(lead: any, content: string, author: string, extra: Record<string, any> = {}) {
  return Database.upsertLead({
    ...lead,
    ...extra,
    history: [
      {
        id: `appt-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        date: new Date().toISOString().replace('T', ' ').slice(0, 16),
        type: 'Gặp mặt / Xem nhà',
        content,
        author
      },
      ...(lead.history || [])
    ]
  }).lead;
}

/**
 * GET /api/appointments
 * Appointments of every customer the current user may access.
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const leadsById = new Map(Database.getLeads().map(lead => [lead.id, lead]));
    const visible = Database.getAppointments()
      .filter(app => canSeeAppointment(req.user!, app, leadsById))
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    return res.json(visible);
  } catch (error: any) {
    return res.status(500).json({ error: 'Không tải được lịch hẹn.', details: error?.message });
  }
});

/**
 * POST /api/appointments
 * Book a viewing, move the customer to "Hẹn xem BĐS" and log it in the customer's history.
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { leadId, date, time, location, note } = req.body || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time)) || Number.isNaN(Date.parse(`${date}T${time}`))) {
      return res.status(400).json({ error: 'Ngày hoặc giờ hẹn không hợp lệ.' });
    }

    const lead = Database.findLeadById(String(leadId || ''));
    if (!lead) return res.status(404).json({ error: 'Không tìm thấy khách hàng.' });
    if (!canAccessLead(req.user!, lead)) {
      return res.status(403).json({ error: 'Khách hàng ngoài phạm vi phụ trách.', code: 'FORBIDDEN_LEAD' });
    }

    const appointments = Database.getAppointments();
    const assignee = lead.assignee || 'Chưa gán';
    const conflicts = findConflicts(appointments, { date, time, assignee });
    if (conflicts.length) {
      return res.status(409).json({
        error: `Trùng lịch của ${assignee}: ${conflicts.map(app => `${app.leadName} lúc ${app.time}`).join(', ')}. Mỗi lịch dành ${SLOT_MINUTES} phút; vui lòng chọn giờ khác.`,
        code: 'APPOINTMENT_CONFLICT'
      });
    }

    const nowIso = new Date().toISOString();
    const appointment = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      leadId: lead.id,
      leadName: lead.fullName,
      leadPhone: lead.phone,
      date,
      time,
      project: lead.project || '',
      location: String(location || '').trim() || `Dự án ${lead.project || ''}`.trim(),
      assignee,
      assignedToId: lead.assignedToId,
      status: 'Chờ đi xem',
      note: String(note || '').trim(),
      createdAt: nowIso,
      createdBy: req.user!.fullName
    };
    Database.saveAppointments([appointment, ...appointments]);

    const statusUpdate = KEEP_STATUS_ON_BOOKING.has(lead.status) ? {} : { status: 'Hẹn xem BĐS', stage: mapDisplayToStage('Hẹn xem BĐS') };
    const updatedLead = appendLeadHistory(
      lead,
      `Đặt lịch hẹn xem BĐS lúc ${time} ngày ${formatDate(date)} tại ${appointment.location}.${appointment.note ? ` Ghi chú: ${appointment.note}` : ''}`,
      req.user!.fullName,
      statusUpdate
    );

    Database.recordAuditLog({
      userId: req.user!.userId,
      userName: req.user!.fullName,
      userRole: req.user!.role,
      action: 'APPOINTMENT_CREATE',
      targetType: 'LEAD',
      targetId: lead.id,
      details: { appointmentId: appointment.id, date, time, assignee }
    });

    return res.status(201).json({ success: true, appointment, lead: updatedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Không lưu được lịch hẹn.', details: error?.message });
  }
});

/**
 * PATCH /api/appointments/:id
 * Change appointment status (Đã xem, Khách dời lịch, Đã huỷ) and log it in the customer's history.
 */
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { status } = req.body || {};
    if (!APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Trạng thái lịch hẹn không hợp lệ.' });
    }

    const appointments = Database.getAppointments();
    const index = appointments.findIndex(app => app.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Không tìm thấy lịch hẹn.' });

    const lead = Database.findLeadById(appointments[index].leadId);
    const leadsById = new Map(lead ? [[lead.id, lead]] : []);
    if (!canSeeAppointment(req.user!, appointments[index], leadsById)) {
      return res.status(403).json({ error: 'Lịch hẹn ngoài phạm vi phụ trách.' });
    }

    const previous = appointments[index];
    if (previous.status === status) return res.json({ success: true, appointment: previous, lead });
    if (status === 'Chờ đi xem') {
      const conflicts = findConflicts(appointments, previous, previous.id);
      if (conflicts.length) {
        return res.status(409).json({ error: `Trùng lịch của ${previous.assignee} lúc ${conflicts[0].time}.`, code: 'APPOINTMENT_CONFLICT' });
      }
    }

    const appointment = { ...previous, status, updatedAt: new Date().toISOString(), updatedBy: req.user!.fullName };
    appointments[index] = appointment;
    Database.saveAppointments(appointments);

    const updatedLead = lead
      ? appendLeadHistory(lead, `Lịch hẹn xem BĐS ${appointment.time} ngày ${formatDate(appointment.date)}: ${previous.status} → ${status}.`, req.user!.fullName)
      : null;

    return res.json({ success: true, appointment, lead: updatedLead });
  } catch (error: any) {
    return res.status(500).json({ error: 'Không cập nhật được lịch hẹn.', details: error?.message });
  }
});

export default router;
