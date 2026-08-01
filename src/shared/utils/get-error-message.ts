import { ApiError, getApiErrorMessage } from '@/shared/services/api-client'

export function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.userMessage
  }

  if (error instanceof Error && error.message) {
    return getApiErrorMessage(error, fallbackMessage)
  }

  return fallbackMessage
}
