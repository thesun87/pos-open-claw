---
project_name: 'pos-bmad'
user_name: 'Tuan.nguyen'
date: '2026-05-09'
sections_completed: ['technology_stack', 'critical_rules', 'naming', 'structure', 'patterns', 'boundaries']
existing_patterns_found: 6
source_of_truth: '_bmad-output/planning-artifacts/architecture.md'
---

# Project Context for AI Agents — Café POS MVP (`pos-bmad`)

> File này chứa quy tắc và pattern AI agent **PHẢI** tuân theo khi viết code. Tập trung vào những detail không hiển nhiên mà agent dễ bỏ sót. Khi mâu thuẫn với tài liệu khác, lấy `_bmad-output/planning-artifacts/architecture.md` làm nguồn cuối cùng.

## 1. Technology Stack & Versions (đã chốt — KHÔNG tự đổi)

### Backend (`pos-api`) — TypeScript strict

| Package | Version | Mục đích |
|---|---|---|
| NestJS | 11.x | Framework BE, module/DI/decorator pattern |
| Prisma | 7.x | ORM + Migrate + Seed; multi-tenant qua `$extends` |
| PostgreSQL | 16 | Database, chạy qua Docker Compose dev |
| @nestjs/passport + passport-jwt | latest 11.x | JWT auth |
| @nestjs/jwt | latest | JWT signing/verify |
| bcrypt | latest | Password hash, cost factor **12** |
| class-validator + class-transformer | latest | API DTO validation |
| nestjs-pino | latest | Logging structured JSON |
| @nestjs/swagger | latest | OpenAPI 3 auto-gen |
| @nestjs/throttler | latest | Rate limit `/auth/login`, `/auth/refresh` |
| Jest | sẵn từ NestJS CLI | Test BE (unit + e2e) |

### Frontend (`pos-web`) — TypeScript strict + Vite

| Package | Version | Mục đích |
|---|---|---|
| Vite | 7.x | Build tool, HMR |
| React | 18.x | UI library |
| vite-plugin-pwa + Workbox | v1.x | PWA (Service Worker, manifest, cache) |
| Dexie | 4.x | IndexedDB wrapper, source-of-truth offline |
| @tanstack/react-query | latest | Server-state Admin |
| zustand | latest | UI state (cart, modal, connectivity) |
| react-router-dom | 7.x | Data routers |
| react-hook-form + @hookform/resolvers | latest | Forms |
| zod | latest | Schema validation FE + sync payload |
| axios | latest | HTTP client + interceptor |
| date-fns | latest | Date format locale `vi` |
| uuid | 11.x | **PHẢI dùng `uuidv7()`**, không dùng v4 |
| shadcn/ui + Tailwind CSS + Radix UI | latest | UI components |
| @tanstack/react-table | latest | Data grid Admin |
| react-day-picker | latest | Date-range picker (FR37) |
| sonner | latest | Toast |
| Vitest | latest | Test FE |

### Khởi tạo (chỉ chạy trong Story 1)

```bash
npm create @vite-pwa/pwa@latest pos-web -- --template react-ts
npx @nestjs/cli@latest new pos-api
```

## 2. Quy tắc Bắt buộc Thi hành (8 RULES — không vi phạm)

> Mọi AI agent / developer **PHẢI** tuân theo. Code review CHẶN nếu vi phạm.

