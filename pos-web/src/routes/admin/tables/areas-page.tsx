import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { AdminButton, AdminDataTable, AdminStatusBadge, type AdminDataTableColumn } from '../../../shared/components/admin'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { createArea, createTable, deleteArea, fetchAreas, fetchTables, updateArea, areasQueryKey, tablesQueryKey, type AreaDto } from '../../../features/admin/tables/api'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { AreaForm, type AreaFormValues } from './_shared/area-form'

type DialogState = { mode: 'create' } | { mode: 'edit'; area: AreaDto } | { mode: 'delete'; area: Row } | null
type Row = AreaDto & { tableCount: number }
type AreaFieldErrors = Partial<Record<keyof AreaFormValues, string>>

const toast = (detail: string) => window.dispatchEvent(new CustomEvent('toast', { detail }))
const problemType = (error: unknown) => (error as AxiosError<{ type?: string }>)?.response?.data?.type ?? ''

function invalidateTables(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: areasQueryKey })
  void queryClient.invalidateQueries({ queryKey: tablesQueryKey })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'table-status'] })
}

function parseAreaHasTables(error: unknown): string {
  const data = (error as AxiosError<{ tableCount?: number; detail?: string }>)?.response?.data
  const count = typeof data?.tableCount === 'number' ? data.tableCount : Number(data?.detail?.match(/(\d+)\s+bàn/)?.[1] ?? '')
  return Number.isFinite(count) && count > 0
    ? `Khu vực này có ${count} bàn. Vui lòng chuyển bàn sang khu vực khác trước.`
    : 'Khu vực này có bàn. Vui lòng chuyển bàn sang khu vực khác trước.'
}

