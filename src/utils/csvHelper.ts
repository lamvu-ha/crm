import { Lead } from '../types';
import { calculateCRMIndicators } from './crmCalculations';

export function exportLeadsToCSV(leads: Lead[]): void {
  const indicators = calculateCRMIndicators(leads);
  const formattedRate = `${indicators.closeRate.toFixed(1).replace('.', ',')}%`;

  const kpiRows: [string, string | number][] = [
    ['Tổng Lead', indicators.totalLeads],
    ['Khách mới', indicators.newLeads],
    ['Tiềm năng', indicators.potentialLeads],
    ['Đã chốt', indicators.closedLeads],
    ['Tỷ lệ chốt', `"${formattedRate}"`]
  ];

  const headers = [
    'STT',
    'Ngày',
    'Họ và tên',
    'Điện thoại',
    'Tệp dữ liệu',
    'Loại sản phẩm',
    'Tình trạng',
    'Dự án',
    'Người phụ trách',
    'Ghi chú',
    '', // Empty column separator
    'Chỉ số CRM',
    'Số lượng'
  ];

  const maxRows = Math.max(leads.length, kpiRows.length);
  const rows: string[] = [headers.join(',')];

  for (let i = 0; i < maxRows; i++) {
    const lead = leads[i];
    let leadCols: string[] = [];

    if (lead) {
      const escape = (str?: string | number) => {
        if (str === undefined || str === null) return '';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      leadCols = [
        String(lead.stt || i + 1),
        escape(lead.date),
        escape(lead.fullName),
        escape(lead.phone),
        escape(lead.dataSource),
        escape(lead.productType),
        escape(lead.status),
        escape(lead.project),
        escape(lead.assignee),
        escape(lead.notes)
      ];
    } else {
      leadCols = ['', '', '', '', '', '', '', '', '', ''];
    }

    const kpi = kpiRows[i];
    const kpiCols = kpi ? [kpi[0], String(kpi[1])] : ['', ''];

    rows.push([...leadCols, '', ...kpiCols].join(','));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `CRM_Bat_Dong_San_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVToLeads(csvText: string, currentLength: number): Partial<Lead>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  // Auto-detect delimiter from the first line
  const firstLine = lines[0];
  let delimiter = ',';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const pipeCount = (firstLine.match(/\|/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  } else if (pipeCount > commaCount) {
    delimiter = '|';
  }

  const results: Partial<Lead>[] = [];

  // Helper to parse a single line with quoted cells and custom delimiter
  const parseLine = (line: string, delim: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  // Check header line
  const headerCells = parseLine(lines[0], delimiter);
  const sttIdx = headerCells.findIndex(h => h.toLowerCase().includes('stt'));
  const dateIdx = headerCells.findIndex(h => h.toLowerCase().includes('ngày') || h.toLowerCase().includes('date'));
  const nameIdx = headerCells.findIndex(h => h.toLowerCase().includes('họ và tên') || h.toLowerCase().includes('tên') || h.toLowerCase().includes('name') || h.toLowerCase().includes('khách hàng'));
  const emailIdx = headerCells.findIndex(h => /email|e-mail|gmail/i.test(h));
  const phoneIdx = headerCells.findIndex(h => h.toLowerCase().includes('thoại') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('sđt') || h.toLowerCase().includes('tel') || h.toLowerCase().includes('mobile'));
  const sourceIdx = headerCells.findIndex(h => h.toLowerCase().includes('tệp') || h.toLowerCase().includes('nguồn') || h.toLowerCase().includes('source') || h.toLowerCase().includes('kênh'));
  const productIdx = headerCells.findIndex(h => h.toLowerCase().includes('loại') || h.toLowerCase().includes('sản phẩm') || h.toLowerCase().includes('phân khúc'));
  const statusIdx = headerCells.findIndex(h => h.toLowerCase().includes('tình trạng') || h.toLowerCase().includes('trạng thái') || h.toLowerCase().includes('status'));
  const projectIdx = headerCells.findIndex(h => h.toLowerCase().includes('dự án') || h.toLowerCase().includes('project'));
  const assigneeIdx = headerCells.findIndex(h => h.toLowerCase().includes('phụ trách') || h.toLowerCase().includes('sale') || h.toLowerCase().includes('nhân viên') || h.toLowerCase().includes('assignee'));
  const budgetIdx = headerCells.findIndex(h => h.toLowerCase().includes('tài chính') || h.toLowerCase().includes('ngân sách') || h.toLowerCase().includes('giá') || h.toLowerCase().includes('budget'));
  const notesIdx = headerCells.findIndex(h => h.toLowerCase().includes('ghi chú') || h.toLowerCase().includes('nhu cầu') || h.toLowerCase().includes('note') || h.toLowerCase().includes('chi tiết'));

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i], delimiter);
    if (row.length === 0) continue;

    // Check if row has lead data
    const name = nameIdx !== -1 ? row[nameIdx] : row[0] && isNaN(Number(row[0])) ? row[0] : row[1];
    const phone = phoneIdx !== -1 ? row[phoneIdx] : row.find(val => /^[0-9\s+().-]{8,15}$/.test(val.trim())) || (row[1] && !isNaN(Number(row[1].replace(/\D/g, ''))) ? row[1] : row[2]);

    if (!name && !phone) continue;

    const lead: Partial<Lead> = {
      stt: currentLength + i,
      date: (dateIdx !== -1 && row[dateIdx]) || new Date().toISOString().split('T')[0],
      fullName: name || '',
      email: emailIdx !== -1 ? row[emailIdx] || '' : '',
      phone: phone || '',
      dataSource: (sourceIdx !== -1 && row[sourceIdx]) || 'Data nạp Database',
      productType: ((productIdx !== -1 && row[productIdx]) as any) || 'Nhà phố trung tâm',
      status: ((statusIdx !== -1 && row[statusIdx]) as any) || 'Khách mới',
      project: (projectIdx !== -1 && row[projectIdx]) || 'Nhà Phố Trung Tâm',
      assignee: (assigneeIdx !== -1 && row[assigneeIdx]) || 'Tự động phân bổ',
      budget: (budgetIdx !== -1 && row[budgetIdx]) || 'Thương lượng',
      notes: (notesIdx !== -1 && row[notesIdx]) || ''
    };

    results.push(lead);
  }

  return results;
}