1. **Naming convention** ở 4 boundary (DB / Prisma / API / TS code) phải đúng — không tự đổi (xem §3).
2. **Đặt code vào đúng feature module** (`auth`, `menu`, `orders`, `reports`, `users`, `health`) — KHÔNG để business logic vào `common/`.
3. **Test cùng commit** với code mới (unit tối thiểu cho service + controller + filter; coverage ≥ 70% services/filters BE; ≥ 80% theo rule chung).
4. **Snapshot immutability:** mọi field có hậu tố `Snapshot` (TS) hoặc cột DB `*_snapshot` là **bất biến sau insert**. KHÔNG có method UPDATE cho fields này. Bao gồm: `productNameSnapshot`, `unitPriceSnapshot`, `priceDeltaSnapshot`, `labelSnapshot`, `menuVersionAtSale`. (NFR14)
5. **Multi-tenant scope:** mọi truy vấn DB business **PHẢI qua Prisma `$extends` middleware** auto-scope `tenant_id` + `store_id`. CẤM `prisma.$queryRaw`/`$executeRaw` không có scope.
6. **Error response:** mọi response lỗi đi qua `ProblemDetailsFilter` (RFC 7807, content-type `application/problem+json`). CẤM trả `{ success, message, code }` thuần. Lỗi PHẢI có field `type` (URI), `title`, `status`, `detail`, `instance`, `traceId`.
7. **Format chuẩn:** date trong API là **ISO 8601 UTC** (`YYYY-MM-DDTHH:mm:ss.sssZ`); tiền VND là **integer (đồng)**, KHÔNG float, KHÔNG đơn vị nhỏ hơn.
8. **Token storage:** FE **TUYỆT ĐỐI** không lưu token vào `localStorage` hoặc `sessionStorage`. Chỉ:
   - **Refresh token:** HttpOnly Secure cookie (browser tự gửi `/auth/refresh`)
   - **Access token (JWT 7 ngày):** IndexedDB qua `db.session`
   - CSP nghiêm: `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
   - CẤM `dangerouslySetInnerHTML` ở mọi nơi.

## 3. Naming Convention (4 Boundary — phải nhớ)

### A. Database (PostgreSQL qua Prisma `@@map` / `@map`)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Tên bảng | `snake_case`, **số nhiều** | `users`, `order_items`, `option_groups`, `sync_log`, `refresh_tokens`, `order_voids`, `menu_versions` |
| Tên cột | `snake_case` | `tenant_id`, `created_at`, `client_order_id`, `unit_price_snapshot` |
| PK | luôn `id`, kiểu UUID v7 | `id UUID PRIMARY KEY` |
| FK | `<bảng_singular>_id` | `tenant_id`, `product_id` |
| Index | `idx_<bảng>_<cột>` | `idx_orders_client_order_id` |
| Unique | `uq_<bảng>_<cột>[_<cột>]` | `uq_sync_log_tenant_store_device_client` |
| Timestamps | `created_at`, `updated_at` (timestamptz) | có ở mọi business table |
| Soft delete | **KHÔNG dùng** — orders append-only, void riêng | — |

### B. Prisma model layer (TypeScript)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Model | `PascalCase`, **số ít** | `User`, `OrderItem`, `OptionGroup`, `SyncLog` |
| Field | `camelCase` | `tenantId`, `clientOrderId`, `createdAt` |
| Enum | `PascalCase` cho enum + member | `OrderStatus.Pending` |

### C. API REST

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Path resource | `kebab-case`, **số nhiều** | `/api/v1/orders`, `/api/v1/option-groups` |
| Versioning | `/api/v1/...` (URL prefix) | bắt buộc |
| Path param | `:id` UUID v7 | `/api/v1/orders/:id` |
| Query param | `snake_case` | `?since_version=10&from=2026-05-01` |
| Custom header | `X-<PascalCase-With-Dashes>` | `X-Trace-Id`, `Idempotency-Key` |
| JSON payload field | `camelCase` (đồng nhất TS, không cần transform) | `clientOrderId`, `menuVersionAtSale` |
| Status code | chuẩn HTTP — không tự chế: 200/201/204/400/401/403/404/409/422/429/500 | 201 cho create thành công |

### D. TypeScript code (cả 2 repo)

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| File React component | `kebab-case.tsx` | `product-card.tsx`, `cart-panel.tsx` |
| File NestJS | `<feature>.<type>.ts` | `auth.controller.ts`, `create-order.dto.ts`, `jwt-auth.guard.ts` |
| Component React | `PascalCase` | `ProductCard`, `CartPanel` |
| Hook React | `camelCase` với prefix `use` | `useConnectivity`, `usePendingOrders` |
| Function | `camelCase`, động từ ở đầu | `syncPendingOrders()`, `formatVnd()`, `buildLocalOrder()` |
| Constant | `UPPER_SNAKE_CASE` | `MAX_PENDING_ORDERS`, `SYNC_RETRY_BASE_MS` |
| Type/Interface | `PascalCase`, **KHÔNG tiền tố `I`** | `Order`, `SyncPayload` (KHÔNG `IOrder`) |
| Boolean variable | prefix `is`/`has`/`should` | `isOnline`, `hasPendingSync`, `shouldRetry` |
| Custom event name | `domain.action` chữ thường, dot-separated | `sync.completed`, `auth.expired`, `order.finalized` |
| Zustand action | `camelCase`, động từ | `setOnline`, `incrementPending`, `resetCart` |

## 4. Cấu trúc Module (4 tầng — KHÔNG bypass)

### Backend (NestJS) — Controller → Service → Repository → PrismaService

```
HTTP request
   │
   ▼
