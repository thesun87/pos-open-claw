---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-02b-vision", "step-02c-executive-summary", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-12-complete", "step-e-01-discovery", "step-e-02-review", "step-e-03-edit"]
completedAt: "2026-05-09"
lastEdited: "2026-05-25"
releaseMode: single-release
inputDocuments:
  - "docs/product-requirement.md"
  - "_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md"
workflowType: 'prd'
workflow: 'edit'
classification:
  projectType: web_app
  domain: general
  complexity: medium
  projectContext: brownfield
editHistory:
  - date: "2026-05-25"
    source: "SCP-2026-05-25-table-mgmt (approved)"
    changes: "Mở rộng MVP scope sang dual-mode (counter + table service): thêm FR44-FR52 (gồm FR47b) + NFR18 + HT5/HT5b; cập nhật Đối tượng, MVP capabilities, Out-of-scope, Sau-MVP"
  - date: "2026-06-04"
    source: "SCP-2026-06-01-offline-table-sessions (approved)"
    changes: "Offline table management + cross-device table sessions (Phase 1): sửa FR50 (status có phiên mở + offline derive); thêm FR53-56 (open session, cross-device occupancy, offline parity, conflict keep-both) + NFR19; đánh dấu Epic 7 shared-tab là Phase 2 deferred trong Sau-MVP"
---

# Tài Liệu Yêu Cầu Sản Phẩm - Café POS MVP

**Tác giả:** Tuan.nguyen
**Ngày:** 2026-05-09

## Tóm tắt Điều hành

Café POS MVP là PWA (Progressive Web App) tối ưu cho quầy bán hàng quán cà phê nhỏ. Thu ngân hoàn thành giao dịch dù có hay không có mạng; đơn hàng lưu cục bộ và đồng bộ lên server khi có kết nối. Admin quản lý menu và xem báo cáo doanh thu từ dữ liệu đã đồng bộ.

**Đối tượng:** Quán cà phê hoặc F&B quy mô nhỏ — vận hành theo mô hình **counter-service** (phục vụ tại quầy) **hoặc table-service** (phục vụ tại bàn). Một thiết bị POS (tablet landscape hoặc laptop nhỏ), một admin/chủ quán, một hoặc nhiều thu ngân. Chế độ bàn bật/tắt theo store qua `tableMode`.

### Điểm khác biệt cốt lõi

**Offline-first by design** — không phải tính năng bổ sung mà là kiến trúc nền tảng. Thu ngân đã xác thực tiếp tục bán hàng liên tục tối đa 7 ngày không cần mạng. Đơn hàng lưu vào IndexedDB và đồng bộ idempotent lên server khi có mạng. Giá và tùy chọn tại thời điểm bán được lưu snapshot — dữ liệu lịch sử không thay đổi khi menu cập nhật.

| Thuộc tính | Giá trị |
|---|---|
| Loại dự án | Web App / PWA |
| Lĩnh vực | F&B / Retail POS |
| Độ phức tạp | Medium |
| Phạm vi phát hành | Một bản duy nhất (MVP) |

## Tiêu chí Thành công

### Thành công với Người dùng

- Thu ngân hoàn thành đơn hàng offline trong dưới 60 giây — cùng luồng thao tác như khi online.
- Thu ngân thấy trạng thái kết nối và số đơn chờ đồng bộ mà không cần tra cứu.
- Thu ngân nhận hóa đơn in được ngay sau khi hoàn tất, cả online lẫn offline.
- Admin tạo/sửa sản phẩm, danh mục, nhóm tùy chọn không cần hỗ trợ kỹ thuật.
- Admin xem báo cáo doanh thu trong vòng vài giây sau khi chọn khoảng ngày.

### Thành công về Kỹ thuật

- Đơn hàng offline đồng bộ đúng một lần dù client retry nhiều lần (idempotency đảm bảo).
- Snapshot tại thời điểm bán không bị thay đổi khi menu cập nhật sau đó.
- Session offline hợp lệ đúng 7 ngày kể từ lần xác thực online cuối — không lưu mật khẩu cục bộ.
- Developer mới setup DB, chạy migration, seed dữ liệu demo, và khởi động web/API chỉ với lệnh được ghi trong tài liệu.

