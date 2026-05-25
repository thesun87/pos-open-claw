---
proposal_id: SCP-2026-05-25-table-mgmt
created: 2026-05-25
revised: 2026-05-25 (rev1 — FR47 dual-flow: table-first + quick-counter)
author: Tuan.nguyen (via bmad-correct-course)
project: pos-bmad
status: approved
approved_at: 2026-05-25
approved_by: Tuan.nguyen
scope_classification: Major
trigger_type: New requirement from stakeholders
selected_path: Hybrid (PRD MVP Review + Direct Adjustment to existing epics + New Epic 6)
new_epic_stories: 9
new_ux_dr_items: 13
affected_artifacts:
  - planning-artifacts/prd.md
  - planning-artifacts/architecture.md
  - planning-artifacts/ux-design-specification.md
  - planning-artifacts/epics.md
  - implementation-artifacts/sprint-status.yaml
  - implementation-artifacts/1-4-seed-demo-data-*.md
  - implementation-artifacts/2-4..2-8-*.md
  - implementation-artifacts/3-1-admin-layout-*.md
---

# Sprint Change Proposal — Quản lý bàn F&B cho POS

## 1. Issue Summary

### Vấn đề / Cơ hội

Stakeholder (chủ dự án) yêu cầu **mở rộng MVP** để hỗ trợ hoạt động F&B kiểu **table-service**: gắn order với bàn cụ thể, có sơ đồ bàn theo khu vực. Hiện tại MVP chỉ phục vụ mô hình **counter-service** (thu ngân tại quầy, không có khái niệm bàn).

### Phân loại

- **Loại:** New requirement emerged from stakeholders
- **Thời điểm phát hiện:** 2026-05-25, sau khi Epic 1–5 phần lớn `done` (chỉ còn `1-10` ở backlog và `2-15` ở review)
- **Mức độ:** Major — yêu cầu thêm domain mới (areas/tables), kéo theo schema/API/UX/PRD changes

### Bằng chứng

- **PRD `prd.md:85`** xác nhận **"Quản lý bàn"** thuộc **Out-of-Scope MVP**, được liệt kê trong **"Chiến lược Tăng trưởng (Sau MVP)"** (`prd.md:89`)
- **Hành trình HT1-HT4** trong PRD đều không có nhân vật chọn bàn, hóa đơn không có thông tin bàn
- **Architecture `architecture.md:148-156`** không có model `Area` / `Table`; `orders` schema không có field `tableId`
- **UX `ux-design-specification.md`** không có UX-DR cho table picker, floor-plan, area navigation

### Mục tiêu của thay đổi

Hỗ trợ store F&B vận hành **table-service mode** trong cùng codebase (mode toggle per-store), không phá vỡ store counter-service hiện tại.

### Phạm vi do user xác nhận

- **Tính năng:** Cơ bản — gắn order với bàn + sơ đồ bàn cơ bản chia theo khu vực
- **Rollout:** Mode toggle per-store (cùng codebase phục vụ cả 2 mô hình)
- **KHÔNG bao gồm (vẫn out-of-scope):** Split/merge bill, KOT in bếp, reservation/đặt bàn trước, transfer bàn, floor-plan visual editor advanced

## 2. Impact Analysis

### 2.1 PRD Impact

**Sections cần update:**

| Section | Thay đổi | Lý do |
|---|---|---|
| `prd.md:23` "Đối tượng" | Mở rộng: thêm "Quán cà phê / F&B phục vụ tại bàn quy mô nhỏ" | Đối tượng mới |
| `prd.md:34` Bảng "Lĩnh vực" | Giữ "F&B / Retail POS" | OK |
| `prd.md:65` "MVP" | Thêm bullet: "Quản lý bàn (cơ bản): khu vực, bàn, gắn order với bàn, sơ đồ bàn — có thể tắt theo store" | Đưa vào scope |
| `prd.md:73` "Hành trình được hỗ trợ" | Thêm HT5 (mới): Thu ngân bán hàng table-service | Lộ requirements |
| `prd.md:85` "Ngoài Phạm vi MVP" | **Bỏ "Quản lý bàn"** khỏi danh sách | Đã chuyển vào scope |
| `prd.md:89` "Sau MVP" | **Bỏ "Quản lý bàn"**; giữ split/merge, KOT, reservation | Phân định rõ phần MVP vs sau |
| Yêu cầu Chức năng (FR) | **Thêm nhóm mới FR44–FR52** (Quản lý bàn — chi tiết bên dưới) | Domain mới |
| Yêu cầu Phi chức năng | Thêm **NFR18**: Mode toggle table-service tắt bật mà không cần redeploy | New constraint |

**FR mới (FR44–FR52):**

