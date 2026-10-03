import { Lead, SalesMember, AutoDistributionPolicy, SalePerformanceScore } from '../types';
import { getDailyAssignedCount, getEligibleSalesForDistribution } from '../data/salesTeamData';

export const DEFAULT_DISTRIBUTION_POLICY: AutoDistributionPolicy = {
  enabled: true,
  acceptTimeoutMinutes: 60, // 60 phút để bấm tiếp nhận
  reportTimeoutHours: 4, // 4 giờ để báo cáo tương tác đầu tiên
  performancePriority: true, // Ưu tiên sale có tỷ lệ chốt và điểm hiệu suất cao
  reassignPolicy: 'top_performer'
};

/**
 * Tính toán điểm hiệu suất (Performance Score 0-100) cho từng sale
 * Dựa trên:
 * - Tỷ lệ chốt hợp đồng (Deal close rate)
 * - Tỷ lệ tiếp nhận đúng hạn (Acceptance compliance)
 * - Tỷ lệ báo cáo đầy đủ (Reporting compliance)
 * - Trừ điểm nếu bị phạt quá hạn (SLA breaches)
 */
export function calculateSalesPerformance(
  sales: SalesMember[],
  leads: Lead[]
): SalePerformanceScore[] {
  return sales.map((member) => {
    const memberLeads = leads.filter((l) => l.assignee === member.name);
    const leadCount = memberLeads.length;
    const closedCount = memberLeads.filter((l) => l.status === 'Đã chốt').length;
    const closeRate = leadCount > 0 ? Math.round((closedCount / leadCount) * 100) : 0;

    // Số lead đã được tiếp nhận
    const acceptedCount = memberLeads.filter(
      (l) => Boolean(l.acceptedAt)
    ).length;

    // Số lead đã có báo cáo tương tác
    const reportedCount = memberLeads.filter(
      (l) => Boolean(l.firstReportedAt)
    ).length;

    // Số lần vi phạm quá hạn hoặc bị thu hồi lead
    const slaBreachCount = memberLeads.filter((l) => l.slaBreached).length +
      leads.filter((l) => l.previousAssignees?.includes(member.name)).length;

    // Tính điểm tổng hợp (Scale 0 - 100)
    // Close Rate: tối đa 40đ
    // Report Compliance: tối đa 35đ
    // Accept Compliance: tối đa 25đ
    // Penalty: mỗi lần quá hạn trừ 5đ
    const acceptRate = leadCount > 0 ? (acceptedCount / leadCount) : 0.8;
    const reportRate = leadCount > 0 ? (reportedCount / leadCount) : 0.8;
    
    let baseScore = Math.round(
      Math.min(closeRate * 1.5, 40) + 
      (reportRate * 35) + 
      (acceptRate * 25) - 
      (slaBreachCount * 5)
    );

    // Điểm sàn và trần
    const performanceScore = Math.max(10, Math.min(100, baseScore));

    let tier: SalePerformanceScore['tier'] = 'Cần cải thiện';
    if (performanceScore >= 85) tier = 'VIP';
    else if (performanceScore >= 70) tier = 'Tốt';
    else if (performanceScore >= 50) tier = 'Đạt';

    return {
      member,
      leadCount,
      acceptedCount,
      reportedCount,
      closedCount,
      closeRate,
      responseTimeAvg: leadCount > 0 && acceptedCount > 0 ? `${Math.max(5, 45 - Math.round(performanceScore / 3))} phút` : 'Chưa có',
      performanceScore,
      tier,
      slaBreachCount
    };
  }).sort((a, b) => b.performanceScore - a.performanceScore);
}

/**
 * Phân bổ tự động hàng loạt Lead có tính năng Ưu tiên Sale làm việc tốt (Weighted Priority)
 * - Sale nhóm VIP / Tốt sẽ có trọng số bốc thăm / nhận lead cao hơn
 * - Round-robin phân tầng công bằng để không ai bị bỏ rơi
 */