### Kết quả Đo được (Acceptance Criteria)

| Kịch bản | Điều kiện | Kết quả kỳ vọng |
|---|---|---|
| Bán offline | Thu ngân đã đăng nhập ≤7 ngày, app offline | Hoàn thành đơn, nhận mã đơn cục bộ, thấy trạng thái "chờ đồng bộ" |
| Đồng bộ đơn hàng | Đơn offline tồn tại cục bộ, có mạng trở lại | Đồng bộ đúng 1 lần dù retry |
| Snapshot menu | Giá sản phẩm thay đổi trên server | Đơn hàng cũ giữ nguyên giá tại thời điểm bán |
| Cập nhật menu | Admin sửa sản phẩm, POS kết nối lại | Đơn mới dùng menu mới, đơn cũ không đổi |
| Báo cáo cơ bản | Đơn đã đồng bộ tồn tại trên server | Hiển thị doanh thu, số đơn, theo PTTT, top sản phẩm |

## Phạm vi Sản phẩm

### MVP — Bản phát hành duy nhất

**Tiêu chí "đủ tốt để ra mắt":** Thu ngân hoàn thành đơn offline → sync thành công khi có mạng → admin xem báo cáo chính xác. Developer mới setup được trong một buổi.

**Hành trình được hỗ trợ đầy đủ:**
- HT1: Thu ngân bán hàng online (happy path)
- HT2: Thu ngân bán hàng offline + auto-sync khi có mạng
- HT3: Admin quản lý menu + versioned sync xuống POS
- HT4: Admin xem báo cáo doanh thu theo khoảng ngày
- HT5: Thu ngân bán hàng table-service (table-first flow + quick-counter trong cùng store `tableMode=true`)

**Khả năng cốt lõi:**
- POS: lưới sản phẩm theo danh mục, tìm kiếm, giỏ hàng, modal tùy chọn, ghi chú item, giảm giá toàn đơn, chọn phương thức thanh toán, hóa đơn in qua trình duyệt
- Offline-first: IndexedDB/Dexie, sync idempotent, retry tự động, indicator trạng thái kết nối
- Quản lý menu admin: CRUD danh mục/sản phẩm/nhóm tùy chọn, bật/tắt, sắp xếp thứ tự, versioned sync
- Auth: JWT + refresh token, session offline 7 ngày, revocation phía server
- Báo cáo: doanh thu theo ngày, số đơn, theo phương thức thanh toán, top sản phẩm
- Demo cục bộ: Docker Compose PostgreSQL, migration, seed data café mẫu
- **Quản lý bàn (mode toggle):** Khu vực + bàn CRUD admin; gắn order với bàn (snapshot tên bàn immutable); table picker khi finalize; floor-plan view theo khu vực; tắt mặc định cho store counter-service.

### Ngoài Phạm vi MVP

Split/merge bill · reservation/đặt bàn trước · transfer bàn · floor-plan visual editor · tồn kho/nguyên liệu/công thức · cổng thanh toán/QR động · màn hình bếp/barista · in nhiệt ESC/POS · ảnh sản phẩm · giao diện đa chi nhánh · loyalty/voucher · production deployment · audit log · backup/restore thủ công.

### Chiến lược Tăng trưởng (Sau MVP)

Quản lý bàn nâng cao (split/merge bill, KOT in bếp, reservation, transfer), tồn kho, tích hợp cổng thanh toán, màn hình bếp, in nhiệt ESC/POS, ảnh sản phẩm, giao diện đa chi nhánh, loyalty/điểm thưởng/voucher, báo cáo nâng cao và analytics thời gian thực.

**Sau-MVP / Phase 2 — Epic 7 "Shared Table Sessions"** (deferred qua SCP-2026-06-01):
- Tab chia sẻ đầy đủ cross-device (POS khác mở được tab đang mở, xem + thêm item vào cùng đơn).
- Màn gộp/đối soát phiên bàn (merge session) khi có xung đột.
- Đồng bộ item-event 2 chiều (append-only + tombstone, union semantics).

