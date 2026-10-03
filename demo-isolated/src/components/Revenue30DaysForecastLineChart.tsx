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
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Award,
  Target,
  Users,
  Building2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Flame,
  Layers,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Sliders,
  Zap
} from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { formatCurrencyVND } from '../utils/crmCalculations';

interface Revenue30DaysForecastLineChartProps {
  leads: Lead[];
  salesMembers?: SalesMember[];
  currentUser?: SalesMember;
  onNavigateToLeads?: (filter: { status?: string; project?: string; assignee?: string }) => void;
  className?: string;
}

export type ForecastScenario = 'conservative' | 'base' | 'growth' | 'breakthrough';

/**
 * Extract realistic property budget value in Billion VND (Tỷ VNĐ) from lead notes or budget string
 */
export function parseLeadBudgetInBillionVND(budgetStr?: string | null): number {
  if (!budgetStr) return 11.5; // Mức trung bình chuẩn Nhà Phố Trung Tâm (11.5 Tỷ)
  const cleaned = budgetStr.toLowerCase().replace(/,/g, '.');

  // Match range like "15 - 20 tỷ" or "15-20 ty"
  const rangeMatch = cleaned.match(/([\d.]+)\s*[-–~to]\s*([\d.]+)\s*(tỷ|ty|b)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (!isNaN(min) && !isNaN(max) && min > 0 && max > 0) {
      return (min + max) / 2;
    }
  }

  // Match single value like "12.5 tỷ" or "10 ty"
  const singleMatch = cleaned.match(/([\d.]+)\s*(tỷ|ty|b)/i);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1]);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // Match million VND like "800 triệu" or "800tr"
  const millionMatch = cleaned.match(/([\d.]+)\s*(triệu|trieu|tr)/i);
  if (millionMatch) {
    const val = parseFloat(millionMatch[1]);
    if (!isNaN(val) && val > 0) {
      return val / 1000;
    }
  }

  // Standalone number
  const numMatch = cleaned.match(/([\d.]+)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (!isNaN(val) && val > 0) {
      if (val > 100) return val / 1000; // treat as millions
      return val;
    }
  }

  return 11.5;
}

