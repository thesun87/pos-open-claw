# Story 2.12: Cancel Pending Order (Cart-level Void Before Sync)

Status: done

<!-- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created -->

## Story

As a cashier,  
I want hủy đơn đang trong giỏ kèm lý do hủy trước khi finalize,  
so that tôi có thể hủy đơn khách đổi ý mà không phải đẩy xuống server vô ích (FR17).

## Acceptance Criteria

1. Given `CartPanel` có items, when cashier bấm nút `Hủy đơn`, then mở `<VoidOrderDialog />` (UX-DR15) với input `Lý do hủy` required, ví dụ “Khách đổi ý”, “Hết món”; dialog có nút danger `Hủy đơn này` và secondary `Quay lại`, không dùng label chung chung như `OK`.
2. Given lý do empty/blank, when cashier bấm `Hủy đơn này`, then hiển thị inline validation `Vui lòng nhập lý do hủy` và submit bị chặn.
3. Given lý do hợp lệ, when cashier confirm, then gọi `cartStore.resetCart()` để clear items + discount và reset payment method về mặc định qua checkout state; dialog đóng, focus return POS/cart panel, hiển thị feedback nhẹ `Đã hủy đơn`.
4. Given cart-level cancel xảy ra trước finalize, when confirm thành công, then không ghi row nào vào Dexie `db.orders`, không gọi `finalizeOrder()`, không gọi `syncEngine.kick()`, và không có server/API call.
5. Given đơn đã có `clientOrderId` trong Dexie với `status='pendingSync'` (đã finalize nhưng chưa sync), when cashier mở SyncRetryPanel, then không hiển thị action cart-level cancel cho row đó; copy/guardrail phân biệt rõ “Hủy đơn này” chỉ dành cho giỏ chưa finalize, còn đơn đã finalize phải xử lý bằng Story 2.13 void flow.
6. Given dialog mở, when render, then focus tự động vào input `Lý do hủy`; Tab loop trong dialog theo Radix Dialog; Esc đóng dialog; khi đóng bằng Esc/Quay lại/confirm thì focus return về nút/panel đã mở dialog.
7. Tests/gates: component tests cover open/close, required validation, successful reset + feedback, no Dexie write/API/sync call, focus behavior; regression tests cover checkout/cart store reset payment method as needed. Run from `pos-web/`: targeted tests, `npm run typecheck`, `npm run lint`, ideally `npm run build`.

## Tasks / Subtasks

- [x] Create reusable VoidOrderDialog for cart cancel (AC: 1, 2, 6)
  - [x] Add `pos-web/src/features/orders/components/void-order-dialog.tsx` with Vietnamese UI text, `reason` local state, inline validation, and `initialFocus`/`autoFocus` on the reason input.
  - [x] Use existing `Dialog`/Radix wrapper and shared `Button`; destructive primary label must be exactly `Hủy đơn này`, secondary `Quay lại`.
  - [x] Keep component generic enough for Story 2.13 to reuse later, but implement only cart-level local cancel behavior in this story.
- [x] Wire cancel action into CartPanel (AC: 1, 3, 4, 6)
  - [x] Update `pos-web/src/features/orders/components/cart-panel.tsx` to render a `Hủy đơn` button only when `items.length > 0`.
  - [x] On confirm with valid reason, call `useCartStore.getState().resetCart()` or store action from hook and `useCheckoutStore.getState().resetCheckoutState()`/equivalent to reset payment method to `cash`.
  - [x] Close dialog and return focus to the cart/POS trigger area. Preserve existing line-item remove confirmation behavior.
  - [x] Emit only local UI feedback (`Đã hủy đơn`) via existing app feedback pattern or a small accessible inline/polite message if no toast provider exists; do not add a new dependency just for toast.
- [x] Preserve finalized-order boundaries (AC: 4, 5)
  - [x] Do not touch `pos-web/src/features/sync/components/sync-retry-panel.tsx` unless there is already a misleading cancel affordance; if touched, only ensure no cart-level cancel action appears for `pendingSync`/`syncFailed` rows.
  - [x] Do not mutate Dexie `db.orders`, do not call order API/fetch/axios, and do not call `syncEngine.kick()` from this cart cancel flow.
