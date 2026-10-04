import React, { useState } from 'react';
import { ArrowRightLeft, Check, Clock, X } from 'lucide-react';
import { SalesMember, TransferRequest } from '../types';

interface TransferRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: TransferRequest[];
  salesMembers: SalesMember[];
  currentUser: SalesMember;
  onDecide: (id: string, action: 'approve' | 'reject' | 'cancel', toUserId?: string, note?: string) => Promise<boolean>;
}

const STATUS_LABEL: Record<TransferRequest['status'], { text: string; className: string }> = {
  pending: { text: 'Chờ duyệt', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { text: 'Đã duyệt', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { text: 'Từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled: { text: 'Đã huỷ', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const formatTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '');

export const TransferRequestsModal: React.FC<TransferRequestsModalProps> = ({ isOpen, onClose, requests, salesMembers, currentUser, onDecide }) => {
  const canDecide = currentUser.role !== 'sale';
  const [recipient, setRecipient] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isOpen) return null;

  const pending = requests.filter((r) => r.status === 'pending');
  const recent = requests.filter((r) => r.status !== 'pending').slice(0, 10);
  // The server re-checks team scope and daily limits; this list just avoids obvious wrong choices.
  const candidates = (request: TransferRequest) => salesMembers.filter((m) =>
    m.status === 'active' && (m.role === 'sale' || m.role === 'tpkd') && m.name !== request.currentAssignee &&
    (currentUser.role !== 'tpkd' || !currentUser.team || m.team === currentUser.team));

  const decide = async (request: TransferRequest, action: 'approve' | 'reject' | 'cancel') => {
    setBusyId(request.id);
    const toUserId = recipient[request.id] ?? request.suggestedToId ?? '';
    await onDecide(request.id, action, action === 'approve' ? toUserId : undefined, note[request.id]).finally(() => setBusyId(null));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700"><ArrowRightLeft className="w-5 h-5" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{canDecide ? 'Duyệt đề xuất chuyển khách' : 'Đề xuất chuyển khách của tôi'}</h3>
              <p className="text-[11px] text-slate-500">{pending.length} đề xuất đang chờ duyệt</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto pr-1 flex-1 space-y-3 text-xs">
          {!pending.length && <p className="py-8 text-center text-slate-500">Không có đề xuất nào đang chờ duyệt.</p>}
          {pending.map((r) => {
            const options = candidates(r);
            const selected = recipient[r.id] ?? r.suggestedToId ?? '';
            return (
              <article key={r.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{r.leadName} <span className="font-normal text-slate-500">· {r.leadPhone}</span></div>
                    <div className="text-slate-600">Từ <strong>{r.currentAssignee}</strong> · gửi bởi {r.fromName} lúc {formatTime(r.createdAt)}{r.suggestedToName ? <> · gợi ý: <strong>{r.suggestedToName}</strong></> : ''}</div>
                  </div>
                  <span className="flex items-center gap-1 rounded-md border border-amber-200 bg-white px-2 py-0.5 font-semibold text-amber-700"><Clock className="w-3 h-3" />Chờ duyệt</span>
                </div>
                <dl className="grid gap-1 rounded-lg bg-white p-2 border border-slate-100">
                  <div><dt className="inline font-semibold text-slate-700">Lý do: </dt><dd className="inline text-slate-600">{r.reason}</dd></div>
                  <div><dt className="inline font-semibold text-slate-700">Nhu cầu chính: </dt><dd className="inline text-slate-600">{r.handover.needs}</dd></div>
                  <div><dt className="inline font-semibold text-slate-700">Trao đổi gần nhất: </dt><dd className="inline text-slate-600">{r.handover.latest}</dd></div>
                  <div><dt className="inline font-semibold text-slate-700">Việc cần làm tiếp: </dt><dd className="inline text-slate-600">{r.handover.next}</dd></div>
                </dl>
                {canDecide ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label={`Người nhận khách ${r.leadName}`} value={selected} onChange={(e) => setRecipient((prev) => ({ ...prev, [r.id]: e.target.value }))} className="min-w-[180px] flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
                      <option value="">— Chọn người nhận —</option>
                      {options.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role === 'tpkd' ? 'TPKD' : 'NVKD'})</option>)}
                    </select>
                    <input aria-label={`Ghi chú cho ${r.leadName}`} placeholder="Ghi chú (không bắt buộc)" value={note[r.id] || ''} onChange={(e) => setNote((prev) => ({ ...prev, [r.id]: e.target.value }))} className="min-w-[160px] flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5" />
                    <button type="button" disabled={busyId === r.id || !selected} onClick={() => decide(r, 'approve')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Check className="w-3.5 h-3.5" />Duyệt chuyển</button>
                    <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'reject')} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Từ chối</button>
                  </div>
                ) : r.fromUserId === currentUser.id && (
                  <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'cancel')} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Huỷ đề xuất</button>
                )}
              </article>
            );
          })}

          {!!recent.length && (
            <section className="pt-2">
              <h4 className="mb-2 font-bold text-slate-600">Đã xử lý gần đây</h4>
              <ul className="space-y-1.5">
                {recent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5">
                    <span className="text-slate-700"><strong>{r.leadName}</strong> · {r.currentAssignee}{r.toName ? ` → ${r.toName}` : ''} · {r.decidedBy} {formatTime(r.decidedAt)}{r.decisionNote ? ` · “${r.decisionNote}”` : ''}</span>
                    <span className={`rounded-md border px-2 py-0.5 font-semibold ${STATUS_LABEL[r.status].className}`}>{STATUS_LABEL[r.status].text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
