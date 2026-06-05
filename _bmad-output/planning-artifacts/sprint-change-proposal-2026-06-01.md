---
title: Sprint Change Proposal — Offline Table Management + Cross-Device Table Sessions
id: SCP-2026-06-01-offline-table-sessions
date: '2026-06-01'
author: 'Tuan.nguyen (qua Correct Course workflow)'
status: 'approved — áp dụng 2026-06-04'
trigger: 'Tính năng quản lý bàn (Epic 6) phải chạy được ở chế độ offline; đồng thời phát sinh yêu cầu hiển thị bàn occupied khi mở/on-hold + đồng bộ cross-device + xử lý conflict'
scope_classification: 'Major (chia 2 pha: Phase 1 = Moderate trong Epic 6; Phase 2 = Major, Epic 7 mới)'
related:
  - '_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md (SCP table management gốc)'
  - '_bmad-output/planning-artifacts/epics.md (Epic 6)'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/prd.md (FR44-52, NFR18)'
---

# Sprint Change Proposal — Offline Table Management + Cross-Device Table Sessions

> **SCP-2026-06-01-offline-table-sessions** · Tạo qua workflow Correct Course · Chế độ: Incremental

---

## Section 1 — Tóm tắt Vấn đề (Issue Summary)

### Phát biểu vấn đề

Tính năng quản lý bàn (Table Management, **Epic 6**) hiện được thiết kế **online-only**, mâu thuẫn trực tiếp với nguyên tắc nền tảng **offline-first** của toàn dự án (FR3, FR16, FR22). Cụ thể, ở store `tableMode=true`, POS phụ thuộc 3 endpoint online:

- `GET /api/v1/tables` + `GET /api/v1/areas` — danh sách bàn/khu vực (pull mỗi lần focus, **không cache**)
- `GET /api/v1/tables/status` — trạng thái bàn (**polling 30s** từ server)
- `GET /api/v1/stores/me` — chế độ store

➡️ Khi thu ngân **offline** (tình huống cốt lõi mà toàn dự án thiết kế để hỗ trợ — phiên 7 ngày, NFR17), POS ở store F&B **không render được floor-plan, không chọn được bàn, không thấy trạng thái bàn** → vỡ luồng bán hàng offline-first.

### Phát hiện thứ hai (lộ ra khi phân tích sâu)

Khi đào sâu kịch bản "2 máy bán hàng cùng store", lộ ra một **thiếu sót sản phẩm chưa từng được mô tả**:

> Hiện tại **chưa có khái niệm "đơn đang mở / on-hold"**. Order chỉ được tạo tại lúc **finalize (thanh toán)**; định nghĩa `occupied` (Story 6.4) = *"có order đã finalize trong ngày"*. Nghĩa là **bàn chỉ hiện occupied SAU khi thanh toán** — không phản ánh thực tế F&B (mở bàn → gọi món → giữ tab → thanh toán sau).

Hệ quả: kịch bản mong muốn — *"máy A mở bàn 1, order rồi on-hold, máy B phải thấy bàn 1 occupied ngay nếu online"* — **không chạy được kể cả khi online** với thiết kế hiện tại.

### Bối cảnh phát hiện

- Phát hiện khi review tiến độ Epic 6: Stories **6-1 → 6-7 đã `done`** (thiết kế online-only), **6-8, 6-9 ở `ready-for-dev`**.
- Story 6-7 (`done`) đã build floor-plan với polling `/tables/status` 30s — là điểm vỡ offline lớn nhất.

### Bằng chứng

| Nguồn | Trích dẫn |
|---|---|
| `architecture.md:166` | *"không có version monotonic cho areas/tables… POS pull GET /tables mỗi lần focus tab"* (không cache) |
| `architecture.md:234` | Dexie chỉ mirror **menu + pending orders** (KHÔNG có tables/areas/status) |
| `architecture.md:445` | *"Conflict offline (2 POS cùng chọn bàn 4): MVP chấp nhận — … server log conflict … không lock realtime"* |
| `epics.md:2554` (Epic 6 known limitation) | *"Table status không realtime (polling 30s; 2 POS chọn cùng 1 bàn offline có thể conflict)"* |
| Story 6.4 AC (`epics.md:2305-2311`) | `occupied` = *"có ≥1 synced order trong ngày"* → chỉ sau thanh toán |

