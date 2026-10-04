import React, { useState } from 'react';
import { PhoneCall, X } from 'lucide-react';
import { Lead } from '../types';

type CallStatus = NonNullable<Lead['callStatus']>;

const RESULTS: { label: string; callStatus: CallStatus; className: string }[] = [
  { label: 'Đã nghe máy', callStatus: 'Đã nghe máy', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { label: 'Không nghe máy / máy bận', callStatus: 'Máy bận / Chưa gọi', className: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300' },
  { label: 'Thuê bao', callStatus: 'Thuê bao', className: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300' },
  { label: 'Hẹn gọi lại', callStatus: 'Hẹn gọi lại', className: 'bg-white hover:bg-slate-50 text-blue-700 border border-blue-300' }
];

/**
 * The lead with one call recorded: a "Cuộc gọi" history entry (what the weekly report counts) and the latest call status.
 * The outcome stays on the first line so the report can classify it regardless of the free-text note.
 */
export function withLoggedCall(lead: Lead, resultLabel: string, callStatus: CallStatus, note: string, author: string): Lead {
  const now = new Date().toISOString();
  return {
    ...lead,
    callStatus,
    updatedAt: now,
    history: [
      { id: `call-${Date.now()}`, date: now, type: 'Cuộc gọi', content: `📞 Gọi điện: ${resultLabel}${note.trim() ? `\nGhi chú: ${note.trim()}` : ''}`, author },
      ...(lead.history || [])
    ]
  };
}

interface CallResultPromptProps {
  lead: Lead;
  onSave: (resultLabel: string, callStatus: CallStatus, note: string) => void;
  onClose: () => void;
}

/** Shown after tapping a call button: one tap records how the call went. */
export function CallResultPrompt({ lead, onSave, onClose }: CallResultPromptProps) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-3 sm:items-center" role="dialog" aria-label="Kết quả cuộc gọi">
      <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><PhoneCall size={18} /></span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Kết quả cuộc gọi</h3>
              <p className="text-sm text-slate-500">{lead.fullName} · {lead.phone}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Bỏ qua, không ghi nhận" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {RESULTS.map((r) => (
            <button key={r.label} type="button" onClick={() => onSave(r.label, r.callStatus, note)} className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${r.className}`}>
              {r.label}
            </button>
          ))}
        </div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ghi chú nhanh (không bắt buộc)" aria-label="Ghi chú cuộc gọi" className="mt-3 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        <button type="button" onClick={onClose} className="mt-1 w-full rounded-xl py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50">Bỏ qua (không gọi được / bấm nhầm)</button>
      </div>
    </div>
  );
}
