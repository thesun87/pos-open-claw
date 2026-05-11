import axios from 'axios'
import { errorMapper, type ProblemDetails, type UiError } from './error-mapper'

export type ApiClientError = Error & { uiError?: UiError }

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const contentType = error.response?.headers?.['content-type']
      if (typeof contentType === 'string' && contentType.includes('application/problem+json')) {
        ;(error as ApiClientError).uiError = errorMapper(error.response?.data as ProblemDetails)
      }
    }
    return Promise.reject(error)
  },
)