- **FR44:** Admin có thể bật/tắt chế độ Quản lý bàn theo store (`stores.tableMode` boolean).
- **FR45:** Admin có thể tạo, sửa, xóa **khu vực** (tên, thứ tự hiển thị) trong store.
- **FR46:** Admin có thể tạo, sửa, xóa **bàn** thuộc khu vực (tên/số, sức chứa, sort order, active toggle).
- **FR47:** Khi `tableMode` bật, **flow mặc định** của POS là **table-first**: thu ngân chọn bàn (qua floor-plan hoặc table picker) → vào màn hình chọn món → finalize. Bàn được giữ context xuyên suốt và tự động gắn vào order khi finalize.
- **FR47b:** Trong cùng store `tableMode=true`, POS hiển thị nút **"Bán hàng nhanh"** (quick-counter) cho phép thu ngân bỏ qua bước chọn bàn và vào thẳng giao diện counter-service như khi `tableMode=false`. Order tạo từ flow này có `tableId=null`.
- **FR48:** Khi `tableMode` tắt, POS hoạt động đúng như counter-service hiện tại (FR8–FR18 không đổi); nút "Bán hàng nhanh" và floor-plan KHÔNG hiển thị.
- **FR49:** Thu ngân có thể chọn bàn qua **table picker** (dropdown/modal theo khu vực) hoặc qua **floor-plan view** (click trực tiếp vào ô bàn).
- **FR50:** POS hỗ trợ **floor-plan view** — lưới bàn theo khu vực, hiển thị trạng thái (trống / đang có order chờ thanh toán / pending sync); là entry point mặc định khi `tableMode=true`.
- **FR51:** Order được lưu kèm `tableId` (nullable) và `tableNameSnapshot` (immutable sau insert — đồng nhất nguyên tắc snapshot AR24). `tableId=null` đại diện cho quick-counter sale hoặc store ở counter-service mode.
- **FR52:** Hóa đơn in hiển thị tên/số bàn nếu `tableId` có giá trị; ẩn dòng này nếu null.

**HT5 (Journey mới):** Thu ngân quán F&B (table-service, table-first flow) — Linh mở POS, landing là floor-plan. Click bàn 4 (trống) → vào màn hình chọn món, header hiển thị "Bàn 4" → thêm Bạc Xỉu → finalize → hóa đơn in "Bàn 4 — 20260525-POS01-0007". Floor-plan refresh, bàn 4 trở lại trống.

**HT5b (Journey con — quick-counter trong table mode):** Khách mua mang đi tại quán có `tableMode=true`. Linh trên floor-plan bấm nút **"Bán hàng nhanh"** → vào thẳng counter UI (giống MVP hiện tại) → finalize → order có `tableId=null`, hóa đơn không hiển thị dòng "Bàn".

### 2.2 Architecture Impact

**Schema additions** (`schema.prisma`):

```prisma
model Area {
  id         String  @id @default(uuid())
  tenantId   String  @map("tenant_id")
  storeId    String  @map("store_id")
  name       String
  sortOrder  Int     @default(0) @map("sort_order")
  isActive   Boolean @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  tables     Table[]
  @@unique([tenantId, storeId, name], map: "uq_areas_tenant_store_name")
  @@map("areas")
}

model Table {
  id         String  @id @default(uuid())
  tenantId   String  @map("tenant_id")
  storeId    String  @map("store_id")
  areaId     String  @map("area_id")
  area       Area    @relation(fields: [areaId], references: [id])
  name       String                              // ví dụ "Bàn 1", "B-12"
  capacity   Int     @default(2)
  sortOrder  Int     @default(0) @map("sort_order")
  isActive   Boolean @default(true) @map("is_active")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  @@unique([tenantId, storeId, name], map: "uq_tables_tenant_store_name")
  @@index([areaId], map: "idx_tables_area_id")
  @@map("tables")
}

// Sửa Store
model Store {
  // ... existing fields
  tableMode  Boolean @default(false) @map("table_mode")     // FR44
}

// Sửa Order
model Order {
  // ... existing fields
  tableId           String? @map("table_id")               // FR51 — nullable cho counter-service
  tableNameSnapshot String? @map("table_name_snapshot")    // immutable AR24
  @@index([tableId], map: "idx_orders_table_id")
}
```

**Lý do KHÔNG có version monotonic cho table config:** Đơn giản hóa MVP. Floor-plan đổi không thường xuyên; POS pull `GET /tables` mỗi lần focus tab (kiểu menu nhưng không versioned). Nâng cấp `tableConfigVersion` để sau nếu cần.

