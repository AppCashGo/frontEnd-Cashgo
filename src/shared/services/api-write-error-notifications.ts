type ApiWriteErrorListener = (error: unknown) => void

const listeners = new Set<ApiWriteErrorListener>()

export function notifyApiWriteError(error: unknown) {
  listeners.forEach((listener) => listener(error))
}

export function subscribeToApiWriteErrors(listener: ApiWriteErrorListener) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
