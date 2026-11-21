import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  type CSSProperties,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ToastContext, type ToastInput, type ToastTone } from '@/shared/hooks/use-toast'
import { getApiErrorMessage } from '@/shared/services/api-client'
import { subscribeToApiWriteErrors } from '@/shared/services/api-write-error-notifications'
import { joinClassNames } from '@/shared/utils/join-class-names'
import styles from './ToastProvider.module.css'

type ToastRecord = Required<Pick<ToastInput, 'message' | 'tone' | 'title'>> & {
  duration: number
  id: string
}

const DEFAULT_DURATION = 4_500
const ERROR_DURATION = 7_000
const MAX_VISIBLE_TOASTS = 4

function createToastId() {
  return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function getDefaultTitle(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return 'Listo'
    case 'error':
      return 'No pudimos completar la acción'
    case 'warning':
      return 'Revisa esta información'
    default:
      return 'Información'
  }
}

function getToastIcon(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 size={18} strokeWidth={2.4} />
    case 'error':
      return <AlertCircle size={18} strokeWidth={2.4} />
    case 'warning':
      return <TriangleAlert size={18} strokeWidth={2.4} />
    default:
      return <Info size={18} strokeWidth={2.4} />
  }
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timersRef = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)

    if (timer) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    )
  }, [])

  const show = useCallback(
    (toast: ToastInput) => {
      const tone = toast.tone ?? 'info'
      const id = createToastId()
      const duration =
        toast.duration ?? (tone === 'error' ? ERROR_DURATION : DEFAULT_DURATION)
      const nextToast: ToastRecord = {
        duration,
        id,
        message: toast.message,
        title: toast.title ?? getDefaultTitle(tone),
        tone,
      }

      setToasts((currentToasts) =>
        [nextToast, ...currentToasts].slice(0, MAX_VISIBLE_TOASTS),
      )

      if (duration > 0) {
        timersRef.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        )
      }

      return id
    },
    [dismiss],
  )

  const toastApi = useMemo(
    () => ({
      clear: () => {
        timersRef.current.forEach((timer) => window.clearTimeout(timer))
        timersRef.current.clear()
        setToasts([])
      },
      dismiss,
      show,
      showError: (
        error: unknown,
        fallbackMessage = 'No pudimos completar la acción. Intenta nuevamente.',
        options?: { title?: string; duration?: number },
      ) =>
        show({
          duration: options?.duration,
          message: getApiErrorMessage(error, fallbackMessage),
          title: options?.title,
          tone: 'error',
        }),
      showInfo: (
        message: string,
        options?: { title?: string; duration?: number },
      ) =>
        show({
          duration: options?.duration,
          message,
          title: options?.title,
          tone: 'info',
        }),
      showSuccess: (
        message: string,
        options?: { title?: string; duration?: number },
      ) =>
        show({
          duration: options?.duration,
          message,
          title: options?.title,
          tone: 'success',
        }),
      showWarning: (
        message: string,
        options?: { title?: string; duration?: number },
      ) =>
        show({
          duration: options?.duration,
          message,
          title: options?.title,
          tone: 'warning',
        }),
    }),
    [dismiss, show],
  )

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer))
      timersRef.current.clear()
    },
    [],
  )

  useEffect(
    () =>
      subscribeToApiWriteErrors((error) => {
        show({
          message: getApiErrorMessage(error),
          tone: 'error',
        })
      }),
    [show],
  )

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      <div aria-label="Notificaciones" className={styles.viewport}>
        {toasts.map((toast) => (
          <article
            aria-atomic="true"
            aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
            className={joinClassNames(styles.toast, styles[toast.tone])}
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            style={
              {
                '--toast-duration': `${toast.duration}ms`,
              } as CSSProperties
            }
          >
            <span className={styles.icon}>{getToastIcon(toast.tone)}</span>
            <div className={styles.content}>
              <p className={styles.title}>{toast.title}</p>
              <p className={styles.message}>{toast.message}</p>
            </div>
            <button
              aria-label="Cerrar notificación"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
            {toast.duration > 0 ? (
              <span aria-hidden="true" className={styles.progress} />
            ) : null}
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
