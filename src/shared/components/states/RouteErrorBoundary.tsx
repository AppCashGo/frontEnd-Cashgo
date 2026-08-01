import { useEffect } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { AsyncStateBlock } from '@/shared/components/states/AsyncStateBlock'
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
    ? 'Publicamos una nueva versión y tu navegador tenía archivos anteriores en memoria. Recarga la página para tomar la versión más reciente.'
    : 'Ocurrió un error inesperado al preparar esta vista. Recarga la página e intenta nuevamente.'

  return (
    <AsyncStateBlock
      actionLabel="Recargar página"
      description={description}
      onAction={() => {
        window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY)
        window.location.reload()
      }}
      title={title}
      tone="error"
      variant="page"
    >
      <pre className={styles.details}>{message}</pre>
    </AsyncStateBlock>
  )
}
