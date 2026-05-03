import { Link } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { getActiveBusinessCategory } from '@/modules/auth/utils/get-active-business'
import { getModuleNavigationRoutes } from '@/routes/module-navigation-routes'
import { routeSegments } from '@/routes/route-paths'
import emptyStateUrl from '@/shared/assets/images/cashgo-empty-state.svg'
import { BrandLogo } from '@/shared/components/brand/BrandLogo'
import { AppIcon, type AppIconName } from '@/shared/components/icons/AppIcon'
import { useAppTranslation } from '@/shared/i18n/use-app-translation'
import styles from './ModulePlaceholder.module.css'

type ModulePlaceholderProps = {
  title: string
  description: string
  primaryActionLabel?: string
  primaryActionTo?: string
}

function getRouteIconName(segment: string): AppIconName {
  switch (segment) {
    case routeSegments.dashboard:
      return 'dashboard'
    case routeSegments.sales:
      return 'sales'
    case routeSegments.deliveries:
      return 'deliveries'
    case routeSegments.movements:
      return 'cash'
    case routeSegments.billing:
      return 'billing'
    case routeSegments.reports:
      return 'reports'
    case routeSegments.inventory:
      return 'inventory'
    case routeSegments.products:
      return 'products'
    case routeSegments.expenses:
      return 'expenses'
    case routeSegments.employees:
      return 'employees'
    case routeSegments.quotes:
      return 'quotes'
    case routeSegments.money:
      return 'money'
    case routeSegments.customers:
      return 'customers'
    case routeSegments.suppliers:
      return 'suppliers'
    case routeSegments.settings:
      return 'settings'
    default:
      return 'dashboard'
  }
}

export function ModulePlaceholder({
  title,
  description,
  primaryActionLabel,
  primaryActionTo,
}: ModulePlaceholderProps) {
  const user = useAuthSessionStore((state) => state.user)
  const { dictionary, languageCode } = useAppTranslation()
  const moduleNavigationRoutes = getModuleNavigationRoutes(
    languageCode,
    getActiveBusinessCategory(user),
  ).filter((route) => route.isVisible)

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <BrandLogo
            brand={dictionary.auth.brand}
            size="sm"
            tagline={dictionary.layout.sidebar.title}
          />
          <span className={styles.badge}>
            {dictionary.states.modulePlaceholder.badge}
          </span>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>

          {primaryActionLabel && primaryActionTo ? (
            <div className={styles.actions}>
              <Link className={styles.primaryAction} to={primaryActionTo}>
                {primaryActionLabel}
              </Link>
            </div>
          ) : null}
        </div>

        <img alt="" className={styles.heroImage} src={emptyStateUrl} />
      </div>

      <div className={styles.grid}>
        {moduleNavigationRoutes.map((route) => (
          <article className={styles.card} key={route.path}>
            <span className={styles.cardIcon}>
              <AppIcon name={getRouteIconName(route.segment)} />
            </span>
            <p className={styles.cardLabel}>{route.label}</p>
            <p className={styles.cardText}>{route.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
