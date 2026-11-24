import { postFormData, postJson } from '@/shared/services/api-client'

export type AssistantApiMessage = {
  role: 'assistant' | 'user'
  content: string
}

export type AssistantActionKind =
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'DELETE_PRODUCT'
  | 'CREATE_SALE'
  | 'HOLD_SALE'
  | 'CREATE_PURCHASE'
  | 'COMPLETE_HELD_SALE'
  | 'REGISTER_RECEIVABLE_PAYMENT'
  | 'CREATE_CUSTOMER'
  | 'UPDATE_CUSTOMER'
  | 'DELETE_CUSTOMER'
  | 'CREATE_SUPPLIER'
  | 'UPDATE_SUPPLIER'
  | 'CREATE_EMPLOYEE'
  | 'CREATE_USER'
  | 'UPDATE_TEAM_MEMBER'
  | 'DELETE_TEAM_MEMBER'
  | 'TRANSFER_CASH_BALANCE'

export type AssistantProductPreview = {
  id: number
  name: string
  price: number
  stock: number
  imageUrl: string | null
  category: string | null
  quantity?: number
  lineTotal?: number
}

export type AssistantPendingAction = {
  token: string
  kind: AssistantActionKind
  title: string
  description: string
  confirmLabel: string
  tone: 'danger' | 'primary'
  details: Array<{
    label: string
    value: string
  }>
  products?: AssistantProductPreview[]
}

type AssistantChatInput = {
  message: string
  history: AssistantApiMessage[]
}

export type AssistantChatResponse = {
  message: string
  model: string
  action?: AssistantPendingAction
  products?: AssistantProductPreview[]
}

export type ConfirmAssistantActionResponse = {
  message: string
  resourceId: number
  action: AssistantActionKind
}

export function sendAssistantMessage(input: AssistantChatInput) {
  return postJson<AssistantChatResponse, AssistantChatInput>('/assistant/chat', input)
}

export function analyzePurchaseInvoice(file: File) {
  const body = new FormData()
  body.append('file', file)
  return postFormData<AssistantChatResponse>('/assistant/purchase-invoices/analyze', body)
}

export function analyzeProductPhoto(file: File, instructions: string) {
  const body = new FormData()
  body.append('file', file)
  body.append('instructions', instructions)
  return postFormData<AssistantChatResponse>('/assistant/product-photos/analyze', body)
}

export function confirmAssistantAction(token: string) {
  return postJson<ConfirmAssistantActionResponse, { token: string }>('/assistant/actions/confirm', { token })
}
