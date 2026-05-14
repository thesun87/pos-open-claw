# Story 2.10: Connectivity Indicator + Pending Counter

Status: done

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a cashier,  
I want thấy trạng thái kết nối (online/offline) và số đơn chờ đồng bộ trên header POS,  
so that tôi biết hệ thống đang online hay offline và bao nhiêu đơn đang chờ sync — yên tâm rằng đơn không bị mất.

## Acceptance Criteria

1. **Connectivity hook:** Given hook `useConnectivity()` trong `pos-web/src/shared/hooks/`, when developer triển khai, then hook trả `{ isOnline: boolean, lastCheckedAt: Date }` derived từ `navigator.onLine` + ping `/health` interval mỗi `30_000ms` khi tab active, ping fail → `isOnline=false`, và subscribe native `online`/`offline` events.
2. **Connectivity store:** Given Zustand `connectivityStore`, when `useConnectivity()` nhận state changes, then store update và UI đọc từ store như single source of truth cho trạng thái kết nối.
3. **ConnectivityIndicator states:** Given `<ConnectivityIndicator />` trong layout header, when render, then `isOnline=true` hiển thị badge xanh `Online`; `isOnline=false` hiển thị badge amber `Offline — vẫn bán được`; sync engine `state='running'` hiển thị `Đang đồng bộ` với spinner nhẹ; recent sync success `<3s` hiển thị `Đã đồng bộ` xanh nhạt và auto-fade 3s.
4. **A11y status text:** Given indicator/counter render, then badge có icon/dot + text, không chỉ dựa vào màu, và status update dùng text tiếng Việt rõ ràng.
5. **PendingCounter realtime:** Given `<PendingCounter />`, when render, then dùng `useLiveQuery(() => db.orders.where('status').equals('pendingSync').count())` để count realtime.
6. **PendingCounter states:** Given count/status từ Dexie, then `count === 0` không render hoặc render gọn `0 đơn chờ` muted; `count > 0` render amber `{count} đơn chờ đồng bộ`; nếu có `syncFailed` render `{n} đơn lỗi` màu danger; counter có `aria-live="polite"` để screen reader cập nhật không spam.
7. **Click behavior seam:** Given click pending counter, when có đơn `pendingSync` hoặc `syncFailed`, then mở seam cho SyncRetryPanel Story 2.11 (không implement panel đầy đủ ở story này); nếu chưa có panel, expose callback/placeholder event an toàn để Story 2.11 nối vào.
8. **Receipt reactivity:** Given receipt modal đang mở với order `pendingSync`, when sync engine update Dexie thành `synced`, then `SyncStatusBadge` trong receipt update reactive và `PendingCounter` count giảm ngay.
9. **Responsive header:** Given viewport `<1280px`, when layout render, then `ConnectivityIndicator` + `PendingCounter` vẫn visible ở compact badge mode, không che khuất thao tác bán hàng.
10. **Tests/gates:** Unit/component tests cover hook/store transitions, failed health ping, online/offline events, indicator states including running/recent synced, pending/failed counter Dexie counts, click seam, receipt/count reactivity, and compact visibility. Required gates: `npm run typecheck`, `npm run lint`, targeted tests, ideally `npm run build`.

## Tasks / Subtasks

- [x] Implement connectivity state foundation (AC: 1, 2)
  - [x] Create `pos-web/src/shared/stores/connectivity.store.ts` with Zustand state: `isOnline`, `lastCheckedAt`, `setConnectivityState`, plus optional sync UI fields if needed (`syncState`, `lastSyncedAt`).
  - [x] Create `pos-web/src/shared/hooks/use-connectivity.ts`; combine `navigator.onLine`, `GET /health` via existing `apiClient`, `online`/`offline` events, and active-tab 30s interval.
  - [x] Guard `typeof window/document/navigator === 'undefined'` for tests/SSR-like import safety; cleanup listeners/interval on unmount.
  - [x] Treat health ping failure as offline even if `navigator.onLine === true`.
- [x] Wire connectivity boot once (AC: 1, 2)
  - [x] Add a small React registrar/provider (e.g. `ConnectivityRegistrar`) in root layout or `main.tsx` that calls `useConnectivity()` once.
  - [x] Avoid creating duplicate intervals during HMR/tests; if mounted in React, rely on `useEffect` cleanup.