### Giảm thiểu Rủi ro

| Rủi ro | Mức độ | Giảm thiểu |
|---|---|---|
| Sync idempotency broken khi retry | Cao | Unit test toàn diện cho `client_order_id` dedup logic |
| Session offline expire giữa ca | Trung bình | Cảnh báo khi còn < 24h, hiển thị thời gian hết hạn |
| IndexedDB bị xóa do storage pressure | Trung bình | Sync ngay khi có mạng, không trì hoãn |
| Menu version mismatch | Thấp | Versioned snapshot + incremental pull với full fallback |
| Developer setup phức tạp | Thấp | Docker Compose + documented commands + seed data sẵn |

## Hành trình Người dùng

### Hành trình 1: Thu ngân — Bán hàng online (Happy Path)

**Nhân vật:** Linh, 24 tuổi, thu ngân. Ca sáng 7h, khách xếp hàng dài — cần xử lý nhanh.

- **Mở màn:** Linh mở tablet, vào POS. Lưới sản phẩm hiển thị theo danh mục.
- **Diễn biến:** Khách gọi Bạc Xỉu size L ít đường. Linh chọn sản phẩm → modal tùy chọn → chọn size L, ít đường → giỏ hàng cập nhật với giá snapshot.
- **Đỉnh điểm:** Khách trả tiền mặt. Linh chọn "Tiền mặt" → "Hoàn tất" → hệ thống gán mã `20260509-POS01-0003` và đồng bộ ngay lên server.
- **Kết thúc:** Hóa đơn hiện lên, Linh in qua trình duyệt. Tổng thời gian: dưới 45 giây.

**Yêu cầu lộ ra:** FR8-FR18, FR19-FR21.

---

### Hành trình 2: Thu ngân — Bán hàng offline (Edge Case)

**Nhân vật:** Linh, giữa ca, router quán mất mạng đột ngột.

- **Mở màn:** Header POS hiển thị "Offline". Linh lo lắng nhưng app hoạt động bình thường.
- **Diễn biến:** Linh tiếp tục nhận đơn. Mỗi đơn lưu vào IndexedDB với `pending_sync`. Header hiện "3 đơn chờ đồng bộ".
- **Đỉnh điểm:** 20 phút sau mạng trở lại. Hệ thống auto-retry sync trong nền.
- **Kết thúc:** Indicator chuyển "Online", bộ đếm về 0. Không mất đơn nào.

**Yêu cầu lộ ra:** FR22-FR25, NFR13-NFR16.

---

### Hành trình 3: Admin — Quản lý menu

**Nhân vật:** Minh, chủ quán, 38 tuổi. Muốn thêm "Trà Đào Cam Sả" và tắt "Sinh Tố Bơ" hết nguyên liệu.

- **Mở màn:** Minh đăng nhập Admin (online), vào Quản lý Sản phẩm.
- **Diễn biến:** Tạo "Trà Đào Cam Sả", danh mục "Trà", nhóm tùy chọn size S/M/L và topping, giá 45.000đ, bật "Đang bán". Tắt "Sinh Tố Bơ". Server tăng `menu_version`.
- **Kết thúc:** POS của Linh kết nối lại, tự kéo menu mới. Đơn mới hiện "Trà Đào Cam Sả", không hiện "Sinh Tố Bơ". Đơn cũ giữ nguyên.

**Yêu cầu lộ ra:** FR27-FR36.

---

### Hành trình 4: Admin — Xem báo cáo cuối ngày

**Nhân vật:** Minh muốn kiểm tra doanh thu tuần trước khi về.

- **Mở màn:** Vào tab Báo cáo, chọn khoảng 01/05–09/05.
- **Kết thúc:** Hiển thị doanh thu theo ngày, tổng đơn, phân bổ tiền mặt/chuyển khoản/thẻ, top 5 sản phẩm bán chạy. Kết quả trong dưới 5 giây.

**Yêu cầu lộ ra:** FR37-FR40.

---

### Hành trình 5: Thu ngân — Bán hàng table-service (table-first flow)

