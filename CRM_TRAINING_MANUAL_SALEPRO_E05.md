# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG & ĐÀO TẠO VẬN HÀNH HỆ THỐNG CRM SALEPRO HCM_E05
**Đơn vị áp dụng:** Công ty Bất Động Sản Nhà Phố Trung Tâm  
**Mã chuẩn hệ thống:** SALEPRO HCM_E05 (CRM PRO Enterprise)  
**Phiên bản:** 2026.3 - Tài liệu lưu hành nội bộ  

---

## MỤC LỤC TỔNG QUÁT

1. **PHẦN 1: TỔNG QUAN HỆ THỐNG CRM SALEPRO HCM_E05**
   - 1.1. Mục tiêu và sứ mệnh của hệ thống
   - 1.2. Phân cấp vai trò & quyền hạn (Admin - TPKD - Sale)
   - 1.3. Giao diện trực quan & Hỗ trợ đa thiết bị (PC, Mobile, Tablet)
2. **PHẦN 2: QUY TRÌNH TIẾP NHẬN & XỬ LÝ LEAD CHUẨN BĐS**
   - 2.1. Quy trình chuẩn 6 bước từ Lead mới đến Chốt cọc
   - 2.2. Nhập Lead mới & Kiểm soát trường bắt buộc (FullName, Phone)
   - 2.3. Cơ chế chống trùng lặp SĐT & Kiểm tra danh tính Google Search
   - 2.4. Xác nhận "Tiếp nhận khách" & Kiểm soát thời gian vàng
   - 2.5. Tính năng "Ghi chú nhanh" (Bullet Points • kèm ngày giờ)
   - 2.6. Tích hợp Zalo 1-chạm & Nhắc hẹn Zalo Reminder
   - 2.7. Trợ lý Trí tuệ nhân tạo (AI Gemini) phân tích chân dung & chốt cọc
3. **PHẦN 3: CƠ CHẾ PHÂN BỔ KHÁCH HÀNG & CHÍNH SÁCH SLA**
   - 3.1. Phân bổ tự động xoay vòng (Round-Robin Auto Distribution)
   - 3.2. Tiêu chuẩn SLA phản hồi khách hàng (Speed-To-Lead)
   - 3.3. Cơ chế thu hồi & Tái phân bổ tự động khi chậm phản hồi
   - 3.4. Chuyển giao Lead (Transfer Lead) giữa các nhân sự
4. **PHẦN 4: QUẢN LÝ PIPELINE, BỘ LỌC THÔNG MINH & BÁO CÁO KPI**
   - 4.1. Hệ thống trạng thái Lead chuẩn & Vòng đời chăm sóc
   - 4.2. Bộ lọc nhanh theo Tiềm năng (Nóng 🔥, Ấm ☀️, Lạnh ❄️) & Kênh nguồn
   - 4.3. Quản lý Lịch hẹn xem BĐS (Appointment Calendar)
   - 4.4. Báo cáo Chủ nhật (Sunday KPI Report) & Xuất PDF Hoạt động tuần
   - 4.5. Xuất dữ liệu Excel/CSV phục vụ đối soát
5. **PHẦN 5: CẨM NANG THAO TÁC QUẢN TRỊ (ADMIN & TRƯỞNG PHÒNG)**
   - 5.1. Quản lý đội ngũ kinh doanh (Thêm Sale, Khóa/Mở, Phân quyền)
   - 5.2. Quản lý danh mục Dự án, Loại BĐS & Nguồn dữ liệu
   - 5.3. Đồng bộ dữ liệu hai chiều với Google Sheets
   - 5.4. Xử lý tranh chấp khách hàng trùng SĐT
   - 5.5. Quản lý mẫu kịch bản nhắn tin Zalo (Templates)
   - 5.6. Giám sát hoạt động qua Nhật ký hệ thống (System Logs)
6. **PHẦN 6: QUY TẮC BẢO MẬT DỮ LIỆU & KỶ LUẬT VẬN HÀNH**
   - 6.1. Quy tắc bảo mật thông tin khách hàng tuyệt đối
   - 6.2. Quyền sở hữu dữ liệu & Phòng chống thất thoát Lead
   - 6.3. Chuẩn mực nhập liệu và xử lý vi phạm

---

# PHẦN 1: TỔNG QUAN HỆ THỐNG CRM SALEPRO HCM_E05