---

## Section 2 — Phân tích Tác động (Impact Analysis)

### 2.1 Tác động Epic

| Epic | Tác động |
|---|---|
| **Epic 6 (Table Management)** | ⚠️ **Modify scope + thêm story.** Không hoàn thành như kế hoạch ở mức offline. Bổ sung tầng cache offline + table-session occupancy. |
| Epic 2 (Orders/Sync/Dexie) | ✅ **Nền tảng tận dụng được** — `db.orders` đã offline ⇒ derive status cục bộ được; sync engine idempotent tái dùng cho session sync. Không phá Epic 2. |
| Epic 1, 3, 4 | ✅ Không ảnh hưởng. |
| **🆕 Epic 7 (Shared Table Sessions)** | Tạo mới cho Phase 2 (tab chia sẻ đầy đủ + merge). |

### 2.2 Tác động Story (Epic 6)

| Story | Status hiện tại | Tác động |
|---|---|---|
| 6-1 BE schema | done | ✅ Giữ (schema areas/tables/orders đã đủ; **bổ sung** bảng `table_sessions` qua story mới 6-11) |
| 6-2 / 6-3 CRUD | done | ✅ Không đổi (admin operations online-only là chấp nhận được) |
| 6-4 BE `/tables/status`, `/stores/me` | done | 🔵 **Giữ + nâng cấp**: `/tables/status` thêm derive từ open session + cờ conflict; chuyển vai trò thành *"online enhancement"*, không còn là nguồn bắt buộc offline |
| 6-5 / 6-6 FE admin | done | ✅ N/A offline (admin dùng TanStack Query online; `tableMode` đã cache vào session store) |
| **6-7 FE floor-plan** | **done** | 🔴 **Cần brownfield rework** (story mới 6-12): đọc tables/areas/storeConfig từ Dexie; status derive cục bộ; polling 30s → chỉ online enhancement; badge conflict |
| **6-8 FE table-first** | ready-for-dev | 🟠 **Sửa AC**: mở bàn → tạo table-session (occupancy); online "allow + warn"; offline queue session sync; finalize settle session. KHÔNG share item (để Phase 2) |
| 6-9 quick-counter | ready-for-dev | 🟢 Ảnh hưởng nhỏ (re-use counter Epic 2 vốn offline; `tableId=null`, không tạo session) |

### 2.3 Mâu thuẫn Artifact

| Artifact | Cần sửa | Mức |
|---|---|---|
| **Architecture** | Đảo quyết định "không cache" (`:166`); mở rộng Dexie (`:234`); nâng cấp conflict policy (`:445`); thêm model `table_sessions` + endpoint lifecycle | 🔴 Lớn |
| **PRD** | Thêm FR (held/open session, cross-device occupancy, offline occupancy, conflict keep-both); sửa FR50; thêm NFR offline table mgmt; đánh dấu FR shared-tab là Phase 2 | 🔴 Lớn |
| **UX Spec** | Phase 1: offline indicator floor-plan, badge conflict, cảnh báo concurrent-open. Phase 2 (defer): TableSessionView, MergeSessionDialog | 🟠 Trung bình |
| **Epics** | Thêm story 6-10, 6-11, 6-12; sửa 6-8; cập nhật Epic 6 known limitations; tạo outline Epic 7 | 🔴 Lớn |
| Testing | e2e cross-device offline → sync occupancy; (Phase 2: merge) | 🟠 |

### 2.4 Tác động kỹ thuật & effort

- **Phase 1 (Epic 6):** ~**35-50h** (Dexie cache + local status derivation ~10-14h; BE table_sessions occupancy + sync + status nâng cấp ~12-16h; rework 6-7 ~8-10h; sửa 6-8 ~5-8h; test ~5h). Risk: **Medium**.
- **Phase 2 (Epic 7):** ~**90-120h** (shared item-event sync, merge UI, offline reconcile, e2e multi-device). Risk: **Medium-High**. **Defer** — plan riêng.

---

## Section 3 — Đường đi Đề xuất (Recommended Approach)

### Quyết định: **Hybrid / Chia pha** (Direct Adjustment cho Phase 1 + Epic mới cho Phase 2)

**Lý do chọn (so với 2 phương án còn lại):**

