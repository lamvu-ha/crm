# Hướng dẫn sử dụng CRM SALEPRO (bản demo)

Địa chỉ: **http://127.0.0.1:3001** · Mật khẩu chung: **`Demo@2026!`**

| Tài khoản | Vai trò | Thấy được |
|---|---|---|
| `admin` | Quản trị (Admin) | Toàn bộ khách, nhân viên, dữ liệu hệ thống |
| `manager` | Trưởng phòng (TPKD) | Khách và lịch hẹn của cả phòng |
| `sale01`, `sale02` | Nhân viên kinh doanh (NVKD) | Chỉ khách mình phụ trách |

> Bản demo dùng dữ liệu giả. Gọi điện, Zalo, Google, Gmail và Gemini AI đã bị **tắt**, nên các nút này có thể báo "Kết nối ngoài đã tắt".

---

## 1. Phần dùng chung cho cả 3 vai trò

### Đăng nhập
Nhập tên đăng nhập và mật khẩu, rồi bấm **ĐĂNG NHẬP VÀO HỆ THỐNG**. Lần đầu đăng nhập, nên đổi mật khẩu bằng nút **Đổi mật khẩu**.

### Thanh trên cùng

| Nút | Tác dụng |
|---|---|
| Ô **Tìm tên khách, số điện thoại…** | Tìm nhanh khách hàng |
| **Tỷ lệ Hẹn xem** | Xem tỷ lệ khách chuyển sang hẹn xem nhà của bạn |
| 🔔 (chuông) | Thông báo khách mới được chia, lịch sắp tới |
| 💬 / **Chat TPKD & NVKD** | Nhắn tin nội bộ, có thể gắn kèm khách hàng |
| **Cài đặt** / **Cài đặt mẫu tin Zalo** | Kho mẫu tin nhắn Zalo theo tình huống; chỉ tiêu KPI |
| **+ Thêm lead mới** | Thêm khách hàng bằng tay |
| **Báo cáo tuần (Tối CN)** / **KPI Tối CN** | Tiến độ KPI tuần: 2 khách kết nối Zalo mỗi ngày, 2 hẹn gặp mỗi tuần |
| **Báo cáo PDF tuần** | Xuất báo cáo hoạt động tuần ra file PDF để nộp cấp trên |
| **Đổi mật khẩu** / **Đăng xuất** | Như tên gọi |

### Các màn hình (tab)

| Tab | Dùng để |
|---|---|
| **Bảng dữ liệu chuẩn** | Danh sách khách dạng thẻ. Đây là màn hình làm việc chính |
| **Phễu bán hàng (Kanban)** | Khách xếp theo cột trạng thái; nút **Chuyển bước kế tiếp** / **Lùi 1 bước** |
| **Lịch hẹn xem BĐS** | Các lịch dẫn khách đi xem; đặt lịch mới |
| **Đội ngũ sale & phân bổ** | Danh sách sale, số khách mỗi người, chỉ số SLA |
| **Báo cáo & tỷ lệ chốt**, **Hiệu suất & Sản lượng**, **Báo cáo thông minh** | Biểu đồ: tỷ lệ chốt, nguồn khách, dự án, dự báo doanh số |

### Bộ lọc nhanh
- Bấm một **trạng thái** (Khách mới, Quan tâm, Hẹn xem BĐS…) để lọc khách theo trạng thái đó.
- **Hôm nay / Tuần này / Tháng này**: lọc theo ngày khách được đẩy về.
- **Chờ tiếp nhận / Cần follow-up gấp / Quá hạn SLA**: khách cần xử lý ngay. Quá hạn lâu có thể bị thu hồi.
- Ngoài ra còn lọc theo dự án, nguồn, loại sản phẩm, nhân sự và thẻ.

### Thẻ khách hàng (mỗi khách một thẻ)

| Nút | Tác dụng |
|---|---|
| **Ô trạng thái** (góc trên, có màu) | Đổi trạng thái khách. Chọn **Hẹn xem BĐS** thì app mở form đặt lịch (xem mục *Đặt lịch hẹn xem* bên dưới) |
| **Hồ sơ & lịch sử** | Mở hồ sơ đầy đủ |
| 📋 cạnh số điện thoại | Sao chép số |
| **Thêm ghi chú** | Ghi nhanh kết quả chăm sóc, rồi bấm **Lưu ghi chú** |
| **+ Thẻ** | Gắn nhãn: Hot, Cần tư vấn vay, Đầu tư, Khách VIP… |
| **Gọi điện** / **Zalo** | Gọi điện, mở Zalo của khách |
| **Mẫu tin nhắn** | Chọn kịch bản Zalo có sẵn, sao chép rồi gửi |
| **Lịch hẹn** | Mở form đặt lịch xem nhà, khách đã được chọn sẵn |
| **Nhắc Zalo** | Hẹn giờ để app nhắc nhắn Zalo cho khách |
| **Chat nội bộ** | Trao đổi với TPKD về khách này |
| **Tiếp nhận** | Xác nhận đã nhận khách. **Bấm ngay khi được chia** để không bị thu hồi |
| **Chuyển khách** (TPKD/Admin) / **Đề xuất chuyển** (NVKD) | TPKD/Admin chuyển thẳng. NVKD gửi đề xuất cho TPKD duyệt. Khi đang chờ duyệt, nút hiện **Chờ duyệt chuyển** |
| **Đánh giá AI** | AI chấm mức Nóng / Ấm / Lạnh |

