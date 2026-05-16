# Story 3.9: FE — Menu Auto-Sync Engine + MenuUpdatedToast (Snapshot Preserved)

Status: done

<!-- Ultimate context engine analysis completed - comprehensive developer guide created. -->

## Story

As a cashier,  
I want POS tự động kéo menu mới từ server khi admin cập nhật, và đơn đang xử lý/đơn cũ KHÔNG bị thay đổi,  
so that tôi luôn có menu cập nhật mà không phải reload thủ công, và snapshot tài chính của đơn cũ không bị phá vỡ (FR36, NFR14).

## Acceptance Criteria

1. Given menu sync engine hiện có từ Story 2.1 trong `pos-web/src/features/menu/sync.ts`, when developer extend, then thêm `checkAndPullIfNewer()` đọc `db.menuMeta[MENU_META_ID].menuVersion`, gọi `GET /api/v1/menu?since_version=<localVersion>` qua `apiClient.get('/menu', { params: { since_version: localVersion } })`, và không dùng endpoint absolute hoặc tự thêm `/api/v1`.
2. Given backend Story 3.8 trả `{ menuVersion, hasChanges: false, snapshot: null }`, when `checkAndPullIfNewer()` nhận response no-change, then không clear/replace Dexie menu tables, không emit `menu.updated`, và vẫn cập nhật timestamp kiểm tra gần nhất để phục vụ debug/observability.
3. Given backend Story 3.8 trả `{ menuVersion, hasChanges: true, snapshot }`, when `checkAndPullIfNewer()` xử lý, then replace atomic trong một Dexie transaction các bảng `categories`, `products`, `optionGroups`, `options`, ghi `menuMeta.menuVersion = response.menuVersion`, rồi emit custom event `menu.updated` sau khi transaction thành công.
4. Given local `menuMeta` chưa tồn tại hoặc `menuVersion` missing, when check runs, then treat local version as undefined/0 and request full snapshot; do not crash app boot.
5. Given existing `pullMenu()` and `fetchMenu()` are used by earlier tests/boot recovery, when implementing versioned sync, then preserve backward compatibility where practical: `pullMenu()` may delegate to the new versioned flow or continue full pull, but existing menu cache tests must still pass and no duplicate competing sync code should remain.
6. Given menu sync triggers, when developer adds `pos-web/src/features/menu/triggers.ts`, then trigger `checkAndPullIfNewer()` on app boot when online, browser `online` event recovery, `visibilitychange` when `document.visibilityState === 'visible'` and online with 5s debounce, interval polling every 5 minutes while online and app active, and expose a manual trigger function for admin mutation / explicit retry flows.
7. Given trigger installation is mounted from app shell, when component unmounts or test cleanup runs, then remove all event listeners and clear interval/timers; no duplicated intervals/listeners across remounts.
8. Given concurrent triggers fire close together, when one check is in flight, then coalesce to one in-flight promise; do not run parallel menu pulls that race Dexie writes or show duplicate toasts.
9. Given event `menu.updated` is emitted, when UI subscribes, then render `<MenuUpdatedToast />` (UX-DR25) using existing app toast convention or `sonner` if already installed; toast text is exactly `Menu đã cập nhật`, includes ✓/success affordance, auto-dismisses after 4s, is non-blocking, and does not open a modal.
10. Given cashier currently has cart items from `features/orders/cart-store.ts`, when menu update completes, then cart `items` array remains unchanged including `productNameSnapshot`, `unitPriceSnapshot`, option snapshots, notes, discount state, and any checkout state already entered.
11. Given OptionModal is open or cashier is selecting options, when menu update completes, then the modal must not close abruptly and currently selected product/options must not be hot-swapped mid-selection; new Dexie menu data applies to product grid/subsequent selections only.
12. Given product grid reads active products via Dexie/useLiveQuery from Story 2.2, when menu update changes active products, then grid reflects new Dexie state: inactive/removed products disappear from grid and new active products appear without full page reload.
13. Given `db.orders` contains pendingSync/synced orders, when menu update occurs, then `db.orders` is never updated by menu sync; pending/synced order records, `menuVersionAtSale`, and items snapshots stay byte-for-byte unchanged except unrelated sync engine updates.
14. Given ReceiptModal displays an old order, when menu update changes product names/prices, then ReceiptModal keeps displaying the order snapshot captured at sale time; do not rehydrate receipt lines from current menu tables.
15. Given POST `/orders` returns Problem Details type ending with `/menu-version-stale`, when sync engine/error mapper handles it, then trigger `checkAndPullIfNewer()` immediately and retry/kick sync engine after the menu refresh path; cashier must not see raw technical error details.
16. Given `menu-version-stale` refresh succeeds, when retry runs, then pending order remains pending until successful sync and preserves original `menuVersionAtSale`; do not rebuild the order payload from current menu.
17. Given `menu-version-stale` refresh fails due to network/server error, when sync engine handles it, then do not mark order `syncFailed` as a permanent validation error; keep it retryable/backoff with safe cashier-facing copy/logging.
18. Given integration tests with Vitest and mocked HTTP/MSW or axios mocks, when simulating menu version bump while cart has items and a pending order exists, then tests verify: cart unchanged, product grid/Dexie menu updated, `menu.updated` emitted, toast displayed, `db.orders` pending unchanged, and `menuVersionAtSale` stays original.
19. Given trigger tests, when fake timers advance, then verify 5-minute polling only runs while online and active, visibility debounce is 5s, listeners clean up, and in-flight coalescing prevents duplicate calls.
20. Given architecture/frontend rules, when implementing, then do not store auth token in localStorage/sessionStorage, do not add new global state for menu cache, do not mutate backend/order snapshot fields, and keep code inside `features/menu`, `features/sync`, `routes/pos`, or shared toast integration as appropriate.

