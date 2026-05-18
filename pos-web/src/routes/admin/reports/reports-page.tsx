import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosError, isAxiosError } from 'axios'
import { ErrorState } from '../../../shared/components/ui/error-state'
import { computePreset, formatYmdInVietnam } from '../../../shared/lib/date'
import { fetchReportsAll, reportsQueryKey, type ReportsAllResponse } from '../../../features/admin/reports/api'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { DateRangeReportFilter } from './_shared/date-range-report-filter'
import { SectionCard } from './_shared/section-card'
import { RevenueByDayChart } from './sections/revenue-by-day-chart'
import { RevenueByPaymentMethod } from './sections/revenue-by-payment-method'
import { TopProductsTable } from './sections/top-products-table'
import { TotalOrdersSummary } from './sections/total-orders-summary'

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/

function isValidYmd(value: string | null): value is string {
  return typeof value === 'string' && YMD_REGEX.test(value)
}

function isEmptyResponse(data: ReportsAllResponse): boolean {
  return (
    (data.totals?.totalOrders ?? 0) === 0 &&
    (data.revenueByDay ?? []).every((r) => r.orderCount === 0) &&
    (data.revenueByPaymentMethod ?? []).every((r) => r.orderCount === 0) &&
    (data.topProducts ?? []).length === 0
  )
}

function getRangeError(from: string, to: string, todayVN: string): string | null {
  if (to > todayVN) return 'Ngày kết thúc không được là ngày tương lai'
  if (from > todayVN) return 'Ngày bắt đầu không được là ngày tương lai'
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T00:00:00.000Z`)
  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
  if (diffDays > 90) return 'Tối đa 90 ngày một lần'
  return null
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Parse URL params — fallback to last 7 days if missing/invalid
  const defaultRange = useMemo(() => computePreset('last7Days'), [])

  const rawFrom = searchParams.get('from')
  const rawTo = searchParams.get('to')

  const hasValidParams = isValidYmd(rawFrom) && isValidYmd(rawTo)
  const hasInvalidParams = !hasValidParams
  const hasReversedParams = hasValidParams && rawFrom > rawTo

  const from = hasValidParams ? (hasReversedParams ? rawTo : rawFrom) : defaultRange.from
  const to = hasValidParams ? (hasReversedParams ? rawFrom : rawTo) : defaultRange.to

  // Replace URL with canonical params if missing/invalid or reversed (in useEffect to avoid render side-effect warning)
  useEffect(() => {
    if (hasInvalidParams) {
      setSearchParams({ from: defaultRange.from, to: defaultRange.to }, { replace: true })
      return
    }

    if (hasReversedParams) {
      setSearchParams({ from, to }, { replace: true })
    }
  }, [hasInvalidParams, hasReversedParams, defaultRange.from, defaultRange.to, from, to, setSearchParams])

  const todayVN = useMemo(() => formatYmdInVietnam(new Date()), [])

  // Derived validation: range error from URL params (no additional state needed)
  const rangeError = useMemo(() => {
    if (!hasValidParams) return null // falls back to default, no error
    return getRangeError(from, to, todayVN)
  }, [hasValidParams, from, to, todayVN])

  const handleRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      // Swap if from > to
      let { from: newFrom, to: newTo } = range
      if (newFrom > newTo) {
        ;[newFrom, newTo] = [newTo, newFrom]
      }
      setSearchParams({ from: newFrom, to: newTo }, { replace: true })
    },
    [setSearchParams],
  )

  const validRange = rangeError === null

  const query = useQuery({
    queryKey: reportsQueryKey(from, to),
    queryFn: () => fetchReportsAll({ from, to }),
    enabled: validRange,
    staleTime: 30_000,
    // Do not retry on 4xx validation errors; keep TanStack Query default retry count for 5xx/network
    retry: (failureCount, error) => {
      if (isAxiosError(error) && error.response && error.response.status < 500) {
        return false // no retry for 4xx
      }
      return failureCount < 3 // default TanStack Query retry count for 5xx/network
    },
  })

  // Detect 400 validation errors from BE (URL-hacked params that passed FE validation)
  const is400Error =
    query.isError &&
    isAxiosError(query.error) &&
    (query.error as AxiosError).response?.status === 400

  const filterError = rangeError ?? (is400Error ? ((query.error as AxiosError).response?.data as { detail?: string })?.detail ?? 'Khoảng ngày không hợp lệ' : null)

  // 5xx = network error OR axios error with status >= 500; NOT 4xx validation
  const is5xxError =
    query.isError &&
    !(isAxiosError(query.error) && (query.error as AxiosError).response && ((query.error as AxiosError).response?.status ?? 500) < 500)

  const isEmpty = query.data ? isEmptyResponse(query.data) : false
  const isLoading = query.isLoading && validRange
  const isBackgroundUpdating = query.isFetching && !query.isLoading

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Báo cáo" />
      <div className="mb-6"><p className="text-sm text-admin-gray-500">Theo dõi doanh thu, đơn hàng và sản phẩm bán chạy.</p></div>

      {/* Filter — sticky at top of content, always enabled even during loading */}
      <div className="sticky top-0 z-10 rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm">
        <DateRangeReportFilter
          value={{ from, to }}
          onChange={handleRangeChange}
          error={filterError}
        />
      </div>

      {/* Error state — only for 5xx / network errors */}
      {is5xxError ? (
        <ErrorState
          title="Không tải được báo cáo"
          description="Đã có lỗi xảy ra. Vui lòng thử lại sau."
          actionLabel="Thử lại"
          onAction={() => void query.refetch()}
        />
      ) : (
        /* 4 Section cards grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <SectionCard
            title="Doanh thu theo ngày"
            loading={isLoading}
            empty={!isLoading && isEmpty && !is5xxError}
          >
            <RevenueByDayChart
              data={query.data?.revenueByDay ?? []}
              from={from}
              to={to}
              isUpdating={isBackgroundUpdating}
            />
          </SectionCard>

          <SectionCard
            title="Tổng đơn"
            loading={isLoading}
            empty={!isLoading && isEmpty && !is5xxError}
          >
            <TotalOrdersSummary
              totals={query.data?.totals ?? { totalOrders: 0, totalRevenue: 0 }}
              from={from}
              to={to}
              isUpdating={isBackgroundUpdating}
            />
          </SectionCard>

          <SectionCard
            title="Doanh thu theo phương thức thanh toán"
            loading={isLoading}
            empty={!isLoading && isEmpty && !is5xxError}
          >
            <RevenueByPaymentMethod
              data={query.data?.revenueByPaymentMethod ?? []}
              isUpdating={isBackgroundUpdating}
            />
          </SectionCard>

          <SectionCard
            title="Top sản phẩm bán chạy"
            loading={isLoading}
            empty={!isLoading && isEmpty && !is5xxError}
          >
            <TopProductsTable
              data={query.data?.topProducts ?? []}
              isUpdating={isBackgroundUpdating}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