### Hồ sơ khách (bấm "Hồ sơ & lịch sử")
- **Gọi ngay / Zalo Chat / Hẹn xem**: ba thao tác chính.
- **Hẹn gọi lại / Nhắc Zalo / Follow-up**: đặt lịch nhắc gọi lại, nhắn Zalo, chăm sóc định kỳ (ví dụ mỗi 3 ngày).
- **Sửa**: sửa thông tin khách.
- **Đã chốt**: chuyển khách sang Đã chốt.
- **+ Đánh dấu Zalo KPI**: ghi nhận đã kết nối Zalo với khách (được tính vào KPI 2 Zalo mỗi ngày).
- Tab **Lịch sử chăm sóc**: toàn bộ ghi chú, lần đổi trạng thái, lịch hẹn, lần chuyển sale.

### Đặt lịch hẹn xem
1. Bấm **Lịch hẹn** trên thẻ (hoặc **Hẹn xem** trong hồ sơ, hoặc chọn trạng thái **Hẹn xem BĐS**).
2. Form mở ra với khách đã chọn sẵn. Nhập:
   - **Ngày hẹn** theo dạng ngày/tháng/năm. Gõ liền `10102026` là được ngày 10/10/2026, hoặc bấm 📅 để chọn.
   - Giờ, địa điểm, ghi chú.
3. Bấm **Lưu Lịch Hẹn**. Sau khi lưu:
   - khách tự chuyển sang **Hẹn xem BĐS**;
   - lịch được ghi vào lịch sử khách;
   - TPKD thấy lịch này trên máy của họ.
4. Nếu báo **Trùng lịch** thì đổi giờ khác: mỗi sale cách nhau ít nhất 60 phút.
5. Sau buổi hẹn, vào tab **Lịch hẹn xem BĐS** và bấm **Đã xem** hoặc **Dời lịch**.
6. Bấm **Bật thông báo đẩy** một lần để trình duyệt báo trước giờ hẹn 30 phút.

---

## 2. NVKD (`sale01`, `sale02`): việc hằng ngày

1. Đăng nhập, rồi bấm bộ lọc **Chờ tiếp nhận**. Bấm **Tiếp nhận** cho từng khách mới.
2. Gọi điện hoặc nhắn Zalo cho khách (dùng **Mẫu tin nhắn** nếu cần).
3. Bấm **Thêm ghi chú** để ghi kết quả, sau đó đổi **trạng thái** (Quan tâm, Tiềm năng, Gọi lại sau…).
4. Khách đồng ý đi xem: đặt **lịch hẹn**. Khách hẹn gọi lại: dùng **Hẹn gọi lại** trong hồ sơ.
5. Cuối ngày, xem bộ lọc **Cần follow-up gấp** và **Quá hạn SLA** để không bỏ sót khách.
6. Theo dõi chỉ tiêu bằng **KPI Tối CN**.

**Muốn chuyển khách cho người khác** (nghỉ phép, khách muốn đổi người…):
1. Trên thẻ khách, bấm **Đề xuất chuyển**. Muốn chuyển nhiều khách thì tích chọn các khách rồi bấm **Đề xuất chuyển (N)**.
2. Điền **tóm tắt bàn giao** (nhu cầu chính, trao đổi gần nhất, việc cần làm tiếp) và **lý do**. Có thể **gợi ý người nhận**, hoặc để TPKD tự chọn.
3. Bấm **Gửi đề xuất cho TPKD**. Khách **vẫn do bạn chăm sóc** cho tới khi TPKD duyệt. Thẻ khách hiện **Chờ duyệt chuyển**.
4. Khi TPKD duyệt hoặc từ chối, app hiện thông báo cho bạn. Muốn rút lại thì bấm **Xem đề xuất** trên thanh vàng, rồi bấm **Huỷ đề xuất**.

**NVKD không làm được:**
- xem khách của sale khác;
- xóa khách, xuất file;
- tự đổi người phụ trách (phải qua TPKD duyệt).

Khách do NVKD tự thêm (**+ Thêm lead mới**) được gán luôn cho chính người đó.

---

## 3. TPKD (`manager`): thêm so với NVKD

