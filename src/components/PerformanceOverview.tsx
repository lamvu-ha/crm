import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Target,
  Flame,
  CheckCircle2,
  Users,
  Building2,
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  Clock,
  Compass,
  DollarSign,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Lead, SalesMember, LeadStatus, Appointment } from '../types';
import { formatCurrencyVND } from '../utils/crmCalculations';

interface PerformanceOverviewProps {
  leads: Lead[];
  salesMembers?: SalesMember[];
  currentUser?: SalesMember;
  appointments?: Appointment[];
  onNavigateToLeads?: (filter: { status?: string; project?: string; assignee?: string }) => void;
  onOpenAddLead?: () => void;
  onOpenWeeklyPdfModal?: (memberId?: string) => void;
  onOpenPersonalPerformance?: (saleName?: string) => void;
}

// Distinct semantic colors for CRM Lead Statuses
export const STATUS_COLORS: Record<string, { fill: string; border: string; bg: string; text: string }> = {
  'Khách mới': { fill: '#0284c7', border: '#bae6fd', bg: '#f0f9ff', text: '#0369a1' },
  'Đang chăm sóc': { fill: '#f59e0b', border: '#fde68a', bg: '#fffbeb', text: '#b45309' },
  'Quan tâm': { fill: '#0d9488', border: '#99f6e4', bg: '#f0fdfa', text: '#0f766e' },
  'Tiềm năng': { fill: '#6366f1', border: '#c7d2fe', bg: '#eef2ff', text: '#4338ca' },
  'Hẹn xem BĐS': { fill: '#8b5cf6', border: '#ddd6fe', bg: '#f5f3ff', text: '#6d28d9' },
  'Đàm phán / Cọc': { fill: '#ea580c', border: '#fed7aa', bg: '#fff7ed', text: '#c2410c' },
  'Đã chốt': { fill: '#10b981', border: '#a7f3d0', bg: '#ecfdf5', text: '#047857' },
  'Không nghe máy': { fill: '#eab308', border: '#fef08a', bg: '#fefce8', text: '#a16207' },
  'Gọi lại sau': { fill: '#3b82f6', border: '#bfdbfe', bg: '#eff6ff', text: '#1d4ed8' },
  'Máy bận': { fill: '#f43f5e', border: '#fecdd3', bg: '#fff1f2', text: '#be123c' },
  'Thuê bao': { fill: '#71717a', border: '#e4e4e7', bg: '#fafafa', text: '#52525b' },
  'Gửi thông tin': { fill: '#a855f7', border: '#e9d5ff', bg: '#faf5ff', text: '#7e22ce' },
  'Không nhu cầu': { fill: '#64748b', border: '#cbd5e1', bg: '#f8fafc', text: '#334155' },
  'Nhầm số': { fill: '#78716c', border: '#d6d3d1', bg: '#fafaf9', text: '#44403c' },
  'Khác': { fill: '#94a3b8', border: '#e2e8f0', bg: '#f8fafc', text: '#475569' }
};

export const DEFAULT_STATUS_COLOR = {
  fill: '#64748b',
  border: '#cbd5e1',
  bg: '#f8fafc',
  text: '#334155'
};

