import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Lead, GoogleDriveFile, GoogleSheetTabInfo, LeadStatus, ProductType, SalesMember, ParsedNvkdMember, UserRole } from '../types';

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Provider with required Google Workspace scopes (Used by Admin for Drive & Gmail sending)
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.setCustomParameters({
  prompt: 'consent'
});

// Clean Google Auth provider for employee sign-in (NO restricted scopes - allows ANY Gmail instantly)
const basicGoogleProvider = new GoogleAuthProvider();
basicGoogleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Sign in with Gmail for employees (fast, zero scope warnings, 1-click account selector)
export const signInWithGmail = async (): Promise<{ user: User; email: string; displayName: string } | null> => {
  try {
    const result = await signInWithPopup(auth, basicGoogleProvider);
    if (!result || !result.user) {
      throw new Error('Đăng nhập Gmail không thành công.');
    }
    const email = (result.user.email || '').toLowerCase().trim();
    const displayName = result.user.displayName || result.user.email || 'Nhân sự';
    return {
      user: result.user,
      email,
      displayName
    };
  } catch (error: any) {
    console.error('Gmail Sign In Error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Bạn đã đóng cửa sổ xác thực Gmail.');
    }
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Trình duyệt đã chặn cửa sổ Popup đăng nhập. Vui lòng cho phép popup và thử lại.');
    }
    throw error;
  }
};

// Auth state listener
export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google (Firebase Auth popup with Workspace scopes)
export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không nhận được Google Access Token từ phiên xác thực.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string | null) => {
  cachedAccessToken = token;
};

export const signOutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Target Google Sheet file names
export const TARGET_CRM_SHEET_NAME = 'MAY_TRUONGBV_MH5.19_CRM_V.1';
export const TARGET_NVKD_SHEET_NAME = 'MAY_TRUONGBV_MH5.19_NVKD_V.1';

