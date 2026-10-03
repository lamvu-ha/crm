import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  Target,
  Award,
  Calendar,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Clock,
  HelpCircle,
  ChevronRight,
  Filter,
  Users,
  Flame,
  ArrowUpRight,
  Zap,
  Building
} from 'lucide-react';
import { Lead, Appointment, SalesMember } from '../types';

export interface SaleConversionPieChartProps {
  leads: Lead[];
  saleName: string;
  salesMember?: SalesMember;
  appointments?: Appointment[];
  variant?: 'full' | 'card' | 'compact';
  onOpenLead?: (lead: Lead) => void;
  className?: string;
}

export interface FunnelSlice {
  name: string;
  value: number;
  color: string;
  percentage: number;
  description: string;
  leads: Lead[];
}

export const SaleConversionPieChart: React.FC<SaleConversionPieChartProps> = ({
  leads,
  saleName,
  salesMember,
  appointments = [],
  variant = 'card',
  onOpenLead,
  className = ''
}) => {
  const [timeFilter, setTimeFilter] = useState<'all' | 'month' | 'week'>('all');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Normalize sale name
  const targetSaleName = (saleName || '').trim();

  // Filter leads for this sale and time range
  const {
    filteredLeads,
    totalLeads,
    pieData,
    appointmentConvertedCount,
    closedCount,
    overallMeetingRate,
    closingFromMeetingRate,
    performanceTier,
    coachingAdvice
  } = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Filter by assignee
    const saleLeads = leads.filter((l) => {
      const assignee = (l.assignee || '').trim().toLowerCase();
      return assignee === targetSaleName.toLowerCase();
    });

    // 2. Filter by time
    const filtered = saleLeads.filter((l) => {
      if (timeFilter === 'all') return true;
      const createdDate = new Date(l.createdAt);
      if (isNaN(createdDate.getTime())) return true;
      if (timeFilter === 'week') return createdDate >= sevenDaysAgo;
      if (timeFilter === 'month') return createdDate >= firstDayOfMonth;
      return true;
    });

    const total = filtered.length;

    // Slices buckets
    const bucketClosed: Lead[] = []; // Đã chốt, Đàm phán cọc
    const bucketViewing: Lead[] = []; // Hẹn xem BĐS
    const bucketWorking: Lead[] = []; // Đang chăm sóc, Quan tâm, Tiềm năng, Gửi thông tin
    const bucketEarly: Lead[] = []; // Khách mới, Không nghe máy, Gọi lại sau, Máy bận, Thuê bao
    const bucketLost: Lead[] = []; // Không nhu cầu, Nhầm số, Khác

    filtered.forEach((lead) => {
      const st = lead.status;
      const hasAppt = appointments.some(
        (a) => a.leadId === lead.id && a.status !== 'Đã huỷ'
      );

      if (st === 'Đã chốt' || st === 'Đàm phán / Cọc') {
        bucketClosed.push(lead);
      } else if (st === 'Hẹn xem BĐS' || hasAppt) {
        bucketViewing.push(lead);
      } else if (
        st === 'Tiềm năng' ||
        st === 'Quan tâm' ||
        st === 'Đang chăm sóc' ||
        st === 'Gửi thông tin'
      ) {
        bucketWorking.push(lead);
      } else if (
        st === 'Khách mới' ||
        st === 'Không nghe máy' ||
        st === 'Gọi lại sau' ||
        st === 'Máy bận' ||
        st === 'Thuê bao'
      ) {
        bucketEarly.push(lead);
      } else {
        bucketLost.push(lead);
      }
    });

    // Count of all leads that reached meeting/viewing stage or beyond
    const viewingCount = bucketViewing.length;
    const closedDealCount = bucketClosed.length;
    const totalMeetingConverted = viewingCount + closedDealCount;

    const rateMeeting = total > 0 ? (totalMeetingConverted / total) * 100 : 0;
    const rateClosedFromMeeting =
      totalMeetingConverted > 0 ? (closedDealCount / totalMeetingConverted) * 100 : 0;

    // Define slices
    const data: FunnelSlice[] = [
      {
        name: 'Hẹn xem BĐS thực tế',
        value: viewingCount,
        color: '#8b5cf6', // Violet
        percentage: total > 0 ? Math.round((viewingCount / total) * 1000) / 10 : 0,
        description: 'Đã lên lịch hoặc đang dẫn khách xem thực địa BĐS',
        leads: bucketViewing
      },
      {
        name: 'Đàm phán & Đã chốt cọc',
        value: closedDealCount,
        color: '#10b981', // Emerald
        percentage: total > 0 ? Math.round((closedDealCount / total) * 1000) / 10 : 0,
        description: 'Đã hoàn thành bước hẹn xem và tiến hành chốt giao dịch',
        leads: bucketClosed
      },
      {
        name: 'Đang chăm sóc & Quan tâm',
        value: bucketWorking.length,
        color: '#f59e0b', // Amber
        percentage: total > 0 ? Math.round((bucketWorking.length / total) * 1000) / 10 : 0,
        description: 'Đang gửi thông số nhà, sổ hồng, vị trí qua Zalo',
        leads: bucketWorking
      },
      {
        name: 'Mới & Chưa kết nối',
        value: bucketEarly.length,
        color: '#3b82f6', // Blue
        percentage: total > 0 ? Math.round((bucketEarly.length / total) * 1000) / 10 : 0,
        description: 'Khách mới đổ về, không nghe máy, cần gọi lại',
        leads: bucketEarly
      },
      {
        name: 'Không nhu cầu / Nhầm số',
        value: bucketLost.length,
        color: '#94a3b8', // Slate
        percentage: total > 0 ? Math.round((bucketLost.length / total) * 1000) / 10 : 0,
        description: 'Khách sai số, không tài chính, huỷ nhu cầu',
        leads: bucketLost
      }
    ].filter((slice) => slice.value > 0);

    // If zero leads, provide placeholder for chart rendering
    if (data.length === 0) {
      data.push({
        name: 'Chưa có dữ liệu Lead',
        value: 1,
        color: '#e2e8f0',
        percentage: 100,
        description: 'Chưa có khách hàng được phân bổ',
        leads: []
      });
    }

    // Performance rating tier
    let tier: {
      label: string;
      badgeClass: string;
      ringColor: string;
      icon: string;
      evaluation: string;
    };

    if (rateMeeting >= 25) {
      tier = {
        label: 'Xuất sắc (Top Performer)',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        ringColor: '#10b981',
        icon: '🌟',
        evaluation: 'Tỷ lệ chuyển đổi Hẹn xem BĐS vượt mức kỳ vọng (≥ 25%). Kỹ năng chốt cuộc hẹn rất thuyết phục!'
      };
    } else if (rateMeeting >= 15) {
      tier = {
        label: 'Đạt chuẩn BĐS (Good)',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        ringColor: '#3b82f6',
        icon: '⚡',
        evaluation: 'Tỷ lệ chuyển đổi nằm trong khung chuẩn ngành Nhà phố Trung tâm (15% - 24%). Rất ổn định.'
      };
    } else if (total === 0) {
      tier = {
        label: 'Chưa có dữ liệu',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        ringColor: '#94a3b8',
        icon: '📊',
        evaluation: 'Chưa có đủ khách hàng phân bổ trong kỳ này để tính tỷ lệ chuyển đổi.'
      };
    } else {
      tier = {
        label: 'Cần tăng tốc (Need Improvement)',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
        ringColor: '#f59e0b',
        icon: '⚠️',
        evaluation: 'Tỷ lệ Hẹn xem dưới 15%. Cần đẩy mạnh tốc độ gọi điện trong 15 phút đầu và gửi kịch bản vị trí qua Zalo.'
      };
    }

    // Practical self-improvement coaching advice
    let advice = '';
    if (rateMeeting >= 25) {
      advice = 'Bạn đang giữ tỷ lệ dẫn khách đi xem nhà rất cao. Trọng tâm tuần này là tăng cường đàm phán giá và bảo vệ nguồn cọc với chủ nhà.';
    } else if (rateMeeting >= 15) {
      advice = 'Tỷ lệ đạt chuẩn tốt. Hãy tận dụng tính năng Nhắc hẹn Zalo Reminder để chốt thêm 2 khách tiềm năng đang do dự đi xem nhà vào cuối tuần.';
    } else if (total > 0) {
      advice = 'Gợi ý: Dùng tính năng Ghi chú nhanh & kịch bản Zalo mẫu có sẵn để gửi sổ hồng + video thực tế căn nhà trong vòng 30 phút sau khi gọi, kích thích 80% khách đồng ý xem thực địa.';
    } else {
      advice = 'Tiếp nhận thêm Lead mới hoặc kết nối Zalo với khách hàng tiềm năng để bắt đầu theo dõi hiệu suất.';
    }

    return {
      filteredLeads: filtered,
      totalLeads: total,
      pieData: data,
      appointmentConvertedCount: viewingCount,
      closedCount: closedDealCount,
      overallMeetingRate: Math.round(rateMeeting * 10) / 10,
      closingFromMeetingRate: Math.round(rateClosedFromMeeting * 10) / 10,
      performanceTier: tier,
      coachingAdvice: advice
    };
  }, [leads, targetSaleName, appointments, timeFilter]);

  // COMPACT VARIANT (for small badge or quick preview)
  if (variant === 'compact') {
    return (
      <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 ${className}`}>
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
            <ResponsiveContainer width={40} height={40}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={13}
                  outerRadius={18}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <span className="absolute text-[9px] font-black text-slate-800">
              {totalLeads > 0 ? `${Math.round(overallMeetingRate)}%` : '0%'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Tỷ lệ Hẹn xem
              </span>
              <span className="text-xs">{performanceTier.icon}</span>
            </div>
            <p className="text-xs font-black text-slate-900 truncate">
              {overallMeetingRate}% ({appointmentConvertedCount + closedCount}/{totalLeads} Lead)
            </p>
          </div>
        </div>

        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${performanceTier.badgeClass}`}>
          {performanceTier.label.split(' ')[0]}
        </span>
      </div>
    );
  }

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: FunnelSlice = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs max-w-xs animate-fadeIn z-50">
          <div className="flex items-center space-x-1.5 mb-1">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: data.color }}
            />
            <span className="font-extrabold text-slate-100">{data.name}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-slate-300">
            <span>Số lượng:</span>
            <span className="font-mono font-bold text-white">
              {data.value} khách ({data.percentage}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 italic border-t border-slate-800 pt-1">
            {data.description}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 flex flex-col gap-4 ${className}`}>
      
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-violet-500/20 shrink-0">
            <Target className="w-5 h-5 text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                Tỷ Lệ Chuyển Đổi Lead ➔ Hẹn Xem BĐS
              </h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${performanceTier.badgeClass}`}>
                <span>{performanceTier.icon}</span>
                <span>{performanceTier.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Chuyên viên: <span className="font-bold text-slate-800">{targetSaleName || 'Chưa chọn'}</span>
              {salesMember?.role === 'tpkd' ? ' (Trưởng phòng KD)' : ' (NVKD BĐS)'}
            </p>
          </div>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setTimeFilter('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              timeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('month')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              timeFilter === 'month'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('week')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              timeFilter === 'week'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 ngày qua
          </button>
        </div>
      </div>

      {/* Main Grid: Left Chart + Right Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* LEFT: Recharts Donut Pie Chart with Centered Metric Badge */}
        <div className="md:col-span-6 flex flex-col items-center justify-center relative min-h-[220px]">
          <div className="w-full h-[220px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                      className="transition-all duration-200 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Chuyển đổi
              </span>
              <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 leading-none tracking-tight">
                {overallMeetingRate}%
              </span>
              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full mt-1 border border-violet-200">
                Lead ➔ Hẹn xem
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 italic text-center -mt-2">
            Di chuột hoặc chạm vào các lát cắt để xem chi tiết
          </div>
        </div>

        {/* RIGHT: Metric Cards & Benchmarks */}
        <div className="md:col-span-6 flex flex-col gap-2.5">
          
          {/* Card 1: Key Conversion Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-violet-50/80 border border-violet-200">
              <div className="flex items-center justify-between text-violet-800 mb-1">
                <span className="text-[11px] font-bold">Khách Hẹn Xem</span>
                <Calendar className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-black text-violet-950">
                  {appointmentConvertedCount + closedCount}
                </span>
                <span className="text-xs text-violet-700 font-semibold">/ {totalLeads} Lead</span>
              </div>
              <p className="text-[10px] text-violet-600 mt-0.5">
                Tỷ lệ: <span className="font-extrabold">{overallMeetingRate}%</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <div className="flex items-center justify-between text-emerald-800 mb-1">
                <span className="text-[11px] font-bold">Chốt Cọc Thành Công</span>
                <Award className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-xl font-black text-emerald-950">
                  {closedCount}
                </span>
                <span className="text-xs text-emerald-700 font-semibold">giao dịch</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                Chốt/Hẹn: <span className="font-extrabold">{closingFromMeetingRate}%</span>
              </p>
            </div>
          </div>

          {/* Benchmark Comparison Bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-600 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đối sánh chuẩn BĐS Nhà phố:</span>
              </span>
              <span className="text-slate-800">
                Mục tiêu: <span className="font-black text-violet-700">15% - 25%</span>
              </span>
            </div>

            {/* Custom Multi-marker Progress Bar */}
            <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, overallMeetingRate))}%`,
                  backgroundColor: performanceTier.ringColor
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              <span>0% (Khởi điểm)</span>
              <span className="text-amber-600 font-bold">15% (Chuẩn đạt)</span>
              <span className="text-emerald-600 font-bold">25% (Xuất sắc)</span>
              <span>≥ 40%</span>
            </div>
          </div>

          {/* Interactive Legend with Clickable Slices */}
          <div className="space-y-1 pt-1">
            {pieData.map((slice, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  activeIndex === idx ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-slate-700 truncate text-[11px]">{slice.name}</span>
                </div>
                <div className="flex items-center space-x-2 shrink-0 font-mono text-[11px]">
                  <span className="font-bold text-slate-900">{slice.value}</span>
                  <span className="text-slate-400 text-[10px]">({slice.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Coaching Advice Card for Self-Evaluation */}
      <div className="p-3.5 bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-slate-50 rounded-xl border border-amber-200/80 flex items-start space-x-3 text-xs">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5 mb-0.5">
            <span className="font-black text-slate-900">Đánh giá & Khuyến nghị tự phát triển:</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-normal">
            {coachingAdvice}
          </p>
        </div>
      </div>

      {/* Quick Lead List of Viewings if any */}
      {appointmentConvertedCount > 0 && onOpenLead && (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-violet-600" />
              <span>Khách đã hẹn xem gần đây của {targetSaleName}:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">
              Bấm để mở hồ sơ
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
            {pieData.find((s) => s.name === 'Hẹn xem BĐS thực tế')?.leads.slice(0, 6).map((ld) => (
              <button
                key={ld.id}
                type="button"
                onClick={() => onOpenLead(ld)}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-violet-50 hover:border-violet-300 border border-slate-200 text-left transition-all text-xs group"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-800 truncate group-hover:text-violet-900">{ld.fullName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{ld.project || 'BĐS Trung Tâm'} • {ld.budget || 'Tài chính tốt'}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-violet-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
