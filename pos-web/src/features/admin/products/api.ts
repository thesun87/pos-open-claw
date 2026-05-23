import { apiClient } from '../../../shared/lib/api-client'
import type { CategoryDto } from '../categories/api'
import type { OptionGroupDto } from '../option-groups/api'

export type ProductDto = { id: string; name: string; categoryId: string; category: Pick<CategoryDto, 'id' | 'name'>; priceVnd: number; imageUrl?: string | null; isActive: boolean; sortOrder: number; optionGroupIds: string[]; optionGroups: OptionGroupDto[]; createdAt?: string; updatedAt?: string }
export type ProductFilters = { categoryId?: string; search?: string; isActive?: boolean }
export type ProductMutationDto = { name?: string; categoryId?: string; priceVnd?: number; imageUrl?: string | null; isActive?: boolean; sortOrder?: number; optionGroupIds?: string[] }
export const productsQueryKey = (filters: ProductFilters = {}) => ['admin', 'products', filters] as const
export async function fetchProducts(filters: ProductFilters = {}): Promise<ProductDto[]> { const params: Record<string, string | boolean> = {}; if (filters.categoryId) params.categoryId = filters.categoryId; if (filters.search) params.search = filters.search; if (filters.isActive !== undefined) params.isActive = filters.isActive; const response = await apiClient.get<ProductDto[]>('/products', { params }); return response.data }
export async function createProduct(payload: Required<Pick<ProductMutationDto, 'name' | 'categoryId' | 'priceVnd' | 'sortOrder'>> & Pick<ProductMutationDto, 'isActive' | 'optionGroupIds'>): Promise<ProductDto> { const response = await apiClient.post<ProductDto>('/products', payload); return response.data }
export async function updateProduct(id: string, payload: ProductMutationDto): Promise<ProductDto> { const response = await apiClient.patch<ProductDto>(`/products/${id}`, payload); return response.data }
export async function deleteProduct(id: string): Promise<void> { await apiClient.delete(`/products/${id}`) }
export async function uploadProductImage(file: File): Promise<{ imageUrl: string; publicId: string }> { const form = new FormData(); form.set('file', file); const response = await apiClient.post<{ imageUrl: string; publicId: string }>('/products/images', form, { headers: { 'Content-Type': 'multipart/form-data' } }); return response.data }
