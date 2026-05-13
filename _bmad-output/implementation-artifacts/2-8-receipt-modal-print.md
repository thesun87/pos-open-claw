# Story 2.8: Receipt Modal + Print

Status: done

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a cashier,
I want xem ReceiptModal sau khi hoàn tất đơn với mã đơn, snapshot items, total, sync status và in qua trình duyệt,
so that khách có hóa đơn ngay và thu ngân biết đơn đã được lưu (cả online lẫn offline).

## Acceptance Criteria

1. **Receipt content after finalize:** Given finalize flow trả `LocalOrderRecord` từ Story 2.7, when `ReceiptModal` mở, then hiển thị header `Hóa đơn`, `orderCode` lớn, `soldAt` format `dd/MM/yyyy HH:mm` locale `vi`, cashier name nếu có (fallback rõ như `Thu ngân POS` nếu chưa có user name), items snapshot (name, options, note, quantity, lineTotal), discount nếu có, total qua `formatVnd()` với visual 28–36px bold, payment method label tiếng Việt, và `SyncStatusBadge` trạng thái hiện tại.
2. **Actions visible:** Given receipt open, then nút `In hóa đơn` và `Đóng` rõ ràng, focusable, có accessible name đúng.
3. **Reactive sync status:** Given receipt mở với `pendingSync`, when Dexie order status đổi thành `synced`/`syncFailed` bởi Story 2.9 hoặc test update, then badge trong receipt tự cập nhật qua `useLiveQuery(db.orders.where('clientOrderId').equals(...))` hoặc query tương đương, và receipt KHÔNG tự đóng.
4. **Print trigger:** Given receipt open, when cashier bấm `In hóa đơn`, then gọi `window.print()` thông qua hook `pos-web/src/shared/hooks/use-print.ts` (không gọi trực tiếp rải rác trong component).
5. **Print CSS:** Given browser print, then `@media print` ẩn app header/nav/cart/product grid/modal overlay/non-receipt UI và chỉ in nội dung receipt; print layout 80mm-friendly, single column, price column/tabular values dễ đọc.
6. **Offline printing:** Given app offline and receipt data already in IndexedDB/local state, when bấm `In hóa đơn`, then print vẫn hoạt động không cần network/API.
7. **Close behavior:** Given receipt open, when cashier bấm `Đóng` hoặc Esc, then modal đóng, focus return về POS/finalize button area, cart vẫn đã reset từ Story 2.7; closing receipt must not restore cart or mutate order.
8. **Accessibility structure:** Given screen reader, when receipt open, then heading hierarchy đúng: `h2` `Hóa đơn`, `h3` `Chi tiết`, item list dùng `<ul>`, totals/payment dùng `<dl>`, print button focusable, dialog has title/description, no `dangerouslySetInnerHTML`.
9. **Tests:** Component/integration tests cover successful finalize opens receipt, status reactivity on Dexie update, print hook call, close/Esc behavior, offline/no-network print path, and semantic structure for key headings/list/definition list.

## Tasks / Subtasks

- [x] Add receipt print utility and styles (AC: 4, 5, 6)
  - [x] Create `pos-web/src/shared/hooks/use-print.ts` wrapping `window.print()`; guard SSR/test environment and keep it tiny/reusable.
  - [x] Add print CSS in `pos-web/src/index.css` or a route/component stylesheet using `@media print`; mark printable receipt root with a stable class/attribute such as `.receipt-print-root` / `[data-print-receipt]`.
  - [x] Ensure overlay/backdrop and POS layout are hidden in print; only receipt content is visible; use 80mm max width and readable price alignment.
- [x] Implement reusable sync status badge for receipt (AC: 1, 3)
  - [x] Add or extend `pos-web/src/shared/components/layout/sync-status-badge.tsx` (or colocate in orders if preferred) with labels: `pendingSync` → `Chờ đồng bộ`, `synced` → `Đã đồng bộ`, `syncFailed` → `Lỗi đồng bộ`.
  - [x] Do not implement full pending counter/retry panel here; those belong to Stories 2.10–2.11.
- [x] Implement `ReceiptModal` (AC: 1, 2, 3, 7, 8)
  - [x] Create `pos-web/src/features/orders/components/receipt-modal.tsx` using existing Radix/shadcn dialog primitives from `shared/components/ui/dialog.tsx`.
  - [x] Accept `order: LocalOrderRecord | null`, `open`, `onOpenChange`/`onClose` props; use Dexie live query by `clientOrderId` to refresh `status` without losing initial snapshot.
  - [x] Render only snapshot fields stored on `LocalOrderRecord`; never read current menu/product prices for receipt rows.
  - [x] Format currency with `formatVnd()`; format date with a small date-fns/Intl helper using Vietnamese `dd/MM/yyyy HH:mm` output. If adding `date-fns`, update package files; otherwise use `Intl.DateTimeFormat('vi-VN', ...)` and document exact output in tests.
  - [x] Payment labels: `cash` `Tiền mặt`, `transfer` `Chuyển khoản`, `card` `Thẻ`.
