import React from 'react';
import type { Lead } from '../types';
import { neglectedCustomer, profileIssues } from '../utils/customerWorkflow';

export function CustomerHealth({lead, now = Date.now()}: {lead: Lead; now?: number}) {
  const issues = profileIssues(lead);
  const neglected = neglectedCustomer(lead, now);
  if (!issues.length && !neglected) return null;
  return <aside className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950" aria-label="Kiểm tra hồ sơ khách hàng">
    {neglected && <p><strong>Cần chăm sóc lại:</strong> ít nhất 3 ngày chưa ghi nhận tương tác và chưa có lịch chăm sóc tiếp theo.</p>}
    {!!issues.length && <div><strong>Cần bổ sung hồ sơ</strong><div className="mt-1 flex flex-wrap gap-1.5">{issues.map(issue=><span key={issue} className="rounded-md border border-amber-300 bg-white px-2 py-1">{issue}</span>)}</div></div>}
  </aside>;
}
