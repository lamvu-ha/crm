import { Database, DbUser } from '../db';

export function normalizePhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  let digits = String(rawPhone).replace(/[^0-9+]/g, '');
  if (digits.startsWith('+84')) {
    digits = '0' + digits.slice(3);
  } else if (digits.startsWith('84') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  }
  return digits.replace(/[^0-9]/g, '');
}

/**
 * Mask 3 middle digits of a phone number for SALES_AGENT data protection
 * Example: 0000000013 -> 094***7962
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '';
  const clean = String(phone).trim();
  if (clean.length < 7) return clean;
  
  const start = clean.slice(0, 3);
  const end = clean.slice(-4);
  return `${start}***${end}`;
}

export const STAGE_MAP: Record<string, string> = {
  NEW_LEAD: 'Khách mới',
  CONTACTING: 'Đang chăm sóc',
  QUALIFIED: 'Hẹn xem BĐS',
  PROPOSAL: 'Đàm phán',
  WON: 'Đã chốt',
  LOST: 'Không nhu cầu',
  PUBLIC_POOL: 'Kho khách chung'
};

export const REVERSE_STAGE_MAP: Record<string, string> = {
  'khách mới': 'NEW_LEAD',
  'đang chăm sóc': 'CONTACTING',
  'hẹn xem bđs': 'QUALIFIED',
  'đàm phán': 'PROPOSAL',
  'đàm phán / cọc': 'PROPOSAL',
  'đã chốt': 'WON',
  'đã chốt cọc': 'WON',
  'không nhu cầu': 'LOST',
  'kho khách chung': 'PUBLIC_POOL'
};

export function mapStageToDisplay(stage?: string): string {
  if (!stage) return 'Khách mới';
  return STAGE_MAP[stage] || stage;
}

export function mapDisplayToStage(status?: string): string {
  if (!status) return 'NEW_LEAD';
  const clean = status.toLowerCase().trim();
  return REVERSE_STAGE_MAP[clean] || (STAGE_MAP[status] ? status : 'NEW_LEAD');
}

/**
 * Round-robin assigner: selects next eligible active sales agent
 */
export function canReceiveLead(user: DbUser, leads = Database.getLeads(), additionalCount = 0): boolean {
  if (user.status !== 'ACTIVE' || user.role === 'SUPER_ADMIN' || !user.isOnlineForLead) return false;
  const day = (value: string | Date) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const today = day(new Date());
  const count = leads.filter(lead => lead.assignedToId === user.id && lead.assignedAt && day(lead.assignedAt) === today).length;
  return count + additionalCount < user.maxDailyLeads;
}

export function getNextRoundRobinAssignee(currentAssigneeIndex = 0, teamId?: string): { agent: DbUser | null; nextIndex: number } {
  const eligible = Database.getUsers().filter(user => user.role === 'SALES_AGENT' && canReceiveLead(user) && (!teamId || user.teamId === teamId));
  if (!eligible.length) return { agent: null, nextIndex: 0 };
  return { agent: eligible[currentAssigneeIndex % eligible.length], nextIndex: (currentAssigneeIndex + 1) % eligible.length };
}

/**
 * Auto-reclaim neglected leads into PUBLIC_POOL
 * Leads in NEW_LEAD or CONTACTING with no activities for X days (default 7 days)
 */
export function autoReclaimNeglectedLeads(reclaimDays: number = 7): { reclaimedCount: number; leadIds: string[] } {
  const leads = Database.getLeads();
  const now = Date.now();
  const msThreshold = reclaimDays * 24 * 60 * 60 * 1000;
  const reclaimedIds: string[] = [];

  const updatedLeads = leads.map((lead) => {
    const stage = mapDisplayToStage(lead.status || lead.stage);
    if (stage !== 'NEW_LEAD' && stage !== 'CONTACTING') {
      return lead;
    }

    const lastTime = lead.lastContactedAt 
      ? new Date(lead.lastContactedAt).getTime()
      : (lead.assignedAt ? new Date(lead.assignedAt).getTime() : new Date(lead.createdAt || 0).getTime());

    if (now - lastTime > msThreshold) {
      reclaimedIds.push(lead.id);
      const prevAssignee = lead.assignee || 'Chuyên viên';
      return {
        ...lead,
        stage: 'PUBLIC_POOL',
        status: 'Kho khách chung',
        previousAssignee: prevAssignee,
        assignee: 'Kho khách chung',
        assignedToId: null,
        reclaimedAt: new Date().toISOString(),
        history: [
          ...(lead.history || []),
          {
            id: `reclaim-${Date.now()}`,
            date: new Date().toLocaleString('vi-VN'),
            type: 'Thu hồi tự động',
            content: `Hệ thống tự động thu hồi về Kho khách chung do không có tương tác sau ${reclaimDays} ngày (Trước đó phân bổ cho: ${prevAssignee}).`,
            author: 'Hệ thống Quản trị SalePro'
          }
        ]
      };
    }

    return lead;
  });

  if (reclaimedIds.length > 0) {
    Database.saveLeads(updatedLeads);
    Database.recordAuditLog({
      userId: 'system',
      userName: 'Hệ thống SalePro',
      action: 'AUTO_RECLAIM_LEADS',
      targetType: 'LEAD',
      details: {
        reclaimedCount: reclaimedIds.length,
        thresholdDays: reclaimDays,
        leadIds: reclaimedIds.slice(0, 50)
      }
    });
  }

  return { reclaimedCount: reclaimedIds.length, leadIds: reclaimedIds };
}
