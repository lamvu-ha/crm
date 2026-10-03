import { SystemLog, SystemLogAction, SystemLogLevel, UserRole } from '../types';

const STORAGE_KEY_SYSTEM_LOGS = 'crm_system_logs_v1';

// Seed authentic initial logs reflecting real recent system operations
const INITIAL_SEED_LOGS: SystemLog[] = [];

export async function fetchSystemLogs(): Promise<SystemLog[]> {
  try {
    const res = await fetch('/api/logs', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '') } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        localStorage.setItem(STORAGE_KEY_SYSTEM_LOGS, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn('Could not fetch logs from /api/logs, using local cache:', err);
  }

  // Fallback to localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SYSTEM_LOGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading system logs from localStorage:', err);
  }

  // Seed default logs
  try {
    localStorage.setItem(STORAGE_KEY_SYSTEM_LOGS, JSON.stringify(INITIAL_SEED_LOGS));
  } catch {}
  return INITIAL_SEED_LOGS;
}

export async function recordSystemLog(entry: {
  action: SystemLogAction;
  level?: SystemLogLevel;
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  actorRole: UserRole | 'system';
  targetType: 'lead' | 'auth' | 'member' | 'sync' | 'security';
  targetId?: string;
  targetName?: string;
  summary: string;
  details?: Record<string, any>;
}): Promise<SystemLog> {
  // Infer log level if not explicitly provided
  let level = entry.level;
  if (!level) {
    if (entry.action.includes('delete')) {
      level = 'danger';
    } else if (entry.action === 'login_failed' || entry.action === 'lead_reassigned_sla' || entry.action === 'lead_transfer') {
      level = 'warning';
    } else if (entry.action === 'login' || entry.action === 'password_change') {
      level = 'success';
    } else {
      level = 'info';
    }
  }

  const newLog: SystemLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    action: entry.action,
    level,
    actorId: entry.actorId,
    actorName: entry.actorName,
    actorEmail: entry.actorEmail,
    actorRole: entry.actorRole,
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetName: entry.targetName,
    summary: entry.summary,
    details: entry.details
  };

  // 1. Optimistically save to localStorage immediately
  try {
    const current = await fetchSystemLogs();
    const updated = [newLog, ...current].slice(0, 1000); // keep up to 1,000 logs
    localStorage.setItem(STORAGE_KEY_SYSTEM_LOGS, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to update local system logs cache:', e);
  }

  // 2. Post to backend server endpoint
  try {
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '') },
      body: JSON.stringify(newLog)
    }).catch((err) => console.warn('Non-blocking log dispatch error:', err));
  } catch (e) {}

  return newLog;
}

export async function clearAllSystemLogs(): Promise<boolean> {
  try {
    localStorage.removeItem(STORAGE_KEY_SYSTEM_LOGS);
    await fetch('/api/logs', { method: 'DELETE', headers: { Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '') } });
    return true;
  } catch (err) {
    console.warn('Error clearing logs on server:', err);
    return false;
  }
}

export function exportLogsToCSV(logs: SystemLog[]): void {
  const headers = [
    'Mã Nhật Ký',
    'Thời Gian (ISO)',
    'Thời Gian (Việt Nam)',
    'Hành Động',
    'Mức Độ',
    'Người Thực Hiện',
    'Chức Vụ / Quyền',
    'Email Người Thực Hiện',
    'Đối Tượng Tác Động',
    'Tên Đối Tượng',
    'Nội Dung Tóm Tắt',
    'Chi Tiết Dữ Liệu'
  ];

  const rows = logs.map((log) => {
    const timeFormatted = new Date(log.timestamp).toLocaleString('vi-VN');
    const detailsStr = log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '';
    return [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${timeFormatted}"`,
      `"${log.action}"`,
      `"${log.level}"`,
      `"${log.actorName}"`,
      `"${log.actorRole}"`,
      `"${log.actorEmail || ''}"`,
      `"${log.targetType}"`,
      `"${(log.targetName || '').replace(/"/g, '""')}"`,
      `"${log.summary.replace(/"/g, '""')}"`,
      `"${detailsStr}"`
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `NHAT_KY_HE_THONG_CRM_SALEPRO_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
