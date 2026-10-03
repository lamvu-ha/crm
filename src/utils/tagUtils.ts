import { Lead } from '../types';

export interface TagMeta {
  name: string;
  icon: string;
  badgeClass: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export const PRESET_TAGS: TagMeta[] = [
  {
    name: 'Hot',
    icon: '🔥',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
  },
  {
    name: 'Cần tư vấn vay',
    icon: '🏦',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500'
  },
  {
    name: 'Đầu tư',
    icon: '📈',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500'
  },
  {
    name: 'Mua ở thực',
    icon: '🏡',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  {
    name: 'Tài chính mạnh',
    icon: '💎',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    dot: 'bg-purple-500'
  },
  {
    name: 'Cần chốt gấp',
    icon: '⚡',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500'
  },
  {
    name: 'Khách VIP',
    icon: '👑',
    badgeClass: 'bg-amber-100/70 text-amber-900 border-amber-300 hover:bg-amber-200/70',
    bg: 'bg-amber-100/70',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-600'
  },
  {
    name: 'Khách khó tính',
    icon: '🎯',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500'
  },
  {
    name: 'Quan tâm căn góc',
    icon: '📐',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    dot: 'bg-teal-500'
  },
  {
    name: 'Đang so sánh dự án',
    icon: '⚖️',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500'
  }
];

const CUSTOM_TAG_STORAGE_KEY = 'mayhomes_crm_custom_tags_v1';

export const getStoredCustomTags = (): string[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_TAG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((t) => typeof t === 'string' && t.trim().length > 0);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return [];
};

export const saveCustomTag = (newTag: string): void => {
  const trimmed = newTag.trim();
  if (!trimmed) return;
  if (PRESET_TAGS.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;

  try {
    const existing = getStoredCustomTags();
    if (!existing.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...existing, trimmed];
      localStorage.setItem(CUSTOM_TAG_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get styling and icon for any tag name
 */
export function getTagMeta(tagName: string): TagMeta {
  const clean = (tagName || '').trim();
  const lower = clean.toLowerCase();

  const found = PRESET_TAGS.find((p) => p.name.toLowerCase() === lower);
  if (found) {
    return found;
  }

  // Fallback styling for custom user tags
  return {
    name: clean,
    icon: '🏷️',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    dot: 'bg-indigo-500'
  };
}

/**
 * Returns all active tags in the system: presets + custom saved + any tags found on existing leads
 */
export function getAllAvailableTags(leads?: Lead[]): string[] {
  const tagSet = new Set<string>();

  // Add presets
  PRESET_TAGS.forEach((p) => tagSet.add(p.name));

  // Add stored custom
  getStoredCustomTags().forEach((t) => tagSet.add(t));

  // Add from leads
  if (leads && Array.isArray(leads)) {
    leads.forEach((l) => {
      if (Array.isArray(l.tags)) {
        l.tags.forEach((t) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
  }

  return Array.from(tagSet);
}

/**
 * Safely add a tag to a lead
 */
export function addTagToLead(lead: Lead, tagName: string): Lead {
  const trimmed = tagName.trim();
  if (!trimmed) return lead;

  const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
  if (currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
    return lead; // Already has tag
  }

  saveCustomTag(trimmed);

  return {
    ...lead,
    tags: [...currentTags, trimmed],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Safely remove a tag from a lead
 */
export function removeTagFromLead(lead: Lead, tagName: string): Lead {
  const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
  return {
    ...lead,
    tags: currentTags.filter((t) => t.toLowerCase() !== tagName.toLowerCase()),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Toggle a tag on a lead
 */
export function toggleTagOnLead(lead: Lead, tagName: string): Lead {
  const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
  const exists = currentTags.some((t) => t.toLowerCase() === tagName.toLowerCase());
  if (exists) {
    return removeTagFromLead(lead, tagName);
  } else {
    return addTagToLead(lead, tagName);
  }
}