- [x] Wire receipt handoff into POS shell (AC: 1, 7)
  - [x] In `pos-web/src/routes/pos/pos-shell.tsx`, subscribe to `useCheckoutStore((s) => s.lastFinalizedOrder)` and open `ReceiptModal` immediately after successful finalize.
  - [x] Keep Story 2.7 behavior: `CheckoutSummary` owns finalize, cart reset on success only, Dexie error preserves cart.
  - [x] On close, clear/ack receipt state with a minimal store action if needed; do not call `resetCheckoutState()` in a way that resets payment method unexpectedly unless tests assert desired behavior.
- [x] Add/extend tests (AC: 3, 4, 6, 7, 8, 9)
  - [x] Extend `pos-web/src/routes/pos/pos-shell.test.tsx` for finalize → receipt visible with orderCode/total/payment/items and cart empty.
  - [x] Add `receipt-modal.test.tsx` or colocated tests to update `db.orders` status and assert badge text changes while dialog remains open.
  - [x] Stub `window.print` and assert print button calls `usePrint` path once.
  - [x] Test close button and Esc closes modal; avoid brittle focus assertions unless existing test harness supports it reliably.
  - [x] Validate semantic landmarks/headings/list/dl with Testing Library roles/text.

## Dev Notes

### Existing Implementation State (must preserve)

- Story 2.7 already implemented offline-first finalize in `pos-web/src/features/orders/api.ts`: `buildLocalOrder()` → `db.orders.add(persistedOrder)` with `status: 'pendingSync'` → `void syncEngine.kick()` → return `LocalOrderRecord`.
- `CheckoutSummary` currently resets cart only after `finalizeOrder()` succeeds, calls `completeCheckout(order)`, and dispatches `order.finalized`. Do not move Dexie writes into ReceiptModal.
- `checkout-store.ts` already has `lastFinalizedOrder: LocalOrderRecord | null` and `completeCheckout(order)`. Use this as the primary handoff instead of inventing another event bus.
- Current POS shell has no receipt modal. It renders product/menu area + `CartPanel` and already has tests in `pos-shell.test.tsx`; extend those patterns.

### Data Contract

Use `LocalOrderRecord` from `pos-web/src/db/schemas/orders.ts`:

- IDs/status: `clientOrderId`, `orderCode`, `status: 'pendingSync' | 'synced' | 'syncFailed'`, optional `serverOrderId`, `failReason`, `syncedAt`.
- Receipt metadata: `deviceId`, `soldAt`, optional `cashierId`, `paymentMethod`.
- Money/snapshot: `items[]`, each with `productNameSnapshot`, `unitPriceSnapshot`, `options[]`, `note`, `quantity`, `lineTotal`; order has `discountAmount`, `total`.
- IndexedDB schema includes `clientOrderId` primary/indexed access; querying by `clientOrderId` is supported.

### Architecture Compliance

- Frontend stack: React 18, TypeScript, Vite, Tailwind, Zustand, Dexie, `dexie-react-hooks`, Radix Dialog, Testing Library/Vitest.
- IndexedDB/Dexie is offline source of truth for local orders. Receipt must not depend on backend sync response.
- Browser print API is the intended integration: `window.print()` plus `@media print`. ESC/POS thermal printing is explicitly out of MVP scope.
- Zustand remains UI state only; do not store order queue/server state in Zustand beyond `lastFinalizedOrder` handoff.
- No new backend API work is in scope.

### UX / Accessibility Guardrails

- Receipt appears immediately after local save; sync state must not block display or printing.
- Receipt is trust-building UI: make `orderCode`, saved timestamp, total, and sync badge prominent.
- Keep receipt text around 13–14px for body; total 28–36px bold; use tabular/monospace numeric alignment in print if feasible.
- Dialog must use existing Radix primitives for focus trap, Esc close, and accessible semantics.
- Do not use color as the only status signal; include text labels.

### Latest Technical Notes

- `dexie-react-hooks` is already installed and intended for live IndexedDB reactivity. Its docs describe `useLiveQuery()` as keeping React components updated whenever IndexedDB data changes; use it for receipt status updates instead of polling.
- Project currently has no `date-fns` dependency in `pos-web/package.json` despite epic wording. Prefer a lightweight local formatter with `Intl.DateTimeFormat('vi-VN')` unless adding `date-fns` is justified and package-lock is updated. Acceptance requires visible `dd/MM/yyyy HH:mm` output, not necessarily a new dependency.

### Project Structure Notes

Expected files to create/update:

- NEW: `pos-web/src/features/orders/components/receipt-modal.tsx`
- NEW: `pos-web/src/shared/hooks/use-print.ts`
- NEW or UPDATE: `pos-web/src/shared/components/layout/sync-status-badge.tsx` (if not created elsewhere)
- UPDATE: `pos-web/src/routes/pos/pos-shell.tsx`
- UPDATE: `pos-web/src/index.css` or equivalent global stylesheet for print CSS
- UPDATE: `pos-web/src/routes/pos/pos-shell.test.tsx`
- NEW optional: `pos-web/src/features/orders/components/receipt-modal.test.tsx`

Detected variance: architecture sketch names `routes/pos/receipt-modal.tsx`, but current codebase colocates order UI under `features/orders/components/*` (`cart-panel`, `checkout-summary`, `payment-method-selector`). Put `ReceiptModal` there and import from POS shell to match actual code.

### Scope Boundaries

- Do NOT implement sync engine drain/FSM/retry; Story 2.9 owns it. This story only reacts to status changes.
- Do NOT implement PendingCounter full UX; Story 2.10 owns it.
- Do NOT implement manual retry/error mapping panel; Story 2.11 owns it.
- Do NOT implement cancel/void flows or void receipt watermark; Stories 2.12–2.13 own them.
- Do NOT change order snapshot builder semantics except if a bug blocks receipt rendering and tests cover it.

### Previous Story Intelligence

From Story 2.7:

- Receipt handoff is intentionally available via `lastFinalizedOrder` and `order.finalized`; prefer the store for React wiring.
- Existing tests already seed fake IndexedDB and reset stores in `beforeEach`/`afterEach`; reuse that setup.
- Preserve failure behavior: on Dexie write error, cart remains and no receipt opens.
- Sync kick is intentionally fire-and-forget; receipt must work even if sync fails or is unavailable.

### Git Intelligence Summary

Recent commit `a4dd32b feat(pos): finalize orders offline-first` added the exact seams this story should extend: `db/schemas/orders.ts`, `features/orders/api.ts`, `checkout-store.ts`, `checkout-summary.tsx`, `features/sync/engine.ts`, and `routes/pos/pos-shell.test.tsx`. Follow those naming/testing conventions and keep changes small.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.8 AC; UX-DR12 ReceiptModal; UX-DR27 PrintReceiptLayout; Epic 2 dependencies.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — ReceiptModal anatomy/states/accessibility; print/receipt typography; checkout flow notes.
- `_bmad-output/planning-artifacts/architecture.md` — browser print API, POS data flow, source tree, Dexie/Zustand boundaries.
- `_bmad-output/implementation-artifacts/2-7-frontend-finalize-order-flow-dexie-write-sync-kick.md` — handoff and preservation requirements from previous story.
- `pos-web/src/features/orders/api.ts` — finalize sequence and returned `LocalOrderRecord`.
- `pos-web/src/features/orders/checkout-store.ts` — `lastFinalizedOrder` handoff state.
- `pos-web/src/routes/pos/pos-shell.tsx` and `.test.tsx` — current integration point and test style.

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- `npm test -- --run src/routes/pos/pos-shell.test.tsx src/features/orders/components/receipt-modal.test.tsx --reporter=dot` — PASS, 16 tests. React act warnings tồn tại trong harness.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS, Vite chunk-size warning hiện hữu (>500 kB).

### Completion Notes List

- Thêm `ReceiptModal` sau finalize dựa trên `lastFinalizedOrder`, giữ cart reset từ Story 2.7 và clear receipt state khi đóng.
- Receipt render snapshot order, formatter VND/date `vi-VN`, payment labels tiếng Việt, fallback `Thu ngân POS`, semantic `h2`/`h3`/`ul`/`dl`.
- Sync badge dùng `useLiveQuery` theo `clientOrderId`, cập nhật trạng thái Dexie mà không tự đóng modal.
- Print đi qua hook `usePrint()` và global `@media print` chỉ hiển thị `[data-print-receipt]`, 80mm-friendly.
- Tests bao phủ finalize → receipt, sync status reactivity, print trigger/offline path, close/Esc, semantic structure.

### File List


- `pos-web/src/shared/hooks/use-print.ts`
- `pos-web/src/shared/components/layout/sync-status-badge.tsx`
- `pos-web/src/features/orders/components/receipt-modal.tsx`
- `pos-web/src/features/orders/components/receipt-modal.test.tsx`
- `pos-web/src/features/orders/checkout-store.ts`
- `pos-web/src/routes/pos/pos-shell.tsx`
- `pos-web/src/routes/pos/pos-shell.test.tsx`
- `pos-web/src/index.css`
- `_bmad-output/implementation-artifacts/2-8-receipt-modal-print.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-05-13: Implemented receipt modal, reactive sync badge, print hook/CSS, POS integration, and tests.
