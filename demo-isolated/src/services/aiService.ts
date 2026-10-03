/**
 * AI Service for Real Estate CRM
 * Powers Vietnamese shorthand correction, spelling auto-fix, and note enhancement
 * Supports server-side Gemini 3.8 Flash model with local intelligent fallback.
 */

export interface AiCorrectionResult {
  originalText: string;
  correctedText: string;
  changes?: string[];
  suggestedIntent?: string;
  source: 'gemini-3.8-flash' | 'rule-engine' | 'fallback';
}

const W_LEFT = "(?<![a-zA-Z\\u00C0-\\u024F\\u1EA0-\\u1EF9])";
const W_RIGHT = "(?![a-zA-Z\\u00C0-\\u024F\\u1EA0-\\u1EF9])";

// BĐS Real Estate specialized shorthand dictionary & regex patterns
const VIETNAMESE_CRM_DICTIONARY: Array<{ pattern: RegExp; replacement: string | ((substring: string, ...args: any[]) => string) }> = [
  // Khách đ bận / Khách đang bận
  { pattern: new RegExp(`${W_LEFT}(khách|khach|kh)\\s+(đ|dang|đang)\\s+bận${W_RIGHT}`, "gi"), replacement: 'Khách hàng đang bận' },
  { pattern: new RegExp(`${W_LEFT}đ\\s+bận${W_RIGHT}`, "gi"), replacement: 'đang bận' },

  // Viết tắt từ "khách / khách hàng"
  { pattern: new RegExp(`${W_LEFT}kh\\s+hang${W_RIGHT}`, "gi"), replacement: 'khách hàng' },
  { pattern: new RegExp(`${W_LEFT}kh${W_RIGHT}`, "gi"), replacement: 'khách hàng' },

  // Không nghe máy / không bắt máy
  { pattern: new RegExp(`${W_LEFT}k\\s+nghe\\s+may${W_RIGHT}`, "gi"), replacement: 'không nghe máy' },
  { pattern: new RegExp(`${W_LEFT}k\\s+nghe\\s+máy${W_RIGHT}`, "gi"), replacement: 'không nghe máy' },
  { pattern: new RegExp(`${W_LEFT}ko\\s+nghe\\s+may${W_RIGHT}`, "gi"), replacement: 'không nghe máy' },
  { pattern: new RegExp(`${W_LEFT}k\\s+bat\\s+may${W_RIGHT}`, "gi"), replacement: 'không bắt máy' },
  { pattern: new RegExp(`${W_LEFT}k\\s+bắt\\s+máy${W_RIGHT}`, "gi"), replacement: 'không bắt máy' },
  { pattern: new RegExp(`${W_LEFT}ko\\s+bắt\\s+máy${W_RIGHT}`, "gi"), replacement: 'không bắt máy' },
  { pattern: new RegExp(`${W_LEFT}dt\\s+k\\s+bat\\s+may${W_RIGHT}`, "gi"), replacement: 'gọi điện thoại không bắt máy' },

  // Điện thoại
  { pattern: new RegExp(`${W_LEFT}dt${W_RIGHT}`, "gi"), replacement: 'điện thoại' },
  { pattern: new RegExp(`${W_LEFT}sdt${W_RIGHT}`, "gi"), replacement: 'số điện thoại' },

  // Từ "không"
  { pattern: new RegExp(`${W_LEFT}(k|ko|kg)${W_RIGHT}`, "gi"), replacement: 'không' },

  // Từ "đang"
  { pattern: new RegExp(`${W_LEFT}đ${W_RIGHT}`, "gi"), replacement: 'đang' },

  // Hẹn xem nhà / lịch hẹn
  { pattern: new RegExp(`${W_LEFT}hen\\s+t([2-7])\\s+xem\\s+(nha|can)${W_RIGHT}`, "gi"), replacement: (_match, p1, p2) => {
    const days: Record<string, string> = { '2': 'Hai', '3': 'Ba', '4': 'Tư', '5': 'Năm', '6': 'Sáu', '7': 'Bảy' };
    const house = p2.toLowerCase() === 'nha' ? 'nhà' : 'căn hộ';
    return `hẹn thứ ${days[p1] || p1} xem ${house}`;
  }},
  { pattern: new RegExp(`${W_LEFT}hen\\s+cn\\s+xem\\s+nha${W_RIGHT}`, "gi"), replacement: 'hẹn Chủ Nhật xem nhà' },
  { pattern: new RegExp(`${W_LEFT}xem\\s+nha${W_RIGHT}`, "gi"), replacement: 'xem nhà' },
  { pattern: new RegExp(`${W_LEFT}xem\\s+du\\s+an${W_RIGHT}`, "gi"), replacement: 'xem dự án' },

  // BĐS và tài chính
  { pattern: new RegExp(`${W_LEFT}ty${W_RIGHT}`, "gi"), replacement: 'tỷ' },
  { pattern: new RegExp(`${W_LEFT}tr${W_RIGHT}`, "gi"), replacement: 'triệu' },
  { pattern: new RegExp(`${W_LEFT}2pn${W_RIGHT}`, "gi"), replacement: '2 phòng ngủ' },
  { pattern: new RegExp(`${W_LEFT}3pn${W_RIGHT}`, "gi"), replacement: '3 phòng ngủ' },
  { pattern: new RegExp(`${W_LEFT}1pn${W_RIGHT}`, "gi"), replacement: '1 phòng ngủ' },
  { pattern: new RegExp(`${W_LEFT}(bđs|bds)${W_RIGHT}`, "gi"), replacement: 'bất động sản' },
  { pattern: new RegExp(`${W_LEFT}chot\\s+coc${W_RIGHT}`, "gi"), replacement: 'đã chốt cọc' },
  { pattern: new RegExp(`${W_LEFT}da\\s+nhan\\s+tin\\s+zalo${W_RIGHT}`, "gi"), replacement: 'đã nhắn tin qua Zalo' },
  { pattern: new RegExp(`${W_LEFT}ket\\s+ban\\s+zalo${W_RIGHT}`, "gi"), replacement: 'kết bạn Zalo' },

  // Quận
  { pattern: new RegExp(`${W_LEFT}q1${W_RIGHT}`, "gi"), replacement: 'Quận 1' },
  { pattern: new RegExp(`${W_LEFT}q3${W_RIGHT}`, "gi"), replacement: 'Quận 3' },
  { pattern: new RegExp(`${W_LEFT}q7${W_RIGHT}`, "gi"), replacement: 'Quận 7' },
  { pattern: new RegExp(`${W_LEFT}q10${W_RIGHT}`, "gi"), replacement: 'Quận 10' },
  { pattern: new RegExp(`${W_LEFT}q2${W_RIGHT}`, "gi"), replacement: 'Quận 2' },
  { pattern: new RegExp(`${W_LEFT}bt${W_RIGHT}`, "gi"), replacement: 'Bình Thạnh' },
  { pattern: new RegExp(`${W_LEFT}pn${W_RIGHT}`, "gi"), replacement: 'Phú Nhuận' },
];

