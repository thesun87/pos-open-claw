# Deferred Work

## Deferred from: code review of 4-1-be-reports-endpoint-voi-4-metric-aggregations-tz-asia-ho-chi-minh-void-exclusion.md (2026-05-16)

- Default `todayYmd`/`thirtyDaysAgoYmd` in `reports.service.ts:86-88` use `toISOString()` (UTC) instead of local Vietnam time. Only affects the default 30-day range when `from`/`to` query params are not provided. Low real-world impact since servers typically run in UTC and users are expected to provide explicit dates in production. Fix: derive local Vietnam date using `Intl.DateTimeFormat` with `Asia/Ho_Chi_Minh` timezone when computing defaults.

## Deferred from: code review of 4-2-fe-reports-page-layout-daterangereportfilter-component.md (2026-05-16)

- `+7h` magic offset in `handleSelect` when converting DayPicker Date to YYYY-MM-DD — functional for all known timezone ranges but fragile; consider using `formatYmdInVietnam(range.from)` directly if DayPicker date is trusted as local midnight [date-range-report-filter.tsx:84-90]. Pre-existing TZ strategy consistent with project approach.
- `todayInVN` recomputed every render in `DateRangeReportFilter` — no memoization with useMemo; minor performance issue [date-range-report-filter.tsx:72].
- Unsafe cast `as { detail?: string }` for 400 error body extraction — could expose raw server message if BE changes Problem Details format; errorMapper in shared/lib already handles most paths [reports-page.tsx:95].
- Partial selection fires query immediately with `from===to` range — when user clicks first day of range calendar, `onChange` triggers URL update and query refetch before range selection is complete [date-range-report-filter.tsx:88-92]. AC does not specify partial-select behavior.
