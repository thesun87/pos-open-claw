---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
  - "_bmad-output/project-context.md"
  - "_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md"
project_name: 'pos-bmad'
user_name: 'Tuan.nguyen'
date: '2026-05-09'
workflowType: 'epics-and-stories'
status: 'complete'
lastStep: 4
completedAt: '2026-05-09'
lastEdited: '2026-06-04'
editHistory:
  - date: '2026-05-25'
    source: 'SCP-2026-05-25-table-mgmt (approved)'
    changes: 'Thêm Epic 6 (Quản lý Bàn F&B) với 9 stories — brownfield expansion để hỗ trợ table-service dual-mode. Cập nhật Overview để phản ánh 52 FR + 18 NFR. Brownfield patches embedded trong Story 6-1 (seed 1.4), Story 6-5 (admin nav 3.1), Story 6-8 (orders 2.4-2.8) thay vì re-open Epic 2/3.'
  - date: '2026-06-04'
    source: 'SCP-2026-06-01-offline-table-sessions (approved)'
    changes: 'Phase 1 offline table management: thêm Story 6.10 (FE Dexie cache + local status), 6.11 (BE table-session lifecycle + status upgrade), 6.12 (FE floor-plan offline rework); thêm AC table-session/occupancy vào Story 6.8; cập nhật Epic 6 known limitations + summary (9→12 stories, FR53-56 + NFR19); thêm outline Epic 7 "Shared Table Sessions" (Phase 2 deferred, cần create-epics-and-stories).'
---

# pos-bmad - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **Café POS MVP (`pos-bmad`)**, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

Tài liệu này phá vỡ **56 FR + 19 NFR** (sau SCP-2026-05-25-table-mgmt: thêm FR44-FR52 + NFR18; sau SCP-2026-06-01-offline-table-sessions: thêm FR53-FR56 + NFR19) + các yêu cầu kỹ thuật/UX bổ sung thành các epics có thể giao cho Developer agent thực thi tuần tự, mỗi story đi kèm acceptance criteria có thể test được.

**Epic 6 (Quản lý Bàn F&B)** được thêm 2026-05-25 qua brownfield expansion — không re-open Epic 2/3 đã done, mà embed brownfield patches trong Story 6-8/6-5/6-1.

## Requirements Inventory

### Functional Requirements

**Xác thực & Phiên làm việc (FR1–FR7)**

- FR1: Người dùng có thể đăng nhập bằng email và mật khẩu khi có kết nối internet.
- FR2: Hệ thống lưu phiên offline hợp lệ tối đa 7 ngày kể từ lần xác thực online cuối.
- FR3: Thu ngân có thể tiếp tục sử dụng POS khi offline nếu phiên còn hợp lệ.
- FR4: Hệ thống tự động làm mới access token mà không yêu cầu người dùng đăng nhập lại.
- FR5: Admin có thể thu hồi phiên người dùng từ phía server.
- FR6: Hệ thống chuyển hướng về màn hình đăng nhập kèm thông báo rõ ràng khi phiên hết hạn.
- FR7: Hệ thống điều hướng người dùng đến khu vực POS hoặc Admin theo vai trò sau khi đăng nhập.

**Giao diện POS Bán hàng (FR8–FR18)**

- FR8: Thu ngân có thể xem danh sách sản phẩm nhóm theo danh mục.
- FR9: Thu ngân có thể tìm kiếm sản phẩm theo tên.
- FR10: Thu ngân có thể chọn sản phẩm có tùy chọn qua modal tùy chọn.
- FR11: Thu ngân có thể chọn tùy chọn bắt buộc và không bắt buộc trong modal tùy chọn.
- FR12: Thu ngân có thể thêm ghi chú tùy chọn cho từng item trong giỏ hàng.
- FR13: Thu ngân có thể điều chỉnh số lượng và xóa item khỏi giỏ hàng.
- FR14: Thu ngân có thể áp dụng giảm giá toàn đơn theo số tiền cố định hoặc phần trăm.
- FR15: Thu ngân có thể chọn một phương thức thanh toán cho mỗi đơn (tiền mặt, chuyển khoản, thẻ).
- FR16: Thu ngân có thể hoàn tất đơn hàng khi online hoặc offline.
- FR17: Thu ngân có thể hủy toàn bộ đơn hàng kèm lý do hủy.
- FR18: Thu ngân có thể xem hóa đơn và in qua chức năng in của trình duyệt.

**Quản lý Đơn hàng & Đồng bộ (FR19–FR26)**

- FR19: Hệ thống gán mã đơn cục bộ dễ đọc (định dạng `YYYYMMDD-POSXX-NNNN`) và UUID `client_order_id` cho mỗi đơn.
- FR20: Hệ thống lưu snapshot tại thời điểm bán: tên sản phẩm, giá gốc, tùy chọn đã chọn, delta giá tùy chọn, ghi chú, tổng dòng.
- FR21: Hệ thống đồng bộ đơn hàng lên server ngay sau khi hoàn tất khi đang online.
- FR22: Hệ thống lưu đơn hàng offline với trạng thái `pending_sync` và tự động đồng bộ khi có mạng trở lại.
- FR23: Thu ngân có thể kích hoạt đồng bộ thủ công cho các đơn hàng đang chờ.
- FR24: Hệ thống hiển thị trạng thái kết nối (online/offline) và số đơn hàng đang chờ đồng bộ.
- FR25: Hệ thống lưu chi tiết lỗi đồng bộ nội bộ mà không hiển thị raw error cho thu ngân.
- FR26: Hệ thống hủy đơn hàng đã đồng bộ bằng cách tạo bản ghi void riêng biệt kèm lý do.

**Quản lý Menu (Admin) (FR27–FR33)**

- FR27: Admin có thể tạo, xem, sửa, xóa danh mục sản phẩm.
- FR28: Admin có thể tạo, xem, sửa, xóa sản phẩm trong danh mục.
- FR29: Admin có thể tạo, xem, sửa, xóa nhóm tùy chọn dùng chung.
- FR30: Admin có thể tạo, xem, sửa, xóa tùy chọn trong nhóm, kèm delta giá và quy tắc (bắt buộc/không, min/max lựa chọn).
- FR31: Admin có thể gán nhóm tùy chọn cho sản phẩm.
- FR32: Admin có thể bật hoặc tắt trạng thái bán hàng của sản phẩm và tùy chọn.
- FR33: Admin có thể sắp xếp thứ tự hiển thị của danh mục, sản phẩm và tùy chọn.

**Đồng bộ Menu (POS ← Server) (FR34–FR36)**

- FR34: Hệ thống kéo menu cập nhật từ server khi phiên bản server mới hơn phiên bản cục bộ.
- FR35: Hệ thống hỗ trợ kéo incremental (chỉ thay đổi mới) và kéo toàn bộ snapshot khi cần.
- FR36: Menu cập nhật chỉ áp dụng cho đơn hàng mới; đơn hàng cũ giữ nguyên snapshot tại thời điểm bán.

**Báo cáo (Admin) (FR37–FR40)**

- FR37: Admin có thể xem doanh thu theo ngày trong khoảng thời gian được chọn.
- FR38: Admin có thể xem tổng số đơn hàng trong khoảng thời gian được chọn.
- FR39: Admin có thể xem doanh thu phân theo phương thức thanh toán.
- FR40: Admin có thể xem top sản phẩm bán chạy nhất trong khoảng thời gian được chọn.

**Thiết lập Demo Cục bộ (FR41–FR43)**

- FR41: Developer có thể khởi động PostgreSQL cục bộ bằng Docker Compose.
- FR42: Developer có thể chạy migration database bằng lệnh chuẩn.
- FR43: Developer có thể seed dữ liệu demo: 1 tenant/store, 1 admin, 1 thu ngân, 4–6 danh mục, 20–30 sản phẩm, nhóm tùy chọn (size, đá, đường, topping), đơn hàng mẫu đã sync.

**Quản lý Bàn F&B (FR44–FR56)**

- FR44: Admin có thể bật/tắt `tableMode` cho từng store để chọn giữa counter-service và table-service.
- FR45: Admin có thể tạo, xem, sửa, xóa khu vực bàn (areas) trong store.
- FR46: Admin có thể tạo, xem, sửa, xóa bàn (tables) trong từng khu vực, gồm tên bàn, sức chứa, thứ tự và trạng thái hoạt động.
- FR47: Khi `tableMode=true`, thu ngân chọn bàn từ floor-plan trước khi vào menu; order tự gắn `tableId` và snapshot tên bàn.
- FR47b: Khi `tableMode=true`, thu ngân vẫn có thể vào luồng **Bán hàng nhanh** cho khách mang đi mà không cần chọn bàn.
- FR48: Order có thể lưu `tableId` nullable và `tableNameSnapshot` immutable; counter-service giữ `tableId=null`.
- FR49: Admin có thể cập nhật cấu hình store `tableMode`; POS áp dụng sau reload session để tránh race trong ca bán.
- FR50: Floor-plan view là entry point mặc định khi `tableMode=true`; lưới bàn theo khu vực, hiển thị status (trống / đang phục vụ / chờ sync / ⚠️ xung đột phiên). Floor-plan và trạng thái bàn hoạt động cả khi offline từ IndexedDB.
- FR51: Trạng thái bàn phản ánh order trong ngày và/hoặc phiên bàn đang mở; status được refresh online định kỳ nhưng không là dependency bắt buộc khi offline.
- FR52: Receipt hiển thị tên bàn khi order có `tableNameSnapshot`; ẩn hoàn toàn dòng bàn khi bán hàng nhanh.
- FR53: Khi `tableMode=true`, thu ngân mở bàn tạo một `table_session` đánh dấu bàn occupied ngay khi mở — trước khi thanh toán.
- FR54: Phiên bàn đồng bộ cross-device: khi online, POS khác thấy bàn occupied trong vòng ≤1 chu kỳ polling; mở bàn đang có phiên hiển thị cảnh báo mềm, không khóa cứng.
- FR55: Floor-plan, chọn bàn, mở/giữ phiên bàn và hoàn tất đơn kèm bàn hoạt động đầy đủ khi offline; session/order xếp hàng sync khi có mạng.
- FR56: Khi 2 thiết bị offline cùng mở 1 bàn, hệ thống giữ cả hai phiên, đánh dấu xung đột trên bàn để thu ngân xử lý thủ công.

### NonFunctional Requirements

**Hiệu năng (NFR1–NFR6)**

- NFR1: Màn hình POS tải xong sau khi Service Worker đã cache: dưới 2 giây trên kết nối 3G.
- NFR2: Thêm sản phẩm vào giỏ hàng và cập nhật tổng tiền: phản hồi dưới 100ms.
- NFR3: Hoàn tất đơn hàng và lưu vào IndexedDB (offline): dưới 500ms.
- NFR4: Đồng bộ một đơn hàng lên server (online, không lỗi): dưới 3 giây.
- NFR5: Tải danh sách sản phẩm từ cache cục bộ: dưới 300ms.
- NFR6: Báo cáo khoảng 30 ngày trả kết quả: dưới 5 giây.

**Bảo mật (NFR7–NFR12)**

- NFR7: Mật khẩu người dùng không được lưu cục bộ dưới bất kỳ hình thức nào.
- NFR8: JWT access token và refresh token truyền qua HTTPS; không lưu trong localStorage không được bảo vệ.
- NFR9: Tất cả giao tiếp client-server sử dụng HTTPS/TLS.
- NFR10: Server hỗ trợ thu hồi refresh token; phiên bị thu hồi từ chối mọi yêu cầu tiếp theo.
- NFR11: Dữ liệu tài chính chỉ được truy cập bởi người dùng đã xác thực với vai trò phù hợp.
- NFR12: Chi tiết lỗi kỹ thuật nội bộ không được hiển thị cho người dùng cuối.

**Độ tin cậy & Tính nhất quán Dữ liệu (NFR13–NFR17)**

- NFR13: Server xử lý cùng một `client_order_id` nhiều lần trả về cùng kết quả, không tạo đơn trùng.
- NFR14: Snapshot đơn hàng tại thời điểm bán không bao giờ bị thay đổi sau khi đơn hoàn tất.
- NFR15: Đơn hàng pending trong IndexedDB không mất khi trình duyệt khởi động lại hoặc tab được làm mới.
- NFR16: Khi sync thất bại, hệ thống retry tự động — không im lặng bỏ qua đơn pending.
- NFR17: Phiên offline hết hạn sau đúng 7 ngày kể từ lần xác thực online cuối — không sớm hơn, không muộn hơn.
- NFR18: Store có thể bật/tắt `tableMode` mà không cần redeploy; mode mới áp dụng sau reload session POS để tránh race trong ca bán.
- NFR19: Mọi thao tác quản lý bàn phía POS (xem floor-plan, chọn bàn, mở phiên, hoàn tất đơn kèm bàn) phải hoạt động khi offline với độ trễ tương đương online — không phụ thuộc kết nối server.

### Additional Requirements

Yêu cầu kỹ thuật và hạ tầng từ Architecture (ảnh hưởng đến epic/story creation, đặc biệt Epic 1):

**Khởi tạo Repo & Hạ tầng**

- AR1: **Starter template bắt buộc** — `pos-web` qua `npm create @vite-pwa/pwa@latest pos-web -- --template react-ts` (Vite 7 + React 18 + vite-plugin-pwa); `pos-api` qua `npx @nestjs/cli@latest new pos-api`. Đây là Story 1.1.
- AR2: Docker Compose PostgreSQL 16 cho dev (port 5432); dev demo only, không production.
- AR3: Prisma 7 schema-first source-of-truth tại `prisma/schema.prisma`; Migrate qua `npx prisma migrate dev`; Seed qua `prisma db seed` (idempotent qua `prisma.upsert`).
- AR4: Multi-tenant scoping qua Prisma `$extends` middleware — auto-scope `tenant_id` + `store_id` cho mọi truy vấn business; CẤM `prisma.$queryRaw`/`$executeRaw` không có scope.

**Kiến trúc Layer**

- AR5: Backend layer architecture (4 tầng): Controller → Service → Repository → PrismaService. Controller KHÔNG gọi Repository trực tiếp; Service KHÔNG truy cập `req`/`res`; Repository chỉ chứa Prisma queries.
- AR6: Frontend layer (1 chiều): `routes/` → `features/<X>/` → `shared/` + `db/`. `features/` KHÔNG import lẫn nhau (cross-feature đi qua hook); `shared/` KHÔNG import `features/` hoặc `routes/`; `db/` chỉ được dùng từ `features/`.

**API & Communication**

- AR7: RFC 7807 Problem Details — global `ProblemDetailsFilter` cho mọi response lỗi (`application/problem+json`); field `type` URI ổn định cho FE map action; `traceId` từ Pino request context.
- AR8: Idempotency-Key header cho `POST /api/v1/orders` (giá trị = `clientOrderId` UUID v7); server dedup theo `(tenant_id, store_id, device_id, client_order_id)`; replay trả `200 OK` với `idempotent_replay: true`.
- AR9: UUID v7 từ `uuid@11+` qua `uuidv7()` cho mọi PK (KHÔNG dùng v4) — time-ordered, tốt cho index DB.
- AR10: REST API versioned `/api/v1/...` URL prefix bắt buộc; OpenAPI 3 auto-gen qua `@nestjs/swagger`.
- AR11: Health endpoint `GET /health` (no auth) cho FE ping connectivity.

**Bảo mật & Auth**

- AR12: bcrypt cost factor 12 cho password hashing.
- AR13: Access token JWT TTL **đúng 7 ngày** (NFR17); single token strategy — vừa làm Bearer cho API online vừa làm gate offline flow.
- AR14: Token storage strict — Access token: IndexedDB (qua `db.session`); Refresh token: HttpOnly Secure cookie; **CẤM** localStorage/sessionStorage cho mọi loại token.
- AR15: Rate limiting `@nestjs/throttler` cho `/auth/login`, `/auth/refresh`.
- AR16: CSRF double-submit cookie pattern cho `/auth/refresh` (cookie `csrf_token` + header `X-CSRF-Token`).
- AR17: CSP strict header — `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`; CẤM `dangerouslySetInnerHTML` ở mọi nơi.
- AR18: RBAC qua `@Roles('admin'|'cashier')` decorator + `RolesGuard`.
- AR19: Server-side `users.is_revoked` flag — checked tại `/auth/refresh`; rotating refresh token + bảng `refresh_tokens` cho server revocation.

**Validation & Format**

- AR20: Validation 3 tầng — RHF + zodResolver (FE form) / NestJS ValidationPipe + class-validator (API DTO) / Prisma constraints (DB). FE validation KHÔNG thay thế server validation.
- AR21: Date/Time format chuẩn — API: ISO 8601 UTC `YYYY-MM-DDTHH:mm:ss.sssZ`; DB: `timestamptz`; UI: date-fns locale `vi`, format `dd/MM/yyyy HH:mm`; reports input: `YYYY-MM-DD` (server convert TZ `Asia/Ho_Chi_Minh`).
- AR22: VND integer (đồng) — KHÔNG float, KHÔNG đơn vị nhỏ hơn; format hiển thị qua `formatVnd(45000)` → `"45.000 ₫"` locale `vi-VN`.
- AR23: JSON payload field — `camelCase` (đồng nhất TS, không cần transform); query param URL: `snake_case`; custom header: `X-PascalCase-With-Dashes`.

**Data Integrity**

- AR24: Snapshot immutability — fields có hậu tố `Snapshot` (TS) hoặc cột DB `*_snapshot` là **bất biến sau insert**; KHÔNG có UPDATE method cho fields này (`productNameSnapshot`, `unitPriceSnapshot`, `priceDeltaSnapshot`, `labelSnapshot`, `menuVersionAtSale`).
- AR25: Append-only orders — KHÔNG soft delete; void riêng qua bảng `order_voids`.
- AR26: Order code format `YYYYMMDD-POSXX-NNNN` (vd `20260509-POS01-0042`).

**Frontend Architecture**

- AR27: 3-tier state management FE — Dexie + `useLiveQuery` (POS data + offline source-of-truth) / TanStack Query (Admin server-state) / Zustand (UI state: cart, modal, connectivity). KHÔNG để loading server-state vào Zustand.
- AR28: shadcn/ui + Tailwind + Radix UI — copy-paste pattern; `components.json` config; bọc thành component domain-specific khi pattern lặp lại.
- AR29: React Router v7 data routers — tách `/login`, `/pos`, `/admin/*` rõ ràng.
- AR30: Forms — React Hook Form + Zod resolver; chia sẻ Zod schema FE+sync payload qua `shared-contracts/` (copy thủ công cho MVP).
- AR31: Code splitting — route-based lazy load (`/admin` chunk tách khỏi `/pos`) để đáp ứng NFR1 (POS shell <2s/3G).
- AR32: PWA — vite-plugin-pwa + Workbox; Service Worker cache shell + assets tĩnh; manifest; React virtual module `virtual:pwa-register/react` cho update prompt.
- AR33: Sync engine FSM — sequential POST per đơn (KHÔNG parallel); exponential backoff `1s, 2s, 4s, 8s, 16s`; triggers (`online` event, `visibilitychange`, interval 60s, manual button FR23).
- AR34: Connectivity — `useConnectivity()` hook (ping `/health` + `navigator.onLine`); store Zustand `connectivityStore`.

**Quan sát & DevOps**

- AR35: Pino structured JSON logging (nestjs-pino) với `traceId` request context; raw stack chỉ vào server log + traceId trả client.
- AR36: Helmet + CORS + ProblemDetailsFilter + ValidationPipe + Swagger trong `main.ts` bootstrap.
- AR37: Test coverage minimum — BE services/filters ≥70%, project chung ≥80%; CI gate.
- AR38: Pre-commit (lefthook hoặc husky) — `prisma format` + `eslint --fix` + `prettier --write` cho file đã stage.
- AR39: CI bắt buộc — `prisma validate`, `tsc --noEmit` cả 2 repo, `eslint .` không cảnh báo, jest (BE) + vitest (FE) với coverage gate, `npm run build` cả 2 repo.

**Locale & i18n**

- AR40: Code/comment ngắn: tiếng Anh; tài liệu, message UI, log error UI-facing: **Tiếng Việt**; date-fns locale `vi`; timezone reporting `Asia/Ho_Chi_Minh`; currency VND integer.

### UX Design Requirements

Yêu cầu UX từ UX Design Specification — mỗi UX-DR đủ specific để generate story với testable AC:

**Design Tokens & Visual System**

- UX-DR1: Định nghĩa **color tokens** "warm café utility" làm CSS custom properties + Tailwind config: Background `#F8F3EA`, Surface `#FFFFFF`, Surface Muted `#EFE4D3`, Text Primary `#241A14`, Text Secondary `#6F5A4A`, Primary `#6F3E1F`, Primary Hover `#5A321A`, Accent `#C47A2C`, Success `#2F7D4E`, Warning `#B7791F`, Danger `#B42318`, Border `#D8C7B6`. Đảm bảo contrast WCAG AA cho mọi text trên surface.
- UX-DR2: Định nghĩa **typography system** — primary font `Inter` với fallback `system-ui, sans-serif`; type scale (Page title 24–28px semibold, POS product name 16–18px semibold, cart item 15–16px semibold, body 14–16px, secondary/meta 12–14px, total 28–36px bold, CTA 16–18px semibold, receipt 13–14px); tabular numbers cho giá tiền nếu có.
- UX-DR3: Định nghĩa **spacing scale** 8px base — 4/8/12/16/24/32px; touch target tối thiểu 44px (POS ưu tiên 48–56px cho ProductTile/OptionChip/CTA chính).
- UX-DR4: **Hai cột POS layout** landscape-first ≥1024px — product/category area trái/trung tâm, cart/checkout panel cố định bên phải; cart panel KHÔNG biến mất ở primary breakpoint.

**POS Core Components (Phase 1)**

- UX-DR5: `ProductTile` component — POS product grid card với states (default/hover/focus/pressed/disabled/recently-updated), variants (compact/standard/large-touch), `aria-label` gồm tên + giá, Enter/Space để chọn; click/touch mở `OptionModal` nếu sản phẩm có option groups, không có thì thêm thẳng vào giỏ.
- UX-DR6: `OptionModal` component — defining component cho FR10/FR11; modifier-first composer pattern; anatomy (header sản phẩm, nhóm tùy chọn, option chips, ghi chú, preview giá, nút "Thêm vào giỏ"); states (default, invalid required group, max selection reached, loading, disabled option); focus trap + Esc close + heading rõ + group label cho từng option group + keyboard navigation giữa chips; selected state cập nhật item price preview tức thì; thiếu required group thì highlight đúng nhóm với microcopy tiếng Việt.
- UX-DR7: `OptionChip` component — biểu diễn 1 lựa chọn trong option group; states (default/hover/focus/selected/disabled/error); variants (single-select/multi-select/price-delta/recommended-default); role phù hợp radio/checkbox theo loại group; KHÔNG dựa chỉ vào màu thể hiện selected; vượt max thì không chọn thêm và hiển thị feedback ngắn.
- UX-DR8: `CartPanel` component — fixed right panel với states (empty/has-items/checking-out/offline-saved/sync-pending/sync-failed); cho chỉnh số lượng/xóa item (FR13); KHÔNG bị reset khi menu sync; tổng tiền có semantic label; checkout button disabled state rõ nếu chưa đủ điều kiện.
- UX-DR9: `CheckoutSummary` component — tổng tiền, giảm giá, chọn payment method, nút "Hoàn tất đơn"; total nổi bật (28–36px bold).
- UX-DR10: `SyncStatusBadge` component — POS header + receipt + pending area; states (online/offline/pending sync/syncing/synced/failed); compact header badge + detailed status row variants; label text rõ + status dot; click pending/failed mở panel chi tiết hoặc retry action.
- UX-DR11: `PendingCounter` component — POS header cạnh connectivity status; states (zero/non-zero/syncing/failed); cập nhật count dùng `aria-live="polite"` polite (KHÔNG spam); click mở danh sách đơn pending hoặc nút retry. Cập nhật realtime qua `useLiveQuery(db.orders.where('status').equals('pendingSync'))`.

