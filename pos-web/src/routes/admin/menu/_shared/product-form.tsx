import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { AdminButton, AdminInput, AdminSelect } from '../../../../shared/components/admin'
import type { CategoryDto } from '../../../../features/admin/categories/api'
import type { OptionGroupDto } from '../../../../features/admin/option-groups/api'
import { uploadProductImage } from '../../../../features/admin/products/api'

const intMin = (label: string) => z.preprocess((v) => v === '' ? undefined : v, z.coerce.number({ error: `${label} phải là số` }).int(`${label} phải là số nguyên`).min(0, `${label} không được âm`))
const schema = z.object({ name: z.string().trim().min(1, 'Vui lòng nhập tên sản phẩm').max(200, 'Tên sản phẩm tối đa 200 ký tự'), categoryId: z.string().min(1, 'Vui lòng chọn danh mục'), priceVnd: intMin('Giá'), imageUrl: z.string().url('URL hình ảnh không hợp lệ').nullable().or(z.literal('')), optionGroupIds: z.array(z.string()), isActive: z.boolean(), sortOrder: intMin('Thứ tự') })
export type ProductFormValues = z.infer<typeof schema>
type Props = { defaultValues: ProductFormValues; categories: CategoryDto[]; optionGroups: OptionGroupDto[]; submitLabel: string; isSubmitting?: boolean; errorMessage?: string | null; onSubmit: (values: ProductFormValues) => void | Promise<void> }

export function ProductForm({ defaultValues, categories, optionGroups, submitLabel, isSubmitting = false, errorMessage, onSubmit }: Props) {
  const knownIds = new Set(optionGroups.map((g) => g.id))
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormValues>({ resolver: zodResolver(schema.refine((v) => v.optionGroupIds.every((id) => knownIds.has(id)), { path: ['optionGroupIds'], message: 'Nhóm tùy chọn không hợp lệ' })) as Resolver<ProductFormValues>, defaultValues })
  const isActive = watch('isActive')
  const imageUrl = watch('imageUrl') || ''

  async function handleImageChange(file: File | undefined) {
    if (!file) return
    setUploadError(null)
    setIsUploading(true)
    try {
      const uploaded = await uploadProductImage(file)
      setValue('imageUrl', uploaded.imageUrl, { shouldDirty: true, shouldValidate: true })
    } catch {
      setUploadError('Upload hình ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setIsUploading(false)
    }
  }

  return <form className="mt-4 space-y-5" onSubmit={handleSubmit((values) => onSubmit({ ...values, imageUrl: values.imageUrl || null }))} noValidate>{errorMessage ? <div role="alert" className="rounded-md border border-danger/40 p-3 text-xs text-admin-error-600">{errorMessage}</div> : null}<p className="rounded-md bg-surface-muted p-3 text-sm text-text-secondary">Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán.</p><div className="space-y-2"><label className="text-sm font-medium text-admin-gray-700" htmlFor="product-name">Tên sản phẩm</label><AdminInput id="product-name" {...register('name')} />{errors.name ? <p className="text-xs text-admin-error-600">{errors.name.message}</p> : null}</div><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><label className="text-sm font-medium text-admin-gray-700" htmlFor="product-category">Danh mục</label><AdminSelect id="product-category" className="min-h-touch w-full rounded-md border border-admin-gray-200 bg-surface px-3 py-2" {...register('categoryId')}><option value="">Chọn danh mục</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</AdminSelect>{errors.categoryId ? <p className="text-xs text-admin-error-600">{errors.categoryId.message}</p> : null}</div><div className="space-y-2"><label className="text-sm font-medium text-admin-gray-700" htmlFor="product-price">Giá (VND)</label><AdminInput id="product-price" type="number" min={0} {...register('priceVnd')} />{errors.priceVnd ? <p className="text-xs text-admin-error-600">{errors.priceVnd.message}</p> : null}</div></div><div className="space-y-3 rounded-md border border-admin-gray-200 p-3"><div className="flex items-center justify-between gap-3"><div><label className="text-sm font-medium text-admin-gray-700" htmlFor="product-image">Hình ảnh sản phẩm</label><p className="text-xs text-text-secondary">Không bắt buộc. Hỗ trợ JPG, PNG, WebP, GIF tối đa 5MB.</p></div>{imageUrl ? <AdminButton type="button" variant="secondary" onClick={() => setValue('imageUrl', null, { shouldDirty: true, shouldValidate: true })}>Xóa hình</AdminButton> : null}</div>{imageUrl ? <img src={imageUrl} alt="Xem trước hình sản phẩm" className="h-28 w-28 rounded-lg border border-admin-gray-200 object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-dashed border-admin-gray-300 text-xs text-text-secondary">Chưa có hình</div>}<input id="product-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={isUploading} onChange={(event) => void handleImageChange(event.target.files?.[0])} />{isUploading ? <p className="text-xs text-text-secondary">Đang upload...</p> : null}{uploadError ? <p className="text-xs text-admin-error-600">{uploadError}</p> : null}{errors.imageUrl ? <p className="text-xs text-admin-error-600">{errors.imageUrl.message}</p> : null}<input type="hidden" {...register('imageUrl')} /></div><fieldset className="space-y-2 rounded-md border border-admin-gray-200 p-3"><legend className="px-1 text-sm font-medium text-admin-gray-700">Nhóm tùy chọn</legend>{optionGroups.length ? optionGroups.map((g) => <label key={g.id} className="flex min-h-touch items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-admin-brand-500" value={g.id} {...register('optionGroupIds')} />{g.name} <span className="text-text-secondary">({g.options.length} tùy chọn)</span></label>) : <p className="text-sm text-text-secondary">Chưa có nhóm tùy chọn.</p>}{errors.optionGroupIds ? <p className="text-xs text-admin-error-600">{errors.optionGroupIds.message}</p> : null}</fieldset><div className="grid gap-4 md:grid-cols-2"><label className="flex min-h-touch items-center justify-between gap-4 rounded-md border border-admin-gray-200 p-3 text-sm font-medium text-admin-gray-700" htmlFor="product-active"><span>{isActive ? 'Đang bán' : 'Tạm tắt'}</span><input id="product-active" type="checkbox" className="h-5 w-5 accent-admin-brand-500" {...register('isActive')} /></label><div className="space-y-2"><label className="text-sm font-medium text-admin-gray-700" htmlFor="product-sort">Thứ tự</label><AdminInput id="product-sort" type="number" min={0} {...register('sortOrder')} />{errors.sortOrder ? <p className="text-xs text-admin-error-600">{errors.sortOrder.message}</p> : null}</div></div><div className="flex justify-end gap-2 pt-2"><AdminButton type="submit" disabled={isSubmitting || isUploading}>{isSubmitting ? 'Đang lưu...' : submitLabel}</AdminButton></div></form>
}