### 1.1. Mục tiêu và sứ mệnh
Hệ thống **CRM SALEPRO HCM_E05** được thiết kế chuyên biệt cho ngành Bất động sản Trung tâm (Nhà phố Quận 1, Quận 3, Quận 10, Biệt thự, Căn hộ cao cấp) nhằm giải quyết 4 bài toán cốt lõi:
1. **Tốc độ (Speed-to-lead):** Khách hàng đăng ký được phân phối ngay lập tức tới chuyên viên tư vấn trong vòng dưới 30 giây.
2. **Minh bạch (Transparency):** Triệt tiêu 100% tình trạng tranh chấp khách, nhận trùng số điện thoại giữa các thành viên.
3. **Tỷ lệ chuyển đổi (Conversion Rate):** Nhắc việc tự động qua Zalo, AI gợi ý kịch bản đàm phán, quản lý lịch hẹn xem nhà chặt chẽ.
4. **Đo lường năng suất (Performance):** Tự động hóa báo cáo KPI, đánh giá chính xác hiệu quả từng kênh quảng cáo và từng chuyên viên Sale.

### 1.2. Phân cấp vai trò & quyền hạn (RBAC)
Hệ thống phân quyền nghiêm ngặt theo 3 cấp độ:
- **Quản trị viên (Admin - Ban Giám Đốc):** Toàn quyền kiểm soát hệ thống, quản lý cơ sở dữ liệu, phân quyền tài khoản, cấu hình chính sách phân bổ SLA, xem báo cáo tổng thể toàn công ty, xuất dữ liệu và giải quyết tranh chấp Lead.
- **Trưởng phòng kinh doanh (TPKD):** Quản lý toàn bộ nhân viên và khách hàng thuộc phòng ban của mình, phê duyệt chuyển giao Lead, giám sát tốc độ xử lý SLA, phân công khách VIP cho chuyên viên có năng lực cao.
- **Chuyên viên kinh doanh (Sale):** Quản lý danh sách khách hàng được phân công, thực hiện tiếp nhận, gọi điện, gửi Zalo, đặt lịch hẹn xem BĐS, cập nhật trạng thái và ghi chú nhật ký tương tác.

### 1.3. Giao diện trực quan & Hỗ trợ đa thiết bị
- **Trên máy tính (Desktop/Laptop):** Giao diện bảng Lead trực quan, hiển thị đầy đủ thông tin, thanh công cụ tìm kiếm lọc nâng cao, bảng điều khiển KPI đồ họa trực tiếp.
- **Trên điện thoại/Tablet (Mobile Responsive):** Thanh điều hướng Mobile Bottom Bar tiện lợi, nút bấm 1 chạm gọi điện, 1 chạm mở Zalo Chat, thao tác ghi chú nhanh mượt mà ngay trên đường dẫn khách đi thực địa.

---

# PHẦN 2: QUY TRÌNH TIẾP NHẬN & XỬ LÝ LEAD CHUẨN BĐS

```
[Khách đăng ký / Nhập Lead] 
           │
           ▼
[Kiểm tra Trùng SĐT + Check Google] ──(Trùng)──> [Hiện Cảnh Báo Tranh Chấp]
           │ (Hợp lệ)
           ▼
[Phân Bổ Cho Sale (SLA Bắt đầu)] 
           │
           ▼
[Sale Bấm "Tiếp Nhận Khách"] ──(Quá hạn SLA)──> [Tự Động Thu Hồi & Chia Lại]
           │ (Đã tiếp nhận)
           ▼
[Gọi Điện / Nhắn Zalo / Hẹn Giờ Nhắc]
           │
           ▼
[Ghi Chú Nhanh Bullet • / AI Chuẩn Hóa]
           │
           ▼
[Cập Nhật Trạng Thái & Lịch Hẹn Xem BĐS]
```

### 2.1. Thêm Lead mới & Kiểm soát dữ liệu đầu vào bắt buộc
Khi có khách hàng mới từ nguồn tự khai thác hoặc hotline:
1. Nhấn nút **`+ Thêm khách hàng`** (màu vàng hổ phách) ở góc trên bảng Lead.
2. **Quy tắc bắt buộc:**
   - **Họ và tên:** Tối thiểu 2 ký tự (Hệ thống sẽ báo đỏ và khóa nút Lưu nếu để trống).
   - **Số điện thoại:** Bắt buộc nhập đúng từ 9 - 11 chữ số.
