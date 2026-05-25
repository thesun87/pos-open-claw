---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "docs/product-requirement.md"
  - "_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md"
workflowType: 'architecture'
project_name: 'pos-bmad'
user_name: 'Tuan.nguyen'
date: '2026-05-09'
lastStep: 8
status: 'complete'
completedAt: '2026-05-09'
lastEdited: '2026-05-25'
editHistory:
  - date: '2026-05-25'
    source: 'SCP-2026-05-25-table-mgmt (approved)'
    changes: 'Thêm Area/Table models + stores.table_mode + orders.table_id/table_name_snapshot; thêm 4 endpoints (/areas, /tables, /tables/status, /stores/me); cập nhật sync payload + idempotency rules cho tableId; thêm Epic 6 vào trình tự implementation; mở rộng FR coverage (FR44-52) + NFR18 + HT5/HT5b'
---

# Tài Liệu Quyết Định Kiến Trúc — Café POS MVP

_Tài liệu này được xây dựng tăng dần qua từng bước khám phá hợp tác. Các phần sẽ được thêm vào khi chúng ta cùng đi qua từng quyết định kiến trúc._

## Phân tích Bối cảnh Dự án

### Tổng quan Yêu cầu

**Yêu cầu Chức năng (43 FR / 7 nhóm):**

- Xác thực & Phiên (FR1–FR7): JWT + refresh, phiên offline 7 ngày, revocation server, role-routing
- POS Bán hàng (FR8–FR18): lưới sản phẩm, modal tùy chọn, giỏ hàng, giảm giá, thanh toán, hóa đơn in, hủy đơn
- Quản lý đơn & Sync (FR19–FR26): mã đơn cục bộ + UUID, snapshot tại thời điểm bán, sync idempotent, void riêng biệt
- Quản lý menu Admin (FR27–FR33): CRUD danh mục/sản phẩm/nhóm tùy chọn/tùy chọn, bật-tắt, sắp xếp
- Sync menu (FR34–FR36): pull theo phiên bản, incremental + full fallback, không ảnh hưởng đơn cũ
- Báo cáo (FR37–FR40): doanh thu theo ngày, tổng đơn, theo phương thức thanh toán, top sản phẩm
- Demo cục bộ (FR41–FR43): Docker Compose, migration, seed café mẫu

**Yêu cầu Phi chức năng (17 NFR / 3 trục):**

- Hiệu năng (NFR1–NFR6): POS shell <2s/3G, add-to-cart <100ms, finalize offline <500ms, sync <3s, report 30 ngày <5s
- Bảo mật (NFR7–NFR12): không lưu mật khẩu cục bộ, HTTPS/TLS, JWT revocation, RBAC, error masking
- Độ tin cậy & Nhất quán (NFR13–NFR17): idempotency theo `client_order_id`, snapshot bất biến, persist IndexedDB qua reload, không bỏ qua đơn pending, phiên offline đúng 7 ngày

**Quy mô & Độ phức tạp:**

- Domain kỹ thuật chính: full-stack web (PWA client + REST API + PostgreSQL)
- Mức độ phức tạp: Medium–High (kết hợp offline-first + sync idempotent + versioned menu + multi-tenant + PWA)
- Số thành phần kiến trúc ước tính: ~10–12

### Ràng buộc & Phụ thuộc Kỹ thuật

- PWA hiện đại bắt buộc (Service Worker, IndexedDB) — Chrome/Safari mới nhất chính thức, Firefox khuyến nghị; chỉ landscape ≥1024px
- PostgreSQL cho server (chốt trong PRD)
- HTTPS/TLS bắt buộc (NFR9)
- MVP không bao gồm deploy production; chỉ chạy demo cục bộ qua Docker Compose
- Stack/framework cụ thể chưa được chốt — sẽ quyết định ở các bước tiếp theo
- Tài liệu và UI ngôn ngữ Tiếng Việt

### Mối quan tâm Xuyên suốt

1. Quản lý trạng thái kết nối (indicator, pending counter, auto/manual retry)
2. Vòng đời auth (login → refresh → expire warning → revocation → offline 7 ngày)
3. Toàn vẹn snapshot (line item, void, refund — không sửa lịch sử)
4. Versioning menu (`menu_version` đồng nhất hai phía, incremental + full fallback)
5. Multi-tenant scoping (`tenant_id` + `store_id` mọi tầng dữ liệu)
6. Error handling phân cấp (server log chi tiết, UI hide raw error)
7. Ranh giới thời gian (7 ngày offline chính xác; date-range báo cáo)
8. Đồng bộ idempotent (dedup server-side, retry-safe client-side)
9. Performance budget xuyên các bề mặt (POS load, cart ops, sync, reporting)

## Đánh giá Starter Template

### Domain công nghệ chính

Full-stack web với hai surface tách biệt: PWA frontend (POS + Admin) và REST API backend (Node/TypeScript/PostgreSQL). Hai repo tách biệt: `pos-web` và `pos-api`.

### Các phương án đã đánh giá

**Frontend:**

- `create-vite` react-ts: chuẩn nhưng phải tự tích hợp PWA layer
- `@vite-pwa/pwa` (create-pwa) — **CHỌN**: tích hợp sẵn vite-plugin-pwa, service worker, manifest, React virtual module
- Next.js + next-pwa: quá nặng cho công cụ nội bộ không cần SSR
- T3/RedwoodJS: ràng buộc full-stack monorepo, không khớp lựa chọn 2 repo

**Backend:**

- `@nestjs/cli` v11.x — **CHỌN**: chính thức, có DI, scaffold module/controller/provider, jest+eslint+prettier sẵn
- 3rd-party NestJS+Prisma starters: ORM nên là quyết định riêng ở Bước 4

### Starter đã chọn

- Frontend: `@vite-pwa/pwa` v1.x, template `react-ts` (Vite 7 + React 18 + TypeScript + vite-plugin-pwa)
- Backend: `@nestjs/cli` v11.x base scaffold

### Lý do chọn

- Khớp ràng buộc PRD: PWA bắt buộc + offline-first + không cần SEO + tablet/laptop ≥1024px
- Tiết kiệm bước tích hợp PWA chuẩn cho frontend
- NestJS DI + module pattern phù hợp đội intermediate, dễ áp dụng multi-tenant scoping middleware và auth/sync layering
- Cả hai đều TypeScript → cộng hưởng cross-repo qua type definitions chia sẻ thủ công (DTO copy hoặc shared private package)

### Lệnh khởi tạo

```bash
# Frontend
npm create @vite-pwa/pwa@latest pos-web -- --template react-ts

# Backend
npx @nestjs/cli@latest new pos-api
```

### Quyết định kiến trúc do starter cung cấp

**pos-web:** TypeScript strict-friendly · Vite 7 (HMR, esbuild) · vite-plugin-pwa + Workbox + manifest · React virtual module cho update prompt · cấu trúc `src/` + `public/`

**pos-api:** TypeScript strict-friendly · NestJS module/controller/service pattern · DI container · Jest unit + e2e · ESLint + Prettier · `src/<module>/` cấu trúc

### Quyết định KHÔNG do starter cung cấp (sẽ chốt ở Bước 4)

- Frontend: IndexedDB wrapper, state management, routing, UI library, form/validation
- Backend: ORM, auth strategy, schema validation, OpenAPI, multi-tenant middleware, sync handler

### Lưu ý

Các lệnh khởi tạo trên là **story đầu tiên của sprint thực thi**, không phải công việc của tài liệu kiến trúc.

## Quyết định Kiến trúc Cốt lõi

### Phân tích Ưu tiên Quyết định

**Quyết định CRITICAL (chặn implement):**

- ORM, IndexedDB layer, multi-tenant pattern, JWT/auth strategy, state management 3-tier, error envelope, migration/seed flow

**Quyết định IMPORTANT (định hình kiến trúc):**

- UI library + styling, routing, validation strategy, password hashing, logging

**Quyết định DEFERRED (sau MVP):**

- Production deployment, monitoring/APM, CDN/cache layer, audit log, ESC/POS integration, kitchen display

### Kiến trúc Dữ liệu

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| ORM (server) | **Prisma 7** | Schema-first; client TS thuần; Migrate + db seed có sẵn; multi-tenant qua `$extends`; DX cao |
| IndexedDB (client) | **Dexie 4.x + useLiveQuery** | Source-of-truth pattern; React reactive ngay; index/compound query tốt cho `pending_sync`; khớp NFR15 |
| Multi-tenant pattern | **Shared DB + shared schema, filter theo `tenant_id` + `store_id`** | Chi phí thấp, đúng phạm vi MVP, mở đường cho multi-tenant tương lai |
| Validation | **Zod (cả 2 phía) + class-validator (NestJS DTO)** | Zod cho FE form/sync payload; class-validator cộng hưởng `@nestjs/swagger`; Zod schema có thể chia sẻ qua npm package nội bộ sau |

**Schema chính (high-level):**

- `tenants`, `stores` (với `table_mode` boolean — FR44 mode toggle), `users` (với role, password_hash bcrypt)
- `categories`, `products`, `option_groups`, `options`, `product_option_groups`
- `menu_versions` (tăng đơn điệu mỗi lần admin sửa)
- `orders` (append-only, snapshot tại thời điểm bán, thêm `table_id` nullable FK + `table_name_snapshot` immutable AR24 — FR51), `order_items` (snapshot tên/giá/options/notes)
- `order_voids` (bản ghi hủy riêng, không sửa lịch sử — FR26)
- `refresh_tokens` (cho FR5 server revocation)
- `sync_log` (idempotency dedup theo `tenant_id + store_id + device_id + client_order_id`; **không** bao gồm `table_id` trong composite key)
- **`areas`** (khu vực bàn, scoped `tenant_id + store_id`, unique `name` per store — FR45)
- **`tables`** (thuộc `area`, fields: `name`, `capacity`, `sort_order`, `is_active`, scoped `tenant_id + store_id` — FR46)

