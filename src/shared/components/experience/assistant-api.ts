import { postJson } from '@/shared/services/api-client'

export type AssistantApiMessage = {
  role: 'assistant' | 'user'
  content: string
}

type AssistantChatInput = {
  message: string
  history: AssistantApiMessage[]
}

type AssistantChatResponse = {
  message: string
  model: string
}

export function sendAssistantMessage(input: AssistantChatInput) {
  return postJson<AssistantChatResponse, AssistantChatInput>(
    '/assistant/chat',
    input,
  )
}
