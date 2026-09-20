import { ApiError } from '@/shared/services/api-client'

export const CASH_SESSION_REQUIRED_CODE = 'CASH_SESSION_REQUIRED'

export function isCashSessionRequiredError(error: unknown) {
  return (
    error instanceof ApiError && error.code === CASH_SESSION_REQUIRED_CODE
  )
}