**Order Completion Components (Phase 2)**

- UX-DR12: `ReceiptModal` component (FR18) — anatomy (local order number `YYYYMMDD-POSXX-NNNN`, timestamp, cashier, items/options snapshot, discount, payment method, total, sync status, print action); states (synced/pending sync/failed sync/printed); hiện ngay sau khi lưu local; KHÔNG chặn bởi sync server; print button focusable; nội dung receipt đọc theo thứ tự logic.
- UX-DR13: `PaymentMethodSelector` component (FR15) — radio group cho cash/transfer/card với label tiếng Việt rõ; chọn 1 phương thức cho mỗi đơn.
- UX-DR14: `DiscountControl` component (FR14) — toggle giữa fixed amount (đồng) và percentage; áp dụng toàn đơn; preview total update tức thì.
- UX-DR15: `VoidOrderDialog` component (FR17/FR26) — confirm dialog với input lý do hủy bắt buộc; label cụ thể "Hủy đơn này" (KHÔNG "OK"); xác nhận trước khi đóng nếu có thay đổi chưa lưu.
- UX-DR16: `SyncRetryPanel` component (FR23/FR25) — list đơn pending/failed với action "Thử đồng bộ lại"; KHÔNG hiển thị raw error, dùng microcopy "Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng."

**Admin Components (Phase 3)**

- UX-DR17: `AdminDataTable` component — chuẩn hóa cho categories/products/option-groups; states (loading/empty/error/filtered/saving row action); columns + row actions + status badge + sort handle/order; table header rõ + action button label cụ thể; loading dùng skeleton rows; empty state có copy rõ.
- UX-DR18: `ProductForm` component (FR28/FR31/FR32/FR33) — RHF + Zod resolver; field cho tên, danh mục, giá gốc, gán option groups, switch trạng thái bán "Đang bán"/"Tạm tắt", sort order; validation inline ngay dưới field; required field rõ; save action cố định ở cuối form/dialog.
- UX-DR19: `CategoryForm` component (FR27/FR33) — RHF + Zod; field cho tên + sort order + (optional) icon; validation inline.
- UX-DR20: `OptionGroupForm` component (FR29/FR30) — quản lý nhóm tùy chọn dùng chung + tùy chọn con với delta giá + quy tắc bắt buộc/min/max; validation cho min ≤ max, delta giá integer.
- UX-DR21: `StatusBadge` component — chuẩn hóa cho product active/inactive, sync status, payment method, report state; variants (success/warning/danger/neutral/accent); LUÔN có text label, không chỉ dùng màu.
- UX-DR22: `DateRangeReportFilter` component (FR37–FR40) — react-day-picker; from/to date với timezone hint `Asia/Ho_Chi_Minh`; format input `YYYY-MM-DD`; ngăn ambiguity timezone.

**Polish & States (Phase 4)**

- UX-DR23: `EmptyState` component — copy-driven cho từng surface: cart "Chọn món để bắt đầu đơn.", reports "Chưa có đơn đã đồng bộ trong khoảng ngày này.", products search "Không tìm thấy sản phẩm phù hợp."
- UX-DR24: `ErrorState` component — error UI với recovery actions (Retry / Kiểm tra kết nối / Quay lại / Liên hệ admin); KHÔNG hiển thị raw error/stack/request ID.
- UX-DR25: `MenuUpdatedToast` component — non-blocking sonner toast "Menu đã cập nhật" sau menu sync; KHÔNG modal bắt buộc; KHÔNG thay đổi đơn đang xử lý.
- UX-DR26: `LoadingSkeleton` component — POS skeleton nhỏ cục bộ (KHÔNG khóa toàn màn hình); admin table skeleton rows; reports loading state tại chart/table area.
- UX-DR27: `PrintReceiptLayout` — CSS `@media print` riêng cho receipt; in qua `window.print()` browser; layout tối ưu cho khổ in nhỏ.

**Layout & Navigation Patterns**

- UX-DR28: `ConnectivityIndicator` + `RoleGate` layout — header POS hiển thị trạng thái online/offline + pending counter (FR24); role-gate component routing user → POS (cashier) hoặc Admin (admin) sau login (FR7); KHÔNG cạnh tranh với action bán hàng.
- UX-DR29: POS không chuyển màn hình — search/category/filter chỉ thay đổi nội dung product grid, KHÔNG mất cart context; OptionModal mở trên cùng surface.
- UX-DR30: Admin navigation sectioned — Menu (sub: Categories/Products/Option Groups), Reports, Users/Sessions; navigation rõ nhưng KHÔNG nổi bật hơn nội dung CRUD.

**Status Microcopy & Localization**

- UX-DR31: Status microcopy tiếng Việt chuẩn — Online: "Online"; Offline: "Offline — vẫn bán được"; Pending: "{N} đơn chờ đồng bộ"; Syncing: "Đang đồng bộ"; Synced: "Đã đồng bộ"; Failed: "Chưa đồng bộ được"; Menu updated: "Menu đã cập nhật". KHÔNG raw error/thuật ngữ kỹ thuật (idempotency, sync version) cho thu ngân.
- UX-DR32: Currency display — `formatVnd(45000)` → `"45.000 ₫"`; locale `vi-VN`; KHÔNG decimal; tổng tiền nổi bật hơn line item.
- UX-DR33: Date display — UI `dd/MM/yyyy HH:mm` qua date-fns locale `vi`; reports KHÔNG ambiguity timezone.

**Accessibility & Responsive**

- UX-DR34: Accessibility WCAG 2.1 AA cho luồng chính (login/POS checkout/option modal/receipt/admin menu/reports) — contrast 4.5:1 text thường + 3:1 text lớn/icon; focus indicator rõ cho mọi interactive element; keyboard support cho POS flows chính (chọn product/option/thêm giỏ/checkout); dialog focus trap + Esc close (nếu an toàn) + focus return; touch target ≥44x44px; KHÔNG dùng màu làm tín hiệu duy nhất; form fields có label + error message liên kết; receipt đọc theo thứ tự logic; KHÔNG `dangerouslySetInnerHTML`.
- UX-DR35: ARIA patterns — `aria-live="polite"` cho pending/sync status (tránh spam screen reader); `aria-describedby` nối error text với form field; semantic HTML (button, label, table) trước CSS.
- UX-DR36: Responsive breakpoint strategy — `<768px`: unsupported message "POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet"; `768–1023px`: limited tablet, layout compact; `1024–1279px`: primary small laptop/tablet landscape target; `1280–1439px`: comfortable POS layout; `1440px+`: expanded; product grid responsive columns; OptionModal max-height + internal scroll.

**Implementation Checklist:** Mọi story frontend hoặc story có UI surface phải giữ accessibility trong checklist implementation: WCAG 2.1 AA, keyboard-only path cho luồng chính, focus trap/return cho dialog, visible focus state, text-not-color-only status, semantic HTML, axe/Playwright accessibility check tối thiểu cho happy path liên quan.

### FR Coverage Map

| FR | Epic | Mô tả ngắn |
|---|---|---|
| FR1 | Epic 1 | Đăng nhập email/password khi online |
| FR2 | Epic 1 | Phiên offline 7 ngày |
| FR3 | Epic 1 | Tiếp tục dùng POS offline nếu phiên còn hợp lệ |
| FR4 | Epic 1 | Auto refresh access token |
| FR5 | Epic 1 | Admin thu hồi phiên server-side |
| FR6 | Epic 1 | Redirect về login khi phiên hết hạn |
| FR7 | Epic 1 | Role-based routing sau login |
| FR8 | Epic 2 | Lưới sản phẩm theo danh mục |
| FR9 | Epic 2 | Tìm kiếm sản phẩm theo tên |
| FR10 | Epic 2 | Modal tùy chọn |
| FR11 | Epic 2 | Tùy chọn bắt buộc/không bắt buộc |
| FR12 | Epic 2 | Ghi chú item |
| FR13 | Epic 2 | Điều chỉnh số lượng/xóa item |
| FR14 | Epic 2 | Giảm giá toàn đơn |
| FR15 | Epic 2 | Phương thức thanh toán |
| FR16 | Epic 2 | Hoàn tất đơn online/offline |
| FR17 | Epic 2 | Hủy đơn (chưa sync) kèm lý do |
| FR18 | Epic 2 | Hóa đơn + in qua trình duyệt |
| FR19 | Epic 2 | Mã đơn cục bộ `YYYYMMDD-POSXX-NNNN` + UUID v7 |
| FR20 | Epic 2 | Snapshot tại thời điểm bán |
| FR21 | Epic 2 | Sync ngay khi online |
| FR22 | Epic 2 | Pending sync + auto sync khi có mạng |
| FR23 | Epic 2 | Manual sync trigger |
| FR24 | Epic 2 | Connectivity indicator + pending counter |
| FR25 | Epic 2 | Log lỗi sync nội bộ (không lộ raw error) |
| FR26 | Epic 2 | Void đơn đã sync (bản ghi riêng) |
| FR27 | Epic 3 | CRUD danh mục |
| FR28 | Epic 3 | CRUD sản phẩm |
| FR29 | Epic 3 | CRUD nhóm tùy chọn |
| FR30 | Epic 3 | CRUD tùy chọn + delta giá + quy tắc bắt buộc/min/max |
| FR31 | Epic 3 | Gán nhóm tùy chọn cho sản phẩm |
| FR32 | Epic 3 | Bật/tắt trạng thái bán |
| FR33 | Epic 3 | Sắp xếp thứ tự hiển thị |
| FR34 | Epic 3 | POS pull menu khi server có version mới |
| FR35 | Epic 3 | Incremental + full snapshot fallback |
| FR36 | Epic 3 | Menu update không phá đơn cũ (snapshot) |
| FR37 | Epic 4 | Doanh thu theo ngày |
| FR38 | Epic 4 | Tổng số đơn |
| FR39 | Epic 4 | Doanh thu theo phương thức thanh toán |
| FR40 | Epic 4 | Top sản phẩm bán chạy |
| FR41 | Epic 1 | Docker Compose PostgreSQL |
| FR42 | Epic 1 | Migration Prisma |
| FR43 | Epic 1 | Seed dữ liệu demo café |
| FR44 | Epic 6 | Store `tableMode` dual-mode F&B |
| FR45 | Epic 6 | Admin CRUD khu vực bàn |
| FR46 | Epic 6 | Admin CRUD bàn |
| FR47 | Epic 6 | POS chọn bàn trước khi vào menu |
| FR47b | Epic 6 | Bán hàng nhanh trong store `tableMode=true` |
| FR48 | Epic 6 | Order gắn `tableId` nullable + `tableNameSnapshot` immutable |
| FR49 | Epic 6 | Admin cập nhật cấu hình `tableMode` |
| FR50 | Epic 6 | Floor-plan offline-first + status bàn |
| FR51 | Epic 6 | Status bàn từ order/session và online refresh |
| FR52 | Epic 6 | Receipt hiển thị tên bàn |
| FR53 | Epic 6 | Mở bàn tạo `table_session` occupied ngay |
| FR54 | Epic 6 | Cross-device occupancy + allow/warn |
| FR55 | Epic 6 | POS table management hoạt động offline |
| FR56 | Epic 6 | Offline double-open giữ cả hai phiên + conflict badge |

**NFR Distribution:**

- **Epic 1:** NFR7–NFR12 (security: no-password-local, HTTPS, JWT revocation, RBAC, error masking), NFR17 (offline đúng 7 ngày)
- **Epic 2:** NFR1–NFR5 (performance: POS shell, add cart, finalize, sync, menu cache), NFR13–NFR16 (reliability: idempotency, snapshot immutable, persist Dexie, retry no-skip)
- **Epic 3:** NFR14 (snapshot immutability — re-verified khi menu cập nhật)
- **Epic 4:** NFR6 (report 30 ngày <5s)
- **Epic 6:** NFR18 (mode toggle không cần redeploy), NFR19 (POS table management offline parity)

**UX-DR Distribution:**

- **Epic 1:** UX-DR1–UX-DR4 (design tokens, typography, spacing, layout), UX-DR28 (ConnectivityIndicator + RoleGate baseline), UX-DR31 (status microcopy strings), UX-DR34–UX-DR36 (a11y + responsive baseline)
- **Epic 2:** UX-DR5–UX-DR16 (POS components: ProductTile, OptionModal, OptionChip, CartPanel, CheckoutSummary, SyncStatusBadge, PendingCounter, ReceiptModal, PaymentMethodSelector, DiscountControl, VoidOrderDialog, SyncRetryPanel), UX-DR23–UX-DR27 (polish: EmptyState, ErrorState, LoadingSkeleton, PrintReceiptLayout), UX-DR29 (POS no-screen-change), UX-DR32 (currency display)
- **Epic 3:** UX-DR17–UX-DR21 (admin components: AdminDataTable, ProductForm, CategoryForm, OptionGroupForm, StatusBadge), UX-DR25 (MenuUpdatedToast), UX-DR30 (admin sectioned navigation)
- **Epic 4:** UX-DR22 (DateRangeReportFilter), UX-DR23 EmptyState (reports specific), UX-DR33 (date display)

## Epic List

### Epic 1: Foundation, Demo Setup & Authentication

**Mục tiêu Epic:** Khởi tạo nền tảng kỹ thuật cho 2 repo (`pos-web` PWA + `pos-api` NestJS), thiết lập demo cục bộ qua Docker Compose + Prisma migration + seed dữ liệu café mẫu, và triển khai luồng xác thực hoàn chỉnh (JWT 7 ngày + refresh cookie + admin revocation + role-based routing). Sau Epic này, **developer có thể setup demo trong 1 buổi**, **admin và thu ngân có thể đăng nhập an toàn** và được điều hướng đúng vai trò; **phiên offline 7 ngày hoạt động đúng** ngay cả khi thiết bị mất mạng. Đây là user-value foundation: developer demo experience + first-login experience.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR41, FR42, FR43

**NFRs covered:** NFR7, NFR8, NFR9, NFR10, NFR11, NFR12, NFR17

**UX-DRs covered:** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR28, UX-DR31, UX-DR34, UX-DR35, UX-DR36

**Key ARs enforced:** AR1 (starter templates), AR2 (Docker Compose), AR3 (Prisma flow), AR4 (multi-tenant `$extends`), AR5 (BE 4-layer architecture), AR6 (FE layer rules), AR7 (Problem Details filter), AR9 (UUID v7), AR10 (REST `/api/v1/`), AR11 (`/health`), AR12–AR19 (auth + security stack), AR23 (camelCase JSON), AR28 (shadcn baseline), AR29 (React Router v7), AR30 (RHF+Zod), AR32 (PWA tooling), AR35 (Pino), AR36 (Helmet/CORS bootstrap), AR37–AR39 (test coverage + CI), AR40 (locale)

**Dependency:** Standalone — foundation cho tất cả epics tiếp theo. Sau Epic 1, seed data (4–6 categories, 20–30 products, option groups) có sẵn để Epic 2 đọc.

---

### Epic 2: POS Selling — Online, Offline & Sync

**Mục tiêu Epic:** Xây toàn bộ trải nghiệm bán hàng tại quầy: lưới sản phẩm theo danh mục, tìm kiếm, modal tùy chọn (defining interaction), giỏ hàng + giảm giá + chọn phương thức thanh toán, hoàn tất đơn (lưu cục bộ trước → sync sau), receipt + in qua trình duyệt, hủy đơn, void đơn đã sync, và sync engine offline-first với idempotency đảm bảo. Sau Epic này, **thu ngân hoàn tất đơn online hoặc offline trong dưới 60 giây với cùng luồng thao tác**, đơn không bị mất khi reload, sync idempotent đảm bảo không trùng đơn dù retry nhiều lần, snapshot tại thời điểm bán bất biến.

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR26

**NFRs covered:** NFR1, NFR2, NFR3, NFR4, NFR5, NFR13, NFR14, NFR15, NFR16

**UX-DRs covered:** UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10, UX-DR11, UX-DR12, UX-DR13, UX-DR14, UX-DR15, UX-DR16, UX-DR23 (cart/products empty), UX-DR24, UX-DR26, UX-DR27, UX-DR29, UX-DR32

**Key ARs enforced:** AR4 (multi-tenant cho mọi truy vấn `orders/sync_log`), AR8 (Idempotency-Key dedup), AR21 (ISO 8601 UTC `soldAt`), AR22 (VND integer), AR24 (snapshot fields immutable), AR25 (append-only orders + void riêng), AR26 (order code), AR27 (3-tier state), AR31 (code splitting POS chunk), AR32 (PWA precache POS shell <2s/3G), AR33 (sync engine FSM + exponential backoff), AR34 (`useConnectivity()`)

**Dependency:** Builds on Epic 1 (auth, seed menu, design tokens). Standalone deliverable: thu ngân bán hàng đầy đủ với menu seed; không cần Epic 3 để hoạt động.

---

### Epic 3: Menu Management & Auto-Sync

**Mục tiêu Epic:** Cho admin/chủ quán quản lý menu hoàn chỉnh không cần kỹ thuật (CRUD danh mục, sản phẩm, nhóm tùy chọn, tùy chọn với delta giá + quy tắc min/max; bật/tắt trạng thái bán; sắp xếp thứ tự hiển thị) và đảm bảo POS tự nhận menu mới qua versioned sync (incremental + full fallback) **mà không phá snapshot đơn cũ**. Sau Epic này, **admin tạo "Trà Đào Cam Sả" và tắt "Sinh Tố Bơ" hết nguyên liệu**; lần POS online tiếp theo tự kéo menu mới; đơn cũ giữ nguyên giá tại thời điểm bán; admin không cần dùng thuật ngữ kỹ thuật như `menu_version`.

**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36

**NFRs covered:** NFR14 (snapshot immutability re-verified khi admin sửa menu)

**UX-DRs covered:** UX-DR17, UX-DR18, UX-DR19, UX-DR20, UX-DR21, UX-DR25 (MenuUpdatedToast), UX-DR30 (admin sectioned navigation)

**Key ARs enforced:** AR4 (multi-tenant menu queries), AR20 (validation 3-tier: RHF+Zod / class-validator / Prisma), AR23 (camelCase API), AR24 (snapshot immutability đối với đơn cũ khi menu mutated)

**Dependency:** Builds on Epic 1 (auth + admin role). Standalone deliverable: admin quản lý menu và POS auto-sync. Verifies & strengthens Epic 2 snapshot guarantee.

---

### Epic 4: Business Reports

**Mục tiêu Epic:** Cho admin xem báo cáo doanh thu cơ bản theo khoảng ngày: doanh thu theo ngày (`byDay`), tổng số đơn, doanh thu phân theo phương thức thanh toán (cash/transfer/card), top sản phẩm bán chạy. Server aggregate với timezone `Asia/Ho_Chi_Minh`; date-range picker dễ dùng; empty state rõ ("Chưa có đơn đã đồng bộ trong khoảng ngày này"). Sau Epic này, **chủ quán mở báo cáo, chọn khoảng 01/05–09/05 và thấy kết quả trong dưới 5 giây** với đầy đủ 4 metric.

**FRs covered:** FR37, FR38, FR39, FR40

**NFRs covered:** NFR6 (báo cáo 30 ngày <5s)

**UX-DRs covered:** UX-DR22 (DateRangeReportFilter), UX-DR23 (EmptyState reports), UX-DR33 (date display)

**Key ARs enforced:** AR4 (multi-tenant aggregations), AR21 (date input `YYYY-MM-DD`, server convert TZ Asia/Ho_Chi_Minh), AR22 (VND integer trong sum), AR31 (admin code-split chunk)

**Dependency:** Builds on Epic 1 (auth + admin role) và Epic 2 (synced orders data). Standalone deliverable: business reporting capability.

---

### Epic 6: Quản lý Bàn F&B (Table Service Mode) — Brownfield Expansion

**Mục tiêu Epic:** Mở rộng MVP sang **dual-mode F&B**: mỗi store có thể bật/tắt `tableMode` để vận hành theo counter-service (như trước) hoặc table-service (gắn order với bàn cụ thể). Khi `tableMode=true`, floor-plan view trở thành entry point POS — thu ngân chọn bàn trước khi vào menu; order lưu kèm `tableId` + `tableNameSnapshot` immutable; hóa đơn in tên bàn. **Quick-counter ("Bán hàng nhanh")** vẫn truy cập một chạm từ floor-plan để phục vụ khách mua mang đi tại quán F&B. Sau Epic này, **store F&B vận hành table-service đầy đủ** với 2 khu vực và ~8 bàn demo; **store counter-service hiện hữu KHÔNG thấy bất kỳ thay đổi UI nào** (backward compatible qua `tableMode=false`). Sau SCP-2026-06-01, Epic 6 Phase 1 cũng đảm bảo floor-plan/chọn bàn/mở phiên/finalize đơn kèm bàn hoạt động offline-first; occupancy dựa trên `table_session` open hoặc order trong ngày; online cross-device thấy occupied trong ≤1 chu kỳ polling; offline double-open giữ cả hai phiên và hiện badge conflict.

**FRs covered:** FR44, FR45, FR46, FR47, FR47b, FR48, FR49, FR50, FR51, FR52, FR53, FR54, FR55, FR56

**NFRs covered:** NFR18 (mode toggle không cần redeploy), NFR19 (POS table management offline parity)

**UX-DRs covered:** UX-DR-T1 (TablePicker), UX-DR-T2 (FloorPlanView), UX-DR-T3 (AreaTabs), UX-DR-T4 (TableStatusBadge), UX-DR-T5 (Admin Table Form), UX-DR-T6 (Admin Area Form), UX-DR-T7 (POS Layout sticky bàn), UX-DR-T8 (TableModeBadge), UX-DR-T9 (POS Empty State), UX-DR-T10 (Admin Empty State), UX-DR-T11 (Admin Navigation), UX-DR-T12 (Quick-Counter Button), UX-DR-T13 (Mode Transition Affordance)

**Key ARs enforced:** AR4 (multi-tenant scope cho `areas`/`tables`; server validate `tableId` thuộc store), AR8 (Idempotency-Key dedup — `tableId` KHÔNG vào composite key), AR24 (snapshot immutability cho `tableNameSnapshot`), AR25 (append-only order; `table_id` nullable FK), AR27 (Zustand cart store mở rộng `tableId`/`tableNameSnapshot`), AR33 (sync engine không đổi FSM/retry policy — payload thêm field optional)

**Dependency:** Builds on Epic 1 (auth, multi-tenant, seed framework), Epic 2 (orders schema + sync engine + cart/checkout/receipt) và Epic 3 (admin nav + AdminDataTable foundation). Brownfield patch nội bộ trong Story 6-8 sửa Story 2-4..2-8 và 3-1 để table-aware mà KHÔNG re-open Epic 2/3 done state.