3. Chọn đúng **Dự án quan tâm** (VD: *Nhà Phố Trung Tâm Quận 1*, *The Global City*...), **Khoảng tài chính** (VD: *15 - 20 Tỷ*) và **Loại BĐS**.
4. **Nhãn cảnh báo đỏ:** Nếu nhân viên bỏ sót trường bắt buộc, khung nhập liệu sẽ đổi viền đỏ `border-rose-500` kèm thông báo chi tiết lỗi, giúp ngăn ngừa triệt để tình trạng tạo dữ liệu rác.

### 2.2. Cơ chế chống trùng lặp SĐT & Kiểm tra danh tính Google Search
- **Phát hiện trùng thời gian thực (Real-time Duplicate Detection):** Ngay khi nhân viên nhập SĐT vào ô, hệ thống lập tức quét toàn bộ cơ sở dữ liệu. Nếu số điện thoại đã tồn tại:
  - Khung SĐT viền đỏ rực, hiển thị bảng cảnh báo: *"CẢNH BÁO TRÙNG LẶP SỐ ĐIỆN THOẠI!"*.
  - Hiển thị rõ: Tên khách hàng cũ, Ngày nhập, và **Sale đang phụ trách hiện tại**.
  - Khóa nút Lưu để chống tình trạng cướp khách hoặc chăm sóc chồng chéo.
- **Nút "🔍 Check Google":** Cạnh ô SĐT có nút tra cứu nhanh trên Google. Sale chỉ cần bấm để tự động kiểm tra số điện thoại đó có phải là môi giới khác, số ảo, hay doanh nghiệp nào trên Google Search.

### 2.3. Quy trình xác nhận "Tiếp nhận khách"
- Mỗi Lead mới chia về cho Sale sẽ có trạng thái **"Chưa tiếp nhận"**.
- Sale có trách nhiệm mở chi tiết khách hàng và bấm nút lớn màu xanh: **`Xác nhận Tiếp nhận khách`**.
- Thời điểm bấm sẽ được hệ thống đóng dấu thời gian (Timestamp) chính xác để tính chỉ số KPI tốc độ phản hồi.

### 2.4. Tính năng "Ghi chú nhanh" (Bullet Points •)
- Để tiết kiệm thời gian cho Sale khi đang gọi điện hoặc dẫn khách, modal chi tiết khách hàng trang bị nút **`Ghi chú nhanh`**:
  - Không cần bật chế độ chỉnh sửa phức tạp.
  - Tự động đánh dấu đầu dòng dạng Bullet point (`•`).
  - Tự động gắn mốc thời gian thực: `[27/09 14:30] • Khách cần nhà hẻm 6m, hướng Đông Nam`.
  - Hỗ trợ **Chip gợi ý 1 chạm**:
    - `+ Khách tài chính sẵn, cần nhà hẻm xe hơi trung tâm`
    - `+ Đã xem sổ hồng, hẹn cuối tuần dẫn người nhà đi xem`
    - `+ Cần tư vấn gói vay ngân hàng 30-50%`
  - Bấm phím tắt **`Ctrl + Enter`** (hoặc Cmd + Enter) để lưu tức thì.

### 2.5. Tích hợp Zalo 1-chạm & Nhắc hẹn Zalo Reminder
- **Mở Zalo trực tiếp:** Bấm biểu tượng Zalo cạnh SĐT để mở ngay cửa sổ chat Zalo với khách hàng (trên Zalo Web hoặc App Zalo PC/Điện thoại) mà không cần lưu danh bạ thủ công.
- **Đặt lịch nhắc hẹn Zalo (Zalo Reminder):**
  - Bấm nút **`Nhắc Zalo`** để đặt giờ hẹn chăm sóc lại (VD: Sau 2 tiếng, Ngày mai lúc 09:00, Sau 3 ngày...).
  - Đến giờ hẹn, CRM sẽ kích hoạt thông báo đẩy (Browser Push Notification) và Toast âm thanh nổi bật để Sale không bao giờ quên lịch khách.

### 2.6. Trợ lý Trí tuệ nhân tạo (Gemini AI)
- **AI Chuẩn hóa chính tả BĐS:** Tự động sửa lỗi gõ tắt tiếng Việt (VD: *"k", "dc", "q1", "sh"* ➔ *"không", "được", "Quận 1", "sổ hồng"*).
- **Phân tích chân dung khách hàng:** AI tự động đọc ghi chú lịch sử để đưa ra đánh giá:
  - Mức độ tiềm năng và khả năng chốt cọc.
  - Động lực mua chính (Mua để ở, giữ tiền hay đầu tư cho thuê).
  - Kịch bản tư vấn và phương án xử lý từ chối tối ưu cho căn nhà đang xem.

