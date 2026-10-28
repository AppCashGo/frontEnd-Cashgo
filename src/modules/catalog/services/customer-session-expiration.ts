const CUSTOMER_SESSION_EXPIRED_EVENT = 'cashgo:customer-session-expired'

type CustomerSessionExpiredDetail = {
  catalogSlug: string
}

export function notifyCustomerSessionExpired(catalogSlug: string) {
  window.dispatchEvent(
    new CustomEvent<CustomerSessionExpiredDetail>(
      CUSTOMER_SESSION_EXPIRED_EVENT,
      { detail: { catalogSlug } },
    ),
  )
}

export function subscribeToCustomerSessionExpired(
  listener: (catalogSlug: string) => void,
) {
  const handleExpiredSession = (event: Event) => {
    const customEvent = event as CustomEvent<CustomerSessionExpiredDetail>
    listener(customEvent.detail.catalogSlug)
  }

  window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleExpiredSession)

  return () =>
    window.removeEventListener(
      CUSTOMER_SESSION_EXPIRED_EVENT,
      handleExpiredSession,
    )
}

