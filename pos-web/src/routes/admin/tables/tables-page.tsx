import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { AdminButton, AdminDataTable, AdminSelect, AdminStatusBadge, type AdminDataTableColumn } from '../../../shared/components/admin'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { areasQueryKey, createTable, deleteTable, fetchAreas, fetchTables, tablesQueryKey, updateTable, type AreaDto, type TableDto } from '../../../features/admin/tables/api'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { TableForm, type TableFormValues } from './_shared/table-form'

type DialogState = { mode: 'create' } | { mode: 'edit'; table: TableDto } | { mode: 'delete'; table: TableDto } | null
type Row = TableDto & { areaName: string }
type TableFieldErrors = Partial<Record<keyof TableFormValues, string>>

const toast = (detail: string) => window.dispatchEvent(new CustomEvent('toast', { detail }))
const problemType = (error: unknown) => (error as AxiosError<{ type?: string }>)?.response?.data?.type ?? ''

function invalidateTables(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: tablesQueryKey })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'table-status'] })
}

function parseTableHasPendingOrder(error: unknown): string {
  const data = (error as AxiosError<{ activeOrderCount?: number; detail?: string }>)?.response?.data
  const count = typeof data?.activeOrderCount === 'number' ? data.activeOrderCount : Number(data?.detail?.match(/(\d+)\s+đơn/)?.[1] ?? '')
  return Number.isFinite(count) && count > 0
    ? `Bàn này đang có ${count} đơn chờ thanh toán. Vui lòng xử lý đơn trước khi xóa.`
    : 'Bàn này đang có đơn chờ thanh toán. Vui lòng xử lý đơn trước khi xóa.'
}

function visibleAreasForForm(areas: AreaDto[], editing?: TableDto) {
  return areas.filter((area) => area.isActive || area.id === editing?.areaId)
}