- [x] Add tests and gates (AC: 2, 3, 4, 6, 7)
  - [x] Add `void-order-dialog.test.tsx` and/or extend `cart-panel` tests to cover required reason validation, confirm reset, dialog open/close, focus return.
  - [x] Spy/mock `db.orders.add` or inspect Dexie order count to prove cancel-before-finalize creates no local order rows.
  - [x] Spy/mock `finalizeOrder` and `syncEngine.kick` where practical to prove no finalize/sync path runs.
  - [x] Run `npm run test -- void-order-dialog cart-panel` or nearest targeted suite, then `npm run typecheck`, `npm run lint`, and `npm run build` if time allows.

## Dev Notes

### Existing Implementation State (must preserve)

- `CartPanel` currently lives at `pos-web/src/features/orders/components/cart-panel.tsx`. It renders line items, item-note editing, line removal confirmation, `DiscountControl`, and `CheckoutSummary`.
- `useCartStore` in `pos-web/src/features/orders/cart-store.ts` already exposes both `clearCart()` and `resetCart()`, and `resetCart()` clears `items` + `discount` only. This story should use `resetCart()` for the cart portion.
- Payment method is not stored in `cartStore`; it is in `useCheckoutStore` at `pos-web/src/features/orders/checkout-store.ts`, defaulting to `cash`. Because AC says clear payment method, reset checkout state or set payment method back to `cash` on successful cart cancel.
- `CheckoutSummary` currently calls `finalizeOrder()`, then `resetCart()`, then `completeCheckout(order)`, and emits `order.finalized`. The cancel flow must not enter this path or emit `order.finalized`.
- `finalizeOrder()`/builder are the only intended path to `db.orders.add({ status: 'pendingSync' })`. Cart-level cancel must occur before that path and must leave Dexie order count unchanged.
- `SyncRetryPanel` from Story 2.11 lists already-finalized local orders (`pendingSync`/`syncFailed`) and owns retry actions only. It should not gain a cart-level cancel action.

### Architecture Compliance

- Frontend stack: React 18, TypeScript strict, Vite, Zustand for UI/cart/checkout state, Dexie 4 for local orders, Vitest/Testing Library.
- Respect FE import direction: `features/orders/components` may import `features/orders` store/API/types plus `shared` UI/lib. `shared` must not import order feature components.
- Offline order queue source of truth remains IndexedDB. Do not write a “canceled cart” order, audit row, or void row for pre-finalize cancel in this story.
- Date/storage rules remain: API/storage dates ISO UTC and money integer VND. This story should not add new persisted date/money fields.
- Security rules remain: no `localStorage`/`sessionStorage`, no `dangerouslySetInnerHTML`, no raw/internal error copy.

### UX / Accessibility Guardrails

- UX-DR15 destructive actions require explicit confirmation and specific labels. Use `Hủy đơn này`, not `OK`; use `Quay lại` for the secondary action.
- Required validation should be inline near the reason field: `Vui lòng nhập lý do hủy`; do not use a blocking browser alert.
- Use calm success feedback after confirm: `Đã hủy đơn`. This is a local cart action, not a sync/server event.
- Focus management matters: opening dialog focuses reason input; Esc/Quay lại closes; focus returns to the trigger/cart panel. Existing Radix `Dialog` provides focus trap/Tab loop—do not bypass it.
- The reason is required for cashier accountability even though no row is persisted in MVP cart-level cancel. Do not store the reason in Dexie in this story unless product requirements later add a local audit log.

### Previous Story Intelligence

From Story 2.11:
- `SyncRetryPanel` is for `pendingSync` + `syncFailed` rows already in Dexie and should remain retry-focused. Do not mix cart cancel with finalized-order retry/void flows.
- Safe Vietnamese microcopy and no raw/internal technical text remain important.

From Story 2.10:
- Pending counts are Dexie-reactive. Since this story does not write Dexie orders, pending counter must not change when cart cancel succeeds.

From Story 2.9:
- `syncEngine.kick()` is only for finalized local orders. Cart cancel must not call it.

From Story 2.7/2.8:
- Finalize flow writes local order first and receipt/sync behavior follows. Cancel-before-finalize should close/reset the cart without opening receipt or affecting last finalized order.

### Git Intelligence Summary

Recent commits:
- `6253b6c feat(pos-web): implement manual sync retry panel` established SyncRetryPanel boundaries and safe retry copy.
- `1797f84 feat(pos): add connectivity indicator and pending counter` established Dexie live pending counter; cart cancel should not affect it.
- `fa42370 feat(pos-web): implement sync engine backoff` established `syncEngine.kick()` semantics; do not invoke from cart cancel.
- `c31ed2f feat(pos): add receipt modal print flow` established post-finalize receipt status; cancel-before-finalize should not open receipt.
- `a4dd32b feat(pos): finalize orders offline-first` established Dexie local order creation path; avoid it for cancel.