**API additions:**

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/v1/areas` | GET/POST/PATCH/DELETE | bearer + admin | FR45 CRUD areas |
| `/api/v1/tables` | GET/POST/PATCH/DELETE | bearer + admin | FR46 CRUD tables |
| `/api/v1/tables/status` | GET | bearer | Trạng thái bàn (occupied/empty) — derive từ orders chưa void trong cửa hàng đang mở; polling khi POS ở floor-plan view |
| `/api/v1/stores/me` | GET | bearer | Trả về thông tin store hiện tại gồm `tableMode` (FE đọc khi đăng nhập / reload) |
| `/api/v1/orders` (sửa) | POST | bearer + Idempotency-Key | Payload thêm `tableId?: string` + `tableNameSnapshot?: string` (FR51) |

**Sync payload change:**

```json
POST /api/v1/orders
{
  "clientOrderId": "...",
  "tableId": "uuid-or-null",            // FR51
  "tableNameSnapshot": "Bàn 4",         // immutable, copy lúc finalize
  "deviceId": "POS01",
  "menuVersionAtSale": 12,
  "items": [...],
  "total": 40000,
  "paymentMethod": "cash"
}
```

- `tableId` **KHÔNG** vào composite idempotency key (giữ nguyên `tenant + store + device + clientOrderId`).
- `tableNameSnapshot` **immutable** theo AR24 — đồng nhất với product snapshots.

**Sync engine (Story 2.9) impact:** Không thay đổi FSM hay retry policy. `tableId` chỉ là field thêm trong payload; server validation accept nullable.

**Conflict offline (2 POS cùng chọn bàn 4):** MVP **chấp nhận**: cả 2 sync thành công, server log conflict qua trường `tableId` trùng trên `synced_at` gần nhau — không lock realtime. Tài liệu ghi rõ trong "Known Limitations".

**Frontend module mới `pos-web/src/features/tables/`:**

```
features/tables/
├── api.ts          # GET /areas, /tables, /tables/status
├── hooks.ts        # useAreas, useTables, useTableStatus, useTableMode
├── store.ts        # Zustand: selectedAreaId, selectedTableId (cart context)
├── components/
│   ├── table-picker.tsx       # modal / dropdown
│   ├── floor-plan-view.tsx    # grid by area
│   ├── table-card.tsx         # ô bàn với status badge
│   └── area-tabs.tsx          # tab khu vực
└── types.ts
```

**Boundary:** `features/tables/` import `shared/` + `db/`; KHÔNG cross-import `features/orders/` — order builder nhận `tableId` qua argument từ Zustand cart store (mở rộng `features/orders/builder.ts`).

**Mode toggle flow:**

1. Login → `GET /api/v1/stores/me` → cache `tableMode` vào Zustand `sessionStore`
2. POS layout đọc `tableMode`:
   - `false` → ẩn hoàn toàn table picker và floor-plan view
   - `true` → hiển thị table picker bắt buộc trước checkout + nav item "Sơ đồ bàn"
3. Admin: trang `/admin/settings` (mới — hoặc tách `/admin/store-config`) toggle `tableMode`; cập nhật server → POS pull lại session khi reload

### 2.3 UX Impact

**UX-DR mới (UX-DR-T1 → UX-DR-T13)** — tổng hợp (có 2 item mới T12, T13 cho quick-counter flow):

- **UX-DR-T1:** Table Picker Modal — dropdown/modal chọn bàn theo khu vực, alternative entry point so với floor-plan
- **UX-DR-T2:** Floor Plan Grid View — entry point mặc định khi `tableMode=true`; responsive 2-4 cột tại 1024px; touch target 56–64px
- **UX-DR-T3:** Area Tabs Component — horizontal tab chuyển khu vực trong floor-plan, persist `selectedAreaId`
- **UX-DR-T4:** Table Status Badge — xanh=trống, vàng=đang có order, đỏ=chờ sync, xám=disabled; icon + màu cho accessibility
- **UX-DR-T5:** Admin Table CRUD Form Dialog (name, areaId, capacity, sortOrder, isActive)
- **UX-DR-T6:** Admin Area CRUD Form Dialog (name, sortOrder, isActive)
- **UX-DR-T7 (REVISED):** POS Layout Strategy — Trong `tableMode=true`, **landing là floor-plan view**. Khi đã chọn bàn → vào màn hình chọn món với **sticky header** hiển thị "Bàn X" + nút "Đổi bàn" + nút "Hủy chọn bàn"; layout 2-cột (menu + cart) giữ nguyên như MVP hiện tại. Khi vào counter mode (HT5b), header KHÔNG có "Bàn X".
- **UX-DR-T8:** Mode Toggle Header Indicator — badge "Chế độ bàn: Bật/Tắt" cạnh sync status (cashier read-only)
- **UX-DR-T9:** POS Empty State — "Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên." (khi `tableMode=true` mà 0 bàn)
- **UX-DR-T10:** Admin Empty State — onboarding tạo area + bàn mẫu
- **UX-DR-T11:** Admin Navigation Section — "Quản lý bàn" (sub: Areas, Tables) cạnh "Quản lý Menu", "Báo cáo"
- **UX-DR-T12 (NEW):** **"Bán hàng nhanh" button** — Hiển thị tại header floor-plan view khi `tableMode=true` (CTA secondary, không cạnh tranh với CTA chính là click bàn). Click vào → chuyển sang counter-service UI; header POS đổi sang trạng thái "Bán hàng nhanh" với nút "Về sơ đồ bàn" để quay lại floor-plan.
- **UX-DR-T13 (NEW):** **Mode transition affordance** — Khi đang trong table-flow (đã chọn bàn, có item trong cart) mà bấm "Đổi bàn" hoặc "Về sơ đồ bàn": confirm dialog "Cart hiện có N món. Đổi bàn sẽ giữ nguyên cart hay tạo cart mới?". Tương tự khi từ floor-plan bấm "Bán hàng nhanh" mà có cart cũ.

### 2.4 Epics Impact

**Stories hiện có cần sửa (6 stories):**

| Story | Section | Thay đổi |
|---|---|---|
| **1-4** seed-demo-data | seed.ts | Thêm 2 areas + 8 tables sample (Quầy chính, Sân ngoài) cho store demo; đặt `tableMode=false` mặc định, có 1 store thứ 2 với `tableMode=true` để demo cả 2 mode |
| **2-4** cart-panel | AC | Cart panel không đổi nội tại; thêm `cartStore.tableId`/`tableName` để hỗ trợ context bàn (header màn hình menu hiển thị "Bàn X" — không phải header cart) |
| **2-5** checkout-summary | AC + buildLocalOrder | `buildLocalOrder()` lấy `tableId` + `tableNameSnapshot` từ cart store. KHÔNG bắt buộc tableId khi finalize (FR47b cho phép quick-counter `tableId=null`); server validate `tableId` phải thuộc store nếu có giá trị |
| **2-6** orders-schema-migration | schema + DTO | Order schema thêm `tableId` (nullable FK) + `tableNameSnapshot`; DTO POST `/orders` thêm 2 field optional |
| **2-7** finalize-order-flow | Dexie | `db.orders` schema thêm `tableId`, `tableNameSnapshot` |
| **2-8** receipt-modal-print | UI | Receipt hiển thị "Bàn X" nếu có `tableNameSnapshot` |
| **3-1** admin-layout-nav | nav structure | Thêm section "Quản lý bàn" cạnh "Quản lý Menu" (chỉ render khi `tableMode=true`) |

**Stories KHÔNG bị ảnh hưởng:** Epic 4 (Reports — không group by table cho MVP), 5-1 (Orders list — có thể hiển thị table column nhưng optional polish).

**Epic 6: Quản lý bàn (NEW)** — 9 stories (thêm 6-9 cho quick-counter flow):

- **6-1:** BE — Schema areas/tables + migration + Prisma model + `stores.tableMode` column + `orders.table_id`/`table_name_snapshot`
- **6-2:** BE — CRUD endpoints `/api/v1/areas` (Admin only, tenant-scoped, validation)
- **6-3:** BE — CRUD endpoints `/api/v1/tables` (Admin only, FK to areas, capacity validation)
- **6-4:** BE — `GET /api/v1/stores/me` + `GET /api/v1/tables/status` (occupancy derive từ `orders WHERE table_id IS NOT NULL AND status != 'voided' AND synced_at >= today_open`); DTO POST `/orders` nhận `tableId?: string` + `tableNameSnapshot?: string`, validate `tableId` thuộc store nếu có
- **6-5:** FE — Admin pages: `/admin/areas`, `/admin/tables` (AdminDataTable + form dialog, theo UX-DR-T5, T6, T11)
- **6-6:** FE — Admin store-config page: toggle `tableMode` + cảnh báo khi tắt mà còn bàn đang occupied
- **6-7:** FE — POS Floor Plan view là **entry point khi `tableMode=true`** (UX-DR-T2, T3, T4) + polling `GET /tables/status` mỗi 30s + nav routing logic phụ thuộc tableMode
- **6-8:** FE — POS Table-first flow: từ floor-plan click bàn → vào menu view với **sticky header "Bàn X" + nút Đổi bàn/Hủy** (UX-DR-T7 revised); cart store mở rộng `tableId`/`tableNameSnapshot`; brownfield patches Story 2-4..2-8 (cart, buildLocalOrder, Dexie, receipt) + 3-1 (admin nav)
- **6-9 (NEW):** FE — Quick-counter button + flow trong table mode: nút "Bán hàng nhanh" trên floor-plan (UX-DR-T12) → chuyển sang counter UI (re-use components hiện tại) + header "Về sơ đồ bàn"; mode transition confirm khi đang có cart (UX-DR-T13). Order finalize với `tableId=null`

**Story dependency order:** 6-1 → (6-2, 6-3, 6-4) song song → (6-5, 6-6) song song → 6-7 → 6-8 → 6-9

Stories 2-4 → 2-8 và 3-1 **chỉ sửa khi có 6-1 done** (cần schema). Để giảm churn, **deferral plan:** sửa 2-4..2-8 và 3-1 thành brownfield "table-aware" trong Epic 6 thay vì re-open Epic 2/3.

### 2.5 Other Artifacts

| Artifact | Cần update |
|---|---|
| `_bmad-output/project-context.md` | Thêm naming `areas`/`tables`; cập nhật endpoint cheat sheet (§8); thêm `tableMode` vào Constants (§7) |
| `implementation-artifacts/sprint-status.yaml` | Thêm `epic-6` + 8 story entries (`backlog`) |
| Seed data SQL/TS | Sửa `prisma/seed.ts` (Story 1-4 brownfield) |
| `docs/stitch_caf_pos_mvp/` (UX assets) | Bổ sung wireframe table-picker + floor-plan (nếu workflow yêu cầu mockup) |
| CI / Tests | Test idempotency với payload có `tableId`; e2e test toggle mode bật/tắt |

## 3. Path Forward Evaluation

### Option 1: Direct Adjustment

- **Mô tả:** Sửa stories trong Epic 2 + Epic 3 hiện có, không tạo epic mới
- **Effort:** Medium-High
- **Risk:** Cao — Epic 2 đã `done`, mở lại nhiều stories → churn lớn, lẫn lộn scope finalized vs new
- **Verdict:** ❌ Không khả thi đơn lẻ — quá phức tạp

### Option 2: Potential Rollback

- **Mô tả:** Rollback Epic 2 (orders/sync) để re-architect cho table support từ đầu
- **Effort:** Very High
- **Risk:** Rất cao — phá luồng đã chạy stable; phí cao
- **Verdict:** ❌ Không khả thi — table feature không yêu cầu thay đổi sync engine fundamentals

### Option 3: PRD MVP Review

- **Mô tả:** Mở rộng MVP scope chính thức (PRD update) + tạo Epic 6 + sửa minor các story đã liên quan
- **Effort:** High nhưng phân chia rõ ràng
- **Risk:** Medium — controlled scope expansion; mode toggle bảo vệ store hiện hữu
- **Verdict:** ✅ Khả thi

### Selected Path: **Hybrid (Option 3 + minor Option 1)**

**Mô tả:** PRD MVP scope expansion + Epic 6 mới + brownfield "table-aware" patches trong từng story Epic 6 (thay vì re-open stories Epic 2/3).

**Lý do:**

1. **Bảo vệ work đã done:** Epic 2 + Epic 3 không bị "un-done"; mọi sửa Story 2-4..2-8, 3-1 đóng gói trong Epic 6 stories như task brownfield
2. **Scope rõ ràng:** PRD update minh bạch hóa scope mới; team không tranh cãi đâu là MVP đâu là sau-MVP
3. **Mode toggle = safety net:** Store hiện tại default `tableMode=false` → không user-visible change cho counter-service deployment
4. **Architecture không phải refactor lớn:** Chỉ thêm 2 model + 2 cột mới + 4 endpoint; không đụng sync engine, auth, multi-tenant pattern
5. **UX risk thấp:** Layout 2-cột menu+cart giữ nguyên; floor-plan và quick-counter chỉ thêm router state mới (không tái cấu trúc components đã chạy)

**Effort estimate (rough):**

| Story | Effort | Notes |
|---|---|---|
| 6-1 BE schema | 4-6h | Prisma migration + seed extend |
| 6-2, 6-3 BE CRUD | 8-12h | 2 controller mỗi cái ~4-6h |
| 6-4 BE stores/me + tables/status + orders DTO | 5-7h | Aggregate query + payload validation |
| 6-5 FE admin pages | 8-12h | 2 page với AdminDataTable + form |
| 6-6 FE store-config toggle | 3-5h | Simple page + warning logic |
| 6-7 FE floor-plan view | 8-12h | Grid view + polling + status badges + entry routing |
| 6-8 FE table-first flow + brownfield patches | 10-14h | Sticky header bàn + cart store + Story 2-4..2-8 patches |
| 6-9 FE quick-counter button + flow | 4-6h | Re-use counter UI; routing + confirm dialogs |
| PRD/Arch/UX/project-context updates | 4-6h | Document maintenance |
| QA & e2e tests | 6-10h | Mode toggle, dual-flow (table-first + quick-counter), polling |
| **Tổng** | **~60-90h** (~2-3 sprint developer-week) | Estimate intermediate level |

## 4. Detailed Change Proposals

### 4.1 PRD Changes (`planning-artifacts/prd.md`)

**Edit 1 — line 23 (Đối tượng):**

OLD:
> Quán cà phê hoặc F&B phục vụ tại quầy quy mô nhỏ — một thiết bị POS (tablet landscape hoặc laptop nhỏ), một admin/chủ quán, một hoặc nhiều thu ngân.

NEW:
> Quán cà phê hoặc F&B quy mô nhỏ — vận hành theo mô hình **counter-service** (phục vụ tại quầy) **hoặc table-service** (phục vụ tại bàn). Một thiết bị POS (tablet landscape hoặc laptop nhỏ), một admin/chủ quán, một hoặc nhiều thu ngân. Chế độ bàn bật/tắt theo store qua `tableMode`.

**Edit 2 — line 75-81 (MVP Khả năng cốt lõi):**

THÊM bullet:
> - **Quản lý bàn (mode toggle):** Khu vực + bàn CRUD admin; gắn order với bàn (snapshot tên bàn immutable); table picker khi finalize; floor-plan view theo khu vực; tắt mặc định cho store counter-service.

**Edit 3 — line 85 (Ngoài Phạm vi MVP):**

OLD:
> Quản lý bàn · tồn kho/nguyên liệu/công thức · cổng thanh toán/QR động · màn hình bếp/barista · in nhiệt ESC/POS · ảnh sản phẩm · giao diện đa chi nhánh · loyalty/voucher · production deployment · audit log · backup/restore thủ công.

NEW:
> Split/merge bill · reservation/đặt bàn trước · transfer bàn · floor-plan visual editor · tồn kho/nguyên liệu/công thức · cổng thanh toán/QR động · màn hình bếp/barista · in nhiệt ESC/POS · giao diện đa chi nhánh · loyalty/voucher · production deployment · audit log · backup/restore thủ công.

**Edit 4 — line 89 (Chiến lược Tăng trưởng):**

OLD:
> Quản lý bàn, tồn kho, tích hợp cổng thanh toán, màn hình bếp, in nhiệt ESC/POS, ảnh sản phẩm, giao diện đa chi nhánh, loyalty/điểm thưởng/voucher, báo cáo nâng cao và analytics thời gian thực.

NEW:
> Quản lý bàn nâng cao (split/merge bill, KOT in bếp, reservation, transfer), tồn kho, tích hợp cổng thanh toán, màn hình bếp, in nhiệt ESC/POS, giao diện đa chi nhánh, loyalty/điểm thưởng/voucher, báo cáo nâng cao và analytics thời gian thực.

**Edit 5 — sau line 149 (thêm HT5):**

```markdown
### Hành trình 5: Thu ngân — Bán hàng table-service (table-first flow)

