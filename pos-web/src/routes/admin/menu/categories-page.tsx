import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { AdminDataTable, type AdminDataTableColumn } from '../../../shared/components/admin/admin-data-table'
import { AdminButton, AdminStatusBadge } from '../../../shared/components/admin'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import PageBreadcrumb from '../tailadmin/components/common/PageBreadCrumb'
import { createCategory, deleteCategory, fetchAdminMenu, fetchCategories, updateCategory, adminMenuQueryKey, categoriesQueryKey, type CategoryDto } from '../../../features/admin/categories/api'
import { CategoryForm, type CategoryFormValues } from './_shared/category-form'

type DialogState = { mode: 'create' } | { mode: 'edit'; category: CategoryDto } | { mode: 'delete'; category: CategoryDto } | null

type Row = CategoryDto & { productCount?: number | undefined }

function parseProductCount(error: unknown): string {
  const detail = (error as AxiosError<{ detail?: string }>)?.response?.data?.detail ?? ''
  const count = detail.match(/(\d+)\s+sản phẩm/)?.[1]
  return count ? `Danh mục đang chứa ${count} sản phẩm. Xóa hoặc chuyển sản phẩm sang danh mục khác trước.` : 'Danh mục đang chứa sản phẩm. Xóa hoặc chuyển sản phẩm sang danh mục khác trước.'
}

export default function CategoriesPage() {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<DialogState>(null)
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKey, queryFn: fetchCategories })
  const menuQuery = useQuery({ queryKey: adminMenuQueryKey, queryFn: fetchAdminMenu, retry: false })
  const rows = useMemo<Row[]>(() => {
    const counts = new Map<string, number>()
    ;(menuQuery.data?.products ?? []).forEach((product) => counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1))
    return (categoriesQuery.data ?? []).map((category) => ({ ...category, productCount: menuQuery.data ? (counts.get(category.id) ?? 0) : undefined }))
  }, [categoriesQuery.data, menuQuery.data])
  const defaultSortOrder = rows.length ? Math.max(...rows.map((c) => c.sortOrder)) + 10 : 10
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: categoriesQueryKey }); void queryClient.invalidateQueries({ queryKey: adminMenuQueryKey }) }
  const saveMutation = useMutation({ mutationFn: (values: CategoryFormValues) => dialog?.mode === 'edit' ? updateCategory(dialog.category.id, values) : createCategory(values), onSuccess: () => { window.dispatchEvent(new CustomEvent('toast', { detail: dialog?.mode === 'edit' ? 'Đã cập nhật danh mục' : 'Đã tạo danh mục' })); setDialog(null); invalidate() } })
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteCategory(id), onSuccess: () => { window.dispatchEvent(new CustomEvent('toast', { detail: 'Đã xóa danh mục' })); setDialog(null); invalidate() }, onError: (error) => window.dispatchEvent(new CustomEvent('toast', { detail: parseProductCount(error) })) })
  const toggleMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCategory(id, { isActive }), onMutate: async ({ id, isActive }) => { await queryClient.cancelQueries({ queryKey: categoriesQueryKey }); const previous = queryClient.getQueryData<CategoryDto[]>(categoriesQueryKey); queryClient.setQueryData<CategoryDto[]>(categoriesQueryKey, (old) => old?.map((c) => c.id === id ? { ...c, isActive } : c)); return { previous } }, onError: (_e, _v, ctx) => queryClient.setQueryData(categoriesQueryKey, ctx?.previous), onSettled: invalidate })
  const columns: AdminDataTableColumn<Row>[] = [
    { key: 'name', label: 'Tên danh mục', sortable: true },
    { key: 'sortOrder', label: 'Thứ tự', sortable: true },
    { key: 'productCount', label: 'Số sản phẩm', render: (row) => row.productCount ?? '—' },
    { key: 'isActive', label: 'Trạng thái', render: (row) => <div className="flex min-h-touch items-center gap-3"><AdminStatusBadge variant={row.isActive ? 'success' : 'neutral'} label={row.isActive ? 'Đang dùng' : 'Tạm ẩn'} /><button type="button" className="rounded-md border border-admin-gray-200 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500" aria-label={`${row.isActive ? 'Tạm ẩn' : 'Bật'} danh mục ${row.name}`} disabled={categoriesQuery.isLoading || toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}>{row.isActive ? 'Tắt' : 'Bật'}</button></div> },
  ]
  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageBreadcrumb pageTitle="Danh mục sản phẩm" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-admin-gray-500">Quản lý danh mục, thứ tự hiển thị và trạng thái sử dụng.</p>
        <AdminButton onClick={() => setDialog({ mode: 'create' })}>+ Tạo danh mục mới</AdminButton>
      </div>
      {categoriesQuery.isError ? <div className="rounded-2xl border border-admin-error-200 bg-admin-error-50 p-6"><h2 className="font-semibold">Không tải được danh mục</h2><p className="mt-1 text-sm text-admin-gray-500">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p><AdminButton className="mt-4" onClick={() => void categoriesQuery.refetch()}>Thử lại</AdminButton></div> : <AdminDataTable columns={columns} data={rows} loading={categoriesQuery.isLoading} emptyState={<EmptyState title="Chưa có danh mục nào. Tạo danh mục đầu tiên để bắt đầu." />} rowActions={[{ label: 'Sửa', disabled: categoriesQuery.isFetching, onClick: (category) => setDialog({ mode: 'edit', category }) }, { label: 'Xóa', variant: 'destructive', disabled: categoriesQuery.isFetching, onClick: (category) => setDialog({ mode: 'delete', category }) }]} />}
      <Dialog open={dialog?.mode === 'create' || dialog?.mode === 'edit'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">{dialog?.mode === 'edit' ? 'Sửa danh mục' : 'Tạo danh mục mới'}</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Nhập tên, thứ tự hiển thị và trạng thái danh mục.</span></DialogDescription></DialogHeader><CategoryForm submitLabel={dialog?.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo danh mục'} isSubmitting={saveMutation.isPending} defaultValues={dialog?.mode === 'edit' ? { name: dialog.category.name, sortOrder: dialog.category.sortOrder, isActive: dialog.category.isActive } : { name: '', sortOrder: defaultSortOrder, isActive: true }} onSubmit={(values) => saveMutation.mutate(values)} /></DialogContent></Dialog>
      <Dialog open={dialog?.mode === 'delete'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="rounded-2xl border border-admin-gray-200 bg-white p-6 shadow-xl"><DialogHeader><DialogTitle><span className="text-theme-xl font-semibold text-admin-gray-800">Xóa danh mục này?</span></DialogTitle><DialogDescription><span className="mt-1 text-sm text-admin-gray-500">Không thể hoàn tác.</span></DialogDescription></DialogHeader><div className="flex justify-end gap-2"><AdminButton variant="ghost" onClick={() => setDialog(null)}>Hủy</AdminButton><AdminButton variant="destructive" disabled={deleteMutation.isPending} onClick={() => dialog?.mode === 'delete' && deleteMutation.mutate(dialog.category.id)}>{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}</AdminButton></div></DialogContent></Dialog>
    </div>
  )
}