## Tasks / Subtasks

- [x] Extend versioned menu API client (AC: 1, 2, 3, 4, 5)
  - [x] Update `pos-web/src/features/menu/api.ts` to expose a versioned fetch function, e.g. `fetchVersionedMenu(sinceVersion?: number): Promise<VersionedMenuSyncDto>`.
  - [x] Use relative `apiClient.get('/menu', { params: { since_version: sinceVersion } })`; omit param when local version is undefined if preferred.
  - [x] Keep current compatibility adapter for old `fetchMenu()` tests/callers or refactor callers and tests explicitly.
- [x] Implement `checkAndPullIfNewer()` in `features/menu/sync.ts` (AC: 1-5, 8)
  - [x] Read current `menuMeta` safely; missing metadata must not throw.
  - [x] No-change response updates last-checked observability without clearing menu tables or emitting update event.
  - [x] Change response writes full snapshot via existing `writeMenuSnapshot()` path, but ensure meta uses server `menuVersion` from wrapper.
  - [x] Emit `new CustomEvent('menu.updated', { detail: { menuVersion } })` only after successful transaction.
  - [x] Add in-flight coalescing for check/pull to avoid duplicate requests/writes.
- [x] Add menu trigger module and app integration (AC: 6, 7, 8)
  - [x] Create `pos-web/src/features/menu/triggers.ts` with install/cleanup function and manual trigger export.
  - [x] Wire app boot/online/visibility/5-minute interval behavior from existing root/app registrar pattern (`sync-trigger-registrar.tsx`, `connectivity-registrar.tsx`).
  - [x] Mount registrar once in `main.tsx`/`App.tsx`/layout without duplicating across routes.
- [x] Add `MenuUpdatedToast` UI subscription (AC: 9)
  - [x] Implement `pos-web/src/features/menu/components/menu-updated-toast.tsx` or shared equivalent.
  - [x] Follow current toast pattern: existing pages dispatch `CustomEvent('toast', { detail })`; if a central listener exists, bridge `menu.updated` to that event. If `sonner` is already installed/configured, use it directly.
  - [x] Exact visible text: `Menu đã cập nhật`; non-blocking; auto-dismiss 4s; no modal.
