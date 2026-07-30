import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import styles from './RouteErrorBoundary.module.css'

const CHUNK_RELOAD_STORAGE_KEY = 'cashgo:chunk-reload-attempt'

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return error.statusText || String(error.status)
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function isDynamicImportError(message: string) {
  return /Failed to fetch dynamically imported module|dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(
    message,
  )
}

function getReloadKey() {
  return `${window.location.pathname}${window.location.search}`
}

export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = getErrorMessage(error)
  const shouldReloadForFreshAssets = isDynamicImportError(message)

  useEffect(() => {
    if (!shouldReloadForFreshAssets) {
      return
    }

    const reloadKey = getReloadKey()
    const lastAttempt = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY)

    if (lastAttempt === reloadKey) {
      return
    }

    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, reloadKey)
    window.location.reload()
  }, [shouldReloadForFreshAssets])

  const title = shouldReloadForFreshAssets
    ? 'Estamos actualizando Cashgo'
    : 'No pudimos cargar esta pantalla'
  const description = shouldReloadForFreshAssets
    ? 'Publicamos una nueva version y tu navegador tenia archivos anteriores en memoria. Recarga la pagina para tomar la version mas reciente.'
    : 'Ocurrio un error inesperado al preparar esta vista. Recarga la pagina e intenta nuevamente.'

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Cashgo</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <pre className={styles.details}>{message}</pre>
        <button
          className={styles.action}
          onClick={() => {
            window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
            window.location.reload()
          }}
          type="button"
        >
          Recargar pagina
        </button>
      </section>
    </main>
  )
}
