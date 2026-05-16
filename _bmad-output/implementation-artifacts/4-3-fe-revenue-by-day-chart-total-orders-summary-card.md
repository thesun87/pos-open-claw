# Story 4.3: FE — Revenue by Day Chart + Total Orders Summary Card

Status: done

## Story

As an admin,
I want xem biểu đồ doanh thu theo từng ngày trong khoảng đã chọn và card tổng số đơn + tổng doanh thu,
So that tôi nhanh chóng hiểu xu hướng doanh thu và scale của business trong khoảng đó.

## Acceptance Criteria

1. Given Story 4.2 layout có section "Doanh thu theo ngày" và "Tổng đơn"; When developer triển khai trong `routes/admin/reports/sections/`; Then TanStack Query fetch `GET /api/v1/reports?from=&to=&metric=all` bằng single call cho cả 4 metrics; And parse response → distribute data cho từng section component.
2. Given chart "Doanh thu theo ngày"; When render; Then dùng `recharts` làm thư viện biểu đồ đã chốt cho MVP; And line chart với x-axis = date `dd/MM` (date-fns format), y-axis = revenue VND dạng compact như `100K`; And tooltip hover hiển thị `dd/MM/yyyy`: revenue đầy đủ `100.000 ₫` + orderCount `5 đơn`; And color line dùng `--color-primary`; And ngày không có đơn vẫn render điểm 0 trên trục.
3. Given card "Tổng đơn" và "Tổng doanh thu"; When render; Then hiển thị 2 stat cards lớn: "Tổng số đơn" với `totalOrders` formatted `1.234`, "Tổng doanh thu" với `formatVnd(totalRevenue)`; And value dùng font lớn 28–36px bold theo UX-DR2 total style; And dưới mỗi card có sub-text `Trong khoảng {from} - {to}` format `dd/MM/yyyy`.
4. Given range chỉ 1 ngày (`from=to`); When chart render; Then chart vẫn hợp lý bằng single data point rõ ràng hoặc fallback bar chart 1 cột; And card stats vẫn hiển thị đúng.
5. Given user thay đổi date range; When TanStack Query refetch; Then chart re-render với data mới; And skeleton chỉ hiển thị nếu first load; And trong background refetch, giữ last data kèm indicator `Đang cập nhật` thay vì trống hoặc stale không báo hiệu.
6. Given accessibility; When screen reader truy cập; Then chart wrapper có `role="img"` + `aria-label` mô tả ngắn như `Biểu đồ doanh thu 7 ngày từ 01/05 đến 07/05`; And dữ liệu chart available qua data table fallback hoặc toggle "Xem dạng bảng".

## Dev Notes

### Phạm vi triển khai

- Story này CHỈ thay placeholder của hai section đầu trong `ReportsPage`:
  - `Doanh thu theo ngày`
  - `Tổng đơn`
- KHÔNG triển khai Payment Method chart hoặc Top Products table; để nguyên placeholder Story 4.4 cho hai section sau.
- KHÔNG đổi backend contract; Story 4.1 đã hoàn thành endpoint `/api/v1/reports` và Story 4.2 đang fetch `metric=all` sẵn.
- Cần cài thêm dependency `recharts` trong `pos-web/package.json`/`package-lock.json` nếu chưa có. Hiện `pos-web/package.json` chưa có `recharts`.

### Existing Code Intelligence — phải đọc trước khi sửa

- `pos-web/src/routes/admin/reports/reports-page.tsx`
  - Hiện parse URL `from/to`, canonicalize missing/invalid/reversed params, validate future/range >90 ngày, query bằng `useQuery({ queryKey: reportsQueryKey(from, to), queryFn: () => fetchReportsAll({ from, to }) })`.
  - `isLoading = query.isLoading && validRange`; empty logic dùng `isEmptyResponse(data)` cho toàn bộ 4 metrics.
  - Hai section đầu đang render `<p data-testid="placeholder-section-1|2">Sẽ cập nhật ở Story 4.3</p>`.
  - Preserve: DateRangeReportFilter vẫn enabled khi loading; 4xx validation là inline error; 5xx/network render ErrorState toàn page; empty response render EmptyState trong từng SectionCard.
