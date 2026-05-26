import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { AdminButton, AdminInput } from '../../../../shared/components/admin'

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên khu vực').max(100, 'Tên khu vực tối đa 100 ký tự'),
  sortOrder: z.coerce.number({ error: 'Thứ tự phải là số' }).int('Thứ tự phải là số nguyên').min(0, 'Thứ tự không được âm'),
  isActive: z.boolean(),
})

export type AreaFormValues = {
  name: string
  sortOrder: number
  isActive: boolean
}

type AreaFormProps = {
  defaultValues: AreaFormValues
  submitLabel: string
  isSubmitting?: boolean
  fieldErrors?: Partial<Record<keyof AreaFormValues, string>>
  onSubmit: (values: AreaFormValues) => void | Promise<void>
}

export function AreaForm({ defaultValues, submitLabel, isSubmitting = false, fieldErrors, onSubmit }: AreaFormProps) {
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<AreaFormValues>({ resolver: zodResolver(schema) as Resolver<AreaFormValues>, defaultValues })
  const isActive = watch('isActive')
  const statusLabel = isActive ? 'Đang dùng' : 'Tạm ẩn'

  useEffect(() => {
    if (fieldErrors?.name) setError('name', { type: 'server', message: fieldErrors.name })
    if (fieldErrors?.sortOrder) setError('sortOrder', { type: 'server', message: fieldErrors.sortOrder })
  }, [fieldErrors, setError])

  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium text-admin-gray-700" htmlFor="area-name">Tên khu vực</label>
        <AdminInput id="area-name" aria-describedby={errors.name ? 'area-name-error' : undefined} {...register('name')} />
        {errors.name ? <p id="area-name-error" className="text-xs text-admin-error-600">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-admin-gray-700" htmlFor="area-sort-order">Thứ tự hiển thị</label>
        <AdminInput id="area-sort-order" type="number" min={0} aria-describedby={errors.sortOrder ? 'area-sort-error' : undefined} {...register('sortOrder')} />
        {errors.sortOrder ? <p id="area-sort-error" className="text-xs text-admin-error-600">{errors.sortOrder.message}</p> : null}
      </div>
      <label className="flex min-h-touch items-center justify-between gap-4 rounded-md border border-admin-gray-200 p-3 text-sm font-medium text-admin-gray-700" htmlFor="area-active">
        <span>Trạng thái: {statusLabel}</span>
        <input id="area-active" type="checkbox" className="h-5 w-5 accent-admin-brand-500" {...register('isActive')} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <AdminButton type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Đang lưu...' : submitLabel}</AdminButton>
      </div>
    </form>
  )
}
