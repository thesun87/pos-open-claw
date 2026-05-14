# Story 2.13: Backend Void Endpoint + Frontend Void Synced Order Flow

Status: done

<!-- Context engine analysis completed from Epic 2 source artifacts, architecture, UX spec, project context, and prior Story 2.6–2.12 implementation state. -->

## Story

As a cashier or admin,  
I want void một đơn đã sync bằng cách tạo bản ghi void riêng kèm lý do (KHÔNG sửa đơn gốc),  
so that lịch sử tài chính giữ append-only và báo cáo phản ánh đúng số đơn hợp lệ (FR26, AR25).

## Acceptance Criteria

1. Given schema `OrderVoid` từ Story 2.6, when developer triển khai `POST /api/v1/orders/:id/void` trong `pos-api/src/orders/orders.controller.ts`, then endpoint yêu cầu Bearer token và role `cashier` hoặc `admin`.
2. Given request body `{ reason: string }`, when POST void, then validate `reason` required, trim non-empty, min 3 chars, max 500 chars; invalid body returns RFC 7807 validation response via global `ProblemDetailsFilter`.
3. Given path param `:id`, when POST void, then validate UUID v7 format before repository write; invalid id returns RFC 7807 validation response.
4. Given order exists in caller tenant/store scope, when POST void succeeds, then insert `OrderVoid { id: uuidv7(), orderId, voidedBy: currentUser.id, reason, voidedAt: now() }` and return HTTP 201 body `{ voidId, voidedAt }` with ISO 8601 UTC date.
5. Given original `Order` row and snapshot children, when void succeeds, then do not modify `orders`, `order_items`, or `order_item_options` fields; void is append-only in `order_voids` only.
6. Given order has already been voided, when POST `/orders/:id/void` again, then return 409 RFC 7807 with `type=https://pos.example/errors/already-voided` and title `Đơn đã được hủy`.
7. Given order id does not exist or belongs to another tenant/store, when POST void, then return 404 RFC 7807 with `type=https://pos.example/errors/not-found`; do not leak cross-tenant existence.
8. Given unauthenticated or unauthorized caller, when POST void, then auth required returns 401 and non-cashier/admin role returns 403 through existing guards/filter.
9. Given frontend void flow from `ReceiptModal` or synced-order detail in `SyncRetryPanel`, when cashier/admin clicks `Void đơn này`, then open existing `<VoidOrderDialog />` with reason input and submit calls `POST /orders/:serverOrderId/void`.
10. Given void API success, when frontend receives `{ voidId, voidedAt }`, then update Dexie `db.orders.update(clientOrderId, { voidedAt: response.voidedAt, voidReason: trimmedReason, updatedAt: nowIso })` and show calm feedback `Đã void đơn {orderCode}`.
11. Given an order has `voidedAt`, when rendered in receipt/list, then display visible badge/text `Đã void`; receipt shows watermark/stamp `ĐÃ HỦY` plus reason, while original total remains visible for historical record.
12. Given cashier/admin is offline and order is already `synced`, when clicking void, then do not enqueue an MVP pending-void action; show microcopy `Cần kết nối để void đơn đã đồng bộ` / `Cần kết nối để void` and keep Dexie unchanged.
13. Tests cover backend happy path, double-void 409, non-existent 404, cross-tenant 404, auth required 401, forbidden 403, validation errors, and assert original `Order` fields unchanged after void.
14. Tests cover frontend dialog submit, offline blocked copy, Dexie void metadata update, `Đã void` badge/stamp/reason in receipt/list, and no void action for `pendingSync`/`syncFailed` orders.

## Tasks / Subtasks

- [x] Add backend void DTO and validation (AC: 2, 3)
  - [x] Create `pos-api/src/orders/dto/void-order.dto.ts` with class-validator decorators: `@IsString()`, `@MinLength(3)`, `@MaxLength(500)`; transform/trim reason if existing ValidationPipe transform supports it, otherwise trim in service before persist.
  - [x] Add UUID v7 path validation for `:id` using existing validation style or a small local pipe/helper; do not accept UUID v4 if project UUID helpers already distinguish v7.
  - [x] Add Swagger request/response examples for void endpoint.