**Nhân vật:** Linh, F&B store có 6 bàn ở 2 khu (Quầy chính, Sân ngoài), `tableMode=true`.

- **Mở màn:** Linh mở POS. Landing là **floor-plan**, header hiển thị "Chế độ bàn: Bật". Thấy bàn 1-4 trống, bàn 5 vàng (đang có order).
- **Diễn biến:** Khách ngồi bàn 3. Linh **click bàn 3** trên floor-plan → vào màn hình chọn món, header sticky hiển thị "Bàn 3" + nút "Đổi bàn"/"Hủy". Thêm món Bạc Xỉu size L → finalize.
- **Đỉnh điểm:** Hệ thống lưu order với `tableId=bàn-3` + `tableNameSnapshot="Bàn 3"`; sync ngay nếu online.
- **Kết thúc:** Hóa đơn in "Bàn 3 — 20260525-POS01-0007". Floor-plan refresh, bàn 3 trở lại trạng thái trống.

**Yêu cầu lộ ra:** FR44, FR45, FR46, FR47, FR49, FR50, FR51, FR52, NFR18.
```

### Hành trình 5b: Thu ngân — Quick-counter trong table mode

**Nhân vật:** Linh, cùng store như HT5; khách mua mang đi (không ngồi bàn).

- **Mở màn:** Linh đang ở floor-plan view.
- **Diễn biến:** Linh bấm nút **"Bán hàng nhanh"** ở header → vào giao diện chọn món counter-service giống MVP hiện tại (không có "Bàn X" header).
- **Đỉnh điểm:** Thêm món → finalize → order có `tableId=null`, `tableNameSnapshot=null`.
- **Kết thúc:** Hóa đơn không in dòng "Bàn"; floor-plan không cập nhật trạng thái bàn nào.

**Yêu cầu lộ ra:** FR47b, FR48 (UI parity), FR51 (nullable), FR52 (ẩn dòng).

**Edit 6 — sau FR43 (thêm nhóm FR44-FR52 + NFR18):**

```markdown
### Quản lý Bàn (Admin + POS)

