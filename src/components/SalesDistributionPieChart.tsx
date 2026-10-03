import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import {
  PieChart as PieIcon,
  Users,
  Target,
  CheckCircle2,
  Flame,
  Award,
  Filter,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Lead, SalesMember } from '../types';

interface SalesDistributionPieChartProps {
  leads: Lead[];
  salesMembers?: SalesMember[];
  onSelectSale?: (saleName: string) => void;
}

// Distinct, professional color palette for sales members
const SALES_PALETTE = [
  '#f59e0b', // Amber-500
  '#3b82f6', // Blue-500
  '#10b981', // Emerald-500
  '#8b5cf6', // Violet-500
  '#ec4899', // Pink-500
  '#06b6d4', // Cyan-500
  '#f97316', // Orange-500
  '#6366f1', // Indigo-500
  '#14b8a6', // Teal-500
  '#84cc16', // Lime-500
  '#a855f7', // Purple-500
  '#e11d48', // Rose-600
  '#64748b'  // Slate-500
];

type MetricType = 'total' | 'potential' | 'closed';

export const SalesDistributionPieChart: React.FC<SalesDistributionPieChartProps> = ({
  leads,
  salesMembers = [],
  onSelectSale
}) => {
  const [metric, setMetric] = useState<MetricType>('total');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'sale' | 'tpkd'>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Compute stats per sales member
  const { chartData, totalCount, activeSalesCount, topPerformer } = useMemo(() => {
    const map: Record<string, { total: number; potential: number; closed: number }> = {};

    leads.forEach((lead) => {
      const assignee = (lead.assignee || '').trim() || 'Chưa phân bổ';
      if (!map[assignee]) {
        map[assignee] = { total: 0, potential: 0, closed: 0 };
      }
      map[assignee].total += 1;
      if (lead.status === 'Tiềm năng' || lead.status === 'Quan tâm') {
        map[assignee].potential += 1;
      }
      if (lead.status === 'Đã chốt' || lead.status === 'Đàm phán / Cọc') {
        map[assignee].closed += 1;
      }
    });

    // Match with sales members for extra metadata (role, team, avatar)
    const memberRoleMap = new Map<string, SalesMember>();
    salesMembers.forEach((m) => {
      memberRoleMap.set(m.name.trim().toLowerCase(), m);
    });

    const entries = Object.entries(map).map(([name, stats]) => {
      const member = memberRoleMap.get(name.trim().toLowerCase());
      return {
        name,
        total: stats.total,
        potential: stats.potential,
        closed: stats.closed,
        role: member?.role || (name === 'Chưa phân bổ' ? 'none' : 'sale'),
        team: member?.team || 'Đội ngũ BĐS',
        title: member?.title || (name === 'Chưa phân bổ' ? 'Chưa gán Sale' : 'Chuyên viên NVKD')
      };
    });

    // Filter by role if requested
    const filteredEntries = entries.filter((e) => {
      if (selectedRoleFilter === 'all') return true;
      if (selectedRoleFilter === 'sale') return e.role === 'sale';
      if (selectedRoleFilter === 'tpkd') return e.role === 'tpkd' || e.role === 'admin';
      return true;
    });

    // Metric selection
    const rawData = filteredEntries.map((item) => {
      let val = item.total;
      if (metric === 'potential') val = item.potential;
      if (metric === 'closed') val = item.closed;
      return {
        ...item,
        value: val
      };
    }).filter((item) => item.value > 0);

    // Sort descending
    rawData.sort((a, b) => b.value - a.value);

    const sumVal = rawData.reduce((acc, curr) => acc + curr.value, 0);

    const formattedData = rawData.map((item, idx) => ({
      ...item,
      color: SALES_PALETTE[idx % SALES_PALETTE.length],
      percentage: sumVal > 0 ? ((item.value / sumVal) * 100).toFixed(1) : '0.0'
    }));

    return {
      chartData: formattedData,
      totalCount: sumVal,
      activeSalesCount: formattedData.filter((i) => i.name !== 'Chưa phân bổ').length,
      topPerformer: formattedData[0] || null
    };
  }, [leads, salesMembers, metric, selectedRoleFilter]);

  const metricLabel = metric === 'total' 
    ? 'Tổng Lead tiếp nhận' 
    : metric === 'potential' 
    ? 'Lead Tiềm năng / Quan tâm' 
    : 'Deal Đã chốt & Đặt cọc';

  return (
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <PieIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <span>Tỷ lệ phân bổ khách hàng cho nhân viên (NVKD)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                Recharts Analytics
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Biểu đồ trực quan hóa khối lượng Lead và mức độ hoàn thành chỉ tiêu KPI của từng chuyên viên môi giới.
            </p>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Metric Selector */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
            <button
              type="button"
              onClick={() => setMetric('total')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metric === 'total'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tổng Lead
            </button>
            <button
              type="button"
              onClick={() => setMetric('potential')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metric === 'potential'
                  ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tiềm năng
            </button>
            <button
              type="button"
              onClick={() => setMetric('closed')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                metric === 'closed'
                  ? 'bg-white text-emerald-700 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Đã chốt
            </button>
          </div>

          {/* Role Filter */}
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="all">Tất cả thành viên</option>
            <option value="sale">Chỉ chuyên viên NVKD</option>
            <option value="tpkd">Ban Quản lý (TPKD / Admin)</option>
          </select>
        </div>
      </div>

      {/* KPI highlight row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/80">
          <span className="text-[11px] text-amber-800 font-semibold block">Đang hiển thị chỉ tiêu</span>
          <span className="text-sm sm:text-base font-extrabold text-amber-950 font-mono mt-0.5 block truncate">
            {metricLabel}
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Tổng: {totalCount} khách</span>
        </div>

        <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80">
          <span className="text-[11px] text-blue-800 font-semibold block">Nhân sự nhận Lead</span>
          <span className="text-sm sm:text-base font-extrabold text-blue-950 font-mono mt-0.5 block">
            {activeSalesCount} chuyên viên
          </span>
          <span className="text-[10px] text-blue-700 mt-0.5 block">Được phân bổ Lead trên CRM</span>
        </div>

        <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
          <span className="text-[11px] text-emerald-800 font-semibold block">Chuyên viên dẫn đầu</span>
          <span className="text-sm sm:text-base font-extrabold text-emerald-950 mt-0.5 block truncate">
            {topPerformer ? topPerformer.name : 'Chưa có'}
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">
            {topPerformer ? `${topPerformer.value} khách (${topPerformer.percentage}%)` : '0%'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
          <span className="text-[11px] text-indigo-800 font-semibold block">Độ cân bằng phân bổ</span>
          <span className="text-sm sm:text-base font-extrabold text-indigo-950 font-mono mt-0.5 block">
            {activeSalesCount > 0 ? (totalCount / activeSalesCount).toFixed(1) : 0} Lead / Sale
          </span>
          <span className="text-[10px] text-indigo-700 mt-0.5 block">Mức trung bình toàn đội</span>
        </div>
      </div>

      {/* Main Chart and Legend Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Donut Chart (Recharts) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[300px]">
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
              <span>Chưa có dữ liệu khách hàng tương ứng với bộ lọc này.</span>
            </div>
          ) : (
            <div className="w-full h-72 sm:h-80 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                    animationDuration={800}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(entry) => {
                      if (onSelectSale && entry && entry.name) {
                        onSelectSale(entry.name);
                      }
                    }}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={entry.color}
                        stroke={activeIndex === index ? '#0f172a' : '#ffffff'}
                        strokeWidth={activeIndex === index ? 3 : 2}
                        className="transition-all duration-200 hover:opacity-90"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-sm min-w-[190px]">
                            <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: data.color }}
                              />
                              <p className="font-bold text-amber-400 text-sm truncate">{data.name}</p>
                            </div>
                            <p className="text-[11px] text-slate-300">{data.title}</p>
                            <div className="pt-1 space-y-1">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-400">Chỉ số đang xem:</span>
                                <span className="font-bold font-mono text-white">
                                  {data.value} ({data.percentage}%)
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-[11px]">
                                <span className="text-slate-400">Tổng Lead nhận:</span>
                                <span className="font-mono text-amber-300 font-bold">{data.total}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[11px]">
                                <span className="text-slate-400">Khách tiềm năng:</span>
                                <span className="font-mono text-indigo-300 font-bold">{data.potential}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-[11px]">
                                <span className="text-slate-400">Deal đã chốt:</span>
                                <span className="font-mono text-emerald-400 font-bold">{data.closed}</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 italic">
                              💡 Bấm vào phần biểu đồ để lọc xem danh sách khách của Sale này
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Stat in Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Tổng {metric === 'total' ? 'Lead' : metric === 'potential' ? 'Tiềm Năng' : 'Đã Chốt'}
                </span>
                <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {totalCount}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {activeSalesCount} nhân viên
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Breakdown List / Table (Detailed KPI view for Admin) */}
        <div className="lg:col-span-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span>Chi tiết phân bổ từng nhân sự</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Click vào nhân sự để lọc danh sách
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto touch-scroll pr-1 space-y-1.5">
            {chartData.map((item, idx) => {
              const isHovered = activeIndex === idx;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onClick={() => onSelectSale && onSelectSale(item.name)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isHovered
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  {/* Left: Color dot & Name */}
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                    <span
                      className="w-3.5 h-3.5 rounded-md shrink-0 shadow-2xs transition-transform"
                      style={{
                        backgroundColor: item.color,
                        transform: isHovered ? 'scale(1.2)' : 'scale(1)'
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {item.name}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-black rounded-full uppercase shrink-0">
                            TOP 1
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.title}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Progress Bar */}
                  <div className="w-24 hidden sm:block">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Right: Count and Percentage */}
                  <div className="text-right shrink-0">
                    <div className="font-black text-xs text-slate-900 font-mono">
                      {item.value} <span className="text-[10px] font-semibold text-slate-500 font-sans">khách</span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 font-mono">
                      {item.percentage}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Guidance Note */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Dữ liệu đồng bộ tức thời với cơ chế chia Round-Robin & quy định SLA CRM</span>
            </span>
            <span className="font-bold text-amber-700 shrink-0 hidden sm:inline">
              ✓ Chuẩn BĐS MAY_MH5.19
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