- `pos-web/src/features/admin/reports/api.ts`
  - Đã có types: `RevenueByDayRow`, `TotalsResult`, `ReportsAllResponse`.
  - `fetchReportsAll` đã gọi `/reports` với `{ from, to, metric: 'all' }`; không tạo thêm call riêng cho Story 4.3.
- `pos-web/src/routes/admin/reports/_shared/section-card.tsx`
  - Wrapper card với title, loading skeleton, empty state. Có thể dùng children để inject section component.
  - Nếu cần indicator `Đang cập nhật`, truyền từ `ReportsPage` vào children; không cần thay đổi API của `SectionCard` trừ khi thật sự cần.
- `pos-web/src/shared/lib/format-vnd.ts`
  - Dùng cho full VND display (`100.000 ₫`). Tạo helper compact riêng trong report section nếu cần, nhưng không đổi behavior global `formatVnd`.
- `pos-web/src/shared/lib/date.ts`
  - Dùng các helper hiện có để tránh lặp bug timezone. Không dùng `toISOString()` để display ngày báo cáo.

### Component/file structure đề xuất

Theo architecture, code route-specific đặt trong `routes/admin/reports/`, còn API ở `features/admin/reports/`.

Tạo mới:

```text
pos-web/src/routes/admin/reports/sections/revenue-by-day-chart.tsx
pos-web/src/routes/admin/reports/sections/revenue-by-day-chart.test.tsx
pos-web/src/routes/admin/reports/sections/total-orders-summary.tsx
pos-web/src/routes/admin/reports/sections/total-orders-summary.test.tsx
```

Sửa:

```text
pos-web/src/routes/admin/reports/reports-page.tsx
pos-web/src/routes/admin/reports/reports-page.test.tsx
pos-web/package.json
pos-web/package-lock.json
```

Tên component: `RevenueByDayChart`, `TotalOrdersSummary`. File React phải kebab-case.

### Data contract từ BE Story 4.1

Single response `metric=all`:

```ts
type ReportsAllResponse = {
  revenueByDay: Array<{ date: string; revenue: number; orderCount: number }>
  totals: { totalOrders: number; totalRevenue: number }
  revenueByPaymentMethod: Array<{ paymentMethod: 'cash' | 'transfer' | 'card'; revenue: number; orderCount: number }>
  topProducts: Array<{ productName: string; totalQuantity: number; totalRevenue: number }>
}
```

Important:

- `revenueByDay` đã bao gồm ngày trống với `revenue=0`, `orderCount=0`; không tự fill lại nếu BE trả đủ, nhưng component nên render robust nếu array rỗng.
- Date string là `YYYY-MM-DD` theo timezone `Asia/Ho_Chi_Minh`.
- VND là integer đồng, không float.
- BE đã loại trừ voided orders; FE không filter void.

### UI/UX requirements

- Chart:
  - Dùng `recharts` (`LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`; `BarChart` optional cho single-day fallback).
  - Line/stroke color: CSS variable coffee brown, ví dụ `stroke="var(--color-primary)"`; dot/activeDot cùng primary/accent.
  - X-axis label: parse `YYYY-MM-DD` → display `dd/MM`.
  - Tooltip title: `dd/MM/yyyy`; revenue dùng `formatVnd`; orderCount copy dạng `{n} đơn`.
  - Y-axis compact VND: implement helper như `formatCompactVndAxis(100000) => '100K'`, `1500000 => '1,5M'` hoặc tương đương locale vi; không dùng full currency trên axis gây chật.
  - Container responsive; minimum height khoảng `h-64` trên desktop, `h-56` mobile/tablet.
- Total summary:
  - Trong section "Tổng đơn", render 2 stat cards bên trong: "Tổng số đơn" và "Tổng doanh thu".
  - Number format cho totalOrders: `new Intl.NumberFormat('vi-VN').format(totalOrders)`.
  - TotalRevenue: `formatVnd(totalRevenue)`.
  - Subtext: `Trong khoảng dd/MM/yyyy - dd/MM/yyyy`.
  - Value style: `text-3xl font-bold` hoặc tương đương 28–36px, màu `text-text-primary`; label/subtext `text-text-secondary`.
