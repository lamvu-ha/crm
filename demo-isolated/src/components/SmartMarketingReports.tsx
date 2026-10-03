import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  Sparkles,
  Filter,
  CheckCircle2,
  Calendar,
  Building2,
  Share2,
  ArrowUpRight,
  Target,
  Flame,
  Award,
  HelpCircle,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  DollarSign,
  Users
} from 'lucide-react';
import { Lead, SalesMember } from '../types';
import { 
  DateFilterRange, 
  DATE_FILTER_OPTIONS, 
  isLeadInDateRange 
} from '../utils/dateFilterUtils';

interface SmartMarketingReportsProps {
  leads: Lead[];
  currentUser: SalesMember;
  onNavigateToLeads?: (filter: { dataSource?: string; project?: string; status?: string }) => void;
  onOpenAddLead?: () => void;
}

// Brand color palette for charts
const SOURCE_COLORS = [
  '#2563eb', // Facebook Ads (Blue)
  '#ea580c', // Google Ads (Orange)
  '#059669', // Hotline (Emerald)
  '#0284c7', // Zalo OA (Sky)
  '#7c3aed', // Giới thiệu (Purple)
  '#db2777', // TikTok / Reels (Pink)
  '#d97706', // Sự kiện / Triển lãm (Amber)
  '#475569', // File CSV / Khác (Slate)
  '#0d9488', // Web Landing Page (Teal)
  '#e11d48'  // Banner / Báo chí (Rose)
];

const PROJECT_COLORS = [
  '#3b82f6', // Project 1
  '#10b981', // Project 2
  '#f59e0b', // Project 3
  '#8b5cf6', // Project 4
  '#ec4899', // Project 5
  '#06b6d4', // Project 6
  '#64748b'  // Others
];

