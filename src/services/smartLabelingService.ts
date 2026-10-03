import { Lead, PriorityLevel, SmartLabelResult } from '../types';

/**
 * Service to execute SmartLabeling using Gemini 3.8 Flash
 * Analyzes lead notes and demand to classify leads into Nóng / Ấm / Lạnh
 */
export async function runSmartLabeling(leads: Lead[]): Promise<SmartLabelResult[]> {
  if (!leads || leads.length === 0) return [];

  try {
    const res = await fetch('/api/ai/smart-labeling', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ leads }),
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.results)) {
        return data.results as SmartLabelResult[];
      }
    }
  } catch (err) {
    console.warn('SmartLabeling API error, using client heuristic fallback:', err);
  }

  // Client-side heuristic fallback if server is unreachable
  return leads.map((lead) => {
    const notes = (lead.notes || '').toLowerCase();
    const status = (lead.status || '').toLowerCase();

    const hotKeywords = [
      'gấp', 'xem nhà', 'xem ngay', 'cọc', 'đàm phán', 'chốt', 'đã duyệt vay',
      'tài chính sẵn', 'trong tuần', 'hẹn gặp', 'đặt chỗ', 'hot', 'quan tâm cao'
    ];
    const coldKeywords = [
      'không nghe', 'thuê bao', 'nhầm số', 'không có nhu cầu', 'không nhu cầu',
      'chưa có tiền', 'hỏi chơi', 'quá đắt', 'từ chối', 'chặn số', 'bận'
    ];

    if (
      hotKeywords.some((k) => notes.includes(k)) ||
      status.includes('hẹn') ||
      status.includes('cọc') ||
      status.includes('đàm phán') ||
      status.includes('chốt')
    ) {
      return {
        leadId: lead.id,
        potentialLevel: 'Nóng' as PriorityLevel,
        priorityReason: lead.notes ? `Nhu cầu cấp thiết: ${lead.notes}` : `Trạng thái ${lead.status}`,
        confidence: 0.9,
      };
    }

    if (
      coldKeywords.some((k) => notes.includes(k)) ||
      status.includes('không nghe') ||
      status.includes('thuê bao') ||
      status.includes('không nhu cầu')
    ) {
      return {
        leadId: lead.id,
        potentialLevel: 'Lạnh' as PriorityLevel,
        priorityReason: lead.notes ? `Tương tác thấp: ${lead.notes}` : `Trạng thái ${lead.status}`,
        confidence: 0.85,
      };
    }

    return {
      leadId: lead.id,
      potentialLevel: 'Ấm' as PriorityLevel,
      priorityReason: lead.notes ? `Đang theo dõi: ${lead.notes}` : `Quan tâm dự án ${lead.project || 'BĐS'}`,
      confidence: 0.8,
    };
  });
}

export interface PriorityBadgeMeta {
  level: PriorityLevel | 'unlabeled';
  label: string;
  icon: string;
  badgeClass: string;
  pillClass: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  glowEffect: string;
}

export function getPriorityBadgeMeta(level?: PriorityLevel): PriorityBadgeMeta {
  if (level === 'Nóng') {
    return {
      level: 'Nóng',
      label: 'NÓNG',
      icon: '🔥',
      badgeClass: 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white font-black shadow-xs ring-1 ring-red-400/40 border border-red-300 animate-pulse-subtle',
      pillClass: 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold',
      bgLight: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-300',
      glowEffect: 'shadow-red-500/20'
    };
  }

  if (level === 'Ấm') {
    return {
      level: 'Ấm',
      label: 'ẤM',
      icon: '🌤️',
      badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black shadow-xs border border-amber-300 ring-1 ring-amber-400/30',
      pillClass: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-300',
      glowEffect: 'shadow-amber-500/20'
    };
  }

  if (level === 'Lạnh') {
    return {
      level: 'Lạnh',
      label: 'LẠNH',
      icon: '❄️',
      badgeClass: 'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold shadow-xs border border-sky-300 ring-1 ring-sky-400/30',
      pillClass: 'bg-sky-50 text-sky-800 border-sky-300 font-bold',
      bgLight: 'bg-sky-50',
      textColor: 'text-sky-700',
      borderColor: 'border-sky-300',
      glowEffect: 'shadow-sky-500/20'
    };
  }

  return {
    level: 'unlabeled',
    label: 'Chưa gắn',
    icon: '🏷️',
    badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200 border-dashed font-medium hover:bg-slate-200 hover:text-slate-700',
    pillClass: 'bg-slate-50 text-slate-500 border-slate-200',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-500',
    borderColor: 'border-slate-200',
    glowEffect: ''
  };
}
