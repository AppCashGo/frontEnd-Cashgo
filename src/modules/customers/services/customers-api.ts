import { getJson, postJson } from '@/shared/services/api-client'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerPurchaseHistoryItem,
  CustomerSummary,
} from '@/modules/customers/types/customer'

type CustomerSummaryApiRecord = Omit<CustomerSummary, 'id'> & {
  id: number | string
}

type CustomerPurchaseHistoryItemApiRecord = Omit<
  CustomerPurchaseHistoryItem,
  'saleId'
> & {
  saleId: number | string
}

type CustomerDetailApiRecord = CustomerSummaryApiRecord & {
  purchaseHistory: CustomerPurchaseHistoryItemApiRecord[]
}

function normalizeCustomerSummaryRecord(
  customer: CustomerSummaryApiRecord,
): CustomerSummary {
  return {
    ...customer,
    id: String(customer.id),
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
    })),
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