- [x] Expose sync engine state for UI without changing drain semantics (AC: 3, 8)
  - [x] Current `SyncEngine.getState()` exists but is not reactive. Add a minimal subscription/event mechanism or Zustand bridge so UI can know `running`, `idle`, and recent success.
  - [x] Preserve Story 2.9 public contract: `syncEngine.kick()` remains fire-and-forget/idempotent; do not make checkout/receipt await sync.
  - [x] On successful order sync, emit/set `lastSyncedAt = now` so `ConnectivityIndicator` can show `Đã đồng bộ` for 3s.
- [x] Replace layout stubs with real components (AC: 3, 4, 9)
  - [x] Update `pos-web/src/shared/components/layout/connectivity-indicator.tsx` to read store/sync UI state and render states: online/offline/running/recent synced.
  - [x] Use existing microcopy constants in `pos-web/src/shared/i18n/messages.ts`: `STATUS_ONLINE`, `STATUS_OFFLINE`, `STATUS_SYNCING`, `STATUS_SYNCED`.
  - [x] Keep badge compact for narrow header (`<1280px`) with `inline-flex`, no layout-breaking wide content; include text for a11y.
- [x] Implement realtime pending/failed counter (AC: 5, 6, 7, 8)
  - [x] Update `pos-web/src/shared/components/layout/pending-counter.tsx` to use `dexie-react-hooks` `useLiveQuery()` over `db.orders`.
  - [x] Count both `pendingSync` and `syncFailed` separately; display failed state as higher priority (`{n} đơn lỗi`) if any failed order exists.
  - [x] Add `aria-live="polite"`; avoid rapid/noisy announcements by only rendering count text, no imperative announcements.
  - [x] For click with pending/failed rows, expose an `onOpenSyncPanel?: () => void` prop or dispatch a small custom event such as `sync.panel.open-requested`. Do not implement Story 2.11 drawer/list/retry actions here.
- [x] Preserve receipt behavior (AC: 8)
  - [x] Verify `ReceiptModal` already uses `useLiveQuery()` by `clientOrderId`; do not regress it.
  - [x] If needed, update `SyncStatusBadge` only for shared styling/a11y, not data access.
- [x] Add tests (AC: 10)
  - [x] Add tests for `connectivity.store.ts` and `use-connectivity.ts` with mocked `apiClient.get('/health')`, fake timers, and `online`/`offline` events.
  - [x] Add tests for `ConnectivityIndicator` states: online, offline, sync running, recent synced auto-fade.
  - [x] Add tests for `PendingCounter`: zero muted/hidden state, pending count, failed count priority, `aria-live`, click seam.
  - [x] Extend existing receipt/POS shell test only if necessary to verify pending counter decreases when Dexie status changes.
- [x] Run quality gates (AC: 10)
  - [x] From `pos-web/`: run targeted tests for new components/hooks, then `npm run typecheck`, `npm run lint`, and ideally `npm run build`.

## Dev Notes

### Existing Implementation State (must preserve)

- `pos-web/src/shared/components/layout/connectivity-indicator.tsx` is currently a Story 1.7 stub that always renders `Online`; replace it with real state-driven UI.
- `pos-web/src/shared/components/layout/pending-counter.tsx` is currently a Story 1.7 stub that always renders `0 đơn chờ`; replace it with Dexie live counts.
- `pos-web/src/routes/_layout.tsx` already places `<ConnectivityIndicator /><PendingCounter />` in the app header. Preserve that integration and make it responsive instead of moving status into the POS body.
- `pos-web/src/features/sync/engine.ts` from Story 2.9 already implements FSM states `idle | running | backoff`, sequential drain, `getState()`, backoff, success updates to Dexie, and failure updates. It does **not** currently provide reactive subscriptions for UI.
- `pos-web/src/features/sync/triggers.ts` and `pos-web/src/sync-trigger-registrar.tsx` already register sync kicks on online/visibility/interval. Do not duplicate those triggers inside connectivity UI.
- `pos-web/src/features/orders/components/receipt-modal.tsx` already uses `useLiveQuery()` to read the order by `clientOrderId` and feeds `SyncStatusBadge`; this satisfies the receipt reactivity path if sync engine updates Dexie correctly.
- `LocalOrderRecord.status` values are exactly `'pendingSync' | 'synced' | 'syncFailed'`; use these exact strings in Dexie queries.

