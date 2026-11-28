import { ArrowUpRight, Check, PackagePlus, ReceiptText, Store } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BusinessSetupProgress } from '@/shared/types/business-setup-progress'
import { routePaths } from '@/routes/route-paths'
import styles from './BusinessSetupChecklist.module.css'

type BusinessSetupChecklistProps = {
  progress?: BusinessSetupProgress
}

export function BusinessSetupChecklist({ progress }: BusinessSetupChecklistProps) {
  if (!progress) return null

  const tasks = [
    {
      complete: progress.hasAddedProduct,
      description: 'Agrega un producto o importa tu catálogo desde Excel o CSV.',
      icon: <PackagePlus aria-hidden="true" />,
      label: 'Cargar productos',
      actions: [
        { label: 'Crear producto', path: `${routePaths.products}?mode=create&tab=basic` },
        { label: 'Carga masiva', path: `${routePaths.products}?mode=import` },
      ],
    },
    {
      complete: progress.hasOpenedCashRegister,
      description: 'Ingresa el saldo inicial y abre tu primer turno.',
      icon: <Store aria-hidden="true" />,
      label: 'Abrir caja',
      actions: [{ label: 'Abrir caja', path: `${routePaths.cashRegister}?session=open` }],
    },
    {
      complete: progress.hasRecordedSale,
      description: 'Agrega productos a la venta y registra el pago o el crédito.',
      icon: <ReceiptText aria-hidden="true" />,
      label: 'Registrar la primera venta',
      actions: [{ label: 'Nueva venta', path: routePaths.salesNew }],
    },
  ]
  const completed = tasks.filter((task) => task.complete).length

  if (completed === tasks.length) return null

  return (
    <section className={styles.card} aria-labelledby="business-setup-title">
      <div className={styles.header}>
        <h2 id="business-setup-title">Primeros pasos</h2>
        <span aria-live="polite" className={styles.progressSummary}>
          {completed} de {tasks.length} completados
        </span>
      </div>
      <div
        aria-label="Progreso de primeros pasos"
        aria-valuemax={tasks.length}
        aria-valuemin={0}
        aria-valuenow={completed}
        className={styles.progressTrack}
        role="progressbar"
      >
        <span style={{ width: `${(completed / tasks.length) * 100}%` }} />
      </div>
      <ol className={styles.tasks}>
        {tasks.map((task) => (
          <li className={styles.task} data-complete={task.complete || undefined} key={task.label}>
            <div className={styles.taskHeader}>
              <span className={styles.taskIcon}>{task.icon}</span>
              <div>
                <h3>{task.label}</h3>
                <p>{task.description}</p>
              </div>
            </div>
            {task.complete ? (
              <span className={styles.taskStatus}><Check aria-hidden="true" /> Completado</span>
            ) : (
              <div className={styles.taskActions}>
                {task.actions.map(({ label, path }) => (
                  <Link className={styles.action} key={path} to={path}>
                    {label} <ArrowUpRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