**Lưu ý table config:** không có version monotonic cho `areas`/`tables` (đơn giản hóa MVP — floor-plan đổi không thường xuyên). POS pull `GET /tables` mỗi lần focus tab; có thể nâng cấp `tableConfigVersion` sau nếu cần.

### Xác thực & Bảo mật

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Auth library | **@nestjs/passport + passport-jwt** | Pattern strategy chuẩn NestJS; AuthGuard dễ tái sử dụng |
| Token chiến lược | **Single access token JWT, TTL 7 ngày**, lưu IndexedDB (không tách hai loại token) | Đơn giản hóa: access token vừa làm Bearer cho API online vừa làm gate cho offline flow. Client check `exp` trước mỗi thao tác. Khớp NFR17 đúng 7 ngày, NFR7 không lưu mật khẩu. **Trade-off:** token sống lâu hơn → blast radius XSS lớn hơn — bắt buộc CSP nghiêm + không `dangerouslySetInnerHTML` + sanitize input |
| Refresh token | **Rotating, HttpOnly Secure cookie**; bảng `refresh_tokens` server-side cho revocation (FR5, NFR10) | Cần thiết để admin thu hồi phiên (NFR10). Khi online, /refresh rotate access token mới; khi offline, dùng access token IndexedDB cho đến khi `exp` |
| Password hash | **bcrypt** (cost factor 12) | Quen thuộc, hệ sinh thái lớn; chấp nhận được cho MVP |
| Token storage client | **Refresh token: HttpOnly Secure cookie** • **Access token (7 ngày): IndexedDB** | Refresh trong cookie an toàn nhất; access trong IndexedDB chấp nhận trade-off XSS-readable để hỗ trợ reload offline (mitigation: CSP nghiêm ngặt, không `dangerouslySetInnerHTML`, không `localStorage`) |
| Authorization | RBAC qua `@Roles('admin'|'cashier')` decorator + Guard | FR7 role-routing, FR5 admin revocation |
| HTTPS | Bắt buộc qua reverse proxy (nginx/caddy) trong dev; production để sau | NFR9 |

### API & Mẫu Giao tiếp

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| API style | **REST + @nestjs/swagger** (OpenAPI 3) | Auto-gen OpenAPI từ decorator; URL versioned `/api/v1/...` |
| Response envelope | **Success: plain JSON • Error: RFC 7807 Problem Details** (`application/problem+json`) | Field `type` URI ổn định cho FE phân loại; tích hợp NestJS exception filter; hỗ trợ `trace_id` cho ops |
| Idempotent sync endpoint | `POST /api/v1/orders` dedupe theo `(tenant_id, store_id, device_id, client_order_id)`; replay trả `200 OK` với `idempotent_replay: true` | NFR13 |
| Menu pull endpoint | `GET /api/v1/menu?since_version=N` → trả delta hoặc full snapshot tuỳ điều kiện | FR34–FR36 |
| Reporting endpoint | `GET /api/v1/reports?from=...&to=...&metric=...` (server aggregate) | NFR6 < 5 giây cho khoảng 30 ngày |
| Error filter chung | Global `ProblemDetailsExceptionFilter`; sanitize `detail`; raw stack chỉ vào Pino log + `trace_id` trả về client | NFR12 |
| Rate limiting | `@nestjs/throttler` cho `/auth/login` và `/auth/refresh` | Phòng brute force |
| CSRF | Áp dụng cho `/auth/refresh` (cookie-based) qua `csurf` hoặc double-submit token | Hỗ trợ HttpOnly cookie an toàn |

### Kiến trúc Frontend

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| State management | **3-tier:** Dexie+useLiveQuery (POS data + offline) · TanStack Query (Admin server-state) · Zustand (UI state) | Dexie làm source of truth offline-first; TanStack Query có persistedQuery cache; Zustand cho cart/modal/connectivity |
| UI library | **shadcn/ui + Tailwind + Radix UI** | Copy-paste flexible; kiểm soát toàn diện; Tailwind utility |
| Routing | **React Router v7** (data routers) | Ổn định cho SPA-PWA; tách `/pos`, `/admin/*`, `/login` rõ ràng |
| Styling | **Tailwind CSS** | Đi kèm shadcn; utility-first; dễ áp dụng performance budget |
| Forms | **React Hook Form + Zod resolver** | Performance cao cho form Admin lớn; chia sẻ Zod schema |
| Bổ sung Admin | **TanStack Table** (data grid), **react-day-picker** (FR37 date-range), **sonner** (toast), **date-fns** (xử lý ngày) | shadcn không có sẵn; cần lắp thêm cho Admin |
| PWA tooling | **vite-plugin-pwa + Workbox** (đã có sẵn từ create-pwa starter) | Service Worker cache shell + assets; React virtual module `virtual:pwa-register/react` cho update prompt |
| Sync engine | Custom service đọc Dexie `pending_sync` queue, post lên `/api/v1/orders`, retry exponential backoff, kích hoạt qua `online` event + manual button (FR23) | NFR16, FR22 |
| Connectivity | Hook `useConnectivity()` (ping `/health` + `navigator.onLine`); store Zustand `connectivityStore` | FR24 |
| Code splitting | Route-based lazy load (`/admin` chunk tách khỏi `/pos`) | NFR1 < 2s/3G — POS shell phải gọn |

### Hạ tầng & Triển khai

| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Local dev DB | **Docker Compose** + PostgreSQL 16 | FR41 |
| Migration | **Prisma Migrate** (`npx prisma migrate dev`) | FR42; tracking schema qua `prisma/migrations/` |
| Seed | **`prisma/seed.ts` chạy qua `prisma db seed`** | FR43; tenant + store + admin + cashier + 4–6 categories + 20–30 products + option groups + sample synced orders |
| Logging | **Pino qua nestjs-pino** | JSON-structured; request-id middleware; gắn `trace_id` vào response 5xx |
| Hot reload | NestJS `start:dev` (sẵn từ CLI) + Vite HMR | DX |
| Test | Vitest (FE), Jest (BE — sẵn NestJS) | Setup nhẹ |
| Lint/Format | ESLint + Prettier ở cả 2 repo | DX |
| Production deploy | **Out of scope MVP** | PRD |

### Phân tích Tác động Quyết định

**Trình tự implementation:**

1. Khởi tạo 2 repo bằng starter (story đầu tiên)
2. Server: Prisma schema → migration → seed → auth module → menu module → orders sync module → reports module
3. Client: layout shell + PWA → auth (access token IndexedDB + refresh cookie) → Dexie schema + sync engine → POS UI → Admin UI → reports
4. End-to-end smoke test offline + online
5. **Table management (Epic 6, brownfield expansion):** schema `areas`/`tables` + `stores.table_mode` + `orders.table_id`/`table_name_snapshot` → CRUD admin (`/areas`, `/tables`) → `stores/me` + `tables/status` endpoint → POS Floor-plan view + table picker (entry point khi `tableMode=true`) → Quick-counter button (FR47b) → brownfield patch các story 2-4..2-8 + 3-1 để table-aware (snapshot, Dexie schema, receipt, admin nav) → mode toggle integration

**Phụ thuộc giữa các quyết định:**

- Prisma schema **drives** Zod schema chia sẻ → DTO server class-validator phải khớp Zod FE
- Dexie schema **mirror** Prisma schema cho menu cache + pending orders, không khớp 100% (chỉ field cần offline)
- RFC 7807 envelope ⇒ FE error handler **một nơi** map `type` URI → action (redirect login, show toast, retry)
- Single access token 7 ngày trong IndexedDB ⇒ AuthInterceptor đính Bearer từ IndexedDB; khi 401 thử /refresh (cookie); khi offline đọc trực tiếp `exp` để gate UX
- Multi-tenant middleware (Prisma `$extends`) ⇒ mọi service backend tự động scope; **không có endpoint nào bypass**
- shadcn copy-paste ⇒ team commit code component trực tiếp; cập nhật phải re-run shadcn CLI thủ công

## Mẫu Triển khai & Quy tắc Nhất quán

### Điểm Xung đột Tiềm tàng đã Xác định

Tổng cộng **6 nhóm** quy tắc cần tuân thủ để mọi agent/developer viết code tương thích: naming, structure, format, communication, process, enforcement.

### Mẫu Đặt tên

#### Database (PostgreSQL qua Prisma)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Tên bảng | `snake_case`, **số nhiều** (qua `@@map`) | `users`, `order_items`, `option_groups` |
| Tên cột | `snake_case` (qua `@map`) | `tenant_id`, `created_at`, `client_order_id` |
| Khoá chính | luôn tên `id`, kiểu `UUID v7` | `id UUID PRIMARY KEY` |
| Khoá ngoại | `<bảng_tham_chiếu>_id` (singular) | `tenant_id`, `product_id` |
| Index | `idx_<bảng>_<cột>` | `idx_orders_client_order_id` |
| Unique constraint | `uq_<bảng>_<cột>` hoặc `uq_<bảng>_<a>_<b>` | `uq_sync_log_tenant_store_device_client` |
| Timestamp chuẩn | `created_at`, `updated_at` (timestamptz) | có ở mọi bảng business |
| Soft delete | KHÔNG dùng cho MVP — đơn append-only, void riêng | — |

#### Prisma model (TypeScript layer)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Model name | `PascalCase`, **số ít** | `User`, `OrderItem`, `OptionGroup` |
| Field name | `camelCase` (Prisma chuyển từ snake_case DB) | `tenantId`, `createdAt`, `clientOrderId` |
| Enum | `PascalCase` cho enum, `PascalCase` cho member | `OrderStatus.Pending` |