### Expected File Structure

Expected files to create/update:
- NEW: `pos-web/src/features/orders/components/void-order-dialog.tsx`
- NEW: `pos-web/src/features/orders/components/void-order-dialog.test.tsx`
- UPDATE: `pos-web/src/features/orders/components/cart-panel.tsx`
- UPDATE or NEW: `pos-web/src/features/orders/components/cart-panel.test.tsx` if broader integration is easier there
- UPDATE only if necessary: `pos-web/src/features/orders/checkout-store.ts` tests to assert/reset payment method behavior
- DO NOT add backend files for this story.

### Scope Boundaries

- Do NOT implement Story 2.13 backend `POST /api/v1/orders/:id/void` or synced-order void UI.
- Do NOT create `OrderVoid`, `pendingVoids`, or any persisted cancellation record for cart-level cancel.
- Do NOT allow cart-level cancel for rows already in Dexie (`pendingSync`, `syncFailed`, `synced`).
- Do NOT modify order snapshots, sync statuses, or sync engine retry/backoff behavior.
- Do NOT add a new toast library if the app has no provider yet; prefer existing feedback pattern or an accessible inline/polite status.

### References

- `_bmad-output/planning-artifacts/epics.md` — Story 2.12 AC and Epic 2 cancellation flow boundaries.
- `_bmad-output/planning-artifacts/ux-design-specification.md` — UX-DR15 destructive dialog/button-label rules and feedback patterns.
- `_bmad-output/planning-artifacts/architecture.md` — FE layering, Zustand/Dexie split, local order flow, sync UI integration.
- `_bmad-output/project-context.md` — mandatory stack, naming, state-management, security, and testing rules.
- `_bmad-output/implementation-artifacts/2-11-manual-sync-trigger-sync-retry-panel-error-mapping.md` — SyncRetryPanel boundaries and prior story intelligence.
- `pos-web/src/features/orders/components/cart-panel.tsx` — cart UI integration point.
- `pos-web/src/features/orders/cart-store.ts` — `resetCart()` behavior.
- `pos-web/src/features/orders/checkout-store.ts` — payment method reset/default state.
- `pos-web/src/features/orders/components/checkout-summary.tsx` — finalize path to avoid.
- `pos-web/src/db/schemas/orders.ts` — Dexie local order status contract.

## Project Context Reference

- Source of truth: `_bmad-output/project-context.md` and `_bmad-output/planning-artifacts/architecture.md`.
- Critical rules relevant here: keep code in feature module; Dexie persists finalized offline orders only; Zustand is appropriate for cart/checkout UI state; UI text in Vietnamese; destructive actions need explicit confirmation; no local/session storage; no `dangerouslySetInnerHTML`; tests ship with code.

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-14: Inspected existing implementation changes for Story 2.12 and confirmed scope stayed within cart-level pre-finalize cancel.
- 2026-05-14: Ran targeted component tests, typecheck, lint, and production build from `pos-web/`. Initial lint issue in `void-order-dialog.tsx` was already resolved before final gates; final gates passed.

### Completion Notes List

- Added reusable `VoidOrderDialog` with Vietnamese destructive confirmation copy, required reason validation, input autofocus, Escape/secondary close behavior, and Radix dialog focus trap support.
- Wired `CartPanel` cart-level `Hủy đơn` action for carts with items only; valid confirm resets cart items/discount via `resetCart()`, resets checkout payment state to `cash`, closes the dialog, returns focus to cart area, and shows accessible local feedback `Đã hủy đơn`.
- Preserved finalized-order boundaries: no SyncRetryPanel changes, no Dexie order writes, no `finalizeOrder()` path, no `syncEngine.kick()`, and no server/API call from cart cancel flow.
- Added component/regression tests for dialog copy/focus/validation/close, successful cart reset/payment reset/feedback/focus return, and no Dexie/finalize/sync side effects.

### File List

- `_bmad-output/implementation-artifacts/2-12-cancel-pending-order-cart-level-void-before-sync.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/src/features/orders/components/cart-panel.tsx`
- `pos-web/src/features/orders/components/cart-panel.test.tsx`
- `pos-web/src/features/orders/components/void-order-dialog.test.tsx`
- `pos-web/src/features/orders/components/void-order-dialog.tsx`

### Change Log

- 2026-05-14: Story context created by BMAD create-story workflow; status set to ready-for-dev.
- 2026-05-14: Implemented cart-level void-before-sync flow, added tests, and moved story to review.
