import { ArrowLeft, RefreshCw, TriangleAlert } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthSessionStore } from '@/modules/auth/hooks/use-auth-session-store'
import { getActiveBusinessRole } from '@/modules/auth/utils/get-active-business'
import { PurchaseOrdersPanel } from '@/modules/inventory/components/PurchaseOrdersPanel'
import { useProductsQuery } from '@/modules/products/hooks/use-products-query'
import { useSuppliersQuery } from '@/modules/suppliers/hooks/use-suppliers-query'
import { routePaths } from '@/routes/route-paths'
import { RetailPageLayout } from '@/shared/components/retail/RetailPageLayout'
import retailStyles from '@/shared/components/retail/RetailUI.module.css'
import { AppButton } from '@/shared/components/ui/AppButton'
import { isTeamManagementRole } from '@/shared/constants/user-roles'
import styles from './PurchaseOrdersPage.module.css'

export function PurchaseOrdersPage() {
  const authUser = useAuthSessionStore((state) => state.user)
  const canManageInventory = isTeamManagementRole(getActiveBusinessRole(authUser))
  const productsQuery = useProductsQuery()
  const suppliersQuery = useSuppliersQuery()

  if (!canManageInventory) {
    return <Navigate replace to={routePaths.inventory} />
  }

  const isLoading = productsQuery.isLoading || suppliersQuery.isLoading
  const hasError = productsQuery.isError || suppliersQuery.isError

  return (
    <RetailPageLayout
      bodyClassName={styles.body}
      title="Abastecimiento"
      meta={<span>Planifica pedidos, controla recepciones y evita quedarte sin mercancía.</span>}
      actions={(
        <Link className={`${retailStyles.buttonOutline} ${styles.backButton}`} to={routePaths.inventory}>
          <ArrowLeft aria-hidden="true" />
          Volver a inventario
        </Link>
      )}
    >
      {hasError ? (
        <section className={styles.feedback} role="alert">
          <TriangleAlert aria-hidden="true" />
          <div>
            <strong>No pudimos preparar las órdenes de compra</strong>
            <span>Revisa la conexión e intenta cargar nuevamente los productos y proveedores.</span>
          </div>
          <AppButton
            size="sm"
            startIcon={<RefreshCw aria-hidden="true" />}
            variant="secondary"
            onClick={() => void Promise.all([productsQuery.refetch(), suppliersQuery.refetch()])}
          >
            Reintentar
          </AppButton>
        </section>
      ) : isLoading ? (
        <section className={styles.loading} aria-live="polite">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Preparando abastecimiento</strong>
            <span>Cargando productos, proveedores y sugerencias de reposición…</span>
          </div>
        </section>
      ) : (
        <PurchaseOrdersPanel
          products={productsQuery.data ?? []}
          suppliers={suppliersQuery.data ?? []}
        />
      )}
    </RetailPageLayout>
  )
}
