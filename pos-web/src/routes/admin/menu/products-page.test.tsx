import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import ProductsPage from './products-page'

vi.mock('../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const mockedApi = vi.mocked(apiClient)
function renderPage(route = '/admin/menu/products') { const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }); render(<MemoryRouter initialEntries={[route]}><QueryClientProvider client={client}><ProductsPage /></QueryClientProvider></MemoryRouter>) }
const categories = [{ id: 'c1', name: 'Trà', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' }, { id: 'c2', name: 'Sinh tố', sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' }]
const groups = [{ id: 'g1', name: 'Size', isRequired: true, minSelect: 1, maxSelect: 1, sortOrder: 10, options: [{ id: 'o1', label: 'M', priceDeltaVnd: 0, isDefault: true, sortOrder: 10 }] }, { id: 'g2', name: 'Topping', isRequired: false, minSelect: 0, maxSelect: 2, sortOrder: 20, options: [] }]
const products = [{ id: 'p1', name: 'Trà Đào Cam Sả', categoryId: 'c1', category: { id: 'c1', name: 'Trà' }, priceVnd: 35000, isActive: true, sortOrder: 10, optionGroupIds: ['g1', 'g2'], optionGroups: groups }, { id: 'p2', name: 'Sinh Tố Bơ', categoryId: 'c2', category: { id: 'c2', name: 'Sinh tố' }, priceVnd: 45000, isActive: false, sortOrder: 20, optionGroupIds: [], optionGroups: [] }]
function mockGets() { mockedApi.get.mockImplementation((url: string, config?: { params?: unknown }) => { if (url === '/categories') return Promise.resolve({ data: categories }); if (url === '/option-groups') return Promise.resolve({ data: groups }); if (url === '/products') return Promise.resolve({ data: products, config }); if (url === '/menu') return Promise.resolve({ data: { menuVersion: 1, categories, products, optionGroups: groups } }); return Promise.resolve({ data: [] }) }) }