**Mode toggle safety net:** Store mới mặc định `tableMode=false`; existing store counter-service không thay đổi behavior. Demo seed bổ sung 1 store `tableMode=true` để verify cả 2 paths.

---

## Epic 1: Foundation, Demo Setup & Authentication

Khởi tạo nền tảng kỹ thuật cho 2 repo (`pos-web` PWA + `pos-api` NestJS), thiết lập demo cục bộ qua Docker Compose + Prisma migration + seed dữ liệu café mẫu, và triển khai luồng xác thực hoàn chỉnh (JWT 7 ngày + refresh cookie + admin revocation + role-based routing). Sau Epic này, developer setup demo trong 1 buổi; admin/thu ngân đăng nhập an toàn và được điều hướng đúng vai trò; phiên offline 7 ngày hoạt động đúng.

### Story 1.1: Khởi tạo 2 Repo (`pos-web` PWA + `pos-api` NestJS) với Baseline Tooling

As a developer,
I want khởi tạo 2 repo độc lập (`pos-web` PWA + `pos-api` NestJS) với baseline tooling, TypeScript strict và scripts dev/build/test,
So that team có nền tảng kỹ thuật chuẩn để bắt đầu implement, và bất kỳ developer mới cũng có thể clone + boot dev trong dưới 5 phút.

**Acceptance Criteria:**

**Given** chưa có repo nào tồn tại
**When** developer chạy `npm create @vite-pwa/pwa@latest pos-web -- --template react-ts`
**Then** thư mục `pos-web/` được tạo với Vite 7 + React 18 + TypeScript strict + vite-plugin-pwa configured + Workbox SW + manifest stub
**And** `npm run dev` boot thành công ở port 5173 và `npm run build` tạo `dist/` với SW precache config

**Given** `pos-web/` đã init
**When** developer chạy `npx @nestjs/cli@latest new pos-api`
**Then** `pos-api/` có NestJS 11 + TypeScript strict + Jest + ESLint + Prettier configured
**And** `npm run start:dev` boot thành công ở port 3000

**Given** cả 2 repo đã init
**When** developer kiểm tra `.gitignore` và `.env.example`
**Then** `.gitignore` exclude `.env`, `node_modules/`, `dist/`, `coverage/` ở cả 2 repo
**And** `pos-web/.env.example` chứa `VITE_API_BASE_URL=http://localhost:3000`
**And** `pos-api/.env.example` chứa placeholder `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CSRF_SECRET`, `NODE_ENV`
**And** không có secret thực committed

**Given** baseline `tsconfig.json` ở cả 2 repo
**When** developer chạy `tsc --noEmit`
**Then** strict mode pass (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)

**Given** README.md tại root mỗi repo
**When** developer mới đọc README
**Then** doc liệt kê commands `npm install`, `npm run dev`, `npm run build`, `npm test`, `npm run lint` rõ ràng bằng tiếng Việt
**And** README ghi rõ Node version yêu cầu (≥20)

---

### Story 1.2: Hạ tầng PostgreSQL + Prisma Foundation Schema + First Migration

As a developer,
I want chạy PostgreSQL 16 cục bộ qua Docker Compose và có Prisma schema với các bảng nền tảng (auth: `tenants`, `stores`, `users`, `refresh_tokens`; menu read-side: `categories`, `products`, `option_groups`, `options`, `product_option_groups`; versioning: `menu_versions`),
So that backend có database hoạt động và schema sẵn sàng cho seed data ở Story 1.4, GET /menu read ở Story 2.1, và CRUD endpoints ở Epic 3.

**Implementation Decision:** Story 1.2 chủ đích giữ broad foundation schema như một ngoại lệ foundation cho FR43 seed/demo, GET `/menu` read path ở Story 2.1 và CRUD admin ở Epic 3. Implementation agents không tách menu schema sang story first-use trừ khi Sprint Planning đổi quyết định này.

**Acceptance Criteria:**

**Given** Docker Desktop đã chạy
**When** developer chạy `docker compose up -d` ở `pos-api/`
**Then** PostgreSQL 16 lên ở port 5432 với volume persistent
**And** healthcheck thành công sau ≤30s

**Given** Prisma đã init (`npx prisma init`)
**When** developer mở `prisma/schema.prisma`
**Then** schema chứa các model với naming theo convention (PascalCase model + camelCase field + `@@map` snake_case + `@map` snake_case + `id String @id @default(uuid())` UUID v7):

**Auth foundation:**
- `Tenant`: `id`, `name`, `createdAt`, `updatedAt`
- `Store`: `id`, `tenantId`, `name`, `code` (vd "POS01"), `createdAt`, `updatedAt`
- `User`: `id`, `tenantId`, `storeId`, `email` (unique scoped), `passwordHash` String NOT NULL, `role` enum `Role { Admin, Cashier }`, `isRevoked` Boolean default false, `createdAt`, `updatedAt`
- `RefreshToken`: `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt?`, `createdAt`

**Menu read-side foundation:**
- `Category`: `id`, `tenantId`, `storeId`, `name`, `sortOrder Int default 0`, `createdAt`, `updatedAt`; unique `(tenantId, storeId, name)` `uq_categories_tenant_store_name`
- `Product`: `id`, `tenantId`, `storeId`, `categoryId` (FK), `name`, `priceVnd Int`, `isActive Boolean default true`, `sortOrder Int default 0`, `createdAt`, `updatedAt`; index `idx_products_category_id`, `idx_products_is_active`
- `OptionGroup`: `id`, `tenantId`, `storeId`, `name`, `isRequired Boolean default false`, `minSelect Int default 0`, `maxSelect Int`, `sortOrder Int default 0`, `createdAt`, `updatedAt`
- `Option`: `id`, `optionGroupId` (FK), `label`, `priceDeltaVnd Int default 0`, `isDefault Boolean default false`, `isActive Boolean default true`, `sortOrder Int default 0`, `createdAt`, `updatedAt`; index `idx_options_option_group_id`
- `ProductOptionGroup`: `productId`, `optionGroupId`, `sortOrder Int default 0`, `createdAt`; PK composite `(productId, optionGroupId)`

**Versioning:**
- `MenuVersion`: `id`, `tenantId`, `storeId`, `version Int default 1`, `bumpedAt`; unique `(tenantId, storeId)`

**And** mọi business table có `tenantId`, `storeId`, `createdAt`, `updatedAt` (trừ `Tenant` và `Store` ở scope auth root)
**And** schema constraint check: `min_select ≤ max_select`, `price_vnd ≥ 0`, `price_delta_vnd` integer

**Given** schema đã chốt
**When** developer chạy `npx prisma migrate dev --name init`
**Then** migration được tạo trong `prisma/migrations/` với SQL hợp lệ
**And** database được apply migration không lỗi

**Given** `.env.example` đã có `DATABASE_URL`
**When** developer copy sang `.env` và chạy `npx prisma db pull` rồi `npx prisma generate`
**Then** Prisma Client TypeScript được generate trong `node_modules/.prisma/client/`
**And** import `PrismaClient` từ NestJS app build pass

**Given** schema đã được apply
**When** developer chạy `npx prisma validate` và `npx prisma format`
**Then** cả hai pass không có warning

---

### Story 1.3: Common Infrastructure (Multi-tenant `$extends`, ProblemDetailsFilter, Pino, Bootstrap Hardening, `/health`)

As a developer,
I want triển khai infrastructure dùng chung của backend (multi-tenant Prisma `$extends`, RFC 7807 `ProblemDetailsFilter`, Pino logging, Helmet/CORS/Swagger trong `main.ts`, `/health` endpoint, `RolesGuard`/`JwtAuthGuard` skeleton),
So that mọi module business sau đó tự động được multi-tenant scope, error response chuẩn RFC 7807, và logging structured có traceId.

**Acceptance Criteria:**

**Given** schema đã có `tenant_id`, `store_id` trên business tables
**When** developer triển khai `PrismaService` trong `src/prisma/prisma.service.ts`
**Then** `PrismaService` extends `PrismaClient` với `$extends` middleware auto-inject `tenantId` + `storeId` vào where clause cho mọi query trên business models (loại trừ `Tenant`, `Store`, `User` ở scope auth)
**And** unit test xác nhận query không có scope sẽ throw `MissingTenantContextError`

**Given** NestJS app
**When** developer triển khai `ProblemDetailsFilter` global trong `src/common/filters/`
**Then** mọi `HttpException` được format thành `application/problem+json` với fields `type` (URI từ `src/common/errors/problem-types.ts`), `title`, `status`, `detail` (sanitized), `instance`, `traceId`
**And** raw error stack KHÔNG bao giờ trả về client; chỉ log Pino server-side với `traceId`

**Given** Pino đã được install (`nestjs-pino`)
**When** request đi qua API
**Then** mỗi request có `traceId` UUID v7 gắn vào log structured JSON
**And** log level configurable qua env `LOG_LEVEL`