#### API REST

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Path resource | `kebab-case`, **số nhiều** | `/api/v1/orders`, `/api/v1/option-groups` |
| Versioning | URL prefix `/api/v1/...` | bắt buộc |
| Path parameter | `:id` UUID v7 | `/api/v1/orders/:id` |
| Query parameter | `snake_case` (đồng nhất với URL convention) | `?since_version=10&from=2026-05-01` |
| Custom header | `X-<PascalCase-With-Dashes>` | `X-Trace-Id`, `Idempotency-Key` |
| Status code | 200/201/204/400/401/403/404/409/422/429/500 — không tự chế | 201 cho create thành công |
| Idempotency-Key header | luôn dùng cho `POST /orders`; giá trị = `client_order_id` UUID | `Idempotency-Key: a3f...` |

#### Code TypeScript (cả 2 repo)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| File component React | `kebab-case.tsx` | `product-card.tsx`, `cart-panel.tsx` |
| File NestJS | `<feature>.<type>.ts` | `auth.controller.ts`, `create-order.dto.ts` |
| Component React | `PascalCase` | `ProductCard`, `CartPanel` |
| Hook React | `camelCase` với prefix `use` | `useConnectivity`, `usePendingOrders` |
| Function | `camelCase`, động từ ở đầu | `syncPendingOrders()`, `formatVnd()` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_PENDING_ORDERS`, `SYNC_RETRY_BASE_MS` |
| Type/Interface | `PascalCase`, không tiền tố `I` | `Order`, `SyncPayload` (KHÔNG `IOrder`) |
| Enum TS | `PascalCase` | `OrderStatus.Pending` |
| Boolean variable | prefix `is`/`has`/`should` | `isOnline`, `hasPendingSync`, `shouldRetry` |

### Mẫu Cấu trúc

#### Repo `pos-api` (NestJS)

```text
pos-api/
├── src/
│   ├── main.ts                          # bootstrap, global filter, CORS, helmet
│   ├── app.module.ts
│   ├── prisma/
│   │   └── prisma.service.ts            # extends PrismaClient với $extends multi-tenant
│   ├── common/
│   │   ├── filters/problem-details.filter.ts
│   │   ├── interceptors/logging.interceptor.ts
│   │   ├── decorators/{roles,current-user,tenant-context}.decorator.ts
│   │   ├── guards/{jwt-auth,roles}.guard.ts
│   │   └── middleware/tenant-scope.middleware.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/jwt.strategy.ts
│   │   └── dto/{login,refresh}.dto.ts
│   ├── users/
│   ├── menu/                             # categories, products, option_groups, options
│   ├── orders/                           # sync POST + void
│   ├── reports/
│   └── health/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/                                 # e2e tests (NestJS convention)
├── docker-compose.yml
└── package.json
```

#### Repo `pos-web` (Vite + React + PWA)

```text
pos-web/
├── src/
│   ├── main.tsx                          # đăng ký SW qua virtual:pwa-register/react
│   ├── App.tsx
│   ├── routes/
│   │   ├── _layout.tsx                   # shell + connectivity indicator
│   │   ├── login/
│   │   ├── pos/                          # POS surface (cashier)
│   │   └── admin/                        # Admin surface (menu, reports)
│   ├── features/
│   │   ├── auth/{api,hooks,stores,types}.ts
│   │   ├── menu/{api,hooks,stores,types}.ts
│   │   ├── orders/{api,hooks,stores,types}.ts
│   │   ├── sync/{engine,retry,events}.ts
│   │   └── reports/
│   ├── shared/
│   │   ├── components/ui/                # shadcn copy-paste
│   │   ├── components/layout/
│   │   ├── lib/{api-client,error-mapper,format-vnd,date}.ts
│   │   ├── hooks/{use-connectivity,use-debounce}.ts
│   │   └── stores/{connectivity,session}.store.ts
│   ├── db/
│   │   ├── dexie.ts                      # Dexie instance
│   │   └── schemas/{orders,menu,session}.ts
│   └── styles/{globals.css,tailwind.css}
├── public/{icons,manifest}/
├── tests/                                # Vitest
├── vite.config.ts
└── package.json
```

#### Vị trí test

- **Backend (NestJS):** unit `.spec.ts` co-located cạnh source; e2e ở `test/` (chuẩn NestJS).
- **Frontend (Vite):** unit `.test.ts(x)` co-located cạnh source; e2e (sau MVP) sẽ ở `tests/e2e/`.

### Mẫu Format

#### JSON field naming (boundary)

- **DB columns:** `snake_case` (`client_order_id`)
- **Prisma model fields:** `camelCase` (`clientOrderId`)
- **API request/response payload:** `camelCase` (`clientOrderId`) — đồng nhất với TypeScript idiomatic
- **Hệ quả:** không cần serialize transform riêng; Prisma + NestJS đã đồng nhất camelCase ở boundary

#### Date/Time

- **API:** ISO 8601 với timezone, format `YYYY-MM-DDTHH:mm:ss.sssZ` (UTC)
- **DB:** `timestamptz` (PostgreSQL)
- **UI:** display qua `date-fns` với locale `vi`; format `dd/MM/yyyy HH:mm` cho người dùng
- **Reports date-range:** đầu vào ISO date `YYYY-MM-DD`; server tự xử lý timezone Asia/Ho_Chi_Minh

#### Tiền (VND)

- **Lưu trữ:** integer (đồng) — VND không có đơn vị nhỏ hơn; KHÔNG dùng float
- **Field:** `unit_price`, `option_price_delta`, `line_total`, `discount_amount`, `total`
- **Hiển thị:** `formatVnd(45000)` → `"45.000 ₫"`

#### Boolean & null

- Dùng `true`/`false`, không bao giờ `1/0`
- `null` cho "không có giá trị" trong DB; `undefined` cho "chưa load" ở client
- Tránh union `boolean | null` — dùng enum 3 trạng thái nếu cần

### Mẫu Giao tiếp

#### Sự kiện client-side (Zustand actions, custom events)

- Action store: `camelCase`, động từ ở đầu (`setOnline`, `incrementPending`, `resetCart`)
- Custom event name: `domain.action` chữ thường, dot-separated (`sync.completed`, `order.finalized`, `auth.expired`)
- Payload event: `{ at: ISO_string, ...data }`

#### Mẫu sync payload (POS → Server)

```json
POST /api/v1/orders
Idempotency-Key: a3f8b2c1-...
{
  "clientOrderId": "a3f8b2c1-...",
  "deviceId": "POS01",
  "soldAt": "2026-05-09T03:23:11.000Z",
  "menuVersionAtSale": 12,
  "tableId": "uuid-or-null",
  "tableNameSnapshot": "Bàn 4",
  "items": [
    {
      "productId": "...",
      "productNameSnapshot": "Bạc Xỉu",
      "unitPriceSnapshot": 35000,
      "quantity": 1,
      "options": [
        { "optionId": "...", "labelSnapshot": "Size L", "priceDeltaSnapshot": 5000 }
      ],
      "note": "ít đường",
      "lineTotal": 40000
    }
  ],
  "discountAmount": 0,
  "total": 40000,
  "paymentMethod": "cash"
}
```

→ Tất cả field có hậu tố `Snapshot` là **bất biến** sau khi đơn được lưu (NFR14) — bao gồm `tableNameSnapshot`.

**Quy tắc table field trong payload (FR51):**

- `tableId` và `tableNameSnapshot` là **optional/nullable**. Khi `tableId = null` (quick-counter sale hoặc store ở counter-service mode), `tableNameSnapshot` cũng phải là `null`.
- `tableId` **KHÔNG** thuộc composite idempotency key `(tenant_id, store_id, device_id, client_order_id)`. Đổi bàn rồi resend cùng `clientOrderId` → server vẫn dedup, không tạo đơn thứ 2.
- Server validate `tableId` (nếu non-null) phải thuộc cùng `tenant_id + store_id` của user; nếu sai → 400 với `type = .../validation`.
- **Conflict offline (2 POS cùng chọn bàn 4):** MVP **chấp nhận** — cả 2 sync thành công, server log conflict qua `table_id` trùng với `synced_at` gần nhau, không lock realtime.

### Mẫu Quy trình

#### Xử lý lỗi (3 tầng)

1. **Server NestJS:** mọi route throw `HttpException` (hoặc subclass `BadRequestException`, `ConflictException`, …); global `ProblemDetailsFilter` format thành RFC 7807; sanitize `detail`; đính `traceId` lấy từ Pino request context.
2. **API client (Axios/fetch wrapper):** parse response `application/problem+json`, đẩy vào `errorMapper.ts`.
3. **errorMapper.ts (frontend):** map `type` URI → action:
   - `.../session-revoked` → clear session + redirect `/login`
   - `.../validation` → trả về object để form hiển thị field errors
   - `.../menu-version-stale` → trigger menu re-pull rồi retry
   - `.../internal` → toast "Đã có lỗi, vui lòng thử lại" + log `traceId`
   - default fallback → toast generic

#### Loading state

- **TanStack Query:** dùng `isLoading`, `isFetching`, `isError` trực tiếp — không tự tạo flag mới
- **Dexie useLiveQuery:** `undefined` = đang load → render skeleton/spinner cục bộ
- **Zustand:** chỉ flag UI (`isModalOpen`, `isCheckingOut`) — KHÔNG để loading server-state vào Zustand
- **Naming:** `isLoading` (action đang chạy), `isFetching` (refresh ngầm), `hasPendingSync` (có data chờ đồng bộ)

#### Vòng đời auth (client interceptor)

```text
Request gốc → AuthInterceptor đọc access token từ IndexedDB → đính Bearer
  ├─ Trước khi gửi: check exp trong access token
  │   └─ Nếu exp đã qua → emit auth.expired → redirect /login
  ├─ 200 → ok
  ├─ 401 (server thu hồi hoặc access invalid)
  │   → POST /auth/refresh (cookie HttpOnly tự gửi)
  │   ├─ thành công → ghi access token mới vào IndexedDB, retry request gốc 1 lần
  │   └─ thất bại → emit auth.expired → xoá access token IndexedDB → redirect /login
  └─ network error
      └─ check exp access token trong IndexedDB
          ├─ còn hạn → cho phép flow offline (đọc Dexie + queue write)
          └─ hết hạn → emit auth.expired → redirect /login