---

# PHẦN 3: CƠ CHẾ PHÂN BỔ KHÁCH HÀNG & CHÍNH SÁCH SLA

### 3.1. Phân bổ tự động xoay vòng (Round-Robin)
- Khi có Lead mới từ Marketing (Facebook Ads, Google, Website), hệ thống tự động gán lần lượt cho các Sale trong danh sách trực chiến theo vòng xoay tròn công bằng.
- Trưởng phòng có thể cấu hình loại trừ các nhân sự đang nghỉ phép hoặc tạm dừng nhận khách.

### 3.2. Tiêu chuẩn SLA phản hồi (Speed-To-Lead)
- **Thời gian vàng phản hồi:** Khách BĐS cần được liên hệ trong vòng **15 phút - 30 phút** đầu tiên kể từ khi đăng ký.
- Cột cảnh báo trên bảng Lead sẽ hiển thị:
  - 🟢 **Xanh (Trong hạn):** Dưới 15 phút.
  - 🟡 **Vàng (Sắp hết hạn):** Từ 15 - 30 phút.
  - 🔴 **Đỏ (Trễ hạn SLA):** Quá 30 phút mà Sale chưa xác nhận tiếp nhận và chưa có lịch sử cuộc gọi.

### 3.3. Cơ chế thu hồi & Tái phân bổ tự động
- Nếu một Lead mới bị Sale bỏ quên quá thời gian SLA quy định:
  - Hệ thống tự động kích hoạt **Thu hồi quyền chăm sóc**.
  - Đóng dấu vi phạm SLA: hiển thị huy hiệu `Thu hồi & chia lại (x1)`.
  - Tự động chuyển giao Lead cho Sale kế tiếp đang sẵn sàng.
  - Ghi nhận vi phạm vào bảng điểm KPI tuần của chuyên viên bỏ quên khách.

### 3.4. Chuyển giao Lead (Transfer Lead)
- Khi Sale không còn phụ trách dự án hoặc khách hàng có nhu cầu chuyển sang khu vực khác:
  - Bấm nút **`Chuyển giao`** trong chi tiết Lead.
  - Chọn Sale mới và ghi rõ lý do chuyển giao (VD: *"Khách đổi nhu cầu sang Nhà phố Q3 giao cho bạn Trường phụ trách"*).
  - Toàn bộ lịch sử chăm sóc trước đó được giữ nguyên vẹn để Sale mới nắm bắt thông tin liền mạch.

---

# PHẦN 4: QUẢN LÝ PIPELINE, BỘ LỌC THÔNG MINH & BÁO CÁO KPI

### 4.1. Hệ thống trạng thái Lead chuẩn & Vòng đời chăm sóc

| Nhóm trạng thái | Trạng thái chi tiết | Định nghĩa & Hành động yêu cầu |
|---|---|---|
| **Đầu phễu** | `Khách mới` | Khách vừa đổ về hệ thống, chưa liên hệ. Yêu cầu gọi ngay lập tức. |
| **Liên hệ thất bại** | `Không nghe máy`, `Máy bận`, `Thuê bao` | Chưa kết nối được. Cần gọi lại sau 2h hoặc gửi tin nhắn SMS/Zalo chào hỏi. |
| **Đang chăm sóc** | `Đang chăm sóc`, `Gửi thông tin`, `Quan tâm` | Đã kết nối, đang gửi bảng vẽ, sổ hồng, vị trí căn nhà qua Zalo. |
| **Tiềm năng cao** | `Tiềm năng`, `Hẹn xem BĐS` | Khách nét, tài chính khớp, đã chốt lịch đi xem nhà thực tế. |
| **Chốt giao dịch** | `Đàm phán / Cọc`, `Đã chốt` | Đang thương lượng giá với chủ nhà hoặc đã vào tiền cọc thành công. |
| **Loại bỏ** | `Không nhu cầu`, `Nhầm số` | Khách không có nhu cầu hoặc sai thông tin, lưu trữ vào kho data lạnh. |

### 4.2. Bộ lọc nhanh thông minh (Quick Filters)
Trên thanh công cụ phía trên bảng Lead, nhân viên có thể sử dụng các bộ lọc 1 chạm:
1. **Lọc theo Mức Tiềm Năng:**
   - 🔥 **Khách Nóng (Hot):** Khách có lịch hẹn xem nhà hoặc chuẩn bị cọc trong vòng 7 ngày ➔ *Ưu tiên chăm sóc số 1*.
   - ☀️ **Khách Ấm (Warm):** Khách đang quan tâm, đã có tài chính, đang lựa chọn căn phù hợp.
   - ❄️ **Khách Lạnh (Cold):** Khách chưa có nhu cầu gấp, cần nuôi dưỡng dài hạn.
