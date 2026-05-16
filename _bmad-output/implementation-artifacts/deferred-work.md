# Deferred Work

## Deferred from: code review of 4-1-be-reports-endpoint-voi-4-metric-aggregations-tz-asia-ho-chi-minh-void-exclusion.md (2026-05-16)

- Default `todayYmd`/`thirtyDaysAgoYmd` in `reports.service.ts:86-88` use `toISOString()` (UTC) instead of local Vietnam time. Only affects the default 30-day range when `from`/`to` query params are not provided. Low real-world impact since servers typically run in UTC and users are expected to provide explicit dates in production. Fix: derive local Vietnam date using `Intl.DateTimeFormat` with `Asia/Ho_Chi_Minh` timezone when computing defaults.