export const Revenue30DaysForecastLineChart: React.FC<Revenue30DaysForecastLineChartProps> = ({
  leads,
  salesMembers = [],
  currentUser,
  onNavigateToLeads,
  className = ''
}) => {
  // Filter state
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [scenario, setScenario] = useState<ForecastScenario>('base');
  const [viewMetric, setViewMetric] = useState<'deal_volume' | 'commission'>('deal_volume');
  const [commissionRate, setCommissionRate] = useState<number>(1.5); // 1.5% chuẩn

  // Multiplier based on scenario
  const scenarioMultiplier = useMemo(() => {
    switch (scenario) {
      case 'conservative':
        return 0.75; // Thận trọng: -25%
      case 'base':
        return 1.0; // Cơ sở chuẩn
      case 'growth':
        return 1.25; // Tăng tốc: +25%
      case 'breakthrough':
        return 1.5; // Đột phá: +50%
      default:
        return 1.0;
    }
  }, [scenario]);

  // Unique assignees and projects for filter dropdowns
  const { assigneeList, projectList } = useMemo(() => {
    const aSet = new Set<string>();
    const pSet = new Set<string>();
    leads.forEach((l) => {
      if (l.assignee && l.assignee.trim()) aSet.add(l.assignee.trim());
      if (l.project && l.project.trim()) pSet.add(l.project.trim());
    });
    return {
      assigneeList: Array.from(aSet).sort(),
      projectList: Array.from(pSet).sort()
    };
  }, [leads]);

  // Filtered active leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (selectedAssignee !== 'all' && (l.assignee || '').trim().toLowerCase() !== selectedAssignee.toLowerCase()) {
        return false;
      }
      if (selectedProject !== 'all' && (l.project || '').trim().toLowerCase() !== selectedProject.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [leads, selectedAssignee, selectedProject]);

  // Calculate 30-Day Forecast based on potential leads and closing stages
  const {
    pipelineLeads,
    totalPotentialCount,
    averageDealValue,
    forecastData,
    summaryKpis,
    topHotLeads
  } = useMemo(() => {
    // 1. Identify active leads in pipeline with closing potential
    const activePipeline = filteredLeads.filter((l) => {
      const s = l.status;
      return (
        s === 'Đàm phán / Cọc' ||
        s === 'Hẹn xem BĐS' ||
        s === 'Tiềm năng' ||
        s === 'Quan tâm' ||
        s === 'Đang chăm sóc' ||
        s === 'Khách mới'
      );
    });

    // 2. Stage base probability definition for 30-day closing window
    const getStageProbability = (status: string): number => {
      switch (status) {
        case 'Đàm phán / Cọc':
          return 0.75; // 75% chốt trong 30 ngày
        case 'Hẹn xem BĐS':
          return 0.40; // 40% chốt trong 30 ngày
        case 'Tiềm năng':
          return 0.22; // 22% chốt trong 30 ngày
        case 'Quan tâm':
          return 0.12; // 12% chốt trong 30 ngày
        case 'Đang chăm sóc':
          return 0.08; // 8% chốt trong 30 ngày
        case 'Khách mới':
          return 0.04; // 4% chốt trong 30 ngày
        default:
          return 0.02;
      }
    };

    // Calculate individual expected values
    let totalExpectedValue = 0;
    let totalDealValueSum = 0;
    let countedLeadCount = 0;

    const enrichedLeads = activePipeline.map((lead) => {
      const baseProb = getStageProbability(lead.status);
      const adjustedProb = Math.min(0.95, baseProb * scenarioMultiplier);
      const budgetBillion = parseLeadBudgetInBillionVND(lead.budget);
      const expectedContribution = budgetBillion * adjustedProb;

      totalExpectedValue += expectedContribution;
      totalDealValueSum += budgetBillion;
      countedLeadCount++;

      return {
        ...lead,
        budgetBillion,
        adjustedProb,
        expectedContribution,
        probPercentage: Math.round(adjustedProb * 100)
      };
    });

    const avgDeal = countedLeadCount > 0 ? totalDealValueSum / countedLeadCount : 11.5;

    // Sort hot leads by highest probability and expected contribution
    const sortedHot = [...enrichedLeads].sort(
      (a, b) => b.expectedContribution - a.expectedContribution || b.adjustedProb - a.adjustedProb
    );

    // 3. Build 30-Day Cumulative Timeline Checkpoints (Days 5, 10, 15, 20, 25, 30)
    // S-curve progression of deals maturing over 30 days
    const timelineCheckpoints = [
      { day: 5, label: 'Ngày 5', maturityFactor: 0.12 },
      { day: 10, label: 'Ngày 10', maturityFactor: 0.28 },
      { day: 15, label: 'Ngày 15', maturityFactor: 0.48 },
      { day: 20, label: 'Ngày 20', maturityFactor: 0.68 },
      { day: 25, label: 'Ngày 25', maturityFactor: 0.85 },
      { day: 30, label: 'Ngày 30', maturityFactor: 1.00 }
    ];

    // Total base expected revenue at day 30
    const finalExpectedRevenue = Math.max(0, totalExpectedValue);
    const finalOptimisticRevenue = finalExpectedRevenue * 1.30;
    const finalConservativeRevenue = finalExpectedRevenue * 0.72;
    const finalExpectedDeals = avgDeal > 0 ? finalExpectedRevenue / avgDeal : 0;

    let prevRevenue = 0;
    let prevDeals = 0;

    const chartPoints = timelineCheckpoints.map((cp) => {
      const expRev = Math.round(finalExpectedRevenue * cp.maturityFactor * 10) / 10;
      const optRev = Math.round(finalOptimisticRevenue * cp.maturityFactor * 10) / 10;
      const consRev = Math.round(finalConservativeRevenue * cp.maturityFactor * 10) / 10;
      const cumDeals = Math.round(finalExpectedDeals * cp.maturityFactor * 10) / 10;

      // Period increment
      const periodRev = Math.round((expRev - prevRevenue) * 10) / 10;
      const periodDeals = Math.round((cumDeals - prevDeals) * 10) / 10;
      prevRevenue = expRev;
      prevDeals = cumDeals;

      // Commission in Million VND
      const commissionExpectedMillion = Math.round(expRev * 1000 * (commissionRate / 100));
      const commissionOptimisticMillion = Math.round(optRev * 1000 * (commissionRate / 100));

      return {
        day: cp.day,
        label: cp.label,
        timelineLabel: `${cp.label} (+${cp.day}d)`,
        expectedRevenue: expRev,
        optimisticRevenue: optRev,
        conservativeRevenue: consRev,
        expectedDeals: cumDeals,
        periodNewRevenue: periodRev,
        periodNewDeals: periodDeals,
        commissionExpectedMillion,
        commissionOptimisticMillion
      };
    });

    // Summary metrics
    const totalCommissionMillion = Math.round(finalExpectedRevenue * 1000 * (commissionRate / 100));
    const avgCloseRateApplied =
      countedLeadCount > 0
        ? Math.round((finalExpectedDeals / countedLeadCount) * 1000) / 10
        : 0;

    return {
      pipelineLeads: enrichedLeads,
      totalPotentialCount: countedLeadCount,
      averageDealValue: Math.round(avgDeal * 10) / 10,
      forecastData: chartPoints,
      summaryKpis: {
        expectedRevenueBillion: Math.round(finalExpectedRevenue * 10) / 10,
        optimisticRevenueBillion: Math.round(finalOptimisticRevenue * 10) / 10,
        conservativeRevenueBillion: Math.round(finalConservativeRevenue * 10) / 10,
        expectedDealsCount: Math.round(finalExpectedDeals * 10) / 10,
        totalCommissionMillion,
        avgCloseRateApplied
      },
      topHotLeads: sortedHot.slice(0, 5)
    };
  }, [filteredLeads, scenarioMultiplier, commissionRate]);

  // Custom Tooltip for Line Chart
  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs max-w-xs animate-fadeIn z-50">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-2 mb-2">
            <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Mốc Dự Báo: {data.timelineLabel}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Tích luỹ 30 ngày</span>
          </div>

          <div className="space-y-1.5 text-slate-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-violet-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                <span>Doanh số kỳ vọng:</span>
              </span>
              <span className="font-bold text-white font-mono text-sm">
                {data.expectedRevenue} Tỷ VNĐ
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Kịch bản Lạc quan:</span>
              </span>
              <span className="font-bold font-mono text-emerald-300">
                {data.optimisticRevenue} Tỷ
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Kịch bản Thận trọng:</span>
              </span>
              <span className="font-bold font-mono text-amber-300">
                {data.conservativeRevenue} Tỷ
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <span className="text-sky-300 flex items-center gap-1">
                <Target className="w-3 h-3 text-sky-400" />
                <span>Số deal chốt tích luỹ:</span>
              </span>
              <span className="font-bold text-sky-200 font-mono">
                ~{data.expectedDeals} căn
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <span className="text-amber-200 flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-400" />
                <span>Hoa hồng dự kiến ({commissionRate}%):</span>
              </span>
              <span className="font-bold text-amber-300 font-mono">
                ~{data.commissionExpectedMillion.toLocaleString('vi-VN')} Tr
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5 ${className}`}>
      
      {/* 1. Header & Title with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 border-b border-slate-100 pb-4">
        <div className="flex items-start space-x-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-violet-500/20 shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                Dự Báo Doanh Số 30 Ngày Tới (30-Day Revenue Forecast)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-900 text-[10px] font-black uppercase tracking-wider border border-violet-200">
                Recharts Line Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mô hình hóa doanh số dự kiến dựa trên số lượng khách tiềm năng, giá trị ngân sách và xác suất chốt theo từng chặng phễu
            </p>
          </div>
        </div>

        {/* Filter Strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Assignee Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-transparent border-none text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="all">Toàn bộ Sale ({assigneeList.length})</option>
              {assigneeList.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent border-none text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 text-xs"
            >
              <option value="all">Tất cả dự án ({projectList.length})</option>
              {projectList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          {(selectedAssignee !== 'all' || selectedProject !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedAssignee('all');
                setSelectedProject('all');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              title="Đặt lại bộ lọc"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Executive Forecast KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* KPI 1: Doanh số BĐS dự báo */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-50 via-indigo-50/50 to-white border border-violet-200 shadow-2xs">
          <div className="flex items-center justify-between text-violet-800 text-[11px] font-bold mb-1">
            <span>Doanh số dự báo (30 ngày)</span>
            <DollarSign className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-violet-950 tracking-tight font-mono">
            {summaryKpis.expectedRevenueBillion} <span className="text-xs font-bold text-violet-700">Tỷ VNĐ</span>
          </div>
          <div className="text-[10px] text-violet-600 mt-1 flex items-center justify-between">
            <span>Lạc quan: <strong>{summaryKpis.optimisticRevenueBillion} Tỷ</strong></span>
            <span>Thận trọng: <strong>{summaryKpis.conservativeRevenueBillion} Tỷ</strong></span>
          </div>
        </div>

        {/* KPI 2: Hoa hồng môi giới */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold mb-1">
            <span>Hoa hồng dự kiến ({commissionRate}%)</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight font-mono">
            {summaryKpis.totalCommissionMillion.toLocaleString('vi-VN')} <span className="text-xs font-bold text-emerald-700">Tr VNĐ</span>
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">
            Doanh thu trực tiếp về sàn &amp; đội ngũ
          </div>
        </div>

        {/* KPI 3: Số Deal dự kiến chốt */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50/50 to-white border border-sky-200 shadow-2xs">
          <div className="flex items-center justify-between text-sky-800 text-[11px] font-bold mb-1">
            <span>Số Deal dự kiến</span>
            <Target className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-950 tracking-tight font-mono">
            ~{summaryKpis.expectedDealsCount} <span className="text-xs font-bold text-sky-700">Giao dịch</span>
          </div>
          <div className="text-[10px] text-sky-700 mt-1">
            Giá trị TB: <strong>~{averageDealValue} Tỷ / căn</strong>
          </div>
        </div>

        {/* KPI 4: Khách tiềm năng trong phễu */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/50 to-white border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold mb-1">
            <span>Khách trong phễu tính toán</span>
            <Flame className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 tracking-tight font-mono">
            {totalPotentialCount} <span className="text-xs font-bold text-amber-700">Khách hàng</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-1">
            Gồm đàm phán, hẹn xem &amp; nét
          </div>
        </div>

        {/* KPI 5: Tỷ lệ chốt thành công bình quân */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-700 text-[11px] font-bold mb-1">
            <span>Tỷ lệ chốt bình quân</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
            {summaryKpis.avgCloseRateApplied}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Kịch bản: <strong className="text-slate-800 uppercase">{scenario}</strong>
          </div>
        </div>
      </div>

      {/* 3. Scenario & Simulation Controls */}
      <div className="p-3 sm:p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-violet-600" />
            <span>Kịch bản dự phóng:</span>
          </span>
          <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setScenario('conservative')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                scenario === 'conservative'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thận trọng (75%)
            </button>
            <button
              type="button"
              onClick={() => setScenario('base')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                scenario === 'base'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cơ sở chuẩn (100%)
            </button>
            <button
              type="button"
              onClick={() => setScenario('growth')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                scenario === 'growth'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tăng tốc (125%)
            </button>
            <button
              type="button"
              onClick={() => setScenario('breakthrough')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                scenario === 'breakthrough'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đột phá (150%)
            </button>
          </div>
        </div>

        {/* Metric Display & Commission Adjuster */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-2">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-600">
            <span>Tỷ lệ hoa hồng:</span>
            <select
              value={commissionRate}
              onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 1.5)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
            >
              <option value={1.0}>1.0%</option>
              <option value={1.5}>1.5% (Chuẩn)</option>
              <option value={2.0}>2.0%</option>
              <option value={2.5}>2.5%</option>
              <option value={3.0}>3.0%</option>
            </select>
          </div>

          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMetric('deal_volume')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                viewMetric === 'deal_volume'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doanh số BĐS (Tỷ)
            </button>
            <button
              type="button"
              onClick={() => setViewMetric('commission')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                viewMetric === 'commission'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoa hồng (Triệu)
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN RECHARTS LINE CHART */}
      <div className="w-full pt-1">
        <div className="w-full h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={forecastData}
              margin={{ top: 15, right: 25, left: -5, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorForecastArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              
              <XAxis
                dataKey="timelineLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
              />

              {/* Left Y Axis: Revenue (Tỷ VNĐ) or Commission (Triệu VNĐ) */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                tickFormatter={(val) =>
                  viewMetric === 'deal_volume' ? `${val} Tỷ` : `${val} Tr`
                }
              />

              {/* Right Y Axis: Expected Cumulative Deals */}
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#3b82f6' }}
                tickLine={false}
                axisLine={{ stroke: '#93c5fd' }}
                tickFormatter={(val) => `${val} deal`}
                allowDecimals={true}
              />

              <Tooltip content={<CustomForecastTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" />

              {/* Shaded Area for Expected Trend */}
              <Area
                yAxisId="left"
                type="monotone"
                dataKey={viewMetric === 'deal_volume' ? 'expectedRevenue' : 'commissionExpectedMillion'}
                fill="url(#colorForecastArea)"
                stroke="none"
              />

              {/* 1. Main Line: Base Expected Revenue */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={viewMetric === 'deal_volume' ? 'expectedRevenue' : 'commissionExpectedMillion'}
                name={viewMetric === 'deal_volume' ? 'Doanh số kỳ vọng (Tỷ VNĐ)' : 'Hoa hồng kỳ vọng (Triệu VNĐ)'}
                stroke="#8b5cf6"
                strokeWidth={3.5}
                dot={{ r: 5, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 8, stroke: '#8b5cf6', strokeWidth: 3 }}
              />

              {/* 2. Optimistic Line */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey={viewMetric === 'deal_volume' ? 'optimisticRevenue' : 'commissionOptimisticMillion'}
                name="Kịch bản Lạc quan (+30%)"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3, fill: '#10b981' }}
              />

              {/* 3. Conservative Line */}
              {viewMetric === 'deal_volume' && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="conservativeRevenue"
                  name="Kịch bản Thận trọng (-28%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              )}

              {/* 4. Cumulative Deals (Right Axis) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="expectedDeals"
                name="Số Deal chốt tích luỹ (Căn)"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 italic px-2 pt-2 border-t border-slate-100 flex-wrap gap-2">
          <span>* Dữ liệu mô phỏng theo hàm phân phối tiến độ chốt phễu (Maturity S-curve) từ ngày 1 đến ngày 30.</span>
          <span className="font-semibold text-slate-500">Mô hình: Pipeline Weighted Conversion Probability</span>
        </div>
      </div>

      {/* 5. Key Actionable Insights & Top Potential Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pt-1">
        
        {/* Left: Strategic Takeaways for Management & Sale */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-3 shadow-md border border-indigo-900/50">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className="font-black text-sm text-white">
              Định Hướng Đạt Mục Tiêu Doanh Số 30 Ngày
            </h4>
          </div>
          <p className="text-xs text-indigo-200 leading-relaxed font-normal">
            Hệ thống nhận diện hiện có <strong className="text-amber-300 font-bold">{totalPotentialCount} khách hàng</strong> đang trong phễu đàm phán và hẹn xem. Nếu toàn đội ngũ duy trì đúng nhịp độ chăm sóc và tổ chức xem nhà thực tế, tỷ lệ chốt đạt mức kỳ vọng sẽ đem lại <strong className="text-emerald-300 font-bold">{summaryKpis.expectedRevenueBillion} Tỷ VNĐ</strong> doanh số giao dịch.
          </p>
          
          <div className="space-y-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-300">Tập trung cao độ 15 ngày đầu:</span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Chốt dứt điểm các khách đang ở bước <strong>Đàm phán / Cọc</strong> và <strong>Hẹn xem BĐS</strong> để bảo toàn 48% doanh số dự phóng đầu kỳ.
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start space-x-2">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Đẩy mạnh lịch hẹn xem cuối tuần:</span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tận dụng tính năng <em>Nhắc nhở gọi lại (Callback)</em> và <em>Zalo Reminder</em> để đưa ít nhất 30% khách Tiềm năng đi xem thực địa.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Top Hot Pipeline Leads Driving 30-Day Revenue */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              <span>Top Khách Tiềm Năng Quyết Định Doanh Số 30 Ngày</span>
            </h4>
            {onNavigateToLeads && (
              <button
                type="button"
                onClick={() => onNavigateToLeads({ status: 'Đàm phán / Cọc' })}
                className="text-[11px] font-bold text-violet-700 hover:text-violet-900 hover:underline flex items-center gap-0.5"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {topHotLeads.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Chưa có đủ khách hàng tiềm năng để xếp hạng. Hãy tiếp nhận thêm Lead mới.
            </div>
          ) : (
            <div className="space-y-2">
              {topHotLeads.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs hover:border-violet-300 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-black text-slate-900 truncate">{item.fullName}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                        {item.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate flex items-center gap-2">
                      <span>Sale: <strong className="text-slate-700">{item.assignee || 'Chưa gán'}</strong></span>
                      <span>• Dự án: <strong>{item.project || 'Nhà phố TT'}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-black text-slate-900 text-xs sm:text-sm">
                      ~{item.budgetBillion} Tỷ
                    </div>
                    <div className="flex items-center justify-end space-x-1 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">Xác suất:</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {item.probPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
