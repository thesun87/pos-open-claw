# Story 2.11: Manual Sync Trigger + Sync Retry Panel + Error Mapping

Status: done

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a cashier,  
I want bấm nút "Đồng bộ ngay" để force sync và xem chi tiết đơn nào đang pending/failed với option retry,  
so that tôi có thể chủ động xử lý khi thấy có đơn chờ lâu hoặc đơn lỗi mà không cần hiểu chi tiết kỹ thuật sync.

## Acceptance Criteria

1. Given `<SyncRetryPanel />` mở từ click `PendingCounter`, when render, then drawer/dialog hiển thị danh sách đơn `pendingSync` + `syncFailed`, sort `soldAt` desc; mỗi row có `orderCode`, `total` formatted VND, `soldAt` format `dd/MM/yyyy HH:mm`, `StatusBadge` pending/failed, và nút `Thử đồng bộ lại`.
2. Given panel header, when cashier bấm `Đồng bộ tất cả`, then reset mọi đơn `syncFailed` về `pendingSync` với `failReason: null`, rồi gọi `syncEngine.kick()` đúng một lần để engine drain sequential.
3. Given cashier click `Thử đồng bộ lại` cho 1 đơn, when handler chạy, then `db.orders.update(clientOrderId, { status: 'pendingSync', failReason: null, updatedAt, lastTriedAt? })` reset an toàn và gọi `syncEngine.kick()`.
4. Given `shared/lib/error-mapper.ts`, when developer mở, then expose `mapProblemToAction(problemDetail)` trả `{ type: 'redirect-login' | 'show-toast' | 'retry-after-action' | 'form-errors', payload }` và map URI: `.../session-revoked` → redirect login; `.../validation` → form-errors; `.../menu-version-stale` → retry-after-action; `.../forbidden` → toast `Không có quyền thực hiện`; `.../internal` → toast `Đã có lỗi, vui lòng thử lại`; default → generic toast.
5. Given sync engine gặp lỗi 4xx validation/non-retryable, when logging/storing failure, then FE logs `console.warn('[sync] failed', { clientOrderId, problemDetail.type, traceId })`, stores only safe cashier-facing `failReason` such as `Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.`, and UI never renders raw `problemDetail.detail`.
6. Given SyncRetryPanel displays failed rows, when UI text is scanned, then it does NOT expose raw/internal strings: `Idempotency`, `tenant_id`, `violations`, `stack`, raw SQL, raw trace stack, or server implementation details.
7. Given panel has 5+ failed orders and pending orders mixed, when `Đồng bộ tất cả` is clicked, then all failed rows reset to `pendingSync`, already-pending rows remain pending, engine still posts sequentially through existing sync engine contract (no parallel sync).
8. Given integration/component tests with mocked API/MSW or axios adapter, when simulate 1 failed validation order and 2 pending orders, then panel renders correct statuses, retry click triggers re-attempt, and request verification confirms `Idempotency-Key` header equals `clientOrderId`.
9. Given layout/header from Story 2.10, when pending counter dispatches `sync.panel.open-requested` or receives `onOpenSyncPanel`, then panel opens without breaking existing compact header behavior and count reactivity remains Dexie-driven.
10. Tests/gates: component tests for panel list/sort/empty states/retry-all/single retry/a11y safe copy; unit tests for error mapper; existing sync engine tests updated for sanitized failure logging; run `npm run typecheck`, `npm run lint`, targeted tests, ideally `npm run build` from `pos-web/`.

## Tasks / Subtasks

- [x] Build SyncRetryPanel shell and open seam (AC: 1, 9)
  - [x] Create `pos-web/src/features/sync/components/sync-retry-panel.tsx` as a drawer/dialog using existing shadcn/Radix patterns; keep UI text Vietnamese.
  - [x] Wire panel open state from root POS layout/header integration. Listen to existing `sync.panel.open-requested` custom event emitted by `PendingCounter` and/or pass `onOpenSyncPanel` prop.
  - [x] Preserve Story 2.10 `PendingCounter` Dexie live count implementation; do not move queue counts into Zustand.
