---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage-validation', 'step-04-ux-alignment', 'step-05-epic-quality-review', 'step-06-final-assessment']
filesIncluded:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/epics.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
---

# Báo Cáo Đánh Giá Sẵn Sàng Triển Khai

**Ngày:** 2026-05-09
**Dự án:** pos-bmad

## Bước 1: Khám phá Tài liệu

### Tệp PRD Tìm thấy

**Tài liệu nguyên khối:**
- `prd.md` (18,337 bytes, sửa đổi 2026-05-09 12:35:05)

**Tài liệu chia nhỏ:**
- Không tìm thấy

### Tệp Kiến trúc Tìm thấy

**Tài liệu nguyên khối:**
- `architecture.md` (67,106 bytes, sửa đổi 2026-05-09 16:43:55)

**Tài liệu chia nhỏ:**
- Không tìm thấy

### Tệp Epics & Stories Tìm thấy

**Tài liệu nguyên khối:**
- `epics.md` (132,220 bytes, sửa đổi 2026-05-09 21:38:25)

**Tài liệu chia nhỏ:**
- Không tìm thấy

### Tệp Thiết kế UX Tìm thấy

**Tài liệu nguyên khối:**
- `ux-design-specification.md` (56,977 bytes, sửa đổi 2026-05-09 18:09:01)

**Tài liệu chia nhỏ:**
- Không tìm thấy

### Vấn đề Tìm thấy

- Không tìm thấy định dạng tài liệu trùng lặp giữa bản nguyên khối và bản chia nhỏ.
- Không thiếu loại tài liệu bắt buộc nào.

