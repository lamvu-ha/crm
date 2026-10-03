import { Lead, CustomerAnalysisResult } from '../types';

/**
 * Service to analyze customer demands and closing probability with Gemini AI
 */
export async function analyzeCustomerDemand(lead: Lead): Promise<CustomerAnalysisResult> {
  try {
    const res = await fetch('/api/ai/analyze-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lead }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.closingProbability === 'number') {
        return data as CustomerAnalysisResult;
      }
    }
  } catch (error) {
    console.warn('Failed to call /api/ai/analyze-customer, using local calculation:', error);
  }

  // Local fallback if network fails
  let prob = 45;
  const st = (lead.status || '').toLowerCase();
  if (st.includes('chốt')) prob = 95;
  else if (st.includes('cọc') || st.includes('đàm phán')) prob = 85;
  else if (st.includes('hẹn') || st.includes('xem')) prob = 70;
  else if (st.includes('tiềm năng')) prob = 60;
  else if (st.includes('quan tâm')) prob = 50;
  else if (st.includes('không nghe') || st.includes('thuê bao')) prob = 20;

  if (lead.zaloConnected) prob = Math.min(95, prob + 10);
  if (lead.history && lead.history.length >= 2) prob = Math.min(95, prob + 10);

  let level: CustomerAnalysisResult['closingLevel'] = 'Trung bình';
  if (prob >= 80) level = 'Rất cao';
  else if (prob >= 65) level = 'Tiềm năng cao';
  else if (prob >= 45) level = 'Trung bình';
  else if (prob >= 25) level = 'Cần nuôi dưỡng';
  else level = 'Nguy cơ từ chối';

  return {
    closingProbability: prob,
    closingLevel: level,
    closingSummary: `Khách hàng "${lead.fullName}" đang có mức độ quan tâm ${level.toLowerCase()} tại dự án ${lead.project || 'BĐS'}. Tỷ lệ chốt ước tính ${prob}%. Cần duy trì tương tác định kỳ và kích thích nhu cầu khảo sát thực tế.`,
    customerPersona: lead.budget
      ? `Khách hàng quan tâm phân khúc ${lead.productType || 'BĐS'}, tầm tài chính ${lead.budget}`
      : `Khách hàng tìm hiểu dự án ${lead.project || 'BĐS'}`,
    keyDemands: [
      `Phân khúc: ${lead.productType || 'Nhà phố / Căn hộ'}`,
      lead.budget ? `Khoảng giá: ${lead.budget}` : 'Sản phẩm vị trí tốt, giá hợp lý',
      `Dự án: ${lead.project || 'Khu vực trung tâm TP.HCM'}`
    ],
    barriersOrRisks: [
      'Khách cần đối chiếu thêm với các phương án tài chính và pháp lý dự án',
      'Cần thêm thời gian bàn bạc với người thân hoặc so sánh thị trường'
    ],
    nextActionRecommendations: [
      `Gửi tin nhắn Zalo kèm 2 căn có bảng giá và chiết khấu tốt nhất tại ${lead.project || 'dự án'}`,
      'Đề xuất mời khách tham quan thực tế hoặc xem sa bàn vào cuối tuần',
      'Nhấn mạnh vào pháp lý minh bạch và tiềm năng sinh lời hoặc vị trí đắc địa'
    ],
    suggestedScript: `Dạ em chào anh/chị ${lead.fullName}, em gửi anh/chị thông tin giỏ hàng ưu đãi đợt này của ${lead.project || 'dự án'}. Cuối tuần này em xin phép hỗ trợ xe đưa đón anh/chị đi trải nghiệm thực tế nhé ạ!`,
    analyzedAt: new Date().toISOString(),
    source: 'smart-heuristic'
  };
}
