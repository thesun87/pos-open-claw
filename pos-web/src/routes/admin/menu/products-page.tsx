import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { AdminDataTable, type AdminDataTableColumn } from '../../../shared/components/admin/admin-data-table'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { StatusBadge } from '../../../shared/components/ui/status-badge'
import { formatVnd } from '../../../shared/lib/format-vnd'
import { adminMenuQueryKey, categoriesQueryKey, fetchCategories } from '../../../features/admin/categories/api'
import { fetchOptionGroups, optionGroupsQueryKey } from '../../../features/admin/option-groups/api'
import { createProduct, deleteProduct, fetchProducts, productsQueryKey, updateProduct, type ProductDto } from '../../../features/admin/products/api'
import { ProductForm, type ProductFormValues } from './_shared/product-form'

type DialogState = { mode: 'create' } | { mode: 'edit'; product: ProductDto } | { mode: 'delete'; product: ProductDto } | null
const toast = (detail: string) => window.dispatchEvent(new CustomEvent('toast', { detail }))
function safeSaveError(error: unknown): string { const status = (error as AxiosError)?.response?.status; return status === 400 || status === 422 ? 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.' : 'Không lưu được sản phẩm. Vui lòng thử lại.' }
function safeDeleteError(error: unknown): string { return (error as AxiosError)?.response?.status === 409 ? 'Sản phẩm có trong đơn cũ. Bạn có thể tắt sản phẩm thay vì xóa.' : 'Không xóa được sản phẩm. Vui lòng thử lại.' }
function toFormValues(product: ProductDto): ProductFormValues { return { name: product.name, categoryId: product.categoryId, priceVnd: product.priceVnd, optionGroupIds: product.optionGroupIds ?? product.optionGroups.map((g) => g.id), isActive: product.isActive, sortOrder: product.sortOrder } }

export default function ProductsPage() {
  const queryClient = useQueryClient(); const [searchParams, setSearchParams] = useSearchParams(); const [dialog, setDialog] = useState<DialogState>(null); const [formError, setFormError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState(searchParams.get('search') ?? '')
  const categoryId = searchParams.get('category') ?? ''; const debouncedSearch = searchParams.get('search') ?? ''; const activeOnly = searchParams.get('active') === 'true'
  useEffect(() => {
    const nextValue = searchText.trim()
    if (nextValue === (searchParams.get('search') ?? '')) return undefined
    const handle = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (nextValue) next.set('search', nextValue); else next.delete('search')
        return next
      }, { replace: true })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchText, searchParams, setSearchParams])
  const filters = useMemo(() => ({ categoryId: categoryId || undefined, search: debouncedSearch || undefined, isActive: activeOnly ? true : undefined }), [categoryId, debouncedSearch, activeOnly])
  const productsKey = productsQueryKey(filters)
  const productsQuery = useQuery({ queryKey: productsKey, queryFn: () => fetchProducts(filters) })
  const categoriesQuery = useQuery({ queryKey: categoriesQueryKey, queryFn: fetchCategories })
  const groupsQuery = useQuery({ queryKey: optionGroupsQueryKey, queryFn: fetchOptionGroups })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const sortedProducts = useMemo(() => [...products].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'vi')), [products])
  const defaultSortOrder = products.length ? Math.max(...products.map((p) => p.sortOrder)) + 10 : 10
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }); void queryClient.invalidateQueries({ queryKey: adminMenuQueryKey }) }
  const saveMutation = useMutation({ mutationFn: (values: ProductFormValues) => dialog?.mode === 'edit' ? updateProduct(dialog.product.id, values) : createProduct(values), onSuccess: () => { toast(dialog?.mode === 'edit' ? 'Đã cập nhật sản phẩm' : 'Đã tạo sản phẩm'); setDialog(null); setFormError(null); invalidate() }, onError: (error) => setFormError(safeSaveError(error)) })
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteProduct(id), onSuccess: () => { toast('Đã xóa sản phẩm'); setDialog(null); invalidate() }, onError: (error) => toast(safeDeleteError(error)) })
  const toggleMutation = useMutation({ mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateProduct(id, { isActive }), onMutate: async ({ id, isActive }) => { await queryClient.cancelQueries({ queryKey: ['admin', 'products'] }); const previous = queryClient.getQueryData<ProductDto[]>(productsKey); queryClient.setQueryData<ProductDto[]>(productsKey, (old) => old?.map((p) => p.id === id ? { ...p, isActive } : p)); return { previous } }, onError: (_e, _v, ctx) => { queryClient.setQueryData(productsKey, ctx?.previous); toast('Không cập nhật được trạng thái. Vui lòng thử lại.') }, onSettled: invalidate })
  const updateParam = (key: string, value: string | null) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next })
  const columns = useMemo<AdminDataTableColumn<ProductDto>[]>(() => [{ key: 'name', label: 'Tên sản phẩm', sortable: true }, { key: 'category', label: 'Danh mục', render: (row) => row.category?.name ?? '—' }, { key: 'priceVnd', label: 'Giá', sortable: true, render: (row) => formatVnd(row.priceVnd) }, { key: 'optionGroupsCount', label: 'Nhóm tùy chọn', render: (row) => row.optionGroups?.length ?? row.optionGroupIds?.length ?? 0 }, { key: 'isActive', label: 'Trạng thái', render: (row) => <div className="flex min-h-touch items-center gap-3"><StatusBadge variant={row.isActive ? 'success' : 'neutral'} label={row.isActive ? 'Đang bán' : 'Tạm tắt'} /><button type="button" className="rounded-md border border-border px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`${row.isActive ? 'Tạm tắt' : 'Bật bán'} sản phẩm ${row.name}`} disabled={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: row.id, isActive: !row.isActive })}>{row.isActive ? 'Tắt' : 'Bật'}</button></div> }, { key: 'sortOrder', label: 'Thứ tự', sortable: true }], [toggleMutation])
  const openCreate = () => { setFormError(null); setDialog({ mode: 'create' }) }; const openEdit = (product: ProductDto) => { setFormError(null); setDialog({ mode: 'edit', product }) }
  const formDefaults = dialog?.mode === 'edit' ? toFormValues(dialog.product) : { name: '', categoryId: categoriesQuery.data?.[0]?.id ?? '', priceVnd: 0, optionGroupIds: [], isActive: true, sortOrder: defaultSortOrder }
  return <section className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Sản phẩm</h1><p className="text-sm text-text-secondary">Quản lý sản phẩm, giá, danh mục, nhóm tùy chọn và trạng thái bán.</p></div><Button onClick={openCreate}>+ Tạo sản phẩm mới</Button></div><div className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-[1fr_1fr_auto]"><label className="space-y-1 text-sm font-medium">Danh mục<select className="min-h-touch w-full rounded-md border border-border bg-surface px-3 py-2" value={categoryId} onChange={(e) => updateParam('category', e.target.value || null)}><option value="">Tất cả danh mục</option>{(categoriesQuery.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="space-y-1 text-sm font-medium">Tìm kiếm<input className="min-h-touch w-full rounded-md border border-border bg-surface px-3 py-2" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Nhập tên sản phẩm" /></label><label className="flex min-h-touch items-center gap-2 self-end text-sm font-medium"><input type="checkbox" className="h-4 w-4 accent-primary" checked={activeOnly} onChange={(e) => updateParam('active', e.target.checked ? 'true' : null)} />Chỉ hiển thị đang bán</label></div>{productsQuery.isError ? <div className="rounded-lg border border-danger/40 bg-surface p-6"><h2 className="font-semibold">Không tải được sản phẩm</h2><p className="mt-1 text-sm text-text-secondary">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p><Button className="mt-4" onClick={() => void productsQuery.refetch()}>Thử lại</Button></div> : <AdminDataTable columns={columns} data={sortedProducts} loading={productsQuery.isLoading || categoriesQuery.isLoading || groupsQuery.isLoading} emptyState={<EmptyState title="Không có sản phẩm trong danh mục này." />} rowActions={[{ label: 'Sửa', disabled: productsQuery.isFetching || saveMutation.isPending || deleteMutation.isPending, onClick: openEdit }, { label: 'Xóa', variant: 'destructive', disabled: productsQuery.isFetching || saveMutation.isPending || deleteMutation.isPending, onClick: (product) => setDialog({ mode: 'delete', product }) }]} />}<Dialog open={dialog?.mode === 'create' || dialog?.mode === 'edit'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="w-[min(96vw,48rem)] max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{dialog?.mode === 'edit' ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}</DialogTitle><DialogDescription>Thiết lập danh mục, giá, nhóm tùy chọn, trạng thái và thứ tự hiển thị.</DialogDescription></DialogHeader>{dialog?.mode === 'create' || dialog?.mode === 'edit' ? <ProductForm errorMessage={formError} categories={categoriesQuery.data ?? []} optionGroups={groupsQuery.data ?? []} defaultValues={formDefaults} submitLabel={dialog.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo sản phẩm'} isSubmitting={saveMutation.isPending} onSubmit={(values) => saveMutation.mutate(values)} /> : null}</DialogContent></Dialog><Dialog open={dialog?.mode === 'delete'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Xóa sản phẩm này?</DialogTitle><DialogDescription>Lịch sử đơn cũ vẫn giữ nguyên thông tin sản phẩm. Tắt thay vì xóa nếu sẽ bán lại.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDialog(null)}>Hủy</Button><Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => dialog?.mode === 'delete' && deleteMutation.mutate(dialog.product.id)}>{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}</Button></div></DialogContent></Dialog></section>
}