```

**Khi reload trang:**

- Đọc access token từ IndexedDB → check `exp` → nếu còn hạn → khởi động app như đã đăng nhập (kể cả khi offline)
- Nếu exp gần hết và đang online → optionally call /auth/refresh chủ động để rotate
- Nếu exp đã qua → redirect /login

#### Sync engine (background)

- **Trigger:** `online` event browser, `visibilitychange` (tab focus), interval `60s` khi online, manual button (FR23)
- **Đọc queue:** `db.orders.where({ status: 'pendingSync' })` qua Dexie
- **Push từng đơn:** sequential, không parallel (giữ thứ tự cho ops); mỗi đơn 1 POST với `Idempotency-Key`
- **Retry:** exponential backoff `1s, 2s, 4s, 8s, 16s` rồi tạm ngưng đến event tiếp theo
- **Cập nhật trạng thái:** thành công hoặc `idempotent_replay: true` → `status: 'synced'`, ghi `serverOrderId`; lỗi 4xx (validation) → `status: 'syncFailed'` + lý do; lỗi 5xx hoặc network → giữ `pendingSync`, retry sau

#### Validation 3 tầng

| Tầng | Công cụ | Mục tiêu |
|---|---|---|
| FE form | RHF + zodResolver | Hint sớm cho user, không cho submit không hợp lệ |
| API boundary | NestJS ValidationPipe + class-validator + class-transformer | Bảo vệ server khỏi payload sai định dạng |
| DB | Prisma constraint (NOT NULL, unique, FK) | Bảo vệ cuối cùng |

→ Không có tầng nào được bỏ qua; FE validation **không thay thế** server validation.

### Hướng dẫn Bắt buộc Thi hành

**Mọi AI agent / developer PHẢI:**

1. Tuân thủ naming convention DB / API / code đã định nghĩa — không tự đổi
2. Đặt nhiệm vụ business vào đúng feature module (`auth`, `menu`, `orders`, `reports`) — không lẫn vào `common/`
3. Thêm test cùng commit với code mới (unit tối thiểu cho service + controller + filter)
4. Mỗi field có `Snapshot` hậu tố hoặc cột DB `*_snapshot` là **immutable** sau insert — không UPDATE
5. Mọi truy vấn DB business **phải qua Prisma `$extends` multi-tenant middleware** — không bypass với raw query không có scope
6. Mọi response lỗi qua `ProblemDetailsFilter` — không trả `{ message, code }` thuần
7. Mọi date trong API là ISO 8601 UTC; mọi tiền là integer VND
8. Frontend không bao giờ store token vào `localStorage` hoặc `sessionStorage` (chỉ HttpOnly cookie cho refresh + IndexedDB cho access token 7 ngày); CSP nghiêm ngặt và không `dangerouslySetInnerHTML` để giảm risk XSS đọc token

**Cách kiểm tra tuân thủ:**

- ESLint custom rule (sau MVP) hoặc code review checklist
- Pre-commit hook (lefthook hoặc husky) chạy `prisma format` + `eslint --fix` + `prettier --write`
- CI chạy `prisma validate`, `tsc --noEmit`, lint, test với coverage tối thiểu 70% cho services/filters

### Ví dụ Đúng vs Sai (Anti-pattern)

#### Đúng — naming Prisma model

```prisma
model OrderItem {
  id                    String  @id @default(uuid())
  orderId               String  @map("order_id")
  productNameSnapshot   String  @map("product_name_snapshot")
  unitPriceSnapshot     Int     @map("unit_price_snapshot")
  createdAt             DateTime @default(now()) @map("created_at")

  @@map("order_items")
  @@index([orderId], map: "idx_order_items_order_id")
}
```

#### Sai — trộn convention

```prisma
model order_item {                  // sai: model phải PascalCase
  ID            String  @id        // sai: field PHẢI camelCase
  OrderId       String              // sai: phải camelCase và @map
  product_name  String              // sai: phải camelCase
}
```

#### Đúng — error response

```json
HTTP/1.1 409 Conflict
Content-Type: application/problem+json

