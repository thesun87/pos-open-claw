import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AreaDto, TableDto } from '../api'
import { AreaTabs } from './area-tabs'

const areas: AreaDto[] = [
  { id: 'area-1', name: 'Quầy chính', sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'area-2', name: 'Sân ngoài', sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
]

const tables: TableDto[] = [
  { id: 'tbl-1', areaId: 'area-1', name: 'Bàn 1', capacity: 2, sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-2', areaId: 'area-1', name: 'Bàn 2', capacity: 2, sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-3', areaId: 'area-1', name: 'Bàn 3', capacity: 2, sortOrder: 30, isActive: false, createdAt: '', updatedAt: '' }, // inactive — excluded from totalCount
  { id: 'tbl-4', areaId: 'area-2', name: 'Bàn 4', capacity: 4, sortOrder: 10, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-5', areaId: 'area-2', name: 'Bàn 5', capacity: 4, sortOrder: 20, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-6', areaId: 'area-2', name: 'Bàn 6', capacity: 4, sortOrder: 30, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'tbl-7', areaId: 'area-2', name: 'Bàn 7', capacity: 4, sortOrder: 40, isActive: true, createdAt: '', updatedAt: '' },
]

const statusMap = new Map([
  ['tbl-1', 'empty' as const],
  ['tbl-2', 'serving' as const],
  ['tbl-4', 'empty' as const],
  ['tbl-5', 'empty' as const],
  ['tbl-6', 'serving' as const],
  ['tbl-7', 'empty' as const],
])

function renderTabs(selectedAreaId: string | null = 'area-1', onSelect = vi.fn()) {
  return render(
    <AreaTabs
      areas={areas}
      tables={tables}
      statusByTableId={statusMap}
      selectedAreaId={selectedAreaId}
      onSelect={onSelect}
    />,
  )
}

describe('AreaTabs', () => {
  it('renders tablist with correct role and aria-label', () => {
    renderTabs()
    expect(screen.getByRole('tablist', { name: 'Khu vực' })).toBeInTheDocument()
  })

  it('renders correct freeCount/totalCount for each area', () => {
    renderTabs()
    // area-1: 2 active tables, 1 empty (tbl-1), 1 serving (tbl-2) → 1/2
    expect(screen.getByRole('tab', { name: 'Quầy chính · 1/2' })).toBeInTheDocument()
    // area-2: 4 active tables, 3 empty (tbl-4, tbl-5, tbl-7), 1 serving (tbl-6) → 3/4
    expect(screen.getByRole('tab', { name: 'Sân ngoài · 3/4' })).toBeInTheDocument()
  })

  it('marks selected tab with aria-selected=true', () => {
    renderTabs('area-1')
    const activeTab = screen.getByRole('tab', { name: 'Quầy chính · 1/2' })
    expect(activeTab).toHaveAttribute('aria-selected', 'true')
    const otherTab = screen.getByRole('tab', { name: 'Sân ngoài · 3/4' })
    expect(otherTab).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onSelect with correct areaId when tab is clicked', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    renderTabs('area-1', onSelect)
    await user.click(screen.getByRole('tab', { name: 'Sân ngoài · 3/4' }))
    expect(onSelect).toHaveBeenCalledWith('area-2')
  })

  it('renders nothing when areas is empty', () => {
    render(
      <AreaTabs
        areas={[]}
        tables={tables}
        statusByTableId={statusMap}
        selectedAreaId={null}
        onSelect={vi.fn()}
      />,
    )
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })

  it('handles ArrowRight key to move focus to next tab', async () => {
    const user = userEvent.setup()
    renderTabs('area-1')
    const firstTab = screen.getByRole('tab', { name: 'Quầy chính · 1/2' })
    const secondTab = screen.getByRole('tab', { name: 'Sân ngoài · 3/4' })
    firstTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(secondTab)
  })

  it('handles ArrowLeft key to move focus to previous tab', async () => {
    const user = userEvent.setup()
    renderTabs('area-2')
    const firstTab = screen.getByRole('tab', { name: 'Quầy chính · 1/2' })
    const secondTab = screen.getByRole('tab', { name: 'Sân ngoài · 3/4' })
    secondTab.focus()
    await user.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(firstTab)
  })

  it('wraps focus on ArrowRight from last tab', async () => {
    const user = userEvent.setup()
    renderTabs('area-2')
    const firstTab = screen.getByRole('tab', { name: 'Quầy chính · 1/2' })
    const lastTab = screen.getByRole('tab', { name: 'Sân ngoài · 3/4' })
    lastTab.focus()
    await user.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(firstTab)
  })

  it('excludes inactive tables from counts', () => {
    renderTabs()
    // tbl-3 is inactive → excluded from area-1 totalCount (should be 2, not 3)
    expect(screen.getByRole('tab', { name: 'Quầy chính · 1/2' })).toBeInTheDocument()
  })
})