| Phương án | Đánh giá |
|---|---|
| Full ngay trong Epic 6 | ❌ Epic 6 phình gần gấp đôi, trễ giao hàng, dồn rủi ro sync 2 chiều vào 1 epic lớn |
| Tách Epic 7 toàn bộ ngay | ⚠️ Tốt về ranh giới nhưng Epic 6 vẫn vỡ offline nếu không làm Phase 1 trước |
| **Chia pha (chọn)** | ✅ Giao giá trị offline sớm (Phase 1 đủ dùng); cô lập phần phức tạp (shared tab + merge) vào Epic 7 được plan kỹ; giảm rủi ro |

### Tổ hợp quyết định sản phẩm đã chốt (qua Correct Course)

| Quyết định | Lựa chọn | Pha áp dụng |
|---|---|---|
| Phạm vi tab | Tab chia sẻ đầy đủ (B xem + thêm item) | **Phase 2** (Phase 1 chỉ occupancy) |
| Online double-open | Cho phép + cảnh báo (không khóa) | Phase 1 (occupancy warn) + Phase 2 (concurrent-edit warn) |
| Offline conflict | Giữ cả 2 phiên + cờ ⚠️, người xử lý tay | Phase 1 (badge) + Phase 2 (merge UI) |

### Mô hình kỹ thuật (đơn giản nhất — không cần CRDT)

```
table_sessions  (tab đang mở — mutable lifecycle nhẹ)
  id(UUIDv7) · tableId · storeId · tenantId · openedByDevice
  status: open → settled → (voided | superseded)
  openedAt · clientSessionId(UUIDv7 idempotency) · updatedAt
        │ (Phase 2)
        │ N
table_session_items  (APPEND-ONLY EVENTS — Phase 2)
  id(UUIDv7) · sessionId · clientItemId(UUIDv7) · addedByDevice · addedAt
  productId · *Snapshot · quantity · options · note
  status: active | removed   ← "xóa" = tombstone, không hard-delete
```

- **Occupancy** = *có table_session `open`* HOẶC *có order finalize trong ngày*. Order bất biến (RULE 4) **vẫn nguyên** — chỉ materialize tại settle từ snapshot item `active`.
- **Online "B thấy ngay":** session sync khi mở bàn → B poll/`GET /tables/status` thấy occupied; mở bàn đang occupied → cảnh báo mềm "máy khác đang phục vụ bàn này".
- **Offline:** thao tác mở bàn = event xếp hàng Dexie, sync idempotent theo `clientSessionId`. Floor-plan derive occupancy từ session/order **local** qua `useLiveQuery`.
- **Reconcile (chỉ 2 trường hợp):**
  1. *Cùng session, nhiều item-event* (Phase 2) → **union theo `clientItemId`** (ADD tự do conflict; remove = tombstone).
  2. *2 session khác nhau cùng bàn* (offline 2 máy mở mới) → **giữ cả 2 + cờ** → màn gộp tay (Phase 2) / badge cảnh báo (Phase 1).

---

## Section 4 — Đề xuất Chỉnh sửa Chi tiết (Detailed Change Proposals)

### A. PRD (`prd.md`)

**A1 — Sửa FR50** (status gồm open session)

```
OLD (FR50):
- FR50: Floor-plan view là entry point mặc định khi tableMode=true; lưới bàn theo
  khu vực, hiển thị status (trống/đang order/chờ sync).

NEW (FR50):
- FR50: Floor-plan view là entry point mặc định khi tableMode=true; lưới bàn theo
  khu vực, hiển thị status (trống / đang phục vụ (có phiên bàn mở HOẶC order trong
  ngày) / chờ sync / ⚠️ xung đột phiên). Floor-plan và trạng thái bàn hoạt động cả
  khi offline (derive cục bộ từ dữ liệu IndexedDB).
```

**A2 — Thêm FR mới (Phase 1)**

