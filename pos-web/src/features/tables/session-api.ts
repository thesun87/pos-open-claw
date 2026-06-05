/**
 * Session API module — Story 6.8 Tier A
 *
 * Consumes BE Story 6.11 endpoints:
 *   POST /tables/:tableId/sessions  → open a session (idempotent via clientSessionId)
 *   POST /tables/sessions/:id/settle → settle a session (:id = SERVER session id — NOT clientSessionId)
 *
 * Boundary §8: only imports from shared/. No cross-feature imports.
 */
import { apiClient } from '../../shared/lib/api-client'

export interface TableSessionDto {
  id: string
  tableId: string
  status: 'open' | 'settled'
  openedByDevice: string
  openedAt: string
  clientSessionId: string
  createdAt: string
  updatedAt: string
}

export interface OpenTableSessionInput {
  tableId: string
  clientSessionId: string
  openedByDevice: string
  openedAt: string
}

/**
 * POST /api/v1/tables/:tableId/sessions
 * → 201 (new) | 200 (idempotent replay by clientSessionId)
 */
export async function openTableSession(input: OpenTableSessionInput): Promise<TableSessionDto> {
  const { tableId, clientSessionId, openedByDevice, openedAt } = input
  const response = await apiClient.post<TableSessionDto>(`/tables/${tableId}/sessions`, {
    clientSessionId,
    openedByDevice,
    openedAt,
  })
  return response.data
}

/**
 * POST /api/v1/tables/sessions/:serverSessionId/settle
 * :serverSessionId is the BE-assigned id (NOT clientSessionId — BE uses findById).
 * Idempotent on BE side.
 */
export async function settleTableSession(serverSessionId: string): Promise<TableSessionDto> {
  const response = await apiClient.post<TableSessionDto>(`/tables/sessions/${serverSessionId}/settle`)
  return response.data
}