Controller     ← class-validator DTO, @Roles, @CurrentUser, @TenantContext
   │           ← KHÔNG gọi Repository trực tiếp
   ▼
Service        ← business logic, idempotency, snapshot building
   │           ← KHÔNG truy cập req/res, chỉ nhận DTO + context object
   ▼
Repository     ← chỉ Prisma queries; KHÔNG có business logic
   │
   ▼
PrismaService  ← singleton, $extends multi-tenant scope (auto tenantId/storeId)
   │
   ▼
PostgreSQL
```

**Cấu trúc thư mục `pos-api/`:**

```
src/
├── main.ts                         # bootstrap: helmet, CORS, ProblemDetailsFilter, ValidationPipe, swagger
├── app.module.ts
├── prisma/{prisma.module,prisma.service}.ts
├── config/{configuration,env.schema}.ts   # Zod validate env
├── common/
│   ├── filters/problem-details.filter.ts
│   ├── interceptors/{logging,timeout}.interceptor.ts
│   ├── decorators/{roles,current-user,tenant-context}.decorator.ts
│   ├── guards/{jwt-auth,roles}.guard.ts
│   ├── middleware/tenant-scope.middleware.ts
│   ├── errors/problem-types.ts     # constant URI cho RFC 7807 type field
│   └── utils/trace-id.ts
├── auth/        # FR1–FR7, NFR7–NFR12, NFR17
├── users/       # admin revoke FR5
├── menu/        # FR27–FR36 (categories, products, option-groups, menu-sync, menu-version)
├── orders/      # FR19–FR26, NFR13/14 (orders, sync-log, void)
├── reports/     # FR37–FR40, NFR6
└── health/      # GET /health (FE ping connectivity)
prisma/
├── schema.prisma                   # SOURCE OF TRUTH cho schema
├── migrations/
└── seed.ts                         # seed idempotent qua prisma.upsert
test/                               # *.e2e-spec.ts
```

### Frontend (Vite + React) — routes → features → shared → db (một chiều)

```
routes/  (UI shell)         ← chỉ import features/ và shared/
   │
   ▼
features/<X>/               ← chỉ import shared/ và db/
   │                        ← KHÔNG import lẫn nhau (auth ↔ orders KHÔNG cross)
   │                        ← cần info từ feature khác? → đi qua hook (vd useAuth())
   ▼
shared/                     ← KHÔNG bao giờ import features/ hoặc routes/
db/ (Dexie)                 ← chỉ dùng từ features/<X>/, KHÔNG component gọi Dexie trực tiếp
```

**Cấu trúc thư mục `pos-web/`:**

```
src/
├── main.tsx                        # React root + đăng ký SW + provider tree
├── App.tsx                         # router
├── routes/
│   ├── _layout.tsx                 # shell + connectivity-indicator + pending-counter (FR24)
│   ├── login/                      # FR1
│   ├── pos/                        # /pos cashier (FR8–FR18)
│   └── admin/{menu,reports}/       # FR27–FR40
├── features/
│   ├── auth/                       # api, stores (zustand), hooks, token-store (IndexedDB), interceptor, types
│   ├── menu/                       # api, sync (versioned pull), hooks, types
│   ├── orders/                     # builder (snapshot), api (Idempotency-Key), hooks, types
│   ├── sync/                       # engine (FSM), retry (exponential), triggers, events
│   └── reports/                    # api, hooks
├── shared/
│   ├── components/{ui,layout}/    # ui = shadcn copy-paste; layout = role-gate, indicators
│   ├── lib/{api-client,error-mapper,format-vnd,date,uuid,order-code}.ts
│   ├── hooks/{use-connectivity,use-debounce,use-print}.ts
│   └── stores/{connectivity,ui}.store.ts
├── db/
│   ├── dexie.ts                   # Dexie instance, version migration
│   └── schemas/{orders,menu,session}.ts
├── styles/{globals,tailwind}.css
└── types/api.ts                   # shared type với BE (copy hoặc shared package)
public/{icons,manifest}/
tests/                              # Vitest cross-cutting; *.test.ts(x) co-located
```

## 5. Pattern Cốt lõi (memorize)

### A. Sync payload (FE → `POST /api/v1/orders`)

```http
POST /api/v1/orders
Idempotency-Key: <clientOrderId UUID v7>
Authorization: Bearer <access token from IndexedDB>
Content-Type: application/json

