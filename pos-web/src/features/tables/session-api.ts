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
 * Wire contract for the POST /tables/:id/sessions request body — must mirror BE OpenSessionDto.
 * NOTE the field is `deviceId`, NOT `openedByDevice` (the response/DB name). Typing the body
 * here makes the compiler enforce the contract so a rename can't silently regress to a 400.
 */
interface OpenSessionRequest {
  clientSessionId: string
  deviceId: string
  openedAt: string
}

/**
 * POST /api/v1/tables/:tableId/sessions
 * → 201 (new) | 200 (idempotent replay by clientSessionId)
 */
export async function openTableSession(input: OpenTableSessionInput): Promise<TableSessionDto> {
  const { tableId, clientSessionId, openedByDevice, openedAt } = input
  // BE OpenSessionDto expects `deviceId` in the request body; FE keeps `openedByDevice`
  // internally (matches the response DTO + local Dexie record), so map at the HTTP boundary.
  const body: OpenSessionRequest = {
    clientSessionId,
    deviceId: openedByDevice,
    openedAt,
  }
  const response = await apiClient.post<TableSessionDto>(`/tables/${tableId}/sessions`, body)
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
