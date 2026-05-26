import '@testing-library/jest-dom/vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../../../../shared/lib/api-client'
import AppSidebar from './AppSidebar'

vi.mock('../../../../shared/lib/api-client', () => ({ apiClient: { get: vi.fn() } }))
vi.mock('../images/logo/logo-dark.svg', () => ({ default: 'logo-dark.svg' }))
vi.mock('../images/logo/logo-icon.svg', () => ({ default: 'logo-icon.svg' }))
vi.mock('../images/logo/logo.svg', () => ({ default: 'logo.svg' }))
const mockedApi = vi.mocked(apiClient)
function renderSidebar() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); render(<MemoryRouter initialEntries={['/admin']}><QueryClientProvider client={client}><AppSidebar /></QueryClientProvider></MemoryRouter>) }

describe('AppSidebar table mode navigation', () => {
  beforeEach(() => vi.resetAllMocks())
  it('shows table management nav when tableMode is true', async () => { mockedApi.get.mockResolvedValue({ data: { id: 's1', name: 'Store', code: 'S1', tableMode: true, createdAt: '', updatedAt: '' } }); renderSidebar(); expect(await screen.findByText('Quản lý bàn')).toBeInTheDocument(); expect(screen.getByText('Khu vực')).toBeInTheDocument(); expect(screen.getByText('Bàn')).toBeInTheDocument() })
  it('hides table management nav when tableMode is false', async () => { mockedApi.get.mockResolvedValue({ data: { id: 's1', name: 'Store', code: 'S1', tableMode: false, createdAt: '', updatedAt: '' } }); renderSidebar(); expect((await screen.findAllByText('Menu')).length).toBeGreaterThan(0); await waitFor(() => expect(mockedApi.get).toHaveBeenCalled()); expect(screen.queryByText('Quản lý bàn')).not.toBeInTheDocument(); expect(screen.queryByText('Khu vực')).not.toBeInTheDocument() })
})
