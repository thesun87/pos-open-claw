---
title: 'Fix: bàn về "Trống" ngay sau khi hoàn tất đơn (không kẹt ở "Chờ đồng bộ" tới khi sync)'
type: 'bugfix'
created: '2026-06-06'
status: 'done'
baseline_commit: 'f141444'
context: ['{project-root}/_bmad-output/implementation-artifacts/spec-fix-return-to-floorplan-after-finalize.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trong table-mode, sau khi "Hoàn tất" đơn tại một bàn và quay về sơ đồ bàn, bàn KHÔNG về "Trống" ngay — kẹt ở **"Đang phục vụ"** (serving), chỉ chuyển sang "Trống" sau khi `/api/v1/tables/status` được gọi lại (poll 30s hoặc refresh page).

**Root cause (CHÍNH — merge server lấn át settle local):** `deriveTableStatus` dùng `mergedOpenSessions = Math.max(localOpenSessions, serverOpenSessions)` để union trạng thái server (AC6 cross-device). Khi finalize, `settleLocalSession` làm `localOpenSessions=0` NGAY, nhưng server `/tables/status` (`table-status.service.ts`) vẫn đếm phiên là "mở" cho tới khi lệnh **settle** của máy này sync lên server (sessionSyncEngine pass 2) VÀ react-query poll lại (cache `staleTime:0`, interval 30s, pause khi đang chọn bàn). Trong cửa sổ đó `serverOpenSessions=1` → `max(0,1)=1` → `toDisplayStatus` trả `serving` → bàn kẹt "Đang phục vụ". Đúng triệu chứng "phải chờ call `/tables/status`".

**Root cause (PHỤ — đã sửa kèm):** trước đó `pending_sync` được xếp trên `empty` trong `toDisplayStatus`; một đơn vừa finalize còn `pendingSync` khiến bàn hiển thị "Chờ đồng bộ" thay vì "Trống". Vì orders chỉ tạo lúc thanh toán → đơn `pendingSync` LUÔN là đơn đã trả tiền → không nên giữ bàn bận.

**Hệ quả phụ:** `area-tabs.tsx` đếm `freeCount = status === 'empty'` → badge "số bàn trống/tổng" cũng sai cho đến khi `/tables/status` cập nhật.

**Approach:**
1. **Local-authority cho merge session (fix chính):** trong `deriveTableStatus`, local là nguồn chân lý cho bàn mà máy này đã thao tác:
   - `localOpenSessions > 0` → bận (max với server) — giữ nguyên cross-device count.
   - `localSettledSessions > 0` (máy này đã settle, không còn phiên mở) → **bỏ qua** `serverOpenSessions` cũ → `mergedOpenSessions=0` → bàn về trống NGAY (không flicker vì record settled tồn tại lâu).
   - không có session local nào → tin server (`serverOpenSessions`) — giữ nguyên AC6 union cho cross-device discovery.
   Mọi test AC6 hiện tại dùng `sessions: []` nên KHÔNG vỡ.
2. **Gỡ `pending_sync` khỏi display (`TableDisplayStatus`)** giống cách `occupied` đã gỡ; sync báo toàn cục (FR24), không per-table.

## Boundaries & Constraints

**Always:**
- `deriveTableStatus`: chỉ đổi logic merge open-session theo local-authority (thêm đếm `settledSessionsByTable`); `mergedActiveOrders` GIỮ NGUYÊN (`max`).
- `toDisplayStatus` priority mới: `inactive > conflict > serving > empty` (bỏ nhánh `pending_sync`).
- Bàn đang phục vụ thật (localOpenSessions > 0) vẫn `serving` (chặn chọn).
- Giữ AC6 cross-device union cho bàn KHÔNG có session local.

**Never:**
- KHÔNG sửa `TableOccupancyStatus` (hợp đồng BE `/tables/status` giữ `'pending_sync'`).
- KHÔNG sửa BE, sync engine, vòng đời phiên (`settleLocalSession`), cart-store.
- KHÔNG đổi nghĩa `pendingSync`/`activeOrderCount` ở tầng dữ liệu của `deriveTableStatus`.
- KHÔNG đụng vòng đời phiên (`settleLocalSession`), cart-store, BE, sync engine.
- KHÔNG mở rộng sang Epic 7.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output |
|----------|--------------|-----------------|
| **Hoàn tất đơn tại bàn, server còn báo open** | local: settled (open=0), server `openSessionCount=1` | branch settled → `mergedOpenSessions=0` → "Trống" NGAY (không chờ `/tables/status`) |
| Hoàn tất đơn tại bàn (đơn còn pendingSync) | openSessionCount=0, pendingSync=true | `toDisplayStatus → 'empty'` → "Trống" (chọn được) NGAY |
| Bàn đang phục vụ thật | local open=1 (+ server open=1) | `'serving'` (chặn) — branch open |
| Re-open bàn sau khi settle | local: 1 settled + 1 open | `'serving'` (branch open ưu tiên) |
| Cross-device: chỉ server báo open, máy này chưa có session | local: không session, server open=1 | `'occupied'` (AC6 union giữ nguyên) |
| Xung đột phiên | conflict=true (server hoặc local≥2) | `'conflict'` |
| Bàn tạm tắt | isActive=false | `'inactive'` |
| Tab khu vực free-count | bàn vừa thanh toán | đếm là "trống" ngay |

</frozen-after-approval>

## Code Map

- `pos-web/src/features/tables/status-derivation.ts` -- **(fix chính)** `deriveTableStatus`: thêm `settledSessionsByTable`; merge open-session theo local-authority (open / settled / no-local). **(fix phụ)** `toDisplayStatus`: bỏ nhánh `pending_sync`; priority `inactive > conflict > serving > empty`.
- `pos-web/src/features/tables/api.ts` -- bỏ `'pending_sync'` khỏi union `TableDisplayStatus` + cập nhật doc. (`TableOccupancyStatus` BE giữ nguyên.)
- `pos-web/src/features/tables/components/table-card.tsx` -- bỏ entry `pending_sync` trong `STATUS_META`; bỏ import `CloudOff` thừa.
- `pos-web/src/features/tables/components/floor-plan-view.tsx` -- bỏ entry "Chờ đồng bộ" trong `STATUS_LEGEND`; bỏ import `CloudOff` thừa.
- Tests: `status-derivation.test.ts` (3 test merge local-authority + đổi toDisplayStatus pendingSync→empty), `floor-plan-view.test.tsx` (2 test: đơn pendingSync chưa sync → Trống; settled + server-open mock → Trống), `table-card.test.tsx` (bỏ test display 'pending_sync').

## Tasks & Acceptance

**Execution:**
- [x] `status-derivation.ts` `deriveTableStatus` -- thêm đếm settled session + merge local-authority (open/settled/no-local).
- [x] Test (red→green): `status-derivation.test.ts` thêm "local SETTLED wins over stale server open", "local OPEN still occupied", "re-open after settle"; `floor-plan-view.test.tsx` thêm test settled+server-open mock → "Trống".
- [x] `status-derivation.ts` `toDisplayStatus` -- bỏ nhánh `pending_sync`.
- [x] `api.ts` -- bỏ `'pending_sync'` khỏi `TableDisplayStatus`.
- [x] `table-card.tsx` -- bỏ `STATUS_META.pending_sync` + import `CloudOff` thừa.
- [x] `floor-plan-view.tsx` -- bỏ legend "Chờ đồng bộ" + import `CloudOff` thừa.

**Kết quả verify:**
- `npm run typecheck` → 0 errors.
- `npm test -- --run src/features/tables src/routes/pos` → 162 passed / 15 files (thêm 4 test mới).
- Full suite: 467 passed / 1 failed — chỉ `src/App.test.tsx` ("renders admin shell nav") là lỗi PRE-EXISTING (fail cả khi stash toàn bộ thay đổi về baseline `f141444`), không liên quan.

**Acceptance Criteria:**
- Given bàn vừa hoàn tất đơn (máy này đã settle, server `/tables/status` còn báo open), then bàn hiển thị "Trống" và chọn được NGAY — KHÔNG phải đợi `/tables/status` poll lại / refresh.
- Given bàn đang có phiên mở thật trên máy này, then vẫn "Đang phục vụ" (chặn) — không hồi quy.
- Given bàn chỉ server báo open (máy này chưa có session), then vẫn "occupied" — giữ AC6 cross-device.
- Given tab khu vực, then free-count phản ánh bàn vừa thanh toán là "trống" ngay.

## Verification

**Commands:**
- `cd pos-web && npm run typecheck` -- expected: 0 errors (TS sẽ báo nếu còn tham chiếu `'pending_sync'` ở display)
- `cd pos-web && npm test -- --run src/features/tables` -- expected: toàn bộ xanh

**Manual checks:**
- Table-mode: chọn Bàn 7 → thêm món → "Hoàn tất" → đóng receipt → bàn về "Trống" (xanh) ngay, badge khu vực tăng số trống ngay (không cần đợi/refresh).
