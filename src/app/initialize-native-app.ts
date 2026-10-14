import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { appRouter } from '@/routes/app-router'

const CASHGO_WEB_HOSTS = new Set(['cashgoapp.com.co', 'www.cashgoapp.com.co'])

function getNativeRoute(value: string) {
  try {
    const url = new URL(value)

    if (url.protocol === 'cashgo:') {
      const hostPath = url.hostname ? `/${url.hostname}` : ''
      return `${hostPath}${url.pathname}${url.search}${url.hash}` || '/'
    }

    if (url.protocol === 'https:' && CASHGO_WEB_HOSTS.has(url.hostname)) {
      return `${url.pathname}${url.search}${url.hash}` || '/'
    }
  } catch {
    return null
  }

  return null
}

function navigateFromNativeUrl(value: string) {
  const route = getNativeRoute(value)

  if (route) {
    void appRouter.navigate(route)
  }
}

export function initializeNativeApp() {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  void CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    navigateFromNativeUrl(url)
  })

  void CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      navigateFromNativeUrl(launch.url)
    }
  })
}