export default function AreasPage() {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogState>(null)
  const [fieldErrors, setFieldErrors] = useState<AreaFieldErrors>({})
  const areasQuery = useQuery({ queryKey: areasQueryKey, queryFn: fetchAreas })
  const tablesQuery = useQuery({ queryKey: tablesQueryKey, queryFn: () => fetchTables() })
  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>()
    ;(tablesQuery.data ?? []).forEach((table) => counts.set(table.areaId, (counts.get(table.areaId) ?? 0) + 1))
    return (areasQuery.data ?? []).map((area) => ({ ...area, tableCount: counts.get(area.id) ?? 0 }))
  }, [areasQuery.data, tablesQuery.data])
  const defaultSortOrder = rows.length ? Math.max(...rows.map((area) => area.sortOrder)) + 10 : 10

  const saveMutation = useMutation({
    mutationFn: (values: AreaFormValues) => dialog?.mode === 'edit' ? updateArea(dialog.area.id, values) : createArea(values),
    onSuccess: () => { toast(dialog?.mode === 'edit' ? 'Đã cập nhật khu vực' : 'Đã tạo khu vực'); setDialog(null); setFieldErrors({}); invalidateTables(queryClient) },
    onError: (error) => {
      if (problemType(error).includes('area-name-conflict')) setFieldErrors({ name: 'Tên đã tồn tại trong store' })
      else toast('Không lưu được khu vực. Vui lòng thử lại.')
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteArea(id),
    onSuccess: () => { toast('Đã xóa khu vực'); setDialog(null); invalidateTables(queryClient) },
    onError: (error) => toast(problemType(error).includes('area-has-tables') ? parseAreaHasTables(error) : 'Không thể xóa khu vực. Vui lòng thử lại.'),
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateArea(id, { isActive }),
    onMutate: async ({ id, isActive }) => { await queryClient.cancelQueries({ queryKey: areasQueryKey }); const previous = queryClient.getQueryData<AreaDto[]>(areasQueryKey); queryClient.setQueryData<AreaDto[]>(areasQueryKey, (old) => old?.map((area) => area.id === id ? { ...area, isActive } : area)); return { previous } },
    onError: (_error, _variables, context) => { queryClient.setQueryData(areasQueryKey, context?.previous); toast('Không cập nhật được trạng thái. Vui lòng thử lại.') },
    onSettled: () => invalidateTables(queryClient),
  })
  const seedMutation = useMutation({
    mutationFn: async () => {
      const area = await createArea({ name: 'Quầy chính', sortOrder: 10, isActive: true })
      try {
        await Promise.all([1, 2, 3, 4].map((n) => createTable({ name: `Bàn ${n}`, areaId: area.id, capacity: 2, sortOrder: n * 10, isActive: true })))
        return { partial: false }
      } catch {
        return { partial: true }
      }
    },
    onSuccess: (result) => { toast(result.partial ? 'Đã tạo khu vực, một số bàn thất bại — vui lòng kiểm tra danh sách bàn.' : 'Đã tạo khu vực mẫu với 4 bàn'); invalidateTables(queryClient) },
    onError: () => toast('Không tạo được dữ liệu mẫu. Vui lòng thử lại.'),
  })

  function openCreate() { setFieldErrors({}); setDialog({ mode: 'create' }) }
  function openEdit(area: AreaDto) { setFieldErrors({}); setDialog({ mode: 'edit', area }) }
  const isBusy = areasQuery.isFetching || tablesQuery.isFetching || saveMutation.isPending || deleteMutation.isPending

  const columns = useMemo<AdminDataTableColumn<Row>[]>(() => [
    { key: 'name', label: 'Tên khu vực', sortable: true },
    { key: 'sortOrder', label: 'Thứ tự', sortable: true },
    { key: 'tableCount', label: 'Số bàn', render: (row) => row.tableCount },
    { key: 'isActive', label: 'Trạng thái', render: (row) => <div className="flex min-h-touch items-center gap-3"><AdminStatusBadge variant={row.isActive ? 'success' : 'neutral'} label={row.isActive ? 'Đang dùng' : 'Tạm ẩn'} /><button type="button" className="rounded-md border border-admin-gray-200 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500" aria-label={`${row.isActive ? 'Tắt' : 'Bật'} khu vực ${row.name}`} disabled={areasQuery.isLoading || toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}>{row.isActive ? 'Tắt' : 'Bật'}</button></div> },
  ], [areasQuery.isLoading, toggleMutation])

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Khu vực" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-admin-gray-500">Quản lý khu vực phục vụ và thứ tự hiển thị trên sơ đồ bàn.</p><AdminButton onClick={openCreate}>+ Tạo khu vực mới</AdminButton></div>
      {areasQuery.isError || tablesQuery.isError ? <div className="rounded-2xl border border-admin-error-200 bg-admin-error-50 p-6"><h2 className="font-semibold">Không tải được khu vực</h2><p className="mt-1 text-sm text-admin-gray-500">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p><AdminButton className="mt-4" onClick={() => { void areasQuery.refetch(); void tablesQuery.refetch() }}>Thử lại</AdminButton></div> : <AdminDataTable columns={columns} data={rows} loading={areasQuery.isLoading || tablesQuery.isLoading} emptyState={<div className="space-y-4"><EmptyState title="Bắt đầu quản lý bàn — Tạo khu vực đầu tiên (ví dụ Quầy chính) rồi thêm bàn vào khu vực đó." /><div className="flex flex-wrap justify-center gap-2"><AdminButton onClick={openCreate}>Tạo khu vực</AdminButton><AdminButton variant="ghost" disabled={seedMutation.isPending} onClick={() => seedMutation.mutate()}>{seedMutation.isPending ? 'Đang tạo...' : 'Tạo bàn mẫu'}</AdminButton></div></div>} rowActions={[{ label: 'Sửa', disabled: isBusy || saveMutation.isPending || deleteMutation.isPending, onClick: openEdit }, { label: 'Xóa', variant: 'destructive', disabled: isBusy || saveMutation.isPending || deleteMutation.isPending, onClick: (area) => setDialog({ mode: 'delete', area }) }]} />}
      <Dialog open={dialog?.mode === 'create' || dialog?.mode === 'edit'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">{dialog?.mode === 'edit' ? 'Sửa khu vực' : 'Tạo khu vực mới'}</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Nhập tên, thứ tự hiển thị và trạng thái khu vực.</span></DialogDescription></DialogHeader>{dialog?.mode === 'create' || dialog?.mode === 'edit' ? <AreaForm fieldErrors={fieldErrors} submitLabel={dialog.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo khu vực'} isSubmitting={saveMutation.isPending} defaultValues={dialog.mode === 'edit' ? { name: dialog.area.name, sortOrder: dialog.area.sortOrder, isActive: dialog.area.isActive } : { name: '', sortOrder: defaultSortOrder, isActive: true }} onSubmit={(values) => saveMutation.mutate(values)} /> : null}</DialogContent></Dialog>
      <Dialog open={dialog?.mode === 'delete'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">Xóa khu vực này?</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Nếu khu vực còn bàn, hệ thống sẽ chặn xóa để bảo vệ dữ liệu.</span></DialogDescription></DialogHeader><div className="flex justify-end gap-2"><AdminButton variant="ghost" onClick={() => setDialog(null)}>Hủy</AdminButton><AdminButton variant="destructive" disabled={deleteMutation.isPending} onClick={() => dialog?.mode === 'delete' && deleteMutation.mutate(dialog.area.id)}>{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}</AdminButton></div></DialogContent></Dialog>
    </div>
  )
}