{
  "clientOrderId": "<UUID v7>",
  "deviceId": "POS01",
  "soldAt": "2026-05-09T03:23:11.000Z",     // ISO 8601 UTC, FROM CLIENT
  "menuVersionAtSale": 12,
  "items": [{
    "productId": "...",
    "productNameSnapshot": "Bạc Xỉu",       // immutable sau insert
    "unitPriceSnapshot": 35000,             // integer VND
    "quantity": 1,
    "options": [{
      "optionId": "...",
      "labelSnapshot": "Size L",
      "priceDeltaSnapshot": 5000
    }],
    "note": "ít đường",
    "lineTotal": 40000
  }],
  "discountAmount": 0,
  "total": 40000,
  "paymentMethod": "cash"
}
```

- Server dedup theo `(tenant_id, store_id, device_id, client_order_id)`; replay trả `200 OK` với `idempotent_replay: true`.
- Server thêm `synced_at` (server timestamp) — KHÔNG sửa `soldAt`.

### B. Error response (RFC 7807 — luôn dùng)

```http
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

**`type` URI ổn định** — FE dùng nó để map action trong `errorMapper.ts`:
- `.../session-revoked` → clear session + redirect `/login`
- `.../validation` → trả object cho RHF field errors
- `.../menu-version-stale` → trigger menu re-pull rồi retry
- `.../internal` → toast "Đã có lỗi, vui lòng thử lại" + log `traceId`
- default → toast generic

### C. Auth lifecycle (client interceptor — flow chuẩn)

```
Request → đọc access token IndexedDB → đính Bearer
  ├─ trước khi gửi: check exp
  │   └─ exp đã qua → emit auth.expired → redirect /login
  ├─ 200 → ok
  ├─ 401 → POST /auth/refresh (cookie HttpOnly tự gửi)
  │   ├─ thành công → ghi access token mới IndexedDB → retry request gốc 1 LẦN
  │   └─ thất bại → emit auth.expired → xoá token IndexedDB → /login
  └─ network error → check exp IndexedDB
      ├─ còn hạn → cho phép offline flow (Dexie + queue write)
      └─ hết hạn → emit auth.expired → /login
```

**Reload page:** đọc token IndexedDB → check `exp` → nếu còn hạn khởi động như đã đăng nhập (kể cả offline).

### D. Sync engine (background)

- **Trigger:** `online` event, `visibilitychange` (tab focus), interval 60s khi online, manual button (FR23)
- **Đọc queue:** `db.orders.where('status').equals('pendingSync')` qua Dexie
- **Push:** **sequential, KHÔNG parallel** (giữ thứ tự ops); mỗi đơn 1 POST với `Idempotency-Key`
- **Retry exponential backoff:** `1s, 2s, 4s, 8s, 16s` rồi tạm ngưng đến event tiếp theo
- **Update status:**
  - 200 hoặc `idempotent_replay: true` → `status: 'synced'`, ghi `serverOrderId`
  - 4xx (validation) → `status: 'syncFailed'` + lý do
  - 5xx hoặc network → giữ `pendingSync`, retry sau

### E. Validation 3 tầng (KHÔNG bỏ qua tầng nào)

| Tầng | Tool | Mục tiêu |
|---|---|---|
| FE form | RHF + zodResolver | Hint sớm cho user, không submit không hợp lệ |
| API boundary | NestJS ValidationPipe + class-validator + class-transformer | Bảo vệ server khỏi payload sai format |
| DB | Prisma constraint (NOT NULL, unique, FK) | Bảo vệ cuối cùng |