- **FR44:** Admin có thể bật/tắt chế độ Quản lý bàn theo store (`stores.tableMode` boolean).
- **FR45:** Admin có thể tạo, sửa, xóa khu vực (tên, sort order, isActive).
- **FR46:** Admin có thể tạo, sửa, xóa bàn thuộc khu vực (tên, sức chứa, sort order, isActive).
- **FR47:** Khi `tableMode=true`, flow mặc định là **table-first**: thu ngân chọn bàn (qua floor-plan hoặc table picker) → vào màn hình chọn món → finalize. `tableId` tự gắn vào order.
- **FR47b:** Trong `tableMode=true`, POS có nút **"Bán hàng nhanh"** cho phép vào counter-service flow; order tạo từ flow này có `tableId=null`.
- **FR48:** Khi `tableMode=false`, POS hoạt động đúng counter-service hiện tại (FR8-FR18 không đổi); KHÔNG hiển thị floor-plan + nút "Bán hàng nhanh".
- **FR49:** Thu ngân chọn bàn qua table picker (dropdown theo khu vực) hoặc floor-plan view (click ô bàn).
- **FR50:** Floor-plan view là entry point mặc định khi `tableMode=true`; lưới bàn theo khu vực, hiển thị status (trống/đang order/chờ sync).
- **FR51:** Order lưu kèm `tableId` nullable + `tableNameSnapshot` (immutable AR24). `tableId=null` cho quick-counter hoặc counter-mode store.
- **FR52:** Hóa đơn in hiển thị tên/số bàn nếu có; ẩn dòng nếu `tableId=null`.

