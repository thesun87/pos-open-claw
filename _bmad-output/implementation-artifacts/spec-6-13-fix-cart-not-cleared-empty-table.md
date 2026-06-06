---
title: 'Fix: giỏ hàng không trống khi chọn bàn trống sau khi đã giữ bàn (table-flow)'
type: 'bugfix'
created: '2026-06-06'
status: 'done'
baseline_commit: '3b0fdf03ea6fb305ab1bee1a138cd4a1b5f4fd4d'
context: ['{project-root}/_bmad-output/implementation-artifacts/6-13-fe-per-table-draft-cart-local-reload.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trong table-mode, sau khi bấm "Giữ bàn" (giỏ có món) rồi quay ra sơ đồ bàn và chọn một **bàn trống khác** (không có draft), giỏ hàng vẫn còn nguyên các món của bàn vừa giữ thay vì trống để order mới. Vi phạm AC5 của Story 6.13.

**Approach:** Trong subscription điều phối ở `pos-shell.tsx`, khi chọn bàn (null→non-null), luôn đồng bộ giỏ theo draft của bàn đích: có draft → nạp draft; không có draft → nạp giỏ rỗng (`loadCart({ items: [], discount: null })`). Việc này dọn món tồn từ bàn trước mà vẫn giữ nguyên `tableId`/`tableNameSnapshot` vừa set qua `setTableContext`.

## Boundaries & Constraints

**Always:**
- Dùng `loadCart` (set items+discount) để clear, KHÔNG dùng `resetCart`/`clearCart` (chúng xóa luôn table context vừa set → vỡ pairing FR51).
- Chỉ chạy nhánh load/clear khi `!quickCounterMode` và `newTableId !== prevTableId` (giữ guard hiện có).
- Re-select bàn CÓ draft vẫn nạp đúng món (AC4 không được hồi quy).

**Ask First:**
- Nếu phát hiện flow nào ngoài "Giữ bàn"/"Đổi bàn–Giữ cart" cũng dựa vào việc giỏ giữ món xuyên qua lần chọn bàn (ngoài tài liệu 6.13) thì HALT hỏi trước khi đổi.

**Never:**
- KHÔNG đụng vòng đời phiên bàn (`session-*`, `openLocalSession`/`settleLocalSession`).
- KHÔNG đổi cấu trúc `ModeTransitionConfirmDialog`, không persist cart-store qua localStorage, không thêm sync server cho draft.
- KHÔNG đổi BE.
- KHÔNG mở rộng sang Epic 7 (cross-device/merge).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Giữ bàn rồi chọn bàn trống khác | Cart có món của Bàn A (draft Bàn A đã lưu), chọn Bàn B không có draft | Giỏ TRỐNG; table context = Bàn B | N/A |
| Chọn lại bàn đang giữ (có draft) | Chọn Bàn A có draft | Giỏ nạp lại đúng món của Bàn A | N/A |
| Đổi bàn → "Giữ cart" rồi chọn bàn trống | Sau handleKeepCart change-table (đã lưu draft bàn cũ), chọn bàn trống mới | Giỏ TRỐNG ở bàn mới (món cũ đã nằm trong draft bàn cũ) | N/A |
| Quick-counter / counter-mode | `quickCounterMode=true` hoặc `tableId=null` | KHÔNG đụng giỏ qua nhánh draft (regression an toàn) | N/A |
| Bàn đích = bàn hiện tại (no-op) | `newTableId === prevTableId` | Không reload, không clear | N/A |

</frozen-after-approval>

## Code Map

- `pos-web/src/routes/pos/pos-shell.tsx` -- subscription điều phối table-select (dòng ~114-120): điểm sửa duy nhất ở production code.
- `pos-web/src/features/orders/cart-store.ts` -- `loadCart` (set items+discount, không đụng table context) — dùng để clear; KHÔNG sửa.
- `pos-web/src/routes/pos/pos-shell.test.tsx` -- test integration draft orchestration; sửa case AC5 để phản ánh đúng bug + thêm assertion clear-leftover.

## Tasks & Acceptance

**Execution:**
- [x] `pos-web/src/routes/pos/pos-shell.tsx` -- Trong nhánh load-draft của subscription, đổi `loadTableDraft(newTableId).then((draft) => { if (draft) loadCart(draft) })` thành luôn gọi `loadCart(draft ?? { items: [], discount: null })` để bàn không-draft thì giỏ trống. Giữ nguyên guard `newTableId && newTableId !== prevTableId && !state.quickCounterMode`.
- [x] `pos-web/src/routes/pos/pos-shell.test.tsx` -- Sửa test "re-selecting a table WITHOUT a draft starts with empty cart (AC5)": thay vì `resetCart()` rồi chọn bàn, hãy seed sẵn món tồn trong cart (mô phỏng vừa giữ bàn trước), rồi chọn bàn trống và assert giỏ về 0 món. Thêm assertion AC4 vẫn xanh.

**Acceptance Criteria:**
- Given giỏ đang có món của bàn vừa "Giữ bàn", when cashier chọn một bàn trống khác (không có draft), then giỏ hàng trống (0 món, discount null) và table context = bàn mới.
- Given bàn đích có draft, when chọn lại bàn đó, then giỏ nạp lại đúng món của bàn đó (AC4 không hồi quy).
- Given counter-mode/quick-counter (`tableId=null`/`quickCounterMode`), when bán đơn, then nhánh draft không can thiệp giỏ.

## Spec Change Log

- 2026-06-06 (review patch): Edge-case + blind reviewers flagged an async race — a faster table switch could let an in-flight `loadTableDraft` resolve out of order and clobber the newly selected table's cart (the diff turned the previously no-op "no draft" branch into an active write, widening a pre-existing latent race). Added a staleness guard inside the `.then`: only apply `loadCart` when `useCartStore.getState().tableId === newTableId`. KEEP: `loadCart(draft ?? { items: [], discount: null })` clearing semantics + `loadCart` (not `resetCart`) to preserve FR51 pairing. Rejected (not this change): missing `.catch` (fail-safe — `loadTableDraft` returns null only on genuine miss; rejection skips the `.then`), AC8 carried-cart clearing (documented intended behavior, resolves deferred finding 251), discount-without-items (impossible — `saveTableDraft` clears on empty items).

## Verification

**Commands:**
- `cd pos-web && npm run typecheck` -- expected: 0 errors
- `cd pos-web && npm run lint` -- expected: 0 errors (warnings pre-existing chấp nhận)
- `cd pos-web && npm test -- --run src/routes/pos src/features/orders` -- expected: toàn bộ xanh, test AC5 mới fail-trước-fix / pass-sau-fix, không hồi quy AC4/AC6/AC7
- `cd pos-web && npm run build` -- expected: success

**Manual checks:**
- Table-mode store: Bàn 3 → thêm 2 món → "Giữ bàn" → chọn Bàn 5 (trống) → giỏ TRỐNG. Chọn lại Bàn 3 → giỏ hiện lại 2 món.

## Suggested Review Order

- Entry point — fix cốt lõi: bàn không-draft → nạp giỏ rỗng (AC5), bàn có-draft → nạp lại món (AC4).
  [`pos-shell.tsx:112`](../../pos-web/src/routes/pos/pos-shell.tsx#L112)

- Staleness guard (review patch): chống stale resolve clobber giỏ khi chuyển bàn nhanh.
  [`pos-shell.tsx:121`](../../pos-web/src/routes/pos/pos-shell.tsx#L121)

- Test tái hiện đúng bug: seed món tồn từ bàn trước → chọn bàn trống → assert giỏ về 0.
  [`pos-shell.test.tsx:527`](../../pos-web/src/routes/pos/pos-shell.test.tsx#L527)
