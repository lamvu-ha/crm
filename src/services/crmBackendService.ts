import { getSaveState, trackSave } from './saveTracker';
import { Lead, LeadStatus, SalesMember, isDemoLead } from '../types';
import { 
  fetchLeadsFromFirestore, 
  saveLeadsToFirestore,
  deleteLeadFromFirestore,
  deleteMultipleLeadsFromFirestore,
  purgeDemoLeadsFromFirestore,
  fetchSalesMembersFromFirestore,
  saveSalesMembersToFirestore,
  testFirestoreConnection
} from './firebaseDb';

export interface StatusUpdateApiResponse {
  success: boolean;
  lead?: Lead;
  error?: string;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  rawBody?: string;
  parsedBody?: any;
  endpoint?: string;
  method?: string;
  sentPayload?: {
    leadId: string;
    newStatus: LeadStatus;
    author?: string;
    historyCount?: number;
  };
  failureCategory?: 'authentication' | 'rate_limiting' | 'payload_formatting' | 'not_found' | 'server_error' | 'network_error';
}

export interface DatabaseStatus {
  status: string;
  databaseEngine: string;
  storageType: string;
  totalLeads: number;
  assignedLeads: number;
  unassignedLeads: number;
  totalSalesMembers: number;
  activeSalesMembers: number;
  lastSyncAt: string;
  googleSheets?: {
    nvkd: string;
    crm: string;
  };
}

// Every backend request carries the current session; authorization failures never fall back to another datastore.
function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('salepro_token');
  return fetch(url, { ...options, headers: { ...options.headers, ...(token ? { Authorization: 'Bearer ' + token } : {}) } });
}

