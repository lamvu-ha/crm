import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Award, 
  Target, 
  Layers, 
  Building2, 
  CheckCircle2, 
  Flame, 
  Users,
  Sparkles,
  ArrowRight,
  Compass,
  LineChart as LineChartIcon,
  DollarSign
} from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { calculateCRMIndicators, formatCurrencyVND } from '../utils/crmCalculations';
import { WeeklySlaPerformanceChart } from './WeeklySlaPerformanceChart';
import { SalesDistributionPieChart } from './SalesDistributionPieChart';
import { PerformanceOverview } from './PerformanceOverview';
import { WeeklyLeadConversionTrendChart } from './WeeklyLeadConversionTrendChart';
import { Revenue30DaysForecastLineChart } from './Revenue30DaysForecastLineChart';

interface AnalyticsViewProps {
  leads: Lead[];
  salesMembers?: SalesMember[];
  currentUser?: SalesMember;
  onSelectSale?: (saleName: string) => void;
  onNavigateToSmartReports?: () => void;
  onNavigateToLeads?: (filter: { status?: string; project?: string; assignee?: string }) => void;
  onOpenAddLead?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ 
  leads,
  salesMembers = [],
  currentUser,
  onSelectSale,
  onNavigateToSmartReports,
  onNavigateToLeads,
  onOpenAddLead
}) => {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'overview' | 'revenue_forecast' | 'weekly_trend' | 'team_sla' | 'funnel_sources'>('overview');
  const indicators = calculateCRMIndicators(leads);

  // Group by Data Source (Tệp dữ liệu)
  const sourceMap: Record<string, { total: number; closed: number; potential: number }> = {};
  leads.forEach((lead) => {
    const src = lead.dataSource || 'Khác';
    if (!sourceMap[src]) sourceMap[src] = { total: 0, closed: 0, potential: 0 };
    sourceMap[src].total += 1;
    if (lead.status === 'Đã chốt') sourceMap[src].closed += 1;
    if (lead.status === 'Tiềm năng') sourceMap[src].potential += 1;
  });

  const sourceData = Object.entries(sourceMap)
    .map(([source, val]) => ({
      source,
      total: val.total,
      closed: val.closed,
      potential: val.potential,
      rate: val.total > 0 ? (val.closed / val.total) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  // Group by Project (Dự án)
  const projectMap: Record<string, { total: number; closed: number }> = {};
  leads.forEach((lead) => {
    const proj = lead.project || 'Khác';
    if (!projectMap[proj]) projectMap[proj] = { total: 0, closed: 0 };
    projectMap[proj].total += 1;
    if (lead.status === 'Đã chốt') projectMap[proj].closed += 1;
  });

  const projectData = Object.entries(projectMap)
    .map(([project, val]) => ({
      project,
      total: val.total,
      closed: val.closed
    }))
    .sort((a, b) => b.total - a.total);

  // Group by Assignee (Người phụ trách)
  const assigneeMap: Record<string, { total: number; closed: number; potential: number }> = {};
  leads.forEach((lead) => {
    const ass = lead.assignee || 'Chưa gán';
    if (!assigneeMap[ass]) assigneeMap[ass] = { total: 0, closed: 0, potential: 0 };
    assigneeMap[ass].total += 1;
    if (lead.status === 'Đã chốt') assigneeMap[ass].closed += 1;
    if (lead.status === 'Tiềm năng') assigneeMap[ass].potential += 1;
  });

  const assigneeData = Object.entries(assigneeMap)
    .map(([name, val]) => ({
      name,
      total: val.total,
      closed: val.closed,
      potential: val.potential,
      rate: val.total > 0 ? (val.closed / val.total) * 100 : 0
    }))
    .sort((a, b) => b.closed - a.closed || b.potential - a.potential);

  // Funnel steps
  const funnelSteps = [
    { label: 'Tổng Lead tiếp nhận', count: indicators.totalLeads, color: 'bg-slate-700', pct: 100 },
    { label: 'Khách mới (Cần gọi)', count: indicators.newLeads, color: 'bg-sky-500', pct: indicators.totalLeads > 0 ? (indicators.newLeads / indicators.totalLeads) * 100 : 0 },
    { label: 'Đang chăm sóc', count: indicators.inCareLeads, color: 'bg-amber-500', pct: indicators.totalLeads > 0 ? (indicators.inCareLeads / indicators.totalLeads) * 100 : 0 },
    { label: 'Khách tiềm năng cao', count: indicators.potentialLeads, color: 'bg-indigo-600', pct: indicators.totalLeads > 0 ? (indicators.potentialLeads / indicators.totalLeads) * 100 : 0 },
    { label: 'Đã hẹn xem thực tế', count: indicators.viewingLeads, color: 'bg-purple-600', pct: indicators.totalLeads > 0 ? (indicators.viewingLeads / indicators.totalLeads) * 100 : 0 },
    { label: 'Đàm phán & Đặt cọc', count: indicators.negotiatingLeads, color: 'bg-orange-500', pct: indicators.totalLeads > 0 ? (indicators.negotiatingLeads / indicators.totalLeads) * 100 : 0 },
    { label: 'Đã chốt giao dịch', count: indicators.closedLeads, color: 'bg-emerald-600', pct: indicators.closeRate }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Quick link banner to Smart Marketing Reports */}
      {onNavigateToSmartReports && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-indigo-700/50 shadow-md flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <span>Báo cáo thông minh • Recharts Marketing Analytics</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">Mới</span>
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                Trực quan hóa tỷ lệ chuyển đổi chi tiết theo Nguồn dữ liệu (Data Source) và theo Dự án BĐS với biểu đồ Recharts tương tác cao.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToSmartReports}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-1.5 shrink-0"
          >
            <span>Mở báo cáo thông minh</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Analytics Sub-Navigation Tabs */}
      <div className="flex items-center space-x-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveAnalyticsTab('overview')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAnalyticsTab === 'overview'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>Tổng Quan Hiệu Suất</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black">
            Recharts
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalyticsTab('revenue_forecast')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAnalyticsTab === 'revenue_forecast'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <LineChartIcon className="w-4 h-4 text-violet-600" />
          <span>Dự Báo Doanh Số 30 Ngày</span>
          <span className="px-1.5 py-0.2 rounded-full bg-violet-100 text-violet-900 text-[10px] font-black">
            Line Chart Mới
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalyticsTab('weekly_trend')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAnalyticsTab === 'weekly_trend'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Xu Hướng Tuần: Lead Mới vs Chốt Deal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalyticsTab('team_sla')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAnalyticsTab === 'team_sla'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Hiệu suất SLA &amp; phân bổ sale</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveAnalyticsTab('funnel_sources')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeAnalyticsTab === 'funnel_sources'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Phễu BĐS &amp; tệp dữ liệu</span>
        </button>
      </div>

      {/* Tab 1: Overview with Revenue 30-Day Forecast Line Chart + Weekly Trend + Performance Overview */}
      {activeAnalyticsTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6">
          <Revenue30DaysForecastLineChart
            leads={leads}
            salesMembers={salesMembers}
            currentUser={currentUser}
            onNavigateToLeads={onNavigateToLeads}
          />

          <WeeklyLeadConversionTrendChart
            leads={leads}
            salesMembers={salesMembers}
            onNavigateToLeads={onNavigateToLeads}
          />

          <PerformanceOverview
            leads={leads}
            salesMembers={salesMembers}
            currentUser={currentUser}
            onNavigateToLeads={onNavigateToLeads}
            onOpenAddLead={onOpenAddLead}
          />
        </div>
      )}

      {/* Tab 2: Dedicated 30-Day Revenue Forecast Line Chart */}
      {activeAnalyticsTab === 'revenue_forecast' && (
        <div className="space-y-4 sm:space-y-6">
          <Revenue30DaysForecastLineChart
            leads={leads}
            salesMembers={salesMembers}
            currentUser={currentUser}
            onNavigateToLeads={onNavigateToLeads}
          />
        </div>
      )}

      {/* Tab 2: Dedicated Weekly Trend Line Chart */}
      {activeAnalyticsTab === 'weekly_trend' && (
        <div className="space-y-4 sm:space-y-6">
          <WeeklyLeadConversionTrendChart
            leads={leads}
            salesMembers={salesMembers}
            onNavigateToLeads={onNavigateToLeads}
          />
        </div>
      )}

      {/* Tab 2: Team SLA Performance & Sales Distribution */}
      {activeAnalyticsTab === 'team_sla' && (
        <div className="space-y-4 sm:space-y-6">
          <WeeklySlaPerformanceChart
            leads={leads}
            salesMembers={salesMembers}
            onSelectSale={onSelectSale}
          />

          <SalesDistributionPieChart
            leads={leads}
            salesMembers={salesMembers}
            onSelectSale={onSelectSale}
          />

          {/* Sales Leaderboard */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-3 sm:mb-4 flex items-center">
              <Award className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
              Bảng thành tích chuyên viên môi giới (Sales performance)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {assigneeData.map((staff, idx) => (
                <div
                  key={staff.name}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        idx === 0 ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{staff.name}</h4>
                        <span className="text-[11px] text-slate-400">Môi giới BĐS</span>
                      </div>
                    </div>
                    {idx === 0 && (
                      <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        Dẫn đầu chốt deal
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-200/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block uppercase">Được giao</span>
                      <span className="font-bold text-xs sm:text-sm text-slate-800 font-mono">{staff.total}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-500 font-bold block uppercase">Tiềm năng</span>
                      <span className="font-bold text-xs sm:text-sm text-indigo-700 font-mono">{staff.potential}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 font-bold block uppercase">Đã chốt</span>
                      <span className="font-bold text-xs sm:text-sm text-emerald-700 font-mono">{staff.closed}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Funnel & Data Sources */}
      {activeAnalyticsTab === 'funnel_sources' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
                <span className="truncate">Tỷ lệ chốt deal</span>
                <Target className="w-4 h-4 text-amber-600 shrink-0 ml-1" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {indicators.closeRate.toFixed(1).replace('.', ',')}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">Đã chốt {indicators.closedLeads}/{indicators.totalLeads} Lead</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
                <span className="truncate">Lead tiềm năng</span>
                <Flame className="w-4 h-4 text-indigo-600 shrink-0 ml-1" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight">
                {indicators.totalLeads > 0 ? ((indicators.potentialLeads / indicators.totalLeads) * 100).toFixed(1).replace('.', ',') : '0,0'}%
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{indicators.potentialLeads} khách nét tài chính</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
                <span className="truncate">Khách cần gọi</span>
                <Users className="w-4 h-4 text-sky-600 shrink-0 ml-1" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-sky-600 tracking-tight">
                {indicators.newLeads}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">Lead mới chưa chăm sóc</p>
            </div>

            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-bold mb-1">
                <span className="truncate">Giai đoạn sâu</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
                {indicators.viewingLeads + indicators.negotiatingLeads + indicators.closedLeads}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">Đi xem / Đàm phán / Chốt</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Phễu chuyển đổi CRM (Sales Funnel) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-3 sm:mb-4 flex items-center">
                <Layers className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
                Phễu chuyển đổi khách hàng BĐS
              </h3>

              <div className="space-y-3">
                {funnelSteps.map((step) => (
                  <div key={step.label} className="text-xs">
                    <div className="flex items-center justify-between mb-1.5 font-bold">
                      <span className="text-slate-700 truncate pr-2">{step.label}</span>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-bold text-slate-900 font-mono">{step.count}</span>
                        <span className="text-slate-400 text-[11px] w-10 text-right font-medium">
                          {step.pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${step.color} transition-all duration-500`}
                        style={{ width: `${Math.max(step.pct, step.count > 0 ? 5 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hiệu quả theo Tệp dữ liệu (Lead Sources) */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 mb-3 sm:mb-4 flex items-center">
                <BarChart3 className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
                Hiệu quả từng tệp dữ liệu (Lead sources)
              </h3>

              <div className="overflow-x-auto touch-scroll -mx-1 sm:mx-0">
                <table className="w-full text-left text-xs min-w-[340px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                      <th className="pb-2 font-bold">Tệp dữ liệu</th>
                      <th className="pb-2 text-center font-bold">Tổng</th>
                      <th className="pb-2 text-center font-bold">Tiềm năng</th>
                      <th className="pb-2 text-center font-bold">Chốt</th>
                      <th className="pb-2 text-right font-bold">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sourceData.map((src) => (
                      <tr key={src.source} className="hover:bg-slate-50">
                        <td className="py-2.5 font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[180px]" title={src.source}>
                          {src.source}
                        </td>
                        <td className="py-2.5 text-center text-slate-600 font-mono font-medium">{src.total}</td>
                        <td className="py-2.5 text-center text-indigo-600 font-bold font-mono">{src.potential}</td>
                        <td className="py-2.5 text-center text-emerald-600 font-bold font-mono">{src.closed}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900 font-mono">
                          {src.rate.toFixed(1).replace('.', ',')}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
