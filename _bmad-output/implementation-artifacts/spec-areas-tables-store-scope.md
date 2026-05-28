---
title: 'Scope /areas và /tables list theo storeId hiện tại'
type: 'bugfix'
created: '2026-05-27'
status: 'done'
baseline_commit: 'b41476be2dafe86b4dcf01534556830c77f3c60a'
context: ['{project-root}/_bmad-output/project-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GET /api/v1/areas` và `GET /api/v1/tables` trả về area/table của **mọi store trong tenant** thay vì chỉ store của user đăng nhập. `AreasRepository.list()` và `TablesRepository.list()` gọi `this.prisma.{area,table}.findMany` trực tiếp — qua Proxy của `PrismaService`, đây là delegate RAW không qua `tenantScopeExtension`, nên không scope cả tenant lẫn store (vi phạm RULE 5 multi-tenant). Hệ quả thực tế: cashier ở store POS01 (`...002`) thấy 2 area + 8 bàn thuộc store "Table Service" (`...006`).

**Approach:** Thêm `where: { tenantId, storeId }` tường minh từ `context` vào cả hai `list()`, đúng theo pattern đang chạy của `TablesRepository.listActiveTableOrderCounts` (cùng file, dùng cho `/tables/status`). KHÔNG chuyển sang `tenantScopedClient(this.prisma)` vì pattern sync-arrow + await-ngoài-scope làm extension mất AsyncLocalStorage context và ném "Tenant context is required".

## Boundaries & Constraints

**Always:** Lọc theo cả `tenantId` VÀ `storeId` lấy từ `context` (`TenantContext`). Giữ nguyên `orderBy`, `select`, và filter `areaId` tùy chọn của `tables`. Thêm test cùng commit (RULE 3). Không đổi response shape.

**Ask First:** Nếu phát hiện endpoint list khác cùng kiểu lỗi (vd `/categories`, `/products`) — báo, KHÔNG tự mở rộng phạm vi.

**Never:** KHÔNG đổi `findById`/`create`/`update`/`delete` (đã scope qua tx/explicit). KHÔNG sửa cơ chế `tenantScopeExtension` hay Proxy của `PrismaService`. KHÔNG đụng tới `pos-web` hay file đang dirty không liên quan.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List areas trong store | context store=S1; DB có area ở S1 và S2 | Chỉ trả area thuộc tenant+S1 | N/A |
| List tables trong store | context store=S1; DB có table ở S1 và S2 | Chỉ trả table thuộc tenant+S1 | N/A |
| List tables lọc theo area | context store=S1, `areaId=A` | Trả table thuộc tenant+S1+areaId=A | N/A |
| Store rỗng | context store=S3 không có area/table | Trả `[]` | N/A |
| Thiếu context | `context` undefined / thiếu storeId | Service ném Forbidden (giữ nguyên hành vi `ensureContext`) | 403 Forbidden |

</frozen-after-approval>

## Code Map

- `pos-api/src/tables/areas.repository.ts` — `AreasRepository.list()` (dòng ~50) dùng `this.prisma.area.findMany` không scope → cần thêm where.
- `pos-api/src/tables/tables.repository.ts` — `TablesRepository.list()` (dòng ~58) dùng `this.prisma.table.findMany` không scope → cần thêm where; `listActiveTableOrderCounts` (dòng ~148) là pattern mẫu đúng.
- `pos-api/src/tables/tables.repository.spec.ts` — đã có test cho `listActiveTableOrderCounts`; thêm describe cho `list`.
- `pos-api/src/tables/areas.repository.spec.ts` — CHƯA tồn tại; tạo mới.
- `pos-api/src/tables/{areas,tables}.service.ts` — `ensureContext` đã chặn context thiếu; không đổi.

## Tasks & Acceptance

**Execution:**
- [x] `pos-api/src/tables/areas.repository.ts` — Trong `list()`, thêm `where: { tenantId: context.tenantId, storeId: context.storeId }` vào `findMany`. Giữ `select`/`orderBy`.
- [x] `pos-api/src/tables/tables.repository.ts` — Trong `list()`, đổi `where` thành `{ tenantId: context.tenantId, storeId: context.storeId, ...(areaId ? { areaId } : {}) }`. Giữ `select`/`orderBy`.
- [x] `pos-api/src/tables/areas.repository.spec.ts` — Tạo mới: mock `prisma.area.findMany`, assert `list(context)` gọi `findMany` với `where` chứa `tenantId`+`storeId`.
- [x] `pos-api/src/tables/tables.repository.spec.ts` — Thêm describe `TablesRepository.list`: assert where có `tenantId`+`storeId`; case có `areaId` thì where thêm `areaId`.

**Acceptance Criteria:**
- Given DB có area/table ở 2 store cùng tenant, when gọi `list` với context store=S1, then chỉ trả bản ghi thuộc S1 (không rò rỉ S2).
- Given `tsc --noEmit` + `jest` chạy ở `pos-api`, when build/test, then pass và coverage không tụt dưới gate (≥70% services/filters).

## Verification

**Commands:**
- `cd pos-api && npx tsc --noEmit` -- expected: không lỗi type
- `cd pos-api && npx jest src/tables` -- expected: tất cả test tables pass, gồm test scope mới
- `cd pos-api && npx eslint src/tables` -- expected: không warning

## Suggested Review Order

**Fix store-scope (core)**

- Entry point: thêm `tenantId`+`storeId` vào where, merge với filter `areaId` tùy chọn.
  [`tables.repository.ts:62`](../../pos-api/src/tables/tables.repository.ts#L62)

- Cùng fix cho areas (không có filter areaId).
  [`areas.repository.ts:52`](../../pos-api/src/tables/areas.repository.ts#L52)

- Pattern mẫu đã đúng từ trước (đối chiếu): `/tables/status` scope thủ công.
  [`tables.repository.ts:159`](../../pos-api/src/tables/tables.repository.ts#L159)

**Regression tests**

- Test tables: where có tenantId+storeId; case areaId thêm vào where.
  [`tables.repository.spec.ts:109`](../../pos-api/src/tables/tables.repository.spec.ts#L109)

- Test areas (file mới).
  [`areas.repository.spec.ts:31`](../../pos-api/src/tables/areas.repository.spec.ts#L31)
