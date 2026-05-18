import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AdminDataTable, type AdminDataTableColumn } from './admin-data-table'

type Row = { id: string; name: string; status: string }
const columns: AdminDataTableColumn<Row>[] = [{ key: 'name', label: 'Tên', sortable: true }, { key: 'status', label: 'Trạng thái' }]
const data: Row[] = [{ id: '1', name: 'Cà phê', status: 'Đang bán' }]

describe('AdminDataTable', () => {
  it('renders columns, data, row action and sort callback', async () => {
    const onAction = vi.fn(); const onSort = vi.fn()
    render(<AdminDataTable columns={columns} data={data} onSortChange={onSort} rowActions={[{ label: 'Sửa', onClick: onAction, variant: 'secondary' }]} />)
    expect(screen.getByText('Cà phê')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(onAction).toHaveBeenCalledWith(data[0])
    await userEvent.click(screen.getByRole('button', { name: 'Sắp xếp theo Tên' }))
    expect(onSort).toHaveBeenCalledWith('name', 'asc')
  })

  it('renders 5 skeleton rows while loading and no row actions', () => {
    render(<AdminDataTable columns={columns} data={data} loading rowActions={[{ label: 'Xóa', onClick: vi.fn(), variant: 'destructive' }]} />)
    expect(screen.getAllByLabelText('Đang tải dữ liệu')).toHaveLength(5)
    expect(screen.queryByRole('button', { name: 'Xóa' })).not.toBeInTheDocument()
  })

  it('renders fallback and custom empty states', () => {
    const { rerender } = render(<AdminDataTable columns={columns} data={[]} />)
    expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument()
    rerender(<AdminDataTable columns={columns} data={[]} emptyState={<div>Không có sản phẩm</div>} />)
    expect(screen.getByText('Không có sản phẩm')).toBeInTheDocument()
  })
})
