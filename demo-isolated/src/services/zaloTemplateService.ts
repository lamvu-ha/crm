import { 
  ZaloTemplate, 
  ZaloTemplateCategory, 
  Lead, 
  CustomerScenarioType, 
  CustomerScenarioConfig,
  LeadStatus 
} from '../types';

export const STORAGE_KEY_ZALO_TEMPLATES = 'crm_zalo_templates_v2';

export const ZALO_TEMPLATE_CATEGORIES: { id: ZaloTemplateCategory; label: string; color: string }[] = [
  { id: 'chao_hoi', label: 'Chào hỏi & Giới thiệu', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'du_an', label: 'Gửi thông tin dự án', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'doc_quyen', label: 'Căn độc quyền / Giá tốt', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'lich_hen', label: 'Hẹn khảo sát thực tế', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'cham_soc_lai', label: 'Chăm sóc & Tương tác lại', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'khac', label: 'Khác', color: 'bg-slate-100 text-slate-800 border-slate-200' }
];

export const CUSTOMER_SCENARIOS: CustomerScenarioConfig[] = [
  {
    id: 'hen_xem',
    label: 'Khách hẹn xem',
    statusMatch: ['Hẹn xem BĐS'],
    iconName: 'CalendarDays',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Kịch bản xác nhận lịch hẹn, nhắc hẹn trước giờ đón, gửi định vị và theo dõi sau khảo sát thực tế'
  },
  {
    id: 'quan_tam_du_an',
    label: 'Khách quan tâm dự án',
    statusMatch: ['Quan tâm', 'Gửi thông tin'],
    iconName: 'Building',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Kịch bản gửi tài liệu pháp lý, bảng giá chiết khấu, rổ hàng độc quyền và follow sau gửi thông tin'
  },
  {
    id: 'khach_moi',
    label: 'Khách mới tiếp nhận',
    statusMatch: ['Khách mới'],
    iconName: 'Sparkles',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Kịch bản lời chào đầu tiên, kết bạn Zalo, giới thiệu chuyên viên phụ trách và gửi brochure tổng quan'
  },
  {
    id: 'tiem_nang',
    label: 'Khách tiềm năng / Phân vân tài chính',
    statusMatch: ['Tiềm năng'],
    iconName: 'Target',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Kịch bản tư vấn đòn bẩy tài chính, tiến độ thanh toán nhẹ, phân tích quy hoạch và so sánh giá'
  },
  {
    id: 'dam_phan_coc',
    label: 'Khách đàm phán / Cọc',
    statusMatch: ['Đàm phán / Cọc'],
    iconName: 'CheckCircle2',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Kịch bản giữ chỗ căn ưu tiên, hướng dẫn chuyển khoản cọc an toàn, thủ tục hợp đồng và công chứng'
  },
  {
    id: 'cham_soc_lai',
    label: 'Khách chăm sóc lại / Nuôi dưỡng',
    statusMatch: ['Đang chăm sóc'],
    iconName: 'RotateCcw',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Kịch bản chào rổ hàng mới ra mắt, căn chủ nhà ngộp giảm giá sâu, chúc đầu tuần/lễ tết tái tương tác'
  },
  {
    id: 'khong_nghe_may',
    label: 'Khách máy bận / Gọi lại sau',
    statusMatch: ['Không nghe máy', 'Gọi lại sau', 'Máy bận', 'Thuê bao'],
    iconName: 'PhoneCall',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Kịch bản nhắn Zalo sau cuộc gọi nhỡ, gửi tài liệu để khách xem lúc rảnh và xin hẹn giờ gọi lại'
  },
  {
    id: 'da_chot',
    label: 'Khách đã chốt / Hậu mãi',
    statusMatch: ['Đã chốt'],
    iconName: 'Award',
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
    description: 'Kịch bản cảm ơn sau giao dịch, cập nhật tiến độ pháp lý bàn giao và đề xuất giới thiệu người quen'
  }
];