### Architecture Compliance

- Frontend stack is React 18, TypeScript strict, Vite, Zustand, Dexie 4, `dexie-react-hooks`, axios `apiClient`, Vitest/Testing Library.
- Follow import direction: `shared/components/layout` may import shared hooks/stores/lib and `db`; it must not import feature components/routes. The sync engine remains in `features/sync`; if UI needs sync state, expose a minimal shared store or subscription carefully without moving business logic into `shared/`.
- Offline source of truth for orders remains IndexedDB. Do **not** store pending counts or order queue data in Zustand; derive counts via Dexie `useLiveQuery()`.
- Zustand is appropriate for UI/connectivity state only: `isOnline`, `lastCheckedAt`, and transient sync status display.
- Use `apiClient.get('/health')`; the shared API client owns base URL/version configuration. Backend `GET /health` is unauthenticated.
- Do not use `localStorage`/`sessionStorage`; do not introduce service worker/background sync APIs for this story.

### UX / Accessibility Guardrails

- Pending sync is normal, not an error. Use amber and calm text (`3 đơn chờ đồng bộ`), not red/modal alarm.
- Offline is not fatal because POS still sells offline. Use amber `Offline — vẫn bán được`, not danger red.
- Failed sync needs attention but should still use safe microcopy; Story 2.11 owns detailed error mapping and retry panel.
- Status UI must include visible text and semantic labels; no color-only dots.
- Use `aria-live="polite"` on pending/sync count updates and avoid imperative alert spam.
- Header status must stay compact and visible under 1280px. Consider short labels or wrapping-safe flex classes rather than hiding the badges.

### Previous Story Intelligence

From Story 2.9:

- `syncEngine.kick()` is intentionally idempotent/no-op while `running`/`backoff`; do not change it to throw or return promises required by UI.
- Engine updates Dexie to `synced` on success and `syncFailed` on non-retryable 4xx; the UI should react to those Dexie changes rather than poll server state.
- Manual sync button/retry panel is Story 2.11; only create a clean click seam here.
- Network/5xx failures keep order `pendingSync` and schedule backoff; pending counter should remain >0 during backoff.

From Story 2.8:

- Receipt status reactivity is already implemented through Dexie. Keep receipt independent of API/network and do not close it when status changes.
- Existing tests use fake IndexedDB + Testing Library. Reuse cleanup patterns from `receipt-modal.test.tsx` and `pos-shell.test.tsx`.

From Story 2.7:

- `finalizeOrder()` writes local order first, sets status `pendingSync`, then calls `void syncEngine.kick()`. The pending counter should increment immediately after the local write, before server sync completes.
- Dexie write failure preserves cart and should not create pending counter changes.

### Git Intelligence Summary

Recent commits establish the seams this story extends:

- `fa42370 feat(pos-web): implement sync engine backoff` added `features/sync/engine.ts`, `retry.ts`, `triggers.ts`, `sync-trigger-registrar.tsx`, and tests. Use its `getState()`/Dexie updates but add a reactive UI bridge.
- `c31ed2f feat(pos): add receipt modal print flow` added `ReceiptModal` and `SyncStatusBadge` with Dexie live reactivity; avoid duplicating receipt status logic.
- `a4dd32b feat(pos): finalize orders offline-first` added `LocalOrderRecord`, Dexie `orders`, checkout handoff, and sync kick seam.

### Expected File Structure

Expected files to create/update:

- NEW: `pos-web/src/shared/stores/connectivity.store.ts`
- NEW: `pos-web/src/shared/hooks/use-connectivity.ts`
- NEW optional: `pos-web/src/connectivity-registrar.tsx` or equivalent root registrar
- UPDATE: `pos-web/src/shared/components/layout/connectivity-indicator.tsx`
- UPDATE: `pos-web/src/shared/components/layout/pending-counter.tsx`
- UPDATE: `pos-web/src/routes/_layout.tsx` or `pos-web/src/main.tsx` to mount connectivity registrar if needed
- UPDATE: `pos-web/src/features/sync/engine.ts` only if adding UI state notifications/recent success; preserve existing tests/contracts
- NEW tests: component/hook/store tests near the files above (or under existing test locations)

### Scope Boundaries

