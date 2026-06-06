---
title: 'Fix: sau khi hoàn tất đơn ở table-mode phải quay về sơ đồ bàn (không kẹt ở menu)'
type: 'bugfix'
created: '2026-06-06'
status: 'done'
baseline_commit: 'f141444'
context: ['{project-root}/_bmad-output/implementation-artifacts/6-8-fe-pos-table-first-flow-brownfield-orders-integration.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trong table-mode, sau khi bấm "Hoàn tất" thanh toán cho một bàn, màn hình vẫn ở giao diện menu (lưới sản phẩm) thay vì quay về sơ đồ bàn. Cashier phải bấm "Đổi bàn"/"Hủy chọn bàn" thủ công mới về được floor-plan.

**Root cause:** `payment-method-modal.tsx` khi finalize gọi `resetCart()` (xóa cart-store) + bắn event `order.finalized` (pos-shell settle session + clear draft), NHƯNG không ai reset `usePosTableContextStore.selectedTableId` về `null`. Vì `showFloorPlan = tableMode && selectedTableId === null && !quickCounterMode`, `selectedTableId` còn giá trị → floor-plan không hiện lại.

**Approach:** Trong handler `order.finalized` đã có sẵn ở `pos-shell.tsx` (đang settle session + clear draft khi `tableId` non-null), bổ sung `usePosTableContextStore.getState().setSelectedTable(null)` trong cùng nhánh `if (tableId)`. Việc này clear `selectedTableId`/`selectedTableName` (giữ nguyên `selectedAreaId` để về đúng khu vực) → `showFloorPlan` trở thành true → sơ đồ bàn hiện lại ngay sau khi đóng receipt modal.

## Boundaries & Constraints

**Always:**
- Chỉ reset table selection khi `event.detail.tableId` non-null (đơn bán tại bàn). Đơn counter-mode/quick-counter (`tableId=null`) KHÔNG đụng table selection (giữ nguyên quickCounterMode).
- Dùng `setSelectedTable(null)` (giữ `selectedAreaId`), KHÔNG dùng `reset()` (sẽ xóa luôn area đang chọn → floor-plan mất context khu vực).
- Đặt logic trong handler `order.finalized` sẵn có — KHÔNG thêm listener mới, KHÔNG sửa payment-method-modal.

**Never:**
- KHÔNG đụng vòng đời phiên bàn (`settleLocalSession`/`clearTableDraft` giữ nguyên hành vi hiện tại).
- KHÔNG đổi cart-store, checkout-store, BE.
- KHÔNG mở rộng sang Epic 7.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior |
|----------|--------------|---------------------------|
| Hoàn tất đơn tại bàn | tableMode=true, đang chọn Bàn 7, finalize → `order.finalized {tableId:'tbl-7'}` | `selectedTableId=null`; sau khi đóng receipt → sơ đồ bàn hiện lại (giữ selectedAreaId) |
| Hoàn tất đơn counter-mode | quickCounterMode=true, `order.finalized {tableId:null}` | KHÔNG đổi table selection; quickCounterMode giữ nguyên true |
| Hoàn tất đơn counter (tableMode off) | tableMode=false, `tableId=null` | Không đụng selection (no-op nhánh table) |

</frozen-after-approval>

## Code Map

- `pos-web/src/routes/pos/pos-shell.tsx` -- handler `onOrderFinalized` (dòng ~143-156): điểm sửa duy nhất ở production code, thêm `setSelectedTable(null)` trong nhánh `if (tableId)`.
- `pos-web/src/features/tables/store.ts` -- `setSelectedTable(null)` set selectedTableId/Name=null, quickCounterMode=false, giữ selectedAreaId — KHÔNG sửa.
- `pos-web/src/routes/pos/pos-shell.test.tsx` -- thêm test: finalize tại bàn → floor-plan hiện lại; counter-mode finalize → quickCounterMode giữ nguyên.

## Tasks & Acceptance

**Execution:**
- [x] `pos-web/src/routes/pos/pos-shell.test.tsx` -- thêm test "returns to floor plan after order.finalized at a table" + "keeps quick-counter mode after counter-mode finalize".
- [x] `pos-web/src/routes/pos/pos-shell.tsx` -- trong `onOrderFinalized`, nhánh `if (tableId)`, thêm `usePosTableContextStore.getState().setSelectedTable(null)`.

**Acceptance Criteria:**
- Given table-mode đang chọn một bàn, when hoàn tất thanh toán đơn của bàn đó, then `selectedTableId` về null và sơ đồ bàn hiện lại.
- Given counter-mode/quick-counter, when hoàn tất đơn (`tableId=null`), then table selection không bị đụng (quickCounterMode giữ nguyên).

## Verification

**Commands:**
- `cd pos-web && npm run typecheck` -- expected: 0 errors
- `cd pos-web && npm test -- --run src/routes/pos` -- expected: toàn bộ xanh, test mới fail-trước-fix / pass-sau-fix

**Manual checks:**
- Table-mode store: chọn Bàn 7 → thêm món → "Hoàn tất" thanh toán → đóng receipt → màn hình quay về sơ đồ bàn (đúng khu vực).
