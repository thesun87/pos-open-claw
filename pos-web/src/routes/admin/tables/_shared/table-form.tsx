import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { AdminButton, AdminInput, AdminSelect } from '../../../../shared/components/admin'
import type { AreaDto } from '../../../../features/admin/tables/api'

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên bàn').max(100, 'Tên bàn tối đa 100 ký tự'),
  areaId: z.string().uuid('Vui lòng chọn khu vực'),
  capacity: z.coerce.number({ error: 'Sức chứa phải là số' }).int('Sức chứa phải là số nguyên').min(1, 'Sức chứa tối thiểu là 1'),
  sortOrder: z.coerce.number({ error: 'Thứ tự phải là số' }).int('Thứ tự phải là số nguyên').min(0, 'Thứ tự không được âm'),
  isActive: z.boolean(),
})

export type TableFormValues = {
  name: string
  areaId: string
  capacity: number
  sortOrder: number
  isActive: boolean
}

type TableFormProps = {
  defaultValues: TableFormValues
  areas: AreaDto[]
  submitLabel: string
  isSubmitting?: boolean
  fieldErrors?: Partial<Record<keyof TableFormValues, string>>
  onSubmit: (values: TableFormValues) => void | Promise<void>
}

export function TableForm({ defaultValues, areas, submitLabel, isSubmitting = false, fieldErrors, onSubmit }: TableFormProps) {
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<TableFormValues>({ resolver: zodResolver(schema) as Resolver<TableFormValues>, defaultValues })
  const isActive = watch('isActive')
  const statusLabel = isActive ? 'Đang dùng' : 'Tạm ẩn'
  const hasAreas = areas.length > 0

  useEffect(() => {
    if (fieldErrors?.name) setError('name', { type: 'server', message: fieldErrors.name })
    if (fieldErrors?.areaId) setError('areaId', { type: 'server', message: fieldErrors.areaId })
    if (fieldErrors?.capacity) setError('capacity', { type: 'server', message: fieldErrors.capacity })
    if (fieldErrors?.sortOrder) setError('sortOrder', { type: 'server', message: fieldErrors.sortOrder })
  }, [fieldErrors, setError])

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium text-admin-gray-700" htmlFor="table-name">Tên bàn</label>
        <AdminInput id="table-name" aria-describedby={errors.name ? 'table-name-error' : undefined} {...register('name')} />
        {errors.name ? <p id="table-name-error" className="text-xs text-admin-error-600">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-admin-gray-700" htmlFor="table-area">Khu vực</label>
        <AdminSelect id="table-area" aria-describedby={errors.areaId ? 'table-area-error' : undefined} {...register('areaId')}>
          <option value="">Chọn khu vực</option>
          {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
        </AdminSelect>
        {!hasAreas ? <p className="text-xs text-admin-error-600">Cần tạo khu vực trước khi tạo bàn. <Link className="font-medium underline" to="/admin/tables/areas">Đi tới Khu vực</Link></p> : null}
        {errors.areaId ? <p id="table-area-error" className="text-xs text-admin-error-600">{errors.areaId.message}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-admin-gray-700" htmlFor="table-capacity">Sức chứa</label>
          <AdminInput id="table-capacity" type="number" min={1} aria-describedby={errors.capacity ? 'table-capacity-error' : undefined} {...register('capacity')} />
          {errors.capacity ? <p id="table-capacity-error" className="text-xs text-admin-error-600">{errors.capacity.message}</p> : null}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-admin-gray-700" htmlFor="table-sort-order">Thứ tự hiển thị</label>
          <AdminInput id="table-sort-order" type="number" min={0} aria-describedby={errors.sortOrder ? 'table-sort-error' : undefined} {...register('sortOrder')} />
          {errors.sortOrder ? <p id="table-sort-error" className="text-xs text-admin-error-600">{errors.sortOrder.message}</p> : null}
        </div>
      </div>
      <label className="flex min-h-touch items-center justify-between gap-4 rounded-md border border-admin-gray-200 p-3 text-sm font-medium text-admin-gray-700" htmlFor="table-active">
        <span>Trạng thái: {statusLabel}</span>
        <input id="table-active" type="checkbox" className="h-5 w-5 accent-admin-brand-500" {...register('isActive')} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <AdminButton type="submit" disabled={isSubmitting || !hasAreas} aria-busy={isSubmitting}>{isSubmitting ? 'Đang lưu...' : submitLabel}</AdminButton>
      </div>
    </form>
  )
}