- Do NOT implement `SyncRetryPanel` list, retry buttons, or error mapper UI; Story 2.11 owns them.
- Do NOT implement manual sync trigger button beyond a click seam/event from the counter.
- Do NOT change backend `/health` or `/orders` endpoints.
- Do NOT change order schema/status names or snapshot immutability.
- Do NOT move order queue state into Zustand or React Query.
- Do NOT add local/session storage or browser Background Sync API.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.10 AC, UX-DR10/11/28/31/34.
- `_bmad-output/planning-artifacts/architecture.md` — FR24 mapping, `useConnectivity()`, `connectivityStore`, source tree, Dexie/Zustand state split.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — status badge/counter UX, offline/pending tone, accessibility.
- `_bmad-output/project-context.md` — mandatory FE stack, import boundaries, token-storage/security rules.
- `_bmad-output/implementation-artifacts/2-9-sync-engine-fsm-triggers-exponential-backoff.md` — sync engine contract and previous story intelligence.
- `_bmad-output/implementation-artifacts/2-8-receipt-modal-print.md` — receipt Dexie live status pattern.
- `pos-web/src/shared/components/layout/connectivity-indicator.tsx` — current stub to replace.
- `pos-web/src/shared/components/layout/pending-counter.tsx` — current stub to replace.
- `pos-web/src/features/sync/engine.ts` — current FSM and Dexie update source.
- `pos-web/src/db/schemas/orders.ts` — order status contract.

## Project Context Reference

- Source of truth: `_bmad-output/project-context.md` and `_bmad-output/planning-artifacts/architecture.md`.
- Critical rules relevant here: keep code in correct FE layer; Dexie is POS offline source of truth; Zustand only UI/connectivity state; token storage ban remains; no `dangerouslySetInnerHTML`; UI text in Vietnamese; status must not rely on color alone.

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-14: Inspected existing implementation from prior dev pass and reconciled story/sprint artifacts.
- 2026-05-14: Ran targeted Vitest suite for connectivity hook, connectivity indicator, and pending counter: 3 files / 9 tests passed.
- 2026-05-14: Ran `npm run typecheck`, `npm run lint`, and `npm run build` from `pos-web/`; fixed lint/type issue in connectivity store/indicator before final green gates.

### Completion Notes List

- Implemented Zustand connectivity/sync UI store and `useConnectivity()` health-ping hook with native online/offline events, visible-tab 30s interval, cleanup, and import safety guards.
- Mounted `ConnectivityRegistrar` once in the root layout and kept header badges compact/responsive.
- Bridged sync engine UI state to the connectivity store without changing `syncEngine.kick()` fire-and-forget/idempotent semantics; successful sync sets `lastSyncedAt` for the 3s `Đã đồng bộ` indicator.
- Replaced layout stubs with real `ConnectivityIndicator` and Dexie-backed `PendingCounter`, including Vietnamese microcopy, visible text + status dot, `aria-live="polite"`, failed-count priority, and Story 2.11 click seam (`onOpenSyncPanel` or `sync.panel.open-requested`).
- Preserved receipt reactivity by relying on existing Dexie `useLiveQuery()` behavior; pending counter test verifies count drops when order status changes to `synced`.
- All acceptance criteria are satisfied and all required/ideal gates are green.

### File List

- `_bmad-output/implementation-artifacts/2-10-connectivity-indicator-pending-counter.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/connectivity-registrar.tsx`
- `pos-web/src/features/sync/engine.ts`
- `pos-web/src/routes/_layout.tsx`
- `pos-web/src/shared/components/layout/connectivity-indicator.tsx`
- `pos-web/src/shared/components/layout/connectivity-indicator.test.tsx`
- `pos-web/src/shared/components/layout/pending-counter.tsx`
- `pos-web/src/shared/components/layout/pending-counter.test.tsx`
- `pos-web/src/shared/hooks/use-connectivity.ts`
- `pos-web/src/shared/hooks/use-connectivity.test.tsx`
- `pos-web/src/shared/stores/connectivity.store.ts`

### Change Log

- 2026-05-14: Story context created by BMAD create-story workflow; status set to ready-for-dev.
- 2026-05-14: Implemented connectivity hook/store, header indicator, Dexie pending counter, sync UI bridge, tests, and gates; status set to review.
- 2026-05-14: Implemented connectivity indicator, pending counter, sync UI bridge, tests, and root registrar; story status moved to review.
