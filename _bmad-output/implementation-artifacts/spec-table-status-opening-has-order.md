---
title: 'Tách trạng thái bàn: "Đang phục vụ" → "Đang có đơn" + thêm "Đang mở"'
type: 'enhancement'
created: '2026-06-08'
status: 'done'
baseline_commit: '489bea4'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-fix-table-empty-immediately-after-finalize.md'
  - '{project-root}/_bmad-output/implementation-artifacts/6-13-fe-per-table-draft-cart-local-reload.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Yêu cầu:** Tách một phiên bàn đang mở (`openSessionCount > 0`) thành 2 trạng thái:

1. **"Đang có đơn"** (đổi tên từ **"Đang phục vụ"**): có session open **VÀ** có đơn hàng chưa
   thanh toán gắn với bàn đó.
2. **"Đang mở"** (trạng thái MỚI): có session open **nhưng CHƯA có** đơn hàng gắn với bàn đó —
   trường hợp cashier click vào bàn trống nhưng chưa order xong nên chưa bấm "Giữ bàn".

**Ánh xạ vào data model (quyết định then chốt):** Trong POS này, `orders` chỉ được tạo lúc
thanh toán (finalize) → đơn đã finalize LUÔN là đơn ĐÃ thanh toán. Do đó "đơn hàng chưa thanh
toán gắn với bàn" = **per-table draft cart** (`db.tableDrafts`, key = `tableId`, Story 6.13).
`saveTableDraft` tự xóa khi giỏ rỗng ⇒ tồn tại 1 record draft ⟺ có món được giữ ở bàn.

| Trạng thái | Điều kiện | Selectable |
|-----------|-----------|------------|
| **Trống** (`empty`) | không phiên mở | ✅ |
| **Đang mở** (`opening`) | phiên mở + KHÔNG có draft | ❌ (giống serving cũ) |
| **Đang có đơn** (`serving`) | phiên mở + CÓ draft | qua `hasLocalDraft` → "Tiếp tục" |
| **Xung đột phiên** (`conflict`) | `openSessionCount > 1` | ❌ |
| **Tạm tắt** (`inactive`) | `isActive === false` | ❌ |

Priority mới: `inactive > conflict > serving > opening > empty`.

## Boundaries & Constraints

**Always:**
- "Đang có đơn" / "Đang mở" ĐỀU yêu cầu phiên mở. Không phiên mở → `empty` (kể cả khi còn draft
  do "Giữ cart" — giữ nguyên hành vi cũ: draft tồn tại âm thầm, reload khi chọn lại bàn).
- Giữ key nội bộ `'serving'` (nay mang nghĩa "Đang có đơn") để giảm churn; thêm key mới `'opening'`.
- `hasDraft` là cờ LOCAL (drafts không sync) → phiên mở từ máy khác (cross-device, không có draft
  local) hiển thị **"Đang mở"**. Epic 7 sẽ xử lý draft cross-device.

**Never:**
- KHÔNG sửa BE, `/tables/status`, sync engine, vòng đời phiên (`openLocalSession`/`settleLocalSession`),
  cart-store, cart-draft (`saveTableDraft`/`loadTableDraft`/`clearTableDraft`).
- KHÔNG đổi nghĩa `pendingSync`/`activeOrderCount` ở tầng dữ liệu (đơn đã thanh toán KHÔNG giữ bàn bận).
- KHÔNG đụng `table-context-header` (aria "Đang phục vụ Bàn X" là header khi ĐANG ở trong bàn —
  ngữ cảnh khác sơ đồ bàn, ngoài phạm vi).

## Code Map

- `pos-web/src/features/tables/status-derivation.ts` — thêm `hasDraft` vào `DerivedTableStatus`;
  `deriveTableStatus` nhận `draftTableIds?: Set<string>`; `useLocalTableStatus` đọc `db.tableDrafts`;
  `toDisplayStatus` khi phiên mở → `hasDraft ? 'serving' : 'opening'`.
- `pos-web/src/features/tables/api.ts` — thêm `'opening'` vào union `TableDisplayStatus` + cập nhật doc.
- `pos-web/src/features/tables/components/table-card.tsx` — `STATUS_META`: đổi nhãn `serving` →
  "Đang có đơn"; thêm `opening` → "Đang mở" (variant `accent`, icon `DoorOpen`, disabled).
- `pos-web/src/features/tables/components/floor-plan-view.tsx` — `STATUS_LEGEND`: "Đang có đơn" +
  "Đang mở".
- `pos-web/src/routes/pos/pos-shell.tsx` — cập nhật comment "Giữ bàn" (session mở + draft → "Đang có đơn").
- Tests: `status-derivation.test.ts` (hasDraft propagation + toDisplayStatus serving/opening),
  `table-card.test.tsx` (nhãn mới + opening), `floor-plan-view.test.tsx` (open-no-draft → Đang mở;
  open+draft → Đang có đơn; clear `db.tableDrafts` giữa các test).

## Verification

- `npm run typecheck` → 0 errors.
- `npm test -- --run src/features/tables src/routes/pos` → 170 passed / 15 files.
- Full suite → 476 passed / 68 files. Lint → 0 errors (7 warning pre-existing, file khác).

**Manual checks:**
- Table-mode: click Bàn trống → quay lại sơ đồ (chưa order) → bàn "Đang mở" (accent).
- Thêm món + "Giữ bàn" → bàn "Đang có đơn" (warning, badge "Tiếp tục", chọn lại được).
- Thanh toán → bàn về "Trống" ngay.

</frozen-after-approval>