**Nhân vật:** Linh, F&B store có 6 bàn ở 2 khu (Quầy chính, Sân ngoài), `tableMode=true`.

- **Mở màn:** Linh mở POS. Landing là **floor-plan**, header hiển thị "Chế độ bàn: Bật". Thấy bàn 1-4 trống, bàn 5 vàng (đang có order).
- **Diễn biến:** Khách ngồi bàn 3. Linh **click bàn 3** trên floor-plan → vào màn hình chọn món, header sticky hiển thị "Bàn 3" + nút "Đổi bàn"/"Hủy". Thêm món Bạc Xỉu size L → finalize.
- **Đỉnh điểm:** Hệ thống lưu order với `tableId=bàn-3` + `tableNameSnapshot="Bàn 3"`; sync ngay nếu online.
- **Kết thúc:** Hóa đơn in "Bàn 3 — 20260525-POS01-0007". Floor-plan refresh, bàn 3 trở lại trạng thái trống.

**Yêu cầu lộ ra:** FR44, FR45, FR46, FR47, FR49, FR50, FR51, FR52, NFR18.

---

### Hành trình 5b: Thu ngân — Quick-counter trong table mode

**Nhân vật:** Linh, cùng store như HT5; khách mua mang đi (không ngồi bàn).

- **Mở màn:** Linh đang ở floor-plan view.
- **Diễn biến:** Linh bấm nút **"Bán hàng nhanh"** ở header → vào giao diện chọn món counter-service giống MVP hiện tại (không có "Bàn X" header).
- **Đỉnh điểm:** Thêm món → finalize → order có `tableId=null`, `tableNameSnapshot=null`.
- **Kết thúc:** Hóa đơn không in dòng "Bàn"; floor-plan không cập nhật trạng thái bàn nào.

**Yêu cầu lộ ra:** FR47b, FR48 (UI parity), FR51 (nullable), FR52 (ẩn dòng).

### Bản đồ Khả năng từ Hành trình

| Khả năng | Hành trình |
|---|---|
| Lưới sản phẩm + tìm kiếm | HT1, HT2 |
| Modal tùy chọn + ghi chú item | HT1 |
| Giỏ hàng + snapshot giá | HT1, HT2 |
| Offline indicator + pending counter | HT2 |
| Auto-sync + manual retry | HT2 |
| CRUD menu admin + versioned sync | HT3 |
| Bảo vệ snapshot đơn cũ | HT3 |
| Báo cáo date-range | HT4 |
| CRUD area/bàn + mode toggle `tableMode` | HT5 |
| Floor-plan view + table picker + status bàn | HT5 |
| Snapshot tên bàn (immutable AR24) | HT5 |
| Quick-counter "Bán hàng nhanh" trong table mode | HT5b |

## Yêu cầu Đặc thù Domain

### Tính toàn vẹn Dữ liệu Tài chính

- Mỗi dòng đơn hàng lưu snapshot tại thời điểm bán: tên sản phẩm, giá gốc, tùy chọn đã chọn, delta giá tùy chọn, ghi chú, tổng dòng.
- Thay đổi menu không được ghi đè dữ liệu đơn hàng lịch sử.
- Hủy đơn sau khi sync phải tạo bản ghi void/refund riêng biệt — không âm thầm sửa lịch sử tài chính.
- Đơn hàng đã sync không được chỉnh sửa trực tiếp trên server.

### Ràng buộc Đồng bộ

- Sync idempotent theo `client_order_id`; server deduplicate theo `(tenant_id, store_id, device_id, client_order_id)`.
- Dữ liệu đơn hàng chỉ đi một chiều: POS → Server (append-only).
- Model dữ liệu server gồm `tenant_id` và `store_id` dù UI MVP chỉ hiện một cửa hàng.

## Yêu cầu Đặc thù Web App (PWA)

### Kiến trúc & Trình duyệt

SPA dạng PWA, không có yêu cầu SEO (công cụ nội bộ). Bố cục tối ưu cho tablet landscape và laptop nhỏ (≥ 1024px). Không cần responsive mobile-portrait.