- [x] Render pending/failed order list (AC: 1, 6)
  - [x] Use `useLiveQuery()` over `db.orders` to load `status in ['pendingSync','syncFailed']`; sort by `soldAt` descending in memory if Dexie compound query is not available.
  - [x] Row fields: `orderCode`, `formatVnd(total)`, formatted `soldAt` via existing date helper/date-fns locale `vi`, safe status text, retry button.
  - [x] Reuse/extend `SyncStatusBadge` or existing badge styling; always include text, not color-only.
  - [x] Add empty state: `Không có đơn chờ đồng bộ.` when no actionable rows.
- [x] Implement retry actions (AC: 2, 3, 7)
  - [x] Single retry: update selected order by `clientOrderId` to `{ status: 'pendingSync', failReason: undefined/null, updatedAt: nowIso }`, then `syncEngine.kick()`.
  - [x] Retry all: reset all `syncFailed` rows to pending in one Dexie transaction/bulk update if practical; leave existing `pendingSync` unchanged; call `syncEngine.kick()` once after writes complete.
  - [x] Disable retry buttons while reset write is in progress; do not await network sync completion.
- [x] Upgrade error mapper contract (AC: 4)
  - [x] Update `pos-web/src/shared/lib/error-mapper.ts` without breaking existing `mapProblemDetails` consumers; add/export `mapProblemToAction` and compatible types.
  - [x] Keep `mapProblemDetails`/`errorMapper` alias as backward-compatible wrapper if current code imports it.
  - [x] Map problem type by suffix or URI contains check; do not hard-code one host/domain.
- [x] Sanitize sync failure handling (AC: 5, 6)
  - [x] Update `pos-web/src/features/sync/engine.ts`: for non-retryable 4xx, parse Problem Details, log only `{ clientOrderId, problemDetail.type, traceId }` with exact prefix `[sync] failed`.
  - [x] Store only cashier-safe `failReason`; do not store/render raw `detail`, `violations`, stack, tenant/store ids, or idempotency internals.
  - [x] Preserve existing engine behavior: `kick()` fire-and-forget/idempotent, running/backoff guards, sequential drain, `Idempotency-Key` header.
- [x] Add tests and run gates (AC: 8, 10)
  - [x] Unit tests for `mapProblemToAction` mappings and backward-compatible `mapProblemDetails` behavior.
  - [x] Component tests for `SyncRetryPanel`: list sorting, VND/date display, failed priority/copy, single retry, retry all, empty state, no raw technical text.
  - [x] Update sync engine tests for sanitized fail reason and `[sync] failed` log payload; verify `Idempotency-Key` remains unchanged.
  - [x] Run `npm run typecheck`, `npm run lint`, targeted tests, and `npm run build` if time allows.

## Dev Notes

### Existing Implementation State (must preserve)

- Story 2.10 added `PendingCounter` at `pos-web/src/shared/components/layout/pending-counter.tsx`. It already counts `pendingSync` and `syncFailed` via Dexie `useLiveQuery()` and dispatches `window.dispatchEvent(new CustomEvent('sync.panel.open-requested'))` when clicked without an `onOpenSyncPanel` prop.
- Story 2.10 added `connectivity.store.ts`, `use-connectivity.ts`, `ConnectivityIndicator`, and sync UI state bridging. Do not reimplement connectivity or pending counts.
- `pos-web/src/features/sync/engine.ts` currently drains `pendingSync` orders sequentially by `createdAt`, posts `/orders` with `Idempotency-Key: order.clientOrderId`, marks success as `synced`, non-retryable 4xx as `syncFailed`, retryable/network as backoff. Preserve this contract.
- Current sync engine stores `extractSafeFailReason(error)` from raw `detail/message`; Story 2.11 must change this to sanitized cashier-safe copy and logging per AC.
- `pos-web/src/shared/lib/error-mapper.ts` currently only exports `mapProblemDetails(problem): UiError` and `errorMapper`; expand it without breaking callers.
- `LocalOrderRecord.status` values are exactly `'pendingSync' | 'synced' | 'syncFailed'`; Dexie primary key for updates is `clientOrderId`.

