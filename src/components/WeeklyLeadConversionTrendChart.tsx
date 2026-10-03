import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Dot
} from 'recharts';
import {
  TrendingUp,
  Award,
  Calendar,
  Filter,
  CheckCircle2,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
  Layers,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  Target,
  RefreshCw
} from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { getLeadCreationDate, getLeadUpdateDate, parseLeadDate } from '../utils/dateFilterUtils';

interface WeeklyLeadConversionTrendChartProps {
  leads: Lead[];
  salesMembers?: SalesMember[];
  title?: string;
  subtitle?: string;
  onNavigateToLeads?: (filter: { status?: string; project?: string; assignee?: string }) => void;
}

export type TimeWindowWeeks = 6 | 8 | 12 | 16 | 24;
export type ConversionCriterion = 'closed_only' | 'qualified_and_closed';

export interface WeekDataPoint {
  key: string;            // e.g. "2026-W38"
  weekNumber: number;     // e.g. 38
  year: number;           // e.g. 2026
  label: string;          // e.g. "T38 (14/09-20/09)"
  fullRange: string;      // e.g. "14/09/2026 - 20/09/2026"
  startDate: Date;
  endDate: Date;
  newLeads: number;       // Total new leads acquired in this week
  convertedLeads: number; // Total leads converted in this week
  conversionRate: number; // (convertedLeads / newLeads) * 100 or 0
  topProject: string;     // Most active project this week
  topSale: string;        // Best performing sales rep this week
  isPeakWeek: boolean;    // Highest conversion performance flag
}

/**
 * Calculates start (Monday 00:00:00) and end (Sunday 23:59:59) for an ISO week
 */