- [x] Integrate `menu-version-stale` retry path (AC: 15, 16, 17)
  - [x] Extend `features/sync/engine.ts` handling before generic non-retryable 4xx classification.
  - [x] Use existing `mapProblemToAction()` result `{ type: 'retry-after-action', action: 'refresh-menu' }` or direct type guard to run menu refresh then kick/drain retry.
  - [x] Preserve order payload snapshots; never rebuild pending orders after refresh.
- [x] Verify cart/order snapshot preservation (AC: 10-14, 18)
  - [x] Read current `cart-store.ts`, `builder.ts`, `receipt-modal.tsx`, and product grid hooks before coding changes.
  - [x] Ensure menu sync code touches only menu tables/meta and custom events, not Zustand cart or `db.orders`.
  - [x] Add regression tests for unchanged cart and orders across menu update.
- [x] Add/extend tests and run gates (AC: 18, 19, 20)
  - [x] Extend `features/menu/sync.test.ts` for no-change, changed snapshot, event emission, no event on no-op, missing meta, and in-flight coalescing.
  - [x] Add `features/menu/triggers.test.ts` with fake timers for online/visibility/interval cleanup.
  - [x] Add toast component test for `Menu đã cập nhật`.
  - [x] Add sync-engine stale-version test proving refresh then retry/backoff behavior.
  - [x] Run targeted Vitest for menu/sync/orders plus `npm run typecheck` and `npm run lint` from `pos-web`; document known warnings separately.

## Dev Notes

### Current State / Files to Read First

- `pos-web/src/features/menu/api.ts`: already knows Story 3.8 versioned response shape, but current `fetchMenu()` calls `/menu` without `since_version` and adapts a changed response into `MenuSnapshotDto | null`. This is a compatibility shim, not the final auto-sync API required by Story 3.9.
- `pos-web/src/features/menu/sync.ts`: current functions are `writeMenuSnapshot()`, `pullMenu()`, `triggerMenuPull()`, `installMenuOnlineRecovery()`. It writes `categories/products/optionGroups/options/menuMeta` atomically and clears only menu tables. Preserve this transaction pattern; extend rather than rewrite from scratch.
- `pos-web/src/features/menu/sync.test.ts`: existing regression tests for atomic cache write, no-change preserving cache, Dexie session preservation, offline trigger, online recovery cleanup. Keep these green; add tests around versioned sync rather than deleting prior coverage.
- `pos-web/src/db/schemas/menu.ts`: `MenuMetaRecord` currently has `{ id, menuVersion, lastPulledAt }`. Story AC asks for `lastCheckedAt`; current schema/index only has `lastPulledAt`. Preferred low-risk path: add optional `lastCheckedAt?: string` to the interface and store it in same object without requiring Dexie index/schema migration. Only add a Dexie version if an indexed query needs it (it does not).
- `pos-web/src/db/dexie.ts`: version 3 includes orders plus menu tables. Do not change orders schema for this story.
- `pos-web/src/features/orders/cart-store.ts`: Zustand cart state holds line item snapshots. Menu sync must not import or mutate this store except tests may read it for assertions.
- `pos-web/src/features/orders/builder.ts`: source for `menuVersionAtSale` and item snapshots at finalize time. Do not rebuild existing orders after refresh.
- `pos-web/src/features/sync/engine.ts`: currently treats 400/409/422 as non-retryable and marks order `syncFailed`. This is dangerous for `menu-version-stale` 409; Story 3.9 must handle that specific Problem Details type before generic non-retryable logic.
- `pos-web/src/shared/lib/error-mapper.ts`: already maps `/menu-version-stale` to `{ type: 'retry-after-action', payload: { action: 'refresh-menu', message: 'Menu đã thay đổi. Vui lòng cập nhật menu rồi thử lại.' } }`. Reuse this semantics, but final cashier UX for successful refresh should be only friendly toast `Menu đã cập nhật`, not raw technical error.
- `pos-web/src/sync-trigger-registrar.tsx`: existing order sync trigger registrar pattern. Use as model for root-mounted side effects and cleanup.
- `pos-web/src/connectivity-registrar.tsx`: existing browser event registrar pattern for online/offline. Avoid installing redundant listeners if this already handles a related event.
- `pos-web/src/routes/pos/pos-shell.tsx` and `features/menu/hooks.ts`: product grid/Dexie `useLiveQuery` path. Verify UI updates naturally from Dexie after menu tables are replaced; do not force reload.
- `pos-web/src/features/orders/components/receipt-modal.tsx`: must render from order snapshot data; do not look up current menu by product id for old receipts.

