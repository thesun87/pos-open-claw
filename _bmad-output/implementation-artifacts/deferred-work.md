# Deferred Work

## Deferred from: code review of 6-11-be-table-session-lifecycle-occupancy-sync (2026-06-04)

- `settle()` repository không filter `status=open` — `updateMany` không có điều kiện `status: open` nên có thể settle session đang `voided`/`superseded`. Không ảnh hưởng Phase 1 (không có cơ chế void/supersede). Cần sửa khi Phase 2 implement voiding endpoint [pos-api/src/tables/table-sessions.repository.ts:130].
- `TableSession` schema thiếu FK explicit `tenant_id → tenants(id)` và `store_id → stores(id)` — Pattern deviation so với `Area`, `Table`, `User` đều có FK explicit. AC2 đánh dấu là optional; transitive FK qua `table_id → tables.id` bảo vệ đủ trong Phase 1. Cân nhắc thêm khi có lúc sửa schema tiếp theo [pos-api/prisma/schema.prisma:100].
- `countOpenSessionsByTable` dùng `runWithTenantContext(context, ...)` thừa — inner code đã có explicit `tenantId/storeId` trong where clause. Harmless redundancy, có thể clean up trong Phase 2 refactor [pos-api/src/tables/table-sessions.repository.ts:161].

## Deferred from: code review of 6-7-fe-pos-floor-plan-view-polling-entry-routing (2026-05-26)

- console.warn test assertion missing for isError case in `pos-shell.test.tsx` — AC16 item 5 requires `console.warn called` verification but test only verifies product grid renders. Minor gap; Story 6.8 can add assertion if desired.

## Deferred from: code review of 6-2-be-areas-crud-endpoints (2026-05-25)

- Empty PATCH body trả HTTP 409 thay vì 400 — `ConflictException` trong `AreasService.update()` và `CategoriesService.update()` khi body rỗng nên là `BadRequestException` (400). Pre-existing pattern từ story 3.2 (`CategoriesService`). Cần refactor cả 2 service nếu muốn đúng spec HTTP.
- Repository `delete()` có redundant `findFirst` trong transaction — `AreasRepository.delete()` và `CategoriesRepository.delete()` tự check existence lại dù service đã check trước đó. Extra round-trip không gây bug; có thể simplify sau khi coverage test đảm bảo.
