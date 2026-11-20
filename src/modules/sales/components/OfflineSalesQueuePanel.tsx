import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw } from 'lucide-react'
import type { OfflineSaleRecord } from '@/modules/sales/types/offline-sale'
import { formatCurrency } from '@/shared/utils/format-currency'
import { formatDate } from '@/shared/utils/format-date'
import styles from './OfflineSalesQueuePanel.module.css'

type OfflineSalesQueuePanelProps = {
  isOnline: boolean
  isSyncing: boolean
  records: OfflineSaleRecord[]
  onRetry: (id: string) => void
  onSynchronize: () => void
}

const statusLabels: Record<OfflineSaleRecord['status'], string> = {
  PENDING: 'Pendiente',
  SYNCING: 'Sincronizando',
  FAILED: 'Requiere revisión',
  SYNCED: 'Sincronizada',
}

export function OfflineSalesQueuePanel({
  isOnline,
  isSyncing,
  records,
  onRetry,
  onSynchronize,
}: OfflineSalesQueuePanelProps) {
  if (records.length === 0 && isOnline) return null

  const pendingCount = records.filter(
    (record) => record.status === 'PENDING' || record.status === 'SYNCING',
  ).length
  const failedCount = records.filter((record) => record.status === 'FAILED').length
  const visibleRecords = records.slice(0, 6)

  return (
    <section className={styles.panel} aria-label="Ventas sin conexión">
      <div className={styles.heading}>
        <div className={styles.headingIcon}>
          {isOnline ? <RefreshCw size={20} /> : <CloudOff size={20} />}
        </div>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>Ventas sin conexión</p>
          <h2>{isOnline ? 'Cola de sincronización' : 'Estás trabajando sin internet'}</h2>
          <p>
            {isOnline
              ? `${pendingCount} pendientes y ${failedCount} con revisión necesaria.`
              : 'Puedes seguir vendiendo. Las ventas se enviarán cuando regrese la conexión.'}
          </p>
        </div>
        {isOnline && pendingCount > 0 ? (
          <button
            className={styles.syncButton}
            disabled={isSyncing}
            type="button"
            onClick={onSynchronize}
          >
            <RefreshCw className={isSyncing ? styles.spinning : undefined} size={17} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
          </button>
        ) : null}
      </div>

      {visibleRecords.length > 0 ? (
        <div className={styles.records}>
          {visibleRecords.map((record) => (
            <article className={styles.record} key={record.id}>
              <div
                className={`${styles.statusIcon} ${styles[record.status.toLowerCase()]}`}
              >
                {record.status === 'FAILED' ? (
                  <AlertTriangle size={17} />
                ) : record.status === 'SYNCED' ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <CloudOff size={17} />
                )}
              </div>
              <div className={styles.recordCopy}>
                <strong>
                  {record.saleNumber ?? `Venta local · ${record.itemCount} productos`}
                </strong>
                <span>{formatDate(record.createdAt)}</span>
                {record.lastError ? <small>{record.lastError}</small> : null}
              </div>
              <strong className={styles.total}>{formatCurrency(record.total)}</strong>
              <span
                className={`${styles.status} ${styles[record.status.toLowerCase()]}`}
              >
                {statusLabels[record.status]}
              </span>
              {record.status === 'FAILED' ? (
                <button
                  className={styles.retryButton}
                  disabled={!isOnline || isSyncing}
                  type="button"
                  onClick={() => onRetry(record.id)}
                >
                  Reintentar
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  )
}
