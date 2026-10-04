import React from 'react';
import type { Lead } from '../types';
import { neglectedCustomer, profileIssues } from '../utils/customerWorkflow';

export function CustomerHealth({lead, now = Date.now()}: {lead: Lead; now?: number}) {
  const issues = profileIssues(lead);
  const neglected = neglectedCustomer(lead, now);
  if (!issues.length && !neglected) return null;
  return <aside className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-base leading-snug text-amber-950" aria-label="Kiểm tra hồ sơ khách hàng">
    {neglected && <p><strong>Cần chăm sóc lại:</strong> ít nhất 3 ngày chưa ghi nhận tương tác và chưa có lịch chăm sóc tiếp theo.</p>}
    {!!issues.length && <div className="flex flex-wrap items-center gap-1.5"><strong>Cần bổ sung hồ sơ:</strong>{issues.map(issue=><span key={issue} className="rounded-md border border-amber-300 bg-white px-2 text-sm font-semibold leading-6">{issue}</span>)}</div>}
  </aside>;
}