- Background refetch:
  - TanStack Query có `query.isFetching`. Trong `ReportsPage`, nếu `query.isFetching && !query.isLoading`, giữ data đang có và hiển thị text nhỏ `Đang cập nhật` gần chart/summary hoặc ngay trên grid.
  - Không đổi `isLoading` thành `isFetching`, vì AC yêu cầu skeleton chỉ first load.
- Accessibility:
  - Chart visual wrapper có `role="img"` và `aria-label` mô tả range + số ngày.
  - Cung cấp data table fallback luôn visible dưới chart ở dạng compact/collapsible, hoặc một button accessible `Xem dạng bảng` toggle table. MVP optional toggle được chấp nhận, nhưng phải có dữ liệu table accessible trong DOM khi bật.
  - Tooltip hover không phải nguồn thông tin duy nhất; table fallback là nguồn text.

### Architecture Compliance

- Frontend stack: React 18, Vite 7, TypeScript, TanStack Query v5, Tailwind tokens, date-fns, Vitest/Testing Library.
- Không đổi route structure hoặc query key contract: `reportsQueryKey(from, to)` vẫn là `['reports', from, to]`.
- Không lưu token vào `localStorage/sessionStorage`; story này không cần đụng auth.
- Không expose raw backend error; giữ ErrorState/Error handling từ Story 4.2.
- Không dùng `dangerouslySetInnerHTML`.
- Không dùng float cho tiền; mọi value tiền là integer VND từ API.
- API response field camelCase; không transform snake_case.

### Previous Story Intelligence (Story 4.2)

- Story 4.2 đã hoàn thành và commit gần nhất: `150dbfd feat: complete story 4-2 reports page foundation`.
- Những pattern đã hoạt động:
  - `DateRangeReportFilter` auto-apply via URL search params.
  - `ReportsPage` query disabled khi filter validation lỗi.
  - Test async không dùng fake timers; fake timers chỉ dùng trong sync date-dependent tests và phải `vi.useRealTimers()` sau test.
  - Axios mock cần dùng shape đúng nếu test retry/error (`isAxiosError` dựa vào duck-typing hoặc `AxiosError`).
- Review findings đã fix trong 4.2: reversed URL range canonicalization; retry 4xx disabled; default 5xx/network retry preserved.
- Deferred notes cần tránh làm nặng thêm:
  - Không dùng `toISOString()` cho VN date display.
  - Nếu cast error body, không show raw details ngoài inline validation đã có.

### Testing Requirements

Thêm/cập nhật Vitest + Testing Library tests tối thiểu:

1. `RevenueByDayChart` render:
   - line/chart container có `role="img"` và aria-label đúng range.
   - x-axis/data labels hoặc table fallback hiển thị ngày `dd/MM`/`dd/MM/yyyy`.
   - tooltip formatter/helper test được revenue full `formatVnd` và order count copy `5 đơn` (có thể test helper nếu Recharts tooltip khó trigger trong jsdom).
   - ngày zero revenue vẫn xuất hiện trong table fallback.
   - single-day range render không crash và vẫn hiển thị ngày/value.
2. `TotalOrdersSummary` render:
   - `totalOrders=1234` → `1.234`.
   - `totalRevenue=100000` → `100.000 ₫`.
   - subtext range `Trong khoảng 01/05/2026 - 07/05/2026`.
3. `ReportsPage` integration:
   - success response thay placeholder Story 4.3 bằng chart + summary; placeholders Story 4.4 vẫn còn.
   - fetch vẫn là single call `/reports` `metric: 'all'`.
   - background refetch indicator `Đang cập nhật` hiển thị khi `isFetching && !isLoading` (nếu test ổn định; nếu khó, test ở component level/skip explicit integration với note).
   - empty state vẫn hoạt động cho all-zero response.
4. Existing Story 4.2 tests must remain passing.

Gates trước khi mark complete:

```bash
cd pos-web
npm run typecheck
npm run lint
npm run test
npm run build
```

Ghi rõ pre-existing lint warnings nếu có; không claim lint sạch nếu còn warning.

## Tasks / Subtasks

