import { useEffect, useMemo, useState } from 'react'
import { Download, Smartphone, X } from 'lucide-react'
import styles from './PwaInstallPrompt.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_AT_KEY = 'cashgo:pwa-install-dismissed-at'
const DISMISS_FOR_DAYS = 7

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator &&
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function wasRecentlyDismissed() {
  const value = Number(window.localStorage.getItem(DISMISSED_AT_KEY))

  return (
    Number.isFinite(value) &&
    Date.now() - value < DISMISS_FOR_DAYS * 24 * 60 * 60 * 1000
  )
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const isIos = useMemo(
    () => /iPad|iPhone|iPod/.test(window.navigator.userAgent),
    [],
  )

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) {
      return
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setVisible(true)
    }

    const handleInstalled = () => {
      setInstallEvent(null)
      setVisible(false)
      window.localStorage.removeItem(DISMISSED_AT_KEY)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    if (isIos) {
      setVisible(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [isIos])

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!installEvent) {
      return
    }

    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice

    if (outcome === 'accepted') {
      setVisible(false)
    }

    setInstallEvent(null)
  }

  if (!visible) {
    return null
  }

  return (
    <aside className={styles.prompt} aria-label="Instalar CashGo">
      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Cerrar invitación de instalación"
      >
        <X aria-hidden="true" size={20} />
      </button>

      <span className={styles.icon} aria-hidden="true">
        <Smartphone size={26} />
      </span>

      <div className={styles.content}>
        <strong>Instala CashGo en tu celular</strong>
        {isIos && !installEvent ? (
          <p>
            En Safari usa el menú <span className={styles.menuHint}>•••</span> de
            abajo a la derecha, toca “Compartir” y luego “Agregar a inicio”.
          </p>
        ) : (
          <p>Ábrelo como una app y accede más rápido, sin ocupar casi espacio.</p>
        )}
      </div>

      {installEvent ? (
        <button type="button" className={styles.install} onClick={install}>
          <Download aria-hidden="true" size={18} />
          Instalar
        </button>
      ) : null}
    </aside>
  )
}
