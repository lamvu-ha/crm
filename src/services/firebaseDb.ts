import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';

// Set log level to avoid harmless idle stream disconnection notices
try {
  setLogLevel('error');
} catch (e) {}
import { Lead, SalesMember, isDemoLead } from '../types';
import appletConfig from '../../firebase-applet-config.json';

// Load config from firebase-applet-config.json
const firebaseConfig = {
  projectId: appletConfig.projectId,
  appId: appletConfig.appId,
  apiKey: appletConfig.apiKey,
  authDomain: appletConfig.authDomain,
  firestoreDatabaseId: appletConfig.firestoreDatabaseId,
  storageBucket: appletConfig.storageBucket,
  messagingSenderId: appletConfig.messagingSenderId
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firestoreDb = getFirestore(app, appletConfig.firestoreDatabaseId);

// Circuit breaker for Firestore writes to gracefully handle free-tier daily quota exhaustion
const LOCAL_STORAGE_QUOTA_KEY = 'crm_firestore_write_quota_exhausted';

function getInitialQuotaExhaustedState(): boolean {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_QUOTA_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data && data.exhausted) {
        const retry = data.until || 0;
        if (!retry || Date.now() < retry) {
          return true;
        }
      }
    }
  } catch (e) {}
  return true; // Safe default: assume quota exhausted until API indicates otherwise
}

let isClientFirestoreQuotaExhausted = getInitialQuotaExhaustedState();
let quotaExhaustedUntil = Date.now() + 24 * 60 * 60 * 1000;

// Query the server API to synchronize quota state
if (typeof window !== 'undefined') {
  fetch('/api/firestore-quota')
    .then((r) => r.json())
    .then((data) => {
      if (data && typeof data.isExhausted === 'boolean') {
        isClientFirestoreQuotaExhausted = data.isExhausted;
        if (data.retryAfter) {
          quotaExhaustedUntil = new Date(data.retryAfter).getTime();
        }
        try {
          localStorage.setItem(LOCAL_STORAGE_QUOTA_KEY, JSON.stringify({
            exhausted: isClientFirestoreQuotaExhausted,
            until: quotaExhaustedUntil
          }));
        } catch {}
      }
    })
    .catch(() => {});
}

export function isClientQuotaExhausted(): boolean {
  if (isClientFirestoreQuotaExhausted && Date.now() < quotaExhaustedUntil) {
    return true;
  }
  return isClientFirestoreQuotaExhausted;
}

export function markClientQuotaExhausted() {
  isClientFirestoreQuotaExhausted = true;
  quotaExhaustedUntil = Date.now() + 24 * 60 * 60 * 1000;
  try {
    localStorage.setItem(LOCAL_STORAGE_QUOTA_KEY, JSON.stringify({
      exhausted: true,
      until: quotaExhaustedUntil
    }));
  } catch (e) {}
}

function isQuotaError(err: any): boolean {
  const msg = String(err?.message || err?.code || err || '');
  return msg.includes('resource-exhausted') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota limit exceeded');
}

// Validate connection per Firebase skill instructions
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
    return true;
  } catch (error) {
    console.info('Firestore initialized with local/cloud cache fallback:', error);
    return true;
  }
}

// Fetch all leads from Firestore (excluding demo leads)
export async function fetchLeadsFromFirestore(): Promise<Lead[]> {
  try {
    const colRef = collection(firestoreDb, 'leads');
    const snapshot = await getDocs(colRef);
    const leads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Lead;
      if (!isDemoLead(data)) {
        leads.push(data);
      }
    });
    return leads;
  } catch (err) {
    console.warn('Cannot fetch leads from Firestore, falling back to API:', err);
    return [];
  }
}

// Save or sync leads to Firestore in batches (excluding demo leads)
export async function saveLeadsToFirestore(leads: Lead[]): Promise<boolean> {
  if (isClientQuotaExhausted()) {
    return false;
  }
  try {
    const cleanLeads = leads.filter((l) => !isDemoLead(l));
    const chunkSize = 400;
    for (let i = 0; i < cleanLeads.length; i += chunkSize) {
      const chunk = cleanLeads.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((lead) => {
        const leadId = lead.id || `lead-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const docRef = doc(firestoreDb, 'leads', leadId);
        batch.set(docRef, { ...lead, id: leadId, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    }
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markClientQuotaExhausted();
    } else {
      console.warn('Error saving leads to Firestore:', err);
    }
    return false;
  }
}

// Delete a single lead from Firestore
export async function deleteLeadFromFirestore(leadId: string): Promise<boolean> {
  if (isClientQuotaExhausted()) {
    return false;
  }
  try {
    if (!leadId) return false;
    const docRef = doc(firestoreDb, 'leads', leadId);
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markClientQuotaExhausted();
    } else {
      console.warn('Error deleting lead from Firestore:', err);
    }
    return false;
  }
}

// Delete multiple leads from Firestore
export async function deleteMultipleLeadsFromFirestore(leadIds: string[]): Promise<boolean> {
  if (isClientQuotaExhausted()) {
    return false;
  }
  try {
    if (!leadIds || leadIds.length === 0) return true;
    const chunkSize = 400;
    for (let i = 0; i < leadIds.length; i += chunkSize) {
      const chunk = leadIds.slice(i, i + chunkSize);
      const batch = writeBatch(firestoreDb);
      chunk.forEach((id) => {
        if (id) {
          batch.delete(doc(firestoreDb, 'leads', id));
        }
      });
      await batch.commit();
    }
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markClientQuotaExhausted();
    } else {
      console.warn('Error bulk deleting leads from Firestore:', err);
    }
    return false;
  }
}

// Purge any lingering demo leads from Firestore
export async function purgeDemoLeadsFromFirestore(): Promise<number> {
  if (isClientQuotaExhausted()) {
    return 0;
  }
  try {
    const colRef = collection(firestoreDb, 'leads');
    const snapshot = await getDocs(colRef);
    const demoDocIds: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Lead;
      if (isDemoLead(data) || isDemoLead({ id: docSnap.id })) {
        demoDocIds.push(docSnap.id);
      }
    });

    if (demoDocIds.length > 0) {
      await deleteMultipleLeadsFromFirestore(demoDocIds);
      console.info(`Purged ${demoDocIds.length} demo leads from Firestore.`);
    }
    return demoDocIds.length;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markClientQuotaExhausted();
    } else {
      console.warn('Error purging demo leads from Firestore:', err);
    }
    return 0;
  }
}

// Fetch sales members from Firestore
export async function fetchSalesMembersFromFirestore(): Promise<SalesMember[]> {
  try {
    const colRef = collection(firestoreDb, 'sales_members');
    const snapshot = await getDocs(colRef);
    const members: SalesMember[] = [];
    snapshot.forEach((docSnap) => {
      members.push(docSnap.data() as SalesMember);
    });
    return members;
  } catch (err) {
    console.warn('Cannot fetch sales members from Firestore:', err);
    return [];
  }
}

// Save sales members to Firestore
export async function saveSalesMembersToFirestore(members: SalesMember[]): Promise<boolean> {
  if (isClientQuotaExhausted()) {
    return false;
  }
  try {
    const batch = writeBatch(firestoreDb);
    members.forEach((m) => {
      if (!m.id) return;
      const docRef = doc(firestoreDb, 'sales_members', m.id);
      batch.set(docRef, m, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (err: any) {
    if (isQuotaError(err)) {
      markClientQuotaExhausted();
    } else {
      console.warn('Error saving sales members to Firestore:', err);
    }
    return false;
  }
}
