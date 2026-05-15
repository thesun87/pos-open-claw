import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../../../shared/components/ui/button'
import { Input } from '../../../../shared/components/ui/input'

const schema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên danh mục').max(100, 'Tên danh mục tối đa 100 ký tự'),
  sortOrder: z.coerce.number({ error: 'Thứ tự phải là số' }).int('Thứ tự phải là số nguyên').min(0, 'Thứ tự không được âm'),
  isActive: z.boolean(),
})

export type CategoryFormValues = {
  name: string
  sortOrder: number
  isActive: boolean
}

type CategoryFormProps = {
  defaultValues: CategoryFormValues
  submitLabel: string
  isSubmitting?: boolean
  onSubmit: (values: CategoryFormValues) => void | Promise<void>
}

export function CategoryForm({ defaultValues, submitLabel, isSubmitting = false, onSubmit }: CategoryFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<CategoryFormValues>({ resolver: zodResolver(schema) as Resolver<CategoryFormValues>, defaultValues })
  const isActive = watch('isActive')
  const statusLabel = isActive ? 'Đang dùng' : 'Tạm ẩn'
  return (
    <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="category-name">Tên danh mục</label>
        <Input id="category-name" aria-describedby={errors.name ? 'category-name-error' : undefined} {...register('name')} />
        {errors.name ? <p id="category-name-error" className="text-sm text-danger">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="category-sort-order">Thứ tự hiển thị</label>
        <Input id="category-sort-order" type="number" min={0} aria-describedby={errors.sortOrder ? 'category-sort-error' : undefined} {...register('sortOrder')} />
        {errors.sortOrder ? <p id="category-sort-error" className="text-sm text-danger">{errors.sortOrder.message}</p> : null}
      </div>
      <label className="flex min-h-touch items-center justify-between gap-4 rounded-md border border-border p-3 text-sm font-medium" htmlFor="category-active">
        <span>Trạng thái: {statusLabel}</span>
        <input id="category-active" type="checkbox" className="h-5 w-5 accent-primary" {...register('isActive')} />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : submitLabel}</Button>
      </div>
    </form>
  )
}
