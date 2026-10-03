type State = {pending: number; failed: number; savedAt: number | null};
const listeners = new Set<() => void>();
const retries = new Map<string, () => Promise<boolean>>();
const versions = new Map<string, number>();
let state: State = {pending: 0, failed: 0, savedAt: null};
const publish = () => { state = {...state, failed: retries.size}; listeners.forEach(listener=>listener()); };
export const getSaveState = () => state;
export const subscribeSaveState = (listener: () => void) => {listeners.add(listener); return () => {listeners.delete(listener);};};
export async function trackSave(key: string, operation: () => Promise<boolean>, retryOperation = operation): Promise<boolean> {
  const version = (versions.get(key) || 0) + 1;
  versions.set(key, version);
  state = {...state, pending: state.pending + 1}; publish();
  let success = false;
  try {success = await operation();} catch {success = false;}
  finally {
    state = {...state, pending: state.pending - 1};
    if (versions.get(key) === version) {
      if (success) {retries.delete(key); state = {...state, savedAt: Date.now()};}
      else retries.set(key, ()=>trackSave(key, retryOperation, retryOperation));
    }
    publish();
  }
  return success;
}
export async function retryFailedSaves(): Promise<void> {
  if (state.pending) return;
  // Retry sequentially, preserving the existing service's write order.
  for (const retry of [...retries.values()]) await retry();
}
export function resetSaveTracking(): void {
  retries.clear();
  for (const [key, version] of versions) versions.set(key, version + 1);
  state = {...state, failed: 0, savedAt: null}; publish();
}
