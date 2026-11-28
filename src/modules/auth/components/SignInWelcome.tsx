import { useLayoutEffect, useState } from 'react'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { routePaths } from '@/routes/route-paths'
import cashgoSymbolUrl from '@/shared/assets/brand/cashgo-symbol.svg'
import { playSignInSound } from '@/shared/hooks/use-workspace-sound'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import styles from './SignInWelcome.module.css'

const welcomeDuration = 1450
const reducedMotionDuration = 650

export function SignInWelcome() {
  const [duration, setDuration] = useState(0)
  const { languageCode } = useAppTranslation()

  useLayoutEffect(() => {
    let timer: number | undefined

    const unsubscribe = useAuthSessionStore.subscribe((current, previous) => {
      if (!current.accessToken) {
        window.clearTimeout(timer)
        setDuration(0)
        return
      }

      const pathname = window.location.pathname.replace(/\/+$/, '')
      if (previous.accessToken || !current.user || pathname !== routePaths.auth) return

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const displayTime = prefersReducedMotion ? reducedMotionDuration : welcomeDuration
      setDuration(displayTime)
      playSignInSound()
      timer = window.setTimeout(() => setDuration(0), displayTime + (prefersReducedMotion ? 0 : 150))
    })

    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  if (!duration) return null

  return (
    <div
      aria-label={languageCode === 'es' ? 'Sesión iniciada' : 'Signed in'}
      className={styles.welcome}
      role="status"
      style={{ animationDuration: `${duration}ms` }}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) setDuration(0)
      }}
    >
      <img alt="CashGo" className={styles.logo} src={cashgoSymbolUrl} />
    </div>
  )
}
