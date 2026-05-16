import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../shared/lib/api-client'
import CategoriesPage from './categories-page'

vi.mock('../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const mockedApi = vi.mocked(apiClient)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><CategoriesPage /></QueryClientProvider>)
}

const categories = [{ id: 'c1', name: 'Cà phê', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' }, { id: 'c2', name: 'Trà mới', sortOrder: 20, isActive: false, createdAt: '', updatedAt: '' }]
const menu = { menuVersion: 1, categories: [], products: [{ id: 'p1', name: 'Đen đá', categoryId: 'c1', priceVnd: 10000, isActive: true, sortOrder: 1, optionGroupIds: [] }], optionGroups: [] }

describe('CategoriesPage', () => {
  beforeEach(() => { vi.resetAllMocks(); window.dispatchEvent = vi.fn() })

  it('renders loading then list with product counts and accessible actions', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    renderPage()
    expect(screen.getAllByLabelText('Đang tải dữ liệu').length).toBeGreaterThan(0)
    expect(await screen.findByRole('heading', { name: 'Danh mục sản phẩm' })).toBeInTheDocument()
    expect(await screen.findByText('Cà phê')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByLabelText('Bật danh mục Trà mới')).toBeInTheDocument()
  })

  it('normalizes versioned menu sync response before counting products', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : { menuVersion: 2, hasChanges: true, snapshot: menu } }))
    renderPage()
    expect(await screen.findByText('Cà phê')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('does not crash and shows unknown counts when menu sync has no snapshot', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : { menuVersion: 2, hasChanges: false, snapshot: null } }))
    renderPage()
    expect(await screen.findByText('Cà phê')).toBeInTheDocument()
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('renders empty state', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? [] : menu }))
    renderPage()
    expect(await screen.findByText('Chưa có danh mục nào. Tạo danh mục đầu tiên để bắt đầu.')).toBeInTheDocument()
  })

  it('renders fetch error retry without raw technical details', async () => {
    mockedApi.get.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce({ data: menu })
    renderPage()
    expect(await screen.findByText('Không tải được danh mục')).toBeInTheDocument()
    mockedApi.get.mockResolvedValueOnce({ data: categories })
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Cà phê')).toBeInTheDocument()
    expect(screen.queryByText('ECONNRESET')).not.toBeInTheDocument()
  })

  it('validates and creates category', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    mockedApi.post.mockResolvedValue({ data: { ...categories[0], id: 'c3', name: 'Sinh tố' } })
    renderPage()
    await screen.findByText('Cà phê')
    await userEvent.click(screen.getByRole('button', { name: '+ Tạo danh mục mới' }))
    await userEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }))
    expect(await screen.findByText('Vui lòng nhập tên danh mục')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Sinh tố')
    await userEvent.click(screen.getByRole('button', { name: 'Tạo danh mục' }))
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/categories', expect.objectContaining({ name: 'Sinh tố', sortOrder: 30, isActive: true })))
  })

  it('prefills edit form and updates category', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    mockedApi.patch.mockResolvedValue({ data: { ...categories[0], name: 'Cà phê truyền thống' } })
    renderPage()
    await screen.findByText('Cà phê')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' }).at(0)!)
    const input = screen.getByLabelText('Tên danh mục')
    expect(input).toHaveValue('Cà phê')
    expect(screen.getByText('Trạng thái: Đang dùng')).toBeInTheDocument()
    await userEvent.clear(input)
    await userEvent.type(input, 'Cà phê truyền thống')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/categories/c1', expect.objectContaining({ name: 'Cà phê truyền thống' })))
  })

  it('shows inactive status text when editing inactive category', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    renderPage()
    await screen.findByText('Trà mới')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' }).at(1)!)
    expect(screen.getByText('Trạng thái: Tạm ẩn')).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText('Trạng thái: Tạm ẩn'))
    expect(screen.getByText('Trạng thái: Đang dùng')).toBeInTheDocument()
  })

  it('disables row actions while category mutations trigger refetching', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    mockedApi.patch.mockResolvedValue({ data: { ...categories[0], name: 'Cà phê truyền thống' } })
    renderPage()
    await screen.findByText('Cà phê')
    await userEvent.click(screen.getAllByRole('button', { name: 'Sửa' }).at(0)!)
    await userEvent.clear(screen.getByLabelText('Tên danh mục'))
    await userEvent.type(screen.getByLabelText('Tên danh mục'), 'Cà phê truyền thống')
    const refetchPromise = new Promise<{ data: typeof categories }>(() => undefined)
    mockedApi.get.mockImplementation((url: string) => url === '/categories' ? refetchPromise : Promise.resolve({ data: menu }))
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Sửa' }).at(0)).toBeDisabled())
    expect(screen.getAllByRole('button', { name: 'Xóa' }).at(0)).toBeDisabled()
  })

  it('optimistically toggles active and rolls back on failure', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    mockedApi.patch.mockRejectedValue(new Error('fail'))
    renderPage()
    await screen.findByText('Tạm ẩn')
    await userEvent.click(screen.getByLabelText('Bật danh mục Trà mới'))
    await waitFor(() => expect(mockedApi.patch).toHaveBeenCalledWith('/categories/c2', { isActive: true }))
    expect(await screen.findByLabelText('Bật danh mục Trà mới')).toBeInTheDocument()
  })

  it('deletes category and maps 409 product count', async () => {
    mockedApi.get.mockImplementation((url: string) => Promise.resolve({ data: url === '/categories' ? categories : menu }))
    mockedApi.delete.mockRejectedValueOnce({ response: { data: { detail: 'Danh mục đang chứa 2 sản phẩm; hãy chuyển.' } } }).mockResolvedValueOnce({})
    renderPage()
    await screen.findByText('Cà phê')
    await userEvent.click(screen.getAllByRole('button', { name: 'Xóa' }).at(0)!)
    expect(screen.getByText('Không thể hoàn tác.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    await waitFor(() => expect(window.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Danh mục đang chứa 2 sản phẩm. Xóa hoặc chuyển sản phẩm sang danh mục khác trước.' })))
    await userEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/categories/c1'))
  })
})
