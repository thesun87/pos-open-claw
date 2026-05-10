export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  [extension: string]: unknown
}

export type UiError = {
  message: string
  type?: string
  status?: number
}

export function mapProblemDetails(problem: ProblemDetails | undefined): UiError {
  if (!problem) return { message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
  return {
    message: problem.title?.trim() || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    ...(problem.type ? { type: problem.type } : {}),
    ...(typeof problem.status === 'number' ? { status: problem.status } : {}),
  }
}

export const errorMapper = mapProblemDetails