{
  "type": "https://pos.example/errors/menu-version-stale",
  "title": "Phiên bản menu lạc hậu",
  "status": 409,
  "detail": "POS gửi đơn dùng menu_version=10 nhưng server đang ở 12",
  "instance": "/api/v1/orders",
  "clientMenuVersion": 10,
  "serverMenuVersion": 12,
  "traceId": "01HZX9..."
}
```

#### Sai — custom envelope không nhất quán

```json
{ "success": false, "error": "menu version stale", "code": 409 }
```

#### Đúng — finalize đơn (frontend)

```ts
// features/orders/api.ts
async function finalizeOrder(cart: Cart): Promise<LocalOrder> {
  const localOrder = buildLocalOrder(cart);    // gồm clientOrderId UUID v7, snapshots
  await db.orders.add({ ...localOrder, status: 'pendingSync' });
  syncEngine.kick();                            // không await — chạy nền
  return localOrder;
}
```

#### Sai — bypass Dexie + chờ network

```ts
async function finalizeOrder(cart: Cart) {
  return await axios.post('/orders', cart);    // sai: vỡ luồng offline-first
}
```

## Cấu trúc Dự án & Ranh giới

### Cây thư mục đầy đủ

#### Repo `pos-api` (NestJS + Prisma + PostgreSQL)

```text
pos-api/
├── README.md                              # cách run dev, migrate, seed (FR41–FR43)
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── nest-cli.json
├── .env                                   # NOT committed
├── .env.example                           # DATABASE_URL, JWT_*, OFFLINE_GRANT_*, COOKIE_*
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── docker-compose.yml                     # PostgreSQL 16, port 5432
├── Dockerfile                             # cho dev demo, không cho production
├── prisma/
│   ├── schema.prisma                      # SOURCE OF TRUTH cho schema
│   ├── migrations/                        # tự sinh qua `prisma migrate dev`
│   └── seed.ts                            # seed FR43
├── src/
│   ├── main.ts                            # bootstrap: helmet, CORS, ProblemDetailsFilter, ValidationPipe, swagger
│   ├── app.module.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts              # PrismaClient + $extends multi-tenant scope
│   ├── config/
│   │   ├── configuration.ts               # nạp env qua @nestjs/config
│   │   └── env.schema.ts                  # Zod schema validate env
│   ├── common/
│   │   ├── filters/
│   │   │   └── problem-details.filter.ts  # RFC 7807 global filter
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts     # Pino request log
│   │   │   └── timeout.interceptor.ts
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts         # @Roles('admin'|'cashier')
│   │   │   ├── current-user.decorator.ts  # @CurrentUser()
│   │   │   └── tenant-context.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── middleware/
│   │   │   └── tenant-scope.middleware.ts # gắn tenantId vào request từ JWT
│   │   ├── errors/
│   │   │   └── problem-types.ts           # constant URI cho RFC 7807 type field
│   │   └── utils/
│   │       └── trace-id.ts
│   ├── auth/                              # FR1–FR7, NFR7–NFR12, NFR17
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts             # POST /login, POST /refresh, POST /logout
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   ├── repositories/
│   │   │   └── refresh-token.repository.ts
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   └── refresh.dto.ts
│   │   └── auth.spec.ts
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.service.ts               # admin revocation FR5
│   │   └── users.spec.ts
│   ├── menu/                              # FR27–FR36
│   │   ├── menu.module.ts
│   │   ├── controllers/
│   │   │   ├── categories.controller.ts   # /api/v1/categories
│   │   │   ├── products.controller.ts     # /api/v1/products
│   │   │   ├── option-groups.controller.ts
│   │   │   └── menu-sync.controller.ts    # GET /api/v1/menu?since_version=N
│   │   ├── services/
│   │   │   ├── categories.service.ts
│   │   │   ├── products.service.ts
│   │   │   ├── option-groups.service.ts
│   │   │   └── menu-version.service.ts    # tăng menu_version trên mỗi mutation
│   │   ├── dto/
│   │   └── *.spec.ts
│   ├── orders/                            # FR19–FR26, NFR13, NFR14
│   │   ├── orders.module.ts
│   │   ├── orders.controller.ts           # POST /api/v1/orders, POST /api/v1/orders/:id/void
│   │   ├── orders.service.ts              # logic idempotent dedup
│   │   ├── repositories/
│   │   │   ├── orders.repository.ts
│   │   │   ├── order-items.repository.ts
│   │   │   └── sync-log.repository.ts     # idempotency trên (tenantId,storeId,deviceId,clientOrderId)
│   │   ├── dto/
│   │   │   ├── sync-order.dto.ts
│   │   │   └── void-order.dto.ts
│   │   └── *.spec.ts
│   ├── reports/                           # FR37–FR40, NFR6
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts          # GET /api/v1/reports?from&to&metric
│   │   ├── reports.service.ts             # raw SQL aggregation Prisma + materialized cache
│   │   └── *.spec.ts
│   ├── tables/                            # FR44–FR52 (Epic 6 — table management)
│   │   ├── tables.module.ts
│   │   ├── controllers/
│   │   │   ├── areas.controller.ts        # /api/v1/areas
│   │   │   ├── tables.controller.ts       # /api/v1/tables, /api/v1/tables/status
│   │   │   └── stores.controller.ts       # /api/v1/stores/me (trả tableMode)
│   │   ├── services/
│   │   │   ├── areas.service.ts
│   │   │   ├── tables.service.ts          # CRUD + occupancy derive từ orders
│   │   │   └── store-config.service.ts    # toggle tableMode
│   │   ├── repositories/
│   │   │   ├── areas.repository.ts
│   │   │   └── tables.repository.ts
│   │   ├── dto/
│   │   └── *.spec.ts
│   └── health/
│       ├── health.module.ts
│       └── health.controller.ts           # GET /health (cho FE ping connectivity)
├── test/
│   ├── jest-e2e.json
│   ├── auth.e2e-spec.ts                   # login → refresh → /me happy path
│   ├── orders.e2e-spec.ts                 # idempotent replay scenario
│   └── menu-sync.e2e-spec.ts              # versioned pull
└── coverage/                              # ignored
```

#### Repo `pos-web` (Vite 7 + React 18 + PWA)

```text
pos-web/
├── README.md
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts                         # vite-plugin-pwa config
├── tailwind.config.ts
├── postcss.config.js
├── components.json                        # shadcn config
├── .env                                   # NOT committed
├── .env.example                           # VITE_API_BASE_URL
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── index.html
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── maskable-512.png
│   └── favicon.ico
├── src/
│   ├── main.tsx                           # React root + đăng ký SW + provider tree
│   ├── App.tsx                            # router
│   ├── routes/
│   │   ├── _layout.tsx                    # shell + connectivity indicator + pending counter (FR24)
│   │   ├── login/
│   │   │   ├── login-page.tsx             # FR1
│   │   │   └── login-form.tsx
│   │   ├── pos/                           # /pos — cashier surface
│   │   │   ├── pos-page.tsx               # 2-column layout
│   │   │   ├── product-grid.tsx           # FR8
│   │   │   ├── product-search.tsx         # FR9
│   │   │   ├── option-modal.tsx           # FR10–FR11
│   │   │   ├── cart-panel.tsx             # FR12–FR14, FR17
│   │   │   ├── checkout-panel.tsx         # FR15–FR16
│   │   │   └── receipt-modal.tsx          # FR18
│   │   └── admin/
│   │       ├── _layout.tsx                # FR50 nav gating (hiển thị "Quản lý bàn" khi tableMode=true)
│   │       ├── menu/
│   │       │   ├── categories-page.tsx    # FR27
│   │       │   ├── products-page.tsx      # FR28, FR31, FR32, FR33
│   │       │   ├── option-groups-page.tsx # FR29, FR30
│   │       │   └── _shared/
│   │       ├── reports/
│   │       │   ├── reports-page.tsx       # FR37–FR40
│   │       │   └── date-range-picker.tsx
│   │       ├── tables/                    # Epic 6 admin pages
│   │       │   ├── areas-page.tsx         # FR45 (UX-DR-T6/T11)
│   │       │   └── tables-page.tsx        # FR46 (UX-DR-T5/T11)
│   │       └── store-config/
│   │           └── store-config-page.tsx  # FR44 toggle tableMode (UX-DR-T8/T9/T10)
│   ├── features/
│   │   ├── auth/
│   │   │   ├── api.ts                     # POST /auth/login, /refresh
│   │   │   ├── stores.ts                  # session zustand store (current user info, derived từ access token)
│   │   │   ├── hooks.ts                   # useAuth, useRequireRole
│   │   │   ├── token-store.ts             # đọc/ghi access token IndexedDB + check exp
│   │   │   ├── interceptor.ts             # axios interceptor: đính Bearer từ IndexedDB; 401 → /refresh → retry hoặc redirect
│   │   │   └── types.ts
│   │   ├── menu/
│   │   │   ├── api.ts                     # GET /menu?since_version
│   │   │   ├── sync.ts                    # versioned pull, ghi vào Dexie
│   │   │   ├── hooks.ts                   # useCategories, useProducts (TanStack Query + Dexie)
│   │   │   └── types.ts
│   │   ├── orders/
│   │   │   ├── builder.ts                 # buildLocalOrder(cart) → snapshot
│   │   │   ├── api.ts                     # POST /orders với Idempotency-Key
│   │   │   ├── hooks.ts                   # usePendingOrders (Dexie useLiveQuery)
│   │   │   └── types.ts
│   │   ├── sync/
│   │   │   ├── engine.ts                  # background sync FSM
│   │   │   ├── retry.ts                   # exponential backoff
│   │   │   ├── triggers.ts                # online event, visibilitychange, interval
│   │   │   └── events.ts
│   │   ├── reports/
│   │   │   ├── api.ts
│   │   │   └── hooks.ts
│   │   └── tables/                        # FR44–FR52 (Epic 6 — table management)
│   │       ├── api.ts                     # GET /areas, /tables, /tables/status, /stores/me
│   │       ├── hooks.ts                   # useAreas, useTables, useTableStatus, useTableMode
│   │       ├── store.ts                   # Zustand: selectedAreaId, selectedTableId (cart context)
│   │       ├── components/
│   │       │   ├── table-picker.tsx       # UX-DR-T1 modal/dropdown
│   │       │   ├── floor-plan-view.tsx    # UX-DR-T2 grid by area, entry point khi tableMode=true
│   │       │   ├── table-card.tsx         # UX-DR-T4 ô bàn với status badge
│   │       │   └── area-tabs.tsx          # UX-DR-T3 tab khu vực
│   │       └── types.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── ui/                        # shadcn copy-paste (button, dialog, input, etc.)
│   │   │   └── layout/
│   │   │       ├── connectivity-indicator.tsx
│   │   │       ├── pending-counter.tsx
│   │   │       └── role-gate.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts              # axios instance + interceptor
│   │   │   ├── error-mapper.ts            # RFC 7807 type → action
│   │   │   ├── format-vnd.ts
│   │   │   ├── date.ts                    # date-fns wrappers locale vi
│   │   │   ├── uuid.ts                    # UUID v7 generator
│   │   │   └── order-code.ts              # YYYYMMDD-POSXX-NNNN (FR19)
│   │   ├── hooks/
│   │   │   ├── use-connectivity.ts        # ping /health + navigator.onLine
│   │   │   ├── use-debounce.ts
│   │   │   └── use-print.ts               # window.print wrapper FR18
│   │   └── stores/
│   │       ├── connectivity.store.ts
│   │       └── ui.store.ts                # modal, drawer, toasts
│   ├── db/
│   │   ├── dexie.ts                       # Dexie instance, version migration
│   │   └── schemas/
│   │       ├── orders.ts                  # bảng pending_orders
│   │       ├── menu.ts                    # bảng cached menu
│   │       └── session.ts                 # bảng access token (jwt 7 ngày) + user info derived
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.css
│   └── types/
│       └── api.ts                         # shared types với BE qua copy hoặc shared package sau
├── tests/
│   ├── setup.ts
│   ├── orders.builder.test.ts
│   ├── sync.engine.test.ts
│   └── error-mapper.test.ts
└── dist/                                  # build output, ignored
```

### Ánh xạ Yêu cầu → Cấu trúc

#### Backend (NestJS) — FR Coverage

| FR Group | Module | Files chính |
|---|---|---|
| FR1–FR7 (Auth & Session) | `src/auth/` | `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `refresh-token.repository.ts` |
| FR19–FR26 (Orders + Sync + Void) | `src/orders/` | `orders.controller.ts`, `orders.service.ts`, `sync-log.repository.ts` |
| FR27–FR33 (Menu CRUD Admin) | `src/menu/` | `categories.controller.ts`, `products.controller.ts`, `option-groups.controller.ts` |
| FR34–FR36 (Menu Sync POS←Server) | `src/menu/` | `menu-sync.controller.ts`, `menu-version.service.ts` |
| FR37–FR40 (Reports) | `src/reports/` | `reports.controller.ts`, `reports.service.ts` |
| FR41–FR43 (Local Demo) | `prisma/`, `docker-compose.yml`, `prisma/seed.ts` | `schema.prisma`, `seed.ts` (mở rộng: 1 store mode-off + 1 store mode-on + 2 areas + 8 tables) |
| FR44–FR52 (Table Management) | `src/tables/`, `prisma/schema.prisma` | `areas.controller.ts`, `tables.controller.ts`, `stores.controller.ts` (`/stores/me`); models `Area`, `Table`; cột `stores.table_mode`, `orders.table_id`, `orders.table_name_snapshot` |
| NFR7–NFR12 (Security) | `src/common/`, `src/auth/` | `jwt-auth.guard.ts`, `roles.guard.ts`, `problem-details.filter.ts` |
| NFR13 (Idempotency) | `src/orders/` | `sync-log.repository.ts` (unique constraint — không bao gồm `table_id`) |
| NFR14 (Snapshot immutability) | `src/orders/`, `prisma/schema.prisma` | snapshot fields + service không có UPDATE method cho `*_snapshot` (gồm `table_name_snapshot`) |
| NFR18 (Mode toggle no redeploy) | `src/tables/`, `features/auth/` | `store-config.service.ts` toggle DB; FE đọc `tableMode` qua `/stores/me` khi login/reload |

#### Frontend (Vite + React) — FR Coverage