### NFR Bổ sung

- **NFR18:** Chế độ `tableMode` có thể bật/tắt qua admin UI và áp dụng cho POS sau khi reload session — không cần redeploy code.
```

### 4.2 Architecture Changes (`planning-artifacts/architecture.md`)

**Edit 1 — Section "Kiến trúc Dữ liệu" Schema chính (line ~149):**

THÊM:
> - `areas`, `tables` (table-service mode: `areas` chứa khu vực, `tables` thuộc area, scoped tenant+store)
> - `orders.table_id` nullable FK + `orders.table_name_snapshot` (immutable AR24)
> - `stores.table_mode` boolean (FR44 mode toggle)

**Edit 2 — Section "Endpoint chính" cheat sheet (line ~441-456 trong project-context.md đồng bộ):**

THÊM rows:

| Endpoint | Method | Auth | Note |
|---|---|---|---|
| `/api/v1/areas` | GET/POST/PATCH/DELETE | bearer + admin | FR45 |
| `/api/v1/tables` | GET/POST/PATCH/DELETE | bearer + admin | FR46 |
| `/api/v1/tables/status` | GET | bearer | Polling occupancy |
| `/api/v1/stores/me` | GET | bearer | Trả `tableMode` + store info |

**Edit 3 — Section "Mẫu sync payload" (line ~396-422):**

Bổ sung field `tableId` + `tableNameSnapshot` trong example JSON; ghi chú "table fields chỉ xuất hiện khi `tableMode=true` ở store".

**Edit 4 — Section "Trình tự implementation" (line ~213-218):**

THÊM step 5:
> 5. Table management (Epic 6): areas/tables schema → CRUD admin → table picker FE → floor-plan view → mode toggle integration

**Edit 5 — Section "Bounded Constants" (project-context.md §7):**

THÊM rows:

| Constant | Giá trị | Lý do |
|---|---|---|
| `tableMode` default | `false` | FR48 — backward compatible với store counter-service |
| Floor-plan polling interval | `30s` khi focus tab | UX-DR-T4 status refresh |
| Table snapshot field | `tableNameSnapshot` immutable | AR24 |

### 4.3 UX Changes (`planning-artifacts/ux-design-specification.md`)

THÊM section mới sau UX-DR36 cuối:

```markdown
### Quản lý bàn F&B (UX-DR-T1 → T13)