- [x] Implement backend append-only void use case (AC: 1, 4, 5, 6, 7, 8)
  - [x] Update `pos-api/src/orders/orders.controller.ts`: add `@Post(':id/void')`, `@Roles('cashier', 'admin')`, `@HttpCode(201)`, `@Param('id')`, `@TenantContext()`, and body DTO.
  - [x] Add `OrdersService.voidOrder(context, orderId, dto)` that requires `tenantId`, `storeId`, and `userId`; missing context remains forbidden.
  - [x] Add repository method under `pos-api/src/orders/repositories/orders.repository.ts` using `runWithTenantContext(context, ...)` and a Prisma transaction.
  - [x] In transaction: find scoped order by `id` (tenant/store auto-scope or explicit filter); if absent throw 404 Problem Details.
  - [x] Check existing `orderVoid` for `orderId`; if exists throw 409 Problem Details with `PROBLEM_TYPES.alreadyVoided` and Vietnamese title.
  - [x] Insert one `orderVoid` with `uuidv7()`, `orderId`, `voidedBy: context.userId!`, trimmed reason, `voidedAt` server now.
  - [x] Do not call any Prisma `order.update`, `orderItem.update`, or snapshot-field mutation.
  - [x] Extend `pos-api/src/common/errors/problem-types.ts` with `alreadyVoided: 'https://pos.example/errors/already-voided'`.
- [x] Add backend tests/gates (AC: 6, 7, 8, 13)
  - [x] Extend `orders.service.spec.ts` for happy path, already voided, not found, validation-ish service guard, and “order unchanged” assertion via repository mock/transaction fixture.
  - [x] Extend `orders.controller.spec.ts` or e2e tests for route guards/status: 201/409/404/401/403 and DTO validation.
  - [x] Add cross-tenant fixture/assertion: same order id outside caller tenant/store returns 404, not 403/409.
  - [x] Run from `pos-api/`: targeted orders tests, `npm run test`, `npm run lint`, `npm run build` if practical.
- [x] Add frontend void API client (AC: 9, 10)
  - [x] Update `pos-web/src/features/orders/api.ts` to export `voidSyncedOrder({ serverOrderId, reason })` using existing `apiClient.post('/orders/:id/void', { reason })` and typed response `{ voidId: string; voidedAt: string }`.
  - [x] Map Problem Details through existing API/error handling; do not render raw `detail` in cashier UI.
- [x] Wire synced-order void UI (AC: 9, 11, 12, 14)
  - [x] Reuse existing `pos-web/src/features/orders/components/void-order-dialog.tsx`; keep labels Vietnamese and danger button label `Hủy đơn này` or explicit void copy if component supports override.
  - [x] Update `ReceiptModal` to derive full live Dexie order, not just status; include `voidedAt`/`voidReason` in `displayOrder`.
  - [x] In `ReceiptModal`, show `Void đơn này` action only when `status === 'synced'`, `serverOrderId` exists, and no `voidedAt`.
  - [x] If offline per `useConnectivity()`/connectivity store, disable/block void and show `Cần kết nối để void đơn đã đồng bộ`; do not write `pendingVoids`.
  - [x] On submit success, update Dexie by `clientOrderId` with `voidedAt`, `voidReason`, `updatedAt`, then show feedback `Đã void đơn {orderCode}` via existing toast/inline accessible feedback pattern.
  - [x] Display badge/text `Đã void` anywhere order row/list or receipt summary shows the voided order.
  - [x] Add receipt stamp/watermark `ĐÃ HỦY` and reason while preserving original total display.
- [x] Optional frontend list integration (AC: 9, 11, 14)
  - [x] If `SyncRetryPanel` has a synced-order receipt/history seam, add void entry there; otherwise do not expand panel scope just to list all synced orders.
  - [x] Ensure no void action appears for `pendingSync` or `syncFailed` rows; Story 2.12 explicitly separates finalized pending rows from cart cancel.
- [x] Add frontend tests/gates (AC: 9, 10, 11, 12, 14)
  - [x] Extend `receipt-modal.test.tsx` for void button visibility, dialog validation, API call with server id, Dexie update, offline blocked copy, void stamp/reason, no action for pending/failed/non-server orders.
  - [x] Add/update `api.test.ts` for `voidSyncedOrder()` path/body/typed response.
  - [x] Run from `pos-web/`: targeted tests (`receipt-modal`, `orders/api`, maybe `void-order-dialog`), `npm run typecheck`, `npm run lint`, `npm run build` if practical.

## Dev Notes

### Source Requirements

