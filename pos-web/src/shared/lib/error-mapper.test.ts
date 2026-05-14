import { describe, expect, it } from 'vitest'
import { mapProblemDetails, mapProblemToAction } from './error-mapper'

describe('mapProblemToAction', () => {
  it.each([
    ['https://api.test/problems/session-revoked', 'redirect-login'],
    ['urn:problem:validation', 'form-errors'],
    ['https://api.test/problems/menu-version-stale', 'retry-after-action'],
    ['https://api.test/problems/forbidden', 'show-toast'],
    ['https://api.test/problems/internal', 'show-toast'],
  ] as const)('maps %s by URI contains check', (type, expected) => {
    expect(mapProblemToAction({ type, title: 'x' }).type).toBe(expected)
  })

  it('returns required cashier-facing toast messages', () => {
    expect(mapProblemToAction({ type: 'https://api.test/problems/forbidden' })).toEqual({ type: 'show-toast', payload: { message: 'Không có quyền thực hiện' } })
    expect(mapProblemToAction({ type: 'https://api.test/problems/internal' })).toEqual({ type: 'show-toast', payload: { message: 'Đã có lỗi, vui lòng thử lại' } })
    expect(mapProblemToAction({ type: 'https://api.test/problems/other' })).toEqual({ type: 'show-toast', payload: { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' } })
  })
})

describe('mapProblemDetails', () => {
  it('keeps backward-compatible UiError shape and does not leak detail', () => {
    const mapped = mapProblemDetails({ type: 'https://api.test/problems/validation', title: 'Dữ liệu chưa hợp lệ', status: 422, detail: 'violations stack tenant_id SQL' })
    expect(mapped).toEqual({ type: 'https://api.test/problems/validation', status: 422, message: 'Dữ liệu chưa hợp lệ' })
    expect(mapped.message).not.toContain('violations')
  })
})
