
type User = any;
import { Lead, GoogleDriveFile, GoogleSheetTabInfo, LeadStatus, ProductType, SalesMember, ParsedNvkdMember, UserRole } from '../types';

// Initialize Firebase App singleton
const app: any = null;
export const auth: any = null;

// Provider with required Google Workspace scopes (Used by Admin for Drive & Gmail sending)
const provider: any = null;





// Clean Google Auth provider for employee sign-in (NO restricted scopes - allows ANY Gmail instantly)
const basicGoogleProvider: any = null;


// Cache the access token in memory (never localStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Sign in with Gmail for employees (fast, zero scope warnings, 1-click account selector)
export const signInWithGmail = async (): Promise<any> => { throw new Error("Google đã tắt trong bản demo."); };

// Auth state listener
export const initGoogleAuth = (...args: any[]) => () => {};

// Sign in with Google (Firebase Auth popup with Workspace scopes)
export const signInWithGoogle = async (): Promise<any> => { throw new Error("Google đã tắt trong bản demo."); };

export const getAccessToken = (): string | null => null;

export const setAccessTokenInMemory = (token: string | null) => {};

export const signOutGoogle = async () => {};

// Target Google Sheet file names
export const TARGET_CRM_SHEET_NAME = 'MAY_TRUONGBV_MH5.19_CRM_V.1';
export const TARGET_NVKD_SHEET_NAME = 'MAY_TRUONGBV_MH5.19_NVKD_V.1';

// Search Google Drive for Spreadsheet files, prioritizing "MAY_TRUONGBV_MH5.19_CRM_V.1"
export const searchDriveSheets = async (...args: any[]): Promise<any> => { throw new Error("Kết nối ngoài đã tắt trong bản demo."); };

// Fetch spreadsheet info (sheet tabs)
export const fetchSpreadsheetMetadata = async (...args: any[]): Promise<any> => { throw new Error("Kết nối ngoài đã tắt trong bản demo."); };