### Tài liệu được Chọn để Đánh giá

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`

## Bước 2: Phân tích PRD

### Yêu cầu Chức năng

FR1: Người dùng có thể đăng nhập bằng email và mật khẩu khi có kết nối internet.
FR2: Hệ thống lưu phiên offline hợp lệ tối đa 7 ngày kể từ lần xác thực online cuối.
FR3: Thu ngân có thể tiếp tục sử dụng POS khi offline nếu phiên còn hợp lệ.
FR4: Hệ thống tự động làm mới access token mà không yêu cầu người dùng đăng nhập lại.
FR5: Admin có thể thu hồi phiên người dùng từ phía server.
FR6: Hệ thống chuyển hướng về màn hình đăng nhập kèm thông báo rõ ràng khi phiên hết hạn.
FR7: Hệ thống điều hướng người dùng đến khu vực POS hoặc Admin theo vai trò sau khi đăng nhập.
FR8: Thu ngân có thể xem danh sách sản phẩm nhóm theo danh mục.
FR9: Thu ngân có thể tìm kiếm sản phẩm theo tên.
FR10: Thu ngân có thể chọn sản phẩm có tùy chọn qua modal tùy chọn.
FR11: Thu ngân có thể chọn tùy chọn bắt buộc và không bắt buộc trong modal tùy chọn.
FR12: Thu ngân có thể thêm ghi chú tùy chọn cho từng item trong giỏ hàng.
FR13: Thu ngân có thể điều chỉnh số lượng và xóa item khỏi giỏ hàng.
FR14: Thu ngân có thể áp dụng giảm giá toàn đơn theo số tiền cố định hoặc phần trăm.
FR15: Thu ngân có thể chọn một phương thức thanh toán cho mỗi đơn (tiền mặt, chuyển khoản, thẻ).
FR16: Thu ngân có thể hoàn tất đơn hàng khi online hoặc offline.
FR17: Thu ngân có thể hủy toàn bộ đơn hàng kèm lý do hủy.
FR18: Thu ngân có thể xem hóa đơn và in qua chức năng in của trình duyệt.
FR19: Hệ thống gán mã đơn cục bộ dễ đọc (định dạng `YYYYMMDD-POSXX-NNNN`) và UUID `client_order_id` cho mỗi đơn.
FR20: Hệ thống lưu snapshot tại thời điểm bán: tên sản phẩm, giá gốc, tùy chọn đã chọn, delta giá tùy chọn, ghi chú, tổng dòng.
FR21: Hệ thống đồng bộ đơn hàng lên server ngay sau khi hoàn tất khi đang online.
FR22: Hệ thống lưu đơn hàng offline với trạng thái `pending_sync` và tự động đồng bộ khi có mạng trở lại.
FR23: Thu ngân có thể kích hoạt đồng bộ thủ công cho các đơn hàng đang chờ.
FR24: Hệ thống hiển thị trạng thái kết nối (online/offline) và số đơn hàng đang chờ đồng bộ.
FR25: Hệ thống lưu chi tiết lỗi đồng bộ nội bộ mà không hiển thị raw error cho thu ngân.
FR26: Hệ thống hủy đơn hàng đã đồng bộ bằng cách tạo bản ghi void riêng biệt kèm lý do.
FR27: Admin có thể tạo, xem, sửa, xóa danh mục sản phẩm.
FR28: Admin có thể tạo, xem, sửa, xóa sản phẩm trong danh mục.
FR29: Admin có thể tạo, xem, sửa, xóa nhóm tùy chọn dùng chung.
FR30: Admin có thể tạo, xem, sửa, xóa tùy chọn trong nhóm, kèm delta giá và quy tắc (bắt buộc/không, min/max lựa chọn).
FR31: Admin có thể gán nhóm tùy chọn cho sản phẩm.
FR32: Admin có thể bật hoặc tắt trạng thái bán hàng của sản phẩm và tùy chọn.
FR33: Admin có thể sắp xếp thứ tự hiển thị của danh mục, sản phẩm và tùy chọn.
FR34: Hệ thống kéo menu cập nhật từ server khi phiên bản server mới hơn phiên bản cục bộ.
FR35: Hệ thống hỗ trợ kéo incremental (chỉ thay đổi mới) và kéo toàn bộ snapshot khi cần.
FR36: Menu cập nhật chỉ áp dụng cho đơn hàng mới; đơn hàng cũ giữ nguyên snapshot tại thời điểm bán.
FR37: Admin có thể xem doanh thu theo ngày trong khoảng thời gian được chọn.
FR38: Admin có thể xem tổng số đơn hàng trong khoảng thời gian được chọn.
FR39: Admin có thể xem doanh thu phân theo phương thức thanh toán.
FR40: Admin có thể xem top sản phẩm bán chạy nhất trong khoảng thời gian được chọn.
FR41: Developer có thể khởi động PostgreSQL cục bộ bằng Docker Compose.
FR42: Developer có thể chạy migration database bằng lệnh chuẩn.
FR43: Developer có thể seed dữ liệu demo: 1 tenant/store, 1 admin, 1 thu ngân, 4–6 danh mục, 20–30 sản phẩm, nhóm tùy chọn (size, đá, đường, topping), đơn hàng mẫu đã sync.

Tổng số FR: 43

### Yêu cầu Phi chức năng

NFR1: Màn hình POS tải xong sau khi Service Worker đã cache: dưới 2 giây trên kết nối 3G.
NFR2: Thêm sản phẩm vào giỏ hàng và cập nhật tổng tiền: phản hồi dưới 100ms.
NFR3: Hoàn tất đơn hàng và lưu vào IndexedDB (offline): dưới 500ms.
NFR4: Đồng bộ một đơn hàng lên server (online, không lỗi): dưới 3 giây.
NFR5: Tải danh sách sản phẩm từ cache cục bộ: dưới 300ms.
NFR6: Báo cáo khoảng 30 ngày trả kết quả: dưới 5 giây.
NFR7: Mật khẩu người dùng không được lưu cục bộ dưới bất kỳ hình thức nào.
NFR8: JWT access token và refresh token truyền qua HTTPS; không lưu trong localStorage không được bảo vệ.
NFR9: Tất cả giao tiếp client-server sử dụng HTTPS/TLS.
NFR10: Server hỗ trợ thu hồi refresh token; phiên bị thu hồi từ chối mọi yêu cầu tiếp theo.
NFR11: Dữ liệu tài chính chỉ được truy cập bởi người dùng đã xác thực với vai trò phù hợp.
NFR12: Chi tiết lỗi kỹ thuật nội bộ không được hiển thị cho người dùng cuối.
NFR13: Server xử lý cùng một `client_order_id` nhiều lần trả về cùng kết quả, không tạo đơn trùng.
NFR14: Snapshot đơn hàng tại thời điểm bán không bao giờ bị thay đổi sau khi đơn hoàn tất.
NFR15: Đơn hàng pending trong IndexedDB không mất khi trình duyệt khởi động lại hoặc tab được làm mới.
NFR16: Khi sync thất bại, hệ thống retry tự động — không im lặng bỏ qua đơn pending.
NFR17: Phiên offline hết hạn sau đúng 7 ngày kể từ lần xác thực online cuối — không sớm hơn, không muộn hơn.

Tổng số NFR: 17

### Yêu cầu Bổ sung

- Offline-first là kiến trúc nền tảng: thu ngân đã xác thực tiếp tục bán hàng tối đa 7 ngày không cần mạng.
- Đơn hàng lưu cục bộ trong IndexedDB và đồng bộ idempotent lên server khi có mạng.
- Giá và tùy chọn tại thời điểm bán phải được lưu snapshot; lịch sử không đổi khi menu cập nhật.
- Đơn hàng đã sync không được chỉnh sửa trực tiếp trên server.
- Hủy đơn sau sync phải tạo bản ghi void/refund riêng, không âm thầm sửa lịch sử tài chính.
- Sync idempotent theo `client_order_id`; server deduplicate theo `(tenant_id, store_id, device_id, client_order_id)`.
- Dữ liệu đơn hàng chỉ đi một chiều: POS → Server, append-only.
- Model dữ liệu server gồm `tenant_id` và `store_id` dù UI MVP chỉ hiển thị một cửa hàng.
- PWA cache shell/assets tĩnh bằng Service Worker; IndexedDB lưu pending orders, menu cache, session cache.
- Toàn bộ luồng bán hàng phải hoạt động offline; sync nền khi có mạng không reload trang.
- Layout tối ưu cho tablet landscape/laptop nhỏ từ 1024px; không cần mobile portrait.
- Hỗ trợ chính thức Chrome mới nhất, Safari mới nhất; Firefox mới nhất là khuyến nghị.
- Accessibility cơ bản: keyboard navigation cho thao tác chính, contrast đọc được, font đủ lớn cho tablet.
- Ngoài phạm vi MVP: quản lý bàn, tồn kho/nguyên liệu/công thức, payment gateway/QR động, kitchen screen, ESC/POS thermal printing, ảnh sản phẩm, multi-branch UI, loyalty/voucher, production deployment, audit log, backup/restore thủ công.

### Đánh giá Mức độ Hoàn chỉnh của PRD

PRD có cấu trúc rõ, có đầy đủ 43 FR và 17 NFR được đánh số, kèm journey, domain constraints, web/PWA constraints, scope/out-of-scope và acceptance criteria cấp cao. Các yêu cầu quan trọng về offline-first, idempotency, snapshot immutability, bảo mật phiên, báo cáo và demo setup đều được nêu rõ để phục vụ traceability sang epics/stories.

## Bước 3: Kiểm tra Coverage của Epic

### Coverage FR Trích xuất từ Epic

FR1: Được cover trong Epic 1 — Đăng nhập email/password khi online
FR2: Được cover trong Epic 1 — Phiên offline 7 ngày
FR3: Được cover trong Epic 1 — Tiếp tục dùng POS offline nếu phiên còn hợp lệ
FR4: Được cover trong Epic 1 — Auto refresh access token
FR5: Được cover trong Epic 1 — Admin thu hồi phiên server-side
FR6: Được cover trong Epic 1 — Redirect về login khi phiên hết hạn
FR7: Được cover trong Epic 1 — Role-based routing sau login
FR8: Được cover trong Epic 2 — Lưới sản phẩm theo danh mục
FR9: Được cover trong Epic 2 — Tìm kiếm sản phẩm theo tên
FR10: Được cover trong Epic 2 — Modal tùy chọn
FR11: Được cover trong Epic 2 — Tùy chọn bắt buộc/không bắt buộc
FR12: Được cover trong Epic 2 — Ghi chú item
FR13: Được cover trong Epic 2 — Điều chỉnh số lượng/xóa item
FR14: Được cover trong Epic 2 — Giảm giá toàn đơn
FR15: Được cover trong Epic 2 — Phương thức thanh toán
FR16: Được cover trong Epic 2 — Hoàn tất đơn online/offline
FR17: Được cover trong Epic 2 — Hủy đơn chưa sync kèm lý do
FR18: Được cover trong Epic 2 — Hóa đơn + in qua trình duyệt
FR19: Được cover trong Epic 2 — Mã đơn cục bộ `YYYYMMDD-POSXX-NNNN` + UUID v7
FR20: Được cover trong Epic 2 — Snapshot tại thời điểm bán
FR21: Được cover trong Epic 2 — Sync ngay khi online
FR22: Được cover trong Epic 2 — Pending sync + auto sync khi có mạng
FR23: Được cover trong Epic 2 — Manual sync trigger
FR24: Được cover trong Epic 2 — Connectivity indicator + pending counter
FR25: Được cover trong Epic 2 — Log lỗi sync nội bộ, không lộ raw error
FR26: Được cover trong Epic 2 — Void đơn đã sync bằng bản ghi riêng
FR27: Được cover trong Epic 3 — CRUD danh mục
FR28: Được cover trong Epic 3 — CRUD sản phẩm
FR29: Được cover trong Epic 3 — CRUD nhóm tùy chọn
FR30: Được cover trong Epic 3 — CRUD tùy chọn + delta giá + quy tắc bắt buộc/min/max
FR31: Được cover trong Epic 3 — Gán nhóm tùy chọn cho sản phẩm
FR32: Được cover trong Epic 3 — Bật/tắt trạng thái bán
FR33: Được cover trong Epic 3 — Sắp xếp thứ tự hiển thị
FR34: Được cover trong Epic 3 — POS pull menu khi server có version mới
FR35: Được cover trong Epic 3 — Incremental + full snapshot fallback
FR36: Được cover trong Epic 3 — Menu update không phá đơn cũ
FR37: Được cover trong Epic 4 — Doanh thu theo ngày
FR38: Được cover trong Epic 4 — Tổng số đơn
FR39: Được cover trong Epic 4 — Doanh thu theo phương thức thanh toán
FR40: Được cover trong Epic 4 — Top sản phẩm bán chạy
FR41: Được cover trong Epic 1 — Docker Compose PostgreSQL
FR42: Được cover trong Epic 1 — Migration Prisma
FR43: Được cover trong Epic 1 — Seed dữ liệu demo café

Tổng số FR trong epics: 43

### Ma trận Coverage

| Mã FR | Yêu cầu PRD | Coverage trong Epic | Trạng thái |
| --- | --- | --- | --- |
| FR1 | Người dùng có thể đăng nhập bằng email và mật khẩu khi có kết nối internet. | Epic 1 | Đã cover |
| FR2 | Hệ thống lưu phiên offline hợp lệ tối đa 7 ngày kể từ lần xác thực online cuối. | Epic 1 | Đã cover |
| FR3 | Thu ngân có thể tiếp tục sử dụng POS khi offline nếu phiên còn hợp lệ. | Epic 1 | Đã cover |
| FR4 | Hệ thống tự động làm mới access token mà không yêu cầu người dùng đăng nhập lại. | Epic 1 | Đã cover |
| FR5 | Admin có thể thu hồi phiên người dùng từ phía server. | Epic 1 | Đã cover |
| FR6 | Hệ thống chuyển hướng về màn hình đăng nhập kèm thông báo rõ ràng khi phiên hết hạn. | Epic 1 | Đã cover |
| FR7 | Hệ thống điều hướng người dùng đến khu vực POS hoặc Admin theo vai trò sau khi đăng nhập. | Epic 1 | Đã cover |
| FR8 | Thu ngân có thể xem danh sách sản phẩm nhóm theo danh mục. | Epic 2 | Đã cover |
| FR9 | Thu ngân có thể tìm kiếm sản phẩm theo tên. | Epic 2 | Đã cover |
| FR10 | Thu ngân có thể chọn sản phẩm có tùy chọn qua modal tùy chọn. | Epic 2 | Đã cover |
| FR11 | Thu ngân có thể chọn tùy chọn bắt buộc và không bắt buộc trong modal tùy chọn. | Epic 2 | Đã cover |
| FR12 | Thu ngân có thể thêm ghi chú tùy chọn cho từng item trong giỏ hàng. | Epic 2 | Đã cover |
| FR13 | Thu ngân có thể điều chỉnh số lượng và xóa item khỏi giỏ hàng. | Epic 2 | Đã cover |
| FR14 | Thu ngân có thể áp dụng giảm giá toàn đơn theo số tiền cố định hoặc phần trăm. | Epic 2 | Đã cover |
| FR15 | Thu ngân có thể chọn một phương thức thanh toán cho mỗi đơn. | Epic 2 | Đã cover |
| FR16 | Thu ngân có thể hoàn tất đơn hàng khi online hoặc offline. | Epic 2 | Đã cover |
| FR17 | Thu ngân có thể hủy toàn bộ đơn hàng kèm lý do hủy. | Epic 2 | Đã cover |
| FR18 | Thu ngân có thể xem hóa đơn và in qua chức năng in của trình duyệt. | Epic 2 | Đã cover |
| FR19 | Hệ thống gán mã đơn cục bộ dễ đọc và UUID `client_order_id` cho mỗi đơn. | Epic 2 | Đã cover |
| FR20 | Hệ thống lưu snapshot tại thời điểm bán. | Epic 2 | Đã cover |
| FR21 | Hệ thống đồng bộ đơn hàng lên server ngay sau khi hoàn tất khi online. | Epic 2 | Đã cover |
| FR22 | Hệ thống lưu đơn offline `pending_sync` và tự động đồng bộ khi có mạng. | Epic 2 | Đã cover |
| FR23 | Thu ngân có thể kích hoạt đồng bộ thủ công cho đơn đang chờ. | Epic 2 | Đã cover |
| FR24 | Hệ thống hiển thị trạng thái kết nối và số đơn chờ đồng bộ. | Epic 2 | Đã cover |
| FR25 | Hệ thống lưu chi tiết lỗi sync nội bộ mà không hiển thị raw error. | Epic 2 | Đã cover |
| FR26 | Hệ thống hủy đơn đã sync bằng bản ghi void riêng kèm lý do. | Epic 2 | Đã cover |
| FR27 | Admin có thể tạo, xem, sửa, xóa danh mục sản phẩm. | Epic 3 | Đã cover |
| FR28 | Admin có thể tạo, xem, sửa, xóa sản phẩm trong danh mục. | Epic 3 | Đã cover |
| FR29 | Admin có thể tạo, xem, sửa, xóa nhóm tùy chọn dùng chung. | Epic 3 | Đã cover |
| FR30 | Admin có thể tạo, xem, sửa, xóa tùy chọn trong nhóm kèm delta giá và quy tắc. | Epic 3 | Đã cover |
| FR31 | Admin có thể gán nhóm tùy chọn cho sản phẩm. | Epic 3 | Đã cover |
| FR32 | Admin có thể bật/tắt trạng thái bán hàng của sản phẩm và tùy chọn. | Epic 3 | Đã cover |
| FR33 | Admin có thể sắp xếp thứ tự hiển thị danh mục, sản phẩm và tùy chọn. | Epic 3 | Đã cover |
| FR34 | Hệ thống kéo menu cập nhật khi server có version mới hơn local. | Epic 3 | Đã cover |
| FR35 | Hệ thống hỗ trợ incremental pull và full snapshot fallback. | Epic 3 | Đã cover |
| FR36 | Menu cập nhật chỉ áp dụng cho đơn mới; đơn cũ giữ snapshot. | Epic 3 | Đã cover |
| FR37 | Admin có thể xem doanh thu theo ngày trong khoảng thời gian chọn. | Epic 4 | Đã cover |
| FR38 | Admin có thể xem tổng số đơn hàng trong khoảng thời gian chọn. | Epic 4 | Đã cover |
| FR39 | Admin có thể xem doanh thu phân theo phương thức thanh toán. | Epic 4 | Đã cover |
| FR40 | Admin có thể xem top sản phẩm bán chạy nhất trong khoảng thời gian chọn. | Epic 4 | Đã cover |
| FR41 | Developer có thể khởi động PostgreSQL cục bộ bằng Docker Compose. | Epic 1 | Đã cover |
| FR42 | Developer có thể chạy migration database bằng lệnh chuẩn. | Epic 1 | Đã cover |
| FR43 | Developer có thể seed dữ liệu demo đầy đủ. | Epic 1 | Đã cover |

### Yêu cầu Chưa được Cover

Không tìm thấy FR nào trong PRD chưa được cover trong FR Coverage Map của epics.

### Thống kê Coverage

- Tổng số FR trong PRD: 43
- Số FR được cover trong epics: 43
- Tỷ lệ coverage: 100%
- FR có trong epics nhưng không có trong PRD: 0

## Bước 4: Đánh giá Alignment UX

### Trạng thái Tài liệu UX

Đã tìm thấy: `_bmad-output/planning-artifacts/ux-design-specification.md`

Tài liệu UX đã hoàn chỉnh và nhắm rõ cùng tầm nhìn sản phẩm với PRD: Café POS MVP offline-first cho luồng POS thu ngân và luồng admin quản lý menu/báo cáo.

### Alignment UX ↔ PRD

- User journeys align with PRD journeys: cashier online sale, cashier offline sale with auto-sync, admin menu management, and admin reports.
- UX explicitly covers core PRD functional areas: POS product grid/search/options/cart/discount/payment/receipt, sync states, admin CRUD, reports, and local demo clarity.
- Ngôn ngữ trạng thái UX align với PRD FR22–FR25 và NFR12: offline/pending/synced/failed hiển thị rõ, bình tĩnh và không lộ lỗi kỹ thuật thô.
- UX preserves FR16/FR18 offline-first completion semantics: receipt appears after local save and printing is not blocked by server sync.
- UX supports FR24 through persistent header indicators for online/offline state and pending count.
- UX supports FR37–FR40 through date-range report filter and report empty/loading/error states.
- UX accessibility strategy expands PRD accessibility constraints with WCAG 2.1 AA target, keyboard-only testing, visible focus states, and text labels beyond color.

Không tìm thấy yêu cầu UX nào mâu thuẫn đáng kể với PRD. UX bổ sung các yêu cầu thiết kế ở mức triển khai và các yêu cầu này cũng đã được phản ánh trong inventory epics dưới dạng UX-DR.

### Alignment UX ↔ Kiến trúc

- Architecture supports the UX PWA direction with Vite, React 18, vite-plugin-pwa/Workbox, Service Worker shell caching, Dexie/IndexedDB, React Router, TanStack Query, Zustand, RHF/Zod, shadcn/ui, Tailwind, and Radix UI.
- Architecture supports offline-first UX by storing session/menu/orders locally and syncing orders through an explicit background sync engine.
- Architecture supports UX performance needs through local cache, route-based/lazy admin loading, and NFR budgets for POS shell, cart updates, local finalize, sync, and reports.
- Architecture supports UX component strategy through feature/module boundaries and dedicated POS/Admin surfaces.
- Architecture supports security-related UX constraints by forbidding localStorage/sessionStorage token storage, masking raw errors through Problem Details mapping, and using role-based routing.
- Architecture supports report UX by placing reports in server-side Admin API flows and defining `/api/v1/reports` with date range semantics.

### Vấn đề Alignment

Không tìm thấy misalignment gây chặn giữa UX/PRD/Kiến trúc.

### Cảnh báo

- UX đặt mục tiêu accessibility mạnh hơn PRD (WCAG 2.1 AA và kiểm thử accessibility bằng axe/Playwright). Đây là điểm tích cực nhưng cần được giữ trong stories và acceptance criteria.
- UX visual/state detail is extensive; implementation should avoid treating shadcn defaults as final UI because the UX spec calls for domain-specific components and calm POS-specific sync/status language.

## Bước 5: Review Chất lượng Epic

### Tóm tắt Chất lượng Tổng quan

Nhìn chung, cấu trúc epic/story đã sẵn sàng triển khai với traceability mạnh, trình tự rõ ràng, acceptance criteria theo phong cách BDD và phần lớn deliverables hướng tới giá trị người dùng. Các epic tạo thành tiến trình hợp lý:

1. Epic 1 thiết lập giá trị setup demo cho developer + xác thực/phiên làm việc.
2. Epic 2 cung cấp luồng bán hàng POS cho thu ngân, hoàn tất offline, sync, receipt và void.
3. Epic 3 cung cấp quản lý menu cho admin và auto-sync menu xuống POS.
4. Epic 4 cung cấp báo cáo kinh doanh cho admin từ dữ liệu đơn hàng đã sync.

Tuy nhiên, một số story thiên về kỹ thuật và một quyết định về thời điểm tạo database/schema vi phạm khuyến nghị “tạo bảng khi lần đầu cần dùng”. Đây không phải blocker nếu được chấp nhận có chủ đích, nhưng nên theo dõi vì có thể gây overbuild hoặc coupling theo trình tự.

### Kiểm tra Cấu trúc Epic

| Epic | Tập trung vào Giá trị Người dùng | Tính độc lập | Đánh giá |
| --- | --- | --- | --- |
| Epic 1: Foundation, Demo Setup & Authentication | Pha trộn nhưng chấp nhận được: giá trị setup/demo cho developer và giá trị đăng nhập/phiên lần đầu được nêu rõ. | Độc lập; tạo setup, seed data, auth, role routing và baseline phiên offline. | Đạt với cảnh báo: có các story nền tảng kỹ thuật, nhưng gắn với FR41–FR43 và auth FR1–FR7. |
| Epic 2: POS Selling — Online, Offline & Sync | Giá trị mạnh cho thu ngân: bán online/offline, sync, receipt, cancel/void. | Chỉ xây trên Epic 1; nêu rõ không cần Epic 3 vì đã có seed menu. | Đạt. |
| Epic 3: Menu Management & Auto-Sync | Giá trị mạnh cho admin/thu ngân: admin CRUD menu và POS auto-pull. | Xây trên Epic 1 và củng cố hành vi snapshot của Epic 2; không phụ thuộc Epic 4. | Đạt. |
| Epic 4: Business Reports | Giá trị mạnh cho admin: doanh thu/đơn hàng/thanh toán/top sản phẩm theo khoảng ngày. | Xây trên dữ liệu đơn hàng đã sync từ Epic 2; không có forward dependency. | Đạt. |

### Đánh giá Chất lượng Story

#### Điểm mạnh

- Hầu hết stories dùng framing `As a / I want / So that` rõ ràng.
- Acceptance criteria chủ yếu theo Given/When/Then và có thể kiểm thử.
- Các kịch bản lỗi, offline, sync retry, idempotency, snapshot và token storage đều được thể hiện.
- Tóm tắt story có nêu dependency theo trình tự rõ ràng.
- Traceability được duy trì qua tham chiếu FR/NFR/UX-DR/AR.
- Deliverables của epic cụ thể và người dùng có thể quan sát được.

#### Vi phạm Nghiêm trọng

Không tìm thấy vi phạm nghiêm trọng. Không có epic nào thuần túy là technical milestone mà không map tới giá trị người dùng/developer, và không thấy forward dependency nào làm epic trước đó không dùng được.

#### Vấn đề Lớn

1. **Story 1.2 tạo schema menu/versioning trước khi có giá trị menu trực tiếp cho người dùng.**
   - Bằng chứng: Story 1.2 bao gồm `categories`, `products`, `option_groups`, `options`, `product_option_groups` và `menu_versions`, với mục đích nêu rõ là hỗ trợ Story 1.4 seed data, Story 2.1 GET menu và Epic 3 CRUD.
   - Quan ngại best-practice: nguyên tắc thời điểm tạo database/entity yêu cầu bảng nên được tạo khi lần đầu cần dùng, không tạo toàn bộ từ đầu.
   - Tác động: có thể khuyến khích overbuild schema trước khi các story menu read/admin xác thực nhu cầu chính xác.
   - Khuyến nghị: hoặc đánh dấu rõ Story 1.2 là ngoại lệ foundation có chủ đích phục vụ seed/demo FR43, hoặc tách schema để auth/core tables ở lại Story 1.2, các bảng menu read-side chuyển sang Story 2.1, và nhu cầu mutation admin được thêm trong các story Epic 3.

2. **Một số story backend/API được frame như developer story thay vì user story trực tiếp.**
   - Examples: Story 2.6 Backend Orders Schema + Sync Endpoint, Story 3.2 Categories CRUD backend, Story 3.4 Option Groups CRUD backend, Story 3.6 Products CRUD backend, Story 3.8 Versioned Menu Sync Endpoint, Story 4.1 Reports Endpoint.
   - Quan ngại best-practice: stories nên tự deliver giá trị người dùng độc lập, không nên là lát cắt kỹ thuật chỉ hữu ích sau các FE story.
   - Tác động: các story này có thể khó demo như giá trị người dùng khi đứng riêng và có thể tạo batching backend-first.
   - Khuyến nghị: chỉ giữ nếu team cố ý ưu tiên tách BE/FE để agent thực thi; nếu không, hãy gộp từng backend story với một frontend path mỏng tương ứng hoặc định nghĩa demo/contract acceptance ở cấp API để chứng minh một bước tăng trưởng của user workflow.

3. **Story 1.10 CI Pipeline là story quality gate mang tính kỹ thuật.**
   - Bằng chứng: được frame là giá trị CI/pre-commit cho developer, không phải giá trị end-user.
   - Quan ngại best-practice: story technical enablement chấp nhận được ở giai đoạn đầu greenfield, nhưng không nên chiếm ưu thế trong epic.
   - Tác động: giá trị demo sản phẩm thấp; tuy nhiên nó bảo vệ readiness và chất lượng.
   - Khuyến nghị: giữ lại vì architecture bắt buộc CI gates, nhưng đánh dấu là enabling/quality story và giới hạn scope đúng các automated checks đã liệt kê.

#### Quan ngại Nhỏ

1. **Epic 1 trộn foundation, demo setup, auth, frontend shell và CI.**
   - Tác động: epic rộng với nhiều concern khác nhau, dù vẫn thống nhất như “demo an toàn đầu tiên có thể chạy được”.
   - Khuyến nghị: khi sprint planning, giữ chặt trình tự Story 1.1–1.10 và tránh mở rộng Epic 1 vượt deliverable đã nêu.

2. **Một số AC encode lựa chọn triển khai khá chặt.**
   - Examples: specific libraries/commands, shadcn setup, exact CI job shape.
   - Tác động: chấp nhận được vì architecture đã khóa stack, nhưng implementation agents không nên thay thế bằng lựa chọn khác nếu chưa correct course.
   - Khuyến nghị: xem các điểm này là ràng buộc kiến trúc bắt buộc.

3. **Lựa chọn thư viện chart trong reports đang xuất hiện như một khuyến nghị triển khai.**
   - Bằng chứng: Story 4.3 nhắc “recharts hoặc visx; recommend recharts”.
   - Tác động: có ambiguity nhỏ nếu các agent chọn khác nhau.
   - Khuyến nghị: chọn một thư viện trong architecture/story trước triển khai hoặc giữ acceptance criteria không phụ thuộc thư viện.

### Phân tích Dependency

- Thứ tự epic hợp lệ: Epic 2 phụ thuộc Epic 1, Epic 3 phụ thuộc Epic 1 và bổ sung cho Epic 2, Epic 4 phụ thuộc dữ liệu đơn hàng đã sync từ Epic 2.
- Không tìm thấy circular dependency.
- Không có Epic N nào cần Epic N+1 để hoạt động.
- Epic 2 tránh phụ thuộc Epic 3 một cách rõ ràng bằng cách dùng seed menu data từ Epic 1.
- Trình tự story được ghi rõ cho từng epic và nhìn chung không có forward dependency.

### Kiểm tra Starter Template / Greenfield

- Architecture yêu cầu starter templates, và Story 1.1 khởi tạo đúng `pos-web` bằng `npm create @vite-pwa/pwa@latest pos-web -- --template react-ts` và `pos-api` bằng NestJS CLI.
- Các chỉ dấu greenfield đều có: initial setup, development environment, Docker Compose, migrations, seed data, auth, shell và CI xuất hiện sớm.
- Không cần migration brownfield hoặc compatibility stories ngoài việc dùng các planning artifacts hiện có.

### Checklist Tuân thủ Best Practices

| Hạng mục kiểm tra | Trạng thái | Ghi chú |
| --- | --- | --- |
| Epics deliver giá trị người dùng | Đạt với cảnh báo | Epic 1 có foundation kỹ thuật nhưng map tới giá trị setup cho developer và auth. |
| Epics có thể hoạt động độc lập | Đạt | Không tìm thấy forward dependency giữa các epic. |
| Stories có kích thước phù hợp | Phần lớn đạt | Một số backend/API stories là lát cắt kỹ thuật. |
| Không có forward dependency | Đạt | Có tóm tắt dependency theo trình tự rõ ràng. |
| Bảng database được tạo khi cần | Cảnh báo/Lớn | Story 1.2 tạo bảng menu/admin sớm hơn story feature trực tiếp đầu tiên của chúng. |
| Acceptance criteria rõ ràng | Đạt | AC theo phong cách BDD đầy đủ và có thể kiểm thử. |
| Duy trì traceability tới FR | Đạt | FR coverage đầy đủ và đã được map. |

### Khuyến nghị Có thể Hành động

1. Đã quyết định Story 1.2 giữ schema foundation rộng như ngoại lệ có chủ đích cho FR43 seed/demo, GET `/menu` read path ở Story 2.1 và CRUD admin ở Epic 3.
2. Đã thêm tiêu chí “API contract demo” cho các backend-only stories chính để từng story có thể demo độc lập qua OpenAPI/Swagger examples và e2e/script demo seed-driven.
3. Story 1.10 giữ vai trò quality-enabling story, không phải chức năng sản phẩm, và scope vẫn giới hạn trong các checks đã chỉ định.
4. Đã chốt Story 4.3 dùng `recharts` cho charting MVP.
5. Đã đưa accessibility UX vào implementation checklist chung cho mọi story frontend/UI surface.

## Tóm tắt và Khuyến nghị

### Trạng thái Sẵn sàng Tổng thể

**SẴN SÀNG VỚI MỘT SỐ VIỆC NHỎ/VỪA CẦN XỬ LÝ**

Bộ planning package nhìn chung đã sẵn sàng cho Phase 4 implementation. Các source artifact bắt buộc đều tồn tại, yêu cầu PRD đầy đủ và được đánh số, FR coverage trong epics đạt 100%, alignment UX/PRD/Architecture mạnh, và stories nhìn chung có trình tự rõ ràng, có thể kiểm thử.

Đây không phải kết quả “CHƯA SẴN SÀNG” vì không tìm thấy tài liệu bắt buộc bị thiếu, FR coverage bị thiếu, xung đột UX/architecture, circular dependency hoặc lỗi nghiêm trọng về cấu trúc epic. Các vấn đề còn lại là refinement về chất lượng/readiness cần được xử lý hoặc chấp nhận rõ ràng trước khi giao cho implementation agents.

### Vấn đề Nghiêm trọng Cần Hành động Ngay

Không tìm thấy vấn đề nghiêm trọng gây chặn.

### Vấn đề Cần Chú ý

1. **Lớn: Story 1.2 tạo schema menu/versioning rộng quá sớm.**
   - Nhóm: thời điểm tạo database/entity.
   - Tác động: rủi ro overbuild schema trước khi story sử dụng đầu tiên xác thực nhu cầu.
   - Hành động: hoặc chấp nhận đây là ngoại lệ demo/seed FR43 có chủ đích, hoặc tách việc tạo menu schema sang Story 2.1/các story first-use của Epic 3.

2. **Lớn: Một số backend/API stories là lát cắt kỹ thuật.**
   - Nhóm: tính độc lập về giá trị người dùng của story.
   - Tác động: từng backend story riêng lẻ có thể không demo độc lập được như kết quả người dùng.
   - Hành động: thêm API contract/demo acceptance hoặc ghép với các lát cắt frontend workflow mỏng.

3. **Nhỏ/Vừa: Story 1.10 là technical quality story.**
   - Nhóm: technical enablement.
   - Tác động: chấp nhận được cho greenfield readiness, nhưng không hướng trực tiếp tới sản phẩm.
   - Hành động: giữ scope như một enabling story gắn với CI gates bắt buộc theo architecture.

4. **Nhỏ: Story 4.3 có ambiguity về thư viện chart.**
   - Nhóm: độ rõ ràng khi triển khai.
   - Tác động: agents có thể đi lệch giữa `recharts` và `visx`.
   - Hành động: chọn một thư viện trước khi triển khai, hoặc viết lại AC để không phụ thuộc thư viện.

5. **Nhỏ: Mục tiêu accessibility của UX mạnh hơn cách diễn đạt trong PRD.**
   - Nhóm: alignment UX/story.
   - Tác động: đây là mở rộng tích cực, nhưng implementation agents không được bỏ sót.
   - Hành động: đảm bảo WCAG 2.1 AA, keyboard-only, axe/Playwright và kiểm tra text-not-color-only vẫn nằm trong AC của các story liên quan.

### Bước Tiếp theo Khuyến nghị

1. Story 1.2 đã được annotate rõ: broad foundation schema là chủ đích cho FR43 seed/demo, GET `/menu` read path và CRUD admin; không tách theo first-use trong Sprint Planning hiện tại.
2. Backend-only stories đã được bổ sung tiêu chí demo độc lập qua API contract/OpenAPI examples và e2e hoặc script demo seed-driven.
3. Story 4.3 đã chốt `recharts` làm thư viện charting MVP.
4. Accessibility UX đã được giữ trong implementation checklist chung: WCAG 2.1 AA, keyboard-only path, focus handling, text-not-color-only và axe/Playwright checks.
5. Có thể chuyển sang Phase 4 implementation / Sprint Planning.

### Ghi chú Cuối

Đánh giá này xác định **5 vấn đề** thuộc **4 nhóm**: thời điểm tạo database/entity, tính độc lập của story, technical enablement và độ rõ ràng khi triển khai. Không có vấn đề nào là blocker nghiêm trọng. Các artifacts đã đủ aligned để bắt đầu implementation nếu team chấp nhận các trade-off đã nêu, nhưng xử lý các mục lớn trước sẽ giảm rework và cải thiện khả năng demo theo từng story.

**Người đánh giá:** Claude Code / BMad Implementation Readiness workflow
**Ngày đánh giá:** 2026-05-09