### Backend Contract from Story 3.8

`GET /api/v1/menu?since_version=N` is available through FE `apiClient` as relative `/menu` with snake_case query param:

```ts
type VersionedMenuResponse =
  | { menuVersion: number; hasChanges: false; snapshot: null }
  | { menuVersion: number; hasChanges: true; snapshot: MenuSnapshotPayload }

type MenuSnapshotPayload = {
  categories: MenuCategoryDto[]
  products: MenuProductDto[]
  optionGroups: MenuOptionGroupDto[]
}
```

Important backend behavior completed in Story 3.8:

- Same version returns no snapshot and minimal payload.
- Omitted/older/newer-than-server client version returns full snapshot for MVP recovery.
- Cashier/default sync sees active-only menu; admin may request inactive with `include_inactive=true`, but this POS story should not use `include_inactive`.
- Response fields are camelCase; request query is snake_case (`since_version`).
- No changelog/incremental table exists for MVP. FE must replace full snapshot when `hasChanges=true`.

### Snapshot Immutability Guardrails

This story exists partly to prove NFR14 in the frontend:

- Menu cache tables are mutable: `categories`, `products`, `optionGroups`, `options`, `menuMeta`.
- Cart line items and order records are snapshot-based and must be stable once copied/finalized.
- Do not update `db.orders` from menu sync. The only allowed order update path remains the order sync engine marking pending orders synced/failed/lastTriedAt.
- Do not map current menu product names/prices into existing cart/order lines during refresh.
- Do not close or mutate `OptionModal` state on `menu.updated`; current selection should finish against the snapshot/product object already opened.

### Trigger Design Recommendation

Recommended API shape:

```ts
export function checkAndPullIfNewer(options?: {
  database?: PosDexie
  fetchVersionedMenu?: (sinceVersion?: number) => Promise<VersionedMenuResponse>
  now?: () => Date
  dispatchEvent?: typeof window.dispatchEvent
}): Promise<VersionedMenuResponse | null>

export function installMenuSyncTriggers(options?: {
  isOnline?: () => boolean
  isAuthenticated?: () => boolean
  check?: () => Promise<unknown>
  intervalMs?: number // default 5 * 60 * 1000
  visibilityDebounceMs?: number // default 5_000
}): () => void

export function triggerMenuCheck(...): Promise<void> | null
```

Implementation details:

- Gate triggers on `navigator.onLine` and authenticated session. Existing `triggerMenuPull()` has `isAuthenticated` option defaulting true; keep this testability.
- Coalesce in-flight checks at the `triggerMenuCheck()`/`checkAndPullIfNewer()` boundary so online + visibility + interval do not duplicate.
- For app boot, call once during registrar mount if online/authenticated.
- For interval, skip work when `document.visibilityState !== 'visible'` or offline.
- For visibility event, debounce 5s and then check latest visibility/online state before running.
- Cleanup must clear timeout + interval + listeners.

### Toast Integration Notes

Current codebase shows admin pages dispatching `window.dispatchEvent(new CustomEvent('toast', { detail: '...' }))`, but no central toast implementation is visible in the inspected files. For this story:

- If a global toast listener already exists by implementation time, bridge `menu.updated` into it.
- If not, create a small root-mounted listener component for menu update only, using existing UI conventions. Prefer `sonner` only if installed/configured in `pos-web/package.json`; do not introduce a second toast system if the app already has one.
- Required microcopy is exact: `Menu đã cập nhật`.
- UX-DR25 requires non-blocking toast, not modal/dialog. Auto-dismiss after 4s.

