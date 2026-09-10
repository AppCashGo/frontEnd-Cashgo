import {
  getBlob,
  getJson,
  patchFormData,
  patchJson,
  postJson,
} from '@/shared/services/api-client'
import type {
  CustomerDetail,
  CustomerMutationInput,
  CustomerPaymentInput,
  CustomerReceivable,
  CustomerReceivableCollectionActivity,
  CustomerCollectionActivityInput,
  CustomerCollectionAgenda,
  CustomerReceivablePayment,
  CustomerReceivableTermsInput,
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
  | 'id'
  | 'saleId'
  | 'amount'
  | 'paidAmount'
  | 'balance'
  | 'payments'
  | 'collectionActivities'
> & {
  id: number | string
  saleId: number | string
  amount: number | string
  paidAmount: number | string
  balance: number | string
  payments: CustomerReceivablePaymentApiRecord[]
  collectionActivities: CustomerReceivableCollectionActivityApiRecord[]
}

type CustomerReceivableCollectionActivityApiRecord = Omit<
  CustomerReceivableCollectionActivity,
  'id' | 'createdByUserId' | 'promisedAmount'
> & {
  id: number | string
  createdByUserId: number | string | null
  promisedAmount: number | string | null
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
    overdueBalance: normalizeNumber(customer.overdueBalance),
    currentBalance: normalizeNumber(customer.currentBalance),
    overdue1To30Balance: normalizeNumber(customer.overdue1To30Balance),
    overdue31To60Balance: normalizeNumber(customer.overdue31To60Balance),
    overdueOver60Balance: normalizeNumber(customer.overdueOver60Balance),
    undatedBalance: normalizeNumber(customer.undatedBalance),
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
    collectionActivities: (receivable.collectionActivities ?? []).map((activity) => ({
      ...activity,
      id: String(activity.id),
      createdByUserId:
        activity.createdByUserId === null
          ? null
          : String(activity.createdByUserId),
      promisedAmount:
        activity.promisedAmount === null
          ? null
          : normalizeNumber(activity.promisedAmount),
    })),
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

type CustomerCollectionAgendaApiRecord = Omit<
  CustomerCollectionAgenda,
  'promises' | 'remindersPending'
> & {
  promises: Array<
    Omit<
      CustomerCollectionAgenda['promises'][number],
      'id' | 'receivableId' | 'customerId' | 'balance' | 'promisedAmount'
    > & {
      id: number | string
      receivableId: number | string
      customerId: number | string
      balance: number | string
      promisedAmount: number | string | null
    }
  >
  remindersPending: Array<
    Omit<
      CustomerCollectionAgenda['remindersPending'][number],
      'receivableId' | 'customerId' | 'balance'
    > & {
      receivableId: number | string
      customerId: number | string
      balance: number | string
    }
  >
}

export async function getCustomerCollectionAgenda(): Promise<CustomerCollectionAgenda> {
  const agenda = await getJson<CustomerCollectionAgendaApiRecord>(
    '/accounts-receivable/collection-agenda',
  )

  return {
    summary: agenda.summary,
    promises: agenda.promises.map((promise) => ({
      ...promise,
      id: String(promise.id),
      receivableId: String(promise.receivableId),
      customerId: String(promise.customerId),
      balance: normalizeNumber(promise.balance),
      promisedAmount:
        promise.promisedAmount === null
          ? null
          : normalizeNumber(promise.promisedAmount),
    })),
    remindersPending: agenda.remindersPending.map((reminder) => ({
      ...reminder,
      receivableId: String(reminder.receivableId),
      customerId: String(reminder.customerId),
      balance: normalizeNumber(reminder.balance),
    })),
  }
}

export function exportCustomerAgingReport() {
  return getBlob('/customers/receivables/aging/export', {
    accept: 'text/csv',
  })
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

export async function uploadCustomerAvatar(customerId: string, file: File) {
  const formData = new FormData()

  formData.append('file', file)

  const customer = await patchFormData<CustomerDetailApiRecord>(
    `/customers/${customerId}/avatar`,
    formData,
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

export async function updateCustomerReceivableTerms(
  receivableId: string,
  input: CustomerReceivableTermsInput,
) {
  const receivable = await patchJson<
    CustomerReceivableApiRecord,
    CustomerReceivableTermsInput
  >(`/accounts-receivable/${receivableId}/terms`, input)

  return normalizeCustomerReceivable(receivable)
}

export async function createCustomerCollectionActivity(
  receivableId: string,
  input: CustomerCollectionActivityInput,
) {
  return postJson<
    CustomerReceivableCollectionActivityApiRecord,
    CustomerCollectionActivityInput
  >(`/accounts-receivable/${receivableId}/collection-activities`, input)
}