- UX-DR-T1: Table Picker — dropdown/modal chọn bàn theo khu vực, alternative entry point (ngoài floor-plan)
- UX-DR-T2: Floor Plan Grid View — entry point mặc định khi `tableMode=true`; responsive 2-4 columns ≥1024px landscape, touch target ≥56px
- UX-DR-T3: Area Tabs — horizontal tab khu vực (scroll ngang nếu nhiều); persist `selectedAreaId`
- UX-DR-T4: Table Status Badge — xanh (trống), vàng (đang order), đỏ (chờ sync), xám (disabled); icon + màu cho accessibility
- UX-DR-T5: Admin Table Form Dialog — name, areaId dropdown, capacity int 1+, sortOrder, isActive switch
- UX-DR-T6: Admin Area Form Dialog — name, sortOrder, isActive switch
- UX-DR-T7: POS Layout — Trong `tableMode=true`, landing là floor-plan; sau khi chọn bàn vào menu view với sticky header "Bàn X" + Đổi bàn / Hủy chọn bàn; layout 2-cột (menu + cart) giữ nguyên
- UX-DR-T8: Mode Toggle Header Indicator — badge "Chế độ bàn: Bật/Tắt" cạnh sync status, cashier read-only
- UX-DR-T9: POS Empty State — "Chưa cấu hình bàn. Vui lòng liên hệ quản trị viên."
- UX-DR-T10: Admin Empty State — onboarding tạo area + bàn mẫu
- UX-DR-T11: Admin Navigation — section "Quản lý bàn" (Areas, Tables) cạnh Menu, Reports
- UX-DR-T12: "Bán hàng nhanh" button — hiển thị tại header floor-plan khi `tableMode=true`; click → counter UI; header POS có nút "Về sơ đồ bàn" để quay lại
- UX-DR-T13: Mode transition affordance — confirm dialog khi đổi bàn / vào quick-counter / thoát quick-counter trong lúc cart có item ("Giữ cart" / "Tạo cart mới" / "Hủy")
```

### 4.4 Epics Changes (`planning-artifacts/epics.md`)

**Tóm tắt:**

- **Brownfield notes** thêm vào section "Out of MVP/Future" → "Epic 6 (added 2026-05-25): Quản lý bàn F&B"
- **Mở Epic 6** với 9 stories chi tiết (tham chiếu §2.4 ở trên)
- Stories 2-4..2-8 và 3-1: **không re-open trong epics.md**; thay vào đó Story 6-8 chứa brownfield tasks "Modify Story X.Y to include tableId" với danh sách file path cần touch

**Chi tiết 9 stories mới** (high-level skeleton):

| Story | Title | Key ACs |
|---|---|---|
| 6-1 | BE — Schema areas/tables + stores.tableMode + orders.tableId | Prisma model + migration + seed extend (1 store mode-off + 1 store mode-on) + multi-tenant scope verify |
| 6-2 | BE — `/api/v1/areas` CRUD | Admin role guard, unique name per store, sort order, validation |
| 6-3 | BE — `/api/v1/tables` CRUD | Admin role guard, FK to area, capacity ≥1, isActive toggle |
| 6-4 | BE — `/api/v1/stores/me` + `/api/v1/tables/status` + orders DTO patch | stores/me trả `tableMode`; status derive từ orders today; POST `/orders` chấp nhận `tableId?` + `tableNameSnapshot?` (server validate FK thuộc store) |
| 6-5 | FE — Admin Areas + Tables management pages | AdminDataTable, form dialogs, UX-DR-T5/T6/T11 |
| 6-6 | FE — Admin store-config toggle tableMode | Switch + warning khi tắt mà có bàn occupied |
| 6-7 | FE — POS Floor Plan view + polling + routing | UX-DR-T2/T3/T4/T8, polling 30s, entry point routing khi `tableMode=true`, nav gating |
| 6-8 | FE — Table-first flow + brownfield 2-4..2-8 + 3-1 patches | Sticky "Bàn X" header (UX-DR-T7), cart store mở rộng, buildLocalOrder snapshot, Dexie schema, receipt FR52, admin nav (FR50 visible) |
| 6-9 | FE — Quick-counter button + flow (FR47b) | Nút "Bán hàng nhanh" trên floor-plan (UX-DR-T12), route to counter UI re-use, header "Về sơ đồ bàn", mode transition confirm dialogs (UX-DR-T13), order finalize với `tableId=null` |

### 4.5 Project-Context Changes (`_bmad-output/project-context.md`)

- Thêm `areas`, `tables` vào §3.A naming examples (tables snake_case plural)
- Thêm `Area`, `Table` vào §3.B Prisma model examples
- Thêm 4 endpoint mới vào §8 cheat sheet
- Thêm constants vào §7 (`tableMode` default, polling interval)
- Cập nhật §4 cấu trúc thư mục FE: thêm `features/tables/`

### 4.6 Sprint Status Changes (`implementation-artifacts/sprint-status.yaml`)

```yaml
development_status:
  # ... existing entries ...
  epic-6: backlog
  6-1-be-schema-areas-tables-stores-tablemode-orders-tableid: backlog
  6-2-be-areas-crud-endpoints: backlog
  6-3-be-tables-crud-endpoints: backlog
  6-4-be-stores-me-tables-status-orders-dto-patch: backlog
  6-5-fe-admin-areas-tables-management-pages: backlog
  6-6-fe-admin-store-config-tablemode-toggle: backlog
  6-7-fe-pos-floor-plan-view-polling-entry-routing: backlog
  6-8-fe-pos-table-first-flow-brownfield-orders-integration: backlog
  6-9-fe-pos-quick-counter-button-mode-transitions: backlog
  epic-6-retrospective: optional
