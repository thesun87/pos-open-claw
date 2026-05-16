import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { AdminDataTable, type AdminDataTableColumn } from '../../../shared/components/admin/admin-data-table'
import { Button } from '../../../shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog'
import { EmptyState } from '../../../shared/components/ui/empty-state'
import { StatusBadge } from '../../../shared/components/ui/status-badge'
import { adminMenuQueryKey, createOptionGroup, deleteOptionGroup, fetchOptionGroups, optionGroupsQueryKey, updateOptionGroup, type OptionGroupDto } from '../../../features/admin/option-groups/api'
import { OptionGroupForm, type OptionGroupFormValues } from './_shared/option-group-form'

type DialogState = { mode: 'create' } | { mode: 'edit'; group: OptionGroupDto } | { mode: 'delete'; group: OptionGroupDto } | null
function parseDeleteError(error: unknown): string { const detail = (error as AxiosError<{ detail?: string }>)?.response?.data?.detail ?? ''; const count = detail.match(/(\d+)/)?.[1]; return `${count ? `Nhóm đang gán cho ${count} sản phẩm. ` : ''}Bỏ gán nhóm tùy chọn khỏi sản phẩm trước khi xóa` }
function safeSaveError(error: unknown): string { const status = (error as AxiosError)?.response?.status; return status === 400 ? 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.' : 'Không lưu được nhóm tùy chọn. Vui lòng thử lại.' }
function toFormValues(group: OptionGroupDto): OptionGroupFormValues { return { name: group.name, isRequired: group.isRequired, minSelect: group.minSelect, maxSelect: group.maxSelect, sortOrder: group.sortOrder, options: group.options.map((o) => ({ id: o.id, label: o.label, priceDeltaVnd: o.priceDeltaVnd, isDefault: o.isDefault, sortOrder: o.sortOrder })) } }

export default function OptionGroupsPage() {
  const queryClient = useQueryClient(); const [dialog, setDialog] = useState<DialogState>(null); const [formError, setFormError] = useState<string | null>(null)
  const groupsQuery = useQuery({ queryKey: optionGroupsQueryKey, queryFn: fetchOptionGroups })
  const groups = groupsQuery.data ?? []; const defaultSortOrder = groups.length ? Math.max(...groups.map((g) => g.sortOrder)) + 10 : 10
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: optionGroupsQueryKey }); void queryClient.invalidateQueries({ queryKey: adminMenuQueryKey }) }
  const saveMutation = useMutation({ mutationFn: (values: OptionGroupFormValues) => dialog?.mode === 'edit' ? updateOptionGroup(dialog.group.id, values) : createOptionGroup(values), onSuccess: () => { window.dispatchEvent(new CustomEvent('toast', { detail: 'Đã lưu nhóm tùy chọn' })); setDialog(null); setFormError(null); invalidate() }, onError: (error) => setFormError(safeSaveError(error)) })
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteOptionGroup(id), onSuccess: () => { window.dispatchEvent(new CustomEvent('toast', { detail: 'Đã xóa nhóm tùy chọn' })); setDialog(null); invalidate() }, onError: (error) => window.dispatchEvent(new CustomEvent('toast', { detail: parseDeleteError(error) })) })
  const columns = useMemo<AdminDataTableColumn<OptionGroupDto>[]>(() => [
    { key: 'name', label: 'Tên nhóm', sortable: true },
    { key: 'isRequired', label: 'Quy tắc', render: (row) => <StatusBadge variant={row.isRequired ? 'warning' : 'neutral'} label={row.isRequired ? 'Bắt buộc' : 'Không bắt buộc'} /> },
    { key: 'minMax', label: 'Min/Max', render: (row) => `${row.minSelect}-${row.maxSelect}` },
    { key: 'optionsCount', label: 'Số tùy chọn', render: (row) => row.options.length },
    { key: 'sortOrder', label: 'Thứ tự', sortable: true },
  ], [])
  const openCreate = () => { setFormError(null); setDialog({ mode: 'create' }) }; const openEdit = (group: OptionGroupDto) => { setFormError(null); setDialog({ mode: 'edit', group }) }
  return <section className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Nhóm tùy chọn</h1><p className="text-sm text-text-secondary">Quản lý nhóm tùy chọn, lựa chọn con, min/max và thứ tự hiển thị.</p></div><Button onClick={openCreate}>+ Tạo nhóm tùy chọn</Button></div>{groupsQuery.isError ? <div className="rounded-lg border border-danger/40 bg-surface p-6"><h2 className="font-semibold">Không tải được nhóm tùy chọn</h2><p className="mt-1 text-sm text-text-secondary">Vui lòng thử lại. Dữ liệu kỹ thuật đã được ẩn để bảo vệ hệ thống.</p><Button className="mt-4" onClick={() => void groupsQuery.refetch()}>Thử lại</Button></div> : <AdminDataTable columns={columns} data={groups} loading={groupsQuery.isLoading} emptyState={<EmptyState title="Chưa có nhóm tùy chọn nào. Tạo nhóm đầu tiên để bắt đầu." />} rowActions={[{ label: 'Sửa', disabled: groupsQuery.isFetching || saveMutation.isPending || deleteMutation.isPending, onClick: openEdit }, { label: 'Xóa', variant: 'destructive', disabled: groupsQuery.isFetching || saveMutation.isPending || deleteMutation.isPending, onClick: (group) => setDialog({ mode: 'delete', group }) }]} />}
    <Dialog open={dialog?.mode === 'create' || dialog?.mode === 'edit'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent className="w-[min(96vw,48rem)] max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{dialog?.mode === 'edit' ? 'Sửa nhóm tùy chọn' : 'Tạo nhóm tùy chọn'}</DialogTitle><DialogDescription>Thiết lập quy tắc chọn và quản lý tùy chọn con inline.</DialogDescription></DialogHeader>{dialog?.mode === 'create' || dialog?.mode === 'edit' ? <OptionGroupForm errorMessage={formError} submitLabel={dialog.mode === 'edit' ? 'Lưu thay đổi' : 'Tạo nhóm tùy chọn'} isSubmitting={saveMutation.isPending} defaultValues={dialog.mode === 'edit' ? toFormValues(dialog.group) : { name: '', isRequired: false, minSelect: 0, maxSelect: 1, sortOrder: defaultSortOrder, options: [{ label: '', priceDeltaVnd: 0, isDefault: false, sortOrder: 10 }] }} onSubmit={(values) => saveMutation.mutate(values)} /> : null}</DialogContent></Dialog>
    <Dialog open={dialog?.mode === 'delete'} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>Xóa nhóm tùy chọn này?</DialogTitle><DialogDescription>Không thể hoàn tác. Nếu nhóm đang gán cho sản phẩm, hệ thống sẽ chặn xóa.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDialog(null)}>Hủy</Button><Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => dialog?.mode === 'delete' && deleteMutation.mutate(dialog.group.id)}>{deleteMutation.isPending ? 'Đang xóa...' : 'Xóa'}</Button></div></DialogContent></Dialog></section>
}
