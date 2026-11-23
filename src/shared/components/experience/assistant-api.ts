import { postJson } from '@/shared/services/api-client'

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
  return postJson<AssistantChatResponse, AssistantChatInput>(
    '/assistant/chat',
    input,
  )
}

export function confirmAssistantAction(token: string) {
  return postJson<
    ConfirmAssistantActionResponse,
    { token: string }
  >('/assistant/actions/confirm', { token })
}