- [x] Cài `recharts` trong `pos-web` và commit lockfile update.
- [x] Tạo `RevenueByDayChart` trong `routes/admin/reports/sections/` với responsive chart, tooltip formatting, compact Y-axis formatter, accessible fallback table/toggle.
- [x] Tạo `TotalOrdersSummary` trong `routes/admin/reports/sections/` với 2 stat cards, format number/VND và range subtext.
- [x] Sửa `ReportsPage` để truyền `query.data?.revenueByDay`, `query.data?.totals`, `from`, `to`, và trạng thái background updating vào hai section đầu; giữ skeleton/empty/error behavior hiện tại.
- [x] Giữ nguyên placeholders Story 4.4 cho Payment Method và Top Products.
- [x] Thêm/cập nhật tests theo Testing Requirements.
- [x] Chạy gates: typecheck, lint, test, build.

## Project Context Reference

- Source of truth: `_bmad-output/project-context.md` và `_bmad-output/planning-artifacts/architecture.md`.
- UX source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Reports loading/empty states, typography, accessibility.
- Story dependencies:
  - Story 4.1 BE reports endpoint: done.
  - Story 4.2 FE reports layout/filter: done.
  - Story 4.4 must remain unimplemented except placeholders.

## Dev Agent Record

### Agent Model Used

vllm/cx/gpt-5.5

### Debug Log References

- 2026-05-16: Implemented Story 4.3 sections using Recharts and existing reports API single-call pattern.
- Gates: `npm run typecheck` passed.
- Gates: `npm run lint` passed with 4 pre-existing warnings in menu/admin table files; no Story 4.3 lint errors.
- Gates: `npm run test` passed (41 files, 216 tests), with pre-existing React act warnings from SyncRetryPanel/Radix tests.
- Gates: `npm run build` passed, with Vite chunk-size warning for existing large bundles/reports chunk.

### Completion Notes List

- Story file created by BMad create-story workflow.
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added `recharts` and implemented `RevenueByDayChart` with responsive LineChart, primary-color line, compact VND y-axis, formatted tooltip, background-update indicator, and accessible table toggle including zero-revenue days.
- Added `TotalOrdersSummary` with total order and total revenue stat cards, Vietnamese number/VND formatting, and selected range subtext.
- Wired ReportsPage to continue using the existing single `metric=all` TanStack Query response and distribute `revenueByDay`/`totals` into the two Story 4.3 sections while preserving Story 4.4 placeholders and existing loading/empty/error behavior.
- Added/updated Vitest + Testing Library coverage for chart accessibility/helpers/table/single-day/update state, summary formatting, and ReportsPage integration/single-call behavior.
- Gates passed: typecheck; lint with 4 pre-existing warnings in admin menu/shared table files; test (41 files / 216 tests passed, with pre-existing console warnings plus Recharts jsdom size warnings); build passed with Vite chunk-size warning.

### File List

- `_bmad-output/implementation-artifacts/4-3-fe-revenue-by-day-chart-total-orders-summary-card.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `pos-web/package.json`
- `pos-web/package-lock.json`
- `pos-web/src/routes/admin/reports/reports-page.tsx`
- `pos-web/src/routes/admin/reports/reports-page.test.tsx`
- `pos-web/src/routes/admin/reports/sections/revenue-by-day-chart.tsx`
- `pos-web/src/routes/admin/reports/sections/revenue-by-day-chart.utils.ts`
- `pos-web/src/routes/admin/reports/sections/revenue-by-day-chart.test.tsx`
- `pos-web/src/routes/admin/reports/sections/total-orders-summary.tsx`
- `pos-web/src/routes/admin/reports/sections/total-orders-summary.test.tsx`

## Change Log

| Date | Description |
|---|---|
| 2026-05-16 | Story 4.3 file created via bmad-create-story workflow (Status: ready-for-dev). Context assembled from Epic 4 Story 4.3, completed Story 4.2 implementation, Story 4.1 API contract, architecture/project-context/UX constraints, and current code inspection. |
| 2026-05-16 | Implemented Story 4.3 revenue-by-day chart and total-orders/total-revenue summary, added tests, ran gates, and moved status to review. |