/**
 * Intelligent local Vietnamese normalization engine
 * Runs instantly in milliseconds
 */
export function applyLocalCrmRules(text: string): { corrected: string; changed: boolean } {
  if (!text) return { corrected: '', changed: false };

  let current = text.trim();
  const original = current;

  for (const rule of VIETNAMESE_CRM_DICTIONARY) {
    if (typeof rule.replacement === 'function') {
      current = current.replace(rule.pattern, rule.replacement as any);
    } else {
      current = current.replace(rule.pattern, rule.replacement);
    }
  }

  // Capitalize first letter
  if (current.length > 0) {
    current = current.charAt(0).toUpperCase() + current.slice(1);
  }

  // Ensure reasonable punctuation if length is significant
  if (current.length > 5 && !/[.!?]$/.test(current)) {
    current = `${current}.`;
  }

  return {
    corrected: current,
    changed: current.toLowerCase() !== original.toLowerCase(),
  };
}

/**
 * Main AI Text Correction Function
 * Tries server-side Gemini 3.8 Flash first for deep linguistic understanding,
 * with local dictionary fallback for zero-latency resilience.
 */
export async function correctAndEnhanceText(
  text: string,
  options?: {
    type?: 'interaction_log' | 'lead_notes' | 'customer_status';
    context?: string;
  }
): Promise<AiCorrectionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      originalText: text,
      correctedText: text,
      source: 'fallback',
    };
  }

  try {
    const res = await fetch('/api/ai/correct-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: trimmed,
        type: options?.type || 'interaction_log',
        context: options?.context || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.correctedText) {
        return {
          originalText: trimmed,
          correctedText: data.correctedText,
          changes: data.changes || [],
          suggestedIntent: data.suggestedIntent || '',
          source: data.source === 'gemini-3.8-flash' ? 'gemini-3.8-flash' : 'rule-engine',
        };
      }
    }
  } catch (error) {
    console.warn('Gemini API endpoint unreachable or error, applying local rule engine:', error);
  }

  // Fallback to local rule engine
  const local = applyLocalCrmRules(trimmed);
  return {
    originalText: trimmed,
    correctedText: local.corrected,
    changes: local.changed ? ['Chuẩn hóa bằng từ điển viết tắt BĐS SALEPRO'] : [],
    suggestedIntent: '',
    source: 'rule-engine',
  };
}
