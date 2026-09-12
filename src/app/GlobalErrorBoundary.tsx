import { Component, type ErrorInfo, type ReactNode } from 'react'
import { BrandLogo } from '@/shared/components/brand/BrandLogo'
import { AppButton } from '@/shared/components/ui/AppButton'
import styles from './GlobalErrorBoundary.module.css'

type GlobalErrorBoundaryProps = {
  children: ReactNode
}

type GlobalErrorBoundaryState = {
  error: Error | null
}

export class GlobalErrorBoundary extends Component<
  GlobalErrorBoundaryProps,
  GlobalErrorBoundaryState
> {
  state: GlobalErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error): GlobalErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('CashGo application render failed.', error, info)
  }

  private reloadPage = () => {
    window.location.reload()
  }

  private returnToAccess = () => {
    window.location.assign('/auth')
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className={styles.page}>
        <section aria-labelledby="global-error-title" className={styles.card} role="alert">
          <BrandLogo
            brand="Cashgo"
            size="md"
            tagline="POS + ERP para vender, cobrar y crecer"
          />

          <div className={styles.copy}>
            <span className={styles.eyebrow}>Recuperación segura</span>
            <h1 id="global-error-title">No pudimos mostrar esta pantalla</h1>
            <p>
              Tus datos permanecen seguros. Recarga CashGo para continuar con
              una sesión limpia.
            </p>
          </div>

          <div className={styles.actions}>
            <AppButton onClick={this.reloadPage} size="lg">
              Recargar CashGo
            </AppButton>
            <AppButton
              onClick={this.returnToAccess}
              size="lg"
              variant="secondary"
            >
              Volver al acceso
            </AppButton>
          </div>

          {import.meta.env.DEV ? (
            <details className={styles.details}>
              <summary>Detalle técnico</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          ) : null}
        </section>
      </main>
    )
  }
}
