import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export type ToastInput = {
  tone?: ToastTone
  title?: string
  message: string
  duration?: number
}

export type ToastMessageOptions = {
  title?: string
  duration?: number
}

export type ToastApi = {
  show: (toast: ToastInput) => string
  showSuccess: (message: string, options?: ToastMessageOptions) => string
  showError: (
    error: unknown,
    fallbackMessage?: string,
    options?: ToastMessageOptions,
  ) => string
  showWarning: (message: string, options?: ToastMessageOptions) => string
  showInfo: (message: string, options?: ToastMessageOptions) => string
  dismiss: (id: string) => void
  clear: () => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast() {
  const toast = useContext(ToastContext)

  if (!toast) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return toast
}