2. **Lọc theo Kênh Nguồn (Data Source):**
   - Lọc nhanh các nguồn: *Facebook Ads, Google Search, Zalo Marketing, Giới thiệu / Khách cũ, Hotline Website...*
3. **Lọc theo Dự án & Khoảng ngày:**
   - Lọc các khách quan tâm riêng từng dự án (Quận 1, Quận 3, The Global City...).
   - Lọc ngày: Hôm nay, Hôm qua, 7 ngày qua, Tháng này.

### 4.3. Quản lý Lịch hẹn xem BĐS (Appointment Calendar)
- Khi khách đồng ý đi xem nhà, Sale bấm **`Đặt lịch hẹn`**:
  - Chọn ngày, giờ hẹn cụ thể.
  - Nhập địa chỉ căn nhà / vị trí đón khách.
  - Chọn căn nhà dẫn xem và người hỗ trợ (nếu có TPKD đi kèm).
- Lịch hẹn tự động hiển thị trên **Tab Lịch Xem BĐS** toàn công ty để tránh trùng lịch mở cửa căn nhà.

### 4.4. Báo cáo Chủ Nhật (Sunday KPI Report) & Xuất PDF Hoạt động tuần
- **Báo cáo KPI Chủ Nhật:** Tự động tổng hợp kết quả cả tuần vào mỗi tối Chủ Nhật:
  - Tổng số Lead tiếp nhận.
  - Tỷ lệ gọi điện đúng SLA.
  - Số cuộc hẹn dẫn xem nhà thành công.
  - Số giao dịch cọc phát sinh.
- **Xuất file PDF tuần:** Bấm nút **`Xuất PDF Hoạt động tuần`** để tạo báo cáo đẹp mắt gửi Ban Giám Đốc và lưu hồ sơ lưu trữ nội bộ.

### 4.5. Xuất dữ liệu Excel / CSV
- Hỗ trợ xuất danh sách khách hàng ra file Excel tiêu chuẩn chỉ với 1 click để phục vụ công tác đối soát chi phí Marketing và chia hoa hồng kinh doanh.

---

# PHẦN 5: CẨM NANG THAO TÁC QUẢN TRỊ (ADMIN & TRƯỞNG PHÒNG)

### 5.1. Quản lý Đội ngũ kinh doanh (SalesTeamView)
- **Thêm nhân sự mới:** Nhập Họ tên, Số điện thoại, Email và gán vai trò (`Sale` hoặc `TPKD`).
- **Phân bổ hạn mức Lead:** Thiết lập số lượng khách tối đa một nhân viên được giữ cùng lúc (tránh ôm quá nhiều data không chăm xuể).
- **Cấp lại mật khẩu:** Khôi phục mật khẩu đăng nhập cho nhân viên khi quên.
- **Khóa tài khoản nghỉ việc:** Khi nhân sự nghỉ việc, Admin khóa tài khoản ngay lập tức; toàn bộ Lead của nhân sự đó sẽ tự động được điều chuyển về cho người khác, không bị mất mát dữ liệu.

### 5.2. Quản lý Danh mục Dự án & Nguồn dữ liệu
- Admin có thể chủ động thêm mới các dự án mới mở bán hoặc bổ sung các kênh chiến dịch quảng cáo mới vào menu hệ thống mà không cần can thiệp kỹ thuật.

### 5.3. Đồng bộ dữ liệu hai chiều với Google Sheets
- Hệ thống hỗ trợ tích hợp Webhook đồng bộ tự động với Google Sheet chạy quảng cáo Facebook/Google:
  - Khách đăng ký trên biểu mẫu Google Sheet ➔ Đổ về CRM SALEPRO trong vòng 5 giây.
  - Trạng thái chăm sóc trên CRM cập nhật ➔ Tự động đồng bộ ngược lại Google Sheet báo cáo cho bộ phận Marketing.

### 5.4. Xử lý tranh chấp khách hàng trùng SĐT
- Khi phát hiện tranh chấp (khách cũ quay lại qua nguồn quảng cáo mới):
  - Admin và TPKD sẽ nhận thông báo tại **Duplicate Phone Warning Modal**.
  - **Quy tắc giải quyết:**
    - Nếu Sale cũ chăm sóc liên tục trong vòng 30 ngày gần nhất: Ưu tiên giữ lại cho Sale cũ.
    - Nếu Sale cũ bỏ quên trên 30 ngày không có nhật ký tương tác: Thu hồi chuyển sang cho Sale mới.

