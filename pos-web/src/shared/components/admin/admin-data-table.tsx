import type { ReactNode } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { AdminButton, type AdminButtonProps } from './admin-button'
import { EmptyState } from '../ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { cn } from '../../lib/cn'

export type AdminSortDirection = 'asc' | 'desc'

export type AdminDataTableColumn<T extends object> = {
  key: keyof T | string
  label: string
  render?: (row: T) => ReactNode
  sortable?: boolean
}

export type AdminDataTableRowAction<T extends object> = {
  label: string
  onClick: (row: T) => void
  variant?: AdminButtonProps['variant']
  disabled?: boolean | ((row: T) => boolean)
}

type AdminDataTableProps<T extends object> = {
  columns: AdminDataTableColumn<T>[]
  data: T[]
  rowActions?: AdminDataTableRowAction<T>[]
  onSortChange?: (key: AdminDataTableColumn<T>['key'], direction: AdminSortDirection) => void
  loading?: boolean
  emptyState?: ReactNode
}

function getCellValue<T extends object>(row: T, key: keyof T | string): ReactNode {
  const value = row[key as keyof T]
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return value as ReactNode
}

export function AdminDataTable<T extends object>({ columns, data, rowActions = [], onSortChange, loading = false, emptyState }: AdminDataTableProps<T>) {
  const tableColumns: ColumnDef<T>[] = [
    ...columns.map((column) => ({
      id: String(column.key),
      header: column.label,
      cell: ({ row }) => column.render?.(row.original) ?? getCellValue(row.original, column.key),
    } satisfies ColumnDef<T>)),
    ...(rowActions.length > 0 ? [{ id: 'actions', header: 'Thao tác', cell: () => null } satisfies ColumnDef<T>] : []),
  ]
  const table = useReactTable({ data, columns: tableColumns, getCoreRowModel: getCoreRowModel() })

  const handleSort = (column: AdminDataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return
    const current = table.getColumn(String(column.key))?.getIsSorted()
    const direction: AdminSortDirection = current === 'asc' ? 'desc' : 'asc'
    table.getColumn(String(column.key))?.toggleSorting(direction === 'desc')
    onSortChange(column.key, direction)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-admin-gray-200 bg-white shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-admin-gray-200 bg-admin-gray-50">
              {headerGroup.headers.map((header) => {
                const sourceColumn = columns.find((column) => String(column.key) === header.column.id)
                return (
                  <TableHead key={header.id} className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-admin-gray-500">
                    {sourceColumn?.sortable ? (
                      <button type="button" className="inline-flex items-center gap-1.5 text-admin-gray-500 transition-colors hover:text-admin-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-brand-500" aria-label={`Sắp xếp theo ${sourceColumn.label}`} onClick={() => handleSort(sourceColumn)}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown aria-hidden="true" className="h-3.5 w-3.5" />
                      </button>
                    ) : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? Array.from({ length: 5 }).map((_, rowIndex) => (
            <TableRow key={`skeleton-${rowIndex}`} aria-label="Đang tải dữ liệu">
              {tableColumns.map((column) => <TableCell key={column.id}><div className="h-4 w-full max-w-32 animate-pulse rounded bg-admin-gray-100" /></TableCell>)}
            </TableRow>
          )) : table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="border-b border-admin-gray-100 transition-colors last:border-b-0 hover:bg-admin-gray-50">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn('px-5 py-4 text-sm text-admin-gray-700', cell.column.id === 'actions' && 'whitespace-nowrap text-right')}>
                  {cell.column.id === 'actions' ? <div className="inline-flex flex-wrap justify-end gap-2">{rowActions.map((action) => {
                    const isDisabled = typeof action.disabled === 'function' ? action.disabled(row.original) : (action.disabled ?? false)
                    return <AdminButton key={action.label} type="button" variant={action.variant ?? 'ghost'} size="sm" disabled={isDisabled} onClick={() => action.onClick(row.original)} className={action.label === 'Sửa' ? 'text-admin-brand-600 hover:bg-admin-brand-50' : action.label === 'Xóa' ? 'text-admin-error-600 hover:bg-admin-error-50' : undefined}>{action.label}</AdminButton>
                  })}</div> : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={tableColumns.length} className="px-5 py-8">{emptyState ?? <EmptyState title="Chưa có dữ liệu" />}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
