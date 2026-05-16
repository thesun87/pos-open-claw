import { useMemo, useState } from 'react'
import type { TopProductRow } from '../../../../features/admin/reports/api'
import { formatVnd } from '../../../../shared/lib/format-vnd'

const numberFormatter = new Intl.NumberFormat('vi-VN')

type SortMode = 'quantity' | 'revenue'

type TopProductsTableProps = {
  data: TopProductRow[]
  isUpdating?: boolean
}

function compareByName(a: TopProductRow, b: TopProductRow) {
  return a.productName.localeCompare(b.productName, 'vi')
}

function sortProducts(data: TopProductRow[], sortMode: SortMode) {
  return [...data]
    .sort((a, b) => {
      const primary = sortMode === 'revenue'
        ? b.totalRevenue - a.totalRevenue
        : b.totalQuantity - a.totalQuantity
      return primary || compareByName(a, b)
    })
    .slice(0, 10)
}

function RankCell({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-surface-muted px-2 text-xs font-medium" aria-label={`Top ${rank}`}>
        Top {rank}
      </span>
    )
  }
  return <span>{rank}</span>
}

export function TopProductsTable({ data, isUpdating = false }: TopProductsTableProps) {
  const [sortMode, setSortMode] = useState<SortMode>('quantity')
  const sortedProducts = useMemo(() => sortProducts(data, sortMode), [data, sortMode])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {isUpdating ? (
          <span className="text-xs font-medium text-primary" aria-live="polite">
            Đang cập nhật
          </span>
        ) : (
          <span className="text-xs text-text-secondary">Tối đa 10 sản phẩm</span>
        )}

        <div className="flex flex-wrap gap-2" aria-label="Sắp xếp top sản phẩm">
          <button
            type="button"
            className="min-h-11 rounded-md border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-pressed={sortMode === 'quantity'}
            onClick={() => setSortMode('quantity')}
          >
            Sắp xếp theo số lượng
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-border px-3 py-2 text-xs font-medium text-text-primary hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-pressed={sortMode === 'revenue'}
            onClick={() => setSortMode('revenue')}
          >
            Sắp xếp theo doanh thu
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Top sản phẩm bán chạy</caption>
          <thead className="bg-surface-muted text-text-secondary">
            <tr>
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Sản phẩm</th>
              <th className="px-3 py-2 font-medium" aria-sort={sortMode === 'quantity' ? 'descending' : 'none'}>Số lượng</th>
              <th className="px-3 py-2 font-medium" aria-sort={sortMode === 'revenue' ? 'descending' : 'none'}>Doanh thu</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((row, index) => (
              <tr key={`${row.productName}-${index}`} className="border-t border-border">
                <td className="px-3 py-2"><RankCell rank={index + 1} /></td>
                <td className="px-3 py-2 font-medium text-text-primary">{row.productName}</td>
                <td className="px-3 py-2">{numberFormatter.format(row.totalQuantity)}</td>
                <td className="px-3 py-2">{formatVnd(row.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