```
NEW:
- FR53: Khi tableMode=true, thu ngân "mở bàn" tạo một phiên bàn (table session)
  đánh dấu bàn occupied NGAY khi mở — trước khi thanh toán (hỗ trợ giữ tab/on-hold).
- FR54: Phiên bàn đồng bộ cross-device: khi online, POS khác thấy bàn occupied
  trong vòng ≤1 chu kỳ polling; mở bàn đang có phiên → cảnh báo "máy khác đang phục
  vụ" (không khóa cứng).
- FR55: Floor-plan, chọn bàn, mở/giữ phiên bàn và hoàn tất đơn kèm bàn hoạt động
  đầy đủ khi OFFLINE; trạng thái bàn derive cục bộ từ IndexedDB.
- FR56: Khi 2 thiết bị offline cùng mở 1 bàn, hệ thống GIỮ CẢ HAI phiên (không mất
  đơn), đánh dấu cờ xung đột trên bàn; thu ngân xử lý thủ công.
```

**A3 — Thêm NFR mới**

```
NEW:
- NFR19: Mọi thao tác quản lý bàn phía POS (xem floor-plan, chọn bàn, mở phiên,
  hoàn tất đơn kèm bàn) PHẢI hoạt động khi offline với độ trễ tương đương online
  (parity FR3/FR16) — không phụ thuộc kết nối server.
```

**A4 — Đánh dấu Phase 2 (deferred) trong mục Out-of-scope / Sau-MVP**

```
NEW (Sau-MVP / Phase 2 — Epic 7 "Shared Table Sessions"):
- Tab chia sẻ đầy đủ cross-device (POS khác mở được tab đang mở, xem + thêm item
  vào cùng đơn).
- Màn gộp/đối soát phiên bàn (merge session) khi có xung đột.
- Đồng bộ item-event 2 chiều (append-only + tombstone, union semantics).
```

### B. Architecture (`architecture.md`)

**B1 — Sửa "Lưu ý table config" (`:166`)**

```
OLD:
Lưu ý table config: không có version monotonic cho areas/tables (đơn giản hóa MVP
— floor-plan đổi không thường xuyên). POS pull GET /tables mỗi lần focus tab; có
thể nâng cấp tableConfigVersion sau nếu cần.

NEW:
Lưu ý table config (cập nhật SCP-2026-06-01 — offline-first): areas/tables/store
config được CACHE vào IndexedDB (Dexie) để POS hoạt động offline. FE pull GET
/areas + GET /tables + GET /stores/me khi login và khi online trở lại, ghi vào
db.areas / db.tables / db.storeConfig; floor-plan đọc từ cache (online refresh nền).
Chưa cần version monotonic (config đổi không thường xuyên); có thể nâng cấp
tableConfigVersion sau. Bổ sung bảng table_sessions cho occupancy cross-device.
```

**B2 — Mở rộng Dexie mirror (`:234`)**

```
OLD:
- Dexie schema mirror Prisma schema cho menu cache + pending orders, không khớp
  100% (chỉ field cần offline)

NEW:
- Dexie schema mirror Prisma schema cho menu cache + pending orders + table config
  (areas, tables, storeConfig) + table sessions (occupancy), không khớp 100% (chỉ
  field cần offline). Floor-plan status derive cục bộ từ db.orders + db.tableSessions
  qua useLiveQuery; /tables/status chỉ là online enhancement để hợp nhất occupancy
  cross-device.
```

**B3 — Nâng cấp conflict policy (`:445`)**

```
OLD:
- Conflict offline (2 POS cùng chọn bàn 4): MVP chấp nhận — cả 2 sync thành công,
  server log conflict qua table_id trùng với synced_at gần nhau, không lock realtime.

NEW:
- Conflict offline (2 POS cùng mở bàn 4): GIỮ CẢ HAI phiên (idempotent theo
  clientSessionId, không mất đơn). Server phát hiện ≥2 phiên open cùng table_id →
  set cờ conflict trong /tables/status; floor-plan hiện badge ⚠️. Phase 1: thu ngân
  xử lý thủ công. Phase 2 (Epic 7): màn gộp phiên (merge) hợp nhất item-event theo
  clientItemId. Không lock cứng (online "allow + warn", không chặn).
```

**B4 — Thêm model + endpoint (mục Data Model & Endpoint cheat-sheet)**