| FR Group | Route/Feature | Files chính |
|---|---|---|
| FR1, FR6 (Login + redirect) | `routes/login/` | `login-page.tsx`, `login-form.tsx` |
| FR2, FR3, FR4 (Session offline + refresh) | `features/auth/`, `db/schemas/session.ts` | `interceptor.ts`, `stores.ts` |
| FR7 (Role routing) | `shared/components/layout/role-gate.tsx` | gate component |
| FR8–FR18 (POS UI) | `routes/pos/` | tất cả components dưới `pos/` |
| FR19–FR23 (Local order + sync) | `features/orders/`, `features/sync/` | `builder.ts`, `engine.ts`, `retry.ts` |
| FR24 (Connectivity indicator) | `shared/components/layout/connectivity-indicator.tsx` | indicator + `useConnectivity` |
| FR25 (Lỗi sync nội bộ) | `features/sync/engine.ts`, `shared/lib/error-mapper.ts` | log nội bộ, không lộ ra UI |
| FR26 (Void) | `features/orders/api.ts` | gọi `POST /orders/:id/void` |
| FR27–FR33 (Admin menu CRUD) | `routes/admin/menu/` | từng page CRUD |
| FR34–FR36 (Pull menu) | `features/menu/sync.ts` | versioned pull, ghi Dexie |
| FR37–FR40 (Reports) | `routes/admin/reports/` | `reports-page.tsx`, `date-range-picker.tsx` |
| FR44 (Mode toggle) | `routes/admin/store-config/`, `features/auth/stores.ts` | toggle UI + cache `tableMode` từ `/stores/me` |
| FR45, FR46 (CRUD area/bàn) | `routes/admin/tables/`, `features/tables/api.ts` | `areas-page.tsx`, `tables-page.tsx` (AdminDataTable + form dialog) |
| FR47, FR47b, FR48 (POS dual-flow) | `routes/pos/`, `features/tables/store.ts` | floor-plan entry routing; quick-counter button; cart store mở rộng `tableId`/`tableNameSnapshot` |
| FR49, FR50 (Table picker + floor-plan) | `features/tables/components/` | `table-picker.tsx`, `floor-plan-view.tsx`, `table-card.tsx`, `area-tabs.tsx` |
| FR51 (Order snapshot table) | `features/orders/builder.ts`, `db/schemas/orders.ts` | `buildLocalOrder()` thêm `tableId` + `tableNameSnapshot`; Dexie schema thêm 2 field |
| FR52 (Receipt hiển thị bàn) | `routes/pos/receipt-modal.tsx` | hiển thị "Bàn X" nếu `tableNameSnapshot` non-null |
| NFR1, NFR5 (Performance) | `vite.config.ts`, `routes/admin/_layout.tsx` | code-split admin lazy |
| NFR15 (Persist offline orders) | `db/dexie.ts`, `db/schemas/orders.ts` | Dexie persist |
| NFR18 (Mode toggle no redeploy) | `features/tables/hooks.ts`, `routes/admin/store-config/` | `useTableMode()` đọc từ session store; toggle qua admin UI, áp dụng sau reload session |

### Ranh giới Kiến trúc

#### Ranh giới API (HTTP boundary)

| Endpoint | Method | Auth | Module | FR |
|---|---|---|---|---|
| `/api/v1/auth/login` | POST | none | auth | FR1, FR2 (trả access token 7 ngày + set refresh cookie) |
| `/api/v1/auth/refresh` | POST | cookie + CSRF | auth | FR4 (rotate access token mới) |
| `/api/v1/auth/logout` | POST | bearer | auth | — |
| `/api/v1/auth/sessions/:id/revoke` | POST | bearer + admin | auth | FR5, NFR10 |
| `/api/v1/categories` | GET/POST/PATCH/DELETE | bearer + admin | menu | FR27 |
| `/api/v1/products` | GET/POST/PATCH/DELETE | bearer + admin | menu | FR28, FR31–FR33 |
| `/api/v1/option-groups` | GET/POST/PATCH/DELETE | bearer + admin | menu | FR29, FR30 |
| `/api/v1/menu` | GET (`?since_version=N`) | bearer | menu | FR34–FR36 |
| `/api/v1/orders` | POST | bearer + Idempotency-Key | orders | FR21–FR23, NFR13 |
| `/api/v1/orders/:id/void` | POST | bearer + cashier/admin | orders | FR26 |
| `/api/v1/reports` | GET (`?from&to&metric`) | bearer + admin | reports | FR37–FR40 |
| `/api/v1/areas` | GET/POST/PATCH/DELETE | bearer + admin | tables | FR45 (CRUD khu vực) |
| `/api/v1/tables` | GET/POST/PATCH/DELETE | bearer + admin | tables | FR46 (CRUD bàn, FK→area) |
| `/api/v1/tables/status` | GET | bearer | tables | FR50 (occupancy derive từ `orders` chưa void trong ngày; polling 30s khi POS ở floor-plan view) |
| `/api/v1/stores/me` | GET | bearer | stores | FR44 (FE đọc `tableMode` khi login/reload — NFR18) |
| `/health` | GET | none | health | (connectivity) |
| `/api/docs` | GET | none (dev) | swagger | DX |

Tất cả response lỗi đi qua `ProblemDetailsFilter` (RFC 7807).

#### Ranh giới Component Frontend

```text
┌─────────────────────────────────────────────────────────────┐
│                      routes/ (UI shell)                     │
│       ┌──────────────┬──────────────┬─────────────┐         │
│       │  /login      │  /pos        │  /admin     │         │
│       └──────┬───────┴──────┬───────┴──────┬──────┘         │
│              │              │              │                │
│     ┌────────▼────────┐ ┌──▼──────┐ ┌─────▼──────┐          │
│     │  features/auth  │ │features/│ │ features/  │          │
│     │                 │ │ orders  │ │ menu       │          │
│     │                 │ │ sync    │ │ reports    │          │
│     └────────┬────────┘ └──┬──────┘ └─────┬──────┘          │
│              │             │              │                  │
│  ┌───────────▼─────────────▼──────────────▼─────────────┐   │
│  │  shared/  (components/ui, lib, hooks, stores)        │   │
│  └───┬────────────────────────────────────────┬─────────┘   │
│      │                                        │             │
│  ┌───▼───────┐                       ┌────────▼─────────┐   │
│  │  db/      │                       │  shared/lib/     │   │
│  │  Dexie    │                       │  api-client      │   │
│  │  (offline)│                       │  (HTTP boundary) │   │
│  └───────────┘                       └────────┬─────────┘   │
└────────────────────────────────────────────────┼────────────┘
                                                  │
                                          (HTTPS REST)
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  pos-api        │
                                         │  (NestJS)       │
                                         └─────────────────┘
```

**Quy tắc:**

- `routes/` chỉ import từ `features/` và `shared/`
- `features/<X>/` chỉ import từ `shared/` và `db/`; KHÔNG import lẫn nhau (auth ↔ orders không được import trực tiếp; nếu cần dùng session info, đi qua hook `useAuth()` ở `features/auth/hooks.ts`)
- `shared/` không bao giờ import `features/` hoặc `routes/`
- `db/` chỉ được dùng từ `features/<X>/` — tránh component component gọi Dexie trực tiếp

#### Ranh giới Component Backend

```text
                  HTTP request
                       │
                       ▼
              ┌────────────────┐
              │  Controller    │  ← class-validator DTO, @Roles, @CurrentUser
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Service       │  ← business logic, idempotency, snapshot
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  Repository    │  ← Prisma calls
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  PrismaService │  ← $extends multi-tenant scope (auto tenantId)
              └────────┬───────┘
                       │
                       ▼
              ┌────────────────┐
              │  PostgreSQL    │
              └────────────────┘
```

**Quy tắc:**

- Controller KHÔNG gọi Repository trực tiếp — phải qua Service
- Service KHÔNG truy cập `req`/`res` — chỉ nhận DTO + context (tenantId, userId)
- Repository chỉ chứa Prisma queries; không có business logic
- PrismaService là singleton; mọi service inject vào

#### Ranh giới Dữ liệu

| Kho dữ liệu | Vị trí | Truy cập qua | Ghi chú |
|---|---|---|---|
| PostgreSQL | server | Prisma + multi-tenant `$extends` | Source of truth; append-only orders |
| IndexedDB (Dexie) | client | `features/<X>/api.ts` + `db/schemas/*` | Source of truth offline; mirror partial Prisma |
| HttpOnly cookie | browser | trình duyệt tự gửi với /auth/refresh | Refresh token; CSRF-protected |
| In-memory (Zustand session store) | client tab | `features/auth/stores.ts` | Access token; mất khi reload — phải /refresh để lấy lại |
| `localStorage` | — | **KHÔNG dùng cho token** | Chỉ dùng cho preference UI nếu cần |

### Điểm Tích hợp

#### Giao tiếp nội bộ

- **Tab POS với Service Worker:** SW bắt request và serve cached shell + assets; SW không proxy request `/api/v1/...` (để client trực tiếp xử lý retry)
- **Sync engine với UI:** sync engine chạy trong main thread (không Web Worker cho MVP); UI subscribe qua `useLiveQuery(db.orders.where('status').equals('pendingSync'))` để có pending counter realtime
- **Auth interceptor với errorMapper:** interceptor parse RFC 7807 và emit event `auth.expired` → router redirect

#### Tích hợp bên ngoài

- **PostgreSQL** qua Prisma (single connection pool, max 10 cho dev)
- **Trình duyệt print API** (FR18): `window.print()` với CSS `@media print` riêng cho receipt
- **Service Worker / Workbox** (PWA): cache shell, app assets, offline fallback page
- Không có cổng thanh toán, kitchen display, ESC/POS — out of scope MVP

#### Luồng dữ liệu chính

**1. Bán hàng online (HT1):**

```text
User → ProductGrid → Cart (Zustand) → Checkout → buildLocalOrder()
  → db.orders.add({status: 'pendingSync'}) → syncEngine.kick()
  → POST /api/v1/orders với Idempotency-Key
  → Response 200 → db.orders.update({status: 'synced', serverOrderId})
  → Toast + Receipt → window.print()
```

**2. Bán hàng offline (HT2):**

```text
User → Checkout → buildLocalOrder() → db.orders.add({status: 'pendingSync'})
  → syncEngine.kick() → fetch fail → giữ pendingSync
  → useLiveQuery cập nhật pending counter +1
  ...
  online event → syncEngine.drain() → POST từng đơn → cập nhật synced
  → counter giảm về 0
```

**3. Admin sửa menu (HT3):**

