import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionCard } from './section-card'

describe('SectionCard', () => {
  it('renders title', () => {
    render(<SectionCard title="Doanh thu theo ngày">content</SectionCard>)
    expect(screen.getByText('Doanh thu theo ngày')).toBeInTheDocument()
  })

  it('renders children when not loading or empty', () => {
    render(<SectionCard title="Test">child content</SectionCard>)
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('renders LoadingSkeleton.Card when loading=true', () => {
    render(<SectionCard title="Test" loading>children</SectionCard>)
    const status = screen.getByRole('status', { name: /đang tải/i })
    expect(status).toBeInTheDocument()
    expect(screen.queryByText('children')).not.toBeInTheDocument()
  })

  it('renders EmptyState when empty=true', () => {
    render(<SectionCard title="Test" empty>children</SectionCard>)
    expect(screen.getByText('Chưa có đơn đã đồng bộ trong khoảng ngày này.')).toBeInTheDocument()
    expect(screen.queryByText('children')).not.toBeInTheDocument()
  })

  it('renders custom emptyTitle and emptyDescription', () => {
    render(
      <SectionCard title="Test" empty emptyTitle="Trống" emptyDescription="Mô tả">
        children
      </SectionCard>,
    )
    expect(screen.getByText('Trống')).toBeInTheDocument()
    expect(screen.getByText('Mô tả')).toBeInTheDocument()
  })

  it('loading takes priority over empty', () => {
    render(
      <SectionCard title="Test" loading empty>
        children
      </SectionCard>,
    )
    expect(screen.getByRole('status', { name: /đang tải/i })).toBeInTheDocument()
    expect(screen.queryByText('Chưa có đơn')).not.toBeInTheDocument()
  })
})
