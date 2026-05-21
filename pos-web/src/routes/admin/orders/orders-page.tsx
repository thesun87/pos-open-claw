import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { AdminDataTable, type AdminDataTableColumn } from '../../../shared/components/admin/admin-data-table'
import { AdminButton } from '../../../shared/components/admin/admin-button'
import { AdminInput } from '../../../shared/components/admin/admin-input'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { ErrorState } from '../../../shared/components/ui/error-state'
import { adminOrderDetailQueryKey, adminOrdersQueryKey, fetchAdminOrderDetail, fetchAdminOrders, type AdminOrderDetail, type AdminOrderListItem, type AdminOrdersFilters, type AdminPaymentMethod } from '../../../features/admin/orders/api'

const paymentLabels: Record<AdminPaymentMethod, string> = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' }
const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' })

function formatDate(value: string) { return dateTime.format(new Date(value)) }
function formatVnd(value: number) { return vnd.format(value) }
function getRangeError(from?: string, to?: string) { return from && to && from > to ? 'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc' : null }

function OrderDetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery({ queryKey: adminOrderDetailQueryKey(id), queryFn: () => fetchAdminOrderDetail(id), enabled: Boolean(id), staleTime: 30_000 })
  const detail = query.data
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby="order-detail-title" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h2 id="order-detail-title" className="text-xl font-semibold text-admin-gray-900">Chi tiết đơn hàng {detail?.orderCode ?? ''}</h2><p className="text-sm text-admin-gray-500">Dữ liệu snapshot tại thời điểm bán.</p></div>
          <AdminButton variant="ghost" onClick={onClose} aria-label="Đóng chi tiết đơn hàng">Đóng</AdminButton>
        </div>
        {query.isLoading ? <p className="text-sm text-admin-gray-500">Đang tải chi tiết...</p> : query.isError ? <ErrorState title="Không tải được chi tiết đơn" description="Vui lòng thử lại." actionLabel="Thử lại" onAction={() => void query.refetch()} /> : detail ? <DetailContent detail={detail} /> : null}
      </div>
    </div>
  )
}

