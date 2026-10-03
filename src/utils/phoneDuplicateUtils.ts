import { Lead } from '../types';

/**
 * Standardize phone number for robust deduplication:
 * - Strips all non-digit characters (spaces, dots, dashes, parentheses).
 * - Converts country prefix `+84` or `84` to standard local `0`.
 * Example: `+84 903.888.999` -> `0903888999`
 *          `0903-888-999`     -> `0903888999`
 *          `84903888999`      -> `0903888999`
 */
export function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^\d+]/g, '').trim();

  // Replace +84 or 84 at start with 0
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Remove any remaining non-digit characters
  cleaned = cleaned.replace(/\D/g, '');
  return cleaned;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'exact' | 'partial' | 'none';
  matchedLead?: Lead;
  allMatchedLeads: Lead[];
  normalizedInputPhone: string;
}

/**
 * Play a gentle double warning chime when duplicate phone is detected.
 * Uses Web Audio API without requiring any external mp3 files.
 */
export function playDuplicateAlertSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    // Tone 1: 480Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(480, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Tone 2: 360Hz (warning tone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(360, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 450);
  } catch {
    // Ignore audio restrictions
  }
}

/**
 * Checks if a given input phone matches any existing leads in the system.
 * Prevents overlapping customer entries across different Sales.
 */
export function findDuplicatePhoneLeads(
  inputPhone: string,
  existingLeads: Lead[],
  excludeLeadId?: string
): DuplicateCheckResult {
  const normalizedInput = normalizePhoneNumber(inputPhone);

  // If input phone is too short (< 8 digits), do not flag as duplicate yet
  if (!normalizedInput || normalizedInput.length < 8) {
    return {
      isDuplicate: false,
      matchType: 'none',
      allMatchedLeads: [],
      normalizedInputPhone: normalizedInput
    };
  }

  const matched = existingLeads.filter((l) => {
    if (excludeLeadId && l.id === excludeLeadId) return false;
    const lNorm = normalizePhoneNumber(l.phone);
    if (!lNorm || lNorm.length < 8) return false;

    // Exact match
    if (lNorm === normalizedInput) return true;

    // Last 9 digits match (e.g. 903888999 matches 0903888999)
    if (normalizedInput.length >= 9 && lNorm.length >= 9) {
      const tailInput = normalizedInput.slice(-9);
      const tailLead = lNorm.slice(-9);
      return tailInput === tailLead;
    }

    return false;
  });

  return {
    isDuplicate: matched.length > 0,
    matchType: matched.length > 0 ? 'exact' : 'none',
    matchedLead: matched[0],
    allMatchedLeads: matched,
    normalizedInputPhone: normalizedInput
  };
}

export interface BulkDuplicateReport<T = any> {
  uniqueCount: number;
  duplicateCount: number;
  duplicates: Array<{
    item: T;
    existingLead: Lead;
    phone: string;
  }>;
  cleanItems: T[];
}

/**
 * Scans a list of new/imported leads against existing CRM leads for duplicates.
 */
export function scanBulkLeadsForDuplicates<T extends { phone?: string; id?: string }>(
  incomingItems: T[],
  existingLeads: Lead[]
): BulkDuplicateReport<T> {
  // Pre-index existing leads by normalized phone
  const phoneMap = new Map<string, Lead>();

  existingLeads.forEach((lead) => {
    const norm = normalizePhoneNumber(lead.phone);
    if (norm && norm.length >= 8) {
      if (!phoneMap.has(norm)) {
        phoneMap.set(norm, lead);
      }
      // Also index last 9 digits for cross-format safety
      if (norm.length >= 9) {
        const tail = norm.slice(-9);
        if (!phoneMap.has(tail)) {
          phoneMap.set(tail, lead);
        }
      }
    }
  });

  const duplicates: Array<{ item: T; existingLead: Lead; phone: string }> = [];
  const cleanItems: T[] = [];
  const seenInBatch = new Set<string>();

  incomingItems.forEach((item) => {
    const norm = normalizePhoneNumber(item.phone);
    if (!norm || norm.length < 8) {
      // No valid phone or too short -> keep
      cleanItems.push(item);
      return;
    }

    const tail = norm.length >= 9 ? norm.slice(-9) : norm;

    // Check if matched in existing leads
    const match = phoneMap.get(norm) || phoneMap.get(tail);
    if (match) {
      duplicates.push({ item, existingLead: match, phone: item.phone || norm });
    } else if (seenInBatch.has(tail)) {
      // Intra-batch duplicate
      duplicates.push({
        item,
        existingLead: {
          id: 'batch-dup',
          stt: 0,
          date: '',
          fullName: 'Trùng trong file tải lên',
          phone: item.phone || '',
          dataSource: 'File vừa tải lên',
          productType: 'Nhà phố trung tâm',
          status: 'Khách mới',
          project: '',
          assignee: 'Cùng file',
          notes: ''
        },
        phone: item.phone || norm
      });
    } else {
      seenInBatch.add(tail);
      cleanItems.push(item);
    }
  });

  return {
    uniqueCount: cleanItems.length,
    duplicateCount: duplicates.length,
    duplicates,
    cleanItems
  };
}
