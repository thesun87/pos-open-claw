import type { ReactNode } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { Button, type ButtonProps } from '../ui/button'
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
  variant?: NonNullable<ButtonProps['variant']>
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
    <div className="rounded-lg border border-border bg-surface">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sourceColumn = columns.find((column) => String(column.key) === header.column.id)
                return (
                  <TableHead key={header.id}>
                    {sourceColumn?.sortable ? (
                      <button type="button" className="inline-flex min-h-touch items-center gap-2 rounded-md px-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Sắp xếp theo ${sourceColumn.label}`} onClick={() => handleSort(sourceColumn)}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span aria-hidden="true" className="text-xs">↕</span>
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
              {tableColumns.map((column) => <TableCell key={column.id}><div className="h-4 w-full max-w-32 animate-pulse rounded bg-surface-muted" /></TableCell>)}
            </TableRow>
          )) : table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className={cn(cell.column.id === 'actions' && 'whitespace-nowrap text-right')}>
                  {cell.column.id === 'actions' ? <div className="inline-flex flex-wrap justify-end gap-2">{rowActions.map((action) => {
                    const isDisabled = typeof action.disabled === 'function' ? action.disabled(row.original) : (action.disabled ?? false)
                    return <Button key={action.label} type="button" variant={action.variant ?? 'ghost'} size="sm" disabled={isDisabled} onClick={() => action.onClick(row.original)}>{action.label}</Button>
                  })}</div> : flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={tableColumns.length}>{emptyState ?? <EmptyState title="Chưa có dữ liệu" />}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