→ FE validation **KHÔNG thay thế** server validation.

### F. Loading state — đúng tool cho đúng việc

- **TanStack Query:** dùng `isLoading`, `isFetching`, `isError` trực tiếp — KHÔNG tự tạo flag mới
- **Dexie useLiveQuery:** `undefined` = đang load → render skeleton/spinner cục bộ
- **Zustand:** chỉ flag UI (`isModalOpen`, `isCheckingOut`) — KHÔNG để loading server-state vào Zustand

### G. Order build (FE — finalize đơn)

```ts
// features/orders/api.ts — ĐÚNG
async function finalizeOrder(cart: Cart): Promise<LocalOrder> {
  const localOrder = buildLocalOrder(cart);   // gồm clientOrderId UUID v7, snapshots
  await db.orders.add({ ...localOrder, status: 'pendingSync' });
  syncEngine.kick();                           // KHÔNG await — chạy nền
  return localOrder;
}

// SAI — vỡ luồng offline-first
async function finalizeOrder(cart: Cart) {
  return await axios.post('/orders', cart);
}
```

## 6. Anti-patterns (đã chứng minh sai — đừng lặp lại)

```prisma
// ❌ SAI — trộn convention
model order_item {            // model phải PascalCase
  ID            String  @id   // field phải camelCase
  OrderId       String        // phải camelCase + @map
  product_name  String        // phải camelCase
}

// ✅ ĐÚNG
model OrderItem {
  id                    String   @id @default(uuid())
  orderId               String   @map("order_id")
  productNameSnapshot   String   @map("product_name_snapshot")
  unitPriceSnapshot     Int      @map("unit_price_snapshot")
  createdAt             DateTime @default(now()) @map("created_at")

  @@map("order_items")
  @@index([orderId], map: "idx_order_items_order_id")
}
```

```json
// ❌ SAI — custom envelope không nhất quán
{ "success": false, "error": "menu version stale", "code": 409 }

// ✅ ĐÚNG — RFC 7807 (xem §5.B)
```

```ts
// ❌ SAI — token vào localStorage
localStorage.setItem('access_token', token);

// ❌ SAI — store loading server-state vào Zustand
useStore(s => s.isLoadingOrders);

// ❌ SAI — bypass multi-tenant
await prisma.$queryRaw`SELECT * FROM orders WHERE id = ${id}`;

// ❌ SAI — UPDATE snapshot field
await prisma.orderItem.update({ where: { id }, data: { unitPriceSnapshot: 99 } });
```

## 7. Bounded Constants & Convention Khoá

| Constant / Convention | Giá trị | Lý do |
|---|---|---|
| Access token TTL | **7 ngày chính xác** | NFR17 offline 7 ngày |
| Bcrypt cost factor | **12** | Quen thuộc, chấp nhận MVP |
| UUID version | **v7** (`uuidv7()` từ `uuid@11+`) | Time-ordered, tốt cho index DB |
| Order code format | `YYYYMMDD-POSXX-NNNN` | FR19, vd `20260509-POS01-0042` |
| VND format hiển thị | `formatVnd(45000)` → `"45.000 ₫"` | locale `vi-VN` |
| Date format hiển thị | `dd/MM/yyyy HH:mm` qua `date-fns` locale `vi` | UI người dùng |
| Date format API | ISO 8601 `YYYY-MM-DDTHH:mm:ss.sssZ` UTC | Boundary chuẩn |
| Date input báo cáo | `YYYY-MM-DD` (server tự convert TZ Asia/Ho_Chi_Minh) | FR37 |
| Sync retry delays | `1s, 2s, 4s, 8s, 16s` | Exponential backoff |
| Sync interval khi online | `60s` | Polling backup |
| Pending counter realtime | qua `useLiveQuery(db.orders.where('status').equals('pendingSync'))` | FR24 |
| DB connection pool dev | max 10 | Prisma default |
| Idempotency-Key value | = `clientOrderId` (UUID v7) | dedup key BE |
| Test coverage tối thiểu | 70% (services, filters BE), 80% chung | CI gate |
| File size limit | <800 lines, function <50 lines, nesting <4 | Coding standards |