export const PerformanceOverview: React.FC<PerformanceOverviewProps> = ({
  leads,
  salesMembers = [],
  currentUser,
  appointments = [],
  onNavigateToLeads,
  onOpenAddLead,
  onOpenWeeklyPdfModal,
  onOpenPersonalPerformance
}) => {
  // Filters state
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [statusGroupingMode, setStatusGroupingMode] = useState<'main_stages' | 'all_statuses'>('main_stages');
  const [acquisitionTimeframe, setAcquisitionTimeframe] = useState<'monthly' | 'weekly' | 'daily'>('monthly');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Extract unique projects and assignees for dropdown filters
  const projectList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.project && l.project.trim()) set.add(l.project.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  const assigneeList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.assignee && l.assignee.trim()) set.add(l.assignee.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Filter leads based on selected criteria
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (selectedProject !== 'all' && lead.project !== selectedProject) return false;
      if (selectedAssignee !== 'all' && lead.assignee !== selectedAssignee) return false;
      return true;
    });
  }, [leads, selectedProject, selectedAssignee]);

  // 1. High-level KPI Calculations
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    let closedCount = 0;
    let inCareCount = 0;
    let potentialCount = 0;
    let viewingOrNegotiatingCount = 0;
    let totalDealValue = 0;

    filteredLeads.forEach((lead) => {
      if (lead.dealValue && !isNaN(lead.dealValue)) {
        totalDealValue += Number(lead.dealValue);
      }
      const st = lead.status;
      if (st === 'Đã chốt') closedCount++;
      else if (st === 'Tiềm năng' || st === 'Quan tâm') potentialCount++;
      else if (st === 'Hẹn xem BĐS' || st === 'Đàm phán / Cọc') viewingOrNegotiatingCount++;
      else if (st === 'Đang chăm sóc' || st === 'Khách mới' || st === 'Gọi lại sau' || st === 'Gửi thông tin') {
        inCareCount++;
      }
    });

    const activePipelineCount = inCareCount + potentialCount + viewingOrNegotiatingCount;
    const closeRate = total > 0 ? (closedCount / total) * 100 : 0;
    const qualifiedRate = total > 0 ? ((potentialCount + viewingOrNegotiatingCount + closedCount) / total) * 100 : 0;

    return {
      total,
      closedCount,
      closeRate,
      activePipelineCount,
      potentialCount,
      viewingOrNegotiatingCount,
      qualifiedRate,
      totalDealValue
    };
  }, [filteredLeads]);

  // 2. Status Distribution Data Preparation
  const statusChartData = useMemo(() => {
    const countMap: Record<string, { count: number; dealValue: number }> = {};

    if (statusGroupingMode === 'main_stages') {
      // Group into core business lifecycle stages
      const stages = [
        'Khách mới',
        'Đang chăm sóc',
        'Quan tâm',
        'Tiềm năng',
        'Hẹn xem BĐS',
        'Đàm phán / Cọc',
        'Đã chốt',
        'Không nhu cầu',
        'Khác / Chưa liên lạc được'
      ];
      stages.forEach((s) => {
        countMap[s] = { count: 0, dealValue: 0 };
      });

      filteredLeads.forEach((lead) => {
        const rawStatus = (lead.status || '').trim();
        const dv = Number(lead.dealValue) || 0;

        if (countMap[rawStatus]) {
          countMap[rawStatus].count += 1;
          countMap[rawStatus].dealValue += dv;
        } else if (
          rawStatus === 'Không nghe máy' ||
          rawStatus === 'Máy bận' ||
          rawStatus === 'Thuê bao' ||
          rawStatus === 'Gọi lại sau' ||
          rawStatus === 'Gửi thông tin' ||
          rawStatus === 'Nhầm số' ||
          rawStatus === 'Khác' ||
          !rawStatus
        ) {
          countMap['Khác / Chưa liên lạc được'].count += 1;
          countMap['Khác / Chưa liên lạc được'].dealValue += dv;
        } else {
          if (!countMap[rawStatus]) countMap[rawStatus] = { count: 0, dealValue: 0 };
          countMap[rawStatus].count += 1;
          countMap[rawStatus].dealValue += dv;
        }
      });
    } else {
      // All individual statuses
      filteredLeads.forEach((lead) => {
        const st = (lead.status || '').trim() || 'Chưa phân loại';
        const dv = Number(lead.dealValue) || 0;
        if (!countMap[st]) countMap[st] = { count: 0, dealValue: 0 };
        countMap[st].count += 1;
        countMap[st].dealValue += dv;
      });
    }

    const total = filteredLeads.length;
    return Object.entries(countMap)
      .map(([name, val]) => {
        const colorMeta = STATUS_COLORS[name] || DEFAULT_STATUS_COLOR;
        const percentage = total > 0 ? (val.count / total) * 100 : 0;
        return {
          name,
          count: val.count,
          percentage: Number(percentage.toFixed(1)),
          dealValue: val.dealValue,
          fill: colorMeta.fill,
          border: colorMeta.border,
          bg: colorMeta.bg,
          text: colorMeta.text
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredLeads, statusGroupingMode]);

  // 3. Acquisition Volume Data Preparation (Monthly / Weekly / Daily)
  const acquisitionChartData = useMemo(() => {
    if (filteredLeads.length === 0) return [];

    if (acquisitionTimeframe === 'monthly') {
      const monthBuckets: Record<string, { total: number; closed: number; potential: number; newLeads: number }> = {};

      filteredLeads.forEach((lead) => {
        const rawDate = lead.createdAt || lead.date;
        let monthKey = 'Không xác định';

        if (rawDate) {
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              monthKey = `${y}-${m}`;
            } else if (typeof rawDate === 'string' && rawDate.length >= 7) {
              monthKey = rawDate.substring(0, 7);
            }
          } catch {
            monthKey = 'Khác';
          }
        }

        if (!monthBuckets[monthKey]) {
          monthBuckets[monthKey] = { total: 0, closed: 0, potential: 0, newLeads: 0 };
        }
        monthBuckets[monthKey].total += 1;
        if (lead.status === 'Đã chốt') monthBuckets[monthKey].closed += 1;
        if (lead.status === 'Tiềm năng' || lead.status === 'Quan tâm') monthBuckets[monthKey].potential += 1;
        if (lead.status === 'Khách mới') monthBuckets[monthKey].newLeads += 1;
      });

      // Sort chronological
      let sortedKeys = Object.keys(monthBuckets).sort();

      // If data only exists in 1 single month (e.g. newly imported campaign 2026-09),
      // provide context of recent preceding months (baseline) so managers can observe trajectory
      if (sortedKeys.length === 1 && sortedKeys[0] !== 'Không xác định') {
        const curr = sortedKeys[0];
        const [currY, currM] = curr.split('-').map(Number);
        const extendedKeys: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(currY, currM - 1 - i, 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          extendedKeys.push(`${y}-${m}`);
        }
        sortedKeys = extendedKeys;
      }

      let prevTotal = 0;
      return sortedKeys.map((key) => {
        const bucket = monthBuckets[key] || { total: 0, closed: 0, potential: 0, newLeads: 0 };
        const parts = key.split('-');
        const label = parts.length === 2 ? `T${parts[1]}/${parts[0].slice(2)}` : key;
        const fullLabel = parts.length === 2 ? `Tháng ${parts[1]}/${parts[0]}` : key;
        const conversionRate = bucket.total > 0 ? (bucket.closed / bucket.total) * 100 : 0;
        const momGrowth = prevTotal > 0 ? ((bucket.total - prevTotal) / prevTotal) * 100 : 0;
        prevTotal = bucket.total;

        return {
          key,
          label,
          fullLabel,
          total: bucket.total,
          potential: bucket.potential,
          closed: bucket.closed,
          newLeads: bucket.newLeads,
          conversionRate: Number(conversionRate.toFixed(1)),
          momGrowth: Number(momGrowth.toFixed(1))
        };
      });
    }

    if (acquisitionTimeframe === 'weekly') {
      // Group by Week (4 recent weeks)
      const weekBuckets: Record<string, { total: number; closed: number; potential: number; newLeads: number }> = {};
      const now = new Date();

      // Setup 4 week labels
      for (let i = 3; i >= 0; i--) {
        const startDay = new Date(now);
        startDay.setDate(now.getDate() - i * 7);
        const wLabel = `Tuần W-${i === 0 ? 'Hiện tại' : i}`;
        weekBuckets[wLabel] = { total: 0, closed: 0, potential: 0, newLeads: 0 };
      }

      filteredLeads.forEach((lead, idx) => {
        const rawDate = lead.createdAt || lead.date;
        let assignedWeek = 'Tuần W-Hiện tại';

        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) assignedWeek = 'Tuần W-Hiện tại';
            else if (diffDays <= 14) assignedWeek = 'Tuần W-1';
            else if (diffDays <= 21) assignedWeek = 'Tuần W-2';
            else assignedWeek = 'Tuần W-3';
          }
        } else {
          assignedWeek = `Tuần W-${idx % 4}`;
        }

        if (!weekBuckets[assignedWeek]) {
          weekBuckets[assignedWeek] = { total: 0, closed: 0, potential: 0, newLeads: 0 };
        }
        weekBuckets[assignedWeek].total += 1;
        if (lead.status === 'Đã chốt') weekBuckets[assignedWeek].closed += 1;
        if (lead.status === 'Tiềm năng' || lead.status === 'Quan tâm') weekBuckets[assignedWeek].potential += 1;
        if (lead.status === 'Khách mới') weekBuckets[assignedWeek].newLeads += 1;
      });

      return Object.entries(weekBuckets).map(([label, bucket]) => ({
        key: label,
        label,
        fullLabel: label,
        total: bucket.total,
        potential: bucket.potential,
        closed: bucket.closed,
        newLeads: bucket.newLeads,
        conversionRate: bucket.total > 0 ? Number(((bucket.closed / bucket.total) * 100).toFixed(1)) : 0,
        momGrowth: 0
      }));
    }

    // Daily breakdown for the last 10 days
    const dailyMap: Record<string, { total: number; closed: number; potential: number }> = {};
    filteredLeads.forEach((lead) => {
      const rawDate = lead.date || (lead.createdAt ? lead.createdAt.substring(0, 10) : '2026-09-24');
      const dayKey = rawDate.length >= 10 ? rawDate.substring(5, 10) : rawDate; // MM-DD
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { total: 0, closed: 0, potential: 0 };
      dailyMap[dayKey].total += 1;
      if (lead.status === 'Đã chốt') dailyMap[dayKey].closed += 1;
      if (lead.status === 'Tiềm năng' || lead.status === 'Quan tâm') dailyMap[dayKey].potential += 1;
    });

    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([key, bucket]) => {
        const parts = key.split('-');
        const label = parts.length === 2 ? `${parts[1]}/${parts[0]}` : key;
        return {
          key,
          label,
          fullLabel: `Ngày ${label}`,
          total: bucket.total,
          potential: bucket.potential,
          closed: bucket.closed,
          conversionRate: bucket.total > 0 ? Number(((bucket.closed / bucket.total) * 100).toFixed(1)) : 0,
          momGrowth: 0
        };
      });
  }, [filteredLeads, acquisitionTimeframe]);

  // Managerial takeaway insights
  const executiveInsights = useMemo(() => {
    const total = filteredLeads.length;
    if (total === 0) return [];

    const insights: { icon: any; title: string; desc: string; type: 'success' | 'warning' | 'info' }[] = [];

    // Dominant status
    if (statusChartData.length > 0) {
      const topStatus = statusChartData[0];
      insights.push({
        icon: Compass,
        title: `Trạng thái chiếm tỷ trọng cao nhất: ${topStatus.name}`,
        desc: `Có ${topStatus.count} lead (${topStatus.percentage}%), cho thấy khách hàng phần lớn đang ở giai đoạn này.`,
        type: 'info'
      });
    }

    // High potential proportion
    if (kpis.qualifiedRate >= 25) {
      insights.push({
        icon: Flame,
        title: `Tỷ lệ khách hàng chất lượng đạt ${kpis.qualifiedRate.toFixed(1)}%`,
        desc: `Tổng cộng ${kpis.potentialCount + kpis.viewingOrNegotiatingCount + kpis.closedCount} khách có nhu cầu cao hoặc đã chốt. Lực đẩy bán hàng tốt.`,
        type: 'success'
      });
    } else {
      insights.push({
        icon: AlertCircle,
        title: `Cần đẩy mạnh lọc khách & chốt lịch xem nhà thực tế`,
        desc: `Tỷ lệ khách tiềm năng hiện tại là ${kpis.qualifiedRate.toFixed(1)}%. Cần đôn đốc sale gọi lại và chăm sóc nhóm "Quan tâm" & "Đang chăm sóc".`,
        type: 'warning'
      });
    }

    // Acquisition velocity
    const activeMonths = acquisitionChartData.filter((d) => d.total > 0);
    if (activeMonths.length > 0) {
      const peakMonth = [...activeMonths].sort((a, b) => b.total - a.total)[0];
      insights.push({
        icon: TrendingUp,
        title: `Đỉnh điểm thu hút: ${peakMonth.fullLabel} (${peakMonth.total} Lead)`,
        desc: `Sản lượng đạt đỉnh nhờ các chiến dịch tiếp thị và đồng bộ phân bổ tự động.`,
        type: 'info'
      });
    }

    return insights;
  }, [filteredLeads, statusChartData, kpis, acquisitionChartData]);

  return (
    <div className="space-y-6">
      {/* 1. Executive Header & Quick Filters */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20 shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Tổng Quan Hiệu Suất (Performance Overview)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                  Recharts Dashboard
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Báo cáo cấp quản lý: Trực quan hóa phân bổ Lead theo trạng thái &amp; sản lượng tiếp nhận hàng tháng
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {onOpenWeeklyPdfModal && (
              <button
                type="button"
                onClick={() => onOpenWeeklyPdfModal(selectedAssignee !== 'all' ? salesMembers.find(s => s.name === selectedAssignee)?.id : undefined)}
                className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
                title="Xuất báo cáo PDF hoạt động tuần (Cuộc gọi, lịch hẹn, kết quả kinh doanh) nộp cấp trên"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Báo cáo PDF tuần</span>
              </button>
            )}
            {onOpenAddLead && (
              <button
                type="button"
                onClick={onOpenAddLead}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5"
              >
                <span>+ Thêm Lead</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedProject('all');
                setSelectedAssignee('all');
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
              title="Đặt lại bộ lọc về mặc định"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          </div>
        </div>

        {/* Manager Filter Strip */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 flex items-center">
              <Filter className="w-3.5 h-3.5 mr-1 text-amber-600" />
              Bộ lọc quản lý:
            </span>

            {/* Project Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="overview-project-filter"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="bg-transparent border-none text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all">Tất cả dự án ({projectList.length})</option>
                {projectList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee / Sales Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                id="overview-assignee-filter"
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="bg-transparent border-none text-slate-800 font-semibold focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all">Tất cả nhân sự / sale ({assigneeList.length})</option>
                {assigneeList.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Pie Chart Trigger for Selected Sale or Current User */}
            {onOpenPersonalPerformance && (
              <button
                type="button"
                onClick={() => onOpenPersonalPerformance(selectedAssignee !== 'all' ? selectedAssignee : currentUser?.name)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Mở biểu đồ hình tròn Recharts hiển thị tỷ lệ chuyển đổi từ Lead sang Hẹn xem"
              >
                <PieIcon className="w-3.5 h-3.5 text-violet-600" />
                <span>
                  {selectedAssignee !== 'all'
                    ? `Pie Chuyển Đổi: ${selectedAssignee}`
                    : 'Tỷ lệ Hẹn xem cá nhân (Pie)'}
                </span>
              </button>
            )}
          </div>

          <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            Hiển thị <span className="text-amber-700 font-extrabold">{filteredLeads.length}</span> / {leads.length} khách hàng
          </div>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Leads Acquired */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
            <span className="truncate">Tổng Lead tiếp nhận</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {kpis.total.toLocaleString('vi-VN')}
          </div>
          <div className="flex items-center space-x-1 text-[11px] font-semibold text-emerald-600 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Phân bổ tự động 100%</span>
          </div>
        </div>

        {/* KPI 2: Active Pipeline Volume */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-sky-400 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
            <span className="truncate">Khách đang chăm sóc</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">
            {kpis.activePipelineCount.toLocaleString('vi-VN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {kpis.total > 0 ? ((kpis.activePipelineCount / kpis.total) * 100).toFixed(1) : 0}% dung lượng phễu
          </p>
        </div>

        {/* KPI 3: Qualified Prospects */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
            <span className="truncate">Tiềm năng &amp; Lịch xem</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
            {(kpis.potentialCount + kpis.viewingOrNegotiatingCount).toLocaleString('vi-VN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {kpis.qualifiedRate.toFixed(1)}% tỷ lệ khách nét
          </p>
        </div>

        {/* KPI 4: Deals Closed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1.5">
            <span className="truncate">Hợp đồng đã chốt</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {kpis.closedCount}
            </span>
            <span className="text-xs font-bold text-slate-500">
              ({kpis.closeRate.toFixed(1).replace('.', ',')}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {kpis.totalDealValue > 0 ? `Giá trị: ${formatCurrencyVND(kpis.totalDealValue)}` : 'Giao dịch thành công'}
          </p>
        </div>
      </div>

      {/* 3. CHART SECTION 1: Distribution of Leads by Status (Recharts Donut + Horizontal Bars) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center">
              <PieIcon className="w-5 h-5 mr-2 text-amber-600" />
              <span>Phân bổ khách hàng theo trạng thái (Status Distribution)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cơ cấu tỷ lệ phần trăm và số lượng khách hàng theo các giai đoạn chăm sóc trong CRM
            </p>
          </div>

          {/* Grouping switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setStatusGroupingMode('main_stages')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusGroupingMode === 'main_stages'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Giai đoạn chính
            </button>
            <button
              type="button"
              onClick={() => setStatusGroupingMode('all_statuses')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusGroupingMode === 'all_statuses'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả trạng thái
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Recharts Donut Pie Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[300px]">
            {statusChartData.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không có dữ liệu trạng thái phù hợp.
              </div>
            ) : (
              <>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={108}
                        paddingAngle={3}
                        animationDuration={800}
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={entry.fill}
                            stroke={activePieIndex === index ? '#1e293b' : '#ffffff'}
                            strokeWidth={activePieIndex === index ? 3 : 2}
                            className="cursor-pointer transition-all duration-300"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[160px]">
                                <div className="flex items-center space-x-2 font-bold mb-1">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.fill }}
                                  />
                                  <span>{data.name}</span>
                                </div>
                                <div className="text-slate-300 text-[11px] space-y-0.5 mt-1 border-t border-slate-800 pt-1">
                                  <div className="flex justify-between">
                                    <span>Số lượng:</span>
                                    <span className="font-extrabold text-white">{data.count} lead</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Tỷ trọng:</span>
                                    <span className="font-extrabold text-amber-400">{data.percentage}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Tổng Lead
                  </span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {kpis.total}
                  </span>
                  <span className="text-[10px] text-amber-600 font-extrabold">
                    {statusChartData.length} trạng thái
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Right: Recharts Bar Chart Breakdown & Actionable List */}
          <div className="lg:col-span-7 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Bảng Thống Kê Chi Tiết Số Lượng &amp; Tỷ Trọng</span>
              <span className="text-[11px] text-slate-400 font-normal">Bấm vào trạng thái để xem danh sách khách</span>
            </h4>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {statusChartData.map((item) => (
                <div
                  key={item.name}
                  onClick={() => onNavigateToLeads?.({ status: item.name })}
                  className="p-2.5 bg-slate-50 hover:bg-amber-50/60 rounded-xl border border-slate-200/80 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                  title={`Nhấp để lọc danh sách khách hàng mang trạng thái "${item.name}"`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.fill }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800 transition-colors">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Visual mini-bar */}
                    <div className="w-20 sm:w-28 bg-slate-200 rounded-full h-2 overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.fill
                        }}
                      />
                    </div>

                    <div className="text-right min-w-[75px]">
                      <span className="text-xs font-black text-slate-900 block leading-tight">
                        {item.count} khách
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 block leading-tight">
                        {item.percentage}%
                      </span>
                    </div>

                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. CHART SECTION 2: Monthly Acquisition Volume (Recharts Composed Area/Bar/Line Chart) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
              <span>Sản Lượng Tiếp Nhận Lead Theo Thời Gian (Acquisition Volume)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi nhịp độ thu hút khách hàng mới, lead nét và tỷ lệ chốt deal qua từng tháng
            </p>
          </div>

          {/* Timeframe switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setAcquisitionTimeframe('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                acquisitionTimeframe === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo tháng
            </button>
            <button
              type="button"
              onClick={() => setAcquisitionTimeframe('weekly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                acquisitionTimeframe === 'weekly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo tuần
            </button>
            <button
              type="button"
              onClick={() => setAcquisitionTimeframe('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                acquisitionTimeframe === 'daily'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 ngày gần nhất
            </button>
          </div>
        </div>

        {/* Recharts Composed Chart */}
        <div className="w-full h-80 pt-2">
          {acquisitionChartData.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-xs">
              Chưa có dữ liệu thời gian cho bộ lọc này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={acquisitionChartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorAcquisitionVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorPotentialBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  allowDecimals={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  tick={{ fontSize: 11, fill: '#10b981' }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl text-xs border border-slate-700 min-w-[200px]">
                          <div className="font-extrabold text-amber-400 mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                            <span>{data.fullLabel}</span>
                            {data.momGrowth !== 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                                  data.momGrowth > 0
                                    ? 'bg-emerald-950 text-emerald-300'
                                    : 'bg-rose-950 text-rose-300'
                                }`}
                              >
                                {data.momGrowth > 0 ? `+${data.momGrowth}%` : `${data.momGrowth}%`}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 text-slate-300 text-[11px]">
                            <div className="flex justify-between items-center">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                                Tổng Lead tiếp nhận:
                              </span>
                              <span className="font-black text-white">{data.total}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 mr-1.5"></span>
                                Lead nét / Tiềm năng:
                              </span>
                              <span className="font-bold text-indigo-300">{data.potential}</span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="flex items-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                                Hợp đồng đã chốt:
                              </span>
                              <span className="font-bold text-emerald-400">{data.closed}</span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-slate-800 font-bold text-white">
                              <span>Tỷ lệ chốt:</span>
                              <span className="text-emerald-400">{data.conversionRate}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: 15, fontSize: 11 }}
                />

                {/* Primary Area: Total Volume */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  name="Tổng Lead tiếp nhận"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorAcquisitionVolume)"
                />

                {/* Secondary Bar: Qualified Leads */}
                <Bar
                  yAxisId="left"
                  dataKey="potential"
                  name="Lead nét / Tiềm năng"
                  fill="url(#colorPotentialBar)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />

                {/* Tertiary Line: Conversion Rate */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversionRate"
                  name="Tỷ lệ chốt (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 1.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly Summary Cards strip */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center">
          {acquisitionChartData.slice(-6).map((item) => (
            <div
              key={item.key}
              className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 hover:bg-amber-50/50 transition-colors"
            >
              <span className="text-[10px] font-bold text-slate-500 block truncate">
                {item.label}
              </span>
              <span className="text-sm font-black text-slate-800 block mt-0.5">
                {item.total} Lead
              </span>
              <span className="text-[9px] font-extrabold text-emerald-600 block mt-0.5">
                Chốt: {item.closed}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Executive Insights & Management Takeaways */}
      {executiveInsights.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-indigo-800/40 shadow-md space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white">
                Góc nhìn quản trị &amp; khuyến nghị hành động (Executive Insights)
              </h4>
              <p className="text-xs text-indigo-200">
                Phân tích tự động từ phân bổ trạng thái và tốc độ tiếp nhận lead hiện hành
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {executiveInsights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/5 hover:bg-white/10 p-3.5 rounded-2xl border border-white/10 backdrop-blur-xs transition-colors"
                >
                  <div className="flex items-center space-x-2 mb-1.5">
                    <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-xs text-amber-300 truncate">
                      {insight.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                    {insight.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