```text
Admin → /admin/menu/products → form RHF + Zod
  → PATCH /api/v1/products/:id → menu-version.service tăng menu_version
  → Server response 200
  → POS (khi có mạng) → menu sync poll → GET /api/v1/menu?since_version=N
  → Response delta hoặc full → ghi Dexie menu cache
  → useLiveQuery cập nhật ProductGrid
  → Đơn cũ snapshot không đổi (NFR14)
```

**4. Báo cáo (HT4):**

```text
Admin → /admin/reports → DateRangePicker (from, to)
  → TanStack Query fetch GET /api/v1/reports?from=..&to=..&metric=..
  → Server raw SQL aggregation
  → Response { byDay[], totalOrders, byPaymentMethod[], topProducts[] }
  → Render bảng + biểu đồ (NFR6 < 5s)
```

### Mẫu Tổ chức File

#### File cấu hình

| File | Vị trí | Mục đích |
|---|---|---|
| `.env.example` | repo root | Template cho dev tự copy sang `.env` |
| `tsconfig.json` | repo root | Strict TypeScript, path alias |
| `eslintrc.cjs` | repo root | Lint rule |
| `prettierrc` | repo root | Format style |
| `vite.config.ts` / `nest-cli.json` | repo root | Build tool config |
| `tailwind.config.ts` | repo root (FE) | Theme + content path |
| `components.json` | repo root (FE) | shadcn config |
| `prisma/schema.prisma` | repo (BE) | Schema source of truth |
| `docker-compose.yml` | repo root (BE) | PostgreSQL local |

#### Source

- BE: feature module → controller/service/repository/dto trong cùng folder
- FE: routes (UI) ↔ features (logic) ↔ shared (utility) ↔ db (offline)

#### Test

- BE: `*.spec.ts` co-located + `test/*.e2e-spec.ts` cho e2e
- FE: `*.test.ts` co-located trong `tests/` cho cross-cutting

#### Asset

- FE: `public/icons/`, `public/manifest.webmanifest`, `public/favicon.ico`
- BE: không có static asset

### Tích hợp Workflow Phát triển

#### Dev server