export const TEMPLATE_AVAILABLE_TAGS = [
  { tag: '{ten_khach}', label: 'Họ tên khách', sample: 'Nguyễn Văn An' },
  { tag: '{du_an}', label: 'Tên dự án', sample: 'Nhà Phố Trung Tâm Quận 1' },
  { tag: '{san_pham}', label: 'Loại sản phẩm', sample: 'Nhà phố trung tâm' },
  { tag: '{nguoi_phu_trach}', label: 'Tên Sale tư vấn', sample: 'Chuyên viên 01' },
  { tag: '{sdt}', label: 'SĐT khách', sample: '0903888999' },
  { tag: '{ngan_sach}', label: 'Ngân sách', sample: '15 - 20 tỷ' },
  { tag: '{ngay}', label: 'Ngày hôm nay', sample: new Date().toLocaleDateString('vi-VN') },
  { tag: '{thoi_gian_hen}', label: 'Giờ hẹn xem', sample: '09:30 sáng mai' },
  { tag: '{dia_diem}', label: 'Điểm đón / Vị trí', sample: 'Văn phòng bán hàng dự án' }
];

export const DEFAULT_ZALO_TEMPLATES: ZaloTemplate[] = [
  // 1. TÌNH HUỐNG: KHÁCH HẸN XEM
  {
    id: 'zalo-tpl-hx-1',
    title: 'Xác nhận lịch hẹn xem thực tế & chuẩn bị đón',
    category: 'lich_hen',
    scenario: 'hen_xem',
    scenarioLabel: 'Khách hẹn xem',
    targetStatus: 'Hẹn xem BĐS',
    tags: ['Hẹn xem', 'Khảo sát thực tế', 'Xác nhận'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép xác nhận lại lịch hẹn mình đi khảo sát thực tế phân khúc {san_pham} vào {thoi_gian_hen}. Em đã chuẩn bị sẵn xe công ty, tài liệu quy hoạch và giỏ hàng đẹp đón anh/chị. Anh/chị xem thời gian trên có thuận tiện không để em giữ lịch chu đáo nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-hx-2',
    title: 'Nhắc hẹn trước giờ khởi hành (trước 2 tiếng)',
    category: 'lich_hen',
    scenario: 'hen_xem',
    scenarioLabel: 'Khách hẹn xem',
    targetStatus: 'Hẹn xem BĐS',
    tags: ['Nhắc hẹn', 'Trước giờ G', 'Định vị'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} xin phép nhắn nhắc nhẹ lịch hẹn mình đi xem thực tế dự án {du_an} lúc {thoi_gian_hen} hôm nay ạ. Em gửi anh/chị định vị vị trí điểm đón tại {dia_diem}. Em sẽ có mặt trước 15 phút đón anh/chị. Nếu có bất kỳ thay đổi nào anh/chị nhắn em ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-hx-3',
    title: 'Follow sau buổi khảo sát thực tế dự án',
    category: 'lich_hen',
    scenario: 'hen_xem',
    scenarioLabel: 'Khách hẹn xem',
    targetStatus: 'Hẹn xem BĐS',
    tags: ['Follow sau xem', 'Hỏi thăm', 'Bảng tính dòng tiền'],
    content: 'Em chào anh/chị {ten_khach} ạ! Em cảm ơn anh/chị đã dành thời gian quý báu đi khảo sát thực tế {san_pham} tại {du_an} cùng em hôm nay. Sau khi trực tiếp xem vị trí và không gian thực tế, anh/chị ưng ý nhất phương án nào ạ? Em xin phép gửi thêm bảng tính dòng tiền và chính sách chiết khấu tốt nhất qua Zalo anh/chị tham khảo thêm nhé!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 2. TÌNH HUỐNG: KHÁCH QUAN TÂM DỰ ÁN
  {
    id: 'zalo-tpl-qt-1',
    title: 'Gửi trọn bộ pháp lý & Bảng giá cập nhật đợt 1',
    category: 'du_an',
    scenario: 'quan_tam_du_an',
    scenarioLabel: 'Khách quan tâm dự án',
    targetStatus: 'Quan tâm',
    tags: ['Bảng giá', 'Pháp lý', 'Chính sách'],
    content: 'Dạ em chào anh/chị {ten_khach} ạ! Em {nguoi_phu_trach} chuyên viên tư vấn dự án {du_an}. Em xin phép gửi anh/chị trọn bộ tài liệu: (1) Mặt bằng thiết kế chi tiết từng căn {san_pham}, (2) Bảng giá cập nhật và tiến độ thanh toán đợt này, (3) Chính sách chiết khấu trực tiếp và hỗ trợ vay 0% lãi suất. Anh/chị xem qua có điểm nào cần giải đáp thêm em hỗ trợ ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-qt-2',
    title: 'Giới thiệu 2 căn góc đẹp nhất giỏ hàng - Đúng tầm tài chính',
    category: 'doc_quyen',
    scenario: 'quan_tam_du_an',
    scenarioLabel: 'Khách quan tâm dự án',
    targetStatus: 'Quan tâm',
    tags: ['Căn góc', 'Đúng ngân sách', 'Độc quyền'],
    content: 'Dạ anh/chị {ten_khach} ơi, trong giỏ hàng độc quyền {du_an} phân khúc {san_pham} bên em vừa mở thêm 2 căn vị trí cực đẹp, view thoáng mát và đặc biệt vừa đúng khung tài chính {ngan_sach} của anh/chị. Em gửi sơ đồ căn và video flycam quay thực tế qua Zalo này, anh/chị xem qua nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-qt-3',
    title: 'Follow sau 24h gửi bảng giá & tài liệu',
    category: 'cham_soc_lai',
    scenario: 'quan_tam_du_an',
    scenarioLabel: 'Khách quan tâm dự án',
    targetStatus: 'Quan tâm',
    tags: ['Follow 24h', 'Chăm sóc', 'Ưu đãi'],
    content: 'Em chào anh/chị {ten_khach}, hôm qua em {nguoi_phu_trach} có gửi bộ tài liệu và bảng giá dự án {du_an}. Không biết anh/chị đã kịp xem qua chưa ạ? Tuần này bên em đang có suất ưu đãi đặc biệt tặng gói nội thất cao cấp cho khách đăng ký sớm, anh/chị có băn khoăn điểm nào cứ nhắn em tư vấn kỹ hơn nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 3. TÌNH HUỐNG: KHÁCH MỚI TIẾP NHẬN
  {
    id: 'zalo-tpl-km-1',
    title: 'Lời chào kết bạn Zalo & Giới thiệu chuyên viên',
    category: 'chao_hoi',
    scenario: 'khach_moi',
    scenarioLabel: 'Khách mới tiếp nhận',
    targetStatus: 'Khách mới',
    tags: ['Lời chào', 'Kết bạn Zalo', 'Khách mới'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Em thấy anh/chị vừa để lại thông tin quan tâm phân khúc {san_pham}. Em xin phép kết bạn Zalo để gửi anh/chị thông tin chính thức, bảng giá gốc từ chủ đầu tư và hỗ trợ anh/chị nhanh nhất khi cần ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-km-2',
    title: 'Gửi brochure tổng quan & Đặt câu hỏi nhu cầu',
    category: 'chao_hoi',
    scenario: 'khach_moi',
    scenarioLabel: 'Khách mới tiếp nhận',
    targetStatus: 'Khách mới',
    tags: ['Brochure', 'Khai thác nhu cầu'],
    content: 'Dạ em gửi anh/chị {ten_khach} cuốn E-Brochure tổng quan dự án {du_an}. Để em có thể chọn lọc đúng những căn có thiết kế và hướng đẹp nhất gửi anh/chị, anh/chị dự kiến tìm hiểu để mua ở hay đầu tư tích sản lâu dài ạ?',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 4. TÌNH HUỐNG: KHÁCH TIỀM NĂNG / PHÂN VÂN TÀI CHÍNH
  {
    id: 'zalo-tpl-tn-1',
    title: 'Giải pháp đòn bẩy tài chính & Hỗ trợ vay 0% lãi suất',
    category: 'du_an',
    scenario: 'tiem_nang',
    scenarioLabel: 'Khách tiềm năng / Phân vân tài chính',
    targetStatus: 'Tiềm năng',
    tags: ['Vay ngân hàng', 'Lãi suất 0%', 'Dòng tiền'],
    content: 'Dạ em chào anh/chị {ten_khach}, em {nguoi_phu_trach} đã lập bảng tính chi tiết phương án vay hỗ trợ lãi suất 0% cho căn {san_pham} tại {du_an}. Với tầm tài chính {ngan_sach}, anh/chị chỉ cần thanh toán trước 20-30%, phần còn lại được ân hạn nợ gốc và miễn lãi 18-24 tháng. Em gửi bảng dòng tiền chi tiết qua Zalo anh/chị xem nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-tn-2',
    title: 'Phân tích tiềm năng tăng giá & Hạ tầng quy hoạch',
    category: 'du_an',
    scenario: 'tiem_nang',
    scenarioLabel: 'Khách tiềm năng / Phân vân tài chính',
    targetStatus: 'Tiềm năng',
    tags: ['Hạ tầng', 'Tăng giá', 'Quy hoạch'],
    content: 'Dạ anh/chị {ten_khach} ơi, em gửi anh/chị bản đồ quy hoạch hạ tầng giao thông và các cú hích tăng giá sắp triển khai quanh dự án {du_an}. So với mặt bằng giá phân khúc {san_pham} trong khu vực thì đây là mức giá đợt 1 rất tốt để đón đầu biên độ lợi nhuận. Anh/chị tham khảo nhé!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 5. TÌNH HUỐNG: KHÁCH ĐÀM PHÁN / CỌC
  {
    id: 'zalo-tpl-dp-1',
    title: 'Hướng dẫn giữ chỗ ưu tiên & Khóa căn đẹp',
    category: 'doc_quyen',
    scenario: 'dam_phan_coc',
    scenarioLabel: 'Khách đàm phán / Cọc',
    targetStatus: 'Đàm phán / Cọc',
    tags: ['Giữ chỗ', 'Khóa căn', 'Cọc ưu tiên'],
    content: 'Dạ em chào anh/chị {ten_khach}, căn {san_pham} mã đẹp tại {du_an} mà anh/chị đang chọn hiện có thêm 2 khách khác đang hỏi thăm thiện chí. Để đảm bảo giữ đúng căn này với mức giá ưu đãi đợt 1, em xin phép hỗ trợ anh/chị thủ tục đặt cọc thiện chí giữ chỗ. Em gửi thông tin số tài khoản chính thức của công ty ngay sau đây nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-dp-2',
    title: 'Xác nhận thông tin chuyển khoản & Thủ tục ký HĐ',
    category: 'doc_quyen',
    scenario: 'dam_phan_coc',
    scenarioLabel: 'Khách đàm phán / Cọc',
    targetStatus: 'Đàm phán / Cọc',
    tags: ['Chuyển khoản', 'Biên nhận', 'Hợp đồng'],
    content: 'Dạ em {nguoi_phu_trach} xin gửi anh/chị {ten_khach} thông tin tài khoản chuyển tiền cọc dự án {du_an}:\n- Chủ TK: CÔNG TY TNHH NHÀ PHỐ TRUNG TÂM\n- Số TK: 190368888888\n- Ngân hàng: Techcombank\n- Cú pháp: [Họ tên] - Dat coc can [Ma can] - [SDT]\nSau khi chuyển xong, anh/chị chụp uỷ nhiệm chi gửi em để em xuất phiếu thu và chuẩn bị sẵn hợp đồng gửi anh/chị nhé!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 6. TÌNH HUỐNG: KHÁCH CHĂM SÓC LẠI / NUÔI DƯỠNG
  {
    id: 'zalo-tpl-cs-1',
    title: 'Căn độc quyền giá ngộp thiện chí - Tái tương tác',
    category: 'cham_soc_lai',
    scenario: 'cham_soc_lai',
    scenarioLabel: 'Khách chăm sóc lại / Nuôi dưỡng',
    targetStatus: 'Đang chăm sóc',
    tags: ['Căn ngộp', 'Tái tương tác', 'Giá tốt'],
    content: 'Dạ anh/chị {ten_khach} ơi, bên em vừa tiếp nhận 1 căn {san_pham} vị trí đắc địa tại {du_an} đúng tầm tài chính {ngan_sach} của anh/chị, chủ nhà cần xoay vốn nên để lại giá rất thiện chí thấp hơn thị trường 10%. Em gửi hình ảnh thực tế và mặt bằng qua Zalo anh/chị xem ngay nhé ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },
  {
    id: 'zalo-tpl-cs-2',
    title: 'Chúc tuần mới & Giới thiệu giỏ hàng mới ra mắt',
    category: 'cham_soc_lai',
    scenario: 'cham_soc_lai',
    scenarioLabel: 'Khách chăm sóc lại / Nuôi dưỡng',
    targetStatus: 'Đang chăm sóc',
    tags: ['Chúc tuần mới', 'Giỏ hàng mới'],
    content: 'Em chào anh/chị {ten_khach}, chúc anh/chị tuần mới nhiều thuận lợi! Em {nguoi_phu_trach} bên phân phối {du_an}. Hiện phân khu mới vừa ra mắt với vị trí rất đẹp và chính sách thanh toán linh hoạt. Anh/chị có đang quan tâm mở rộng thêm danh mục đầu tư đợt này không em xin phép gửi thông tin qua anh/chị tham khảo ạ!',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  },

  // 7. TÌNH HUỐNG: KHÁCH KHÔNG NGHE MÁY / GỌI LẠI SAU
  {
    id: 'zalo-tpl-knm-1',
    title: 'Nhắn Zalo xin phép sau cuộc gọi nhỡ / máy bận',
    category: 'chao_hoi',
    scenario: 'khong_nghe_may',
    scenarioLabel: 'Khách máy bận / Gọi lại sau',
    targetStatus: 'Không nghe máy',
    tags: ['Cuộc gọi nhỡ', 'Máy bận', 'Lịch hẹn gọi lại'],
    content: 'Dạ em chào anh/chị {ten_khach}, em là {nguoi_phu_trach} phụ trách tư vấn dự án {du_an}. Vừa nãy em có gọi điện hỗ trợ anh/chị nhưng chắc anh/chị đang bận cuộc họp hoặc di chuyển ngoài đường. Em xin phép gửi thông tin qua Zalo này để anh/chị tiện xem lúc rảnh nhé. Khoảng mấy giờ em có thể liên hệ lại thuận tiện cho anh/chị ạ?',
    isDefault: true,
    authorName: 'Hệ thống CRM'
  }
];

export const getStoredZaloTemplates = (): ZaloTemplate[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ZALO_TEMPLATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Also check legacy key
    const legacyRaw = localStorage.getItem('crm_zalo_templates_v1');
    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
        // Upgrade legacy templates by merging scenario defaults
        const merged = [...DEFAULT_ZALO_TEMPLATES];
        legacyParsed.forEach((oldItem: any) => {
          if (!merged.some((m) => m.id === oldItem.id)) {
            merged.push(oldItem);
          }
        });
        saveLocalZaloTemplates(merged);
        return merged;
      }
    }
  } catch (e) {
    console.warn('Error reading local zalo templates:', e);
  }
  return DEFAULT_ZALO_TEMPLATES;
};

export const saveLocalZaloTemplates = (templates: ZaloTemplate[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_ZALO_TEMPLATES, JSON.stringify(templates));
    localStorage.setItem('crm_zalo_templates_v1', JSON.stringify(templates));
  } catch (e) {
    console.warn('Error saving local zalo templates:', e);
  }
};

export const fetchServerZaloTemplates = async (): Promise<ZaloTemplate[]> => {
  try {
    const res = await fetch('/api/zalo-templates');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Check if server templates have scenarios, if not enrich
        const hasScenarios = data.some((t: any) => t.scenario);
        if (!hasScenarios) {
          // Merge with DEFAULT_ZALO_TEMPLATES so user gets the new scenario templates
          const merged = [...DEFAULT_ZALO_TEMPLATES];
          data.forEach((srv: any) => {
            if (!merged.some(m => m.id === srv.id)) {
              merged.push(srv);
            }
          });
          syncZaloTemplatesToServer(merged);
          saveLocalZaloTemplates(merged);
          return merged;
        }
        saveLocalZaloTemplates(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('Server fetch for zalo templates failed, using local cache:', e);
  }
  return getStoredZaloTemplates();
};

export const syncZaloTemplatesToServer = async (templates: ZaloTemplate[]): Promise<boolean> => {
  saveLocalZaloTemplates(templates);
  try {
    const res = await fetch('/api/zalo-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templates)
    });
    return res.ok;
  } catch (e) {
    console.warn('Could not sync zalo templates to server:', e);
    return false;
  }
};

/**
 * Detect scenario type based on customer status
 */
export const detectScenarioFromStatus = (status?: string): CustomerScenarioType => {
  if (!status) return 'khach_moi';
  const clean = status.trim().toLowerCase();

  if (clean.includes('hẹn xem') || clean.includes('xem bđs') || clean.includes('khảo sát')) {
    return 'hen_xem';
  }
  if (clean.includes('quan tâm') || clean.includes('gửi thông tin') || clean.includes('tìm hiểu')) {
    return 'quan_tam_du_an';
  }
  if (clean.includes('khách mới') || clean.includes('mới tiếp nhận') || clean.includes('chưa gọi')) {
    return 'khach_moi';
  }
  if (clean.includes('tiềm năng') || clean.includes('cân nhắc')) {
    return 'tiem_nang';
  }
  if (clean.includes('đàm phán') || clean.includes('cọc') || clean.includes('giữ chỗ')) {
    return 'dam_phan_coc';
  }
  if (clean.includes('đang chăm sóc') || clean.includes('chăm sóc lại') || clean.includes('nuôi dưỡng')) {
    return 'cham_soc_lai';
  }
  if (clean.includes('không nghe máy') || clean.includes('gọi lại sau') || clean.includes('máy bận') || clean.includes('thuê bao')) {
    return 'khong_nghe_may';
  }
  if (clean.includes('đã chốt') || clean.includes('thành công') || clean.includes('ký hđ')) {
    return 'da_chot';
  }

  return 'quan_tam_du_an';
};

/**
 * Get Scenario Configuration details
 */
export const getScenarioConfig = (scenarioId?: string): CustomerScenarioConfig | undefined => {
  if (!scenarioId) return undefined;
  return CUSTOMER_SCENARIOS.find((s) => s.id === scenarioId);
};

/**
 * Filter templates matching a lead's current status and scenario
 */
export const findTemplatesForLead = (
  templates: ZaloTemplate[],
  lead?: Partial<Lead> | null
): ZaloTemplate[] => {
  if (!lead) return templates;
  const detectedScenario = detectScenarioFromStatus(lead.status);

  // Match by scenario first
  const scenarioMatches = templates.filter((t) => t.scenario === detectedScenario);
  if (scenarioMatches.length > 0) {
    return scenarioMatches;
  }

  // Match by targetStatus
  const statusMatches = templates.filter(
    (t) => t.targetStatus && lead.status && t.targetStatus.toLowerCase() === lead.status.toLowerCase()
  );
  if (statusMatches.length > 0) {
    return statusMatches;
  }

  return templates;
};

/**
 * Replace dynamic placeholders with lead's actual data
 */
export const renderZaloTemplate = (
  templateContent: string,
  lead?: Partial<Lead> | null,
  currentUserName?: string,
  appointmentInfo?: { time?: string; date?: string; location?: string }
): string => {
  if (!templateContent) return '';
  if (!lead) return templateContent;

  const todayStr = new Date().toLocaleDateString('vi-VN');
  const assigneeName = lead.assignee || currentUserName || 'Chuyên viên tư vấn';
  const customerName = lead.fullName || 'anh/chị';
  const projectName = lead.project || 'Nhà Phố Trung Tâm';
  const productType = lead.productType || 'Nhà phố trung tâm';
  const phone = lead.phone || '';
  const budget = lead.budget || 'phù hợp';
  
  const appTime = appointmentInfo?.time 
    ? `${appointmentInfo.time} ${appointmentInfo.date || ''}` 
    : '09:30 sáng mai';
  const appLocation = appointmentInfo?.location || lead.project || 'Văn phòng bán hàng dự án';

  let rendered = templateContent;
  rendered = rendered.replace(/\{ten_khach\}/gi, customerName);
  rendered = rendered.replace(/\{du_an\}/gi, projectName);
  rendered = rendered.replace(/\{san_pham\}/gi, productType);
  rendered = rendered.replace(/\{nguoi_phu_trach\}/gi, assigneeName);
  rendered = rendered.replace(/\{sdt\}/gi, phone);
  rendered = rendered.replace(/\{ngan_sach\}/gi, budget);
  rendered = rendered.replace(/\{ngay\}/gi, todayStr);
  rendered = rendered.replace(/\{thoi_gian_hen\}/gi, appTime);
  rendered = rendered.replace(/\{dia_diem\}/gi, appLocation);

  return rendered;
};
