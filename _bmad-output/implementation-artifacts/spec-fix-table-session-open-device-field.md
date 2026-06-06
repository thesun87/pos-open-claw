---
title: 'Fix table-session open: gửi deviceId thay vì openedByDevice'
type: 'bugfix'
created: '2026-06-06'
status: 'done'
route: 'one-shot'
---

# Fix table-session open: gửi deviceId thay vì openedByDevice

## Intent

**Problem:** `POST /api/v1/tables/:id/sessions` trả 400 vì FE gửi request body với field `openedByDevice`, trong khi BE `OpenSessionDto` yêu cầu field `deviceId` (ValidationPipe `forbidNonWhitelisted` chặn field lạ + báo thiếu `deviceId`).

**Approach:** Map `openedByDevice` → `deviceId` tại HTTP boundary trong `openTableSession()`, giữ nguyên tên field nội bộ FE `openedByDevice` (khớp response DTO + Dexie record). Thêm typed `OpenSessionRequest` để compiler enforce wire-contract và một test regression-guard. `openedByDevice` vẫn đúng ở phía response (cột DB `opened_by_device`) nên không đụng tới.

## Suggested Review Order

**Wire-contract fix**

- Entry point: typed request body khóa hợp đồng với BE `OpenSessionDto` — `deviceId`, không phải `openedByDevice`.
  [`session-api.ts:35`](../../pos-web/src/features/tables/session-api.ts#L35)

- Boundary mapping: dựng body có kiểu rồi POST; đây là caller duy nhất gửi đơn mở session lên server.
  [`session-api.ts:49`](../../pos-web/src/features/tables/session-api.ts#L49)

**Regression guard (test)**

- Assert body chứa `deviceId` và tuyệt đối không còn `openedByDevice`.
  [`session-api.test.ts:42`](../../pos-web/src/features/tables/session-api.test.ts#L42)