describe('ProductsPage', () => {
  beforeEach(() => { vi.useRealTimers(); vi.resetAllMocks(); window.dispatchEvent = vi.fn(); mockGets() })
  afterEach(() => { vi.useRealTimers() })
  it('renders products table columns, filters and actions', async () => { renderPage(); expect(await screen.findByRole('heading', { name: 'Sản phẩm' })).toBeInTheDocument(); expect(await screen.findByText('Trà Đào Cam Sả')).toBeInTheDocument(); expect(screen.getByText('35.000 ₫')).toBeInTheDocument(); expect(screen.getByText('Nhóm tùy chọn')).toBeInTheDocument(); expect(screen.getByLabelText('Tạm tắt sản phẩm Trà Đào Cam Sả')).toBeInTheDocument(); expect(screen.getByRole('button', { name: '+ Tạo sản phẩm mới' })).toBeInTheDocument() })
  it('syncs category/search/active filters into product query params', async () => { renderPage('/admin/menu/products?category=c1&search=%C4%90%C3%A0o&active=true'); await screen.findByText('Trà Đào Cam Sả'); await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/products', { params: { categoryId: 'c1', search: 'Đào', isActive: true } })); expect(screen.getByLabelText('Danh mục')).toHaveValue('c1'); expect(screen.getByLabelText('Tìm kiếm')).toHaveValue('Đào'); expect(screen.getByLabelText('Chỉ hiển thị đang bán')).toBeChecked() })

  it('debounces typed search for 300ms before syncing URL/refetching products', async () => {
    vi.useFakeTimers()
    renderPage()
    await vi.waitFor(() => expect(screen.getByText('Trà Đào Cam Sả')).toBeInTheDocument())
    const initialProductCalls = mockedApi.get.mock.calls.filter(([url]) => url === '/products').length
    fireEvent.change(screen.getByLabelText('Tìm kiếm'), { target: { value: 'Bơ' } })
    expect(mockedApi.get.mock.calls.filter(([url]) => url === '/products')).toHaveLength(initialProductCalls)
    act(() => { vi.advanceTimersByTime(299) })
    expect(mockedApi.get.mock.calls.filter(([url]) => url === '/products')).toHaveLength(initialProductCalls)
    act(() => { vi.advanceTimersByTime(1) })
    await vi.waitFor(() => expect(mockedApi.get.mock.calls.filter(([url]) => url === '/products')).toHaveLength(initialProductCalls + 1))
    expect(mockedApi.get).toHaveBeenLastCalledWith('/products', { params: { categoryId: undefined, search: 'Bơ', isActive: undefined } })
  })
  it('validates and creates product', async () => { mockedApi.post.mockResolvedValue({ data: products[0] }); renderPage(); await screen.findByText('Trà Đào Cam Sả'); await userEvent.click(screen.getByRole('button', { name: '+ Tạo sản phẩm mới' })); await userEvent.clear(screen.getByLabelText('Tên sản phẩm')); await userEvent.click(screen.getByRole('button', { name: 'Tạo sản phẩm' })); expect(await screen.findByText('Vui lòng nhập tên sản phẩm')).toBeInTheDocument(); expect(screen.getByText('Thay đổi chỉ áp dụng cho đơn mới. Đơn cũ giữ nguyên giá tại thời điểm bán.')).toBeInTheDocument(); await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Matcha Latte'); await userEvent.clear(screen.getByLabelText('Giá (VND)')); await userEvent.type(screen.getByLabelText('Giá (VND)'), '39000'); await userEvent.click(screen.getByLabelText(/Size/)); await userEvent.click(screen.getByRole('button', { name: 'Tạo sản phẩm' })); await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/products', expect.objectContaining({ name: 'Matcha Latte', categoryId: 'c1', priceVnd: 39000, optionGroupIds: ['g1'], isActive: true }))) })
  it('prefills edit form including category and option groups', async () => { mockedApi.patch.mockResolvedValue({ data: products[0] }); renderPage(); await screen.findByText('Trà Đào Cam Sả'); await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' }).at(0)!); expect(screen.getByLabelText('Tên sản phẩm')).toHaveValue('Trà Đào Cam Sả'); expect(screen.getAllByLabelText('Danh mục').at(1)).toHaveValue('c1'); expect(screen.getByLabelText(/Size/)).toBeChecked(); await userEvent.clear(screen.getByLabelText('Tên sản phẩm')); await userEvent.type(screen.getByLabelText('Tên sản phẩm'), 'Trà đào mới'); await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' })); await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/products/p1', expect.objectContaining({ name: 'Trà đào mới', optionGroupIds: ['g1', 'g2'] }))) })
  it('optimistically toggles active and rolls back on failure', async () => { mockedApi.patch.mockRejectedValue(new Error('fail')); renderPage(); await screen.findByText('Sinh Tố Bơ'); await userEvent.click(screen.getByLabelText('Bật bán sản phẩm Sinh Tố Bơ')); await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/products/p2', { isActive: true })); expect(await screen.findByLabelText('Bật bán sản phẩm Sinh Tố Bơ')).toBeInTheDocument(); expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Không cập nhật được trạng thái. Vui lòng thử lại.' })) })
  it('maps delete 409 to safe toast', async () => { mockedApi.delete.mockRejectedValue({ response: { status: 409, data: { detail: 'FK order item' } } }); renderPage(); await screen.findByText('Trà Đào Cam Sả'); await userEvent.click(screen.getAllByRole('button', { name: 'Xóa' }).at(0)!); expect(screen.getByText(/Lịch sử đơn cũ vẫn giữ nguyên thông tin sản phẩm/)).toBeInTheDocument(); expect(screen.getByText(/Tắt thay vì xóa nếu sẽ bán lại[.]/)).toBeInTheDocument(); await userEvent.click(screen.getByRole('button', { name: 'Xóa' })); await waitFor(() => expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Sản phẩm có trong đơn cũ. Bạn có thể tắt sản phẩm thay vì xóa.' }))) })
})
