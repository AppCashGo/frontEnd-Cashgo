import { Check, Circle, PackagePlus, ReceiptText, Settings2, UserRoundPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardSummary } from '@/modules/dashboard/types/dashboard-summary'
import { routePaths } from '@/routes/route-paths'
import styles from './BusinessSetupChecklist.module.css'

type BusinessSetupChecklistProps = {
  businessCategory?: string | null
  businessName?: string | null
  summary?: DashboardSummary
}

export function BusinessSetupChecklist({
  businessCategory,
  businessName,
  summary,
}: BusinessSetupChecklistProps) {
  if (!summary) return null

  const tasks = [
    {
      complete: Boolean(businessName?.trim() && businessCategory?.trim()),
      description: 'Confirma la categoría y los datos principales del negocio.',
      icon: <Settings2 aria-hidden="true" />,
      label: 'Configura tu negocio',
      path: routePaths.settings,
    },
    {
      complete: summary.activeProductsCount > 0,
      description: 'Agrega los productos o servicios que vas a vender.',
      icon: <PackagePlus aria-hidden="true" />,
      label: 'Crea tu catálogo',
      path: `${routePaths.products}?mode=create&tab=basic`,
    },
    {
      complete: summary.totalRevenue > 0 || summary.salesToday > 0,
      description: 'Registra una venta para activar reportes y movimientos.',
      icon: <ReceiptText aria-hidden="true" />,
      label: 'Realiza la primera venta',
      path: routePaths.salesNew,
    },
    {
      complete: summary.customersCount > 0,
      description: 'Guarda un cliente para habilitar historial y cartera.',
      icon: <UserRoundPlus aria-hidden="true" />,
      label: 'Registra un cliente',
      path: routePaths.customers,
    },
  ]
  const completedTasks = tasks.filter((task) => task.complete).length

  if (completedTasks === tasks.length) return null

  const progress = Math.round((completedTasks / tasks.length) * 100)

  return (
    <section className={styles.card} aria-labelledby="business-setup-title">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Primeros pasos</span>
          <h2 id="business-setup-title">Deja tu negocio listo para operar</h2>
          <p>Completa estas tareas esenciales y CashGo organizará el resto del flujo.</p>
        </div>
        <div className={styles.progressSummary}>
          <strong>{progress}%</strong>
          <span>{completedTasks} de {tasks.length}</span>
        </div>
      </div>

      <div className={styles.progressTrack} aria-label={`${progress}% completado`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className={styles.tasks}>
        {tasks.map((task) => (
          <Link className={task.complete ? styles.taskComplete : styles.task} key={task.label} to={task.path}>
            <span className={styles.taskIcon}>{task.icon}</span>
            <span className={styles.taskCopy}>
              <strong>{task.label}</strong>
              <small>{task.description}</small>
            </span>
            <span className={styles.taskState}>
              {task.complete ? <Check aria-hidden="true" /> : <Circle aria-hidden="true" />}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