- Story source is `_bmad-output/planning-artifacts/epics.md` Story 2.13: backend `POST /api/v1/orders/:id/void`, append-only `OrderVoid`, duplicate 409, not found/cross-tenant 404, FE void from receipt/panel, offline blocked MVP behavior, backend tests for void scenarios.
- PRD FR26 requires synced-order cancellation by separate void record with reason, not mutating financial history.
- Architecture AR25 and project context Rule 4 require append-only orders and immutable snapshot fields; do not update original order totals/items/snapshots for void.

### Existing Backend State (must preserve)

- `pos-api/prisma/schema.prisma` already has `Order`, `OrderItem`, `OrderItemOption`, `SyncLog`, and `OrderVoid` from Story 2.6. `OrderVoid` currently has `id`, `orderId`, `voidedBy`, `reason`, `voidedAt`, relation to `Order` and `User`, and index `idx_order_voids_order_id`.
- Current `OrderVoid` schema has no unique constraint on `orderId`. To enforce single-void safely, service must check existing void in transaction. If adding a unique constraint is chosen, it requires a Prisma migration and should be named consistently, e.g. `uq_order_voids_order_id`; keep it compatible with existing data.
- `OrdersController` currently exposes only `POST /orders` with `@Roles('cashier','admin')`, `JwtAuthGuard`, `RolesGuard`, and `@TenantContext()`.
- `OrdersService.syncOrder()` validates idempotency key, totals, menu version, then creates order + sync log. Do not disturb idempotent sync behavior.
- `OrdersRepository.createOrderWithSyncLog()` already uses `runWithTenantContext(context, ...)`, transaction, `uuidv7()`, and never updates snapshots. Follow that pattern for void.
- Problem type constants are in `pos-api/src/common/errors/problem-types.ts`. Existing generic types include `validation`, `notFound`, `conflict`, etc.; Story 2.13 needs stable URI `.../already-voided` for FE mapping/tests.

### Existing Frontend State (must preserve)

- `pos-web/src/db/schemas/orders.ts` already includes optional `voidedAt?: string` and `voidReason?: string` on `LocalOrderRecord`; use these fields instead of inventing a new table for MVP.
- Dexie orders schema is `clientOrderId, status, soldAt, deviceId, createdAt`; void fields are not indexed. That is fine for receipt/list display because records are read by existing primary key/status queries.
- `pos-web/src/features/orders/components/void-order-dialog.tsx` was added in Story 2.12 for cart-level cancel. Reuse/extend it rather than creating a second confirmation dialog.
- `ReceiptModal` currently uses `useLiveQuery()` but only overlays `status`; Story 2.13 needs it to overlay all live fields (`serverOrderId`, `voidedAt`, `voidReason`, maybe `updatedAt`) so receipt reacts after void.
- `SyncStatusBadge` supports order sync states only (`pendingSync`, `synced`, `syncFailed`). Do not overload it with void state unless API/type is explicitly extended; a separate `Đã void` badge is safer.
- `finalizeOrder()` writes local order as `pendingSync` then `syncEngine.kick()`. Sync engine later sets `status='synced'` plus `serverOrderId`/`syncedAt`; void flow must require that server id.
- `SyncRetryPanel` is currently for `pendingSync` and `syncFailed` rows. Do not make pending/failed orders voidable; server-side void applies only to synced orders.

### UX / Accessibility Guardrails

- UX-DR15 requires `VoidOrderDialog` with required reason, specific destructive label (not generic `OK`), confirm before destructive action, keyboard focus in dialog, Esc close/focus return.
- UX-DR16 says sync/offline error copy should be calm and actionable. For offline void, use `Cần kết nối để void đơn đã đồng bộ` / `Cần kết nối để void`, not raw network errors.
- Receipt of voided order must remain historically readable: show total and items, but stamp `ĐÃ HỦY` plus reason so cashier/admin cannot mistake it for active revenue.
- Status and void state must include visible text, not color-only.

### Security / Multi-Tenant / Error Handling

- All DB business queries must go through Prisma tenant scope (`runWithTenantContext`/`$extends`) or explicit `tenantId` + `storeId` filters. Cross-tenant order id must resolve as 404.
- Use `@Roles('cashier','admin')`; admin and cashier may void, other roles must fail 403.
- Error responses must go through global RFC 7807 `ProblemDetailsFilter`; do not manually return `{ success, message }` or raw Nest error bodies.
- Frontend must not expose raw Problem Details `detail`, SQL, tenant ids, stack traces, or idempotency internals.

