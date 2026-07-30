const PRELOAD_RELOAD_STORAGE_KEY = 'cashgo:vite-preload-reload-attempt'
const PRELOAD_RELOAD_WINDOW_MS = 30_000

type ReloadAttempt = {
  routeKey: string
  attemptedAt: number
}

function getRouteKey() {
  return `${window.location.pathname}${window.location.search}`
}

function readReloadAttempt(): ReloadAttempt | null {
  const storedAttempt = window.sessionStorage.getItem(PRELOAD_RELOAD_STORAGE_KEY)

  if (!storedAttempt) {
    return null
  }

  try {
    return JSON.parse(storedAttempt) as ReloadAttempt
  } catch {
    return null
  }
}

function shouldReload(routeKey: string) {
  const attempt = readReloadAttempt()

  if (!attempt) {
    return true
  }

  const isSameRoute = attempt.routeKey === routeKey
  const isRecentAttempt =
    Date.now() - attempt.attemptedAt < PRELOAD_RELOAD_WINDOW_MS

  return !(isSameRoute && isRecentAttempt)
}

export function registerVitePreloadErrorHandler() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()

    const routeKey = getRouteKey()

    if (!shouldReload(routeKey)) {
      return
    }

    window.sessionStorage.setItem(
      PRELOAD_RELOAD_STORAGE_KEY,
      JSON.stringify({
        routeKey,
        attemptedAt: Date.now(),
      } satisfies ReloadAttempt),
    )
    window.location.reload()
  })
}
