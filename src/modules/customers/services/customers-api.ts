import { getJson, patchJson, postJson } from '@/shared/services/api-client'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerPaymentInput,
  CustomerReceivable,
  CustomerReceivablePayment,
  CustomerPurchaseHistoryItem,
  CustomerSummary,
} from '@/modules/customers/types/customer'
import { normalizeNumber } from '@/shared/utils/normalize-number'

type CustomerSummaryApiRecord = Omit<CustomerSummary, 'id'> & {
  id: number | string
}

type CustomerPurchaseHistoryItemApiRecord = Omit<
  CustomerPurchaseHistoryItem,
  'saleId'
> & {
  saleId: number | string
}

type CustomerReceivablePaymentApiRecord = Omit<
  CustomerReceivablePayment,
  'id' | 'amount'
> & {
  id: number | string
  amount: number | string
}

type CustomerReceivableApiRecord = Omit<
  CustomerReceivable,
  'id' | 'saleId' | 'amount' | 'paidAmount' | 'balance' | 'payments'
> & {
  id: number | string
  saleId: number | string
  amount: number | string
  paidAmount: number | string
  balance: number | string
  payments: CustomerReceivablePaymentApiRecord[]
}

type CustomerDetailApiRecord = CustomerSummaryApiRecord & {
  purchaseHistory: CustomerPurchaseHistoryItemApiRecord[]
  receivables: CustomerReceivableApiRecord[]
}

function normalizeCustomerSummaryRecord(
  customer: CustomerSummaryApiRecord,
): CustomerSummary {
  return {
    ...customer,
    id: String(customer.id),
    balance: normalizeNumber(customer.balance),
  }
}

function normalizeCustomerReceivablePayment(
  payment: CustomerReceivablePaymentApiRecord,
): CustomerReceivablePayment {
  return {
    ...payment,
    id: String(payment.id),
    amount: normalizeNumber(payment.amount),
  }
}

function normalizeCustomerReceivable(
  receivable: CustomerReceivableApiRecord,
): CustomerReceivable {
  return {
    ...receivable,
    id: String(receivable.id),
    saleId: String(receivable.saleId),
    amount: normalizeNumber(receivable.amount),
    paidAmount: normalizeNumber(receivable.paidAmount),
    balance: normalizeNumber(receivable.balance),
    payments: receivable.payments.map(normalizeCustomerReceivablePayment),
  }
}

function normalizeCustomerDetailRecord(
  customer: CustomerDetailApiRecord,
): CustomerDetail {
  return {
    ...normalizeCustomerSummaryRecord(customer),
    purchaseHistory: customer.purchaseHistory.map((item) => ({
      ...item,
      saleId: String(item.saleId),
      total: normalizeNumber(item.total),
    })),
    receivables: customer.receivables.map(normalizeCustomerReceivable),
  }
}

export async function getCustomers() {
  const customers = await getJson<CustomerSummaryApiRecord[]>('/customers')

  return customers.map(normalizeCustomerSummaryRecord)
}

export async function getCustomerDetail(customerId: string) {
  const customer = await getJson<CustomerDetailApiRecord>(
    `/customers/${customerId}`,
  )

  return normalizeCustomerDetailRecord(customer)
}

export async function createCustomer(input: CustomerMutationInput) {
  const customer = await postJson<CustomerDetailApiRecord, CustomerMutationInput>(
    '/customers',
    input,
  )

  return normalizeCustomerDetailRecord(customer)
}

export async function updateCustomer(
  customerId: string,
  input: CustomerMutationInput,
) {
  const customer = await patchJson<CustomerDetailApiRecord, CustomerMutationInput>(
    `/customers/${customerId}`,
    input,
  )

  return normalizeCustomerDetailRecord(customer)
}

export async function registerCustomerPayment(
  receivableId: string,
  input: CustomerPaymentInput,
) {
  const receivable = await postJson<
    CustomerReceivableApiRecord,
    CustomerPaymentInput
  >(`/accounts-receivable/${receivableId}/payments`, input)

  return normalizeCustomerReceivable(receivable)
}