| Trình duyệt | Thiết bị | Mức hỗ trợ |
|---|---|---|
| Chrome mới nhất | Tablet Android, Laptop | Chính thức |
| Safari mới nhất | iPad, MacBook | Chính thức |
| Firefox mới nhất | Laptop | Khuyến nghị |

### Bố cục

- Hai cột cố định: cột trái lưới sản phẩm/danh mục, cột phải giỏ hàng.
- Khu vực Admin: form/table chuẩn, không cần layout đặc biệt.

### Chiến lược Offline (PWA)

- Service Worker cache shell và assets tĩnh.
- IndexedDB (Dexie) lưu đơn hàng pending, menu cache, session cache.
- Toàn bộ luồng bán hàng hoạt động khi offline; sync tự động trong nền khi có mạng — không reload trang.

### Khả năng Tiếp cận

- Keyboard navigation cơ bản cho các thao tác chính.
- Contrast màu đọc được trong môi trường ánh sáng đa dạng của quán cà phê.
- Font size đủ lớn cho thao tác nhanh trên tablet.

## Yêu cầu Chức năng

### Xác thực & Phiên làm việc

- **FR1:** Người dùng có thể đăng nhập bằng email và mật khẩu khi có kết nối internet.
- **FR2:** Hệ thống lưu phiên offline hợp lệ tối đa 7 ngày kể từ lần xác thực online cuối.
- **FR3:** Thu ngân có thể tiếp tục sử dụng POS khi offline nếu phiên còn hợp lệ.
- **FR4:** Hệ thống tự động làm mới access token mà không yêu cầu người dùng đăng nhập lại.
- **FR5:** Admin có thể thu hồi phiên người dùng từ phía server.
- **FR6:** Hệ thống chuyển hướng về màn hình đăng nhập kèm thông báo rõ ràng khi phiên hết hạn.
- **FR7:** Hệ thống điều hướng người dùng đến khu vực POS hoặc Admin theo vai trò sau khi đăng nhập.

### Giao diện POS Bán hàng

- **FR8:** Thu ngân có thể xem danh sách sản phẩm nhóm theo danh mục.
- **FR9:** Thu ngân có thể tìm kiếm sản phẩm theo tên.
- **FR10:** Thu ngân có thể chọn sản phẩm có tùy chọn qua modal tùy chọn.
- **FR11:** Thu ngân có thể chọn tùy chọn bắt buộc và không bắt buộc trong modal tùy chọn.
- **FR12:** Thu ngân có thể thêm ghi chú tùy chọn cho từng item trong giỏ hàng.
- **FR13:** Thu ngân có thể điều chỉnh số lượng và xóa item khỏi giỏ hàng.
- **FR14:** Thu ngân có thể áp dụng giảm giá toàn đơn theo số tiền cố định hoặc phần trăm.
- **FR15:** Thu ngân có thể chọn một phương thức thanh toán cho mỗi đơn (tiền mặt, chuyển khoản, thẻ).
- **FR16:** Thu ngân có thể hoàn tất đơn hàng khi online hoặc offline.
- **FR17:** Thu ngân có thể hủy toàn bộ đơn hàng kèm lý do hủy.
- **FR18:** Thu ngân có thể xem hóa đơn và in qua chức năng in của trình duyệt.

### Quản lý Đơn hàng & Đồng bộ

- **FR19:** Hệ thống gán mã đơn cục bộ dễ đọc (định dạng `YYYYMMDD-POSXX-NNNN`) và UUID `client_order_id` cho mỗi đơn.
- **FR20:** Hệ thống lưu snapshot tại thời điểm bán: tên sản phẩm, giá gốc, tùy chọn đã chọn, delta giá tùy chọn, ghi chú, tổng dòng.
- **FR21:** Hệ thống đồng bộ đơn hàng lên server ngay sau khi hoàn tất khi đang online.
- **FR22:** Hệ thống lưu đơn hàng offline với trạng thái `pending_sync` và tự động đồng bộ khi có mạng trở lại.
- **FR23:** Thu ngân có thể kích hoạt đồng bộ thủ công cho các đơn hàng đang chờ.
- **FR24:** Hệ thống hiển thị trạng thái kết nối (online/offline) và số đơn hàng đang chờ đồng bộ.
- **FR25:** Hệ thống lưu chi tiết lỗi đồng bộ nội bộ mà không hiển thị raw error cho thu ngân.
- **FR26:** Hệ thống hủy đơn hàng đã đồng bộ bằng cách tạo bản ghi void riêng biệt kèm lý do.

