const SNAPSHOT_PREFIX = 'cashgo-offline-snapshot'

function snapshotKey(businessId: string, resource: string) {
  return `${SNAPSHOT_PREFIX}:${businessId}:${resource}`
}

export function readOfflineSnapshot<T>(businessId: string | undefined, resource: string) {
  if (!businessId) return undefined

  try {
    const rawValue = window.localStorage.getItem(snapshotKey(businessId, resource))
    if (!rawValue) return undefined
    const parsedValue = JSON.parse(rawValue) as { data?: T }
    return parsedValue.data
  } catch {
    return undefined
  }
}

export function writeOfflineSnapshot<T>(
  businessId: string | undefined,
  resource: string,
  data: T,
) {
  if (!businessId) return

  try {
    window.localStorage.setItem(
      snapshotKey(businessId, resource),
      JSON.stringify({ data, updatedAt: new Date().toISOString() }),
    )
  } catch {
    // A full or restricted storage area must not interrupt the online operation.
  }
}
