import { ModulePlaceholder } from '@/shared/components/states/ModulePlaceholder'
import { routePaths } from '@/routes/route-paths'

export function NotFoundPage() {
  return (
    <ModulePlaceholder
      title="Ruta no encontrada"
      description="Esta ruta está fuera del mapa actual de módulos. La base del sistema está lista, pero esta pantalla todavía no existe."
      primaryActionLabel="Volver al resumen"
      primaryActionTo={routePaths.dashboard}
    />
  )
}