### Quản lý Menu (Admin)

- **FR27:** Admin có thể tạo, xem, sửa, xóa danh mục sản phẩm.
- **FR28:** Admin có thể tạo, xem, sửa, xóa sản phẩm trong danh mục.
- **FR29:** Admin có thể tạo, xem, sửa, xóa nhóm tùy chọn dùng chung.
- **FR30:** Admin có thể tạo, xem, sửa, xóa tùy chọn trong nhóm, kèm delta giá và quy tắc (bắt buộc/không, min/max lựa chọn).
- **FR31:** Admin có thể gán nhóm tùy chọn cho sản phẩm.
- **FR32:** Admin có thể bật hoặc tắt trạng thái bán hàng của sản phẩm và tùy chọn.
- **FR33:** Admin có thể sắp xếp thứ tự hiển thị của danh mục, sản phẩm và tùy chọn.

### Đồng bộ Menu (POS ← Server)

- **FR34:** Hệ thống kéo menu cập nhật từ server khi phiên bản server mới hơn phiên bản cục bộ.
- **FR35:** Hệ thống hỗ trợ kéo incremental (chỉ thay đổi mới) và kéo toàn bộ snapshot khi cần.
- **FR36:** Menu cập nhật chỉ áp dụng cho đơn hàng mới; đơn hàng cũ giữ nguyên snapshot tại thời điểm bán.

### Báo cáo (Admin)

- **FR37:** Admin có thể xem doanh thu theo ngày trong khoảng thời gian được chọn.
- **FR38:** Admin có thể xem tổng số đơn hàng trong khoảng thời gian được chọn.
- **FR39:** Admin có thể xem doanh thu phân theo phương thức thanh toán.
- **FR40:** Admin có thể xem top sản phẩm bán chạy nhất trong khoảng thời gian được chọn.

### Thiết lập Demo Cục bộ

- **FR41:** Developer có thể khởi động PostgreSQL cục bộ bằng Docker Compose.
- **FR42:** Developer có thể chạy migration database bằng lệnh chuẩn.
- **FR43:** Developer có thể seed dữ liệu demo: 1 tenant/store, 1 admin, 1 thu ngân, 4–6 danh mục, 20–30 sản phẩm, nhóm tùy chọn (size, đá, đường, topping), đơn hàng mẫu đã sync.

### Quản lý Bàn (Admin + POS)

- **FR44:** Admin có thể bật/tắt chế độ Quản lý bàn theo store (`stores.tableMode` boolean).
- **FR45:** Admin có thể tạo, sửa, xóa khu vực (tên, sort order, isActive).
- **FR46:** Admin có thể tạo, sửa, xóa bàn thuộc khu vực (tên, sức chứa, sort order, isActive).
- **FR47:** Khi `tableMode=true`, flow mặc định là **table-first**: thu ngân chọn bàn (qua floor-plan hoặc table picker) → vào màn hình chọn món → finalize. `tableId` tự gắn vào order.
- **FR47b:** Trong `tableMode=true`, POS có nút **"Bán hàng nhanh"** cho phép vào counter-service flow; order tạo từ flow này có `tableId=null`.
- **FR48:** Khi `tableMode=false`, POS hoạt động đúng counter-service hiện tại (FR8-FR18 không đổi); KHÔNG hiển thị floor-plan + nút "Bán hàng nhanh".
- **FR49:** Thu ngân chọn bàn qua table picker (dropdown theo khu vực) hoặc floor-plan view (click ô bàn).
- **FR50:** Floor-plan view là entry point mặc định khi `tableMode=true`; lưới bàn theo khu vực, hiển thị status (trống / đang phục vụ (có phiên bàn mở HOẶC order trong ngày) / chờ sync / ⚠️ xung đột phiên). Floor-plan và trạng thái bàn hoạt động cả khi offline (derive cục bộ từ dữ liệu IndexedDB).
- **FR51:** Order lưu kèm `tableId` nullable + `tableNameSnapshot` (immutable AR24). `tableId=null` cho quick-counter hoặc counter-mode store.
- **FR52:** Hóa đơn in hiển thị tên/số bàn nếu có; ẩn dòng nếu `tableId=null`.
- **FR53:** Khi `tableMode=true`, thu ngân "mở bàn" tạo một phiên bàn (table session) đánh dấu bàn occupied NGAY khi mở — trước khi thanh toán (hỗ trợ giữ tab/on-hold).
- **FR54:** Phiên bàn đồng bộ cross-device: khi online, POS khác thấy bàn occupied trong vòng ≤1 chu kỳ polling; mở bàn đang có phiên → cảnh báo "máy khác đang phục vụ" (không khóa cứng).
- **FR55:** Floor-plan, chọn bàn, mở/giữ phiên bàn và hoàn tất đơn kèm bàn hoạt động đầy đủ khi OFFLINE; trạng thái bàn derive cục bộ từ IndexedDB.
- **FR56:** Khi 2 thiết bị offline cùng mở 1 bàn, hệ thống GIỮ CẢ HAI phiên (không mất đơn), đánh dấu cờ xung đột trên bàn; thu ngân xử lý thủ công.