export class CRMBackendService {
  private snapshots = new Map<string, Lead>();
  private loaded = false;
  private sessionToken: string | null = null;
  private saveQueue: Promise<unknown> = Promise.resolve();
  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.saveQueue.then(operation, operation);
    this.saveQueue = next.catch(() => {});
    return next;
  }
  private remember(lead: Lead) {
    this.snapshots.set(lead.id, JSON.parse(JSON.stringify(lead)));
  }

  async saveLeads(leads: Lead[]): Promise<boolean> {
    if (!this.loaded || this.sessionToken !== localStorage.getItem('salepro_token')) return false;
    const latest = () => {try {return JSON.parse(localStorage.getItem('crm_bds_leads_v1') || 'null') || leads;} catch {return leads;}};
    return trackSave('customer-list', ()=>this.persistLeads(leads), ()=>this.persistLeads(latest()));
  }
  async updateLead(lead: Lead): Promise<boolean> {
    return trackSave('customer:'+lead.id, ()=>this.persistLead(lead), async ()=>{
      try {const current = JSON.parse(localStorage.getItem('crm_bds_leads_v1') || '[]').find((item: Lead)=>item.id===lead.id); return current ? this.persistLead(current) : true;} catch {return false;}
    });
  }
  // Fetch the authorized list from the server.
  async getLeads(forceSnapshot = false): Promise<Lead[]> {
    const token = localStorage.getItem('salepro_token');
    if (token !== this.sessionToken) { this.snapshots.clear(); this.loaded = false; this.sessionToken = token; }
    const res = await authenticatedFetch('/api/leads');
    if (!res.ok) throw new Error('Không tải được khách hàng: HTTP ' + res.status);
    const raw = await res.json();
    if (!Array.isArray(raw)) throw new Error('Danh sách khách hàng không hợp lệ.');
    const leads = raw.filter((lead: Lead) => !isDemoLead(lead));
    if (token !== localStorage.getItem('salepro_token')) throw new Error('Phiên đăng nhập đã thay đổi.');
    if (!this.loaded || forceSnapshot || (!getSaveState().pending && !getSaveState().failed)) leads.forEach((lead: Lead) => this.remember(lead));
    this.loaded = true;
    return leads;
  }

  private async persistLeads(leads: Lead[]): Promise<boolean> {
    // Initial local state must never overwrite the server before the authorized list is loaded.
    if (!this.loaded) return false;
    return this.enqueue(async () => {
      let success = true;
      for (const lead of leads.filter(item => !isDemoLead(item))) {
        if (!await this.writeLead(lead)) success = false;
      }
      return success;
    });
  }

  // Fetch a single lead by ID from backend server
  async getLeadById(leadId: string): Promise<Lead | null> {
    try {
      const res = await authenticatedFetch(`/api/leads/${leadId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const lead = await res.json();
        return lead;
      }
      return null;
    } catch (err) {
      console.warn(`[CRMBackendService] Failed to fetch lead ${leadId}:`, err);
      return null;
    }
  }

  // Update a single lead
  private async persistLead(lead: Lead): Promise<boolean> {
    return this.enqueue(() => this.writeLead(lead));
  }

  private async writeLead(lead: Lead): Promise<boolean> {
    if (this.sessionToken !== localStorage.getItem('salepro_token')) return false;
    const baseline = this.snapshots.get(lead.id);
    const changes: Record<string, unknown> = {};
    if (baseline) {
      for (const key of Object.keys(lead) as (keyof Lead)[]) {
        if (['id', 'updatedAt', 'rawPhoneMasked'].includes(key)) continue;
        if (JSON.stringify(lead[key]) !== JSON.stringify(baseline[key])) changes[key] = lead[key] === undefined ? null : lead[key];
      }
      if (!Object.keys(changes).length) return true;
    }
    try {
      const res = await authenticatedFetch(baseline ? '/api/leads/' + encodeURIComponent(lead.id) : '/api/leads', {
        method: baseline ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseline ? { ...changes, expectedUpdatedAt: baseline.updatedAt || null } : lead)
      });
      if (!res.ok) return false;
      const result = await res.json();
      if (!result.lead || result.lead.id !== lead.id) return false;
      this.remember(result.lead);
      return true;
    } catch { return false; }
  }

  async updateLeadStatus(leadId: string, newStatus: LeadStatus, author?: string, history?: any[]): Promise<StatusUpdateApiResponse> {
    let result: StatusUpdateApiResponse = {success:false,error:'Không lưu được trạng thái'};
    await trackSave('customer:'+leadId, async ()=>{result = await this.enqueue(() => this.persistLeadStatus(leadId,newStatus,author,history));return result.success;}, async ()=>{
      try {const current = JSON.parse(localStorage.getItem('crm_bds_leads_v1') || '[]').find((item: Lead)=>item.id===leadId);return current ? (await this.enqueue(() => this.persistLeadStatus(leadId,current.status,author,current.history))).success : true;} catch {return false;}
    });
    return result;
  }
  // Fast & dedicated status update for instant response
  private async persistLeadStatus(
    leadId: string,
    newStatus: LeadStatus,
    author?: string,
    history?: any[]
  ): Promise<StatusUpdateApiResponse> {
    if (this.sessionToken !== localStorage.getItem('salepro_token')) return { success: false, error: 'Phiên đăng nhập đã thay đổi.', failureCategory: 'authentication' };
    const endpoint = `/api/leads/${leadId}/status`;
    const payload = { status: newStatus, author, history, expectedUpdatedAt: this.snapshots.get(leadId)?.updatedAt || null };
    const sentMetadata = {
      leadId,
      newStatus,
      author,
      historyCount: history?.length || 0
    };

    console.log('[crmBackendService.updateLeadStatus] Initiating PATCH request:', {
      endpoint,
      method: 'PATCH',
      sentPayload: payload,
      timestamp: new Date().toISOString()
    });

    try {
      const res = await authenticatedFetch(endpoint, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // Extract all headers into a clean dictionary
      const headersMap: Record<string, string> = {};
      try {
        res.headers.forEach((val, key) => {
          headersMap[key.toLowerCase()] = val;
        });
      } catch (e) {}

      const rawBody = await res.text();
      let parsedBody: any = null;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch (e) {
        parsedBody = null;
      }

      console.log(`[crmBackendService.updateLeadStatus] Server responded with HTTP ${res.status} (${res.statusText})`);

      if (res.ok) {
        if (parsedBody?.lead) this.remember(parsedBody.lead);
        console.log('[crmBackendService.updateLeadStatus] Update succeeded on server:', {
          leadId,
          returnedStatus: parsedBody?.lead?.status || newStatus,
          success: true
        });
        return {
          success: true,
          lead: parsedBody?.lead,
          status: res.status,
          statusText: res.statusText,
          headers: headersMap,
          rawBody,
          parsedBody,
          endpoint,
          method: 'PATCH',
          sentPayload: sentMetadata
        };
      }

      // Categorize failure cause for clear root-cause identification
      let failureCategory: StatusUpdateApiResponse['failureCategory'] = 'server_error';
      if (res.status === 401 || res.status === 403) {
        failureCategory = 'authentication';
      } else if (res.status === 429) {
        failureCategory = 'rate_limiting';
      } else if (res.status === 400 || res.status === 422) {
        failureCategory = 'payload_formatting';
      } else if (res.status === 404) {
        failureCategory = 'not_found';
      } else if (res.status >= 500) {
        failureCategory = 'server_error';
      }

      const errorMessage = parsedBody?.error || parsedBody?.message || rawBody || `HTTP ${res.status}: ${res.statusText}`;
      console.error(`[crmBackendService.updateLeadStatus] Server returned HTTP error [${res.status}]:`, {
        status: res.status,
        statusText: res.statusText,
        failureCategory,
        headers: headersMap,
        body: parsedBody || rawBody
      });

      return {
        success: false,
        status: res.status,
        statusText: res.statusText,
        error: errorMessage,
        headers: headersMap,
        rawBody,
        parsedBody,
        endpoint,
        method: 'PATCH',
        sentPayload: sentMetadata,
        failureCategory
      };
    } catch (err: any) {
      console.error('[crmBackendService.updateLeadStatus] Network/fetch exception:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        leadId,
        newStatus
      });
      return { 
        success: false, 
        error: err?.message || 'Network error during status update',
        endpoint,
        method: 'PATCH',
        sentPayload: sentMetadata,
        failureCategory: 'network_error'
      };
    }
  }

  // Delete a lead by ID from backend server & Firestore
  async deleteLead(leadId: string): Promise<boolean> {
    try {
      const res = await authenticatedFetch(`/api/leads/${leadId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to delete lead from backend:', err);
      return false;
    }
  }

  // Delete multiple leads by IDs from backend server & Firestore
  async deleteMultipleLeads(leadIds: string[]): Promise<boolean> {
    try {
      const res = await authenticatedFetch('/api/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: leadIds })
      });
      return res.ok;
    } catch (err) {
      console.warn('Failed to bulk delete leads from backend:', err);
      return false;
    }
  }

  // Auto-distribute leads to sales team
  async autoDistributeLeads(
    forceAll: boolean = false, 
    clientLeads?: Lead[], 
    targetMemberNames?: string[]
  ): Promise<{ success: boolean; distributedCount: number; totalLeads: number; leads: Lead[] }> {
    const res = await authenticatedFetch('/api/leads/distribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ forceAll, leads: clientLeads, targetMemberNames })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || 'Lỗi khi phân bổ khách hàng từ backend');
    }
    const data = await res.json();
    return data;
  }

  // Clear demo leads
  async clearDemoLeads(): Promise<{ success: boolean; remainingCount: number; leads: Lead[] }> {
    const res = await authenticatedFetch('/api/leads/clear-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error('Không thể xóa dữ liệu demo từ backend');
    }
    const data = await res.json();
    const cleanLeads = (data.leads || []).filter((l: Lead) => !isDemoLead(l));
    return {
      success: true,
      remainingCount: cleanLeads.length,
      leads: cleanLeads
    };
  }

  // Fetch sales members
  async getSalesMembers(): Promise<SalesMember[]> {
    const res = await authenticatedFetch('/api/sales-members');
    if (!res.ok) return [];
    const members = await res.json();
    return Array.isArray(members) ? members : [];
  }

  async saveSalesMembers(members: SalesMember[]): Promise<boolean> {
    try {
      const res = await authenticatedFetch('/api/sales-members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(members) });
      return res.ok;
    } catch { return false; }
  }

  // Create new sales member directly in database
  async createSalesMember(data: {
    fullName: string;
    email: string;
    phone?: string;
    role?: 'admin' | 'tpkd' | 'sale';
    teamName?: string;
    password?: string;
    maxDailyLeads?: number;
    isOnlineForLead?: boolean;
  }): Promise<{ success: boolean; member?: SalesMember; error?: string }> {
    try {
      const token = localStorage.getItem('salepro_token');
      const res = await authenticatedFetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          role: data.role === 'admin' ? 'SUPER_ADMIN' : data.role === 'tpkd' ? 'TEAM_LEADER' : 'SALES_AGENT',
          teamName: data.teamName || 'Khối Kinh Doanh BĐS',
          password: data.password || 'CHANGE_ME_BEFORE_USE',
          maxDailyLeads: data.maxDailyLeads || 50,
          isOnlineForLead: data.isOnlineForLead !== undefined ? data.isOnlineForLead : true
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Lỗi tạo nhân viên trên máy chủ' };
      }

      const createdMember: SalesMember = {
        id: resData.user?.id || `sales-${Date.now()}`,
        name: data.fullName,
        email: data.email,
        phone: data.phone || '',
        role: data.role || 'sale',
        team: data.teamName || 'Khối Kinh Doanh BĐS',
        status: 'active',
        isOnlineForLead: data.isOnlineForLead !== undefined ? data.isOnlineForLead : true,
        maxDailyLeads: data.maxDailyLeads || 50,
        title: data.role === 'admin' ? 'Quản trị viên' : data.role === 'tpkd' ? 'Trưởng phòng KD' : 'Chuyên viên Sale'
      };

      // Also persist to Firestore
      try {
        await saveSalesMembersToFirestore([createdMember]);
      } catch {}

      return { success: true, member: createdMember };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi mạng khi tạo nhân viên' };
    }
  }

  // Update sales member directly in database
  async updateSalesMember(
    memberId: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: 'admin' | 'tpkd' | 'sale';
      teamName?: string;
      password?: string;
      status?: 'active' | 'paused' | 'inactive';
      maxDailyLeads?: number;
      isOnlineForLead?: boolean;
    }
  ): Promise<{ success: boolean; member?: SalesMember; error?: string }> {
    try {
      const token = localStorage.getItem('salepro_token');
      const payload: any = {};
      if (data.fullName) payload.fullName = data.fullName;
      if (data.email) payload.email = data.email;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.role) {
        payload.role = data.role === 'admin' ? 'SUPER_ADMIN' : data.role === 'tpkd' ? 'TEAM_LEADER' : 'SALES_AGENT';
      }
      if (data.teamName !== undefined) payload.teamName = data.teamName;
      if (data.password && data.password.trim()) payload.password = data.password.trim();
      if (data.status) payload.status = data.status.toUpperCase();
      if (data.maxDailyLeads !== undefined) payload.maxDailyLeads = data.maxDailyLeads;
      if (data.isOnlineForLead !== undefined) payload.isOnlineForLead = data.isOnlineForLead;

      const res = await authenticatedFetch(`/api/users/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Lỗi cập nhật nhân viên trên máy chủ' };
      }

      return { success: true, member: resData.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Lỗi mạng khi cập nhật nhân viên' };
    }
  }

  // Delete sales member directly from database
  async deleteSalesMember(memberId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('salepro_token');
      const res = await authenticatedFetch(`/api/users/${memberId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': 'SUPER_ADMIN',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // Reset sales members to official list
  async resetSalesMembersToOfficial(): Promise<SalesMember[]> {
    const res = await authenticatedFetch('/api/sales-members/reset-to-official', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data.members || [];
  }

  // Get Database status
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const res = await authenticatedFetch('/api/database/status');
    if (!res.ok) {
      throw new Error('Không thể lấy thông tin database');
    }
    return await res.json();
  }

  // Download backup
  downloadBackup() {
    window.open('/api/database/export', '_blank');
  }

  // Restore backup
  async restoreBackup(backupData: any): Promise<boolean> {
    const res = await authenticatedFetch('/api/database/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData)
    });
    return res.ok;
  }
}

export const crmBackend = new CRMBackendService();
export const crmBackendService = crmBackend;