**Given** `main.ts` bootstrap
**When** app khởi động
**Then** Helmet middleware active với header `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
**And** CORS configured cho `VITE_API_BASE_URL` origin
**And** `ValidationPipe` global với `whitelist: true, forbidNonWhitelisted: true, transform: true`
**And** Swagger UI mount tại `/api/docs` (chỉ dev)
**And** API prefix `/api/v1`

**Given** `health` module
**When** GET `/health` được gọi (no auth)
**Then** trả `200 OK` với body `{ status: 'ok', traceId: '<uuid v7>' }`

**Given** `JwtAuthGuard` và `RolesGuard` skeleton trong `src/common/guards/`
**When** unit test chạy
**Then** `JwtAuthGuard` parse Bearer token và validate JWT signature; `RolesGuard` check `@Roles('admin'|'cashier')` decorator metadata

---

### Story 1.4: Seed Demo Data (Tenant + Users + Categories + Products + Option Groups + Sample Synced Orders)

As a developer,
I want có lệnh seed idempotent tạo đầy đủ dữ liệu café mẫu (1 tenant/store + 1 admin + 1 cashier + 4–6 danh mục + 20–30 sản phẩm + nhóm tùy chọn size/đá/đường/topping + một số đơn hàng đã sync mẫu),
So that developer mới chạy `npm run seed` là có ngay environment demo đủ để bán hàng và xem báo cáo.

**Acceptance Criteria:**

**Given** schema đã apply migrations
**When** developer mở `prisma/seed.ts`
**Then** file dùng `prisma.upsert({ where: { id: '<fixed uuid v7>' }, ... })` để idempotent — chạy lại không lỗi và không tạo duplicate

**Given** `package.json` scripts có `"seed": "ts-node prisma/seed.ts"` và `"prisma": { "seed": "ts-node prisma/seed.ts" }`
**When** developer chạy `npx prisma db seed`
**Then** seed tạo: 1 tenant `Café Demo`, 1 store `POS01`
**And** 1 admin `admin@cafe.demo` / password `Admin@123!` (bcrypt cost 12), role `Admin`
**And** 1 cashier `cashier@cafe.demo` / password `Cashier@123!` (bcrypt cost 12), role `Cashier`
**And** 4–6 categories tiếng Việt (Cà phê, Trà, Sinh tố, Đá xay, Bánh ngọt) với `sortOrder`
**And** 20–30 products spread theo categories với `priceVnd` integer (vd Bạc Xỉu 35.000, Cà phê đen 25.000, Trà đào 40.000)
**And** option groups (Size S/M/L với delta giá, Đá nhiều/vừa/ít/không, Đường 100/70/50/0%, Topping: Trân châu/Pudding/Thạch — multi-select max 3)
**And** product↔option group assignment (vd Bạc Xỉu có size + đá + đường + topping)
**And** 5–10 sample synced orders với `clientOrderId`, `soldAt` ISO 8601 UTC, snapshot fields đầy đủ, `paymentMethod` mix cash/transfer/card

**Given** seed đã chạy thành công
**When** developer mở Postgres client (vd Adminer hoặc `psql`)
**Then** count rows đúng: `tenants=1, stores=1, users=2, categories≥4, products≥20, option_groups≥4, orders≥5`

**Given** seed chạy lần 2
**When** developer chạy `npx prisma db seed` lại
**Then** không có lỗi unique constraint
**And** count rows không tăng

**Given** seed đã thực thi
**When** developer xem field snapshot trong sample orders
**Then** mỗi `order_item` có `productNameSnapshot`, `unitPriceSnapshot` integer VND, `menuVersionAtSale`, `lineTotal` đúng = `unitPriceSnapshot * quantity + sum(priceDeltaSnapshot)` 

---

### Story 1.5: Auth Backend Endpoints — Login + Refresh + Logout

As an authenticated user (admin or cashier),
I want gọi `POST /api/v1/auth/login` (email/password) để nhận access token JWT 7 ngày + refresh token cookie, và `POST /api/v1/auth/refresh` để rotate access token, và `POST /api/v1/auth/logout` để clear session,
So that client web có thể bắt đầu phiên làm việc, tự động làm mới token và đăng xuất an toàn theo NFR8/NFR9/NFR10/NFR17.

**Acceptance Criteria:**

**Given** user `cashier@cafe.demo` đã được seed
**When** client POST `/api/v1/auth/login` với body `{ email, password }`
**Then** server verify bcrypt (cost 12); nếu match, response 200 với body `{ accessToken: '<JWT exp now+7d>', user: { id, email, role, tenantId, storeId } }`
**And** response set HttpOnly Secure cookie `refresh_token=<rotating-token>` với SameSite=Lax, expires 30 days
**And** server set HttpOnly Secure cookie `csrf_token=<random>` cho double-submit
**And** server insert row vào `refresh_tokens` với `tokenHash` (bcrypt of token), `userId`, `expiresAt`

**Given** body invalid (sai email format hoặc password trống)
**When** POST `/api/v1/auth/login`
**Then** response 400 với RFC 7807 `type=...validation`, fields errors theo class-validator

**Given** email không tồn tại hoặc password sai
**When** POST `/api/v1/auth/login`
**Then** response 401 với RFC 7807 `type=...invalid-credentials`, title "Sai email hoặc mật khẩu" — KHÔNG tiết lộ email tồn tại hay không
**And** rate limit `@nestjs/throttler` chặn ≥6 attempt/phút trên cùng IP

**Given** client có refresh cookie hợp lệ và CSRF token match
**When** POST `/api/v1/auth/refresh` với header `X-CSRF-Token` match cookie `csrf_token`
**Then** server verify refresh token chưa expired và `users.is_revoked = false`
**And** server rotate: invalidate refresh token cũ (set `revokedAt`), insert refresh token mới, set cookie mới
**And** response 200 với `{ accessToken: '<JWT exp now+7d>' }`

**Given** refresh token đã bị server revoke (hoặc `users.is_revoked = true`)
**When** POST `/api/v1/auth/refresh`
**Then** response 401 với RFC 7807 `type=...session-revoked`

**Given** thiếu `X-CSRF-Token` hoặc không match
**When** POST `/api/v1/auth/refresh`
**Then** response 403 với RFC 7807 `type=...csrf-failed`

**Given** client có Bearer access token hợp lệ
**When** POST `/api/v1/auth/logout`
**Then** server clear refresh cookie + csrf cookie + revoke refresh token row
**And** response 204

**Given** unit + e2e tests cho auth module
**When** CI chạy
**Then** coverage `auth.service.ts` ≥80% và e2e `auth.e2e-spec.ts` cover login → refresh → logout happy path

---

### Story 1.6: Admin Session Revocation Endpoint

As an admin,
I want gọi `POST /api/v1/auth/sessions/:userId/revoke` để force logout user khác,
So that tôi có thể thu hồi quyền truy cập của thu ngân nghỉ việc hoặc thiết bị mất.

**Acceptance Criteria:**

**Given** admin đã đăng nhập (Bearer token + role=Admin)
**When** POST `/api/v1/auth/sessions/:userId/revoke`
**Then** server verify caller có role `Admin` (qua `@Roles('admin')` + `RolesGuard`)
**And** set `users.is_revoked = true` cho `userId` target
**And** mọi row `refresh_tokens` của `userId` đó set `revokedAt = now()`
**And** response 204

**Given** caller không phải admin (cashier hoặc anonymous)
**When** POST `/api/v1/auth/sessions/:userId/revoke`
**Then** response 403 với RFC 7807 `type=...forbidden`

**Given** `userId` không tồn tại hoặc thuộc tenant khác
**When** admin POST revoke
**Then** response 404 với RFC 7807 `type=...not-found` (KHÔNG tiết lộ user thuộc tenant nào)

**Given** target user đã có access token JWT 7 ngày trong IndexedDB
**When** target user thử gọi `/api/v1/auth/refresh`
**Then** server check `users.is_revoked` = true → response 401 `type=...session-revoked`
**And** access token offline vẫn dùng được local cho đến khi `exp` (chấp nhận trade-off theo Architecture decision)

**Given** unit test cho `users.service.ts` và `auth/refresh` flow
**When** CI chạy
**Then** test cover positive (admin revoke) + negative (non-admin) + edge (revoke đã revoked) cases

---

### Story 1.7: Frontend Shell — PWA + Design Tokens + Tailwind/shadcn + React Router v7

As a developer,
I want có khung frontend cơ bản với PWA registration, design tokens "warm café utility" làm CSS custom properties + Tailwind, shadcn/ui khởi tạo, và React Router v7 layout shell với routes `/login`, `/pos`, `/admin/*`,
So that các stories sau (FE auth, POS, Admin) có nền tảng UI nhất quán theo UX spec và developer không phải refactor design tokens sau.

**Acceptance Criteria:**

**Given** `pos-web` đã init từ Story 1.1
**When** developer mở `src/main.tsx`
**Then** Service Worker registration qua `virtual:pwa-register/react` được setup với update prompt UI
**And** `manifest.webmanifest` ở `public/` có icon 192/512/maskable, name "Café POS", short_name "POS", theme_color, background_color theo design tokens
**And** test thủ công: build `npm run build` → `dist/` chứa `sw.js` + manifest

**Given** UX-DR1 design tokens
**When** developer mở `src/styles/tokens.css` (hoặc Tailwind config)
**Then** CSS custom properties được định nghĩa: `--color-bg: #F8F3EA`, `--color-surface: #FFFFFF`, `--color-surface-muted: #EFE4D3`, `--color-text-primary: #241A14`, `--color-text-secondary: #6F5A4A`, `--color-primary: #6F3E1F`, `--color-primary-hover: #5A321A`, `--color-accent: #C47A2C`, `--color-success: #2F7D4E`, `--color-warning: #B7791F`, `--color-danger: #B42318`, `--color-border: #D8C7B6`
**And** `tailwind.config.ts` extend theme với các tokens này (`colors.surface`, `colors.primary`, etc.)
**And** typography tokens: `--font-ui: 'Inter', system-ui, sans-serif`; type scale (page-title, product-name, cart-item, body, secondary, total, cta) đúng UX-DR2 spec
**And** spacing scale 8px base (4/8/12/16/24/32px) và touch target min `44px` (CTA `48px`+)

**Given** shadcn/ui đã được setup
**When** developer chạy `npx shadcn@latest init`
**Then** `components.json` chỉ về `src/shared/components/ui/`
**And** một vài shadcn components sample (Button, Dialog, Input) được generate bằng `npx shadcn@latest add button dialog input`
**And** components dùng tokens từ Tailwind config (không hardcoded hex)

**Given** React Router v7 đã được install
**When** developer mở `src/App.tsx`
**Then** `createBrowserRouter` được dùng (data router) với routes: `/login` (LoginPage stub), `/pos` (POS shell stub với two-pane layout), `/admin/*` (Admin shell stub với sectioned nav)
**And** `_layout.tsx` ở route root có `<header>` với `<ConnectivityIndicator />` stub và `<PendingCounter />` stub (chỉ render placeholder badge "Online" / "0 đơn chờ")
**And** lazy load route `/admin/*` qua `React.lazy()` để code-split

**Given** layout shell đã có
**When** developer mở `/pos` ở viewport 1024px+
**Then** thấy two-column landscape layout (UX-DR4): cột trái product area placeholder, cột phải cart panel placeholder cố định (≥1024px primary)
**And** ở viewport <768px hiển thị message "POS hoạt động tốt nhất ở màn hình ngang hoặc laptop/tablet" (UX-DR36)

**Given** axios api-client wrapper
**When** developer mở `src/shared/lib/api-client.ts`
**Then** axios instance có `baseURL = import.meta.env.VITE_API_BASE_URL`
**And** request interceptor stub (sẽ wire token ở Story 1.8); response interceptor parse `application/problem+json` thành `errorMapper` (stub action mapping)

**Given** UX-DR31 microcopy tiếng Việt
**When** developer mở `src/shared/i18n/messages.ts` (hoặc inline constants file)
**Then** strings status được định nghĩa làm constants: `STATUS_ONLINE = "Online"`, `STATUS_OFFLINE = "Offline — vẫn bán được"`, `STATUS_PENDING = (n) => "{n} đơn chờ đồng bộ"`, `STATUS_SYNCING`, `STATUS_SYNCED`, `STATUS_FAILED`, `STATUS_MENU_UPDATED`

---

### Story 1.8: Frontend Auth Flow — Login Page + Token Storage IndexedDB + Axios Interceptor

As a cashier or admin,
I want truy cập trang `/login`, nhập email + password, đăng nhập thành công và được điều hướng tới surface phù hợp với access token được lưu an toàn vào IndexedDB,
So that tôi có thể bắt đầu sử dụng POS hoặc Admin và phiên của tôi tồn tại qua reload/offline trong 7 ngày.

**Acceptance Criteria:**

**Given** Dexie 4.x đã được install
**When** developer mở `src/db/dexie.ts`
**Then** Dexie instance `db` được tạo với schemas tách module:
- `db.session`: bảng access token, primary key `id` (single-row pattern), fields `accessToken`, `expiresAt`, `userInfo`, `lastLoginAt`
- `db.orders`: bảng pending orders (placeholder, populate ở Epic 2)
- `db.menu`: bảng menu cache (placeholder)
**And** version migration setup theo Dexie convention
**And** `db.session` không bao giờ chứa password plaintext

**Given** route `/login` đã tồn tại từ Story 1.7
**When** developer mở `src/routes/login/login-page.tsx` và `login-form.tsx`
**Then** form dùng RHF + zodResolver với schema validate `email` (regex email) + `password` (min 8)
**And** submit gọi `POST /api/v1/auth/login` qua api-client
**And** loading state hiển thị qua RHF `isSubmitting`
**And** lỗi validation server (400) hiển thị field errors inline; lỗi credentials (401) hiển thị message tiếng Việt "Sai email hoặc mật khẩu"
**And** layout login screen dùng design tokens (background `--color-bg`, primary CTA `--color-primary`); contrast WCAG AA

**Given** login thành công
**When** server trả `{ accessToken, user }`
**Then** client ghi `db.session.put({ id: 'current', accessToken, expiresAt: <decoded exp>, userInfo: user, lastLoginAt: now() })`
**And** Zustand `sessionStore` cập nhật `currentUser` derived
**And** điều hướng theo role: admin → `/admin`, cashier → `/pos`

**Given** axios interceptor đã được wire
**When** request đi ra
**Then** `request interceptor` đọc `db.session.get('current')` → check `expiresAt` chưa qua → đính `Authorization: Bearer <accessToken>`
**And** nếu `exp` đã qua → emit event `auth.expired` → redirect `/login` (không gửi request)

**Given** request 401 từ server
**When** response interceptor xử lý
**Then** thực hiện 1 lần POST `/api/v1/auth/refresh` với cookie tự gửi + header `X-CSRF-Token` đọc từ `csrf_token` cookie (qua `document.cookie` parsing)
**And** nếu refresh thành công → ghi access token mới vào `db.session` → retry request gốc 1 lần
**And** nếu refresh thất bại → clear `db.session` → emit `auth.expired` → redirect `/login`

**Given** request fail vì network error (offline)
**When** response interceptor xử lý
**Then** đọc `db.session` access token → check `exp`
**And** nếu còn hạn → cho phép flow offline (request bị fail nhưng UI cho phép tiếp tục Dexie write — sẽ wire ở Epic 2)
**And** nếu hết hạn → emit `auth.expired` → redirect `/login`

**Given** token storage strict
**When** developer search code
**Then** không có chỗ nào gọi `localStorage.setItem` hoặc `sessionStorage.setItem` cho token (CI lint rule chặn — wire ở Story 1.10)

---

### Story 1.9: Frontend Session Lifecycle — Role Routing + Reload Boot + Offline 7-Day Behavior

As a logged-in user,
I want được điều hướng đúng surface theo vai trò sau login, ứng dụng nhớ phiên khi reload (kể cả offline), và phiên hết hạn đúng 7 ngày kể từ login online cuối,
So that tôi không phải đăng nhập lại sau mỗi reload và POS vẫn hoạt động khi offline trong giới hạn 7 ngày.

**Acceptance Criteria:**

**Given** user đã đăng nhập với role
**When** Story 1.8 redirect post-login
**Then** cashier vào `/pos` và admin vào `/admin`
**And** Component `RoleGate` wrap `/admin/*` routes — nếu user role != admin thì redirect `/pos` với toast "Bạn không có quyền truy cập trang quản trị" (UX-DR28)

**Given** user reload page (online hoặc offline)
**When** App boot
**Then** đọc `db.session.get('current')` → nếu tồn tại và `expiresAt > now()` → restore session (ghi vào Zustand `sessionStore`) và hiển thị surface theo role
**And** nếu `expiresAt <= now()` → clear `db.session` + redirect `/login` với message tiếng Việt "Phiên đã hết hạn, vui lòng đăng nhập lại"
**And** nếu `db.session` empty → redirect `/login`

**Given** user đang online và token gần hết hạn (vd còn <1 ngày)
**When** App boot hoặc visibility change
**Then** ứng dụng chủ động gọi `/auth/refresh` để rotate access token mới (best-effort, lỗi không block UI)

**Given** access token JWT có `exp = lastLoginAt + 7 ngày` chính xác
**When** developer kiểm tra `iat` và `exp` của token
**Then** `exp - iat == 7 * 24 * 60 * 60` seconds (NFR17 — đúng 7 ngày, không sớm hơn không muộn hơn)

**Given** user offline và token còn hạn
**When** user thao tác (mở `/pos`)
**Then** App boot và hiển thị surface POS bình thường
**And** ConnectivityIndicator hiển thị "Offline — vẫn bán được" (UX-DR31)

**Given** user offline và token đã hết hạn 7 ngày
**When** user thao tác
**Then** App detect `exp < now()` → clear session → redirect `/login`
**And** trang login hiển thị message "Phiên offline đã hết hạn. Vui lòng kết nối mạng và đăng nhập lại."

**Given** event `auth.expired` được emit từ interceptor
**When** App nhận event
**Then** clear `db.session` + Zustand `sessionStore` + redirect `/login` (UX-DR31)

**Given** unit test với fake timers
**When** test simulate token có exp ở các mốc (t<7d, t=7d, t>7d)
**Then** test verify đúng behavior boot, expire, redirect tại từng mốc

---

### Story 1.10: CI Pipeline + Pre-commit Hooks (Lint, Format, Type, Test, Coverage Gates)

As a developer,
I want CI workflow chạy đầy đủ checks (`prisma validate`, `tsc --noEmit`, `eslint`, `prettier --check`, `jest`, `vitest`, build cả 2 repo) và pre-commit hooks tự động format/lint file đã stage,
So that mọi PR đều pass quality gates trước khi merge và team không tốn thời gian fix lỗi format/lint thủ công.

**Acceptance Criteria:**

**Given** lefthook (hoặc husky) đã được install ở mỗi repo
**When** developer mở `lefthook.yml` hoặc `.husky/pre-commit`
**Then** pre-commit chạy `prisma format` (cho `pos-api/prisma/schema.prisma` nếu thay đổi) + `eslint --fix` + `prettier --write` cho file đã stage
**And** pre-commit fail nếu eslint còn warning chưa fix được tự động

**Given** ESLint config ở mỗi repo
**When** developer chạy `npm run lint`
**Then** rule custom chặn `localStorage.setItem` và `sessionStorage.setItem` cho keys chứa `token` (qua `no-restricted-syntax` hoặc custom rule)
**And** rule chặn `dangerouslySetInnerHTML` ở mọi nơi (theo AR17)

**Given** GitHub Actions workflow `.github/workflows/ci.yml` (hoặc tương đương)
**When** push hoặc PR vào `main`
**Then** workflow chạy:
- Job `pos-api`: `npm ci` → `npx prisma validate` → `npx prisma generate` → `npm run lint` → `tsc --noEmit` → `npm test -- --coverage` → `npm run build`
- Job `pos-web`: `npm ci` → `npm run lint` → `tsc --noEmit` → `npm test -- --coverage` → `npm run build`
**And** PostgreSQL service container được spin up cho Jest e2e tests

**Given** coverage gate
**When** Jest finish
**Then** coverage `pos-api/src/**/*.service.ts` và `pos-api/src/common/filters/**` ≥70% (lines + branches + functions)
**And** coverage `pos-web/src/features/**/*.ts` ≥80%
**And** CI fail nếu coverage thấp hơn threshold

**Given** developer mở PR
**When** CI status check hiển thị
**Then** PR yêu cầu cả 2 jobs pass trước khi merge
**And** merge bị block nếu có failed check

**Given** local dev workflow
**When** developer chạy `npm run check` (script bundling lint + tsc + test) ở mỗi repo
**Then** chạy thành công và in summary

---

### Epic 1 Summary

- **10 stories** covering FR1–FR7, FR41–FR43; NFR7–NFR12, NFR17; UX-DR1–UX-DR4, UX-DR28, UX-DR31, UX-DR34–UX-DR36
- **Sequence-clean dependency:** 1.1 → 1.2 → 1.3 → 1.4 (BE foundation + seed) → 1.5 → 1.6 (BE auth) → 1.7 → 1.8 → 1.9 (FE auth) → 1.10 (CI gate)
- **Deliverable Epic 1:** Developer setup demo trong 1 buổi; admin/cashier login → role routing → phiên 7d offline; CI bảo vệ quality

---

## Epic 2: POS Selling — Online, Offline & Sync

Xây toàn bộ trải nghiệm bán hàng tại quầy: lưới sản phẩm theo danh mục, tìm kiếm, modal tùy chọn (defining interaction), giỏ hàng + giảm giá + chọn phương thức thanh toán, hoàn tất đơn (lưu cục bộ trước → sync sau), receipt + in qua trình duyệt, hủy đơn, void đơn đã sync, và sync engine offline-first với idempotency đảm bảo. Sau Epic này, thu ngân hoàn tất đơn online hoặc offline trong dưới 60s với cùng luồng thao tác; đơn không bị mất khi reload; sync idempotent đảm bảo không trùng đơn dù retry nhiều lần; snapshot tại thời điểm bán bất biến.

### Story 2.1: Menu Read API + Frontend Menu Cache (Dexie + useLiveQuery)

As a cashier,
I want POS frontend pull menu (categories, products, option groups, options) từ server và cache vào IndexedDB,
So that POS hiển thị danh sách sản phẩm cả khi online và offline (sau lần pull đầu tiên).

**Acceptance Criteria:**

**Given** schema seed có categories + products + option_groups + options
**When** developer triển khai backend `GET /api/v1/menu` trong `src/menu/menu-sync.controller.ts`
**Then** endpoint yêu cầu Bearer token (cashier or admin), auto-scope qua Prisma `$extends`
**And** response 200 body `{ menuVersion: <int>, categories: [...], products: [...], optionGroups: [...] }` camelCase JSON
**And** product có `{ id, name, categoryId, priceVnd: integer, isActive, sortOrder, optionGroupIds: [] }`
**And** option group có `{ id, name, isRequired, minSelect, maxSelect, sortOrder, options: [{id, label, priceDeltaVnd: integer, isDefault, sortOrder}] }`

**Given** Dexie từ Story 1.8
**When** developer mở `pos-web/src/db/schemas/menu.ts`
**Then** Dexie có các bảng `categories`, `products`, `optionGroups`, `options`, `menuMeta` (single-row metadata với `menuVersion`, `lastPulledAt`) với indexes theo `categoryId`, `isActive`, `sortOrder`

**Given** sync logic
**When** developer mở `features/menu/sync.ts`
**Then** function `pullMenu()` gọi `GET /api/v1/menu` và ghi atomic qua `db.transaction('rw', [...tables])`
**And** `pullMenu` triggered: app boot (online), online event recovery, manual

**Given** hooks `useCategories()` và `useProducts({ categoryId?, search? })`
**When** component dùng hooks
**Then** hooks dùng Dexie `useLiveQuery` để render reactive; trả `undefined` khi đang load
**And** filter active products only (UX-DR23 không hiển thị product `isActive=false`)

**Given** đã pull menu thành công
**When** user reload app khi offline
**Then** menu hiển thị đầy đủ từ Dexie cache không cần network
**And** `useProducts()` trả kết quả trong <300ms (NFR5)

---

### Story 2.2: POS Product Grid + Category Navigation + Search

As a cashier,
I want xem lưới sản phẩm theo danh mục với khả năng tìm kiếm theo tên,
So that tôi có thể tìm món khách order nhanh chóng trong giờ cao điểm.

**Acceptance Criteria:**

**Given** menu cache đã có dữ liệu (Story 2.1)
**When** cashier mở `/pos`
**Then** thấy two-column landscape layout: cột trái product area (category navigation + product grid), cột phải cart panel (placeholder, populate ở Story 2.4)
**And** category navigation hiển thị tất cả categories với category đầu tiên active mặc định (UX-DR4)

**Given** category đang chọn
**When** product grid render
**Then** chỉ hiển thị products có `categoryId` matching và `isActive=true`, sorted theo `sortOrder` rồi `name`
**And** mỗi product render qua `<ProductTile />` (UX-DR5) với touch target ≥48px
**And** ProductTile hiển thị `name`, `priceVnd` qua `formatVnd()` ("35.000 ₫"), indicator nhỏ "Có tùy chọn" nếu product có `optionGroupIds.length > 0`
**And** ProductTile có `aria-label` gồm tên + giá; Enter/Space activate

**Given** search input ở header product area
**When** cashier gõ tên "Bạc"
**Then** search debounced 200ms, filter products theo `name` (case-insensitive, normalize accents Vietnamese)
**And** category navigation vẫn giữ trạng thái (KHÔNG mất context — UX-DR29)
**And** không có kết quả thì hiển thị `<EmptyState />` (UX-DR23) "Không tìm thấy sản phẩm phù hợp."

**Given** click/tap ProductTile
**When** product có option groups
**Then** mở `<OptionModal />` (Story 2.3 sẽ implement chi tiết)
**And** product không có option groups thêm thẳng vào cart (Story 2.4 sẽ wire)

**Given** cashier dùng keyboard
**When** Tab navigation
**Then** focus order: search → category nav → product grid (theo flow visual); focus indicator rõ (UX-DR34)

**Given** ProductTile interaction
**When** cashier chạm hoặc click
**Then** phản hồi <100ms (NFR2 visual press state)

---

### Story 2.3: Option Modal + Option Chips + Add to Cart

As a cashier,
I want chọn size, đá, đường, topping và ghi chú cho sản phẩm có tùy chọn qua modal nhanh và rõ ràng,
So that tôi không nhầm lẫn order phức tạp như "Bạc Xỉu size L, ít đá, 50% đường, thêm topping" trong giờ cao điểm — đây là defining interaction của Café POS MVP.

**Acceptance Criteria:**

**Given** product có option groups
**When** cashier mở OptionModal qua click ProductTile
**Then** modal hiển thị: header với tên sản phẩm + giá preview; danh sách option groups theo `sortOrder` (Size → Đá → Đường → Topping); group label rõ với indicator bắt buộc; OptionChip cho mỗi option (UX-DR6, UX-DR7)
**And** modal có focus trap (Radix Dialog), heading rõ, Esc đóng nếu chưa thay đổi đáng kể, focus return về ProductTile

**Given** option group `isRequired=true`
**When** cashier chưa chọn option nào trong group đó
**Then** group có visual indicator "Bắt buộc"
**And** nút "Thêm vào giỏ" disabled với helper text "Chọn {tên group} để tiếp tục"

**Given** option group có `minSelect/maxSelect` (vd Topping `minSelect=0, maxSelect=3`)
**When** cashier chọn vượt `maxSelect`
**Then** chip mới không được toggle on; có feedback ngắn dạng toast hoặc inline "Tối đa 3 topping"
**And** vượt `minSelect` không xảy ra (vì user chỉ chọn thủ công); nếu `minSelect>0` chưa đạt thì group highlight đỏ

**Given** OptionChip có `priceDeltaVnd ≠ 0`
**When** cashier toggle chip
**Then** chip selected state nổi bật (KHÔNG chỉ dùng màu — có border + check icon, UX-DR34); price delta hiển thị inline (vd "+5.000 ₫")
**And** preview giá item ở header modal cập nhật trong <100ms (NFR2): `unitPriceSnapshot + sum(priceDeltaSnapshot for selected)`

**Given** OptionChip role
**When** screen reader đọc
**Then** chip có role `radio` (cho `isRequired=true && maxSelect=1`) hoặc `checkbox` (cho `maxSelect>1`); group có `role="group"` với `aria-label` group name

**Given** input ghi chú trong modal
**When** cashier nhập "ít đường, không đá"
**Then** ghi chú được lưu vào draft cart item; max length 200 ký tự; placeholder "Ghi chú (tùy chọn)" (FR12)

**Given** cấu hình option hợp lệ và cashier bấm "Thêm vào giỏ"
**When** action triggered
**Then** modal đóng; cart cập nhật (Story 2.4); item xuất hiện với snapshot fields đầy đủ (`productNameSnapshot`, `unitPriceSnapshot`, options array với `optionId`, `labelSnapshot`, `priceDeltaSnapshot`, ghi chú, `lineTotal`)
**And** focus return về ProductTile gốc

**Given** modal đang load menu data (rare edge case)
**When** developer test
**Then** state `loading` hiển thị skeleton (UX-DR26) thay vì empty modal

---

### Story 2.4: Cart Panel + Line Items + Discount + Item Note

As a cashier,
I want xem giỏ hàng cố định bên phải với danh sách line items, có thể chỉnh số lượng/xóa item/sửa ghi chú và áp dụng giảm giá toàn đơn,
So that tôi có thể kiểm tra và điều chỉnh đơn hàng trước checkout mà không mất ngữ cảnh giao dịch.

**Acceptance Criteria:**

**Given** cart store (Zustand) trong `pos-web/src/shared/stores/`
**When** developer mở store
**Then** state `{ items: CartItem[], discount: { type: 'fixed'|'percentage', value: number } | null }`; actions `addItem`, `updateQuantity`, `removeItem`, `updateItemNote`, `setDiscount`, `clearCart`, `resetCart`
**And** `CartItem` schema: `{ tempId, productId, productNameSnapshot, unitPriceSnapshot, options: [{optionId, labelSnapshot, priceDeltaSnapshot}], note?, quantity, lineTotal }`

**Given** CartPanel (UX-DR8) bên phải POS
**When** cart `items.length === 0`
**Then** hiển thị `<EmptyState />` (UX-DR23): "Chọn món để bắt đầu đơn." với illustration nhẹ
**And** nút "Hoàn tất" disabled

**Given** cart có items
**When** CartPanel render
**Then** mỗi line item hiển thị: tên sản phẩm (bold) + danh sách options ngắn gọn (vd "Size L, ít đá, +trân châu") + ghi chú (italic nếu có) + quantity stepper (− / số / +) + lineTotal
**And** stepper `+/−` cập nhật quantity (min 1); nút xoá biểu tượng X nhỏ với confirm dialog nếu quantity > 1
**And** edit note inline (icon edit → input)

**Given** discount control (UX-DR14)
**When** cashier chọn loại "Giảm tiền cố định" hoặc "Giảm theo %"
**Then** input cho phép số nguyên (nếu fixed: integer VND; nếu percentage: 0-100 integer)
**And** validation: fixed không được vượt subtotal; percentage 0-100
**And** total cập nhật ngay tức thì (<100ms NFR2)

**Given** cart có discount
**When** subtotal recalculate
**Then** `subtotal = sum(lineTotal)`; `discountAmount = (type === 'fixed') ? value : floor(subtotal * value / 100)`; `total = subtotal - discountAmount`
**And** tổng tiền hiển thị qua `formatVnd()`, font size 28-36px bold (UX-DR2, UX-DR32); KHÔNG hiển thị decimal

**Given** menu đã được cập nhật ở background (sẽ wire ở Epic 3)
**When** menu sync xảy ra
**Then** cart KHÔNG bị reset; line items giữ snapshot (UX-DR8 state)
**And** product mới chỉ xuất hiện trong product grid, không thay đổi cart context

**Given** unit test cart store
**When** test các operations
**Then** cover add same product 2 lần (tăng quantity), remove last item (quantity → 0), apply/remove discount, percentage > 100 reject

---

### Story 2.5: Checkout Summary + Payment Method + Order Build (Snapshot + Code)

As a cashier,
I want chọn phương thức thanh toán (tiền mặt / chuyển khoản / thẻ) và build đơn hoàn chỉnh với mã đơn cục bộ + UUID v7 + snapshot fields,
So that bước cuối checkout chuẩn bị payload đủ cho lưu local + sync server.

**Acceptance Criteria:**

**Given** CartPanel có items + discount đã set
**When** cashier xem CheckoutSummary (UX-DR9) phía dưới CartPanel
**Then** hiển thị: subtotal, discount amount (nếu có), total (nổi bật), PaymentMethodSelector, nút "Hoàn tất đơn"
**And** total label "Tổng tiền" 28-36px bold

**Given** PaymentMethodSelector (UX-DR13)
**When** cashier chọn phương thức
**Then** Radio group với 3 option: "Tiền mặt" (default), "Chuyển khoản", "Thẻ"
**And** chọn 1 phương thức cho mỗi đơn (FR15); selected state rõ; touch target ≥44px

**Given** util `order-code.ts` trong `pos-web/src/shared/lib/`
**When** developer mở
**Then** function `generateOrderCode(deviceId, sequence): string` returns format `YYYYMMDD-POSXX-NNNN` (vd `20260509-POS01-0042`); date theo client local time
**And** sequence counter persisted trong Dexie (`db.orders` count theo `soldAt` của ngày hôm nay với `deviceId`) + auto-increment

**Given** util `uuid.ts`
**When** developer dùng
**Then** export `uuidv7()` từ `uuid@11+`; mọi `clientOrderId` PK dùng v7 (NOT v4)

**Given** builder `features/orders/builder.ts`
**When** developer call `buildLocalOrder(cart, paymentMethod, deviceId)`
**Then** trả `LocalOrder` schema:
```
{
  clientOrderId: <uuidv7>,
  orderCode: <YYYYMMDD-POSXX-NNNN>,
  deviceId,
  soldAt: <ISO 8601 UTC now>,
  menuVersionAtSale: <từ db.menuMeta.menuVersion>,
  items: [{ productId, productNameSnapshot, unitPriceSnapshot, options: [...], note?, quantity, lineTotal }],
  discountAmount: <integer VND>,
  total: <integer VND>,
  paymentMethod: 'cash'|'transfer'|'card'
}
```
**And** mọi field `*Snapshot` được copy từ menu cache hiện tại (immutable từ thời điểm này — AR24)
**And** `total === subtotal - discountAmount`

**Given** unit test `builder.ts`
**When** test build với cart có 2 items + discount fixed 10000 + percentage cases
**Then** assertions cover correct snapshot fields, order code format, ISO 8601 timezone Z (UTC), VND integer
**And** test snapshot immutability: gọi builder không mutate input cart

**Given** state Zustand `checkoutStore` (subset of UI state)
**When** cashier bấm "Hoàn tất đơn"
**Then** `isCheckingOut=true` (UI state); call sẽ wire ở Story 2.7 (finalize flow)

---

### Story 2.6: Backend — Orders Schema Migration + Idempotent Sync Endpoint

As a backend developer,
I want có schema cho `orders`, `order_items`, `sync_log`, `order_voids` và endpoint `POST /api/v1/orders` với idempotent dedup theo `(tenant_id, store_id, device_id, client_order_id)`,
So that POS có thể đẩy đơn lên server với bảo đảm idempotent (NFR13) và snapshot bất biến (NFR14).

**Acceptance Criteria:**

**Given** Prisma schema từ Story 1.2
**When** developer thêm models `Order`, `OrderItem`, `OrderItemOption`, `SyncLog`, `OrderVoid` và migration
**Then** schema:
- `Order`: `id`, `tenantId`, `storeId`, `clientOrderId UUID v7 unique scoped`, `orderCode`, `deviceId`, `cashierId`, `soldAt timestamptz`, `syncedAt timestamptz default now()`, `menuVersionAtSale Int`, `discountAmount Int`, `total Int`, `paymentMethod Enum`, `createdAt`
- `OrderItem`: `id`, `orderId`, `productId`, `productNameSnapshot`, `unitPriceSnapshot Int`, `quantity Int`, `note?`, `lineTotal Int`, `createdAt`
- `OrderItemOption`: `id`, `orderItemId`, `optionId`, `labelSnapshot`, `priceDeltaSnapshot Int`, `createdAt`
- `SyncLog`: `id`, `tenantId`, `storeId`, `deviceId`, `clientOrderId`, `orderId` (FK), `firstSyncedAt`, unique constraint `(tenantId, storeId, deviceId, clientOrderId)` — `uq_sync_log_tenant_store_device_client`
- `OrderVoid`: `id`, `orderId`, `voidedBy` (userId), `reason`, `voidedAt`
**And** migration apply không lỗi
**And** index `idx_orders_client_order_id`, `idx_orders_sold_at`, `idx_order_items_order_id`

**Given** schema không có UPDATE method cho `*Snapshot` fields
**When** developer kiểm tra `OrdersService` và `OrderItemsService`
**Then** không có function nào set `productNameSnapshot=`, `unitPriceSnapshot=`, `priceDeltaSnapshot=`, `labelSnapshot=`, `menuVersionAtSale=` sau insert
**And** ESLint rule hoặc test verify không có UPDATE statement chứa snapshot fields

**Given** controller `POST /api/v1/orders` với guard JWT + idempotency
**When** client gửi request với header `Idempotency-Key: <clientOrderId>` và body `LocalOrder` payload
**Then** server validate DTO (class-validator + class-transformer); validate `Idempotency-Key === body.clientOrderId`
**And** lookup `sync_log` theo `(tenantId, storeId, deviceId, clientOrderId)`
**And** nếu **đã tồn tại** → return 200 với `{ orderId: <existing>, idempotent_replay: true }` (NFR13)
**And** nếu **chưa tồn tại** → tạo `Order` + `OrderItem`s + `OrderItemOption`s + `SyncLog` row trong **single transaction** → return 201 với `{ orderId: <new>, idempotent_replay: false, syncedAt: <iso 8601> }`

**Given** payload có item với `lineTotal` sai tính (vd snapshot price * quantity + sum(deltas) ≠ lineTotal)
**When** server validate
**Then** response 400 RFC 7807 `type=...validation` với field error chỉ rõ item nào sai
**And** không có row nào được insert (transaction rollback)

**Given** payload có `menuVersionAtSale` cũ hơn server
**When** server xử lý
**Then** vẫn chấp nhận đơn (snapshot bảo vệ — server KHÔNG reject vì stale version); chỉ log warning để tracking

**Given** unit + e2e test
**When** test idempotent replay
**Then** gọi cùng request 2 lần → cả 2 trả 200/201 với cùng `orderId`; row `orders` count = 1
**And** test concurrent same `clientOrderId` (race) → unique constraint enforce → 1 thành 1 trả 201, request thứ 2 trả 200 idempotent_replay
**And** coverage `orders.service.ts` ≥80%

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất endpoint
**Then** OpenAPI/Swagger schema hiển thị request/response example cho create order, idempotent replay, validation error và stale menu warning
**And** e2e test hoặc script demo seed-driven chứng minh API contract chạy được mà không cần UI Story 2.7

---

### Story 2.7: Frontend — Finalize Order Flow (Dexie Write + Sync Kick)

As a cashier,
I want bấm "Hoàn tất đơn" và đơn được lưu local ngay lập tức (offline-safe), không chờ network, sau đó sync chạy nền,
So that tôi nhận receipt trong <500ms dù online hay offline (NFR3).

**Acceptance Criteria:**

**Given** Dexie schema `db.orders` từ Story 1.8 (placeholder)
**When** developer triển khai full schema trong `db/schemas/orders.ts`
**Then** Dexie bảng `orders` có fields `clientOrderId (PK)`, `orderCode`, `deviceId`, `cashierId`, `soldAt`, `menuVersionAtSale`, `items`, `discountAmount`, `total`, `paymentMethod`, `status: 'pendingSync'|'synced'|'syncFailed'`, `serverOrderId?`, `failReason?`, `lastTriedAt?`, `createdAt`, `updatedAt`
**And** indexes theo `status`, `soldAt`, `deviceId`

**Given** util `features/orders/api.ts` function `finalizeOrder(cart, paymentMethod)`
**When** cashier bấm "Hoàn tất đơn" từ Story 2.5
**Then** thực hiện sequence:
1. `localOrder = buildLocalOrder(cart, paymentMethod, deviceId)` (Story 2.5)
2. `await db.orders.add({ ...localOrder, status: 'pendingSync', createdAt: now() })`
3. `syncEngine.kick()` — KHÔNG await (chạy nền — Story 2.9)
4. `cartStore.resetCart()`
5. Return `localOrder` để hiển thị receipt
**And** total time từ click đến trả `localOrder` <500ms cả online và offline (NFR3)
**And** flow KHÔNG await `axios.post('/orders')` (sai pattern — không bao giờ block UI)

**Given** finalize flow xong
**When** show receipt (Story 2.8)
**Then** ReceiptModal mở ngay với data `localOrder` + sync status hiện tại (`pendingSync` ban đầu)

**Given** finalize gọi khi offline
**When** Dexie write thành công nhưng sync engine không thể POST
**Then** order vẫn ở `status='pendingSync'`; ConnectivityIndicator vẫn cho phép cashier tiếp tục đơn mới
**And** counter pending tăng +1 (UX-DR11 sẽ wire ở Story 2.10)

**Given** browser reload sau khi finalize offline
**When** user reload tab
**Then** `db.orders.where('status').equals('pendingSync').toArray()` trả về đơn vừa lưu (NFR15 persist)
**And** sync engine boot lên tự động drain queue khi online

**Given** unit test `finalizeOrder()`
**When** test với mock Dexie + mock syncEngine
**Then** verify Dexie write happens trước syncEngine.kick(); cart reset sau; total <500ms với fake timers

---

### Story 2.8: Receipt Modal + Print

As a cashier,
I want xem ReceiptModal sau khi hoàn tất đơn với mã đơn, snapshot items, total, sync status và in qua trình duyệt,
So that khách có hóa đơn ngay và thu ngân biết đơn đã được lưu (cả online lẫn offline).

**Acceptance Criteria:**

**Given** finalize flow trả `localOrder` (Story 2.7)
**When** ReceiptModal (UX-DR12) mở
**Then** hiển thị: header với "Hóa đơn"; mã đơn `orderCode` lớn; timestamp `soldAt` qua `dd/MM/yyyy HH:mm` date-fns locale `vi`; cashier name; danh sách items với snapshot (name + options + note + quantity + lineTotal); discount nếu có; total `formatVnd()` 28-36px bold; payment method label tiếng Việt; SyncStatusBadge hiển thị trạng thái hiện tại
**And** nút "In hóa đơn" và "Đóng" rõ ràng

**Given** sync status `pendingSync` lúc mở receipt
**When** sync engine push thành công (Story 2.9)
**Then** SyncStatusBadge tự động cập nhật sang `synced` qua Dexie `useLiveQuery(db.orders.where('clientOrderId').equals(...))` reactive
**And** receipt KHÔNG đóng tự động

**Given** receipt đã mở
**When** cashier bấm "In hóa đơn"
**Then** trigger `window.print()` qua hook `use-print.ts`
**And** CSS `@media print` (UX-DR27) ẩn `header`, `nav`, `cart-panel`, modal overlay; chỉ in nội dung receipt
**And** in print view: layout 80mm width-friendly (single column, monospace cho price column)

**Given** receipt offline
**When** cashier bấm "In hóa đơn"
**Then** print works (browser print không cần network)

**Given** receipt close
**When** cashier bấm "Đóng" hoặc Esc
**Then** modal đóng; focus return về POS; cart đã reset từ Story 2.7

**Given** screen reader
**When** receipt mở
**Then** heading hierarchy đúng: h2 "Hóa đơn"; h3 "Chi tiết"; danh sách items theo `<ul>`; total trong `<dl>`; print button focusable

---

### Story 2.9: Sync Engine — FSM + Triggers + Exponential Backoff

As a system,
I want có background sync engine tự động đẩy đơn `pendingSync` lên server với sequential POST + exponential backoff retry,
So that mọi đơn offline cuối cùng đều được sync (NFR16 không bỏ qua) và idempotent đảm bảo không trùng (NFR13).

**Acceptance Criteria:**

**Given** module `features/sync/engine.ts` + `features/sync/retry.ts` + `features/sync/triggers.ts`
**When** developer triển khai engine
**Then** engine có FSM states: `idle`, `running`, `backoff`
**And** entry points:
- `kick()` — manual trigger (idempotent, no-op nếu đang running)
- `drain()` — main loop đọc Dexie và push sequential

**Given** triggers wire trong app boot
**When** developer mở `features/sync/triggers.ts`
**Then** subscribe `window.addEventListener('online')` → `kick()`
**And** subscribe `document.addEventListener('visibilitychange')` → khi `visible` && online → `kick()`
**And** `setInterval(() => online && kick(), 60_000)` — 60s polling backup
**And** unsubscribe cleanup on unmount

**Given** drain loop chạy
**When** đọc queue
**Then** `db.orders.where('status').equals('pendingSync').sortBy('createdAt')` → push **sequential**, KHÔNG parallel (giữ thứ tự)
**And** mỗi đơn 1 POST với header `Idempotency-Key: <clientOrderId>`

**Given** response success (200/201)
**When** engine xử lý
**Then** `db.orders.update(clientOrderId, { status: 'synced', serverOrderId: response.orderId, syncedAt: response.syncedAt })`
**And** continue next order

**Given** response 4xx (validation)
**When** engine xử lý
**Then** `db.orders.update(clientOrderId, { status: 'syncFailed', failReason: response.detail, lastTriedAt: now() })`
**And** continue next order (KHÔNG retry)
**And** internal log Pino BE + console.warn FE — KHÔNG hiển thị raw error UI (FR25, NFR12)

**Given** response 5xx hoặc network error
**When** engine xử lý
**Then** đơn giữ `status='pendingSync'`, set `lastTriedAt: now()`
**And** engine backoff theo dãy `[1s, 2s, 4s, 8s, 16s]` rồi pause đến trigger tiếp theo
**And** retry count tracked trong memory (reset khi success hoặc 5 lần thì pause)

**Given** `idempotent_replay: true` từ server
**When** engine xử lý
**Then** treat như success: `status='synced'`

**Given** sync engine performance
**When** đo từ `kick()` đến `status='synced'` cho 1 đơn online happy path
**Then** total time <3s (NFR4)

**Given** unit test `engine.ts` với mock fetch
**When** test scenarios
**Then** cover: happy path single order, sequential 3 orders, network fail → backoff → success, 4xx → syncFailed, idempotent replay
**And** test fake timers verify exponential delays (1s, 2s, 4s, 8s, 16s)

---

### Story 2.10: Connectivity Indicator + Pending Counter

As a cashier,
I want thấy trạng thái kết nối (online/offline) và số đơn chờ đồng bộ trên header POS,
So that tôi biết hệ thống đang online hay offline và bao nhiêu đơn đang chờ sync — yên tâm rằng đơn không bị mất.

**Acceptance Criteria:**

**Given** hook `useConnectivity()` trong `pos-web/src/shared/hooks/`
**When** developer triển khai
**Then** hook trả `{ isOnline: boolean, lastCheckedAt: Date }` derived từ `navigator.onLine` + ping `/health` interval (mỗi 30s khi tab active)
**And** ping fail → `isOnline=false` (vd captive portal lừa `navigator.onLine=true`)
**And** subscribe `online`/`offline` events native

**Given** Zustand `connectivityStore` 
**When** `useConnectivity` push state changes
**Then** store update; components subscribe đọc từ store (single source of truth)

**Given** `<ConnectivityIndicator />` component (UX-DR10) trong layout header
**When** render theo states
**Then**:
- `isOnline=true` → badge xanh "Online" với icon dot
- `isOnline=false` → badge amber "Offline — vẫn bán được" (UX-DR31, KHÔNG đỏ vì app vẫn bán được)
- `sync engine state='running'` → badge "Đang đồng bộ" với spinner nhẹ
- recent sync success (<3s ago) → badge xanh nhạt "Đã đồng bộ" (auto-fade 3s)
**And** badge có cả icon + text (KHÔNG chỉ màu — UX-DR34 a11y)

**Given** `<PendingCounter />` component (UX-DR11)
**When** render
**Then** dùng `useLiveQuery(() => db.orders.where('status').equals('pendingSync').count())` để count realtime
**And** state:
- `count === 0` → KHÔNG render hoặc render gọn "0 đơn chờ" muted
- `count > 0` → badge amber với "{count} đơn chờ đồng bộ" (UX-DR31)
- nếu có đơn `syncFailed` → render "{n} đơn lỗi" với màu danger
**And** `aria-live="polite"` để screen reader cập nhật KHÔNG spam

**Given** click pending counter
**When** counter có đơn `pendingSync` hoặc `syncFailed`
**Then** mở SyncRetryPanel (Story 2.11) với danh sách + action retry

**Given** receipt modal đang mở với `pendingSync`
**When** sync engine update `status='synced'`
**Then** SyncStatusBadge trong receipt update reactive (Dexie useLiveQuery)
**And** PendingCounter count giảm ngay

**Given** layout responsive
**When** viewport thu hẹp <1280px
**Then** ConnectivityIndicator + PendingCounter vẫn visible (compact mode badge)

---

### Story 2.11: Manual Sync Trigger + Sync Retry Panel + Error Mapping

As a cashier,
I want bấm nút "Đồng bộ ngay" để force sync và xem chi tiết đơn nào đang pending/failed với option retry,
So that tôi có thể chủ động giải quyết khi thấy có đơn chờ lâu hoặc đơn lỗi.

**Acceptance Criteria:**

**Given** `<SyncRetryPanel />` component (UX-DR16) mở từ click PendingCounter
**When** render
**Then** drawer hoặc dialog hiển thị danh sách đơn `pendingSync` + `syncFailed`, sort theo `soldAt` desc
**And** mỗi row: orderCode + total + soldAt format `dd/MM/yyyy HH:mm` + StatusBadge (pendingSync/failed) + nút "Thử đồng bộ lại"
**And** header có nút "Đồng bộ tất cả" → `syncEngine.kick()` (FR23)

**Given** click "Thử đồng bộ lại" cho 1 đơn
**When** engine xử lý
**Then** `db.orders.update(clientOrderId, { status: 'pendingSync', failReason: null })` reset
**And** kick sync engine

**Given** error mapper `shared/lib/error-mapper.ts`
**When** developer mở
**Then** function `mapProblemToAction(problemDetail)` trả `{ type: 'redirect-login' | 'show-toast' | 'retry-after-action' | 'form-errors', payload }`
**And** mapping theo `problemDetail.type` URI:
- `.../session-revoked` → `redirect-login`
- `.../validation` → `form-errors` với fields
- `.../menu-version-stale` → `retry-after-action` với menu re-pull (sẽ wire chi tiết Epic 3)
- `.../forbidden` → `show-toast` "Không có quyền thực hiện"
- `.../internal` → `show-toast` "Đã có lỗi, vui lòng thử lại"
- default → `show-toast` generic

**Given** sync engine xảy ra lỗi 4xx validation
**When** internal error log
**Then** log Pino BE + `console.warn('[sync] failed', { clientOrderId, problemDetail.type, traceId })` FE
**And** UI hiển thị status "Chưa đồng bộ được" (UX-DR31), KHÔNG hiển thị raw `problemDetail.detail` (FR25, NFR12)
**And** test scan UI text → KHÔNG có chuỗi "Idempotency", "tenant_id", "violations", "stack" lộ ra cashier

**Given** SyncRetryPanel có 5+ đơn failed
**When** cashier bấm "Đồng bộ tất cả"
**Then** mỗi đơn được reset về `pendingSync` và engine drain sequential

**Given** integration test (Vitest + MSW)
**When** simulate 1 đơn failed validation, 2 đơn pending
**Then** UI render đúng status + retry click triggers re-attempt; mock interceptor verify Idempotency-Key header gửi đúng

---

### Story 2.12: Cancel Pending Order (Cart-level Void Before Sync)

As a cashier,
I want hủy đơn đang trong giỏ kèm lý do hủy trước khi finalize,
So that tôi có thể hủy đơn khách đổi ý mà không phải đẩy xuống server vô ích (FR17).

**Acceptance Criteria:**

**Given** CartPanel có items
**When** cashier bấm nút "Hủy đơn"
**Then** mở `<VoidOrderDialog />` (UX-DR15) với input "Lý do hủy" required (vd "Khách đổi ý", "Hết món")
**And** dialog có nút "Hủy đơn này" (label cụ thể, KHÔNG "OK" — UX-DR15) primary danger và "Quay lại" secondary

**Given** lý do empty
**When** cashier bấm "Hủy đơn này"
**Then** validation inline "Vui lòng nhập lý do hủy"; submit blocked

**Given** lý do hợp lệ
**When** cashier confirm
**Then** `cartStore.resetCart()` clear items + discount + payment method
**And** dialog đóng; focus return POS; toast nhẹ "Đã hủy đơn"
**And** không có row nào ghi vào Dexie (chưa finalize) — không có server call

**Given** đơn đã có `clientOrderId` trong Dexie với `status='pendingSync'` (đã finalize nhưng chưa sync)
**When** cashier mở SyncRetryPanel và muốn hủy đơn pending này
**Then** không cho phép cart-level cancel cho đơn đã finalize — cashier phải dùng Story 2.13 void flow (server-side void)
**And** UX-DR15 phân biệt rõ: "Hủy đơn này" (cart) vs "Void đơn đã đồng bộ" (server)

**Given** dialog focus management
**When** mở dialog
**Then** focus tự động vào input "Lý do hủy"; Tab loop trong dialog; Esc đóng dialog (focus return cart panel)

---

### Story 2.13: Backend Void Endpoint + Frontend Void Synced Order Flow

As a cashier or admin,
I want void một đơn đã sync bằng cách tạo bản ghi void riêng kèm lý do (KHÔNG sửa đơn gốc),
So that lịch sử tài chính giữ append-only và báo cáo phản ánh đúng số đơn hợp lệ (FR26, AR25).

**Acceptance Criteria:**

**Given** schema `OrderVoid` từ Story 2.6
**When** developer triển khai controller `POST /api/v1/orders/:id/void` trong `src/orders/orders.controller.ts`
**Then** endpoint yêu cầu Bearer token, role `cashier` hoặc `admin`
**And** body `{ reason: string (required, min 3 chars max 500) }`
**And** validate `:id` UUID v7 + thuộc tenant scope
**And** insert `OrderVoid { id, orderId, voidedBy: currentUser.id, reason, voidedAt: now() }` — KHÔNG modify `Order` row
**And** response 201 với body `{ voidId, voidedAt }`

**Given** đơn đã được void trước đó
**When** POST `/orders/:id/void` lần 2
**Then** response 409 RFC 7807 `type=...already-voided` với title "Đơn đã được hủy"

**Given** order id không tồn tại hoặc thuộc tenant khác
**When** POST void
**Then** response 404 RFC 7807 `type=...not-found`

**Given** Frontend void flow từ ReceiptModal hoặc SyncRetryPanel cho đơn `synced`
**When** cashier bấm "Void đơn này"
**Then** mở `<VoidOrderDialog />` với input lý do; submit gọi `POST /orders/:serverOrderId/void`
**And** success → update Dexie `db.orders.update(clientOrderId, { voidedAt: response.voidedAt, voidReason })`; show toast "Đã void đơn {orderCode}"
**And** đơn voided hiển thị badge "Đã void" trong list/receipt

**Given** Receipt của đơn voided
**When** cashier xem
**Then** receipt hiển thị watermark/stamp "ĐÃ HỦY" + reason; total vẫn hiển thị (lịch sử) nhưng KHÔNG đếm trong báo cáo (sẽ wire Epic 4)

**Given** offline scenario: cashier muốn void đơn `synced` khi offline
**When** click void
**Then** queue pending void action (append to `db.pendingVoids` schema mới hoặc retry logic) — Architecture không yêu cầu MVP queue; chấp nhận hiển thị "Cần kết nối để void đơn đã đồng bộ"
**And** UX-DR16 microcopy "Cần kết nối để void"

**Given** unit + e2e test
**When** test scenarios
**Then** cover: void happy path + double-void 409 + non-existent 404 + cross-tenant 404 + auth required 401 + non-cashier/admin 403
**And** verify `Order` row KHÔNG bị modify (assert all fields unchanged after void)

---

### Epic 2 Summary

- **13 stories** covering FR8–FR26; NFR1–NFR5, NFR13–NFR16; UX-DR5–UX-DR16, UX-DR23–UX-DR27, UX-DR29, UX-DR32
- **Sequence-clean dependency:**
  - 2.1 (menu read foundation) → 2.2 (product grid) → 2.3 (option modal) → 2.4 (cart) → 2.5 (checkout build) — POS UI flow
  - 2.6 (BE schema + endpoint) → 2.7 (FE finalize) → 2.8 (receipt) — order lifecycle
  - 2.9 (sync engine) → 2.10 (indicators) → 2.11 (manual sync + error mapping) — sync subsystem
  - 2.12 (cancel pre-sync) → 2.13 (void post-sync) — cancellation flows
- **Deliverable Epic 2:** Thu ngân hoàn tất đơn online/offline trong <60s; sync idempotent đảm bảo không mất/trùng đơn; receipt in được; pending counter realtime; void đơn đã sync thành bản ghi riêng

---

## Epic 3: Menu Management & Auto-Sync

Cho admin/chủ quán quản lý menu hoàn chỉnh không cần kỹ thuật (CRUD danh mục, sản phẩm, nhóm tùy chọn, tùy chọn với delta giá + quy tắc min/max; bật/tắt trạng thái bán; sắp xếp thứ tự hiển thị) và đảm bảo POS tự nhận menu mới qua versioned sync **mà không phá snapshot đơn cũ**. Sau Epic này, admin tạo "Trà Đào Cam Sả" và tắt "Sinh Tố Bơ" hết nguyên liệu; lần POS online tiếp theo tự kéo menu mới; đơn cũ giữ nguyên giá tại thời điểm bán; admin không cần dùng thuật ngữ kỹ thuật như `menu_version`.

### Story 3.1: Admin Layout + Sectioned Navigation + AdminDataTable + StatusBadge Foundation

As an admin developer,
I want có khung Admin chung với sectioned navigation (Menu / Reports), `AdminDataTable` component dùng chung và `StatusBadge` component chuẩn,
So that các stories sau (Categories, Products, Option Groups, Reports) có UI nhất quán và không phải re-implement table/badge nhiều lần.

**Acceptance Criteria:**

**Given** routes `/admin/*` đã được lazy-load từ Story 1.7
**When** developer mở `pos-web/src/routes/admin/_layout.tsx`
**Then** layout có sectioned nav (UX-DR30): "Quản lý Menu" với sub-section (Danh mục, Sản phẩm, Nhóm tùy chọn) và "Báo cáo"
**And** active section highlight rõ; nav links dùng React Router `<NavLink>`
**And** layout có header với role badge (Admin), tên user, nút "Đăng xuất"
**And** RoleGate từ Story 1.9 chặn cashier truy cập `/admin/*`

**Given** `AdminDataTable` component (UX-DR17) trong `shared/components/admin/`
**When** developer mở component
**Then** generic `<AdminDataTable<T> columns={[]} data={[]} rowActions={[]} loading={} emptyState={} />`
**And** props support: `columns: { key, label, render?, sortable? }`, `data: T[]`, `rowActions: { label, onClick, variant }`, `onSortChange?`, `loading?: boolean`, `emptyState?: ReactNode`
**And** dùng TanStack Table v8 + shadcn Table primitive
**And** loading state render skeleton rows (5 rows); empty state render `<EmptyState />` truyền vào
**And** row actions hiển thị inline cuối row (touch target ≥44px)

**Given** `StatusBadge` component (UX-DR21) trong `shared/components/ui/`
**When** developer mở component
**Then** props `<StatusBadge variant="success|warning|danger|neutral|accent" label icon? />`
**And** mỗi variant dùng tokens design (Story 1.7) đúng semantic; LUÔN có text label (KHÔNG chỉ màu — UX-DR34 a11y)
**And** ví dụ usage: `<StatusBadge variant="success" label="Đang bán" />`, `<StatusBadge variant="neutral" label="Tạm tắt" />`

**Given** developer test `/admin` route
**When** admin truy cập
**Then** layout shell render đúng; click sub-nav điều hướng; active state visible
**And** ở viewport <1024px responsive — nav collapse vào hamburger menu (theo UX-DR36 admin có thể responsive cơ bản)

---

### Story 3.2: BE — Categories CRUD + `menu-version.service.ts` Bumping Pattern

As a backend developer,
I want endpoints CRUD categories với centralized `menu-version.service.ts` tự động bump `menu_version` khi mutation,
So that mọi thay đổi menu được track version để Story 3.8 (versioned sync) và Story 3.9 (FE auto-pull) hoạt động đúng.

**Acceptance Criteria:**

**Given** schema từ Story 1.2 đã có model `Category`
**When** developer triển khai trong `src/menu/`
**Then** `categories.controller.ts` có routes:
- `GET /api/v1/categories` — list, role admin only
- `POST /api/v1/categories` — create, body `{ name, sortOrder }`, returns 201
- `PATCH /api/v1/categories/:id` — partial update
- `DELETE /api/v1/categories/:id` — delete (hard delete; KHÔNG soft delete cho MVP per AR25)
**And** mọi endpoint multi-tenant scoped tự động qua Prisma `$extends`
**And** DTO validation: `name` 1-100 chars, `sortOrder` integer ≥0

**Given** centralized service `src/menu/services/menu-version.service.ts`
**When** developer mở
**Then** function `bumpMenuVersion(tenantId, storeId)` execute atomic:
- Increment `MenuVersion.version` cho `(tenantId, storeId)` (upsert nếu chưa có)
- Set `bumpedAt = now()`
- Return new version
**And** mọi mutation endpoint (POST/PATCH/DELETE) call `bumpMenuVersion()` trong **same transaction** với mutation chính
**And** unit test verify: 3 mutations consecutive → version tăng 1, 2, 3

**Given** category có sản phẩm thuộc nó
**When** admin DELETE category
**Then** server check FK; nếu có products thuộc category này → response 409 RFC 7807 `type=...category-has-products` với title "Danh mục đang chứa sản phẩm" + detail count
**And** admin phải xóa/move products trước

**Given** business rule danh mục
**When** test edge cases
**Then** name unique trong tenant (uq constraint `uq_categories_tenant_name`); sortOrder duplicate cho phép (UI tự xử lý hiển thị stable)
**And** controller test cover: list happy + create + update + delete + delete-with-children-409 + cross-tenant isolation

**Given** request từ user role `cashier`
**When** gọi POST/PATCH/DELETE categories
**Then** response 403 RFC 7807 `type=...forbidden`
**And** GET /api/v1/categories vẫn cho phép cashier (cần read cho POS)

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất Categories CRUD
**Then** OpenAPI/Swagger schema có request/response examples cho list/create/update/delete/delete-with-children-409
**And** e2e test hoặc script demo seed-driven chứng minh mutation bump `menu_version` đúng sau từng API call

---

### Story 3.3: FE — Categories Admin Page (CRUD + Sort Order + Active Toggle)

As an admin,
I want trang `/admin/menu/categories` để CRUD danh mục với sắp xếp thứ tự hiển thị,
So that tôi có thể tạo "Trà mới", đổi tên "Cà phê" thành "Cà phê truyền thống", hoặc xóa danh mục cũ.

**Acceptance Criteria:**

**Given** route `/admin/menu/categories`
**When** admin mở trang
**Then** dùng `<AdminDataTable />` từ Story 3.1 với columns: `name`, `sortOrder`, `productCount` (compute từ menu API), action "Sửa", "Xóa"
**And** header trang có title "Danh mục sản phẩm" và nút "+ Tạo danh mục mới" primary CTA

**Given** click "+ Tạo danh mục mới"
**When** dialog mở
**Then** `<CategoryForm />` (UX-DR19) qua shadcn Dialog với fields: `name` (required, 1-100 chars), `sortOrder` (integer ≥0, default = max+10)
**And** RHF + zodResolver validate inline; submit gọi `POST /api/v1/categories`
**And** success → đóng dialog + toast "Đã tạo danh mục" + refetch list (TanStack Query invalidate)

**Given** click "Sửa" row
**When** dialog mở với data prefill
**Then** form cho phép edit name + sortOrder; submit gọi `PATCH /api/v1/categories/:id`
**And** success → toast "Đã cập nhật danh mục"

**Given** click "Xóa" row
**When** confirm dialog mở
**Then** label "Xóa danh mục này?" với detail "Không thể hoàn tác." (UX-DR15 destructive label cụ thể)
**And** submit gọi `DELETE /api/v1/categories/:id`
**And** success → toast "Đã xóa danh mục"
**And** lỗi 409 (có products) → toast "Danh mục đang chứa N sản phẩm. Xóa hoặc chuyển sản phẩm sang danh mục khác trước."

**Given** loading state
**When** TanStack Query fetching
**Then** AdminDataTable render skeleton rows; user không tương tác được nút action

**Given** empty state (chưa có category)
**When** list trả empty
**Then** render `<EmptyState />` "Chưa có danh mục nào. Tạo danh mục đầu tiên để bắt đầu."

**Given** server error 5xx
**When** request fail
**Then** errorMapper hiển thị toast "Đã có lỗi, vui lòng thử lại" + log traceId (KHÔNG raw error — NFR12)

---

### Story 3.4: BE — Option Groups + Options CRUD Endpoints

As a backend developer,
I want endpoints CRUD nhóm tùy chọn (`option_groups`) và tùy chọn (`options`) với validation `min_select ≤ max_select`, delta giá integer, và tự động bump `menu_version`,
So that admin có thể quản lý "Size", "Đá", "Đường", "Topping" với quy tắc bắt buộc rõ ràng.

**Acceptance Criteria:**

**Given** schema `OptionGroup` và `Option` đã có từ Story 1.2 foundation
**When** developer review schema
**Then** xác nhận constraints `min_select ≤ max_select`, `price_delta_vnd` integer (cho phép âm cho discount), index `idx_options_option_group_id` đều có
**And** không cần migration mới — chỉ thêm CRUD logic

**Given** controller `src/menu/controllers/option-groups.controller.ts`
**When** developer triển khai
**Then** routes:
- `GET /api/v1/option-groups` — list with nested options
- `POST /api/v1/option-groups` — create với body `{ name, isRequired, minSelect, maxSelect, sortOrder, options: [{ label, priceDeltaVnd, isDefault?, sortOrder }] }`
- `PATCH /api/v1/option-groups/:id` — update group + replace options array (atomic)
- `DELETE /api/v1/option-groups/:id` — delete; check FK với products
**And** mọi mutation call `bumpMenuVersion()` trong same transaction
**And** role admin only (GET cho cả cashier để POS read)

**Given** validation rules
**When** test edge cases
**Then**:
- `name` 1-100 chars required
- `minSelect ≤ maxSelect` (server validate, return 400 nếu sai)
- `maxSelect ≥ 1`; nếu `isRequired=true` thì `minSelect ≥ 1`
- `priceDeltaVnd` integer (>= 0 hoặc < 0 đều cho phép — discount như "-2000" cho size S nếu có)
- Mỗi option group ít nhất 1 option khi create
- Default option chỉ tối đa 1 nếu single-select (`maxSelect=1`)

**Given** option group đang được products dùng
**When** DELETE
**Then** check FK `product_option_groups`; nếu đang gán cho products → 409 `type=...option-group-in-use` với detail count
**And** admin phải un-assign khỏi products trước

**Given** đơn cũ trong `orders` đã sale với option group này
**When** admin update option group (đổi label, price delta, etc.) hoặc DELETE
**Then** đơn cũ giữ nguyên `OrderItemOption.labelSnapshot` và `priceDeltaSnapshot` (NFR14 enforced bởi schema design — service KHÔNG có UPDATE cho `*Snapshot`)

**Given** unit + integration test
**When** test scenarios
**Then** cover CRUD happy + min>max validation + delete-in-use 409 + snapshot immutability (verify đơn cũ unchanged after option group update)

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất Option Groups + Options CRUD
**Then** OpenAPI/Swagger schema có request/response examples cho create/update group with nested options, min/max validation error và delete-in-use 409
**And** e2e test hoặc script demo seed-driven chứng minh API contract tạo được nhóm Size/Đá/Đường/Topping và bump `menu_version` đúng

---

### Story 3.5: FE — Option Groups Admin Page (CRUD + Inline Options + Min/Max)

As an admin,
I want trang `/admin/menu/option-groups` để CRUD nhóm tùy chọn với options con quản lý inline,
So that tôi có thể tạo nhóm "Size" với S/M/L delta giá, bật quy tắc bắt buộc, sắp xếp thứ tự hiển thị.

**Acceptance Criteria:**

**Given** route `/admin/menu/option-groups`
**When** admin mở
**Then** AdminDataTable với columns: `name`, `isRequired` (StatusBadge "Bắt buộc"/"Không bắt buộc"), `min/maxSelect` ("0-3"), `optionsCount`, action "Sửa", "Xóa"
**And** header có "+ Tạo nhóm tùy chọn"

**Given** OptionGroupForm dialog (UX-DR20)
**When** admin tạo/sửa
**Then** form fields:
- `name` (required)
- `isRequired` switch với label "Bắt buộc chọn"/"Không bắt buộc"
- `minSelect` integer input (≥0)
- `maxSelect` integer input (≥1)
- `sortOrder` integer input
- Sub-section "Tùy chọn" với danh sách options inline (add/remove) — mỗi option có `label`, `priceDeltaVnd` (input dạng VND integer), `isDefault` checkbox, `sortOrder`
**And** validation Zod: `minSelect ≤ maxSelect`, `maxSelect ≥ 1`, nếu `isRequired=true` then `minSelect ≥ 1`, ít nhất 1 option, max 1 default cho single-select
**And** validation inline ngay dưới field sai

**Given** add/remove options inline
**When** admin click "+ Thêm tùy chọn" hoặc icon X
**Then** UI cập nhật form state immediately; KHÔNG gọi API ngay — chỉ submit khi save form
**And** option price delta hiển thị qua `formatVnd()` preview

**Given** submit form
**When** valid
**Then** call `POST` hoặc `PATCH /api/v1/option-groups/:id` với full payload (group + options array)
**And** success → toast "Đã lưu nhóm tùy chọn" + refetch + close dialog

**Given** xóa option group
**When** admin confirm
**Then** call DELETE; lỗi 409 (đang dùng) → toast với count + helper "Bỏ gán nhóm tùy chọn khỏi sản phẩm trước khi xóa"

**Given** edit existing option group đã có đơn cũ dùng
**When** admin sửa label/delta của option
**Then** thay đổi áp dụng cho menu mới; đơn cũ vẫn giữ snapshot (verified by Story 3.4 BE behavior)
**And** UI có thông báo nhỏ trong form: "Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán."

---

### Story 3.6: BE — Products CRUD + Option Groups Assignment

As a backend developer,
I want endpoints CRUD products với assignment many-to-many với option groups, isActive toggle, và sortOrder,
So that admin tạo/sửa sản phẩm với đầy đủ thuộc tính cho POS hiển thị đúng.

**Acceptance Criteria:**

**Given** schema `Product` và join `ProductOptionGroup` đã có từ Story 1.2 foundation
**When** developer review schema
**Then** xác nhận indexes `idx_products_category_id`, `idx_products_is_active`, PK composite `(productId, optionGroupId)` đều có
**And** không cần migration mới — chỉ thêm CRUD logic

**Given** controller `src/menu/controllers/products.controller.ts`
**When** triển khai
**Then** routes:
- `GET /api/v1/products?categoryId=&search=&isActive=` — list with filters
- `POST /api/v1/products` — body `{ name, categoryId, priceVnd, isActive, sortOrder, optionGroupIds: [] }`
- `PATCH /api/v1/products/:id` — partial update; nếu `optionGroupIds` provided thì replace assignment atomic
- `PATCH /api/v1/products/:id/toggle-active` — convenience endpoint cho switch nhanh (or integrate vào PATCH)
- `DELETE /api/v1/products/:id` — delete; check FK với `order_items` (đơn cũ)
**And** mọi mutation bump menu_version

**Given** validation
**When** test
**Then**:
- `name` 1-200 chars
- `priceVnd` integer ≥0
- `categoryId` exist trong same tenant
- `optionGroupIds` exist trong same tenant
- delete product có `order_items` reference → 409 hoặc cho phép (chấp nhận cho MVP với note về FK constraint design — orders preserve snapshot regardless of product existence)

**Given** đơn cũ snapshot có `productId` đã DELETE
**When** report aggregate (Epic 4)
**Then** report dùng `productNameSnapshot` không phụ thuộc `Product.name` hiện tại (NFR14)

**Given** soft-delete vs hard-delete decision
**When** developer chọn approach
**Then** dùng hard delete (theo AR25 không soft delete) NHƯNG cho phép admin "Tạm tắt" qua `isActive=false` thay vì xóa
**And** admin UI khuyến khích "Tạm tắt" qua microcopy "Tắt thay vì xóa nếu sẽ bán lại"

**Given** test coverage
**When** CI chạy
**Then** test cover: CRUD happy + assign/unassign option groups + toggle active + cross-tenant isolation + filter by category/search/active

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất Products CRUD
**Then** OpenAPI/Swagger schema có request/response examples cho create product, assign option groups, filter/search, toggle active và delete blocked by historical orders
**And** e2e test hoặc script demo seed-driven chứng minh API contract tạo được sản phẩm có option groups và bump `menu_version` đúng

---

### Story 3.7: FE — Products Admin Page (CRUD + Category + OptionGroups + Active + Sort)

As an admin,
I want trang `/admin/menu/products` để quản lý đầy đủ sản phẩm: tạo "Trà Đào Cam Sả" thuộc danh mục Trà với option groups Size + Topping, tắt "Sinh Tố Bơ" hết nguyên liệu, sắp xếp thứ tự hiển thị,
So that POS hiển thị đúng menu hiện tại.

**Acceptance Criteria:**

**Given** route `/admin/menu/products`
**When** admin mở
**Then** AdminDataTable với columns: `name`, `category.name`, `priceVnd` (formatVnd), `optionGroupsCount`, `isActive` (Switch inline), `sortOrder`, action "Sửa", "Xóa"
**And** header có filter: dropdown category, search input, toggle "Chỉ hiển thị đang bán"
**And** "+ Tạo sản phẩm mới" CTA

**Given** ProductForm dialog (UX-DR18)
**When** admin tạo/sửa
**Then** fields:
- `name` (required, 1-200)
- `categoryId` dropdown (required, options từ categories list)
- `priceVnd` input integer VND (required ≥0)
- `optionGroupIds` multi-select (Combobox shadcn) — chọn 0+ option groups
- `isActive` switch label "Đang bán"/"Tạm tắt"
- `sortOrder` integer (default = max+10)
**And** RHF + Zod validate inline
**And** submit gọi POST hoặc PATCH; success → toast + refetch + close

**Given** inline `isActive` switch trong table row (FR32)
**When** admin toggle
**Then** call `PATCH /api/v1/products/:id` với `isActive` flip; optimistic update UI; rollback nếu fail
**And** StatusBadge cập nhật label

**Given** admin click "Sửa" row
**When** dialog mở
**Then** form prefill data; option groups multi-select hiển thị các nhóm đã gán
**And** thay đổi option groups khi save replace assignment (server atomic)

**Given** admin xóa product
**When** confirm dialog
**Then** label "Xóa sản phẩm này?" với warning "Lịch sử đơn cũ vẫn giữ nguyên thông tin sản phẩm." (giải thích NFR14 đơn giản)
**And** lỗi 409 → toast "Sản phẩm có trong đơn cũ. Bạn có thể tắt sản phẩm thay vì xóa."

**Given** sortOrder management
**When** admin muốn reorder products
**Then** input sortOrder integer hoặc nút "↑/↓" (drag-and-drop optional cho MVP); mặc định sort theo `sortOrder` rồi `name`

**Given** filter category
**When** admin chọn category dropdown
**Then** TanStack Query refetch với param `categoryId`; URL search param đồng bộ (vd `?category=<id>`) để bookmark/share được

**Given** search input
**When** admin gõ tên
**Then** debounced 300ms; refetch với param `search`

**Given** empty state filtered
**When** không có kết quả
**Then** render EmptyState "Không có sản phẩm trong danh mục này."

---

### Story 3.8: BE — Versioned Menu Sync Endpoint `GET /api/v1/menu?since_version=N`

As a backend developer,
I want endpoint `GET /api/v1/menu?since_version=N` trả delta hoặc full snapshot tùy điều kiện,
So that POS có thể pull menu mới hiệu quả khi version server cao hơn local (FR34, FR35).

**Acceptance Criteria:**

**Given** controller `src/menu/menu-sync.controller.ts` (đã có basic GET /menu từ Story 2.1)
**When** developer extend với query param `since_version`
**Then** endpoint:
- Bearer token cashier or admin
- Query `since_version: number?` (optional)
- Read current `MenuVersion.version` cho `(tenantId, storeId)`

**Given** client gửi `since_version === currentVersion`
**When** server xử lý
**Then** response 200 với body `{ menuVersion: <currentVersion>, hasChanges: false, snapshot: null }`
**And** payload tối thiểu (saving bandwidth)

**Given** client gửi `since_version < currentVersion` (hoặc không gửi)
**When** server xử lý
**Then** response 200 với body `{ menuVersion: <currentVersion>, hasChanges: true, snapshot: { categories, products, optionGroups } }`
**And** snapshot là **full snapshot hiện tại** (MVP impl — incremental delta tracking là optimization sau MVP, đã ghi nhận trong Architecture "khoảng trống nice-to-have")
**And** chỉ trả các entity `isActive=true` cho cashier role (admin có thể request `?include_inactive=true` cho preview)

**Given** client gửi `since_version > currentVersion` (vd client cache stale do server reset)
**When** server xử lý
**Then** treat như `since_version < currentVersion` → trả full snapshot + currentVersion (recovery behavior)

**Given** server đã bump version qua admin mutations từ Stories 3.2/3.4/3.6
**When** POS query với version cũ
**Then** nhận snapshot đầy đủ với menu mới (categories/products/option groups đã update + assignments)

**Given** unit + e2e test
**When** test scenarios
**Then**:
- Same version → `hasChanges: false`
- Older version → full snapshot
- Stale (newer than server) → full snapshot recovery
- Multi-tenant isolation: tenant A không thấy menu của tenant B
- Cashier không thấy `isActive=false` products (stale)
- Performance: response <500ms cho menu 50 products + 10 option groups

**Given** schema không yêu cầu changelog table cho MVP
**When** developer code
**Then** không thêm bảng `menu_changelog`; ghi nhận trong README "Future: incremental delta via changelog table"

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất versioned menu sync endpoint
**Then** OpenAPI/Swagger schema có request/response examples cho same version, older version full snapshot và stale version recovery
**And** e2e test hoặc script demo seed-driven chứng minh API contract phản ánh `menu_version` sau mutations từ Categories/Option Groups/Products

---

### Story 3.9: FE — Menu Auto-Sync Engine + MenuUpdatedToast (Snapshot Preserved)

As a cashier,
I want POS tự động kéo menu mới từ server khi admin cập nhật, và đơn đang xử lý/đơn cũ KHÔNG bị thay đổi,
So that tôi luôn có menu cập nhật mà không phải reload thủ công, và snapshot tài chính của đơn cũ không bị phá vỡ (FR36, NFR14).

**Acceptance Criteria:**

**Given** menu sync engine từ Story 2.1 (`pullMenu()`)
**When** developer extend trong `features/menu/sync.ts`
**Then** function mới `checkAndPullIfNewer()` execute:
1. Read `db.menuMeta.menuVersion` local
2. Call `GET /api/v1/menu?since_version=<localVersion>`
3. Nếu `hasChanges: false` → no-op, update `lastCheckedAt`
4. Nếu `hasChanges: true` → atomic Dexie transaction replace categories/products/optionGroups/options, ghi `menuVersion = response.menuVersion`
5. Emit event `menu.updated` qua custom event

**Given** triggers cho menu sync
**When** developer wire trong `features/menu/triggers.ts`
**Then** trigger `checkAndPullIfNewer()`:
- App boot khi online
- `online` event recovery (sau offline period)
- `visibilitychange` → `visible` && online (debounced 5s)
- Interval polling 5 phút khi online && app active
- Manual call (vd sau admin mutations trong cùng tab)

**Given** event `menu.updated` được emit
**When** UI subscribe
**Then** `<MenuUpdatedToast />` (UX-DR25) — sonner non-blocking toast tiếng Việt "Menu đã cập nhật" với icon ✓
**And** auto-dismiss 4s; KHÔNG modal bắt buộc; KHÔNG block thao tác

**Given** cashier đang có cart với items khi menu update
**When** menu sync xảy ra
**Then** cart `items` array KHÔNG thay đổi (snapshot fields đã được copy lúc thêm vào giỏ — Story 2.5)
**And** OptionModal đang mở (nếu có) KHÔNG đóng đột ngột; menu đang chọn KHÔNG được hot-swap
**And** sản phẩm trong product grid (Story 2.2) cập nhật từ Dexie qua `useLiveQuery` — sản phẩm bị `isActive=false` biến mất khỏi grid; sản phẩm mới xuất hiện

**Given** đơn cũ trong `db.orders` (status synced/pendingSync)
**When** menu update xảy ra
**Then** `db.orders` KHÔNG bị động đến — snapshot fields trong `items` array immutable (NFR14)
**And** ReceiptModal cho đơn cũ vẫn hiển thị đúng theo snapshot lúc mua

**Given** integration test (Vitest + MSW)
**When** simulate menu version bump giữa lúc cart đang có items
**Then** test verify: cart unchanged, product grid updated, toast displayed, db.orders pending unchanged
**And** verify `menuVersionAtSale` của đơn pending vẫn giữ giá trị lúc finalize (Story 2.5/2.7)

**Given** lỗi `menu-version-stale` từ POST /orders (Story 2.6)
**When** errorMapper xử lý
**Then** trigger `checkAndPullIfNewer()` ngay → menu update → retry sync engine cho đơn pending (Story 2.11 errorMapper "retry-after-action")
**And** UX flow: cashier không thấy lỗi raw, chỉ thấy "Menu đã cập nhật" toast và đơn được sync sau

**Given** UX-DR25 microcopy
**When** toast render
**Then** text "Menu đã cập nhật" — KHÔNG dùng thuật ngữ kỹ thuật như "menu_version" hay "v12 → v13"

---

### Epic 3 Summary

- **9 stories** covering FR27–FR36; NFR14 (verified); UX-DR17–UX-DR21, UX-DR25, UX-DR30
- **Sequence-clean dependency:**
  - 3.1 (admin shell + table + badge foundation)
  - 3.2 → 3.3 (Categories BE → FE)
  - 3.4 → 3.5 (Option Groups BE → FE)
  - 3.6 → 3.7 (Products BE → FE)
  - 3.8 (versioned sync endpoint) → 3.9 (FE auto-pull + toast)
- **Deliverable Epic 3:** Admin CRUD menu hoàn chỉnh không cần kỹ thuật; POS auto-sync menu mới qua version mismatch detection; đơn cũ giữ snapshot bất biến verified end-to-end

---

## Epic 4: Business Reports

Cho admin xem báo cáo doanh thu cơ bản theo khoảng ngày: doanh thu theo ngày (`byDay`), tổng số đơn, doanh thu phân theo phương thức thanh toán (cash/transfer/card), top sản phẩm bán chạy. Server aggregate với timezone `Asia/Ho_Chi_Minh`; loại trừ đơn voided khỏi metrics; date-range picker dễ dùng; empty state rõ. Sau Epic này, chủ quán mở báo cáo, chọn khoảng 01/05–09/05 và thấy kết quả trong dưới 5 giây với đầy đủ 4 metric.

### Story 4.1: BE — Reports Endpoint với 4 Metric Aggregations + TZ Asia/Ho_Chi_Minh + Void Exclusion

As a backend developer,
I want endpoint `GET /api/v1/reports?from=&to=&metric=` aggregate 4 metric (revenue_by_day, total_orders, revenue_by_payment_method, top_products) với timezone `Asia/Ho_Chi_Minh` và loại trừ đơn voided,
So that admin có dữ liệu báo cáo chính xác theo múi giờ Việt Nam và không bị nhiễu bởi đơn đã hủy.

**Acceptance Criteria:**

**Given** module `src/reports/`
**When** developer triển khai `reports.controller.ts` + `reports.service.ts`
**Then** route `GET /api/v1/reports`:
- Bearer token role admin only
- Query params: `from: YYYY-MM-DD`, `to: YYYY-MM-DD`, `metric: 'revenue_by_day'|'total_orders'|'revenue_by_payment_method'|'top_products'|'all'`
- Validation: `from ≤ to`; range tối đa 90 ngày (return 400 nếu vượt)
**And** date input là date Asia/Ho_Chi_Minh; server convert thành UTC range `[from 00:00:00 +07, to+1 00:00:00 +07)` để query

**Given** query với `metric=revenue_by_day`
**When** server aggregate
**Then** raw SQL/Prisma group by `DATE(sold_at AT TIME ZONE 'Asia/Ho_Chi_Minh')`
**And** trả `[{ date: 'YYYY-MM-DD', revenue: <integer VND>, orderCount: <int> }, ...]` cho mỗi ngày trong range (kể cả ngày không có đơn → revenue=0, orderCount=0)

**Given** query với `metric=total_orders`
**When** server aggregate
**Then** trả `{ totalOrders: <int>, totalRevenue: <integer VND> }` toàn range

**Given** query với `metric=revenue_by_payment_method`
**When** aggregate
**Then** trả `[{ paymentMethod: 'cash'|'transfer'|'card', revenue: <integer VND>, orderCount: <int> }, ...]`
**And** label tiếng Việt được resolve ở FE (BE chỉ trả enum value)

**Given** query với `metric=top_products`
**When** aggregate
**Then** group by `product_name_snapshot` (KHÔNG phụ thuộc `Product.id` — đơn cũ vẫn count dù product đã xóa, NFR14)
**And** trả top 10 `[{ productName: <snapshot>, totalQuantity: <int>, totalRevenue: <integer VND> }, ...]` sort `totalQuantity DESC`

**Given** đơn voided (có row trong `order_voids`)
**When** server aggregate cho mọi metric
**Then** loại trừ orders có entry trong `order_voids` qua `LEFT JOIN order_voids ov ON ov.order_id = orders.id WHERE ov.id IS NULL`
**And** void không reverse đơn — chỉ exclude khỏi report

**Given** query với `metric=all`
**When** server xử lý
**Then** chạy 4 queries song song (Promise.all hoặc CTE) và trả combined response `{ revenueByDay: [...], totals: {...}, revenueByPaymentMethod: [...], topProducts: [...] }`

**Given** range 30 ngày với ~1000 orders
**When** request gửi
**Then** response time <5s (NFR6) — verify qua e2e test với seed data scaled

**Given** index hỗ trợ
**When** developer review
**Then** schema có `idx_orders_sold_at` (Story 2.6) + thêm composite `idx_orders_payment_method_sold_at` cho metric 3
**And** raw SQL dùng `EXPLAIN ANALYZE` xác nhận sequential scan KHÔNG xảy ra cho range queries

**Given** unit + integration test
**When** test
**Then** cover:
- Same-day range (from=to) → metric đúng cho 1 ngày
- Range 7 ngày với ngày trống ở giữa → byDay fill 0
- Voided order excluded
- Cross-tenant isolation
- Range 91 ngày → 400 with helpful message "Tối đa 90 ngày"
- Top products dùng snapshot name (xác nhận đơn cũ với product đã xóa vẫn count)

**Given** backend-only story cần demo độc lập
**When** developer hoàn tất reports endpoint
**Then** OpenAPI/Swagger schema có request/response examples cho từng `metric` và `metric=all`, including empty-day fill, void exclusion và range validation error
**And** e2e test hoặc script demo seed-driven chứng minh API contract trả đủ 4 metric với dữ liệu demo có thể dùng ngay cho Stories 4.3/4.4

---

### Story 4.2: FE — Reports Page Layout + DateRangeReportFilter Component

As an admin,
I want trang `/admin/reports` với date-range picker rõ ràng và layout 4 section cho 4 metric,
So that tôi chọn khoảng ngày dễ dàng (vd "Tuần trước", "Tháng này") và biết kết quả tính theo múi giờ Việt Nam.

**Acceptance Criteria:**

**Given** route `/admin/reports`
**When** admin mở
**Then** layout có header "Báo cáo" + DateRangeReportFilter cố định ở đầu + 4 section card grid 2x2 (Revenue by Day, Total Orders, Payment Method, Top Products) — placeholder cho Story 4.3, 4.4
**And** layout responsive: 4 cards trên desktop ≥1280px; stack 2 cột ở 1024-1279px; stack 1 cột ở <1024px

**Given** `<DateRangeReportFilter />` component (UX-DR22) trong `routes/admin/reports/`
**When** developer triển khai
**Then** dùng `react-day-picker` với mode `range`; locale Vietnamese
**And** 2 input "Từ ngày" và "Đến ngày" hiển thị `dd/MM/yyyy` qua date-fns locale `vi`
**And** popover calendar mở khi click input
**And** preset shortcuts: "Hôm nay", "Hôm qua", "7 ngày qua", "30 ngày qua", "Tháng này", "Tháng trước"
**And** TZ hint nhỏ dưới picker: "Tính theo giờ Việt Nam (UTC+7)" (UX-DR33)

**Given** validation
**When** admin chọn range
**Then**:
- `from > to` → swap tự động hoặc error inline
- range > 90 ngày → block submit với message "Tối đa 90 ngày một lần"
- Default range = 7 ngày qua

**Given** range đã chọn
**When** admin click "Xem báo cáo" hoặc auto-apply on change
**Then** URL search params đồng bộ `?from=2026-05-01&to=2026-05-09` để bookmark
**And** TanStack Query trigger fetch với key `['reports', from, to]`

**Given** loading state cấp page
**When** TanStack Query fetching
**Then** 4 section card render skeleton (UX-DR26)
**And** date filter vẫn enabled (cho phép thay đổi range)

**Given** error state (5xx network)
**When** request fail
**Then** render `<ErrorState />` (UX-DR24) toàn page với action "Thử lại" trigger refetch
**And** không hiển thị raw error (NFR12)

**Given** empty state (chưa có đơn synced trong range)
**When** server trả empty array cho mọi metric
**Then** mỗi section card render `<EmptyState />` với copy "Chưa có đơn đã đồng bộ trong khoảng ngày này." (UX-DR23)
**And** sub-text giải thích "Báo cáo chỉ tính đơn đã đồng bộ lên server."

**Given** keyboard navigation
**When** admin Tab qua filter
**Then** focus order rõ; calendar mở/đóng bằng keyboard; preset shortcut accessible

---

### Story 4.3: FE — Revenue by Day Chart + Total Orders Summary Card

As an admin,
I want xem biểu đồ doanh thu theo từng ngày trong khoảng đã chọn và card tổng số đơn + tổng doanh thu,
So that tôi nhanh chóng hiểu xu hướng doanh thu và scale của business trong khoảng đó.

**Acceptance Criteria:**

**Given** Story 4.2 layout có section "Doanh thu theo ngày" và "Tổng đơn"
**When** developer triển khai trong `routes/admin/reports/sections/`
**Then** TanStack Query fetch `GET /api/v1/reports?from=&to=&metric=all` (single call cho cả 4 metrics)
**And** parse response → distribute data cho từng section component

**Given** chart "Doanh thu theo ngày"
**When** render
**Then** dùng `recharts` làm thư viện biểu đồ đã chốt cho MVP
**And** line chart với x-axis = date `dd/MM` (date-fns format), y-axis = revenue VND (formatVnd compact "100K")
**And** tooltip hover hiển thị `dd/MM/yyyy`: revenue đầy đủ "100.000 ₫" + orderCount "5 đơn"
**And** color line dùng `--color-primary` (coffee brown từ tokens)
**And** ngày không có đơn vẫn render điểm 0 trên trục để continuity

**Given** card "Tổng đơn" và "Tổng doanh thu"
**When** render
**Then** 2 stat cards lớn:
- "Tổng số đơn" với `totalOrders` formatted "1.234"
- "Tổng doanh thu" với `formatVnd(totalRevenue)` (font 28-36px bold theo UX-DR2 total style)
**And** dưới mỗi card có sub-text "Trong khoảng {from} - {to}" format `dd/MM/yyyy`

**Given** range chỉ 1 ngày (from=to)
**When** chart render
**Then** chart vẫn hợp lý (single data point + label rõ); fallback render bar chart 1 cột nếu line không phù hợp
**And** card stats vẫn hiển thị đúng

**Given** user thay đổi date range
**When** TanStack Query refetch
**Then** chart re-render với data mới (smooth transition); skeleton chỉ hiển thị nếu first load
**And** stale data không hiển thị stale-while-revalidate behavior — show last data với indicator "Đang cập nhật"

**Given** accessibility
**When** screen reader
**Then** chart có `role="img"` + `aria-label` mô tả ngắn ("Biểu đồ doanh thu 7 ngày từ 01/05 đến 07/05")
**And** dữ liệu chart cũng available qua data table fallback (toggle "Xem dạng bảng" optional cho MVP)

---

### Story 4.4: FE — Revenue by Payment Method + Top Products Display

As an admin,
I want xem doanh thu phân bổ theo phương thức thanh toán (tiền mặt/chuyển khoản/thẻ) và top sản phẩm bán chạy,
So that tôi biết khách hay trả bằng cách nào và món nào đang hot.

**Acceptance Criteria:**

**Given** Story 4.3 đã fetch data từ `metric=all`
**When** developer triển khai 2 sections
**Then** Section "Doanh thu theo phương thức thanh toán":
- Render dạng horizontal bar chart hoặc table 3 row với percentage
- Cột: `paymentMethod` (label tiếng Việt: "Tiền mặt", "Chuyển khoản", "Thẻ"), `revenue` (formatVnd), `orderCount`, `percentage` của tổng revenue
- Color coding: cash = primary (coffee brown), transfer = accent (caramel), card = secondary

**Given** Section "Top sản phẩm bán chạy"
**When** render
**Then** table với columns: `#` (rank 1-10), `productName` (snapshot từ BE), `totalQuantity`, `totalRevenue` (formatVnd)
**And** sort theo `totalQuantity DESC` (default), cho phép toggle sort theo `totalRevenue DESC`
**And** hiển thị top 10; nếu data <10 thì hiển thị tất cả
**And** rank 1-3 có badge color (gold/silver/bronze nhẹ) hoặc icon medal

**Given** product name snapshot từ đơn cũ (sản phẩm đã DELETE)
**When** render top products
**Then** vẫn hiển thị tên snapshot — KHÔNG ẩn vì product không tồn tại nữa (NFR14 verification)
**And** không có link đến product detail (vì có thể đã bị xóa)

**Given** payment method có 0 đơn
**When** render
**Then** row vẫn hiển thị với revenue=0 và "Chưa có đơn" thay vì ẩn row

**Given** empty state (no orders trong range)
**When** cả 2 sections không có data
**Then** mỗi section render EmptyState "Chưa có đơn đã đồng bộ trong khoảng ngày này." (consistent với Story 4.2)

**Given** integration test
**When** test scenarios
**Then** cover:
- Render đầy đủ 4 metrics với mock data
- Empty state cho cả 4 sections
- Date range thay đổi triggers refetch
- TZ display Asia/Ho_Chi_Minh hint visible
- Top products vẫn hiển thị đúng dù product source đã xóa
- Payment method label tiếng Việt đúng
- Performance: render <500ms sau khi nhận data

**Given** print view (optional)
**When** admin muốn in báo cáo
**Then** CSS `@media print` (UX-DR27) layout report friendly: ẩn nav, expand 4 sections theo flow đọc; không tiêu đề navigation

---

### Epic 4 Summary

- **4 stories** covering FR37–FR40; NFR6 (perf <5s); UX-DR22, UX-DR23, UX-DR33
- **Sequence-clean dependency:**
  - 4.1 (BE endpoint với 4 metrics)
  - 4.2 (FE page + DateRangeFilter foundation) → 4.3 (revenue by day + totals) → 4.4 (payment method + top products)
- **Deliverable Epic 4:** Admin chọn khoảng ngày bất kỳ trong 90 ngày và thấy 4 metric trong <5s; báo cáo loại trừ đơn voided; top products dùng snapshot name; TZ Asia/Ho_Chi_Minh đúng

---

## Epic 6: Quản lý Bàn F&B (Table Service Mode)

> **Brownfield expansion** — added 2026-05-25 via Sprint Change Proposal `SCP-2026-05-25-table-mgmt` (approved). Khác Epic 1-4 (greenfield), Epic 6 mở rộng MVP scope đã done; sửa nhẹ một số story đã closed thông qua brownfield patches trong Story 6-8 thay vì re-open Epic 2/3.

### Story 6.1: BE — Schema Areas/Tables + Stores.tableMode + Orders.tableId/tableNameSnapshot

**As a** developer
**I want** schema database mở rộng để hỗ trợ table-service mode
**So that** các story BE và FE sau có thể CRUD `areas`/`tables`, lưu order kèm bàn, và toggle mode theo store

**Acceptance Criteria:**

**Given** schema Prisma cập nhật
**When** chạy `npx prisma migrate dev --name epic6-table-management`
**Then** migration mới tạo:
- Bảng `areas` (`id`, `tenant_id`, `store_id`, `name`, `sort_order`, `is_active`, `created_at`, `updated_at`); unique `(tenant_id, store_id, name)`
- Bảng `tables` (`id`, `tenant_id`, `store_id`, `area_id` FK, `name`, `capacity` int ≥1 default 2, `sort_order`, `is_active`, timestamps); unique `(tenant_id, store_id, name)`; index `(area_id)`
- Cột `stores.table_mode` boolean default `false`
- Cột `orders.table_id` UUID nullable FK → `tables.id`; index `(table_id)`
- Cột `orders.table_name_snapshot` text nullable; immutable sau insert (enforce ở service layer)

**Given** Prisma model TypeScript đã sinh
**When** import vào code
**Then** có `Area`, `Table` models PascalCase singular; field camelCase (`tableId`, `tableNameSnapshot`, `tableMode`, `areaId`, `sortOrder`)

**Given** seed `prisma/seed.ts` mở rộng (brownfield patch Story 1.4)
**When** chạy `npx prisma db seed`
**Then** seed idempotent (qua `prisma.upsert`):
- Store hiện hữu giữ `tableMode=false` (counter-service)
- Tạo **store thứ 2** với `tableMode=true`, 2 areas ("Quầy chính", "Sân ngoài"), 8 tables (4 mỗi area, capacity 2-4 random)
- Tạo 2-3 sample orders với `tableId` non-null trong store thứ 2 để demo

**Given** test e2e `seed.e2e-spec.ts`
**When** chạy `npm run test:e2e -- seed`
**Then** verify đếm areas/tables; verify cross-tenant isolation (store 1 không thấy tables của store 2)

**Dependencies:** None (foundation story Epic 6).
**Files touched:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts` (brownfield patch).
**Estimate:** 4-6h.

---

### Story 6.2: BE — Areas CRUD Endpoints

**As an** admin
**I want** CRUD endpoints cho khu vực bàn
**So that** tôi có thể tạo, sửa, xóa, sắp xếp các khu vực trong store F&B của mình

**Acceptance Criteria:**

**Given** `/api/v1/areas` controller (tables module mới `src/tables/`)
**When** authenticated admin gọi
**Then** support 4 methods:
- `GET /api/v1/areas` → list areas của store hiện tại, scoped tenant+store qua `$extends`; sort theo `sortOrder` rồi `name`
- `POST /api/v1/areas` → tạo mới với DTO `{ name, sortOrder?, isActive? }`; validate name unique trong store; trả 201 + entity
- `PATCH /api/v1/areas/:id` → update partial; validate name unique nếu đổi; trả 200 + entity
- `DELETE /api/v1/areas/:id` → soft block nếu còn `tables` thuộc area (trả 409 với `type=.../area-has-tables`, kèm `tableCount`)

**Given** non-admin gọi
**When** cashier thử POST/PATCH/DELETE
**Then** 403 với `type=.../forbidden`

**Given** cross-tenant attempt
**When** admin store A gọi `PATCH /api/v1/areas/<id-store-B>`
**Then** 404 (multi-tenant scope auto-filter; không leak existence)

**Given** unit tests `areas.service.spec.ts` và `areas.controller.spec.ts`
**When** run
**Then** coverage ≥70%; test cases gồm CRUD happy path, validation errors, 409 area-has-tables, RBAC, cross-tenant

**Dependencies:** Story 6.1 (schema).
**Files touched:** `src/tables/{areas.controller,areas.service,areas.repository}.ts`, `src/tables/dto/{create-area.dto,update-area.dto}.ts`, `src/tables/tables.module.ts`, `src/common/errors/problem-types.ts` (thêm URI `area-has-tables`).
**Estimate:** 4-6h.

---

### Story 6.3: BE — Tables CRUD Endpoints

**As an** admin
**I want** CRUD endpoints cho bàn
**So that** tôi có thể quản lý bàn trong từng khu vực, set capacity và bật/tắt trạng thái

**Acceptance Criteria:**

**Given** `/api/v1/tables` controller
**When** authenticated admin gọi
**Then** support:
- `GET /api/v1/tables` → list bàn scoped store; query `?areaId=<id>` filter theo area; sort `sortOrder`
- `POST /api/v1/tables` → DTO `{ name, areaId, capacity?, sortOrder?, isActive? }`; validate name unique trong store, areaId thuộc store, capacity ≥1
- `PATCH /api/v1/tables/:id` → update partial
- `DELETE /api/v1/tables/:id` → soft block nếu có order chờ thanh toán (status `pending_sync` hoặc `synced` với `synced_at >= today_open`) — trả 409 `type=.../table-has-pending-order`

**Given** payload có `areaId` cross-tenant
**When** validate
**Then** 400 `type=.../validation` với `detail: "Area không thuộc store"`

**Given** unit tests
**When** run
**Then** coverage ≥70%; cover happy path + validation + 409 table-has-pending-order + RBAC + cross-tenant

**Dependencies:** Story 6.1 (schema), Story 6.2 (areas — vì tables FK area).
**Files touched:** `src/tables/{tables.controller,tables.service,tables.repository}.ts`, `src/tables/dto/{create-table.dto,update-table.dto}.ts`, `src/common/errors/problem-types.ts` (thêm URI `table-has-pending-order`).
**Estimate:** 4-6h.

---

### Story 6.4: BE — Stores/Me + Tables/Status + Orders DTO Patch

**As a** cashier / admin
**I want** endpoint để biết store đang ở mode nào, và endpoint để xem trạng thái bàn realtime
**So that** FE quyết định render floor-plan hay counter UI; floor-plan refresh trạng thái mỗi 30s

**Acceptance Criteria:**

**Given** `GET /api/v1/stores/me`
**When** authenticated user gọi (cashier hoặc admin)
**Then** trả `{ id, name, tableMode: boolean, ... }` của store hiện tại; FE cache vào session store

**Given** `GET /api/v1/tables/status`
**When** authenticated user gọi
**Then** trả array `[{ tableId, status: 'empty'|'occupied'|'pending_sync', activeOrderCount }]`:
- `empty` = không có order với `table_id = X AND status != 'voided' AND synced_at >= today_open`
- `occupied` = có ≥1 synced order trong ngày
- `pending_sync` = có order `pendingSync` (POS thiết bị khác đã sync nhưng server chưa nhận)
- Aggregate query 1 lần, payload nhẹ (<5KB cho 50 bàn)

> **SCP-2026-06-01 note:** Story 6.4 là baseline online status. Story 6.11 sẽ nâng cấp `/tables/status` để `occupied = open table_session OR order trong ngày`, thêm `openSessionCount` + `conflict`.

**Given** orders DTO mở rộng (brownfield patch Story 2.6)
**When** `POST /api/v1/orders` payload có `tableId` non-null
**Then** server validate `tableId` thuộc store hiện tại (`tables.tenant_id + store_id` khớp user); cross-tenant → 400 `type=.../validation`. `tableNameSnapshot` cũng được persist nguyên văn từ payload (không re-query DB — đảm bảo immutability AR24)

**Given** `tableId` và `tableNameSnapshot` cùng null hoặc cùng non-null
**When** validate
**Then** payload có exact một trong hai non-null → 400 `type=.../validation` với `detail: "tableId và tableNameSnapshot phải cùng null hoặc cùng non-null"`

**Given** idempotent replay
**When** resend cùng `clientOrderId` với `tableId` khác
**Then** server giữ data lần đầu (composite key không bao gồm `tableId`); trả `idempotent_replay: true` với data nguyên gốc

**Dependencies:** Story 6.1 (schema), Story 6.3 (tables — vì status query reference).
**Files touched:** `src/tables/stores.controller.ts`, `src/tables/tables.controller.ts` (thêm endpoint status), `src/tables/services/table-status.service.ts`, `src/orders/dto/sync-order.dto.ts` (brownfield: thêm `tableId?`, `tableNameSnapshot?`), `src/orders/orders.service.ts` (brownfield: validate + persist).
**Estimate:** 5-7h.

---

### Story 6.5: FE — Admin Areas + Tables Management Pages

**As an** admin
**I want** trang quản lý khu vực và bàn trong admin UI
**So that** tôi có thể CRUD areas/tables qua giao diện thân thiện như các trang menu

**Acceptance Criteria:**

**Given** route `/admin/tables/areas` + `/admin/tables/tables` (hoặc cấu trúc tương đương)
**When** admin navigate
**Then** mỗi route render:
- `AdminDataTable` foundation (UX-DR-T11) với cột: name, sortOrder, isActive, actions
- Form dialog tạo/sửa (UX-DR-T5/T6) với fields theo schema; validation inline RHF+Zod
- Empty state UX-DR-T10 khi `count===0`: "Bắt đầu quản lý bàn — Tạo khu vực đầu tiên..." + 2 CTAs
- Switch `isActive` toggle trực tiếp ở row, ghi optimistic

**Given** xóa area còn tables
**When** click delete
**Then** server trả 409 `area-has-tables`; UI hiển thị error mapper toast "Khu vực này có N bàn. Vui lòng chuyển bàn sang khu vực khác trước." (block delete)

**Given** xóa bàn đang có order
**When** click delete
**Then** server trả 409 `table-has-pending-order`; UI toast "Bàn này đang có N đơn. Vui lòng xử lý đơn trước khi xóa."

**Given** admin nav cập nhật (brownfield Story 3.1)
**When** `tableMode=true` (đọc từ `/stores/me`)
**Then** hiển thị section "Quản lý bàn" với sub-items "Khu vực", "Bàn" cạnh "Quản lý Menu" + "Báo cáo"; khi `tableMode=false` → ẩn hoàn toàn (UX-DR-T11)

**Dependencies:** Story 6.2, 6.3 (BE endpoints), Story 6.4 (`/stores/me` để check tableMode), Story 3.1 (AdminDataTable foundation — brownfield patch nav).
**Files touched:** `routes/admin/tables/{areas-page,tables-page}.tsx`, `features/tables/{api,hooks,types}.ts`, `routes/admin/_layout.tsx` (brownfield: nav gating).
**Estimate:** 8-12h.

---

### Story 6.6: FE — Admin Store-Config Toggle tableMode

**As an** admin
**I want** trang cấu hình store cho phép toggle `tableMode`
**So that** tôi có thể chuyển store giữa counter-service và table-service mà không cần liên hệ kỹ thuật

**Acceptance Criteria:**

**Given** route `/admin/store-config`
**When** admin mở
**Then** hiển thị `StoreConfigToggle` (UX-DR-T8): switch `tableMode` + label "Chế độ bàn: Bật/Tắt"; mô tả ngắn về implication của mỗi mode

**Given** admin toggle ON khi store đang có 0 bàn
**When** save
**Then** server cập nhật `stores.table_mode = true`; UI báo "Đã bật. Vui lòng tạo khu vực và bàn để thu ngân có thể bắt đầu phục vụ bàn."

**Given** admin toggle OFF khi đang có bàn occupied (`activeOrderCount > 0` qua `/tables/status`)
**When** click toggle
**Then** confirm dialog: "Đang có N bàn chứa order chờ thanh toán. Tắt chế độ bàn sẽ ẩn floor-plan trên POS — đơn đó vẫn truy cập được qua danh sách đơn admin. Tiếp tục?" + 2 options "Tiếp tục" / "Hủy"

**Given** mode đã đổi
**When** thu ngân đang ở POS
**Then** mode mới chỉ áp dụng sau khi POS reload session (NFR18 — không live update; tránh race condition giữa ca)

**Given** nav admin
**When** `tableMode=true`
**Then** "Cấu hình store" hiển thị; khi `tableMode=false` vẫn hiển thị (admin cần truy cập để bật mode)

**Dependencies:** Story 6.4 (`/stores/me` + endpoint cập nhật `tableMode`).
**Files touched:** `routes/admin/store-config/store-config-page.tsx`, `features/tables/hooks.ts` (`useTableMode`, `useUpdateTableMode`).
**Estimate:** 3-5h.

---

### Story 6.7: FE — POS Floor Plan View + Polling + Entry Routing

**As a** cashier
**I want** floor-plan view là landing screen của POS khi store ở `tableMode=true`
**So that** tôi thấy ngay bàn nào trống/đang phục vụ và chọn bàn trước khi vào menu

**Acceptance Criteria:**

**Given** route POS với `tableMode=true`
**When** cashier mở `/pos`
**Then** landing là `FloorPlanView` (UX-DR-T2) thay vì product grid; sticky `TableModeBadge` "Chế độ bàn: Bật" trong POS header (UX-DR-T8)

**Given** floor-plan visible
**When** poll `/api/v1/tables/status`
**Then** polling mỗi 30s (UX-DR-T4); pause polling khi user đã click bàn vào menu screen; resume khi quay lại floor-plan

**Given** floor-plan grid
**When** render
**Then** layout responsive 2-4 cột tại ≥1024px; mỗi `TableCard` (UX-DR-T4) hiển thị name + capacity + status badge (icon + màu + text — không chỉ màu); touch target ≥56×56px (đề xuất 64px)

**Given** AreaTabs (UX-DR-T3)
**When** click tab khu vực
**Then** grid bàn chuyển khu vực với transition ≤150ms; persist `selectedAreaId` vào Zustand store; tab hiển thị "Quầy chính · 4/6" (số trống / tổng)

**Given** store `tableMode=true` nhưng 0 bàn
**When** render
**Then** UX-DR-T9 empty state: "Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên." + nút "Vào Bán hàng nhanh" (không bị kẹt)

**Given** route POS với `tableMode=false`
**When** mở `/pos`
**Then** **không** hiển thị floor-plan / TableModeBadge / nav "Quản lý bàn" / "Bán hàng nhanh" button — UI giữ nguyên 100% MVP hiện tại (UX-DR-T7 backward compat clause)

**Dependencies:** Story 6.4 (`/tables/status` + `/stores/me`), Story 6.3 (tables list).
**Files touched:** `features/tables/{components/floor-plan-view,components/table-card,components/area-tabs,store,hooks}.tsx`, `routes/pos/pos-page.tsx` (brownfield: routing logic), `routes/_layout.tsx` (TableModeBadge).
**Estimate:** 8-12h.

---

### Story 6.8: FE — POS Table-First Flow + Brownfield Orders Integration

**As a** cashier
**I want** khi click bàn ở floor-plan, vào màn chọn món với sticky bàn header
**So that** tôi không quên đang phục vụ bàn nào; order auto-gắn `tableId` khi finalize

**Acceptance Criteria:**

**Given** floor-plan visible
**When** click `TableCard` trạng thái empty
**Then** chuyển vào màn chọn món; sticky `TableContextHeader` (UX-DR-T7) hiển thị "Bàn X" + area name + 2 nút "Đổi bàn"/"Hủy chọn bàn"; layout 2-cột menu+cart giữ nguyên Epic 2

**Given** cart store mở rộng (brownfield Story 2.4)
**When** chọn món
**Then** `cartStore.tableId` và `cartStore.tableNameSnapshot` set khi click bàn; clear khi "Hủy chọn bàn" hoặc finalize order

**Given** `buildLocalOrder()` mở rộng (brownfield Story 2.5)
**When** finalize
**Then** payload `POST /api/v1/orders` chứa `tableId` và `tableNameSnapshot` (copy từ cart store); Dexie `db.orders` schema thêm 2 field này (brownfield Story 2.7)

**Given** receipt modal (brownfield Story 2.8)
**When** order finalized với `tableNameSnapshot` non-null
**Then** receipt hiển thị dòng "Bàn 3" (UX-DR / FR52); cả screen view và print CSS; ẩn dòng nếu `tableNameSnapshot=null`

**Given** click "Đổi bàn" hoặc "Hủy chọn bàn" khi cart có ≥1 item
**When** trigger
**Then** mở `ModeTransitionConfirmDialog` (UX-DR-T13): 3 options "Giữ cart" / "Tạo cart mới" / "Hủy"; Esc = Hủy; body mô tả tình huống cụ thể, không dùng "Are you sure?" generic

**Given** click "Đổi bàn" khi cart rỗng
**When** trigger
**Then** đi thẳng về floor-plan / mở TablePicker không hỏi (tránh ma sát thừa)

**Given** unit test `builder.test.ts` (brownfield Story 2.5)
**When** test cases
**Then** verify: snapshot pair (null/null hoặc cùng non-null), `tableNameSnapshot` immutable sau khi build, cart reset đúng khi confirm "Tạo cart mới"

**Acceptance Criteria bổ sung (SCP-2026-06-01 — table session / occupancy, Phase 1):**

**Given** `tableMode=true`, click `TableCard` empty
**When** mở bàn
**Then** tạo `table_session` (status `open`) — local (Dexie) khi offline, sync khi online; bàn chuyển trạng thái **"đang phục vụ" NGAY** (occupancy trước thanh toán — FR53)

**Given** mở bàn đang có phiên `open` của device khác (online)
**When** click
**Then** cảnh báo mềm "máy khác đang phục vụ bàn này" (allow + warn, không chặn — FR54)

**Given** finalize order
**When** settle
**Then** đóng `table_session` (status `settled`) + materialize order bất biến như cũ (RULE 4 — order chỉ materialize tại settle từ snapshot)

**Given** offline
**When** mở bàn / finalize
**Then** mọi thao tác hoạt động offline (FR55); session/order xếp hàng sync (idempotent theo `client_session_id`)

> **GHI CHÚ:** KHÔNG share item cross-device ở Phase 1 (tab chia sẻ đầy đủ + merge để Phase 2 / Epic 7).

**Dependencies:** Story 6.7 (floor-plan entry — nâng cấp qua Story 6.12), Story 6.4 (orders DTO accept tableId), Story 6.11 (BE table-session lifecycle), Stories 2.4-2.8 (foundation cart/order/receipt — brownfield patches embedded here, KHÔNG re-open Epic 2).
**Files touched:**
- `features/orders/builder.ts` (brownfield Story 2.5 patch — `buildLocalOrder` thêm `tableId` + `tableNameSnapshot`)
- `db/schemas/orders.ts` (brownfield Story 2.7 patch — Dexie schema)
- `routes/pos/cart-panel.tsx` (brownfield Story 2.4 patch — cart store extension)
- `routes/pos/receipt-modal.tsx` (brownfield Story 2.8 patch — hiển thị bàn)
- `features/tables/components/{table-context-header,mode-transition-confirm-dialog}.tsx`
- `features/tables/store.ts` (cart context bàn)

**Estimate:** 10-14h. Brownfield patches lớn nhất Epic 6 — cần regression test toàn bộ Epic 2 flow để đảm bảo counter mode unchanged.

---

### Story 6.9: FE — POS Quick-Counter Button + Mode Transitions

**As a** cashier
**I want** nút "Bán hàng nhanh" trên floor-plan để vào counter UI bán mang đi
**So that** trong store `tableMode=true`, tôi vẫn phục vụ được khách không ngồi bàn mà không cần admin tắt mode

**Acceptance Criteria:**

**Given** floor-plan view (`tableMode=true`)
**When** render
**Then** `QuickCounterButton` (UX-DR-T12) hiển thị góc trên phải header; secondary CTA không cạnh tranh visual với CTA chính (click ô bàn); icon + label "Bán hàng nhanh"

**Given** click "Bán hàng nhanh" khi cart rỗng
**When** trigger
**Then** vào thẳng counter UI giống Epic 2 (re-use components: product-grid, cart-panel, checkout-panel — không hiển thị TableContextHeader); POS header đổi sang "Bán hàng nhanh" + nút "Về sơ đồ bàn"

**Given** click "Bán hàng nhanh" khi cart có ≥1 item (đang trong table-flow)
**When** trigger
**Then** mở `ModeTransitionConfirmDialog` (UX-DR-T13) trước; tương tự khi đang ở counter mode bấm "Về sơ đồ bàn" với cart có item

**Given** finalize order từ quick-counter flow
**When** sync
**Then** payload có `tableId=null` và `tableNameSnapshot=null`; receipt KHÔNG hiển thị dòng "Bàn" (ẩn hoàn toàn — không hiển thị "Bàn: —")

**Given** click "Về sơ đồ bàn"
**When** trigger (cart rỗng hoặc đã confirm)
**Then** quay về floor-plan view; header POS đổi lại trạng thái table-mode; polling resume

**Given** e2e test `pos-dual-flow.e2e.ts` (Vitest + Playwright nếu có)
**When** test cases
**Then** cover: HT5 happy path, HT5b happy path, đổi qua lại table-flow ↔ quick-counter với cart có item (3 options confirm), mode toggle on/off persistence sau reload

**Dependencies:** Story 6.7 (floor-plan), Story 6.8 (mode transition dialog component, cart store).
**Files touched:**
- `features/tables/components/quick-counter-button.tsx`
- `routes/pos/pos-page.tsx` (brownfield Story 6.7 patch — flow mode state: `floor-plan` | `table-menu` | `quick-counter`)
- `routes/_layout.tsx` (brownfield — header transitions)
- `tests/pos-dual-flow.e2e.ts` (new e2e)

**Estimate:** 4-6h.

---

> **Phase 1 — Offline Table Management** (added 2026-06-04 via `SCP-2026-06-01-offline-table-sessions`, approved). Đảo thiết kế online-only của Epic 6 sang offline-first + table-session occupancy cross-device. Stories 6.10 → 6.11 → 6.12 → (cập nhật) 6.8.

### Story 6.10: FE — Offline Cache Table Config + Local Status Derivation

**As a** cashier
**I want** floor-plan và trạng thái bàn render được khi offline
**So that** store F&B `tableMode=true` không vỡ luồng bán hàng khi mất mạng (FR55, NFR19)

**Acceptance Criteria:**

**Given** POS login (hoặc online trở lại)
**When** boot / online-resume
**Then** pull `GET /areas` + `GET /tables` + `GET /stores/me`, ghi vào Dexie stores `db.areas`, `db.tables`, `db.storeConfig` (mirror, chỉ field cần offline)

**Given** floor-plan view
**When** render
**Then** đọc tables/areas/storeConfig từ Dexie cache (không phụ thuộc network); status derive cục bộ từ `db.orders` + `db.tableSessions` qua `useLiveQuery`

**Given** online
**When** `/tables/status` trả về
**Then** merge occupancy cross-device vào local derivation (online enhancement, không ghi đè local pending)

**Given** ngắt mạng (offline)
**When** mở floor-plan
**Then** floor-plan + status vẫn render đầy đủ từ cache; không lỗi, không màn trắng

**Dependencies:** Story 6.4 (endpoint nguồn). **Files touched:** `db/schemas/{areas,tables,store-config,table-sessions}.ts`, `features/tables/cache.ts` (populate on login/resume), `features/tables/status-derivation.ts`.
**Estimate:** 10-14h.

---

### Story 6.11: BE — Table Session Lifecycle (Occupancy) + Sync + Status Upgrade

**As a** system
**I want** phiên bàn (table session) làm nguồn occupancy cross-device
**So that** bàn hiện occupied ngay khi mở (trước thanh toán) và đồng bộ giữa các máy (FR53, FR54, FR56)

**Acceptance Criteria:**

**Given** migration mới
**When** apply
**Then** tạo bảng `table_sessions` (id, tenant_id, store_id, table_id FK, opened_by_device, status `open|settled|voided|superseded`, opened_at, client_session_id UUIDv7, created_at, updated_at); index `(table_id, status)`; unique `(tenant_id, store_id, client_session_id)`

**Given** `POST /api/v1/tables/:id/sessions`
**When** gọi (kể cả replay cùng `client_session_id`)
**Then** mở phiên idempotent — replay trả cùng kết quả, không tạo phiên trùng

**Given** `GET /api/v1/tables/sessions?status=open`
**When** gọi
**Then** trả list phiên đang mở của store (cross-device occupancy)

**Given** `POST /api/v1/tables/sessions/:id/settle`
**When** finalize order
**Then** chuyển phiên sang `settled`

**Given** `GET /api/v1/tables/status` (nâng cấp)
**When** gọi
**Then** `occupied` = có phiên `open` **OR** có order trong ngày; trả thêm `openSessionCount` + cờ `conflict`

**Given** ≥2 phiên `open` cùng `table_id` (2 máy offline cùng mở)
**When** sync về server
**Then** `conflict=true`; **KHÔNG xóa phiên nào** (giữ cả hai — FR56)

**Dependencies:** Story 6.1 (schema), Story 6.4 (status endpoint gốc). **Files touched:** `prisma/schema.prisma` + migration, `src/tables/table-sessions.{controller,service}.ts`, `src/tables/tables.service.ts` (status upgrade).
**Estimate:** 12-16h.

---

### Story 6.12: FE — Floor-Plan Offline Rework (Brownfield Patch Story 6.7)

**As a** cashier
**I want** floor-plan đã build (Story 6.7) hoạt động offline + hiển thị xung đột
**So that** polling 30s không còn là điểm vỡ offline (FR50, FR55)

**Acceptance Criteria:**

**Given** floor-plan (Story 6.7 đã done với polling online-only)
**When** rework
**Then** floor-plan đọc tables/areas/storeConfig từ Dexie (Story 6.10); status từ local derivation; polling 30s `/tables/status` trở thành **online enhancement** — pause khi offline, KHÔNG throw lỗi

**Given** bàn có `openSessionCount > 1` (conflict)
**When** render
**Then** `TableCard` hiển thị badge **⚠️ "Xung đột phiên"**

**Given** offline
**When** floor-plan visible
**Then** hiện chỉ báo offline (re-use connectivity indicator Story 2.10); mọi tương tác chọn bàn vẫn hoạt động

**Given** trạng thái "đang phục vụ" (phiên mở chưa thanh toán)
**When** render TableCard
**Then** phân biệt visual với "đã có đơn trong ngày" và "trống"

**Dependencies:** Story 6.10 (Dexie cache + derivation), Story 6.11 (status conflict flag). **Files touched:** `routes/pos/floor-plan-view.tsx` (brownfield Story 6.7 patch), `features/tables/components/table-card.tsx`.
**Estimate:** 8-10h.

---

### Story 6.13: FE — Per-Table Draft Cart (Local Reload Items on Re-Select)

> Added 2026-06-05 (product owner decision). Tách phần "giữ món" single-device khỏi Story 6.8 (vốn chỉ giữ occupancy). KHÔNG cross-device/cross-session (đó là Epic 7).

**As a** cashier (store F&B `tableMode=true`)
**I want** khi "Giữ bàn" với giỏ có món rồi chọn lại đúng bàn đó (trên cùng máy), các món được nạp lại vào giỏ
**So that** giữ bàn để phục vụ bàn khác rồi quay lại làm tiếp đơn cũ mà không nhập lại món (FR53 on-hold, single-device)

**Acceptance Criteria:**

**Given** cashier "Giữ bàn" (Story 6.8) với giỏ ≥1 món
**When** bấm giữ bàn
**Then** lưu items+discount theo `tableId` vào Dexie `tableDrafts` (version 6); bàn vẫn "Đang phục vụ" + **clickable** để mở lại

**Given** bàn có draft local
**When** chọn lại bàn đó ở floor-plan
**Then** nạp draft vào giỏ (`loadCart`); product grid hiện với món cũ; KHÔNG lẫn món bàn khác

**Given** thanh toán / "Tạo cart mới" / "Hủy chọn bàn"
**When** kết thúc/giải phóng bàn
**Then** xóa draft của bàn đó (`clearTableDraft`)

**Given** reload trang
**When** chọn lại bàn đang giữ
**Then** vẫn nạp được món (draft persistent qua Dexie; cart-store vẫn memory-only)

**Given** counter-mode / quick-counter (`tableId=null`)
**When** bán hàng
**Then** KHÔNG tạo draft nào (regression an toàn)

**Dependencies:** Story 6.8 (nút "Giữ bàn" + session + cart context + Dexie v5 — implement TRƯỚC), Story 6.10 (Dexie infra), Story 6.12 (display status/disabled — wire bàn reopenable), Story 6.7 (select flow). **Files touched:** `features/orders/cart-draft.ts` (NEW), `db/dexie.ts` (v6 + `tableDrafts`), `features/orders/cart-store.ts` (`loadCart`), `routes/pos/pos-shell.tsx` (orchestration), `features/tables/components/{floor-plan-view,table-card}.tsx` (reopenable).
**NOT in scope:** đồng bộ đa thiết bị / append-only item events / merge (Epic 7).
**Estimate:** 6-9h.

---

### Epic 6 Summary

- **13 stories** (9 gốc + 3 Phase 1 offline + 6.13 per-table draft cart single-device) covering FR44–FR56 (gồm FR47b, FR53-56); NFR18 + NFR19 (offline parity); UX-DR-T1..T13 (13 design requirements) + offline indicator/conflict badge
- **Dependency graph:**
  - 6.1 (BE schema foundation) — chặn tất cả
  - 6.1 → 6.2, 6.3 (BE CRUD areas/tables) song song
  - 6.2 + 6.3 → 6.4 (BE stores/me + tables/status + orders DTO)
  - 6.4 → 6.5, 6.6 (FE admin) song song
  - 6.4 → 6.7 (FE floor-plan)
  - 6.7 → 6.8 (FE table-first + brownfield 2-4..2-8 + 3-1)
  - 6.8 → 6.9 (FE quick-counter)
  - **Phase 1 offline (SCP-2026-06-01):** 6.11 (BE session) + 6.10 (FE Dexie cache) → 6.12 (FE floor-plan rework) → cập nhật 6.8 (table-first + session); 6.9 ~không đổi
- **Brownfield patches embedded** (KHÔNG re-open Epic 2/3):
  - Story 1.4 (seed) trong Story 6.1
  - Story 2.4 (cart-panel), 2.5 (checkout-summary/buildLocalOrder), 2.6 (orders DTO), 2.7 (Dexie schema), 2.8 (receipt) trong Story 6.8
  - Story 3.1 (admin nav) trong Story 6.5
- **Effort estimate tổng:** ~60-90h gốc + ~35-50h Phase 1 offline (Story 6.10-6.12 + rework 6.8, theo SCP-2026-06-01 §2.4)
- **Deliverable Epic 6:**
  - Store F&B vận hành table-service đầy đủ: cashier mở POS → floor-plan → chọn bàn → menu (sticky bàn) → finalize → receipt in tên bàn → floor-plan refresh
  - "Bán hàng nhanh" cách 1 chạm cho khách mang đi trong cùng store F&B
  - Admin CRUD areas/tables qua AdminDataTable + toggle `tableMode`
  - Mode toggle bật/tắt không cần redeploy (NFR18)
  - Store counter-service hiện hữu KHÔNG thấy bất kỳ thay đổi UI nào (backward compat verified qua regression)
- **Demo verification:** seed có 1 store mode-off + 1 store mode-on; e2e test cả 2 paths (HT5 + HT5b)
- **Known limitations** (per SCP-2026-06-01 §4.D3, ghi rõ trong "Out of Scope" Epic 6):
  - No split/merge bill · no transfer table · no reservation · no KOT/kitchen display
  - **Phase 1 (SCP-2026-06-01):** table occupancy cross-device khi online (≤1 chu kỳ polling); offline derive cục bộ từ Dexie. 2 POS offline cùng mở 1 bàn → giữ cả 2 phiên + badge ⚠️ xung đột, thu ngân xử lý thủ công.
  - **Defer Phase 2 (Epic 7 "Shared Table Sessions"):** tab chia sẻ đầy đủ (xem/thêm item cross-device) + màn gộp phiên (merge) + item-event sync 2 chiều.
  - Floor-plan không visual editor
  - Reports Epic 4 không break down theo bàn (quick-counter và table sales aggregate chung)

---

## Epic 7: Shared Table Sessions (Phase 2 — Fast-Follow)

> **Outline only** — added 2026-06-04 via `SCP-2026-06-01-offline-table-sessions` (approved). Phase 2 deferred. **Cần chi tiết hóa qua `bmad-create-epics-and-stories`** trước khi dev. Mục tiêu: tab chia sẻ đầy đủ cross-device (POS khác mở được tab đang mở, xem + thêm item vào cùng đơn) + merge khi xung đột + item-event sync 2 chiều (append-only + tombstone, union semantics — KHÔNG cần CRDT).

**Stories (outline — chưa chốt AC):**

- **7.1 — BE:** `table_session_items` append-only + tombstone; endpoints add/remove item; sync union semantics theo `client_item_id` (ADD tự do conflict; remove = tombstone).
- **7.2 — FE:** `TableSessionView` (tab đang mở, item theo device); join-tab + offline event-sync engine.
- **7.3 — FE:** concurrent-edit warning (online — 2 máy cùng sửa 1 tab).
- **7.4 — FE+BE:** `MergeSessionDialog` (gộp 2 phiên conflict) + reconcile logic (union item-event theo `client_item_id`).
- **7.5 — Test:** e2e multi-device offline → sync → merge.

**Dependencies:** Epic 6 Phase 1 done (table_sessions occupancy + offline cache). **Effort estimate (SCP §2.4):** ~90-120h, risk Medium-High.

---