```

## 5. Implementation Handoff

### Scope Classification: **MAJOR**

**Lý do:**

- PRD scope expansion (6 edits + new FR section gồm FR47b + 2 journeys HT5/HT5b + NFR18)
- Architecture updates (schema + API + endpoint cheat sheet + implementation order)
- UX-DR additions (13 items, gồm T12/T13 cho dual-flow)
- New Epic với 9 stories (dual-flow: table-first + quick-counter)
- Brownfield patches to 6 existing stories (Story 6-8 chứa các patch)

### Routing

| Recipient | Responsibility |
|---|---|
| **Product Manager (John)** | Apply PRD edits §4.1; validate FR44-FR52 + FR47b phrasing; ensure HT5 + HT5b journeys complete; confirm out-of-scope split (basic vs advanced table mgmt) |
| **System Architect (Winston)** | Apply Architecture edits §4.2; review Prisma schema additions; validate API contracts; confirm sync engine non-impact; update implementation sequence |
| **UX Designer (Sally)** | Apply UX-DR-T1..T13 §4.3; produce wireframes (optional) cho floor-plan view + sticky bàn header + "Bán hàng nhanh" button + mode transition confirms; validate touch target tại 1024px |
| **Tech Writer (Paige)** | Update project-context.md §4.5; index docs cho artifact mới nếu có |
| **Developer (Amelia)** + **PO** | Create 9 story files in `implementation-artifacts/` (Story 6-1..6-9); update sprint-status.yaml; sequence stories với dependencies 6-1 → 6-2/6-3/6-4 → 6-5/6-6 → 6-7 → 6-8 → 6-9 |

### Success Criteria

1. ✅ PRD reflects new MVP scope; FR44-FR52 + FR47b + NFR18 added; HT5 + HT5b journeys written
2. ✅ Architecture diagram + endpoint cheat sheet updated; schema additions documented
3. ✅ All 13 UX-DR-T items added với measurable acceptance phrasing
4. ✅ Epic 6 với 9 stories created in epics.md
5. ✅ sprint-status.yaml updated; 9 new entries `backlog`
6. ✅ Existing store counter-service deployment tiếp tục hoạt động unchanged khi `tableMode=false`
7. ✅ Trong `tableMode=true`, cả 2 flow chạy được: table-first và quick-counter
8. ✅ Demo seed có 1 store mode-off + 1 store mode-on để test cả 2 paths + thử quick-counter

### Sequencing Recommendation

1. **Step 1 (PM + Arch + UX):** Update planning artifacts (PRD, Arch, UX) — 1 working day
2. **Step 2 (Tech Writer):** Update project-context.md sau khi Arch done — 0.5 day
3. **Step 3 (PO + Dev):** Run `bmad-create-story` cho 6-1; sprint-planning update — 0.5 day
4. **Step 4 (Dev):** Execute 6-1 → 6-2/6-3/6-4 (BE foundation) — ~3 days
5. **Step 5 (Dev):** Execute 6-5 → 6-6 (Admin FE) — ~2 days
6. **Step 6 (Dev):** Execute 6-7 (Floor-plan + routing) — ~2 days
7. **Step 7 (Dev):** Execute 6-8 (Table-first flow + brownfield 2-4..2-8 + 3-1) — ~2-3 days
8. **Step 8 (Dev):** Execute 6-9 (Quick-counter button + mode transitions) — ~1 day
9. **Step 9 (QA):** E2E test cả 2 flow (table-first, quick-counter), mode toggle on/off, mode transition with cart, polling — ~1.5 days
10. **Step 10 (Retro):** Epic 6 retrospective — optional

**Total elapsed:** ~2.5 sprint-week tại 1 dev intermediate.

## 6. Known Limitations / Out of Scope of THIS Change

- **No split/merge bill** — order vẫn 1-1 với bàn; nhiều khách cùng bàn dùng "chia tay" thủ công
- **No transfer table** — order đã tạo không đổi bàn được; phải void rồi tạo lại (note: "Đổi bàn" trong UX-DR-T13 chỉ áp dụng cho cart đang ở trạng thái draft, chưa finalize)
- **No reservation** — không đặt bàn trước
- **No KOT / kitchen display** — bếp không nhận thông báo tự động
- **Table status không realtime** — polling 30s; 2 POS cùng chọn 1 bàn cùng lúc có thể tạo 2 order (sync engine vẫn idempotent, conflict log audit)
- **Floor-plan không visual editor** — admin chỉ quản lý qua AdminDataTable, không drag-drop layout
- **Reports chưa break down theo bàn** — Epic 4 không sửa; quick-counter (`tableId=null`) và table sales được aggregate chung
- **Quick-counter UX không có analytics riêng** — server không phân biệt order quick-counter vs MVP counter-mode store (cả 2 đều `tableId=null`)

## 7. Approval

| Field | Value |
|---|---|
| Người đề xuất | Tuan.nguyen |
| Ngày | 2026-05-25 |
| Trạng thái | **Approved 2026-05-25 by Tuan.nguyen** |
| Tham chiếu skill | `bmad-correct-course` |

---

**Để approve:** Xác nhận "yes" hoặc nêu điểm cần revise. Sau approval, sprint-status.yaml sẽ được cập nhật và route sang PM/Architect/UX để patch từng artifact.