### Previous Story Intelligence

- Story 2.12 deliberately handled only cart-level pre-finalize cancel and forbids persisted cancellation rows/API calls. Story 2.13 is the first server-side void flow.
- Story 2.11 kept SyncRetryPanel retry-focused and explicitly said not to implement synced-order void yet.
- Story 2.10 made pending counts Dexie-reactive. Voiding a synced order should not affect pending counter.
- Story 2.9 sync engine posts sequentially and updates successful orders to `synced`; do not modify sync drain semantics.
- Story 2.8 receipt modal already reacts to Dexie status changes; extend this rather than re-fetching server order state.
- Story 2.6 owns order schema and idempotent endpoint; this story should not redesign order creation or snapshot calculation.

### Project Structure Notes

Expected backend files to create/update:

- NEW: `pos-api/src/orders/dto/void-order.dto.ts`
- UPDATE: `pos-api/src/orders/orders.controller.ts`
- UPDATE: `pos-api/src/orders/orders.service.ts`
- UPDATE: `pos-api/src/orders/repositories/orders.repository.ts`
- UPDATE: `pos-api/src/common/errors/problem-types.ts`
- UPDATE: `pos-api/src/orders/orders.controller.spec.ts`
- UPDATE: `pos-api/src/orders/orders.service.spec.ts`
- OPTIONAL migration only if adding DB uniqueness: `pos-api/prisma/migrations/<timestamp>_unique_order_void_order_id/migration.sql` and `schema.prisma`

Expected frontend files to create/update:

- UPDATE: `pos-web/src/features/orders/api.ts`
- UPDATE: `pos-web/src/features/orders/api.test.ts`
- UPDATE: `pos-web/src/features/orders/components/receipt-modal.tsx`
- UPDATE: `pos-web/src/features/orders/components/receipt-modal.test.tsx`
- UPDATE if needed: `pos-web/src/features/orders/components/void-order-dialog.tsx` and test, to support submit pending state / label override while preserving Story 2.12 behavior.
- UPDATE only if a synced-order list already exists there: `pos-web/src/features/sync/components/sync-retry-panel.tsx`; otherwise leave retry panel pending/failed-only.

Layering reminders:

- `features/orders` may import `db`, `shared`, and own order API/types.
- `shared` must not import `features/orders`.
- `routes` may compose feature components. Avoid introducing cross-feature imports between `features/sync` and `features/orders` unless routed through a route-level composition seam.

## Scope Boundaries

- Do NOT implement Epic 4 reports aggregation here; only ensure void data exists for Epic 4 to exclude later.
- Do NOT implement queued pending voids for offline MVP unless product explicitly changes architecture; current AC accepts blocked offline copy.
- Do NOT void `pendingSync` or `syncFailed` orders; those are finalized local orders but not server-synced and have no guaranteed `serverOrderId`.
- Do NOT change order totals, line items, item/options snapshots, `soldAt`, `syncedAt`, `paymentMethod`, or sync log.
- Do NOT alter `POST /api/v1/orders` idempotency behavior or sync engine retry/backoff.
- Do NOT add localStorage/sessionStorage or unsafe HTML.

## References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.13 requirements and Epic 2 cancellation flow boundaries.
- `_bmad-output/planning-artifacts/prd.md` — FR17 and FR26; void must create separate record with reason.
- `_bmad-output/planning-artifacts/architecture.md` — `order_voids`, endpoint `/api/v1/orders/:id/void`, append-only orders, RFC 7807, module/file structure.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — UX-DR15 `VoidOrderDialog`, UX-DR16 sync/offline microcopy, receipt/status accessibility.
- `_bmad-output/project-context.md` — mandatory rules: snapshot immutability, multi-tenant scope, RFC 7807, ISO UTC, VND integer, module boundaries.
- `_bmad-output/implementation-artifacts/2-6-backend-orders-schema-migration-idempotent-sync-endpoint.md` — existing order schema and sync endpoint context.
- `_bmad-output/implementation-artifacts/2-8-receipt-modal-print.md` — receipt modal/status reactivity context.
- `_bmad-output/implementation-artifacts/2-9-sync-engine-fsm-triggers-exponential-backoff.md` — sync engine status update behavior.
- `_bmad-output/implementation-artifacts/2-11-manual-sync-trigger-sync-retry-panel-error-mapping.md` — retry panel and error mapping boundaries.
- `_bmad-output/implementation-artifacts/2-12-cancel-pending-order-cart-level-void-before-sync.md` — reusable `VoidOrderDialog` and pre-finalize cancel boundary.


