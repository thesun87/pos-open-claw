import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AdminButton } from '../../../shared/components/admin'
import { LoadingSkeleton } from '../../../shared/components/ui/loading-skeleton'
import { fetchTables, fetchTableStatus, tableStatusQueryKey, tablesQueryKey } from '../../../features/admin/tables/api'
import { useStoreMe, useUpdateTableMode } from '../../../features/admin/tables/hooks'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { ApplyChangeConfirmDialog } from './_shared/apply-change-confirm-dialog'
import { StoreConfigToggle } from './_shared/store-config-toggle'
import { TurnOffConfirmDialog } from './_shared/turn-off-confirm-dialog'

function toast(detail: string) {
  window.dispatchEvent(new CustomEvent('toast', { detail }))
}

export default function StoreConfigPage() {
  const storeQuery = useStoreMe()
  const updateTableMode = useUpdateTableMode()
  const tablesQuery = useQuery({ queryKey: tablesQueryKey, queryFn: () => fetchTables(), retry: false })
  const tableStatusQuery = useQuery({ queryKey: tableStatusQueryKey, queryFn: fetchTableStatus, retry: false })
  const [pendingNext, setPendingNext] = useState<boolean | null>(null)

  const occupiedCount = useMemo(() => (
    tableStatusQuery.data?.filter((row) => row.status === 'occupied' || (row.activeOrderCount ?? 0) > 0).length ?? 0
  ), [tableStatusQuery.data])

  const currentMode = storeQuery.data?.tableMode ?? false
  const turningOff = pendingNext === false
  const showTurnOff = turningOff && tableStatusQuery.isError
    ? true
    : turningOff && occupiedCount > 0
  const showApply = pendingNext !== null && !showTurnOff

  const requestToggle = () => {
    if (tableStatusQuery.isLoading || updateTableMode.isPending) return
    setPendingNext(!currentMode)
  }

  const closeDialog = () => setPendingNext(null)
  const confirmChange = () => {
    if (pendingNext === null) return
    const next = pendingNext
    updateTableMode.mutate({ tableMode: next }, {
      onSuccess: () => {
        const hasNoTables = (tablesQuery.data?.length ?? 0) === 0
        if (next && hasNoTables) {
          toast('Đã bật chế độ bàn. Vui lòng tạo khu vực và bàn để thu ngân có thể bắt đầu phục vụ bàn.')
        } else {
          toast(`Đã ${next ? 'bật' : 'tắt'} chế độ bàn. POS sẽ áp dụng sau khi đăng xuất/đăng nhập lại.`)
        }
        setPendingNext(null)
      },
      onError: () => {
        toast('Không cập nhật được chế độ. Vui lòng thử lại.')
        setPendingNext(null)
      },
    })
  }

  if (storeQuery.isLoading) {
    return (
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageBreadcrumb pageTitle="Cấu hình store" />
        <div className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm">
          <LoadingSkeleton lines={4} />
        </div>
      </div>
    )
  }

  if (storeQuery.isError) {
    return (
      <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
        <PageBreadcrumb pageTitle="Cấu hình store" />
        <div className="rounded-2xl border border-admin-error-200 bg-admin-error-50 p-6">
          <h2 className="font-semibold">Không tải được cấu hình store</h2>
          <p className="mt-1 text-sm text-admin-gray-500">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p>
          <AdminButton className="mt-4" onClick={() => void storeQuery.refetch()}>Thử lại</AdminButton>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Cấu hình store" />
      <div className="mb-6 rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-admin-brand-500">Store hiện tại</p>
        <h1 className="mt-2 text-2xl font-semibold text-admin-gray-800">{storeQuery.data?.name}</h1>
        <p className="mt-1 text-sm text-admin-gray-500">Mã store: {storeQuery.data?.code}</p>
        <p className="mt-4 max-w-3xl text-sm text-admin-gray-600">Bật chế độ bàn khi quán phục vụ theo sơ đồ bàn. Tắt để giữ luồng counter-service hiện tại cho quầy order nhanh.</p>
      </div>

      <StoreConfigToggle tableMode={currentMode} disabled={storeQuery.isLoading || tableStatusQuery.isLoading || updateTableMode.isPending} isBusy={tableStatusQuery.isLoading || updateTableMode.isPending} onToggleRequest={requestToggle} />

      <div className="mt-6 rounded-md border border-admin-gray-200 bg-admin-gray-50 p-4 text-sm text-admin-gray-700">
        Thay đổi áp dụng cho POS sau khi thu ngân <strong>đăng xuất và đăng nhập lại</strong> (NFR18). Cart/đơn đang xử lý không bị ảnh hưởng.
      </div>

      {pendingNext === true && (tablesQuery.data?.length ?? 0) === 0 ? <p className="mt-4 text-sm text-admin-gray-500"><Link className="font-medium text-admin-brand-500 underline" to="/admin/tables/areas">Đi tới Quản lý bàn</Link> sau khi bật để tạo khu vực và bàn.</p> : null}

      <TurnOffConfirmDialog open={showTurnOff} occupiedCount={tableStatusQuery.isError ? null : occupiedCount} isPending={updateTableMode.isPending} onOpenChange={(open) => !open && closeDialog()} onConfirm={confirmChange} />
      <ApplyChangeConfirmDialog open={showApply} nextMode={pendingNext ?? false} isPending={updateTableMode.isPending} onOpenChange={(open) => !open && closeDialog()} onConfirm={confirmChange} />
    </div>
  )
}