### Architecture Compliance

- Frontend stack: React 18, TypeScript strict, Vite, Dexie 4 + `dexie-react-hooks`, Zustand only for UI state, axios `apiClient`, Vitest/Testing Library.
- Respect import direction: `features/sync/components` may import `db`, `shared` components/lib, and `features/sync/engine`; `shared` must not import feature components. Mount/open panel from route/layout layer rather than importing feature UI into `shared/components/layout` if that would invert boundaries.
- Offline order queue source of truth remains IndexedDB. Do not store order lists/counts in Zustand or React Query.
- Do not introduce Background Sync API, service worker sync, new backend endpoints, or direct server polling.
- Date API/storage stays ISO 8601 UTC; UI display uses `dd/MM/yyyy HH:mm` locale `vi`. Money is integer VND displayed via existing `formatVnd()`.
- Token/storage security rules remain: no `localStorage`/`sessionStorage`, no `dangerouslySetInnerHTML`.

### UX / Accessibility Guardrails

- Sync pending is normal: use calm microcopy (`đơn chờ đồng bộ`) and amber/neutral treatment.
- Sync failed needs attention but must not scare cashier or expose internals: show `Chưa đồng bộ được. Hệ thống sẽ thử lại khi có mạng.` and retry actions.
- Panel should be keyboard accessible: focus moves into dialog/drawer, Escape closes if no destructive write in progress, focus returns to trigger/header, buttons have clear labels.
- Status must include visible text and semantic labels; never color-only.
- For small headers/viewports, do not widen header badges; the panel can be full-height drawer/dialog while header remains compact.

### Previous Story Intelligence

From Story 2.10:
- `PendingCounter` click seam already exists; connect to it rather than changing the component heavily.
- Counts must stay Dexie-reactive; receipt and counter should update when engine changes status.

From Story 2.9:
- `syncEngine.kick()` is intentionally idempotent and no-op while `running`/`backoff`; UI should call it but never depend on a returned promise for completion.
- Engine posts sequentially, not parallel. Retry-all should reset local rows then let engine drain.
- Network/5xx failures keep order `pendingSync` and schedule backoff; do not mark these as `syncFailed`.

From Story 2.8:
- Receipt status uses Dexie `useLiveQuery()` and should remain independent of panel state.

### Git Intelligence Summary

Recent commits:
- `1797f84 feat(pos): add connectivity indicator and pending counter` established the header click seam and connectivity/sync UI store.
- `fa42370 feat(pos-web): implement sync engine backoff` established sequential sync/backoff and `Idempotency-Key` behavior.
- `c31ed2f feat(pos): add receipt modal print flow` established `SyncStatusBadge` and receipt status reactivity.
- `a4dd32b feat(pos): finalize orders offline-first` established Dexie local-first order finalization and immediate sync kick.

### Expected File Structure

Expected files to create/update:
- NEW: `pos-web/src/features/sync/components/sync-retry-panel.tsx`
- NEW: `pos-web/src/features/sync/components/sync-retry-panel.test.tsx`
- UPDATE: `pos-web/src/routes/_layout.tsx` or POS layout/root registrar to mount/open panel from `sync.panel.open-requested`
- UPDATE: `pos-web/src/shared/lib/error-mapper.ts`
- UPDATE: `pos-web/src/shared/lib/error-mapper.test.ts` (new if absent)
- UPDATE: `pos-web/src/features/sync/engine.ts`
- UPDATE: `pos-web/src/features/sync/engine.test.ts`
- UPDATE only if necessary: `pos-web/src/shared/components/layout/pending-counter.tsx` (prefer preserving current seam)