- BE: `npm run start:dev` (NestJS watch mode, port 3000)
- FE: `npm run dev` (Vite, port 5173, proxy `/api/v1` → http://localhost:3000)
- DB: `docker compose up -d` (PostgreSQL port 5432)

#### Build

- BE: `npm run build` → `dist/` (NestJS bundle)
- FE: `npm run build` → `dist/` (Vite production bundle với SW precache)

#### Deploy

- **Out of scope MVP** — chỉ chạy demo cục bộ qua các lệnh dev server
- Để lại hooks (`Dockerfile` BE, `vite preview` FE) cho khả năng mở rộng tương lai

## Kết quả Xác thực Kiến trúc

### Xác thực Tính Nhất quán ✅

**Tương thích quyết định:**

- TypeScript ở cả 2 repo → DTO + Zod schema có thể chia sẻ qua copy hoặc shared package; không có cross-language friction
- Prisma 7 + PostgreSQL 16 + NestJS 11 → tổ hợp cùng generation, không có version conflict
- Vite 7 + React 18 + vite-plugin-pwa → starter `@vite-pwa/pwa` v1.x đã verify tương thích
- Dexie 4.x + TanStack Query + Zustand → ba tầng độc lập, không tranh chấp; Dexie qua useLiveQuery, TanStack qua persistedQuery, Zustand chỉ UI state
- @nestjs/passport + bcrypt + RFC 7807 + Pino → tổ hợp NestJS-idiomatic chuẩn
- shadcn + Tailwind + RHF + Zod → chuỗi này đi cùng nhau là pattern phổ biến nhất 2026

**Mâu thuẫn tiềm tàng và cách giải:**

| Mâu thuẫn | Trạng thái |
|---|---|
| FE chọn Zod, BE chọn class-validator → schema có thể trôi ra khỏi nhau | **Mitigation:** Zod schema cho FE form + sync payload; class-validator DTO cho NestJS boundary; copy Zod schema sang một thư mục `shared-contracts/` (sao chép thủ công cho MVP, đóng package nội bộ sau) |
| Single access token 7 ngày trong IndexedDB → blast radius XSS lớn (7 ngày) | **Mitigation:** CSP nghiêm ngặt (`script-src 'self'`, `object-src 'none'`, `base-uri 'self'`); cấm `dangerouslySetInnerHTML`; sanitize mọi user input render ra DOM; lint rule chặn `localStorage` cho token; refresh token vẫn cookie HttpOnly để admin revoke nhanh khi cần (NFR10) |
| Server thu hồi phiên (FR5/NFR10) nhưng access token offline còn hạn → trễ tới 7 ngày | **Mitigation:** server flag `users.is_revoked` được kiểm khi /refresh chạy; client sẽ mất quyền vào API ngay lần online tiếp theo. Trade-off: trong khoảng offline, người dùng đã bị thu hồi vẫn dùng được app cục bộ — chấp nhận vì PRD ưu tiên uptime offline |
| shadcn không có DatePicker/DataTable/Toast → cần thêm package | **Mitigation:** đã liệt kê (TanStack Table, react-day-picker, sonner, date-fns) trong section Frontend Architecture |
| Multi-tenant `$extends` middleware có thể bypass nếu dev raw query | **Mitigation:** quy tắc 5 trong "Hướng dẫn Bắt buộc Thi hành" cấm raw query không scope; review checklist |
| 2 POS cùng chọn 1 bàn offline (FR47) tạo conflict | **Mitigation:** MVP **chấp nhận** — không lock realtime. Cả 2 đơn sync thành công với cùng `table_id`; server log conflict qua query `orders WHERE table_id = X AND synced_at gần nhau`; tài liệu ghi rõ trong "Known Limitations" SCP §6 |
| Mode toggle `tableMode` đổi giữa ca → dữ liệu cart đang có item bị mâu thuẫn (cart có `tableId` nhưng store vừa tắt mode) | **Mitigation:** UX-DR-T13 confirm dialog khi user chuyển mode hoặc đổi bàn; cart store reset hoặc giữ tùy lựa chọn. `tableMode` cache vào session — chỉ áp dụng sau reload session (NFR18), tránh race condition giữa ca |
| Floor-plan polling 30s tải nhiều khi store có nhiều bàn | **Mitigation:** `/tables/status` aggregate query 1 lần derive từ `orders` chưa void today; payload nhẹ (chỉ array `{ tableId, status }`); chỉ poll khi POS đang ở floor-plan view (không poll khi đã chọn bàn vào menu screen) |

**Nhất quán mẫu:**

- Naming convention chạy thông suốt: snake_case (DB) → camelCase (Prisma model + API + TS)
- Cấu trúc module khớp với pattern feature-driven của cả NestJS và FE
- Communication pattern (RFC 7807) thống nhất từ controller filter → axios interceptor → errorMapper

**Căn chỉnh cấu trúc:**

- Backend: Controller → Service → Repository → PrismaService → DB (4 tầng rõ ràng)
- Frontend: routes → features → shared → db (tách trách nhiệm, một chiều)
- Cây thư mục đầy đủ ở Bước 6, mọi FR có vị trí cụ thể

### Xác thực Độ phủ Yêu cầu ✅

**Functional Requirements (52/52):**

| FR | Vị trí kiến trúc | Trạng thái |
|---|---|---|
| FR1 (login) | `auth.controller.ts` POST /login → trả access token 7d + set refresh cookie | ✓ |
| FR2 (offline 7 ngày) | `exp` claim trong access token JWT = `now + 7d`; client check `exp` mỗi op | ✓ |
| FR3 (tiếp tục offline) | AuthInterceptor đọc access token IndexedDB → cho phép flow offline nếu `exp` còn | ✓ |
| FR4 (auto refresh) | AuthInterceptor 401 → /auth/refresh (cookie) → ghi access token mới IndexedDB | ✓ |
| FR5 (admin revoke) | `users.service.ts` set `users.is_revoked` + xoá `refresh_tokens`; effective khi client /refresh tiếp theo | ✓ (chấp nhận trễ tối đa hết hạn access offline) |
| FR6 (redirect khi expired) | `errorMapper.ts` `.../session-revoked` + check `exp` thất bại → redirect /login | ✓ |
| FR7 (role routing) | `RoleGate` + `@Roles` decorator | ✓ |
| FR8–FR18 (POS UI) | `routes/pos/*` (11 components) | ✓ |
| FR19 (order code + UUID) | `order-code.ts`, `uuid.ts` | ✓ |
| FR20 (snapshot sale-time) | `builder.ts` + Prisma `*_snapshot` columns | ✓ |
| FR21 (sync immediate online) | `syncEngine.kick()` sau add | ✓ |
| FR22 (pending offline + auto) | sync engine triggers `online` event | ✓ |
| FR23 (manual sync) | manual button + `syncEngine.kick()` | ✓ |
| FR24 (connectivity + counter) | `ConnectivityIndicator`, `PendingCounter` | ✓ |
| FR25 (log lỗi nội bộ) | sync engine + Pino server-side | ✓ |
| FR26 (void synced) | POST /orders/:id/void + `order_voids` table | ✓ |
| FR27–FR33 (Menu CRUD) | `menu` module + `routes/admin/menu/*` | ✓ |
| FR34–FR36 (Menu sync versioned) | `menu-sync.controller.ts`, `menu-version.service.ts` | ✓ |
| FR37–FR40 (Reports) | `reports` module + `routes/admin/reports/` | ✓ |
| FR41–FR43 (Local demo) | `docker-compose.yml`, `prisma migrate`, `prisma/seed.ts` | ✓ |
| FR44 (Mode toggle tableMode) | `stores.table_mode` column + `/stores/me` endpoint + admin store-config UI | ✓ |
| FR45 (CRUD area) | `src/tables/areas.controller.ts` + admin areas page | ✓ |
| FR46 (CRUD bàn) | `src/tables/tables.controller.ts` + admin tables page | ✓ |
| FR47 (Table-first flow) | Floor-plan landing route khi `tableMode=true` → menu view với sticky "Bàn X" header | ✓ |
| FR47b (Quick-counter button) | "Bán hàng nhanh" button trên floor-plan → re-use counter UI, order `tableId=null` | ✓ |
| FR48 (Counter mode unchanged) | Khi `tableMode=false`, ẩn floor-plan + quick-counter; FR8–FR18 không đổi | ✓ |
| FR49 (Table picker dual entry) | `table-picker.tsx` (dropdown) + `floor-plan-view.tsx` (click ô bàn) | ✓ |
| FR50 (Floor-plan + status) | `floor-plan-view.tsx` + polling `/tables/status` 30s | ✓ |
| FR51 (Order tableId + snapshot) | `orders.table_id` nullable + `orders.table_name_snapshot` immutable | ✓ |
| FR52 (Receipt hiển thị bàn) | `receipt-modal.tsx` conditional render dựa trên `tableNameSnapshot` | ✓ |

**Non-Functional Requirements (18/18):**

| NFR | Cơ chế kiến trúc | Trạng thái |
|---|---|---|
| NFR1–NFR6 (Performance) | Vite tree-shake + SW precache + Dexie indexed + server SQL aggregation | ✓ |
| NFR7 (no password local) | bcrypt server-only; FE không nhận password | ✓ |
| NFR8 (HTTPS token) | Secure cookie flag + IndexedDB qua HTTPS context only | ✓ |
| NFR9 (HTTPS/TLS) | reverse proxy + helmet | ✓ |
| NFR10 (refresh revocation) | `refresh_tokens` table + admin endpoint; `users.is_revoked` flag | ✓ (lưu ý trễ ≤7 ngày khi user offline) |
| NFR11 (RBAC tài chính) | `@Roles('admin')` cho `/orders`, `/reports` | ✓ |
| NFR12 (no raw error UI) | `ProblemDetailsFilter` sanitize + traceId | ✓ |
| NFR13 (idempotency) | `sync_log` unique + Idempotency-Key | ✓ |
| NFR14 (snapshot immutable) | Schema design + service không UPDATE `*_snapshot` | ✓ |
| NFR15 (persist Dexie reload) | Dexie là IndexedDB by design | ✓ |
| NFR16 (retry sync no skip) | Exponential backoff + queue stay pending | ✓ |
| NFR17 (offline đúng 7 ngày) | Access token JWT `exp = lastLoginAt + 7d`; client gate UX theo exp | ✓ |
| NFR18 (mode toggle no redeploy) | `stores.table_mode` DB-driven; FE đọc qua `/stores/me`; áp dụng sau reload session, không cần build/deploy lại | ✓ |

**Hành trình (6/6):** HT1 ✓ HT2 ✓ HT3 ✓ HT4 ✓ HT5 ✓ HT5b ✓

### Xác thực Độ Sẵn sàng Implement ✅

- 26 quyết định critical/important đều có lựa chọn cụ thể + lý do + version verified web
- 100% đường dẫn file/thư mục có vị trí + chú thích FR
- 6 nhóm pattern + 8 quy tắc thi hành rõ ràng
- 4 luồng dữ liệu chính được vẽ end-to-end

### Phân tích Khoảng trống

**Khoảng trống Critical (chặn implement):** Không có ✓

**Khoảng trống Important (xử lý sớm trong story đầu):**

1. **Trễ revocation khi offline:** Sau quyết định đơn giản hoá, người dùng bị admin thu hồi quyền vẫn dùng được app cục bộ tới khi access token hết hạn (≤7 ngày) hoặc đến lần online tiếp theo. Đây là lựa chọn tỉnh táo, không cần fix kiến trúc.
2. **CSP & XSS hardening:** Bắt buộc cài đặt CSP nghiêm ngặt từ Story 1 vì access token nằm trong IndexedDB 7 ngày. Suggested header: `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.
3. **Timezone xử lý báo cáo:** Server convert UTC → Asia/Ho_Chi_Minh khi tính `byDay`.
4. **Clock skew client–server:** giữ `soldAt` từ client, thêm `synced_at` server-side.
5. **UUID v7:** dùng `uuid` package npm v11+ với `uuidv7()`.
6. **Seed idempotent:** dùng `prisma.upsert({ where: {id}, ... })`.
7. **CSRF cho /auth/refresh:** dùng double-submit cookie pattern thủ công (cookie `csrf_token` + header `X-CSRF-Token`).

**Khoảng trống Nice-to-have (sau MVP):** Web Worker cho sync engine · Background Sync API · CSP cho production · Audit log · Materialized view · Multi-store UI

### Vấn đề Xác thực đã Xử lý

7 khoảng trống Important có khuyến nghị cụ thể; không có vấn đề critical treo.

### Checklist Hoàn chỉnh Kiến trúc

**Phân tích Yêu cầu**

- [x] Bối cảnh dự án phân tích kỹ
- [x] Quy mô và độ phức tạp đánh giá
- [x] Ràng buộc kỹ thuật xác định
- [x] Mối quan tâm xuyên suốt được lập bản đồ

**Quyết định Kiến trúc**

- [x] Quyết định critical đều có version
- [x] Tech stack đầy đủ
- [x] Mẫu tích hợp định nghĩa
- [x] Hiệu năng được cân nhắc

**Mẫu Triển khai**

- [x] Quy ước đặt tên thiết lập
- [x] Mẫu cấu trúc định nghĩa
- [x] Mẫu giao tiếp đặc tả
- [x] Mẫu quy trình tài liệu hoá

**Cấu trúc Dự án**

- [x] Cây thư mục đầy đủ
- [x] Ranh giới component thiết lập
- [x] Điểm tích hợp được lập bản đồ
- [x] Ánh xạ FR → cấu trúc đầy đủ

### Đánh giá Sẵn sàng Kiến trúc

**Trạng thái Tổng thể:** **READY FOR IMPLEMENTATION**

(16/16 checklist đạt; 0 critical gap; 7 important gaps có khuyến nghị giải.)

**Cập nhật 2026-05-25 (SCP-2026-05-25-table-mgmt):** Mở rộng scope Epic 6 — table management dual-mode (counter + table-service). Schema bổ sung 2 model (`areas`, `tables`) + 3 cột (`stores.table_mode`, `orders.table_id`, `orders.table_name_snapshot`); 4 endpoint mới; trình tự implementation thêm step 5 (Epic 6 brownfield). Coverage cập nhật: 52/52 FR, 18/18 NFR, 6/6 hành trình.

**Mức Tin cậy:** **High** (sau đơn giản hoá, ranh giới auth rõ ràng hơn, chỉ một loại token để tracking)

**Điểm mạnh chính:**

- Offline-first đúng kiến trúc (Dexie source-of-truth, không patch sau)
- Idempotent sync rõ ràng (Idempotency-Key + sync_log unique)
- Snapshot immutability được enforce ở cả schema + service + quy tắc
- Multi-tenant từ ngày đầu qua Prisma `$extends`
- Lỗi đồng nhất qua RFC 7807
- Auth đơn giản hoá: chỉ một access token 7 ngày + refresh cookie cho revocation — dễ debug, dễ implement, dễ giải thích cho dev mới

**Khu vực có thể nâng cấp tương lai:**

- Shared contract package thay vì copy Zod schema thủ công
- Web Worker cho sync engine
- Background Sync API
- Materialized view cho reporting
- Production CSP, monitoring/APM, audit log
- Rotating access token (rút ngắn TTL khi tần suất online cao) để giảm blast radius XSS
- Multi-store UI

### Bàn giao Implementation

**Hướng dẫn cho AI Agent / Developer:**

1. Tuân thủ **mọi** quyết định ở Bước 4 — không tự đổi stack hay version
2. Áp dụng pattern Bước 5 nhất quán
3. Đặt code đúng vị trí Bước 6
4. Mỗi FR có vị trí cụ thể trong bảng ánh xạ — bám theo
5. Mọi thắc mắc kiến trúc → tham khảo tài liệu này
6. 8 quy tắc "Hướng dẫn Bắt buộc Thi hành" là bắt buộc

**Ưu tiên Implementation đầu tiên:**

```bash
# Story 1: Khởi tạo 2 repo
npm create @vite-pwa/pwa@latest pos-web -- --template react-ts
npx @nestjs/cli@latest new pos-api

# Story 2: Setup pos-api (DB + auth)
cd pos-api
docker compose up -d
npx prisma init
npx prisma migrate dev --name init
npm install @nestjs/passport passport passport-jwt @nestjs/jwt bcrypt nestjs-pino @nestjs/swagger class-validator class-transformer @nestjs/throttler

# Story 3: Setup pos-web (PWA + Dexie + shadcn)
cd pos-web
npm install dexie zustand @tanstack/react-query react-router-dom@7 react-hook-form @hookform/resolvers zod axios date-fns uuid
npx shadcn@latest init
npm install @tanstack/react-table react-day-picker sonner

# Story 4+: theo trình tự FR → bám bảng ánh xạ
```

**Trình tự execution:**

1. Repo init + DB up (Story 1–3)
2. BE: schema + migration + seed → auth (login + refresh + revoke) → menu CRUD → menu sync
3. FE: shell + PWA → auth (token IndexedDB + interceptor) → POS UI → orders + sync engine
4. BE: orders endpoint + idempotency → reports
5. FE: Admin UI + reports
6. End-to-end smoke: HT1, HT2, HT3, HT4
7. **Epic 6 (Table management brownfield):** BE schema/CRUD areas+tables+stores.tableMode+orders.tableId → BE stores/me + tables/status + orders DTO patch → FE admin areas/tables + store-config toggle → FE POS floor-plan view + routing → FE table-first flow + brownfield patches 2-4..2-8 + 3-1 → FE quick-counter button (FR47b) + mode transition confirms → e2e smoke: HT5, HT5b, mode toggle on/off