function DetailContent({ detail }: { detail: AdminOrderDetail }) {
  return <div className="space-y-6">
    <dl className="grid grid-cols-1 gap-3 rounded-xl border border-admin-gray-200 p-4 text-sm md:grid-cols-3">
      <div><dt className="text-admin-gray-500">Mã đơn</dt><dd className="font-medium text-admin-gray-900">{detail.orderCode}</dd></div>
      <div><dt className="text-admin-gray-500">Thời gian bán</dt><dd>{formatDate(detail.soldAt)}</dd></div>
      <div><dt className="text-admin-gray-500">Thu ngân</dt><dd>{detail.cashierName ?? '—'}</dd></div>
      <div><dt className="text-admin-gray-500">Thanh toán</dt><dd>{paymentLabels[detail.paymentMethod]}</dd></div>
      <div><dt className="text-admin-gray-500">Giảm giá</dt><dd>{formatVnd(detail.discountAmount)}</dd></div>
      <div><dt className="text-admin-gray-500">Tổng tiền</dt><dd className="font-semibold">{formatVnd(detail.total)}</dd></div>
    </dl>
    {detail.voids.length > 0 && <div className="rounded-xl border border-admin-error-200 bg-admin-error-50 p-4 text-sm"><p className="font-medium text-admin-error-700">Đơn đã hủy</p>{detail.voids.map((v) => <p key={v.id}>{formatDate(v.voidedAt)} — {v.reason} ({v.voidedByName ?? 'không rõ'})</p>)}</div>}
    <div className="overflow-x-auto rounded-xl border border-admin-gray-200"><table className="min-w-full divide-y divide-admin-gray-200 text-sm"><thead className="bg-admin-gray-50"><tr><th className="px-4 py-3 text-left">Món</th><th className="px-4 py-3 text-left">SL</th><th className="px-4 py-3 text-left">Đơn giá</th><th className="px-4 py-3 text-left">Thành tiền</th></tr></thead><tbody className="divide-y divide-admin-gray-100">{detail.items.map((item) => <tr key={item.id}><td className="px-4 py-3"><p className="font-medium">{item.productNameSnapshot}</p>{item.options.map((o) => <p key={o.id} className="text-admin-gray-500">+ {o.labelSnapshot} ({formatVnd(o.priceDeltaSnapshot)})</p>)}{item.note && <p className="text-admin-gray-500">Ghi chú: {item.note}</p>}</td><td className="px-4 py-3">{item.quantity}</td><td className="px-4 py-3">{formatVnd(item.unitPriceSnapshot)}</td><td className="px-4 py-3 font-medium">{formatVnd(item.lineTotal)}</td></tr>)}</tbody></table></div>
  </div>
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo<AdminOrdersFilters>(() => ({ orderCode: searchParams.get('order_code') ?? '', from: searchParams.get('from') ?? '', to: searchParams.get('to') ?? '' }), [searchParams])
  const [draft, setDraft] = useState(filters)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rangeError = getRangeError(draft.from, draft.to)
  const queryRangeError = getRangeError(filters.from, filters.to)
  const query = useQuery({ queryKey: adminOrdersQueryKey(filters), queryFn: () => fetchAdminOrders(filters), enabled: !queryRangeError, staleTime: 30_000, retry: (count, error) => !(isAxiosError(error) && error.response && error.response.status < 500) && count < 3 })

  const applyFilters = (event: FormEvent) => { event.preventDefault(); if (rangeError) return; const next: Record<string, string> = {}; if (draft.orderCode?.trim()) next.order_code = draft.orderCode.trim(); if (draft.from) next.from = draft.from; if (draft.to) next.to = draft.to; setSearchParams(next) }
  const resetFilters = () => { setDraft({ orderCode: '', from: '', to: '' }); setSearchParams({}) }
  const columns: AdminDataTableColumn<AdminOrderListItem>[] = [
    { key: 'orderCode', label: 'Mã đơn' },
    { key: 'soldAt', label: 'Thời gian bán', render: (row) => formatDate(row.soldAt) },
    { key: 'total', label: 'Tổng tiền', render: (row) => formatVnd(row.total) },
    { key: 'paymentMethod', label: 'Thanh toán', render: (row) => paymentLabels[row.paymentMethod] },
    { key: 'itemLineCount', label: 'Số dòng/món', render: (row) => `${row.itemLineCount} dòng / ${row.itemQuantity} món` },
    { key: 'isVoided', label: 'Trạng thái', render: (row) => row.isVoided ? 'Đã hủy' : 'Chưa hủy' },
  ]
  const is5xxError = query.isError && !(isAxiosError(query.error) && query.error.response && query.error.response.status < 500)
  const filterError = rangeError ?? (query.isError && isAxiosError(query.error) && query.error.response?.status === 400 ? 'Bộ lọc không hợp lệ' : null)

  return <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
    <PageBreadcrumb pageTitle="Đơn hàng" />
    <p className="mb-6 text-sm text-admin-gray-500">Tra cứu lịch sử bán hàng theo mã đơn và khoảng ngày.</p>
    <form onSubmit={applyFilters} className="mb-6 rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4"><label className="text-sm font-medium text-admin-gray-700">Mã đơn<AdminInput value={draft.orderCode ?? ''} onChange={(e) => setDraft((d) => ({ ...d, orderCode: e.target.value }))} placeholder="Nhập mã đơn" /></label><label className="text-sm font-medium text-admin-gray-700">Từ ngày<AdminInput type="date" value={draft.from ?? ''} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} /></label><label className="text-sm font-medium text-admin-gray-700">Đến ngày<AdminInput type="date" value={draft.to ?? ''} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} /></label><div className="flex items-end gap-2"><AdminButton type="submit">Áp dụng</AdminButton><AdminButton type="button" variant="secondary" onClick={resetFilters}>Xóa lọc</AdminButton></div></div>
      {filterError && <p className="mt-3 text-sm text-admin-error-600" role="alert">{filterError}</p>}
    </form>
    {is5xxError ? <ErrorState title="Không tải được đơn hàng" description="Đã có lỗi xảy ra. Vui lòng thử lại sau." actionLabel="Thử lại" onAction={() => void query.refetch()} /> : <div className="overflow-x-auto"><AdminDataTable columns={columns} data={query.data ?? []} loading={query.isLoading} emptyState={<EmptyState title="Không tìm thấy đơn hàng" description="Thử thay đổi mã đơn hoặc khoảng ngày." />} rowActions={[{ label: 'Xem chi tiết', onClick: (row) => setSelectedId(row.id) }]} /></div>}
    {selectedId && <OrderDetailDialog id={selectedId} onClose={() => setSelectedId(null)} />}
  </div>
}
