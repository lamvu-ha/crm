import { SalesMember } from '../types';
import { INITIAL_SALES_MEMBERS } from '../data/salesTeamData';

export const fetchServerSalesMembers = async (): Promise<SalesMember[]> => {
  try {
    const res = await fetch('/api/sales-members', { headers: { Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '') } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (e) {
    console.warn('Could not fetch sales members from server, using local fallback:', e);
  }
  return INITIAL_SALES_MEMBERS;
};

export const syncSalesMembersToServer = async (members: SalesMember[]): Promise<boolean> => {
  try {
    const res = await fetch('/api/sales-members', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '')
      },
      body: JSON.stringify(members)
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not sync sales members to server:', e);
    return false;
  }
};

export const loginEmployee = async (
  identifier: string,
  password: string
): Promise<{ success: boolean; user?: SalesMember; error?: string }> => {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '')
      },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || 'Đăng nhập không thành công' };
    }
    if (!data.accessToken || !data.user) return { success: false, error: 'Máy chủ không trả về phiên đăng nhập hợp lệ.' };
    localStorage.setItem('salepro_token', data.accessToken);
    localStorage.setItem('salepro_refresh_token', data.refreshToken || '');
    return { success: true, user: data.user };
  } catch (e: any) {
    console.warn('Login API failed:', e);
    return { success: false, error: e?.message || 'Không thể kết nối máy chủ xác thực' };
  }
};

export const changeEmployeePassword = async (params: {
  memberId?: string;
  email?: string;
  currentPassword?: string;
  newPassword: string;
  isForcedFirstLogin?: boolean;
}): Promise<{ success: boolean; user?: SalesMember; message?: string; error?: string }> => {
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (localStorage.getItem('salepro_token') || '')
      },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.error || 'Đổi mật khẩu thất bại' };
    }
    return { success: true, user: data.user, message: data.message };
  } catch (e: any) {
    console.error('Change password API error:', e);
    return { success: false, error: e?.message || 'Lỗi kết nối máy chủ khi đổi mật khẩu' };
  }
};