```
NEW (Data model):
- table_sessions (phiên bàn occupancy — Phase 1): id, tenant_id, store_id, table_id
  FK, opened_by_device, status (open|settled|voided|superseded), opened_at,
  client_session_id (UUIDv7, idempotency), created_at, updated_at; index (table_id,
  status); unique (tenant_id, store_id, client_session_id).
- table_session_items (Phase 2 — append-only event): id, session_id FK, client_item_id,
  added_by_device, added_at, product_id, *_snapshot, quantity, options, note,
  status (active|removed).

NEW (Endpoints — Phase 1):
| POST   /api/v1/tables/:id/sessions       | mở phiên bàn (occupancy); idempotent client_session_id |
| GET    /api/v1/tables/sessions?status=open | list phiên đang mở của store (cross-device) |
| POST   /api/v1/tables/sessions/:id/settle | đóng phiên khi finalize order |
| (nâng cấp) GET /api/v1/tables/status      | occupied = open session OR order today; thêm openSessionCount + conflict |
```

### C. UX Spec (`ux-design-specification.md`)

**Phase 1 (thêm):**
- Floor-plan: chỉ báo **offline** (re-use connectivity indicator); badge **⚠️ "Xung đột phiên"** trên TableCard khi `openSessionCount > 1`.
- Mở bàn đang occupied (online): toast/dialog cảnh báo mềm *"Bàn X đang được máy khác phục vụ (mở lúc HH:mm). Vẫn tiếp tục?"* — không chặn.
- Status badge bổ sung trạng thái **"đang phục vụ"** (phiên mở, chưa thanh toán) phân biệt với "đã có đơn trong ngày".

**Phase 2 (defer — Epic 7):** `TableSessionView` (tab đang mở, item theo device), `MergeSessionDialog` (gộp 2 phiên), cảnh báo concurrent-edit.

### D. Epics (`epics.md`)

**D1 — Story mới (Phase 1, Epic 6):**

```
Story 6.10: FE — Offline cache table config + local status derivation
  - Dexie stores: db.areas, db.tables, db.storeConfig (mirror, field offline).
  - Populate khi login + online-resume (pull /areas, /tables, /stores/me).
  - Floor-plan đọc cache; status derive cục bộ từ db.orders + db.tableSessions
    qua useLiveQuery; online merge /tables/status.
  - AC offline: ngắt mạng → floor-plan + status vẫn render từ cache.
  Deps: 6-4. Est: 10-14h.

Story 6.11: BE — Table Session lifecycle (occupancy) + sync + status nâng cấp
  - Migration table_sessions; endpoints open/list-open/settle; idempotent
    client_session_id.
  - /tables/status: occupied = open session OR order today; thêm
    openSessionCount + conflict flag (≥2 open session cùng table).
  - AC conflict: 2 session open cùng table → conflict=true; KHÔNG xóa session nào.
  Deps: 6-1, 6-4. Est: 12-16h.

Story 6.12: FE — Floor-plan offline rework (brownfield patch Story 6-7)
  - Floor-plan đọc tables/areas/storeConfig từ Dexie; status từ local derivation;
    polling 30s = online enhancement (pause khi offline, không lỗi).
  - Badge ⚠️ conflict; chỉ báo offline.
  Deps: 6-10, 6-11. Est: 8-10h.
```

**D2 — Sửa Story 6-8 (thêm AC):**

```
ADD AC (Story 6.8):
- Given tableMode=true, click TableCard empty
  When mở bàn
  Then tạo table_session (status open) — local (Dexie) khi offline, sync khi online;
       bàn chuyển "đang phục vụ" NGAY (occupancy trước thanh toán).
- Given mở bàn đang có phiên open của device khác (online)
  When click
  Then cảnh báo mềm "máy khác đang phục vụ bàn này" (allow + warn, không chặn).
- Given finalize order
  When settle
  Then đóng table_session (settled) + materialize order bất biến như cũ.
- Given offline
  When mở bàn / finalize
  Then mọi thao tác hoạt động offline; session/order xếp hàng sync.
  GHI CHÚ: KHÔNG share item cross-device ở Phase 1 (để Phase 2 / Epic 7).
```

**D3 — Cập nhật Epic 6 known limitations:**

```
OLD:
- Table status không realtime (polling 30s; 2 POS chọn cùng 1 bàn offline có thể
  conflict — sync engine vẫn idempotent, log conflict)

NEW:
- Phase 1: table occupancy cross-device khi online (≤1 chu kỳ polling); offline
  derive cục bộ. 2 POS offline cùng mở 1 bàn → giữ cả 2 phiên + badge ⚠️ xung đột,
  xử lý thủ công.
- Defer Phase 2 (Epic 7 "Shared Table Sessions"): tab chia sẻ đầy đủ (xem/thêm item
  cross-device) + màn gộp phiên + item-event sync 2 chiều.
```