## 8. Boundary Tổng hợp (memorize)

### Boundary FE — Component Import Rules

| Layer | Có thể import | KHÔNG được import |
|---|---|---|
| `routes/` | `features/`, `shared/` | `db/` trực tiếp |
| `features/<X>/` | `shared/`, `db/` | `features/<Y>/` (cross-feature), `routes/` |
| `shared/` | nội bộ `shared/` | `features/`, `routes/`, `db/` |
| `db/` | nội bộ `db/` | mọi thứ khác (chỉ bị gọi từ `features/`) |

### Boundary BE — Layer Rules

| Layer | Có thể gọi | KHÔNG được gọi/làm |
|---|---|---|
| Controller | Service | Repository trực tiếp; `req.body` raw không qua DTO |
| Service | Repository, other Service nếu cùng module | `req`/`res` object; HTTP details |
| Repository | PrismaService | business logic; HTTP exceptions (throw `HttpException` ở Service) |

### Boundary Dữ liệu — Storage Map

| Kho | Vị trí | Mục đích | Cấm dùng cho |
|---|---|---|---|
| PostgreSQL | server | Source of truth, append-only orders | — |
| IndexedDB (Dexie) | client | Source of truth offline POS, mirror partial | sensitive credentials (chỉ access JWT) |
| HttpOnly cookie | browser | Refresh token, CSRF-protected `/auth/refresh` | non-auth data |
| Zustand store | tab memory | UI state (modal, cart, connectivity) | server-state, auth tokens |
| `localStorage` / `sessionStorage` | browser | **CẤM cho token**; chỉ UI preference nếu cần | mọi loại token |

### Endpoint chính (cheat sheet)

| Endpoint | Method | Auth | Note |
|---|---|---|---|
| `/api/v1/auth/login` | POST | none | trả access token 7d + set refresh cookie |
| `/api/v1/auth/refresh` | POST | cookie + CSRF (double-submit) | rotate access token |
| `/api/v1/auth/logout` | POST | bearer | — |
| `/api/v1/auth/sessions/:id/revoke` | POST | bearer + admin | FR5/NFR10 |
| `/api/v1/categories` | GET/POST/PATCH/DELETE | bearer + admin | FR27 |
| `/api/v1/products` | GET/POST/PATCH/DELETE | bearer + admin | FR28, FR31–33 |
| `/api/v1/option-groups` | GET/POST/PATCH/DELETE | bearer + admin | FR29, FR30 |
| `/api/v1/menu?since_version=N` | GET | bearer | menu sync, delta or full |
| `/api/v1/orders` | POST | bearer + `Idempotency-Key` | sync POS, NFR13 |
| `/api/v1/orders/:id/void` | POST | bearer + cashier/admin | FR26 |
| `/api/v1/reports?from&to&metric` | GET | bearer + admin | FR37–FR40 |
| `/health` | GET | none | connectivity ping |

## 9. Workflow Pre-commit & CI

- **Pre-commit (lefthook hoặc husky):** `prisma format` + `eslint --fix` + `prettier --write` cho file đã stage
- **CI bắt buộc:**
  - `prisma validate`
  - `tsc --noEmit` cả 2 repo
  - `eslint .` không cảnh báo
  - test BE (`jest`) + test FE (`vitest`) — coverage gate ≥ 70% services/filters BE, ≥ 80% chung
  - `npm run build` cả 2 repo

## 10. Ngôn ngữ & Locale

- **Code, comment ngắn:** tiếng Anh
- **Tài liệu, message UI, log error UI-facing:** **Tiếng Việt**
- **Locale date-fns:** `vi`
- **Timezone reporting:** `Asia/Ho_Chi_Minh` (server convert UTC → TZ này khi tính `byDay`)
- **Currency:** VND (integer đồng)

---

**References:**
- `_bmad-output/planning-artifacts/architecture.md` — nguồn cuối cùng cho mọi quyết định
- `_bmad-output/planning-artifacts/prd.md` — yêu cầu sản phẩm (43 FR + 17 NFR)
- `docs/product-requirement.md` — tài liệu input ban đầu