## Dev Agent Record

### Agent Model Used

GPT-5.5 (OpenClaw subagent)

### Debug Log References

- Backend targeted tests: `cd pos-api && npm test -- --runInBand orders.controller.spec.ts orders.service.spec.ts` — PASS, 2 suites / 13 tests.
- Backend e2e void coverage: `cd pos-api && npm run test:e2e -- --runInBand orders-void.e2e-spec.ts` — PASS, 1 suite / 2 tests covering 201 append-only insert, 409 already voided, 404 not found, 404 cross-tenant/store, 401 auth required, 403 forbidden role, and unchanged order/items/options.
- Backend lint: `cd pos-api && npm run lint` — PASS.
- Backend build: `cd pos-api && npm run build` — PASS.
- Frontend targeted tests: `cd pos-web && npm test -- --run src/features/orders/api.test.ts src/features/orders/components/receipt-modal.test.tsx src/features/orders/components/void-order-dialog.test.tsx` — PASS, 3 files / 15 tests; Radix Dialog emitted existing non-failing description/act warnings.
- Frontend typecheck: `cd pos-web && npm run typecheck` — PASS.
- Frontend lint: `cd pos-web && npm run lint` — PASS.
- Frontend build: `cd pos-web && npm run build` — PASS; Vite emitted existing chunk-size warning only.

### Completion Notes

- Implemented append-only backend void endpoint `POST /orders/:id/void` with UUID v7 validation, reason DTO trim/length validation, tenant/store scoped lookup, duplicate void 409 with stable `already-voided` problem URI, and `OrderVoid` insert without mutating original order or snapshots.
- Implemented frontend `voidSyncedOrder()` client and receipt-driven synced-order void flow using the existing dialog with submitting/label overrides. Receipt now reacts to Dexie void metadata, shows `Đã void` / `ĐÃ HỦY`, stores void reason and timestamp locally, and keeps pending/failed/non-server orders non-voidable.
- Offline blocking is implemented via connectivity store: synced/server-backed orders show disabled `Void đơn này` and `Cần kết nối để void đơn đã đồng bộ`; no pending-void queue was introduced.
- Backend role metadata remains `cashier`/`admin` on the guarded controller route; unit and e2e coverage validates service/controller behavior and repository append-only flow without mutating original order/items/options.
- Code-review follow-ups completed: ReceiptModal now gates void by connectivity, aligns copy (`Void đơn này`, `Đã void`, `ĐÃ HỦY`, `Lý do: ...`), renders accessible success feedback `Đã void đơn {orderCode}`, preserves original total, and backend AC13 e2e coverage was added.

## File List

- `pos-api/src/common/errors/problem-types.ts`
- `pos-api/src/orders/dto/void-order.dto.ts`
- `pos-api/src/orders/orders.controller.ts`
- `pos-api/src/orders/orders.controller.spec.ts`
- `pos-api/src/orders/orders.service.ts`
- `pos-api/src/orders/orders.service.spec.ts`
- `pos-api/src/orders/repositories/orders.repository.ts`
- `pos-api/test/orders-void.e2e-spec.ts`
- `pos-web/src/features/orders/api.ts`
- `pos-web/src/features/orders/api.test.ts`
- `pos-web/src/features/orders/components/receipt-modal.tsx`
- `pos-web/src/features/orders/components/receipt-modal.test.tsx`
- `pos-web/src/features/orders/components/void-order-dialog.tsx`

## Change Log

- 2026-05-14: Added backend void DTO/controller/service/repository path and stable problem type.
- 2026-05-14: Added frontend synced-order void API and receipt modal void UX using existing dialog.
- 2026-05-14: Added/updated targeted backend/frontend unit tests and ran lint/typecheck/build gates.
- 2026-05-14: Follow-up pass fixed frontend offline gating, accessible success feedback, receipt void stamp/reason, and production build type errors.
- 2026-05-14: Added backend void e2e coverage for happy path, duplicate void, not found, cross-tenant/store isolation, auth required, forbidden role, and immutable order/items/options.