**D4 — Outline Epic 7 (Phase 2 — cần plan chi tiết riêng):**

```
Epic 7: Shared Table Sessions (Phase 2 — fast-follow)
  - 7.1 BE: table_session_items append-only + tombstone; endpoints add/remove item;
    sync union semantics.
  - 7.2 FE: TableSessionView (tab đang mở, item theo device); join-tab + offline
    event-sync engine.
  - 7.3 FE: concurrent-edit warning (online).
  - 7.4 FE+BE: MergeSessionDialog (gộp 2 phiên conflict) + reconcile logic.
  - 7.5 Test: e2e multi-device offline → sync → merge.
  (Chi tiết hóa qua bmad-create-epics-and-stories sau khi SCP approved.)
```

### E. Sprint Status (`implementation-artifacts/sprint-status.yaml`)

```
THÊM (backlog):
  6-10-fe-offline-cache-table-config-local-status: backlog
  6-11-be-table-session-lifecycle-occupancy-sync: backlog
  6-12-fe-floor-plan-offline-rework: backlog
SỬA:
  6-8-...: ready-for-dev → (giữ; cập nhật nội dung story theo D2)
THÊM Epic 7 (backlog — chờ plan chi tiết):
  epic-7: backlog
  7-1..7-5: backlog
```

---

## Section 5 — Bàn giao Triển khai (Implementation Handoff)

### Phân loại scope: **Major** (chia pha)

- **Phase 1 → Moderate:** backlog reorg trong Epic 6 (3 story mới + sửa 6-8 + rework 6-7). Cần **Architect** ký duyệt 2 thay đổi quyết định (cache Dexie cho table config + model `table_sessions`), sau đó **PO/DEV** triển khai.
- **Phase 2 → Major:** Epic 7 mới — cần **PM/Architect** plan đầy đủ (shared tab + merge + sync 2 chiều) qua `bmad-create-epics-and-stories` trước khi dev.

### Người nhận & trách nhiệm

| Vai trò | Trách nhiệm |
|---|---|
| **Architect (Winston)** | Duyệt B1-B4 (đảo quyết định cache + model table_sessions + endpoint). Cổng chặn Phase 1 dev. |
| **PM (John)** | Duyệt A1-A4 (FR53-56, NFR19); plan Epic 7 (Phase 2). |
| **PO / DEV (Amelia)** | Triển khai Phase 1: Story 6-10 → 6-11 → 6-12 → sửa 6-8. Cập nhật sprint-status. |
| **UX (Sally)** | Bổ sung Phase 1 UX (offline indicator, badge conflict, warn dialog); defer Phase 2 screens. |

### Trình tự (Phase 1)

```
6-11 (BE session + status) ──┐
6-10 (FE Dexie cache)     ───┼──► 6-12 (FE floor-plan rework) ──► 6-8 (table-first + session)
                              │                                      │
6-1, 6-4 (đã done) ──────────┘                                      └──► 6-9 (quick-counter, ~không đổi)
```

### Tiêu chí thành công (Phase 1)

- Ngắt mạng → POS store `tableMode=true` vẫn render floor-plan, chọn bàn, mở phiên, finalize đơn kèm bàn, in receipt.
- Online: máy A mở bàn 1 → máy B thấy bàn 1 occupied trong ≤1 chu kỳ polling; mở lại bàn 1 → cảnh báo mềm.
- 2 máy offline cùng mở bàn 1 → sau sync: cả 2 phiên còn nguyên + badge ⚠️.
- Store `tableMode=false` KHÔNG đổi gì (regression Epic 2 pass).

---

## Trạng thái phê duyệt

- [x] Section 1-5 reviewed
- [x] Architect duyệt thay đổi Architecture (B1-B4)
- [x] PM duyệt thay đổi PRD (A1-A4) + cam kết plan Epic 7
- [x] **Phê duyệt cuối → triển khai Phase 1**

> **Đã phê duyệt 2026-06-04.** Section 4 (A-E) đã được áp dụng vào artifact:
> PRD (A1-A4), Architecture (B1-B4), UX Spec (C), Epics (D1-D4), Sprint Status (E).
