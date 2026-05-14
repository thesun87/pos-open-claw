export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  traceId?: string
  [extension: string]: unknown
}

export type UiError = {
  message: string
  type?: string
  status?: number
}

export type ProblemAction =
  | { type: 'redirect-login'; payload?: { reason: string } }
  | { type: 'show-toast'; payload: { message: string } }
  | { type: 'retry-after-action'; payload: { action: string; message: string } }
  | { type: 'form-errors'; payload: { problem: ProblemDetails } }

function problemTypeIncludes(problem: ProblemDetails | undefined, suffix: string): boolean {
  if (typeof problem?.type !== 'string') return false
  const normalizedSuffix = suffix.replace(/^\//, '')
  return problem.type.includes(suffix) || problem.type.endsWith(normalizedSuffix) || problem.type.includes(`:${normalizedSuffix}`)
}

export function mapProblemToAction(problem: ProblemDetails | undefined): ProblemAction {
  if (problemTypeIncludes(problem, '/session-revoked')) return { type: 'redirect-login', payload: { reason: 'session-revoked' } }
  if (problemTypeIncludes(problem, '/validation')) return { type: 'form-errors', payload: { problem: problem ?? {} } }
  if (problemTypeIncludes(problem, '/menu-version-stale')) return { type: 'retry-after-action', payload: { action: 'refresh-menu', message: 'Menu đã thay đổi. Vui lòng cập nhật menu rồi thử lại.' } }
  if (problemTypeIncludes(problem, '/forbidden')) return { type: 'show-toast', payload: { message: 'Không có quyền thực hiện' } }
  if (problemTypeIncludes(problem, '/internal')) return { type: 'show-toast', payload: { message: 'Đã có lỗi, vui lòng thử lại' } }
  return { type: 'show-toast', payload: { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' } }
}

export function mapProblemDetails(problem: ProblemDetails | undefined): UiError {
  if (!problem) return { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
  const action = mapProblemToAction(problem)
  const defaultMessage = problem.title?.trim() || 'Đã có lỗi xảy ra. Vui lòng thử lại.'
  const message = problem.type && problemTypeIncludes(problem, '/internal')
    ? 'Đã có lỗi, vui lòng thử lại'
    : action.type === 'retry-after-action'
      ? action.payload.message
      : defaultMessage
  return {
    message,
    ...(problem.type ? { type: problem.type } : {}),
    ...(typeof problem.status === 'number' ? { status: problem.status } : {}),
  }
}

export const errorMapper = mapProblemDetails