export default function TablesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [fieldErrors, setFieldErrors] = useState<TableFieldErrors>({})
  const areaId = searchParams.get('areaId') ?? ''
  const activeOnly = searchParams.get('active') === 'true'
  const areasQuery = useQuery({ queryKey: areasQueryKey, queryFn: fetchAreas })
  const tablesQuery = useQuery({ queryKey: tablesQueryKey, queryFn: () => fetchTables() })
  const areas = useMemo(() => areasQuery.data ?? [], [areasQuery.data])
  const tables = useMemo(() => tablesQuery.data ?? [], [tablesQuery.data])
  const areaMap = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas])
  const rows = useMemo<Row[]>(() => tables.filter((table) => (!areaId || table.areaId === areaId) && (!activeOnly || table.isActive)).map((table) => ({ ...table, areaName: areaMap.get(table.areaId) ?? '—' })).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')), [tables, areaId, activeOnly, areaMap])
  const defaultAreaId = areaId || areas.find((area) => area.isActive)?.id || areas[0]?.id || ''
  const scopedTables = tables.filter((table) => table.areaId === defaultAreaId)
  const defaultSortOrder = scopedTables.length ? Math.max(...scopedTables.map((table) => table.sortOrder)) + 10 : 10

  const saveMutation = useMutation({
    mutationFn: (values: TableFormValues) => dialog?.mode === 'edit' ? updateTable(dialog.table.id, values) : createTable(values),
    onSuccess: () => { toast(dialog?.mode === 'edit' ? 'Đã cập nhật bàn' : 'Đã tạo bàn'); setDialog(null); setFieldErrors({}); invalidateTables(queryClient) },
    onError: (error) => {
      if (problemType(error).includes('table-name-conflict')) setFieldErrors({ name: 'Tên đã tồn tại trong store' })
      else if ((error as AxiosError)?.response?.status === 400) setFieldErrors({ areaId: 'Khu vực không hợp lệ hoặc không thuộc store' })
      else toast('Không lưu được bàn. Vui lòng thử lại.')
    },
  })
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteTable(id), onSuccess: () => { toast('Đã xóa bàn'); setDialog(null); invalidateTables(queryClient) }, onError: (error) => toast(problemType(error).includes('table-has-pending-order') ? parseTableHasPendingOrder(error) : 'Không thể xóa bàn. Vui lòng thử lại.') })
  const toggleMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateTable(id, { isActive }), onMutate: async ({ id, isActive }) => { await queryClient.cancelQueries({ queryKey: tablesQueryKey }); const previous = queryClient.getQueryData<TableDto[]>(tablesQueryKey); queryClient.setQueryData<TableDto[]>(tablesQueryKey, (old) => old?.map((table) => table.id === id ? { ...table, isActive } : table)); return { previous } }, onError: (_e, _v, ctx) => { queryClient.setQueryData(tablesQueryKey, ctx?.previous); toast('Không cập nhật được trạng thái. Vui lòng thử lại.') }, onSettled: () => invalidateTables(queryClient) })
  const isBusy = tablesQuery.isFetching || areasQuery.isFetching || saveMutation.isPending || deleteMutation.isPending
  const updateParam = (key: string, value: string | null) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next })
  function openCreate() { setFieldErrors({}); setDialog({ mode: 'create' }) }
  function openEdit(table: TableDto) { setFieldErrors({}); setDialog({ mode: 'edit', table }) }

  const columns = useMemo<AdminDataTableColumn<Row>[]>(() => [
    { key: 'name', label: 'Tên bàn', sortable: true },
    { key: 'areaName', label: 'Khu vực' },
    { key: 'capacity', label: 'Sức chứa', sortable: true },
    { key: 'sortOrder', label: 'Thứ tự', sortable: true },
    { key: 'isActive', label: 'Trạng thái', render: (row) => <div className="flex min-h-touch items-center gap-3"><AdminStatusBadge variant={row.isActive ? 'success' : 'neutral'} label={row.isActive ? 'Đang dùng' : 'Tạm ẩn'} /><button type="button" className="rounded-md border border-admin-gray-200 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500" aria-label={`${row.isActive ? 'Tắt' : 'Bật'} bàn ${row.name}`} disabled={tablesQuery.isLoading || toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}>{row.isActive ? 'Tắt' : 'Bật'}</button></div> },
  ], [tablesQuery.isLoading, toggleMutation])
  const formAreas = dialog?.mode === 'edit' ? visibleAreasForForm(areas, dialog.table) : visibleAreasForForm(areas)
  const formDefaults = dialog?.mode === 'edit' ? { name: dialog.table.name, areaId: dialog.table.areaId, capacity: dialog.table.capacity, sortOrder: dialog.table.sortOrder, isActive: dialog.table.isActive } : { name: '', areaId: defaultAreaId, capacity: 2, sortOrder: defaultSortOrder, isActive: true }
  const emptyState = areas.length === 0 ? <div className="space-y-4"><EmptyState title="Vui lòng tạo khu vực trước khi thêm bàn." /><div className="flex justify-center"><Link to="/admin/tables/areas"><AdminButton>Đi tới Khu vực</AdminButton></Link></div></div> : <div className="space-y-4"><EmptyState title="Chưa có bàn nào trong khu vực đã chọn. Tạo bàn đầu tiên để bắt đầu." /><div className="flex justify-center"><AdminButton onClick={openCreate}>Tạo bàn</AdminButton></div></div>

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Bàn" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-admin-gray-500">Quản lý bàn, khu vực, sức chứa và trạng thái sử dụng.</p><AdminButton onClick={openCreate}>+ Tạo bàn mới</AdminButton></div>
      <div className="mb-6 grid gap-3 rounded-2xl border border-admin-gray-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]"><label className="space-y-1 text-sm font-medium">Khu vực<AdminSelect value={areaId} onChange={(event) => updateParam('areaId', event.target.value || null)}><option value="">Tất cả khu vực</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}</AdminSelect></label><label className="flex min-h-touch items-center gap-2 self-end text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-admin-brand-500" checked={activeOnly} onChange={(event) => updateParam('active', event.target.checked ? 'true' : null)} />Chỉ hiển thị đang hoạt động</label></div>
      {areasQuery.isError || tablesQuery.isError ? <div className="rounded-2xl border border-admin-error-200 bg-admin-error-50 p-6"><h2 className="font-semibold">Không tải được bàn</h2><p className="mt-1 text-sm text-admin-gray-500">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p><AdminButton className="mt-4" onClick={() => { void areasQuery.refetch(); void tablesQuery.refetch() }}>Thử lại</AdminButton></div> : <AdminDataTable columns={columns} data={rows} loading={areasQuery.isLoading || tablesQuery.isLoading} emptyState={emptyState} rowActions={[{ label: 'Sửa', disabled: isBusy, onClick: openEdit }, { label: 'Xóa', variant: 'destructive', disabled: isBusy, onClick: (table) => setDialog({ mode: 'delete', table }) }]} />}
      <Dialog open={dialog?.mode === 'create' || dialog?.mode === 'edit'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">{dialog?.mode === 'edit' ? 'Sửa bàn' : 'Tạo bàn mới'}</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Nhập tên bàn, khu vực, sức chứa, thứ tự hiển thị và trạng thái.</span></DialogDescription></DialogHeader>{dialog?.mode === 'create' || dialog?.mode === 'edit' ? <TableForm fieldErrors={fieldErrors} areas={formAreas} submitLabel={dialog.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo bàn'} isSubmitting={saveMutation.isPending} defaultValues={formDefaults} onSubmit={(values) => saveMutation.mutate(values)} /> : null}</DialogContent></Dialog>
      <Dialog open={dialog?.mode === 'delete'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">Xóa bàn này?</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Nếu bàn đang có đơn chờ thanh toán, hệ thống sẽ chặn xóa.</span></DialogDescription></DialogHeader><div className="flex justify-end gap-2"><AdminButton variant="ghost" onClick={() => setDialog(null)}>Hủy</AdminButton><AdminButton variant="destructive" disabled={deleteMutation.isPending} onClick={() => dialog?.mode === 'delete' && deleteMutation.mutate(dialog.table.id)}>{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}</AdminButton></div></DialogContent></Dialog>
    </div>
  )
}
