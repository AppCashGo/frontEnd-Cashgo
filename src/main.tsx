import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import { App } from '@/app/App'
import { GlobalErrorBoundary } from '@/app/GlobalErrorBoundary'
import { AppProviders } from '@/app/providers/AppProviders'
import { registerVitePreloadErrorHandler } from '@/app/register-vite-preload-error-handler'
import '@/shared/styles/global.css'

registerVitePreloadErrorHandler()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)

document.getElementById('cashgo-boot-fallback')?.remove()