export function distributeLeadsSmartly(
  leadsToDistribute: Lead[],
  sales: SalesMember[],
  policy: AutoDistributionPolicy = DEFAULT_DISTRIBUTION_POLICY,
  existingLeads: Lead[] = []
): { distributedLeads: Lead[]; countPerSale: Record<string, number> } {
  const eligibleSales = getEligibleSalesForDistribution(sales, true, existingLeads);
  if (eligibleSales.length === 0) {
    return { distributedLeads: leadsToDistribute, countPerSale: {} };
  }

  const performanceScores = calculateSalesPerformance(eligibleSales, existingLeads);

  const countPerSale: Record<string, number> = {};
  eligibleSales.forEach((s) => {
    countPerSale[s.name] = 0;
  });

  // Tạo pool phân bổ theo trọng số hiệu suất nếu bật performancePriority
  let distributionPool: SalesMember[] = [];

  if (policy.performancePriority) {
    performanceScores.forEach(({ member, tier }) => {
      // VIP nhận tỉ trọng gấp 3, Tốt gấp 2, Đạt gấp 1
      const weight = tier === 'VIP' ? 3 : tier === 'Tốt' ? 2 : 1;
      for (let i = 0; i < weight; i++) {
        distributionPool.push(member);
      }
    });
  } else {
    distributionPool = [...eligibleSales];
  }

  if (distributionPool.length === 0) {
    distributionPool = [...eligibleSales];
  }

  const nowIso = new Date().toISOString();
  let poolIndex = 0;

  const distributedLeads = leadsToDistribute.map((lead) => {
    const assignedSale = [...distributionPool.slice(poolIndex % distributionPool.length), ...distributionPool.slice(0, poolIndex % distributionPool.length)].find(candidate => {
      return getDailyAssignedCount(candidate, existingLeads) + (countPerSale[candidate.name] || 0) < (candidate.maxDailyLeads ?? 50);
    });
    if (!assignedSale) return lead;
    countPerSale[assignedSale.name] = (countPerSale[assignedSale.name] || 0) + 1;
    poolIndex++;

    const logHistory = [
      {
        id: `smart-dist-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: nowIso.replace('T', ' ').slice(0, 16),
        type: 'Ghi chú nội bộ' as const,
        content: `Hệ thống tự động chia lead cho "${assignedSale.name}" (Ưu tiên theo hiệu suất & chính sách chăm sóc)`,
        author: 'Hệ thống tự động'
      },
      ...(lead.history || [])
    ];

    return {
      ...lead,
      assignee: assignedSale.name,
      assignedToId: assignedSale.id,
      assigneeEmail: assignedSale.email,
      assignedAt: nowIso,
      firstReportedAt: undefined,
      acceptedAt: undefined, // Reset thời gian chờ tiếp nhận
      slaWarning: false,
      slaBreached: false,
      history: logHistory
    };
  });

  return { distributedLeads, countPerSale };
}

export interface SlaCheckResult {
  updatedLeads: Lead[];
  reassignedLeads: { lead: Lead; fromSale: string; toSale: string; reason: string }[];
  warningCount: number;
  breachCount: number;
}

/**
 * Kiểm tra hạn SLA và TỰ ĐỘNG THU HỒI / CHIA LẠI CHO SALE KHÁC:
 * 1. Nếu Sale chưa bấm "Tiếp nhận" sau `acceptTimeoutMinutes` -> Cảnh báo hoặc Thu hồi
 * 2. Nếu Sale đã tiếp nhận nhưng chưa có ghi chú/báo cáo tương tác sau `reportTimeoutHours` -> Cảnh báo hoặc Thu hồi
 * 3. Chuyển ngay cho Sale làm việc tốt nhất (Top Performer) đang active
 */
export function checkAndReassignSlaLeads(
  leads: Lead[],
  sales: SalesMember[],
  policy: AutoDistributionPolicy = DEFAULT_DISTRIBUTION_POLICY
): SlaCheckResult {
  if (!policy.enabled) {
    return { updatedLeads: leads, reassignedLeads: [], warningCount: 0, breachCount: 0 };
  }

  const now = Date.now();
  const activeSales = getEligibleSalesForDistribution(sales, false, leads);
  const performanceScores = calculateSalesPerformance(activeSales, leads);
  const nowIso = new Date().toISOString();

  const reassignedLeads: SlaCheckResult['reassignedLeads'] = [];
  let warningCount = 0;
  let breachCount = 0;

  const updatedLeads = leads.map((lead) => {
    // Chỉ kiểm tra các khách chưa chốt hoặc chưa hủy, và có người phụ trách cụ thể
    if (
      !lead.assignee ||
      lead.assignee === 'Chưa phân công' ||
      lead.assignee === 'Chưa gán' ||
      lead.status === 'Đã chốt' ||
      lead.status === 'Không nhu cầu'
    ) {
      return lead;
    }

    // Thời điểm bắt đầu giao lead: chỉ kiểm tra nếu lead có assignedAt rõ ràng
    let assignedTime = lead.assignedAt ? new Date(lead.assignedAt).getTime() : 0;
    
    // Nếu lead chưa có assignedAt, không thu hồi SLA (tránh phạt sai lead lịch sử vừa đồng bộ từ Google Sheet)
    if (!assignedTime || isNaN(assignedTime)) {
      return lead;
    }

    const diffMinutes = (now - assignedTime) / (1000 * 60);
    // Tránh thời gian sai lệch trong tương lai hoặc quá 30 ngày (dữ liệu cũ)
    if (diffMinutes < 0 || diffMinutes > 43200) {
      return lead;
    }
    const diffHours = (now - (lead.acceptedAt ? new Date(lead.acceptedAt).getTime() : assignedTime)) / 3600000;

    const hasAccepted = Boolean(lead.acceptedAt);
    const hasReported = Boolean(lead.firstReportedAt && new Date(lead.firstReportedAt).getTime() >= assignedTime);

    let needsReassign = false;
    let reason = '';
    let isWarning = false;

    // Quy tắc 1: Chưa tiếp nhận quá hạn
    if (!hasAccepted) {
      if (diffMinutes >= policy.acceptTimeoutMinutes) {
        needsReassign = true;
        reason = `Quá hạn tiếp nhận (${Math.round(diffMinutes)} phút > quy định ${policy.acceptTimeoutMinutes} phút)`;
      } else if (diffMinutes >= policy.acceptTimeoutMinutes * 0.7) {
        isWarning = true;
      }
    } 
    // Quy tắc 2: Đã tiếp nhận nhưng không báo cáo / không tương tác quá hạn
    else if (!hasReported) {
      if (diffHours >= policy.reportTimeoutHours) {
        needsReassign = true;
        reason = `Quá hạn báo cáo tương tác ban đầu (${diffHours.toFixed(1)}h > quy định ${policy.reportTimeoutHours}h)`;
      } else if (diffHours >= policy.reportTimeoutHours * 0.75) {
        isWarning = true;
      }
    }

    if (isWarning && !lead.slaWarning) {
      warningCount++;
      return { ...lead, slaWarning: true };
    }

    if (needsReassign) {
      breachCount++;
      const currentAssignee = lead.assignee;
      const prevList = lead.previousAssignees || [];
      const updatedPrevList = [...prevList, currentAssignee];

      // Chọn Sale khác để chia: loại trừ sale cũ, ưu tiên Top Performer
      const candidateSales = performanceScores
        .filter((p) => p.member.name !== currentAssignee && getDailyAssignedCount(p.member, leads) + reassignedLeads.filter(item => item.toSale === p.member.name).length < (p.member.maxDailyLeads ?? 50))
        .map((p) => p.member);

      const newAssigneeMember = candidateSales[0];

      if (newAssigneeMember) {
        const newAssigneeName = newAssigneeMember.name;
        reassignedLeads.push({
          lead,
          fromSale: currentAssignee,
          toSale: newAssigneeName,
          reason
        });

        const log = {
          id: `sla-reassign-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: nowIso.replace('T', ' ').slice(0, 16),
          type: 'Ghi chú nội bộ' as const,
          content: `⚠️ [THU HỒI TỰ ĐỘNG]: Khách hàng bị thu hồi từ "${currentAssignee}" do ${reason}. Hệ thống tự động chuyển giao ưu tiên cho chuyên viên làm việc tốt "${newAssigneeName}".`,
          author: 'Hệ thống Quản trị CRM'
        };

        return {
          ...lead,
          assignee: newAssigneeName,
          assignedToId: newAssigneeMember.id,
          assigneeEmail: newAssigneeMember.email,
          assignedAt: nowIso,
          acceptedAt: undefined, // Chờ sale mới bấm tiếp nhận
          firstReportedAt: undefined,
          slaWarning: false,
          slaBreached: false,
          reassignedCount: (lead.reassignedCount || 0) + 1,
          previousAssignees: updatedPrevList,
          history: [log, ...(lead.history || [])]
        };
      }
    }

    return lead;
  });

  return {
    updatedLeads,
    reassignedLeads,
    warningCount,
    breachCount
  };
}
