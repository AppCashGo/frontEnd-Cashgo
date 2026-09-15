import { getJson, postJson } from '@/shared/services/api-client'
import { getAuthAccessToken } from '@/shared/services/auth-session'
import type {
  CreateOwnerLoanInput,
  CreateOwnerLoanPaymentInput,
  OwnerLoan,
} from '@/modules/owner-loans/types/owner-loan'

export function getOwnerLoans() {
  return getJson<OwnerLoan[]>('/owner-loans', {
    accessToken: getAuthAccessToken(),
  })
}

export function createOwnerLoan(input: CreateOwnerLoanInput) {
  return postJson<OwnerLoan, CreateOwnerLoanInput>('/owner-loans', input, {
    accessToken: getAuthAccessToken(),
  })
}

export function createOwnerLoanPayment(
  ownerLoanId: string,
  input: CreateOwnerLoanPaymentInput,
) {
  return postJson<OwnerLoan, CreateOwnerLoanPaymentInput>(
    `/owner-loans/${ownerLoanId}/payments`,
    input,
    { accessToken: getAuthAccessToken() },
  )
}