export const SmartMarketingReports: React.FC<SmartMarketingReportsProps> = ({
  leads,
  currentUser,
  onNavigateToLeads,
  onOpenAddLead
}) => {
  // Filters state
  const [dateRange, setDateRange] = useState<DateFilterRange>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'projects' | 'matrix'>('overview');

  // 1. Filtered Leads based on current controls
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Date filter
      if (!isLeadInDateRange(lead, dateRange, customStart, customEnd, 'createdAt')) {
        return false;
      }
      // Project filter
      if (selectedProjectFilter !== 'all' && (lead.project || 'Khác') !== selectedProjectFilter) {
        return false;
      }
      // Source filter
      if (selectedSourceFilter !== 'all' && (lead.dataSource || 'Khác') !== selectedSourceFilter) {
        return false;
      }
      return true;
    });
  }, [leads, dateRange, customStart, customEnd, selectedProjectFilter, selectedSourceFilter]);

  // Unique list of projects and sources for dropdowns
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.project && l.project.trim()) set.add(l.project.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.dataSource && l.dataSource.trim()) set.add(l.dataSource.trim());
    });
    return Array.from(set).sort();
  }, [leads]);

  // 2. High-level Conversion KPIs
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    let closed = 0;
    let negotiating = 0;
    let viewing = 0;
    let potential = 0;
    let newLeads = 0;
    let lost = 0;

    filteredLeads.forEach((l) => {
      if (l.status === 'Đã chốt') closed++;
      else if (l.status === 'Đàm phán / Cọc') negotiating++;
      else if (l.status === 'Hẹn xem BĐS') viewing++;
      else if (l.status === 'Tiềm năng') potential++;
      else if (l.status === 'Khách mới') newLeads++;
      else if (l.status === 'Không nhu cầu' || l.status === 'Nhầm số') lost++;
    });

    const closeRate = total > 0 ? (closed / total) * 100 : 0;
    const deepFunnelCount = closed + negotiating + viewing;
    const deepFunnelRate = total > 0 ? (deepFunnelCount / total) * 100 : 0;
    const contactableCount = total - lost;
    const contactableRate = total > 0 ? (contactableCount / total) * 100 : 0;

    return {
      total,
      closed,
      negotiating,
      viewing,
      potential,
      newLeads,
      lost,
      closeRate,
      deepFunnelCount,
      deepFunnelRate,
      contactableCount,
      contactableRate
    };
  }, [filteredLeads]);

  // 3. Analytics grouped by DATA SOURCE
  const sourceStats = useMemo(() => {
    const map: Record<string, {
      source: string;
      total: number;
      newLeads: number;
      potential: number;
      viewing: number;
      negotiating: number;
      closed: number;
      lost: number;
    }> = {};

    filteredLeads.forEach((l) => {
      const src = l.dataSource && l.dataSource.trim() ? l.dataSource.trim() : 'Nguồn chưa xác định';
      if (!map[src]) {
        map[src] = {
          source: src,
          total: 0,
          newLeads: 0,
          potential: 0,
          viewing: 0,
          negotiating: 0,
          closed: 0,
          lost: 0
        };
      }
      map[src].total += 1;
      if (l.status === 'Đã chốt') map[src].closed += 1;
      else if (l.status === 'Đàm phán / Cọc') map[src].negotiating += 1;
      else if (l.status === 'Hẹn xem BĐS') map[src].viewing += 1;
      else if (l.status === 'Tiềm năng') map[src].potential += 1;
      else if (l.status === 'Khách mới') map[src].newLeads += 1;
      else if (l.status === 'Không nhu cầu' || l.status === 'Nhầm số') map[src].lost += 1;
    });

    return Object.values(map)
      .map((item) => {
        const closeRate = item.total > 0 ? (item.closed / item.total) * 100 : 0;
        const interestRate = item.total > 0 ? ((item.potential + item.viewing + item.negotiating + item.closed) / item.total) * 100 : 0;
        const lostRate = item.total > 0 ? (item.lost / item.total) * 100 : 0;

        let qualityScore: 'Xuất sắc' | 'Tốt' | 'Khá' | 'Cần tối ưu';
        if (closeRate >= 15 || interestRate >= 50) qualityScore = 'Xuất sắc';
        else if (closeRate >= 8 || interestRate >= 35) qualityScore = 'Tốt';
        else if (closeRate >= 4 || interestRate >= 20) qualityScore = 'Khá';
        else qualityScore = 'Cần tối ưu';

        return {
          ...item,
          closeRate: Number(closeRate.toFixed(1)),
          interestRate: Number(interestRate.toFixed(1)),
          lostRate: Number(lostRate.toFixed(1)),
          qualityScore
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  // 4. Analytics grouped by PROJECT
  const projectStats = useMemo(() => {
    const map: Record<string, {
      project: string;
      total: number;
      potential: number;
      viewing: number;
      negotiating: number;
      closed: number;
      topSourceMap: Record<string, number>;
    }> = {};

    filteredLeads.forEach((l) => {
      const proj = l.project && l.project.trim() ? l.project.trim() : 'Dự án khác';
      const src = l.dataSource || 'Khác';
      if (!map[proj]) {
        map[proj] = {
          project: proj,
          total: 0,
          potential: 0,
          viewing: 0,
          negotiating: 0,
          closed: 0,
          topSourceMap: {}
        };
      }
      map[proj].total += 1;
      map[proj].topSourceMap[src] = (map[proj].topSourceMap[src] || 0) + 1;

      if (l.status === 'Đã chốt') map[proj].closed += 1;
      else if (l.status === 'Đàm phán / Cọc') map[proj].negotiating += 1;
      else if (l.status === 'Hẹn xem BĐS') map[proj].viewing += 1;
      else if (l.status === 'Tiềm năng') map[proj].potential += 1;
    });

    return Object.values(map)
      .map((item) => {
        const closeRate = item.total > 0 ? (item.closed / item.total) * 100 : 0;
        const viewingRate = item.total > 0 ? (item.viewing / item.total) * 100 : 0;
        
        // Find top source for this project
        let topSource = 'Không rõ';
        let maxCount = 0;
        Object.entries(item.topSourceMap).forEach(([src, count]) => {
          if (count > maxCount) {
            maxCount = count;
            topSource = src;
          }
        });

        return {
          ...item,
          closeRate: Number(closeRate.toFixed(1)),
          viewingRate: Number(viewingRate.toFixed(1)),
          topSource,
          topSourceCount: maxCount
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredLeads]);

  // 5. Pie chart data for Data Sources (Market Share)
  const sourcePieData = useMemo(() => {
    const total = kpis.total;
    if (total === 0) return [];
    return sourceStats.map((item) => ({
      name: item.source,
      value: item.total,
      percentage: Number(((item.total / total) * 100).toFixed(1)),
      closed: item.closed,
      closeRate: item.closeRate
    }));
  }, [sourceStats, kpis.total]);

  // 6. Pie chart data for Projects
  const projectPieData = useMemo(() => {
    const total = kpis.total;
    if (total === 0) return [];
    return projectStats.map((item) => ({
      name: item.project,
      value: item.total,
      percentage: Number(((item.total / total) * 100).toFixed(1)),
      closed: item.closed,
      closeRate: item.closeRate
    }));
  }, [projectStats, kpis.total]);

  // 7. Cross-Matrix of Data Source vs Projects (Lead count & closed deals)
  const crossMatrix = useMemo(() => {
    const sources = sourceStats.slice(0, 6).map((s) => s.source);
    const projects = projectStats.slice(0, 6).map((p) => p.project);

    const matrix: Record<string, Record<string, { total: number; closed: number }>> = {};
    sources.forEach((s) => {
      matrix[s] = {};
      projects.forEach((p) => {
        matrix[s][p] = { total: 0, closed: 0 };
      });
    });

    filteredLeads.forEach((l) => {
      const src = l.dataSource || 'Khác';
      const proj = l.project || 'Khác';
      if (matrix[src] && matrix[src][proj]) {
        matrix[src][proj].total += 1;
        if (l.status === 'Đã chốt') matrix[src][proj].closed += 1;
      }
    });

    return {
      sources,
      projects,
      matrix
    };
  }, [filteredLeads, sourceStats, projectStats]);

  // 8. Smart Marketing Recommendations & Actionable Insights
  const smartInsights = useMemo(() => {
    const insights: Array<{
      type: 'success' | 'warning' | 'info';
      title: string;
      description: string;
      tag: string;
    }> = [];

    // Best converting source
    const bestSource = [...sourceStats].sort((a, b) => b.closeRate - a.closeRate)[0];
    if (bestSource && bestSource.total >= 3) {
      insights.push({
        type: 'success',
        title: `Kênh "${bestSource.source}" đạt tỷ lệ chốt cao nhất (${bestSource.closeRate}%)`,
        description: `Với ${bestSource.total} leads đã chốt được ${bestSource.closed} giao dịch. Đây là tệp khách hàng tiềm năng cao nhất, đề xuất ưu tiên tăng thêm 20-30% ngân sách marketing cho kênh này.`,
        tag: 'Khuyến nghị ngân sách'
      });
    }

    // Source with highest volume but lowest conversion
    const highVolLowConv = [...sourceStats]
      .filter((s) => s.total >= 5)
      .sort((a, b) => b.total - a.total)[0];
    if (highVolLowConv && highVolLowConv.closeRate < 5) {
      insights.push({
        type: 'warning',
        title: `Kênh "${highVolLowConv.source}" có lượng lead lớn (${highVolLowConv.total}) nhưng tỷ lệ chốt thấp (${highVolLowConv.closeRate}%)`,
        description: `Tỷ lệ khách không nhu cầu / mất liên lạc chiếm ${highVolLowConv.lostRate}%. Cần rà soát lại thông điệp quảng cáo (ad copy) và targeting để lọc bớt khách hàng không đúng phân khúc tài chính.`,
        tag: 'Tối ưu tệp quảng cáo'
      });
    }

    // Best project
    const bestProject = [...projectStats].sort((a, b) => b.closed - a.closed)[0];
    if (bestProject && bestProject.closed > 0) {
      insights.push({
        type: 'info',
        title: `Dự án "${bestProject.project}" có sức hút mạnh nhất sàn`,
        description: `Đã có ${bestProject.closed} giao dịch thành công trên tổng ${bestProject.total} khách hỏi (${bestProject.closeRate}% tỷ lệ chốt). Kênh kéo khách mạnh nhất cho dự án này là "${bestProject.topSource}".`,
        tag: 'Dự án trọng điểm'
      });
    }

    // Lead quality ratio
    if (kpis.deepFunnelRate >= 30) {
      insights.push({
        type: 'success',
        title: `Chỉ số quan tâm sâu (Deep Funnel) đạt mức xuất sắc ${kpis.deepFunnelRate.toFixed(1)}%`,
        description: `Có ${kpis.deepFunnelCount} khách hàng đang ở các bước Hẹn xem, Đàm phán hoặc Đã chốt. Đội ngũ Sale đang chuyển đổi lead từ Marketing rất hiệu quả.`,
        tag: 'Hiệu quả tư vấn'
      });
    } else if (kpis.total > 10) {
      insights.push({
        type: 'warning',
        title: `Cần đẩy mạnh chuyển đổi sang bước "Hẹn xem BĐS thực tế"`,
        description: `Hiện tại tỷ lệ khách đi xem nhà chỉ đạt ${(kpis.total > 0 ? (kpis.viewing / kpis.total) * 100 : 0).toFixed(1)}%. Bất động sản chỉ có thể chốt sau khi khách trực tiếp thị sát sa bàn hoặc căn mẫu.`,
        tag: 'Quy trình Sale'
      });
    }

    return insights;
  }, [sourceStats, projectStats, kpis]);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Banner / Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-7 shadow-xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold mb-2.5 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Báo cáo thông minh • Recharts Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Hiệu quả marketing & tỷ lệ chuyển đổi</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1.5 max-w-2xl leading-relaxed">
              Trực quan hóa đa chiều tỷ lệ chuyển đổi khách hàng theo từng nguồn dữ liệu (Data Source) và theo từng dự án bất động sản, giúp Quản trị viên tối ưu chi phí quảng cáo và gia tăng doanh số.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 backdrop-blur-md transition-all shadow-sm flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>In / xuất báo cáo</span>
            </button>
            {onOpenAddLead && (
              <button
                type="button"
                onClick={onOpenAddLead}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <span>+ Thêm lead mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Navigation Tabs inside Report View */}
        <div className="flex items-center space-x-1 sm:space-x-2 mt-6 pt-4 border-t border-white/10 overflow-x-auto touch-scroll no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Tổng Quan & Chỉ Số</span>
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'sources'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Nguồn dữ liệu (Data Sources)</span>
            <span className="px-1.5 py-0.2 bg-black/20 text-[10px] rounded-full">{sourceStats.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'projects'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Dự án bất động sản</span>
            <span className="px-1.5 py-0.2 bg-black/20 text-[10px] rounded-full">{projectStats.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Ma trận nguồn x dự án</span>
          </button>
        </div>
      </div>

      {/* Filter Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Lọc báo cáo:</span>
          </div>

          {/* Time Preset Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateFilterRange)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            {DATE_FILTER_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                📅 {opt.label}
              </option>
            ))}
          </select>

          {/* Project Dropdown */}
          <select
            value={selectedProjectFilter}
            onChange={(e) => setSelectedProjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            <option value="all">🏢 Tất cả Dự án ({allProjects.length})</option>
            {allProjects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Data Source Dropdown */}
          <select
            value={selectedSourceFilter}
            onChange={(e) => setSelectedSourceFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
          >
            <option value="all">🎯 Tất cả Nguồn dữ liệu ({allSources.length})</option>
            {allSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Live Filter Indicator */}
        <div className="text-xs text-slate-500 font-medium">
          Đang hiển thị <span className="font-bold font-mono text-slate-900">{filteredLeads.length}</span> / {leads.length} Leads
          {(selectedProjectFilter !== 'all' || selectedSourceFilter !== 'all' || dateRange !== 'all') && (
            <button
              onClick={() => {
                setDateRange('all');
                setSelectedProjectFilter('all');
                setSelectedSourceFilter('all');
              }}
              className="ml-2 text-rose-600 hover:text-rose-700 underline font-bold"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Leads */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Tổng Lead Marketing</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            {kpis.total}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Toàn bộ khách đẩy về</p>
        </div>

        {/* Card 2: Contactable Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Tỷ Lệ Kết Nối Được</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono">
            {kpis.contactableRate.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{kpis.contactableCount}/{kpis.total} có nhu cầu thực</p>
        </div>

        {/* Card 3: Deep Funnel (Viewing + Negotiating) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Khách xem nhà & cọc</span>
            <Flame className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1 font-mono">
            {kpis.viewing + kpis.negotiating}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Giai đoạn quyết định</p>
        </div>

        {/* Card 4: Deals Closed */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Giao dịch đã chốt</span>
            <Award className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1 font-mono">
            {kpis.closed}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Deal hoàn thành</p>
        </div>

        {/* Card 5: Overall Close Rate */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Tỷ lệ chốt deal</span>
            <Target className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 font-mono">
            {kpis.closeRate.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">Hiệu suất sàn</p>
        </div>

        {/* Card 6: Top Channel */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span>Kênh chủ lực</span>
            <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 mt-1 truncate" title={sourceStats[0]?.source || 'Chưa có'}>
            {sourceStats[0]?.source || 'Chưa có'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">
            {sourceStats[0] ? `${sourceStats[0].total} leads (${sourceStats[0].closeRate}% chốt)` : '---'}
          </p>
        </div>
      </div>

      {/* SECTION 1: NGUỒN DỮ LIỆU (DATA SOURCES CONVERSION) */}
      {(activeTab === 'overview' || activeTab === 'sources') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-600" />
              <span>Hiệu quả chuyển đổi theo từng nguồn dữ liệu (Data Sources)</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Đo lường từ Lead đổ về đến Hẹn xem & Chốt hợp đồng
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 1: Composed Chart - Volume and Conversion Rate per Data Source */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Phễu Chuyển Đổi & Tỷ Lệ Chốt Theo Kênh Marketing
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cột: Số lượng Lead (Khách mới, Tiềm năng, Đã chốt) • Đường đỏ: Tỷ lệ chốt deal (%)
                  </p>
                </div>
              </div>

              <div className="w-full h-80">
                {sourceStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Không có dữ liệu nguồn khách hàng phù hợp với bộ lọc
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={sourceStats}
                      margin={{ top: 20, right: 20, bottom: 40, left: -10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="source"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                        height={50}
                      />
                      <YAxis 
                        yAxisId="left" 
                        orientation="left" 
                        stroke="#64748b" 
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        stroke="#e11d48" 
                        tick={{ fontSize: 11, fill: '#e11d48' }}
                        unit="%" 
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-amber-400 text-sm border-b border-slate-800 pb-1">{label}</p>
                                <p className="flex justify-between gap-4 text-slate-300">
                                  <span>Tổng số Lead:</span>
                                  <span className="font-bold font-mono text-white">{data.total}</span>
                                </p>
                                <p className="flex justify-between gap-4 text-sky-300">
                                  <span>Tiềm năng / Hẹn xem:</span>
                                  <span className="font-bold font-mono">{data.potential + data.viewing}</span>
                                </p>
                                <p className="flex justify-between gap-4 text-emerald-400">
                                  <span>Đã chốt hợp đồng:</span>
                                  <span className="font-bold font-mono">{data.closed} deal</span>
                                </p>
                                <p className="flex justify-between gap-4 text-rose-400 font-bold border-t border-slate-800 pt-1">
                                  <span>Tỷ lệ chốt:</span>
                                  <span className="font-mono">{data.closeRate}%</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} 
                      />
                      <Bar yAxisId="left" dataKey="total" name="Tổng Lead" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={38} />
                      <Bar yAxisId="left" dataKey="potential" name="Khách Tiềm Năng" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={38} />
                      <Bar yAxisId="left" dataKey="closed" name="Đã Chốt" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={38} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="closeRate"
                        name="Tỷ lệ chốt (%)"
                        stroke="#e11d48"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#e11d48', strokeWidth: 2, stroke: '#ffffff' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Donut Chart - Lead Share by Source */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>Cơ cấu nguồn khách hàng</span>
                  <PieIcon className="w-4 h-4 text-amber-600" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tỷ trọng % đóng góp của từng kênh Marketing
                </p>
              </div>

              <div className="w-full h-56 relative my-2">
                {sourcePieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourcePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {sourcePieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-amber-400">{data.name}</p>
                                <p>Số lượng: <span className="font-bold font-mono">{data.value}</span> khách ({data.percentage}%)</p>
                                <p>Chốt: <span className="font-bold font-mono text-emerald-400">{data.closed}</span> deal ({data.closeRate}%)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center Badge inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Lead</span>
                  <span className="text-xl font-black text-slate-800 font-mono">{kpis.total}</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto touch-scroll pr-1">
                {sourcePieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center space-x-2 truncate max-w-[170px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: SOURCE_COLORS[idx % SOURCE_COLORS.length] }}
                      />
                      <span className="text-slate-700 font-semibold truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-slate-500 text-[11px] shrink-0">
                      <span>{item.value}</span>
                      <span className="font-bold text-slate-800 w-9 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Data Source Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Bảng xếp hạng & đánh giá chất lượng nguồn khách hàng
                </h3>
                <p className="text-xs text-slate-400">
                  Click vào tên nguồn để lọc danh sách khách hàng tương ứng trên CRM
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {sourceStats.length} kênh tiếp thị
              </span>
            </div>

            <div className="overflow-x-auto touch-scroll">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-4">Kênh marketing (Data Source)</th>
                    <th className="py-3 px-3 text-center">Tổng lead</th>
                    <th className="py-3 px-3 text-center">Khách mới</th>
                    <th className="py-3 px-3 text-center">Tiềm năng</th>
                    <th className="py-3 px-3 text-center">Hẹn xem nhà</th>
                    <th className="py-3 px-3 text-center">Đã chốt deal</th>
                    <th className="py-3 px-3 text-right">Tỷ lệ chốt</th>
                    <th className="py-3 px-3 text-center">Đánh giá kênh</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sourceStats.map((src, index) => (
                    <tr key={src.source} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }}
                          />
                          <span className="font-bold text-slate-900 truncate max-w-[200px]" title={src.source}>
                            {src.source}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {src.total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-sky-600 font-semibold">
                        {src.newLeads}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-purple-600 font-semibold">
                        {src.potential}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {src.viewing}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600 font-bold">
                        {src.closed}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        <span className={`px-2 py-0.5 rounded-md ${
                          src.closeRate >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {src.closeRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          src.qualityScore === 'Xuất sắc'
                            ? 'bg-emerald-100 text-emerald-800'
                            : src.qualityScore === 'Tốt'
                            ? 'bg-blue-100 text-blue-800'
                            : src.qualityScore === 'Khá'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {src.qualityScore}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onNavigateToLeads && (
                          <button
                            type="button"
                            onClick={() => onNavigateToLeads({ dataSource: src.source })}
                            className="text-amber-600 hover:text-amber-700 font-bold text-[11px] hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Xem Lead</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: HIỆU QUẢ THEO DỰ ÁN BẤT ĐỘNG SẢN (PROJECT CONVERSION) */}
      {(activeTab === 'overview' || activeTab === 'projects') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-600" />
              <span>Hiệu quả chuyển đổi theo từng dự án bất động sản</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Phân tích sức hút dự án và tỷ lệ chuyển đổi cọc thành công
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Chart 3: Horizontal Bar Chart - Conversion by Project */}
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Số khách tiếp nhận & số lượt chốt hợp đồng theo dự án
                  </h3>
                  <p className="text-xs text-slate-400">
                    So sánh khối lượng quan tâm và hiệu quả chốt cọc thực tế
                  </p>
                </div>
              </div>

              <div className="w-full h-80">
                {projectStats.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Không có dữ liệu dự án phù hợp
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={projectStats}
                      margin={{ top: 20, right: 20, bottom: 40, left: -10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="project"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                        height={50}
                      />
                      <YAxis stroke="#64748b" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-amber-400 text-sm border-b border-slate-800 pb-1">{label}</p>
                                <p className="flex justify-between gap-4 text-slate-300">
                                  <span>Tổng lượt hỏi:</span>
                                  <span className="font-bold font-mono text-white">{data.total} khách</span>
                                </p>
                                <p className="flex justify-between gap-4 text-indigo-300">
                                  <span>Đi xem nhà mẫu:</span>
                                  <span className="font-bold font-mono">{data.viewing} lượt</span>
                                </p>
                                <p className="flex justify-between gap-4 text-emerald-400">
                                  <span>Đã chốt cọc:</span>
                                  <span className="font-bold font-mono">{data.closed} deal</span>
                                </p>
                                <p className="flex justify-between gap-4 text-amber-300 border-t border-slate-800 pt-1">
                                  <span>Tỷ lệ chốt:</span>
                                  <span className="font-mono font-bold">{data.closeRate}%</span>
                                </p>
                                <p className="flex justify-between gap-4 text-slate-400 text-[10px]">
                                  <span>Kênh hút khách nhất:</span>
                                  <span className="font-bold text-white">{data.topSource}</span>
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                      <Bar dataKey="total" name="Lượt khách quan tâm" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={42} />
                      <Bar dataKey="viewing" name="Hẹn đi xem thực tế" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={42} />
                      <Bar dataKey="closed" name="Đã chốt hợp đồng" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={42} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 4: Donut Chart - Lead Share by Project */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span>Thị phần khách theo dự án</span>
                  <Building2 className="w-4 h-4 text-amber-600" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mức độ tập trung nhu cầu khách hàng theo rổ hàng
                </p>
              </div>

              <div className="w-full h-56 relative my-2">
                {projectPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Không có dữ liệu
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {projectPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                                <p className="font-bold text-amber-400">{data.name}</p>
                                <p>Quan tâm: <span className="font-bold font-mono">{data.value}</span> khách ({data.percentage}%)</p>
                                <p>Đã chốt: <span className="font-bold font-mono text-emerald-400">{data.closed}</span> ({data.closeRate}%)</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center Badge inside donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Dự Án</span>
                  <span className="text-xl font-black text-slate-800 font-mono">{projectStats.length}</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto touch-scroll pr-1">
                {projectPieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center space-x-2 truncate max-w-[170px]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: PROJECT_COLORS[idx % PROJECT_COLORS.length] }}
                      />
                      <span className="text-slate-700 font-semibold truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono text-slate-500 text-[11px] shrink-0">
                      <span>{item.value}</span>
                      <span className="font-bold text-slate-800 w-9 text-right">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Conversion Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Bảng Chi Tiết Tỷ Lệ Chuyển Đổi Theo Dự Án
                </h3>
                <p className="text-xs text-slate-400">
                  Xác định dự án có tốc độ hấp thụ tốt và kênh marketing chủ lực tương ứng
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {projectStats.length} Dự án đang bán
              </span>
            </div>

            <div className="overflow-x-auto touch-scroll">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase tracking-wider text-[10px] font-black">
                    <th className="py-3 px-4">Tên dự án</th>
                    <th className="py-3 px-3 text-center">Tổng quan tâm</th>
                    <th className="py-3 px-3 text-center">Tiềm năng cao</th>
                    <th className="py-3 px-3 text-center">Đi xem sa bàn / nhà mẫu</th>
                    <th className="py-3 px-3 text-center">Đã chốt cọc</th>
                    <th className="py-3 px-3 text-right">Tỷ lệ chốt</th>
                    <th className="py-3 px-3">Kênh marketing chủ lực</th>
                    <th className="py-3 px-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectStats.map((proj, index) => (
                    <tr key={proj.project} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: PROJECT_COLORS[index % PROJECT_COLORS.length] }}
                          />
                          <span className="font-bold text-slate-900 truncate max-w-[220px]" title={proj.project}>
                            {proj.project}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {proj.total}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-purple-600 font-semibold">
                        {proj.potential}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-indigo-600 font-semibold">
                        {proj.viewing}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-emerald-600 font-bold">
                        {proj.closed}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                        <span className={`px-2 py-0.5 rounded-md ${
                          proj.closeRate >= 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {proj.closeRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800">
                          {proj.topSource} ({proj.topSourceCount})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {onNavigateToLeads && (
                          <button
                            type="button"
                            onClick={() => onNavigateToLeads({ project: proj.project })}
                            className="text-amber-600 hover:text-amber-700 font-bold text-[11px] hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Xem lead</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MA TRẬN CHÉO NGUỒN LEAD x DỰ ÁN (CROSS-CHANNEL MATRIX) */}
      {(activeTab === 'overview' || activeTab === 'matrix') && crossMatrix.sources.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600" />
                <span>Ma trận tương quan: Nguồn dữ liệu × Dự án bất động sản</span>
              </h3>
              <p className="text-xs text-slate-400">
                Hiển thị số lượng Lead & Deal chốt (VD: 15 / 2 deal) giữa từng kênh tiếp thị và từng dự án
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Chỉ số: <span className="font-bold text-slate-700">Tổng lead</span> / <span className="font-bold text-emerald-600">Đã chốt</span>
            </span>
          </div>

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-xs border border-slate-100">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-black text-[11px] border-b border-slate-200">
                  <th className="py-2.5 px-3 bg-slate-100">Nguồn lead \ Dự án</th>
                  {crossMatrix.projects.map((proj) => (
                    <th key={proj} className="py-2.5 px-3 text-center truncate max-w-[150px]" title={proj}>
                      {proj}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {crossMatrix.sources.map((src) => (
                  <tr key={src} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-bold text-slate-900 bg-slate-50/50 truncate max-w-[160px]" title={src}>
                      {src}
                    </td>
                    {crossMatrix.projects.map((proj) => {
                      const cell = crossMatrix.matrix[src]?.[proj] || { total: 0, closed: 0 };
                      const hasDeal = cell.closed > 0;
                      return (
                        <td
                          key={proj}
                          className={`py-2.5 px-3 text-center font-mono ${
                            hasDeal ? 'bg-emerald-50/70 font-bold' : cell.total > 0 ? 'bg-blue-50/40' : 'text-slate-300'
                          }`}
                        >
                          {cell.total > 0 ? (
                            <span>
                              <span className="text-slate-800">{cell.total}</span>
                              {hasDeal && (
                                <span className="text-emerald-700 ml-1 font-black">
                                  ({cell.closed} chốt)
                                </span>
                              )}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: SMART MARKETING INSIGHTS & RECOMMENDATIONS */}
      <div className="bg-gradient-to-br from-amber-50/60 via-white to-indigo-50/40 p-5 sm:p-6 rounded-3xl border border-amber-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-sm">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">
                Gợi Ý Chiến Lược Tối Ưu Marketing Thông Minh
              </h3>
              <p className="text-xs text-slate-500">
                Hệ thống tự động phân tích dữ liệu chuyển đổi để đưa ra khuyến nghị thực thi cho Quản trị viên
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-200">
            {smartInsights.length} Khuyến nghị
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {smartInsights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                insight.type === 'success'
                  ? 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950'
                  : insight.type === 'warning'
                  ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                  : 'bg-indigo-50/70 border-indigo-200/90 text-indigo-950'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 shadow-2xs">
                  {insight.tag}
                </span>
                {insight.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {insight.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                {insight.type === 'info' && <TrendingUp className="w-4 h-4 text-indigo-600" />}
              </div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 mb-1">
                {insight.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