function getWeekRange(date: Date): { start: Date; end: Date; weekNumber: number; year: number; key: string; label: string; fullRange: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO Week Number calculation
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  const year = monday.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');
  const label = `T${weekNumber} (${pad(monday.getDate())}/${pad(monday.getMonth() + 1)})`;
  const fullRange = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)} - ${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}/${year}`;
  const key = `${year}-W${pad(weekNumber)}`;

  return { start: monday, end: sunday, weekNumber, year, key, label, fullRange };
}

export const WeeklyLeadConversionTrendChart: React.FC<WeeklyLeadConversionTrendChartProps> = ({
  leads,
  salesMembers = [],
  title = "Xu Hướng Tiếp Nhận & Chuyển Đổi Theo Tuần (Weekly Conversion Trend)",
  subtitle = "So sánh tổng số Lead mới tiếp nhận và số Lead chuyển đổi thành công theo từng tuần, giúp Quản lý nhận diện chính xác các thời điểm bùng nổ hiệu suất kinh doanh (Peak Periods).",
  onNavigateToLeads
}) => {
  // Filters state
  const [windowWeeks, setWindowWeeks] = useState<TimeWindowWeeks>(8);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [conversionCriterion, setConversionCriterion] = useState<ConversionCriterion>('closed_only');
  const [showRateLine, setShowRateLine] = useState<boolean>(true);
  const [curveType, setCurveType] = useState<'monotone' | 'linear'>('monotone');
  const [showTableBreakdown, setShowTableBreakdown] = useState<boolean>(false);

  // Unique Projects list
  const projectList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.project && l.project.trim()) set.add(l.project.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // Unique Assignees list
  const assigneeList = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.assignee && l.assignee.trim()) set.add(l.assignee.trim());
    });
    salesMembers.forEach((s) => {
      if (s.name && s.name.trim()) set.add(s.name.trim());
    });
    return Array.from(set).sort();
  }, [leads, salesMembers]);

  // Determine whether a lead is considered "Converted" based on criterion
  const isLeadConverted = (lead: Lead, criterion: ConversionCriterion): boolean => {
    if (criterion === 'closed_only') {
      return lead.status === 'Đã chốt';
    }
    // Qualified & Closed: 'Đã chốt', 'Đàm phán / Cọc', 'Hẹn xem BĐS'
    return lead.status === 'Đã chốt' || lead.status === 'Đàm phán / Cọc' || lead.status === 'Hẹn xem BĐS';
  };

  // Find when a lead was converted
  const getLeadConversionDate = (lead: Lead): Date => {
    // Check history logs for when status became closed/negotiating/viewing
    if (Array.isArray(lead.history) && lead.history.length > 0) {
      for (const log of lead.history) {
        if (
          log.content && 
          (log.content.includes('Đã chốt') || log.content.includes('Đàm phán') || log.content.includes('Hẹn xem'))
        ) {
          const logDate = parseLeadDate(log.date);
          if (logDate) return logDate;
        }
      }
    }
    // Fallback to update date or creation date
    return getLeadUpdateDate(lead) || getLeadCreationDate(lead) || new Date();
  };

  // Compute Weekly Trend Data Points
  const { chartData, peakWeek, summaryStats } = useMemo(() => {
    // 1. Filter leads by selected project and assignee
    const filteredLeads = leads.filter((l) => {
      if (selectedProject !== 'all' && l.project !== selectedProject) return false;
      if (selectedAssignee !== 'all' && l.assignee !== selectedAssignee) return false;
      return true;
    });

    // 2. Identify the anchor date (latest date among leads or current date)
    let anchorDate = new Date();
    filteredLeads.forEach((l) => {
      const cd = getLeadCreationDate(l);
      if (cd && cd.getTime() > anchorDate.getTime()) {
        anchorDate = cd;
      }
      const ud = getLeadUpdateDate(l);
      if (ud && ud.getTime() > anchorDate.getTime()) {
        anchorDate = ud;
      }
    });

    // 3. Build a continuous sequence of N weeks ending at anchorDate
    const weeks: WeekDataPoint[] = [];
    const currentAnchorWeek = getWeekRange(anchorDate);

    for (let i = windowWeeks - 1; i >= 0; i--) {
      const targetDate = new Date(currentAnchorWeek.start);
      targetDate.setDate(targetDate.getDate() - (i * 7));
      const range = getWeekRange(targetDate);

      weeks.push({
        key: range.key,
        weekNumber: range.weekNumber,
        year: range.year,
        label: range.label,
        fullRange: range.fullRange,
        startDate: range.start,
        endDate: range.end,
        newLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        topProject: 'Chưa có',
        topSale: 'Chưa có',
        isPeakWeek: false
      });
    }

    // 4. Map leads into corresponding week buckets
    const weekProjectCount: Record<string, Record<string, number>> = {};
    const weekSaleCount: Record<string, Record<string, number>> = {};

    filteredLeads.forEach((lead) => {
      const createDate = getLeadCreationDate(lead);
      if (createDate) {
        const createTime = createDate.getTime();
        const foundWeek = weeks.find((w) => createTime >= w.startDate.getTime() && createTime <= w.endDate.getTime());
        if (foundWeek) {
          foundWeek.newLeads += 1;

          // Track project activity
          const proj = lead.project || 'BĐS Khác';
          if (!weekProjectCount[foundWeek.key]) weekProjectCount[foundWeek.key] = {};
          weekProjectCount[foundWeek.key][proj] = (weekProjectCount[foundWeek.key][proj] || 0) + 1;
        }
      }

      // Check conversion
      if (isLeadConverted(lead, conversionCriterion)) {
        const convDate = getLeadConversionDate(lead);
        const convTime = convDate.getTime();
        const foundWeek = weeks.find((w) => convTime >= w.startDate.getTime() && convTime <= w.endDate.getTime());
        if (foundWeek) {
          foundWeek.convertedLeads += 1;

          // Track top sales for converted leads
          const sale = lead.assignee || 'Chưa gán';
          if (!weekSaleCount[foundWeek.key]) weekSaleCount[foundWeek.key] = {};
          weekSaleCount[foundWeek.key][sale] = (weekSaleCount[foundWeek.key][sale] || 0) + 1;
        }
      }
    });

    // 5. Finalize metrics per week (conversion rate, top project, top sale)
    let maxConverted = -1;
    let peakIndex = -1;

    weeks.forEach((w, idx) => {
      if (w.newLeads > 0) {
        w.conversionRate = Number(((w.convertedLeads / w.newLeads) * 100).toFixed(1));
      } else if (w.convertedLeads > 0) {
        w.conversionRate = 100;
      } else {
        w.conversionRate = 0;
      }

      // Find top project
      if (weekProjectCount[w.key]) {
        const sortedProjs = Object.entries(weekProjectCount[w.key]).sort((a, b) => b[1] - a[1]);
        if (sortedProjs.length > 0) w.topProject = sortedProjs[0][0];
      }

      // Find top sale
      if (weekSaleCount[w.key]) {
        const sortedSales = Object.entries(weekSaleCount[w.key]).sort((a, b) => b[1] - a[1]);
        if (sortedSales.length > 0) w.topSale = sortedSales[0][0];
      }

      // Track Peak Week (by highest converted leads, breaking tie by conversion rate)
      if (w.convertedLeads > maxConverted || (w.convertedLeads === maxConverted && w.conversionRate > (weeks[peakIndex]?.conversionRate || 0))) {
        maxConverted = w.convertedLeads;
        peakIndex = idx;
      }
    });

    // Mark peak week
    if (peakIndex >= 0 && maxConverted > 0) {
      weeks[peakIndex].isPeakWeek = true;
    }

    // 6. Aggregate Summary Stats for Management Cards
    const totalNew = weeks.reduce((sum, w) => sum + w.newLeads, 0);
    const totalConverted = weeks.reduce((sum, w) => sum + w.convertedLeads, 0);
    const overallRate = totalNew > 0 ? Number(((totalConverted / totalNew) * 100).toFixed(1)) : 0;
    const weeklyAverageNew = Math.round(totalNew / weeks.length);
    const weeklyAverageConverted = Number((totalConverted / weeks.length).toFixed(1));

    // Week-over-Week (WoW) comparison: compare last 2 weeks in window
    let wowNewPct = 0;
    let wowConvertedPct = 0;
    if (weeks.length >= 2) {
      const lastW = weeks[weeks.length - 1];
      const prevW = weeks[weeks.length - 2];
      if (prevW.newLeads > 0) {
        wowNewPct = Math.round(((lastW.newLeads - prevW.newLeads) / prevW.newLeads) * 100);
      }
      if (prevW.convertedLeads > 0) {
        wowConvertedPct = Math.round(((lastW.convertedLeads - prevW.convertedLeads) / prevW.convertedLeads) * 100);
      }
    }

    return {
      chartData: weeks,
      peakWeek: peakIndex >= 0 && maxConverted > 0 ? weeks[peakIndex] : null,
      summaryStats: {
        totalNew,
        totalConverted,
        overallRate,
        weeklyAverageNew,
        weeklyAverageConverted,
        wowNewPct,
        wowConvertedPct
      }
    };
  }, [leads, selectedProject, selectedAssignee, conversionCriterion, windowWeeks]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
      
      {/* 1. Header with Title & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-start space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
            <TrendingUp className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                {title}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                Line Chart • Recharts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 self-start lg:self-center shrink-0">
          {([6, 8, 12, 16] as TimeWindowWeeks[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowWeeks(w)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                windowWeeks === w
                  ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {w} tuần
            </button>
          ))}
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards: Peak Week, Total New, Total Converted, WoW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Peak Performing Week (Highlight for Managers) */}
        <div className="bg-gradient-to-br from-amber-50 via-amber-100/40 to-emerald-50/50 p-4 rounded-2xl border border-amber-300/80 shadow-2xs relative overflow-hidden group">
          <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Award className="w-24 h-24 text-amber-600" />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Thời Điểm Đạt Đỉnh</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-white uppercase shadow-2xs">
              Peak Period
            </span>
          </div>

          {peakWeek ? (
            <div>
              <div className="font-extrabold text-slate-900 text-base sm:text-lg flex items-baseline space-x-1.5">
                <span>Tuần {peakWeek.weekNumber}</span>
                <span className="text-xs font-semibold text-slate-500">({peakWeek.fullRange})</span>
              </div>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.8 rounded-lg bg-emerald-600 text-white text-xs font-black shadow-2xs">
                  {peakWeek.convertedLeads} deal chốt
                </span>
                <span className="px-2 py-0.8 rounded-lg bg-amber-200/80 text-amber-950 text-xs font-bold border border-amber-300">
                  {peakWeek.conversionRate}% chuyển đổi
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-2 truncate">
                Dự án nổi bật: <strong className="text-slate-800">{peakWeek.topProject}</strong>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-2">
              Chưa có dữ liệu chốt deal trong kỳ đã chọn. Hãy chọn khoảng thời gian rộng hơn.
            </div>
          )}
        </div>

        {/* Card 2: Total New Leads */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Tổng Lead Mới Tiếp Nhận</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-extrabold text-2xl text-slate-900 font-mono">
              {summaryStats.totalNew}
            </span>
            <span className="text-xs font-bold text-slate-500">lead</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Trung bình: <strong>~{summaryStats.weeklyAverageNew}</strong> lead/tuần</span>
            {summaryStats.wowNewPct !== 0 && (
              <span className={`inline-flex items-center font-bold text-[10px] ${
                summaryStats.wowNewPct > 0 ? 'text-emerald-600' : 'text-slate-500'
              }`}>
                {summaryStats.wowNewPct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {summaryStats.wowNewPct > 0 ? `+${summaryStats.wowNewPct}%` : `${summaryStats.wowNewPct}%`} WoW
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Total Converted Leads */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tổng Lead Chuyển Đổi</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-extrabold text-2xl text-emerald-700 font-mono">
              {summaryStats.totalConverted}
            </span>
            <span className="text-xs font-bold text-slate-500">giao dịch</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Trung bình: <strong>{summaryStats.weeklyAverageConverted}</strong> deal/tuần</span>
            {summaryStats.wowConvertedPct !== 0 && (
              <span className={`inline-flex items-center font-bold text-[10px] ${
                summaryStats.wowConvertedPct > 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {summaryStats.wowConvertedPct > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {summaryStats.wowConvertedPct > 0 ? `+${summaryStats.wowConvertedPct}%` : `${summaryStats.wowConvertedPct}%`} WoW
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Overall Conversion Rate */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>Tỷ Lệ Chuyển Đổi Trung Bình</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-extrabold text-2xl text-amber-700 font-mono">
              {summaryStats.overallRate}%
            </span>
            <span className="text-xs font-bold text-slate-500">CR toàn kỳ</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Mục tiêu tuần: <strong>&gt; 10%</strong></span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
              summaryStats.overallRate >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {summaryStats.overallRate >= 10 ? 'Đạt chuẩn' : 'Cần tối ưu'}
            </span>
          </div>
        </div>

      </div>

      {/* 3. Toolbar Filters (Project, Assignee, Conversion Criterion, Curve Style) */}
      <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Project Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-bold">Dự án:</span>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[160px] truncate"
            >
              <option value="all">Tất cả dự án ({leads.length})</option>
              {projectList.map((p) => {
                const count = leads.filter((l) => l.project === p).length;
                return (
                  <option key={p} value={p}>
                    {p} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Assignee Dropdown */}
          <div className="flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-600 font-bold">Chuyên viên:</span>
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 max-w-[160px] truncate"
            >
              <option value="all">Toàn phòng kinh doanh</option>
              {assigneeList.map((a) => {
                const count = leads.filter((l) => l.assignee === a).length;
                return (
                  <option key={a} value={a}>
                    {a} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Conversion Definition Selector */}
          <div className="flex items-center space-x-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-slate-600 font-bold">Tiêu chí:</span>
            <div className="inline-flex rounded-xl bg-white border border-slate-300 p-0.5">
              <button
                type="button"
                onClick={() => setConversionCriterion('closed_only')}
                className={`px-2.5 py-0.8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  conversionCriterion === 'closed_only'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Chỉ tính các khách đã chốt giao dịch chính thức (Trạng thái: Đã chốt)"
              >
                Chốt deal
              </button>
              <button
                type="button"
                onClick={() => setConversionCriterion('qualified_and_closed')}
                className={`px-2.5 py-0.8 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  conversionCriterion === 'qualified_and_closed'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tính cả các lead đã hẹn xem BĐS, đàm phán cọc và đã chốt (Toàn phễu chuyển đổi)"
              >
                Phễu sâu
              </button>
            </div>
          </div>
        </div>

        {/* Chart View Settings (Show Rate Line & Curve Type) */}
        <div className="flex items-center space-x-2">
          <label className="inline-flex items-center space-x-1.5 cursor-pointer text-slate-700 font-semibold select-none">
            <input
              type="checkbox"
              checked={showRateLine}
              onChange={(e) => setShowRateLine(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
            />
            <span>Đường Tỷ Lệ % (Trục Phải)</span>
          </label>

          <button
            type="button"
            onClick={() => setCurveType(curveType === 'monotone' ? 'linear' : 'monotone')}
            className="px-2 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
            title="Chuyển đổi giữa nét vẽ cong mượt và nét vẽ thẳng"
          >
            {curveType === 'monotone' ? 'Nét cong' : 'Nét thẳng'}
          </button>
        </div>
      </div>

      {/* 4. The Line Chart Visualization */}
      <div className="relative pt-2">
        <div className="h-[340px] sm:h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: showRateLine ? 25 : 15, left: -10, bottom: 5 }}
            >
              <defs>
                {/* Gradient for New Leads Line Area Fill */}
                <linearGradient id="newLeadsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
                {/* Gradient for Converted Leads Line Area Fill */}
                <linearGradient id="convertedLeadsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              
              {/* X Axis: Weeks */}
              <XAxis
                dataKey="label"
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />

              {/* Y Axis Left: Lead Volumes */}
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tick={{ fill: '#475569', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{
                  value: 'Số lượng Lead',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#64748b',
                  fontSize: 11,
                  fontWeight: 600,
                  offset: 15
                }}
              />

              {/* Y Axis Right: Conversion Rate % */}
              {showRateLine && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, (dataMax: number) => Math.max(20, Math.ceil(dataMax * 1.25))]}
                  unit="%"
                  tick={{ fill: '#d97706', fontSize: 11, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: '#fde68a' }}
                  label={{
                    value: 'Tỷ lệ chốt (%)',
                    angle: 90,
                    position: 'insideRight',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 600,
                    offset: 15
                  }}
                />
              )}

              {/* Reference Line for Average Conversion Rate */}
              {showRateLine && summaryStats.overallRate > 0 && (
                <ReferenceLine
                  yAxisId="right"
                  y={summaryStats.overallRate}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.7}
                  label={{
                    value: `TB: ${summaryStats.overallRate}%`,
                    fill: '#b45309',
                    fontSize: 10,
                    position: 'insideTopLeft'
                  }}
                />
              )}

              {/* Custom Tooltip */}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload as WeekDataPoint;

                  return (
                    <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs min-w-[240px] space-y-2 backdrop-blur-md">
                      <div className="border-b border-slate-700/80 pb-2 flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-white text-sm flex items-center gap-1.5">
                            <span>{label}</span>
                            {data.isPeakWeek && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase">
                                🏆 Đỉnh cao
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {data.fullRange}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 py-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                            <span>Lead mới tiếp nhận:</span>
                          </span>
                          <span className="font-extrabold font-mono text-white text-sm">
                            {data.newLeads}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                            <span>Lead chuyển đổi thành công:</span>
                          </span>
                          <span className="font-extrabold font-mono text-emerald-400 text-sm">
                            {data.convertedLeads}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-700/60">
                          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                            <span>Tỷ lệ chuyển đổi (CR):</span>
                          </span>
                          <span className="font-extrabold font-mono text-amber-300 text-sm">
                            {data.conversionRate}%
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-700/80 text-[10.5px] text-slate-300 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Dự án sôi động nhất:</span>
                          <span className="font-bold text-white truncate max-w-[130px]">{data.topProject}</span>
                        </div>
                        {data.topSale !== 'Chưa có' && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Sale chốt tốt nhất:</span>
                            <span className="font-bold text-emerald-300 truncate max-w-[130px]">{data.topSale}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />

              {/* Legend */}
              <Legend
                verticalAlign="top"
                align="right"
                height={35}
                iconType="circle"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12, fontWeight: 700 }}
              />

              {/* 1. Area & Line for Total New Leads */}
              <Area
                yAxisId="left"
                type={curveType}
                dataKey="newLeads"
                name="Tổng Lead Mới Tiếp Nhận"
                fill="url(#newLeadsAreaGradient)"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 4, fill: '#0284c7', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6, stroke: '#0284c7', strokeWidth: 2 }}
              />

              {/* 2. Area & Line for Total Converted Leads */}
              <Area
                yAxisId="left"
                type={curveType}
                dataKey="convertedLeads"
                name={conversionCriterion === 'closed_only' ? 'Lead Đã Chốt Deal' : 'Lead Chuyển Đổi Phễu Sâu'}
                fill="url(#convertedLeadsAreaGradient)"
                stroke="#10b981"
                strokeWidth={3.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy) return null;
                  const isPeak = payload?.isPeakWeek;

                  if (isPeak) {
                    return (
                      <g key={`dot-peak-${payload.key}`}>
                        <circle cx={cx} cy={cy} r={7} fill="#10b981" stroke="#fbbf24" strokeWidth={3} />
                        <circle cx={cx} cy={cy} r={3} fill="#ffffff" />
                      </g>
                    );
                  }

                  return (
                    <circle
                      key={`dot-${payload?.key}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2 }}
              />

              {/* 3. Optional Line for Conversion Rate % on Secondary Right Y-Axis */}
              {showRateLine && (
                <Line
                  yAxisId="right"
                  type={curveType}
                  dataKey="conversionRate"
                  name="Tỷ Lệ Chuyển Đổi (%)"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#f59e0b', strokeWidth: 1.5, stroke: '#ffffff' }}
                  activeDot={{ r: 5, stroke: '#f59e0b', strokeWidth: 2 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Managerial Insights & Best Period Analysis Panel */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/90 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
              Nhận Định Chiến Lược Cho Quản Lý (Executive Insights)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowTableBreakdown(!showTableBreakdown)}
            className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{showTableBreakdown ? 'Thu gọn bảng số liệu' : 'Xem chi tiết số liệu từng tuần'}</span>
            {showTableBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs leading-relaxed text-slate-700">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Giai đoạn bùng nổ hiệu suất</span>
            </span>
            {peakWeek ? (
              <p>
                <strong>{peakWeek.label}</strong> là thời điểm chốt khách cao nhất với{' '}
                <strong className="text-emerald-700">{peakWeek.convertedLeads} giao dịch</strong> thành công trên tổng số{' '}
                <strong>{peakWeek.newLeads} lead</strong> mới (Tỷ lệ chuyển đổi đạt <strong>{peakWeek.conversionRate}%</strong>). Dự án dẫn đầu là <em>{peakWeek.topProject}</em>.
              </p>
            ) : (
              <p className="text-slate-500">Chưa ghi nhận tuần có giao dịch chốt trong phạm vi lọc hiện tại.</p>
            )}
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Xu hướng tiếp nhận Lead</span>
            </span>
            <p>
              Toàn phòng tiếp nhận trung bình <strong>{summaryStats.weeklyAverageNew} lead/tuần</strong>.
              {summaryStats.wowNewPct > 0 
                ? ` Lượng khách mới tuần gần nhất tăng ${summaryStats.wowNewPct}% so với tuần trước, cho thấy các kênh marketing đang phát huy tác dụng tốt.`
                : ` Lượng khách mới duy trì ổn định. Nên duy trì độ phủ quảng cáo đa kênh (Facebook, Zalo, Google).`}
            </p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="font-extrabold text-slate-900 flex items-center gap-1 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Khuyến nghị hành động cho TPKD</span>
            </span>
            <p>
              Tỷ lệ chuyển đổi toàn kỳ đạt <strong>{summaryStats.overallRate}%</strong>. Đẩy mạnh việc phân bổ khách mới trong vòng 15-30 phút đầu tiên (SLA vàng) và yêu cầu NVKD cập nhật nhật ký sau mỗi cuộc gọi để tối ưu chuyển đổi.
            </p>
          </div>
        </div>

        {/* 6. Expandable Weekly Breakdown Table */}
        {showTableBreakdown && (
          <div className="pt-3 border-t border-slate-200 mt-2 overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200/70 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 rounded-l-xl">Tuần &amp; Thời gian</th>
                  <th className="py-2.5 px-3 text-right">Lead mới</th>
                  <th className="py-2.5 px-3 text-right">Lead chuyển đổi</th>
                  <th className="py-2.5 px-3 text-right">Tỷ lệ chuyển đổi</th>
                  <th className="py-2.5 px-3">Dự án tâm điểm</th>
                  <th className="py-2.5 px-3">Sale xuất sắc</th>
                  <th className="py-2.5 px-3 text-center rounded-r-xl">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {chartData.map((w) => (
                  <tr
                    key={w.key}
                    className={`hover:bg-amber-50/50 transition-colors ${w.isPeakWeek ? 'bg-amber-50/70 font-semibold' : ''}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <span>Tuần {w.weekNumber}</span>
                        {w.isPeakWeek && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                            🏆 Peak
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{w.fullRange}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sky-800">
                      {w.newLeads}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {w.convertedLeads}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-700">
                      {w.conversionRate}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 truncate max-w-[140px]">
                      {w.topProject}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 truncate max-w-[140px]">
                      {w.topSale !== 'Chưa có' ? <strong>{w.topSale}</strong> : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.isPeakWeek
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : w.conversionRate >= 15
                            ? 'bg-emerald-100 text-emerald-800'
                            : w.conversionRate >= 8
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {w.isPeakWeek ? 'Kỷ lục' : w.conversionRate >= 15 ? 'Xuất sắc' : w.conversionRate >= 8 ? 'Đạt' : 'Cần đẩy mạnh'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