### Previous Story Intelligence

- Story 3.8 implemented the backend contract and active-only filtering. It also kept a compatibility concern: old `GET /menu` callers may see the versioned wrapper; current FE already added a `fetchMenu()` adapter in commit `ed54e04 fix: handle versioned menu response in pos web`. Build on that rather than assuming old raw snapshot response.
- Story 3.7 completed Admin Products page and invalidates admin menu query after mutations. Story 3.9 is what makes POS tabs notice menu version changes without reload.
- Story 2.9/2.11 sync engine currently manages order queue/backoff/manual retry. The stale-menu branch must fit that FSM and not create a second order sync loop.
- Recent commits: `99da028 fix: resolve typescript build errors in pos-web admin pages`, `ed54e04 fix: handle versioned menu response in pos web`, `1159ff8 test: serialize pos-web vitest files`, `0607e1c feat: complete story 3-8 versioned menu sync`, `95f77c0 feat: complete story 3-7 products admin page`. Current FE tests may need serialized Vitest awareness; follow existing package scripts.

### Architecture / Library Guardrails

- Frontend stack: Vite 7, React 18, TypeScript strict, Dexie 4, `dexie-react-hooks`, TanStack Query for admin server-state, Zustand for UI/cart/connectivity, Axios API client, Vitest.
- Keep POS menu offline source of truth in Dexie. Do not move menu cache to React Query or Zustand.
- Layer rule: `features/menu` may import `db` and `shared/lib/api-client`; `features/sync` may import `features/menu` for the stale-version recovery action. Avoid `shared` importing `features`.
- Custom event names are lower-case dot-separated by project convention: `menu.updated` is correct.
- API query param must be `since_version`, not `sinceVersion`.
- No token storage changes. Never use `localStorage`/`sessionStorage` for auth. No `dangerouslySetInnerHTML`.
- No backend changes expected unless implementation discovers a contract bug; if so, stop and document blocker before broadening scope.

### Testing Requirements

Minimum meaningful gates:

```bash
cd pos-web
npm test -- --run src/features/menu/sync.test.ts src/features/menu/triggers.test.ts src/features/sync/engine.test.ts src/features/orders/cart-store.test.ts src/features/orders/components/receipt-modal.test.tsx
npm run typecheck
npm run lint
```

Adjust exact Vitest CLI syntax to package scripts. If full lint has known React Compiler warnings only, document them; do not ignore errors.

Test focus:

- `checkAndPullIfNewer()` sends `since_version` from local meta.
- No-change updates `lastCheckedAt` and preserves existing cache.
- Change replaces menu tables and emits exactly one `menu.updated` after write.
- Missing meta requests full snapshot safely.
- In-flight coalescing prevents duplicate API calls/events.
- Trigger install boot/online/visibility/interval/cleanup with fake timers.
- Toast listener renders exact text and dismisses.
- Stale menu order sync path refreshes menu and retries without marking order permanent failed.
- Cart/order/receipt snapshot preservation across menu update.

### Expected File Changes

Likely update/create:

- `pos-web/src/features/menu/api.ts` (UPDATE)
- `pos-web/src/features/menu/sync.ts` (UPDATE)
- `pos-web/src/features/menu/sync.test.ts` (UPDATE)
- `pos-web/src/features/menu/triggers.ts` (NEW)
- `pos-web/src/features/menu/triggers.test.ts` (NEW)
- `pos-web/src/features/menu/components/menu-updated-toast.tsx` (NEW)
- `pos-web/src/features/menu/components/menu-updated-toast.test.tsx` (NEW)
- `pos-web/src/features/sync/engine.ts` (UPDATE)
- `pos-web/src/features/sync/engine.test.ts` (UPDATE)
- `pos-web/src/db/schemas/menu.ts` (UPDATE: optional `lastCheckedAt`)
- `pos-web/src/sync-trigger-registrar.tsx`, `pos-web/src/main.tsx`, `pos-web/src/App.tsx`, or equivalent root registrar (UPDATE as needed)
- `_bmad-output/implementation-artifacts/3-9-fe-menu-auto-sync-engine-menuupdatedtoast-snapshot-preserved.md` (this story)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status update)