| Nút | Tác dụng |
|---|---|
| **Full phòng / Khách TPKD / Khách NVKD** | Xem khách của cả phòng, của riêng mình, hoặc của các sale |
| Ô **Tất cả nhân sự phòng** | Lọc khách theo từng sale |
| **Chuyển khách** (trên thẻ) | Chọn sale nhận, điền **Tóm tắt bàn giao** (nhu cầu, trao đổi gần nhất, việc cần làm), rồi bấm **Xác nhận chuyển** |
| Thanh vàng **"Có N đề xuất chuyển khách đang chờ bạn duyệt"**, nút **Xem & duyệt** | Đọc lý do và tóm tắt bàn giao của NVKD. Chọn người nhận (mặc định là người NVKD gợi ý), có thể ghi chú, rồi bấm **Duyệt chuyển** hoặc **Từ chối**. Lịch sử khách ghi lại toàn bộ |
| **⚡ Phân bổ khách cho Sale** | Chia nhiều khách cùng lúc cho các NVKD. ⚠️ Xem kỹ số khách trước khi bấm **Xác nhận phân bổ** |
| **Làm mới** | Tải lại dữ liệu mới nhất |
| Tab **Lịch hẹn xem BĐS** | Thấy lịch hẹn của mọi sale trong phòng; có thể bấm **Đã xem** / **Dời lịch** |
| **Báo cáo tuần (Tối CN)** | Bảng KPI cả đội: Xuất sắc / Đạt / Chưa đạt / Cảnh báo |

**TPKD không làm được:**
- xóa khách;
- xuất file CSV;
- quản lý tài khoản nhân viên.

---

## 4. Admin (`admin`): thêm so với TPKD

| Nút | Tác dụng |
|---|---|
| **Quản trị backend** | Trung tâm quản trị: tải tệp khách, quản lý nhân viên, cơ sở dữ liệu, cờ tính năng, nhật ký kiểm toán |
| **Tải lên khách hàng (DB)** / **Nhập CSV** | Nạp file khách (CSV, Excel). Chọn cách chia: giữ theo cột "Người phụ trách", chia xoay vòng, hoặc giao cho 1 sale. Chọn cách xử lý khách trùng số điện thoại (nên chọn **Bảo vệ Sale cũ**) |
| **Xuất CSV** | Tải toàn bộ danh sách khách ra file CSV |
| **Quản lý nhân viên** | Thêm nhân viên, phân quyền TPKD/NVKD, đổi mật khẩu, bật/tắt nhận khách, xóa nhân viên |
| **Quản trị database** | **Tải bản sao lưu (JSON)**, chia khách chưa gán, chia lại tất cả. ⚠️ **Xóa sạch khách hàng demo** sẽ xóa dữ liệu |
| **Nhật ký** / tab **Nhật ký hệ thống** | Ai đăng nhập, sửa, xóa, chuyển khách lúc nào; có thể xuất CSV |
| **Xóa** (trên thẻ) / **Xoá khách** (trong hồ sơ) | Xóa khách. Chỉ Admin được làm |
| **Đổi tài khoản** | Chuyển nhanh sang phiên của người khác để kiểm tra |
| **Khôi phục dữ liệu mẫu** (cuối trang) | ⚠️ Đưa dữ liệu về ban đầu |

**Lưu ý khi nhập file:**
- Không mở file CSV bằng Excel rồi lưu lại, vì Excel làm mất số 0 đầu số điện thoại. Chọn thẳng file gốc khi nhập.
- Không đặt tên khách có chữ "mẫu" hoặc "demo": hệ thống sẽ tự ẩn những khách này.

---

## 5. Gợi ý buổi demo (khoảng 15 phút)

1. **Admin:**
   - nhập file `du_lieu_khach_thu_nghiem.csv`, chọn **giữ theo cột Người phụ trách**;
   - mở **Quản lý nhân viên** để giới thiệu phân quyền.
2. **sale01:**
   - **Tiếp nhận** một khách, **Thêm ghi chú**, đổi trạng thái sang **Quan tâm**;
   - chọn **Hẹn xem BĐS**, đặt lịch, rồi kiểm tra khách đã chuyển trạng thái.
3. **sale01:** bấm **Đề xuất chuyển** một khách, gợi ý Chuyên viên 02, rồi gửi.
4. **manager** (mở ở trình duyệt khác hoặc cửa sổ ẩn danh):
   - vào **Lịch hẹn xem BĐS**, thấy lịch sale01 vừa đặt, bấm **Đã xem**;
   - trên thanh vàng bấm **Xem & duyệt**, rồi **Duyệt chuyển**. Màn hình sale01 sẽ hiện thông báo "TPKD đã duyệt…".
5. **sale02:** đăng nhập và thấy khách vừa được chuyển sang.