### Scope Boundaries

- Do NOT implement Story 2.12 cart-level cancel or Story 2.13 synced-order void flow.
- Do NOT create backend changes or new sync endpoints.
- Do NOT implement Epic 3 menu re-pull details; for `menu-version-stale`, return `retry-after-action` seam only.
- Do NOT expose raw Problem Details `detail` to cashier UI for sync failures.
- Do NOT change order schema/status names or snapshot fields.
- Do NOT parallelize sync or bypass existing `syncEngine`.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.11 AC, FR23/FR25, UX-DR16.
- `_bmad-output/planning-artifacts/architecture.md` — sync engine FSM, RFC 7807 error handling, FE layer boundaries, Dexie/Zustand split.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — SyncRetryPanel UX, safe sync microcopy, a11y requirements.
- `_bmad-output/project-context.md` — mandatory stack, naming, security and state-management rules.
- `_bmad-output/implementation-artifacts/2-10-connectivity-indicator-pending-counter.md` — click seam and previous story implementation notes.
- `_bmad-output/implementation-artifacts/2-9-sync-engine-fsm-triggers-exponential-backoff.md` — sync engine contract and retry/backoff behavior.
- `pos-web/src/shared/components/layout/pending-counter.tsx` — existing open event seam.
- `pos-web/src/features/sync/engine.ts` — current sequential drain, Idempotency-Key, failure handling.
- `pos-web/src/shared/lib/error-mapper.ts` — mapper to expand.
- `pos-web/src/db/schemas/orders.ts` — local order status contract.

## Project Context Reference

- Source of truth: `_bmad-output/project-context.md` and `_bmad-output/planning-artifacts/architecture.md`.
- Critical rules relevant here: Dexie is POS offline source of truth; Zustand only UI/connectivity state; errors must be mapped/sanitized; UI text in Vietnamese; status not color-only; no local/session storage; no `dangerouslySetInnerHTML`; tests must ship with code.

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-14: Fixed `exactOptionalPropertyTypes` build failures by allowing `LocalOrderRecord.failReason` to be `null`, resetting it via Dexie update callbacks, and by always passing a defined `Dialog` `onOpenChange` handler.
- 2026-05-14: Gates passed: `npm run typecheck`, `npm run lint`, `npm run test -- sync-retry-panel error-mapper engine`, `npm run build` from `pos-web/`.

### Completion Notes List

- Implemented SyncRetryPanel with Dexie live query, soldAt-desc ordering, safe Vietnamese failed-order copy, single retry, and retry-all behavior.
- Wired POS layout to open the panel from `sync.panel.open-requested` without moving pending counts out of Dexie.
- Added `mapProblemToAction` while preserving `mapProblemDetails`/`errorMapper`; sanitized non-retryable sync failures and warning payloads.
- Cleared retry `failReason` to `null` by widening the local Dexie type to `string | null` and using Dexie update callbacks under `exactOptionalPropertyTypes`.

### File List

- `_bmad-output/implementation-artifacts/2-11-manual-sync-trigger-sync-retry-panel-error-mapping.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/db/schemas/orders.ts`
- `pos-web/src/features/sync/components/sync-retry-panel.tsx`
- `pos-web/src/features/sync/components/sync-retry-panel.test.tsx`
- `pos-web/src/features/sync/engine.ts`
- `pos-web/src/features/sync/engine.test.ts`
- `pos-web/src/routes/_layout.tsx`
- `pos-web/src/shared/lib/error-mapper.ts`
- `pos-web/src/shared/lib/error-mapper.test.ts`

### Change Log

- 2026-05-14: Story context created by BMAD create-story workflow; status set to ready-for-dev.
- 2026-05-14: Implemented manual sync retry panel, error action mapper, sanitized sync failure handling, tests, and gates; status set to review.