## Yêu cầu Phi chức năng

### Hiệu năng

- **NFR1:** Màn hình POS tải xong sau khi Service Worker đã cache: dưới 2 giây trên kết nối 3G.
- **NFR2:** Thêm sản phẩm vào giỏ hàng và cập nhật tổng tiền: phản hồi dưới 100ms.
- **NFR3:** Hoàn tất đơn hàng và lưu vào IndexedDB (offline): dưới 500ms.
- **NFR4:** Đồng bộ một đơn hàng lên server (online, không lỗi): dưới 3 giây.
- **NFR5:** Tải danh sách sản phẩm từ cache cục bộ: dưới 300ms.
- **NFR6:** Báo cáo khoảng 30 ngày trả kết quả: dưới 5 giây.

### Bảo mật

- **NFR7:** Mật khẩu người dùng không được lưu cục bộ dưới bất kỳ hình thức nào.
- **NFR8:** JWT access token và refresh token truyền qua HTTPS; không lưu trong localStorage không được bảo vệ.
- **NFR9:** Tất cả giao tiếp client-server sử dụng HTTPS/TLS.
- **NFR10:** Server hỗ trợ thu hồi refresh token; phiên bị thu hồi từ chối mọi yêu cầu tiếp theo.
- **NFR11:** Dữ liệu tài chính chỉ được truy cập bởi người dùng đã xác thực với vai trò phù hợp.
- **NFR12:** Chi tiết lỗi kỹ thuật nội bộ không được hiển thị cho người dùng cuối.

### Độ tin cậy & Tính nhất quán Dữ liệu

- **NFR13:** Server xử lý cùng một `client_order_id` nhiều lần trả về cùng kết quả, không tạo đơn trùng.
- **NFR14:** Snapshot đơn hàng tại thời điểm bán không bao giờ bị thay đổi sau khi đơn hoàn tất.
- **NFR15:** Đơn hàng pending trong IndexedDB không mất khi trình duyệt khởi động lại hoặc tab được làm mới.
- **NFR16:** Khi sync thất bại, hệ thống retry tự động — không im lặng bỏ qua đơn pending.
- **NFR17:** Phiên offline hết hạn sau đúng 7 ngày kể từ lần xác thực online cuối — không sớm hơn, không muộn hơn.

### Vận hành & Cấu hình

- **NFR18:** Chế độ `tableMode` có thể bật/tắt qua admin UI và áp dụng cho POS sau khi reload session — không cần redeploy code.
- **NFR19:** Mọi thao tác quản lý bàn phía POS (xem floor-plan, chọn bàn, mở phiên, hoàn tất đơn kèm bàn) PHẢI hoạt động khi offline với độ trễ tương đương online (parity FR3/FR16) — không phụ thuộc kết nối server.