Do not add unless clearly justified:

- Dexie schema version just for unindexed `lastCheckedAt`.
- New global store for menu sync state.
- Backend migrations/changelog.
- New generic toast library if existing app pattern can satisfy UX.

### References

- Story requirements: `_bmad-output/planning-artifacts/epics.md#Story 3.9`
- PRD requirements: `_bmad-output/planning-artifacts/prd.md` FR34, FR35, FR36
- Architecture: `_bmad-output/planning-artifacts/architecture.md` sections for menu pull endpoint, error mapper `/menu-version-stale`, sync engine, FE file coverage
- UX: `_bmad-output/planning-artifacts/ux-design-specification.md` UX-DR25 / MenuUpdatedToast
- Project context rules: `_bmad-output/project-context.md` snapshot immutability, frontend structure, naming, token storage
- Backend contract source: `_bmad-output/implementation-artifacts/3-8-be-versioned-menu-sync-endpoint-get-api-v1-menu-since-version-n.md`
- Current FE files: `pos-web/src/features/menu/{api.ts,sync.ts,sync.test.ts,hooks.ts}`, `pos-web/src/features/sync/{engine.ts,triggers.ts}`, `pos-web/src/features/orders/{cart-store.ts,builder.ts}`, `pos-web/src/features/orders/components/receipt-modal.tsx`

## Dev Agent Record

### Completion Notes

- Implemented versioned menu auto-sync with `checkAndPullIfNewer()`, safe missing-meta handling, no-change `lastCheckedAt`, atomic snapshot replacement, and post-transaction `menu.updated` event emission.
- Added app-mounted menu sync triggers for boot, online recovery, visible-tab debounce, 5-minute active polling, manual trigger, cleanup, and in-flight coalescing.
- Added `MenuUpdatedToast` root UI with exact copy `Menu đã cập nhật`, success affordance, non-blocking 4s auto-dismiss.
- Integrated `/menu-version-stale` sync-engine recovery to refresh menu and retry while preserving original order payload snapshots; refresh failures remain retryable/backoff.
- Snapshot preservation verified by implementation boundaries/tests: menu sync only mutates menu tables/meta and emits events; `db.orders` and order payload snapshots are not rebuilt by menu refresh.
- Gates passed: targeted Vitest (23 tests), `npm run typecheck`, `npm run build`, `npm run lint` (0 errors, 4 pre-existing React Compiler warnings in admin form/table files).

### File List

- `_bmad-output/implementation-artifacts/3-9-fe-menu-auto-sync-engine-menuupdatedtoast-snapshot-preserved.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/db/schemas/menu.ts`
- `pos-web/src/features/menu/api.ts`
- `pos-web/src/features/menu/sync.ts`
- `pos-web/src/features/menu/sync.test.ts`
- `pos-web/src/features/menu/triggers.ts`
- `pos-web/src/features/menu/triggers.test.ts`
- `pos-web/src/features/menu/components/menu-updated-toast.tsx`
- `pos-web/src/features/menu/components/menu-updated-toast.test.tsx`
- `pos-web/src/features/sync/engine.ts`
- `pos-web/src/features/sync/engine.test.ts`
- `pos-web/src/routes/_layout.tsx`
- `pos-web/src/sync-trigger-registrar.tsx`

### Change Log

- 2026-05-16: Created comprehensive Story 3.9 context for FE menu auto-sync engine, MenuUpdatedToast, stale-version recovery, and snapshot preservation.
- 2026-05-16: Implemented Story 3.9 FE versioned menu auto-sync, triggers, toast, stale-menu retry path, and tests; moved story to review.


### Review Notes

- Clean review; gates passed.