// Search Google Drive for Spreadsheet files, prioritizing "MAY_TRUONGBV_MH5.19_CRM_V.1"
export const searchDriveSheets = async (
  queryName?: string
): Promise<GoogleDriveFile[]> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Chưa có mã ủy quyền Google. Vui lòng đăng nhập Google trước.');
  }

  // Build Drive query: find spreadsheets
  let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";
  if (queryName && queryName.trim()) {
    q += ` and name contains '${queryName.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi truy cập Google Drive (${res.status})`);
  }

  const data = await res.json();
  const files = (data.files || []) as GoogleDriveFile[];

  // Sort prioritizing exact TARGET_CRM_SHEET_NAME match
  return files.sort((a, b) => {
    const aMatch = a.name.includes(TARGET_CRM_SHEET_NAME) || a.name.includes('MAY_TRUONGBV');
    const bMatch = b.name.includes(TARGET_CRM_SHEET_NAME) || b.name.includes('MAY_TRUONGBV');
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
};

// Fetch spreadsheet info (sheet tabs)
export const fetchSpreadsheetMetadata = async (
  spreadsheetId: string
): Promise<{ title: string; sheets: GoogleSheetTabInfo[] }> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Chưa có mã ủy quyền Google. Vui lòng đăng nhập Google trước.');
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi lấy thông tin Google Sheet (${res.status})`);
  }

  const data = await res.json();
  const sheets: GoogleSheetTabInfo[] = (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId ?? 0,
    title: s.properties?.title ?? 'Sheet1',
    rowCount: s.properties?.gridProperties?.rowCount,
    columnCount: s.properties?.gridProperties?.columnCount
  }));

  return {
    title: data.properties?.title || 'Google Sheet',
    sheets
  };
};

// Fetch rows values from a specific sheet range
export const fetchSheetData = async (
  spreadsheetId: string,
  sheetTitle: string
): Promise<string[][]> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Chưa có mã ủy quyền Google. Vui lòng đăng nhập Google trước.');
  }

  const encodedSheet = encodeURIComponent(sheetTitle);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheet}!A1:Z500`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi đọc dữ liệu sheet (${res.status})`);
  }

  const data = await res.json();
  return (data.values || []) as string[][];
};

// Column mapping helper
export interface ColumnMappingResult {
  headerRowIndex: number;
  headers: string[];
  mapping: {
    stt: number;
    date: number;
    fullName: number;
    phone: number;
    dataSource: number;
    productType: number;
    project: number;
    budget: number;
    callStatus: number;
    status: number;
    assignee: number;
    appointment: number;
    potentialLevel: number;
    notes: number;
  };
}

// Automatically detect columns in MAY_TRUONGBV_MH5.19_CRM_V.1 spreadsheet
export const detectColumnMapping = (rows: string[][]): ColumnMappingResult => {
  // Look through first 5 rows to find the header row
  let headerRowIndex = 0;
  let bestHeaderScore = -1;

  for (let r = 0; r < Math.min(rows.length, 5); r++) {
    const row = rows[r] || [];
    const text = row.join(' ').toLowerCase();
    let score = 0;
    if (text.includes('tên') || text.includes('khách') || text.includes('họ tên')) score += 3;
    if (text.includes('sđt') || text.includes('điện thoại') || text.includes('phone')) score += 3;
    if (text.includes('stt')) score += 2;
    if (text.includes('ngày') || text.includes('date')) score += 2;
    if (text.includes('nhu cầu') || text.includes('dự án') || text.includes('sản phẩm')) score += 2;
    if (text.includes('sale') || text.includes('phụ trách') || text.includes('tâm') || text.includes('nhân sự')) score += 2;
    if (text.includes('trạng thái') || text.includes('tình trạng')) score += 2;

    if (score > bestHeaderScore) {
      bestHeaderScore = score;
      headerRowIndex = r;
    }
  }

  const headers = rows[headerRowIndex] || [];
  const mapping = {
    stt: -1,
    date: -1,
    fullName: -1,
    phone: -1,
    dataSource: -1,
    productType: -1,
    project: -1,
    budget: -1,
    callStatus: -1,
    status: -1,
    assignee: -1,
    appointment: -1,
    potentialLevel: -1,
    notes: -1
  };

  headers.forEach((h, idx) => {
    const col = (h || '').trim().toLowerCase();
    if (!col) return;

    if (col === 'stt' || col === 'no' || col === '#') mapping.stt = idx;
    else if (col.includes('ngày') || col.includes('thời gian') || col.includes('date')) {
      if (mapping.date === -1) mapping.date = idx;
    }
    else if (col.includes('họ tên') || col.includes('tên khách') || col.includes('khách hàng') || col === 'tên' || col === 'họ và tên') {
      mapping.fullName = idx;
    }
    else if (col.includes('sđt') || col.includes('điện thoại') || col.includes('phone') || col.includes('số đt')) {
      mapping.phone = idx;
    }
    else if (col.includes('nguồn') || col.includes('tệp') || col.includes('kênh') || col.includes('source') || col.includes('máy')) {
      mapping.dataSource = idx;
    }
    else if (col.includes('sản phẩm') || col.includes('loại bđs') || col.includes('loại nhà') || col.includes('loại hình')) {
      mapping.productType = idx;
    }
    else if (col.includes('dự án') || col.includes('nhu cầu') || col.includes('mã căn') || col.includes('mh5.19') || col.includes('khu vực')) {
      mapping.project = idx;
    }
    else if (col.includes('tài chính') || col.includes('giá') || col.includes('ngân sách') || col.includes('budget') || col.includes('tầm giá')) {
      mapping.budget = idx;
    }
    else if (col.includes('cuộc gọi') || col.includes('liên hệ') || col.includes('kết quả gọi') || col.includes('khảo sát')) {
      mapping.callStatus = idx;
    }
    else if (col.includes('trạng thái') || col.includes('tiến độ') || col.includes('phễu') || col.includes('status')) {
      mapping.status = idx;
    }
    else if (col.includes('sale') || col.includes('phụ trách') || col.includes('nhân viên') || col.includes('nhân sự') || col.includes('người nhận') || col.includes('team mr tâm') || col.includes('team')) {
      mapping.assignee = idx;
    }
    else if (col.includes('lịch hẹn') || col.includes('ngày xem') || col.includes('hẹn gặp')) {
      mapping.appointment = idx;
    }
    else if (col.includes('tiềm năng') || col.includes('đánh giá') || col.includes('mức độ')) {
      mapping.potentialLevel = idx;
    }
    else if (col.includes('ghi chú') || col.includes('nội dung') || col.includes('phản hồi') || col.includes('note') || col.includes('chi tiết')) {
      mapping.notes = idx;
    }
  });

  return {
    headerRowIndex,
    headers,
    mapping
  };
};

// Normalize status values to our LeadStatus
const normalizeLeadStatus = (raw: string): LeadStatus => {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('không nghe') || s.includes('k nghe') || s.includes('nhỡ')) return 'Không nghe máy';
  if (s.includes('không nhu cầu') || s.includes('ko nhu cầu') || s.includes('từ chối') || s.includes('hủy')) return 'Không nhu cầu';
  if (s.includes('quan tâm cao') || s.includes('quan tâm')) return 'Quan tâm';
  if (s.includes('tiềm năng') || s.includes('nóng') || s.includes('rất thích')) return 'Tiềm năng';
  if (s.includes('gọi lại') || s.includes('hẹn gọi') || s.includes('gọi sau')) return 'Gọi lại sau';
  if (s.includes('máy bận') || s.includes('bận')) return 'Máy bận';
  if (s.includes('thuê bao') || s.includes('tắt máy') || s.includes('không liên lạc')) return 'Thuê bao';
  if (s.includes('gửi thông tin') || s.includes('gửi tt') || s.includes('gửi bảng hàng') || s.includes('zalo')) return 'Gửi thông tin';
  if (s.includes('nhầm số') || s.includes('sai số') || s.includes('lộn số')) return 'Nhầm số';
  if (s.includes('chốt') || s.includes('thành công') || s.includes('ký hđ')) return 'Đã chốt';
  if (s.includes('cọc') || s.includes('đàm phán') || s.includes('thương lượng') || s.includes('chờ cọc')) return 'Đàm phán / Cọc';
  if (s.includes('hẹn') || s.includes('xem nhà') || s.includes('đi xem') || s.includes('dẫn khách')) return 'Hẹn xem BĐS';
  if (s.includes('đang') || s.includes('chăm') || s.includes('trao đổi')) return 'Đang chăm sóc';
  if (s.includes('mới')) return 'Khách mới';
  if (s === 'khác') return 'Khác';
  return raw ? (raw as LeadStatus) : 'Khác';
};

// Normalize product types
const normalizeProductType = (raw: string): ProductType => {
  const p = (raw || '').toLowerCase().trim();
  if (p.includes('căn hộ') || p.includes('chung cư') || p.includes('condo')) return 'Căn hộ chung cư';
  if (p.includes('biệt thự') || p.includes('villa')) return 'Biệt thự / Villa';
  if (p.includes('đất') || p.includes('nền')) return 'Đất nền';
  if (p.includes('shophouse') || p.includes('nhà phố thương mại')) return 'Shophouse';
  if (p.includes('nghỉ dưỡng') || p.includes('resort')) return 'BĐS Nghỉ dưỡng';
  if (p.includes('mặt bằng') || p.includes('kinh doanh') || p.includes('thuê')) return 'Mặt bằng kinh doanh';
  return 'Nhà phố trung tâm';
};

// Resolve raw assignee string from Google Sheet to a recognized SalesMember or "Chưa phân bổ"
export const resolveSheetAssignee = (rawAssignee?: string, allSales?: SalesMember[]): string => {
  if (!rawAssignee || !rawAssignee.trim()) {
    return 'Chưa phân bổ';
  }
  const clean = rawAssignee.trim();
  const lower = clean.toLowerCase();

  if (
    lower === 'chưa' ||
    lower === 'chưa phân bổ' ||
    lower === 'chưa phân công' ||
    lower === 'chưa gán' ||
    lower === 'chưa có' ||
    lower === 'trống' ||
    lower === 'tự động' ||
    lower === 'tự phân bổ' ||
    lower === 'tự động phân bổ' ||
    lower === 'null' ||
    lower === 'undefined'
  ) {
    return 'Chưa phân bổ';
  }

  // If sales list provided, match against known sales members
  if (allSales && allSales.length > 0) {
    const matched = allSales.find((s) => {
      const sName = (s.name || '').toLowerCase().trim();
      const sEmail = (s.email || '').toLowerCase().trim();
      return sName === lower || sEmail === lower || sName.includes(lower) || lower.includes(sName);
    });
    if (matched) return matched.name;
  }

  // Check common staff aliases
  if (lower.includes('hoài tâm') || lower.includes('phạm bá hoài tâm') || (lower.includes('tâm') && !lower.includes('trung tâm'))) {
    return 'Phạm Bá Hoài Tâm';
  }
  if (lower.includes('bích chi') || lower.includes('phan bích chi') || lower.includes('chi')) {
    return 'Phan Bích Chi';
  }
  if (lower.includes('nhật quang') || lower.includes('hoàng nhật quang') || lower.includes('quang')) {
    return 'Hoàng Nhật Quang';
  }
  if (lower.includes('thế vinh') || lower.includes('trần phạm thế vinh') || lower.includes('vinh')) {
    return 'Trần Phạm Thế Vinh';
  }
  if (lower.includes('minh phúc') || lower.includes('trần minh phúc') || lower.includes('phúc')) {
    return 'Trần Minh Phúc';
  }
  if (lower.includes('phát huy') || lower.includes('huỳnh phát huy')) {
    return 'Huỳnh Phát Huy';
  }
  if (lower.includes('văn khoa') || lower.includes('lê văn khoa') || lower.includes('khoa')) {
    return 'Lê Văn Khoa';
  }
  if (lower.includes('ngọc vũ') || lower.includes('võ ngọc vũ') || lower.includes('vũ')) {
    return 'Võ Ngọc Vũ';
  }
  if (lower.includes('ninh') || lower.includes('nguyễn ninh')) {
    return 'Nguyễn Ninh Thuận';
  }
  if (lower.includes('thanh mai') || lower.includes('lê thị thanh mai') || lower.includes('mai')) {
    return 'Lê Thị Thanh Mai';
  }
  if (lower.includes('văn phụng') || lower.includes('đỗ văn phụng') || lower.includes('phụng')) {
    return 'Đỗ Văn Phụng';
  }
  if (lower.includes('nhật duy') || lower.includes('trần nhật duy') || lower.includes('duy')) {
    return 'Trần Nhật Duy';
  }
  if (lower.includes('thành vương') || lower.includes('châu thành vương') || lower.includes('vương')) {
    return 'Châu Thành Vương';
  }
  if (lower.includes('mỹ lin') || lower.includes('trần mỹ lin') || lower.includes('lin')) {
    return 'Trần Mỹ Lin';
  }
  if (lower.includes('mộng ngân') || lower.includes('quách thị mộng ngân') || lower.includes('ngân')) {
    return 'Quách Thị Mộng Ngân';
  }
  if (lower.includes('thắng') || lower.includes('huỳnh văn thắng')) {
    return 'Huỳnh Văn Thắng';
  }
  if (lower.includes('đức huy') || lower.includes('nguyễn đức huy')) {
    return 'Nguyễn Đức Huy';
  }
  if (lower.includes('thuận hiếu') || lower.includes('đinh thị thuận hiếu') || lower.includes('hiếu')) {
    return 'Đinh Thị Thuận Hiếu';
  }
  if (lower.includes('trường') || lower.includes('văn trường') || lower.includes('bùi văn trường') || lower.includes('truongbv')) {
    return 'Bùi Văn Trường';
  }

  return clean;
};

// Parse rows into CRM Leads
export const parseMayMh5SheetToLeads = (
  rows: string[][],
  existingLeadsCount: number = 0,
  salesMembersList?: SalesMember[]
): Lead[] => {
  if (!rows || rows.length < 2) return [];

  const { headerRowIndex, mapping } = detectColumnMapping(rows);
  const dataRows = rows.slice(headerRowIndex + 1);
  const leads: Lead[] = [];

  let currentStt = existingLeadsCount;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.every((c) => !c || c.trim() === '')) continue;

    const rawName = mapping.fullName >= 0 ? row[mapping.fullName] : '';
    const rawPhone = mapping.phone >= 0 ? row[mapping.phone] : '';

    // If both name and phone are empty, skip row
    if (!rawName && !rawPhone) continue;

    currentStt++;

    const rawDate = mapping.date >= 0 ? row[mapping.date] : '';
    let formattedDate = new Date().toISOString().split('T')[0];
    if (rawDate) {
      // support DD/MM/YYYY or YYYY-MM-DD
      const dateParts = rawDate.trim().split(/[/.-]/);
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) {
          formattedDate = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
        } else {
          formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        }
      }
    }

    const rawSource = mapping.dataSource >= 0 ? row[mapping.dataSource] : '';
    const rawProject = mapping.project >= 0 ? row[mapping.project] : '';
    const rawProduct = mapping.productType >= 0 ? row[mapping.productType] : '';
    const rawStatus = mapping.status >= 0 ? row[mapping.status] : '';
    const rawAssignee = mapping.assignee >= 0 ? row[mapping.assignee] : '';
    const rawBudget = mapping.budget >= 0 ? row[mapping.budget] : '';
    const rawCallStatus = mapping.callStatus >= 0 ? row[mapping.callStatus] : '';
    const rawPotential = mapping.potentialLevel >= 0 ? row[mapping.potentialLevel] : '';
    const rawNotes = mapping.notes >= 0 ? row[mapping.notes] : '';

    // Assignee normalization: defaults to 'Chưa phân bổ' so auto-distribution can assign to sales
    const finalAssignee = resolveSheetAssignee(rawAssignee, salesMembersList);

    // Call status detection
    let callStatus: Lead['callStatus'] = 'Đã nghe máy';
    const csLower = (rawCallStatus || '').toLowerCase();
    if (csLower.includes('bận') || csLower.includes('chưa')) callStatus = 'Máy bận / Chưa gọi';
    else if (csLower.includes('hẹn')) callStatus = 'Hẹn gọi lại';
    else if (csLower.includes('thuê bao')) callStatus = 'Thuê bao';
    else if (csLower.includes('zalo')) callStatus = 'Kết bạn Zalo';
    else if (csLower.includes('thích') || csLower.includes('nóng') || csLower.includes('cao')) callStatus = 'Khách quan tâm cao';

    // Potential level
    let potentialLevel: Lead['potentialLevel'] = 'Ấm';
    const potLower = (rawPotential || '').toLowerCase();
    if (potLower.includes('nóng') || potLower.includes('hot') || potLower.includes('vip')) potentialLevel = 'Nóng';
    else if (potLower.includes('lạnh') || potLower.includes('thấp')) potentialLevel = 'Lạnh';

    const leadItem: Lead = {
      id: `lead-sheet-${Date.now()}-${i}`,
      stt: currentStt,
      date: formattedDate,
      fullName: rawName?.trim() || 'Khách hàng quan tâm',
      phone: rawPhone?.trim() || 'Đang cập nhật',
      dataSource: rawSource?.trim() || 'MAY_MH5.19',
      campaignCode: 'MAY_MH5.19',
      project: rawProject?.trim() || 'Dự án MH5.19',
      productType: normalizeProductType(rawProduct || rawProject),
      status: normalizeLeadStatus(rawStatus),
      assignee: finalAssignee,
      budget: rawBudget?.trim() || '15 - 25 tỷ',
      callStatus,
      potentialLevel,
      notes: rawNotes?.trim() || `Đồng bộ từ Google Sheet ${TARGET_CRM_SHEET_NAME} (Dòng ${i + headerRowIndex + 2})`,
      history: [
        {
          id: `log-sheet-sync-${Date.now()}-${i}`,
          date: new Date().toISOString().replace('T', ' ').slice(0, 16),
          type: 'Ghi chú nội bộ',
          content: `Nhập dữ liệu tự động từ file Google Sheet: ${TARGET_CRM_SHEET_NAME} (Phụ trách: ${finalAssignee})`,
          author: 'Google Sheets Sync'
        }
      ],
      sheetRowIndex: i + headerRowIndex + 2
    };

    leads.push(leadItem);
  }

  return leads;
};

// Pre-packaged authentic sample dataset matching MAY_TRUONGBV_MH5.19_CRM_V.1
export const SAMPLE_MAY_MH5_SHEET_LEADS: Lead[] = [
  {
    id: 'lead-may-1',
    stt: 1,
    date: '2026-05-19',
    fullName: 'Trịnh Hoài Nam',
    phone: '0903889911',
    dataSource: 'MAY_MH5.19 (Facebook Ads)',
    campaignCode: 'MAY_MH5.19',
    project: 'Nhà phố Nguyễn Thị Minh Khai Q1 (Mã MH5.19-01)',
    productType: 'Nhà phố trung tâm',
    status: 'Tiềm năng',
    assignee: 'Trần Minh Phúc',
    budget: '28 - 32 tỷ',
    callStatus: 'Khách quan tâm cao',
    potentialLevel: 'Nóng',
    notes: 'Khách tài chính sẵn, quan tâm căn góc hẻm xe hơi tránh nhau. Đã gửi sổ hồng qua Zalo, hẹn Trường dẫn đi xem nhà thứ 7 tuần này.',
    history: [
      {
        id: 'log-may-1',
        date: '2026-05-19 09:30',
        type: 'Cuộc gọi',
        content: 'Cuộc gọi từ chiến dịch MAY_MH5.19. Khách nghe máy ngay, phong thái thiện chí, yêu cầu xem giấy tờ pháp lý chuẩn.',
        author: 'Bùi Văn Trường'
      }
    ]
  },
  {
    id: 'lead-may-2',
    stt: 2,
    date: '2026-05-19',
    fullName: 'Hoàng Thị Cẩm Vân',
    phone: '0912445588',
    dataSource: 'MAY_MH5.19 (Hotline Telesale)',
    campaignCode: 'MAY_MH5.19',
    project: 'Mặt bằng kinh doanh Hai Bà Trưng (Mã MH5.19-02)',
    productType: 'Mặt bằng kinh doanh',
    status: 'Hẹn xem BĐS',
    assignee: 'Huỳnh Phát Huy',
    budget: '18 - 22 tỷ',
    callStatus: 'Đã nghe máy',
    potentialLevel: 'Nóng',
    notes: 'Khách mua vừa ở vừa mở spa làm đẹp. Cần mặt tiền tối thiểu 4.5m, đường rộng thông thoáng. Huy đang chốt lịch xem.',
    history: [
      {
        id: 'log-may-2',
        date: '2026-05-19 11:15',
        type: 'Zalo',
        content: 'Đã kết bạn Zalo và gửi 3 căn phù hợp tiêu chí MH5.19. Khách chọn căn số 2 đi xem vào 15h chiều mai.',
        author: 'Huỳnh Phát Huy'
      }
    ]
  },
  {
    id: 'lead-may-3',
    stt: 3,
    date: '2026-05-20',
    fullName: 'Đoàn Quang Khải',
    phone: '0937662244',
    dataSource: 'MAY_MH5.19 (Google Ads Search)',
    campaignCode: 'MAY_MH5.19',
    project: 'Căn hộ Duplex Vinhomes Golden River (Mã MH5.19-03)',
    productType: 'Căn hộ chung cư',
    status: 'Đàm phán / Cọc',
    assignee: 'Phan Bích Chi',
    budget: '24 tỷ',
    dealValue: 24000,
    callStatus: 'Khách quan tâm cao',
    potentialLevel: 'Nóng',
    notes: 'Đã dẫn đi xem thực tế 2 lần. Chủ nhà đồng ý bớt 300 triệu, khách đang kiểm tra tài khoản chuẩn bị cọc 500 triệu.',
    history: [
      {
        id: 'log-may-3',
        date: '2026-05-20 14:00',
        type: 'Gặp mặt / Xem nhà',
        content: 'Chi đã hỗ trợ khách kiểm tra trực tiếp hiện trạng căn hộ. Khách rất ưng ý view sông.',
        author: 'Phan Bích Chi'
      }
    ]
  },
  {
    id: 'lead-may-4',
    stt: 4,
    date: '2026-05-20',
    fullName: 'Ngô Thanh Huyền',
    phone: '0988771122',
    dataSource: 'MAY_MH5.19 (Data Tổng Giới Thiệu)',
    campaignCode: 'MAY_MH5.19',
    project: 'Biệt thự Thảo Điền Quận 2 (Mã MH5.19-04)',
    productType: 'Biệt thự / Villa',
    status: 'Đang chăm sóc',
    assignee: 'Nguyễn Đức Huy',
    budget: '45 - 55 tỷ',
    callStatus: 'Kết bạn Zalo',
    potentialLevel: 'Ấm',
    notes: 'Khách đầu tư phân khúc cao cấp, đang ở Hà Nội chuẩn bị vào TP.HCM công tác cuối tháng. Đã gửi brochure tổng thể.',
    history: [
      {
        id: 'log-may-4',
        date: '2026-05-20 16:20',
        type: 'Zalo',
        content: 'Khách yêu cầu gửi trước clip quay thực tế flycam biệt thự sân vườn để gia đình xem duyệt trước.',
        author: 'Nguyễn Đức Huy'
      }
    ]
  },
  {
    id: 'lead-may-5',
    stt: 5,
    date: '2026-05-21',
    fullName: 'Bùi Đức Trọng',
    phone: '0973115599',
    dataSource: 'MAY_MH5.19 (Tiktok Ads Campaign)',
    campaignCode: 'MAY_MH5.19',
    project: 'Shophouse Mặt tiền Cách Mạng Tháng 8 (Mã MH5.19-05)',
    productType: 'Shophouse',
    status: 'Đã chốt',
    assignee: 'Nguyễn Ninh',
    budget: '36 tỷ',
    dealValue: 36000,
    callStatus: 'Đã nghe máy',
    potentialLevel: 'Nóng',
    notes: 'Đã hoàn tất thủ tục công chứng mua bán và thanh toán đủ đợt 1. Hoa hồng dự kiến giải ngân trong tuần.',
    history: [
      {
        id: 'log-may-5',
        date: '2026-05-21 10:00',
        type: 'Ghi chú nội bộ',
        content: 'Chốt cọc thành công 1 tỷ tại văn phòng công chứng. Ninh trực tiếp điều phối hợp đồng.',
        author: 'Nguyễn Ninh'
      }
    ]
  },
  {
    id: 'lead-may-6',
    stt: 6,
    date: '2026-05-21',
    fullName: 'Lâm Bích Ngọc',
    phone: '0908332211',
    dataSource: 'MAY_MH5.19 (Zalo Ads)',
    campaignCode: 'MAY_MH5.19',
    project: 'Nhà phố Lê Văn Sỹ Quận 3 (Mã MH5.19-06)',
    productType: 'Nhà phố trung tâm',
    status: 'Khách mới',
    assignee: 'Huỳnh Phát Huy',
    budget: '14 - 17 tỷ',
    callStatus: 'Máy bận / Chưa gọi',
    potentialLevel: 'Ấm',
    notes: 'Lead mới đổ về máy Telesale MH5.19 lúc 10h15. Cần gọi liên hệ ngay để không bị nguội data.',
    history: [
      {
        id: 'log-may-6',
        date: '2026-05-21 10:15',
        type: 'Ghi chú nội bộ',
        content: 'Tiếp nhận khách tự động từ luồng chiến dịch MAY_MH5.19.',
        author: 'Huỳnh Phát Huy'
      }
    ]
  }
];

// ==========================================
// NVKD SHEET (MAY_TRUONGBV_MH5.19_NVKD_V.1) & GMAIL INTEGRATION
// ==========================================

export const NVKD_DEFAULT_PASSWORD = 'CHANGE_ME_BEFORE_USE';

// Sample fallback data for MAY_TRUONGBV_MH5.19_NVKD_V.1 with custom usernames and secure individual passwords
export const SAMPLE_NVKD_SHEET_MEMBERS: ParsedNvkdMember[] = [
  {
    stt: 1,
    name: 'Nguyễn Đức Huy',
    username: 'huy.nd',
    email: 'happyhuy2812@gmail.com',
    phone: '0901394143',
    title: 'Giám Đốc Kinh Doanh (GĐKD)',
    role: 'admin',
    team: 'Ban Giám Đốc - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 2,
    name: 'Bùi Văn Trường',
    username: 'truong.bv',
    email: 'truongbv.salepro@gmail.com',
    phone: '0935555348',
    title: 'Quản Trị Viên Hệ Thống / Marketing',
    role: 'admin',
    team: 'Ban quản trị hệ thống',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 3,
    name: 'Phan Bích Chi',
    username: 'chi.pb',
    email: 'bichchilk2023@gmail.com',
    phone: '0777174368',
    title: 'Trưởng Phòng Kinh Doanh (TPKD)',
    role: 'tpkd',
    team: 'Team Chi - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 4,
    name: 'Nguyễn Ninh Thuận',
    username: 'thuan.nn',
    email: 'nguyenninhthuan2007@gmail.com',
    phone: '0332263765',
    title: 'Chuyên viên Marketing & Phát triển',
    role: 'sale',
    team: 'Marketing - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 5,
    name: 'Lê Văn Khoa',
    username: 'khoa.lv',
    email: 'levodangkhoasg@gmail.com',
    phone: '0938242277',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Chi - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 6,
    name: 'Võ Ngọc Vũ',
    username: 'vu.vn',
    email: 'ngocvu82.bds@gmail.com',
    phone: '0888080898',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Chi - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 7,
    name: 'Nguyễn Minh Phương',
    username: 'phuong.nm',
    email: 'phuongnguyen1591993@gmail.com',
    phone: '0938516323',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Chi - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 8,
    name: 'Lê Thị Bích Hằng',
    username: 'hang.ltb',
    email: 'hangnhadattyloc@gmail.com',
    phone: '0903356875',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Chi - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 9,
    name: 'Đinh Thị Thuận Hiếu',
    username: 'hieu.dtt',
    email: 'luckyhuyhoang@gmail.com',
    phone: '0938299165',
    title: 'Giám Đốc Kinh Doanh (GĐKD)',
    role: 'admin',
    team: 'Ban Giám Đốc - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 10,
    name: 'Huỳnh Văn Thắng',
    username: 'thang.hv',
    email: 'wildennight@gmail.com',
    phone: '0345254430',
    title: 'Chuyên viên Marketing & Phát triển',
    role: 'sale',
    team: 'Marketing - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 12,
    name: 'Huỳnh Phát Huy',
    username: 'huy.hp',
    email: 'huynhphathuy.2002@gmail.com',
    phone: '0941997962',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Quang - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 13,
    name: 'Hoàng Nhật Quang',
    username: 'quang.hn',
    email: 'quangico2002@gmail.com',
    phone: '0896990212',
    title: 'Trưởng Phòng Kinh Doanh (TPKD)',
    role: 'tpkd',
    team: 'Team Quang - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 14,
    name: 'Trần Minh Phúc',
    username: 'phuc.tm',
    email: 'phucminhtran1811@gmail.com',
    phone: '0909606832',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Tâm - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 15,
    name: 'Phạm Bá Hoài Tâm',
    username: 'tam.pbh',
    email: 'phamtamdxg@gmail.com',
    phone: '0705522745',
    title: 'Trưởng Phòng Kinh Doanh (TPKD)',
    role: 'tpkd',
    team: 'Team Tâm - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 16,
    name: 'Lê Thị Thanh Mai',
    username: 'mai.ltt',
    email: 'maimai28051998@gmail.com',
    phone: '0347888928',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 17,
    name: 'Đỗ Văn Phụng',
    username: 'phung.dv',
    email: 'yesvanphung2019@gmail.com',
    phone: '0937695543',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 18,
    name: 'Trần Nhật Duy',
    username: 'duy.tn',
    email: 'nhatduy1205@gmail.com',
    phone: '0932299315',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 19,
    name: 'Châu Thành Vương',
    username: 'vuong.ct',
    email: 'vuongct.bigland@gmail.com',
    phone: '0901841064',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 20,
    name: 'Trần Phạm Thế Vinh',
    username: 'vinh.tpt',
    email: 'vinhtrangland@gmail.com',
    phone: '0909638309',
    title: 'Trưởng Phòng Kinh Doanh (TPKD)',
    role: 'tpkd',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 21,
    name: 'Trần Mỹ Lin',
    username: 'lin.tm',
    email: 'lintrannumerologycoaching@gmail.com',
    phone: '0336829055',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  },
  {
    stt: 22,
    name: 'Quách Thị Mộng Ngân',
    username: 'ngan.qtm',
    email: 'hrmanagerngan@gmail.com',
    phone: '0333338075',
    title: 'Chuyên viên Kinh Doanh BĐS (NVKD)',
    role: 'sale',
    team: 'Team Vinh - MAY_MH5.19',
    status: 'active',
    tempPassword: 'CHANGE_ME_BEFORE_USE'
  }
];

// Parser for NVKD sheets: STT, Họ tên, Email, SĐT, Chức vụ / Vị trí, Team / Phòng ban
export const parseNvkdSheetRows = (
  rows: string[][],
  existingMembers: SalesMember[] = []
): ParsedNvkdMember[] => {
  if (!rows || rows.length === 0) return [];

  const existingEmailSet = new Set(
    existingMembers.map((m) => m.email.trim().toLowerCase())
  );

  // Find header row
  let headerRowIndex = -1;
  let nameCol = -1;
  let emailCol = -1;
  let phoneCol = -1;
  let titleCol = -1;
  let teamCol = -1;
  let sttCol = -1;

  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r].map((cell) => (cell || '').toString().toLowerCase().trim());
    
    // Check if row has header-like words
    const hasName = row.some((c) => /họ\s*tên|nhân\s*viên|tên\s*nvkd|nvkd|họ\s*và\s*tên|họ\s*tên\s*nvkd|sale|nhân\s*sự|name/i.test(c));
    const hasEmail = row.some((c) => /email|gmail|mail|thư\s*điện\s*tử/i.test(c));
    const hasPhone = row.some((c) => /sđt|điện\s*thoại|phone|số\s*điện\s*thoại|tel|mobile/i.test(c));

    if (hasName || (hasEmail && hasPhone)) {
      headerRowIndex = r;
      row.forEach((cell, idx) => {
        if (/stt|số\s*thứ\s*tự|no/i.test(cell) && sttCol === -1) sttCol = idx;
        else if (/họ\s*tên|nhân\s*viên|tên\s*nvkd|nvkd|họ\s*và\s*tên|họ\s*tên\s*nvkd|tên|sale|nhân\s*sự|name/i.test(cell) && nameCol === -1) nameCol = idx;
        else if (/email|gmail|mail|thư\s*điện\s*tử/i.test(cell) && emailCol === -1) emailCol = idx;
        else if (/sđt|điện\s*thoại|phone|số\s*điện\s*thoại|tel|mobile/i.test(cell) && phoneCol === -1) phoneCol = idx;
        else if (/chức\s*vụ|chức\s*danh|vị\s*trí|role|position|vai\s*trò/i.test(cell) && titleCol === -1) titleCol = idx;
        else if (/team|nhóm|phòng|đội|chi\s*nhánh/i.test(cell) && teamCol === -1) teamCol = idx;
      });
      break;
    }
  }

  // Fallback columns if header row not explicitly found
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    sttCol = 0;
    nameCol = 1;
    emailCol = 2;
    phoneCol = 3;
    titleCol = 4;
    teamCol = 5;
  }

  const results: ParsedNvkdMember[] = [];
  let currentStt = 1;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawName = nameCol >= 0 ? (row[nameCol] || '').trim() : '';
    const rawEmail = emailCol >= 0 ? (row[emailCol] || '').trim() : '';
    const rawPhone = phoneCol >= 0 ? (row[phoneCol] || '').trim() : '';
    const rawTitle = titleCol >= 0 ? (row[titleCol] || '').trim() : 'Chuyên viên BĐS';
    const rawTeam = teamCol >= 0 ? (row[teamCol] || '').trim() : 'MAY_MH5.19';

    // Must have at least name or email
    if (!rawName && !rawEmail) continue;

    // Generated clean email if missing or invalid
    let cleanEmail = rawEmail.toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const slugName = rawName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      cleanEmail = `${slugName || `sale${currentStt}`}@mayhomes.vn`;
    }

    const cleanPhone = rawPhone.replace(/[^0-9+]/g, '') || '090' + Math.floor(1000000 + Math.random() * 9000000);
    const displayName = rawName || cleanEmail.split('@')[0];
    const isAdmin = /giám\s*đốc|admin|quản\s*trị/i.test(rawTitle) || /truongbv|admin@|nhaphotrungtam/i.test(cleanEmail);
    const isTpkd = /trưởng\s*phòng|tpkd|trưởng\s*nhóm|leader|quản\s*lý/i.test(rawTitle);
    const calculatedRole: UserRole = isAdmin ? 'admin' : (isTpkd ? 'tpkd' : 'sale');

    results.push({
      stt: currentStt++,
      name: displayName,
      email: cleanEmail,
      phone: cleanPhone,
      title: rawTitle || (isTpkd ? 'Trưởng phòng kinh doanh' : 'Chuyên viên BĐS'),
      role: calculatedRole,
      team: rawTeam || 'Phòng MAY_MH5.19',
      status: 'active',
      tempPassword: NVKD_DEFAULT_PASSWORD,
      alreadyExists: existingEmailSet.has(cleanEmail)
    });
  }

  return results;
};

// Send single email via Gmail API with RFC 2822
export const sendEmailViaGmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  cc?: string | string[]
): Promise<{ id: string; threadId: string }> => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Chưa có mã ủy quyền Google. Vui lòng đăng nhập tài khoản Google có quyền Gmail trước.');
  }

  // UTF-8 encoded subject
  const encodedSubject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const emailLines: string[] = [`To: ${to}`];

  if (cc) {
    const ccStr = Array.isArray(cc) ? cc.filter(Boolean).join(', ') : cc;
    if (ccStr && ccStr.trim().length > 0) {
      emailLines.push(`Cc: ${ccStr.trim()}`);
    }
  }

  emailLines.push(
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${encodedSubject}`,
    '',
    htmlContent
  );

  const rawMessage = emailLines.join('\r\n');
  const base64Encoded = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: base64Encoded
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Lỗi gửi email qua Gmail API (${response.status})`);
  }

  return await response.json();
};

// Generate HTML email for onboarding NVKD
export const generateOnboardingEmailHtml = (
  member: ParsedNvkdMember | SalesMember,
  appUrl: string = window.location.origin
): string => {
  const loginUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
  const roleName = member.role === 'admin' 
    ? 'Quản trị viên (Admin)' 
    : member.role === 'tpkd'
      ? 'Trưởng phòng kinh doanh (TPKD)'
      : 'Chuyên viên kinh doanh BĐS (NVKD)';
  const teamName = member.team || 'Phòng MAY_MH5.19';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Thông tin tài khoản CRM SALEPRO HCM_E05</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #d97706;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">SALEPRO HCM_E05</h1>
              <div style="display: inline-block; margin-top: 6px; padding: 4px 12px; background-color: rgba(217, 119, 6, 0.2); border: 1px solid #d97706; border-radius: 20px; color: #f59e0b; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                BĐS PRO (CRM)
              </div>
              <p style="color: #94a3b8; font-size: 13px; margin: 10px 0 0 0;">Hệ thống Quản lý Khách hàng &amp; Điều phối Đội ngũ Sale Bất Động Sản</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px; color: #334155;">
              <p style="font-size: 16px; margin: 0 0 16px 0; font-weight: 600; color: #0f172a;">
                Kính gửi Anh/Chị: <span style="color: #d97706;">${member.name}</span>,
              </p>
              
              <p style="font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; color: #475569;">
                Tài khoản làm việc chuyên biệt của bạn trên hệ thống <strong>SALEPRO HCM_E05</strong> đã được khởi tạo theo danh sách nhân sự từ Google Sheet <strong>${TARGET_NVKD_SHEET_NAME}</strong>.
              </p>

              <!-- Account Info Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center;">
                      🔑 THÔNG TIN ĐĂNG NHẬP HỆ THỐNG
                    </div>
                    <table width="100%" border="0" cellspacing="0" cellpadding="6" style="font-size: 13px;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 500;">Họ và tên:</td>
                        <td width="65%" style="color: #0f172a; font-weight: 700;">${member.name}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Tài khoản đăng nhập (Email):</td>
                        <td style="color: #0f172a; font-weight: 700;">
                          <span style="background-color: #e2e8f0; padding: 3px 8px; border-radius: 6px; font-family: monospace; font-size: 13px;">${member.email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Mật khẩu mặc định:</td>
                        <td style="color: #b45309; font-weight: 800;">
                          <span style="background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 15px;">${NVKD_DEFAULT_PASSWORD}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Cách 1 (Nhanh nhất):</td>
                        <td style="color: #047857; font-weight: 700;">
                          Bấm nút <strong>"ĐĂNG NHẬP BẰNG GMAIL"</strong> trên màn hình và chọn tài khoản <strong>${member.email}</strong> để vào ngay.
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Cách 2 (Mật khẩu):</td>
                        <td style="color: #0f172a;">
                          Nhập Email và Mật khẩu mặc định <strong>${NVKD_DEFAULT_PASSWORD}</strong> vào form đăng nhập.
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Chức vụ / Vị trí:</td>
                        <td style="color: #0f172a;">${member.title || roleName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Đội nhóm (Team):</td>
                        <td style="color: #0f172a; font-weight: 600;">${teamName}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Security Alert -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.6;">
                      ⚠️ <strong>YÊU CẦU BẢO MẬT BẮT BUỘC:</strong><br/>
                      Sau khi đăng nhập lần đầu bằng mật khẩu mặc định <strong>${NVKD_DEFAULT_PASSWORD}</strong>, hệ thống sẽ tự động hiển thị cửa sổ yêu cầu <strong>TỰ ĐỔI MẬT KHẨU MỚI</strong>. Vui lòng đặt mật khẩu cá nhân có độ dài tối thiểu 6 ký tự để bảo mật danh sách khách hàng và lịch sử chăm sóc của bạn.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Action Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);">
                      👉 Đăng Nhập Hệ Thống CRM Ngay
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0 0; text-align: center;">
                Hoặc copy đường dẫn sau dán vào trình duyệt:<br/>
                <a href="${loginUrl}" style="color: #d97706; word-break: break-all;">${loginUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0;">Email thông báo tự động được gửi qua Gmail từ Quản trị viên hệ thống SALEPRO HCM_E05.</p>
              <p style="margin: 0; font-weight: 500; color: #64748b;">© 2026 SALEPRO HCM_E05 • Hệ thống Quản trị BĐS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export interface QuickDriveSyncResult {
  success: boolean;
  members?: SalesMember[];
  fileName?: string;
  message: string;
  requiresAuth?: boolean;
}

/**
 * Direct 1-click sync function for MAY_TRUONGBV_MH5.19_NVKD_V.1 from Google Drive
 */
export const syncNvkdFromDriveFile = async (
  existingMembers: SalesMember[] = []
): Promise<QuickDriveSyncResult> => {
  const token = getAccessToken();
  if (!token) {
    return {
      success: false,
      requiresAuth: true,
      message: `Chưa có quyền Google Drive. Vui lòng kết nối Google để đồng bộ file ${TARGET_NVKD_SHEET_NAME}.`
    };
  }

  try {
    const files = await searchDriveSheets(TARGET_NVKD_SHEET_NAME);
    let targetFile = files.find((f) => f.name.includes(TARGET_NVKD_SHEET_NAME));
    if (!targetFile && files.length > 0) {
      targetFile = files[0];
    }

    if (!targetFile) {
      return {
        success: false,
        message: `Không tìm thấy file "${TARGET_NVKD_SHEET_NAME}" trên Google Drive của tài khoản hiện tại.`
      };
    }

    const meta = await fetchSpreadsheetMetadata(targetFile.id);
    if (!meta.sheets || meta.sheets.length === 0) {
      return {
        success: false,
        message: `File "${targetFile.name}" không chứa trang tính nào.`
      };
    }

    const tabName = meta.sheets[0].title;
    const rawRows = await fetchSheetData(targetFile.id, tabName);
    const parsed = parseNvkdSheetRows(rawRows, existingMembers);

    if (!parsed || parsed.length === 0) {
      return {
        success: false,
        message: `Không đọc được dữ liệu nhân sự NVKD từ file "${targetFile.name}".`
      };
    }

    const colorPalette = ['bg-amber-600', 'bg-emerald-600', 'bg-rose-600', 'bg-purple-600', 'bg-teal-600', 'bg-blue-600'];

    const newMembers: SalesMember[] = parsed.map((p, idx) => {
      const existing = existingMembers.find(
        (e) => e.email.trim().toLowerCase() === p.email.trim().toLowerCase()
      );
      return {
        id: existing?.id || `sale-nvkd-drive-${p.stt || idx + 1}-${Date.now()}`,
        name: p.name,
        email: p.email,
        phone: p.phone,
        role: p.role || 'sale',
        title: p.title || 'Chuyên viên Kinh Doanh BĐS (NVKD)',
        team: p.team || 'Team Huy - MAY_MH5.19',
        status: 'active',
        password: existing?.password || p.tempPassword || NVKD_DEFAULT_PASSWORD,
        mustChangePassword: existing?.mustChangePassword ?? false,
        color: existing?.color || colorPalette[idx % colorPalette.length],
        avatar: existing?.avatar || `https://images.unsplash.com/photo-${1534528741775 + idx * 3000}-53994a69daeb?w=150&auto=format&fit=crop&q=80`
      };
    });

    return {
      success: true,
      members: newMembers,
      fileName: targetFile.name,
      message: `Đã đồng bộ thành công ${newMembers.length} nhân sự NVKD từ Google Drive (${targetFile.name})!`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi kết nối Google Drive.'
    };
  }
};