// Fetch rows values from a specific sheet range
export const fetchSheetData = async (...args: any[]): Promise<any> => { throw new Error("Kết nối ngoài đã tắt trong bản demo."); };

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
    return 'Chuyên viên 01';
  }
  if (lower.includes('bích chi') || lower.includes('phan bích chi') || lower.includes('chi')) {
    return 'Quản trị thử nghiệm';
  }
  if (lower.includes('nhật quang') || lower.includes('hoàng nhật quang') || lower.includes('quang')) {
    return 'Quản trị thử nghiệm';
  }
  if (lower.includes('thế vinh') || lower.includes('trần phạm thế vinh') || lower.includes('vinh')) {
    return 'Chuyên viên 02';
  }
  if (lower.includes('minh phúc') || lower.includes('trần minh phúc') || lower.includes('phúc')) {
    return 'Trưởng nhóm thử nghiệm';
  }
  if (lower.includes('phát huy') || lower.includes('huỳnh phát huy')) {
    return 'Chuyên viên 02';
  }
  if (lower.includes('văn khoa') || lower.includes('lê văn khoa') || lower.includes('khoa')) {
    return 'Chuyên viên 01';
  }
  if (lower.includes('ngọc vũ') || lower.includes('võ ngọc vũ') || lower.includes('vũ')) {
    return 'Chuyên viên 02';
  }
  if (lower.includes('ninh') || lower.includes('nguyễn ninh')) {
    return 'Trưởng nhóm thử nghiệm';
  }
  if (lower.includes('thanh mai') || lower.includes('lê thị thanh mai') || lower.includes('mai')) {
    return 'Chuyên viên 02';
  }
  if (lower.includes('văn phụng') || lower.includes('đỗ văn phụng') || lower.includes('phụng')) {
    return 'Quản trị thử nghiệm';
  }
  if (lower.includes('nhật duy') || lower.includes('trần nhật duy') || lower.includes('duy')) {
    return 'Trưởng nhóm thử nghiệm';
  }
  if (lower.includes('thành vương') || lower.includes('châu thành vương') || lower.includes('vương')) {
    return 'Chuyên viên 01';
  }
  if (lower.includes('mỹ lin') || lower.includes('trần mỹ lin') || lower.includes('lin')) {
    return 'Quản trị thử nghiệm';
  }
  if (lower.includes('mộng ngân') || lower.includes('quách thị mộng ngân') || lower.includes('ngân')) {
    return 'Trưởng nhóm thử nghiệm';
  }
  if (lower.includes('thắng') || lower.includes('huỳnh văn thắng')) {
    return 'Chuyên viên 01';
  }
  if (lower.includes('đức huy') || lower.includes('nguyễn đức huy')) {
    return 'Trưởng nhóm thử nghiệm';
  }
  if (lower.includes('thuận hiếu') || lower.includes('đinh thị thuận hiếu') || lower.includes('hiếu')) {
    return 'Chuyên viên 02';
  }
  if (lower.includes('trường') || lower.includes('văn trường') || lower.includes('bùi văn trường') || lower.includes('truongbv')) {
    return 'Chuyên viên 01';
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
export const SAMPLE_MAY_MH5_SHEET_LEADS: Lead[] = [{"id":"sandbox-customer-1","stt":1,"date":"2026-10-03","fullName":"Khách thử nghiệm 01","phone":"0000010000","email":"customer1@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Khách mới","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.763Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-2","stt":2,"date":"2026-10-03","fullName":"Khách thử nghiệm 02","phone":"0000010001","email":"customer2@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đang chăm sóc","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-3","stt":3,"date":"2026-10-03","fullName":"Khách thử nghiệm 03","phone":"0000010002","email":"customer3@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Quan tâm","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-4","stt":4,"date":"2026-10-03","fullName":"Khách thử nghiệm 04","phone":"0000010003","email":"customer4@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Hẹn xem BĐS","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-5","stt":5,"date":"2026-10-03","fullName":"Khách thử nghiệm 05","phone":"0000010004","email":"customer5@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đàm phán / Cọc","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-6","stt":6,"date":"2026-10-03","fullName":"Khách thử nghiệm 06","phone":"0000010005","email":"customer6@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đã chốt","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-7","stt":7,"date":"2026-10-03","fullName":"Khách thử nghiệm 07","phone":"0000010006","email":"customer7@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Khách mới","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-8","stt":8,"date":"2026-10-03","fullName":"Khách thử nghiệm 08","phone":"0000010007","email":"customer8@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đang chăm sóc","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-9","stt":9,"date":"2026-10-03","fullName":"Khách thử nghiệm 09","phone":"0000010008","email":"customer9@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Quan tâm","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-10","stt":10,"date":"2026-10-03","fullName":"Khách thử nghiệm 10","phone":"0000010009","email":"customer10@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Hẹn xem BĐS","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-11","stt":11,"date":"2026-10-03","fullName":"Khách thử nghiệm 11","phone":"0000010010","email":"customer11@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đàm phán / Cọc","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-12","stt":12,"date":"2026-10-03","fullName":"Khách thử nghiệm 12","phone":"0000010011","email":"customer12@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đã chốt","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-13","stt":13,"date":"2026-10-03","fullName":"Khách thử nghiệm 13","phone":"0000010012","email":"customer13@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Khách mới","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-14","stt":14,"date":"2026-10-03","fullName":"Khách thử nghiệm 14","phone":"0000010013","email":"customer14@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đang chăm sóc","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-15","stt":15,"date":"2026-10-03","fullName":"Khách thử nghiệm 15","phone":"0000010014","email":"customer15@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Quan tâm","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-16","stt":16,"date":"2026-10-03","fullName":"Khách thử nghiệm 16","phone":"0000010015","email":"customer16@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Hẹn xem BĐS","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-17","stt":17,"date":"2026-10-03","fullName":"Khách thử nghiệm 17","phone":"0000010016","email":"customer17@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đàm phán / Cọc","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-18","stt":18,"date":"2026-10-03","fullName":"Khách thử nghiệm 18","phone":"0000010017","email":"customer18@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đã chốt","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-19","stt":19,"date":"2026-10-03","fullName":"Khách thử nghiệm 19","phone":"0000010018","email":"customer19@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Khách mới","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-20","stt":20,"date":"2026-10-03","fullName":"Khách thử nghiệm 20","phone":"0000010019","email":"customer20@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đang chăm sóc","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-21","stt":21,"date":"2026-10-03","fullName":"Khách thử nghiệm 21","phone":"0000010020","email":"customer21@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Quan tâm","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-22","stt":22,"date":"2026-10-03","fullName":"Khách thử nghiệm 22","phone":"0000010021","email":"customer22@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Hẹn xem BĐS","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-23","stt":23,"date":"2026-10-03","fullName":"Khách thử nghiệm 23","phone":"0000010022","email":"customer23@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đàm phán / Cọc","assignee":"Chuyên viên 01","assignedToId":"sandbox-user-2","assigneeEmail":"sale01@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000},{"id":"sandbox-customer-24","stt":24,"date":"2026-10-03","fullName":"Khách thử nghiệm 24","phone":"0000010023","email":"customer24@sandbox.invalid","dataSource":"Kênh thử nghiệm","productType":"Căn hộ chung cư","project":"Dự án thử nghiệm","status":"Đã chốt","assignee":"Chuyên viên 02","assignedToId":"sandbox-user-3","assigneeEmail":"sale02@sandbox.invalid","notes":"Dữ liệu giả lập; không liên hệ số điện thoại này.","history":[],"createdAt":"2026-10-03T05:14:06.764Z","updatedAt":"2026-10-03T05:14:06.764Z","budget":"2 - 4 tỷ","dealValue":2000}];

// ==========================================
// NVKD SHEET (MAY_TRUONGBV_MH5.19_NVKD_V.1) & GMAIL INTEGRATION
// ==========================================

export const NVKD_DEFAULT_PASSWORD = 'CHANGE_ME_BEFORE_USE';

// Sample fallback data for MAY_TRUONGBV_MH5.19_NVKD_V.1 with custom usernames and secure individual passwords
export const SAMPLE_NVKD_SHEET_MEMBERS: ParsedNvkdMember[] = [];

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
export const sendEmailViaGmail = async (...args: any[]): Promise<any> => { throw new Error("Kết nối ngoài đã tắt trong bản demo."); };

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
export const syncNvkdFromDriveFile = async (...args: any[]): Promise<any> => { throw new Error("Kết nối ngoài đã tắt trong bản demo."); };

