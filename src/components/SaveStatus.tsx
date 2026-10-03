import React, {useEffect, useSyncExternalStore} from 'react';
import {getSaveState, subscribeSaveState, retryFailedSaves, resetSaveTracking} from '../services/saveTracker';

export function SaveStatus({userId}: {userId: string}) {
  const state = useSyncExternalStore(subscribeSaveState, getSaveState);
  useEffect(()=>{resetSaveTracking(); return resetSaveTracking;},[userId]);
  if (!state.pending && !state.failed && !state.savedAt) return null;
  return <div role="status" aria-live="polite" className={`flex flex-wrap items-center justify-end gap-2 border-b px-4 py-1.5 text-xs ${state.failed ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
    <span>{state.pending ? 'Đang lưu khách hàng…' : state.failed ? `Lưu thất bại (${state.failed}). Thay đổi chưa được xác nhận trên máy chủ.` : 'Đã lưu khách hàng trên máy chủ'}</span>
    {!!state.failed && <button type="button" disabled={!!state.pending} onClick={()=>void retryFailedSaves()} className="rounded border border-rose-300 bg-white px-2 py-1 font-bold disabled:opacity-50">Thử lưu lại</button>}
  </div>;
}