### 5.5. Quản lý mẫu tin nhắn Zalo (Zalo Templates)
- Admin cài đặt sẵn các mẫu tin nhắn chăm sóc chuẩn mực của công ty:
  - Mẫu chào khách mới đăng ký.
  - Mẫu gửi vị trí và thông số nhà phố.
  - Mẫu xác nhận lịch hẹn xem nhà cuối tuần.
  - Mẫu chúc mừng sinh nhật / lễ tết.

### 5.6. Giám sát an ninh qua Nhật ký hệ thống (System Logs)
- Ghi lại vết mọi thao tác: Ai đã đăng nhập, ai xem số điện thoại, ai chỉnh sửa trạng thái, ai xuất file Excel, thời điểm thao tác chính xác đến từng giây.

---

# PHẦN 6: QUY TẮC BẢO MẬT DỮ LIỆU & KỶ LUẬT VẬN HÀNH

### 6.1. Quy tắc bảo mật thông tin khách hàng tuyệt đối
1. **Dữ liệu thuộc sở hữu công ty:** Toàn bộ thông tin số điện thoại, nhu cầu và lịch sử giao dịch của khách hàng là tài sản sở hữu độc quyền của Công ty BĐS Nhà Phố Trung Tâm.
2. **Nghiêm cấm chia sẻ ra ngoài:** Tuyệt đối không sao chép, chụp màn hình gửi ra các hội nhóm ngoài công ty, không chia sẻ thông tin cho các sàn liên kết khi chưa có sự phê duyệt của Ban Giám Đốc.
3. **Mỗi tài khoản là duy nhất:** Chuyên viên tự bảo quản mật khẩu, không dùng chung tài khoản với đồng nghiệp.

### 6.2. Kỷ luật nhập liệu & Báo cáo hàng ngày
- **Nguyên tắc "Có gọi là có vết":** Bất kỳ tương tác nào với khách (gọi điện, chat Zalo, dẫn xem nhà) đều bắt buộc phải ghi lại ít nhất 1 dòng ghi chú trong CRM vào cuối ngày.
- **Cập nhật trạng thái trung thực:** Không để tình trạng khách đã từ chối nhưng vẫn để `Khách mới` để đối phó SLA.
- **Thời hạn xử lý:** Khách hàng được giao phải bấm "Tiếp nhận" trong vòng 15 phút và có cuộc gọi đầu tiên trong vòng 30 phút.

---

## 🎯 BẢNG TỔNG KẾT PHÍM TẮT & THAO TÁC NHANH CHO SALE

| Thao tác mong muốn | Nút bấm / Vị trí | Lợi ích |
|---|---|---|
| **Thêm khách mới** | Nút `+ Thêm khách hàng` (Góc trên bảng Lead) | Tạo hồ sơ khách hàng mới, kiểm tra lỗi đỏ tự động. |
| **Ghi chú nhanh** | Nút `Ghi chú nhanh` (Header hoặc thẻ Ghi chú) | Nhập bullet points • tự động kèm ngày giờ, phím tắt `Ctrl+Enter`. |
| **Chat Zalo** | Nút `Mở Zalo` cạnh SĐT | Mở thẳng cửa sổ Zalo Web/PC không cần lưu danh bạ. |
| **Hẹn giờ gọi lại** | Nút `Nhắc Zalo` (Icon chuông xanh) | Đặt báo thức thông báo đẩy nhắc lịch chăm sóc. |
| **Check số ảo** | Nút `🔍 Check Google` | Quét Google tức thì xem có phải số môi giới đối thủ. |
| **AI sửa lỗi chính tả** | Nút `AI Chuẩn hóa ghi chú` | Tự động chỉnh sửa câu từ chuyên nghiệp, lịch sự. |
| **Xem phân tích chốt cọc** | Thẻ `Phân tích khách hàng AI Gemini` | Đọc khuyến nghị kịch bản đàm phán giá từ AI. |

---
*Tài liệu ban hành bởi Ban Giám Đốc - Phòng Vận Hành Hệ Thống CRM SALEPRO HCM_E05.*  
*Mọi thắc mắc kỹ thuật vui lòng liên hệ Trưởng phòng CNTT / Admin hệ thống.*
