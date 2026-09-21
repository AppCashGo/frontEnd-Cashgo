import { useEffect, useState } from 'react'
import type { CustomerSummary } from '@/modules/customers/types/customer'
import type { HeldSale } from '@/modules/sales/types/held-sale'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'
import { ModalShell } from '@/shared/components/ui/ModalShell'
import { SideDrawer } from '@/shared/components/ui/SideDrawer'
import { formatCurrency } from '@/shared/utils/format-currency'
import { getErrorMessage } from '@/shared/utils/get-error-message'
import styles from './HeldSalesDrawer.module.css'

type SaveModalProps = {
  isOpen: boolean
  customers: CustomerSummary[]
  defaultCustomerId: string
  defaultLabel: string
  defaultNotes: string
  isEditing: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (values: { label: string; customerId: string; notes: string }) => Promise<void>
}

export function HoldSaleModal({
  isOpen,
  customers,
  defaultCustomerId,
  defaultLabel,
  defaultNotes,
  isEditing,
  isSaving,
  onClose,
  onSave,
}: SaveModalProps) {
  const [label, setLabel] = useState(defaultLabel)
  const [customerId, setCustomerId] = useState(defaultCustomerId)
  const [notes, setNotes] = useState(defaultNotes)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLabel(defaultLabel)
    setCustomerId(defaultCustomerId)
    setNotes(defaultNotes)
    setErrorMessage(null)
  }, [defaultCustomerId, defaultLabel, defaultNotes, isOpen])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!label.trim()) {
      setErrorMessage('Escribe un nombre para identificar la cuenta.')
      return
    }
    try {
      setErrorMessage(null)
      await onSave({ label: label.trim(), customerId, notes: notes.trim() })
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'No pudimos guardar la cuenta en espera.'),
      )
    }
  }

  return (
    <ModalShell
      ariaLabel={isEditing ? 'Actualizar cuenta en espera' : 'Dejar cuenta en espera'}
      isCloseDisabled={isSaving}
      isOpen={isOpen}
      panelClassName={styles.modal}
      onClose={onClose}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <p className={styles.eyebrow}>CUENTA TEMPORAL</p>
          <h3>{isEditing ? 'Actualizar cuenta en espera' : 'Dejar cuenta en espera'}</h3>
          <p className={styles.help}>
            No se registrará una venta ni un movimiento de caja hasta cobrarla.
          </p>
        </div>

        <label className={styles.field}>
          <span>Nombre para identificarla *</span>
          <input
            autoFocus
            maxLength={120}
            placeholder="Ej. Juan — regresa en un momento"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Cliente registrado (opcional)</span>
          <SearchableSelect
            searchPlaceholder="Buscar cliente"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
          >
            <option value="">Sin cliente relacionado</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </SearchableSelect>
        </label>

        <label className={styles.field}>
          <span>Observación (opcional)</span>
          <textarea
            maxLength={500}
            placeholder="Ej. Productos separados en el mostrador"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} disabled={isSaving} type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? 'Guardando…' : isEditing ? 'Actualizar espera' : 'Guardar y liberar carrito'}
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

type HeldSalesDrawerProps = {
  isOpen: boolean
  heldSales: HeldSale[]
  isLoading: boolean
  cancellingId: string | null
  onClose: () => void
  onResume: (heldSale: HeldSale) => void
  onCancel: (heldSale: HeldSale) => Promise<void>
}

function formatElapsed(value: string) {
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  )
  if (elapsedMinutes < 1) return 'Hace menos de un minuto'
  if (elapsedMinutes < 60) return `Hace ${elapsedMinutes} min`
  const hours = Math.floor(elapsedMinutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(
    new Date(value),
  )
}

export function HeldSalesDrawer({
  isOpen,
  heldSales,
  isLoading,
  cancellingId,
  onClose,
  onResume,
  onCancel,
}: HeldSalesDrawerProps) {
  return (
    <SideDrawer
      bodyClassName={styles.drawerBody}
      description="Recupera una canasta, modifícala o llévala al cobro."
      isOpen={isOpen}
      panelClassName={styles.drawer}
      title={`Cuentas en espera (${heldSales.length})`}
      onClose={onClose}
    >
      {isLoading ? (
        <p className={styles.empty}>Cargando cuentas…</p>
      ) : heldSales.length === 0 ? (
        <div className={styles.emptyCard}>
          <strong>No hay cuentas en espera</strong>
          <p>Las canastas que guardes temporalmente aparecerán aquí.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {heldSales.map((heldSale) => (
            <article className={styles.card} key={heldSale.id}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.code}>{heldSale.code}</span>
                  <h4>{heldSale.label}</h4>
                </div>
                <strong className={styles.total}>{formatCurrency(heldSale.total)}</strong>
              </div>
              <div className={styles.meta}>
                <span>{heldSale.customer?.name ?? 'Sin cliente relacionado'}</span>
                <span>{heldSale.items.reduce((sum, item) => sum + item.quantity, 0)} productos</span>
                <span>{formatElapsed(heldSale.updatedAt)}</span>
                <span>Atendió: {heldSale.createdByUser?.name ?? 'Usuario'}</span>
              </div>
              {heldSale.notes ? <p className={styles.notes}>{heldSale.notes}</p> : null}
              <div className={styles.items}>
                {heldSale.items.slice(0, 3).map((item) => (
                  <span key={item.id}>
                    {item.quantity} × {item.productName}
                  </span>
                ))}
                {heldSale.items.length > 3 ? (
                  <span>+ {heldSale.items.length - 3} productos más</span>
                ) : null}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.primaryButton} type="button" onClick={() => onResume(heldSale)}>
                  Retomar y cobrar
                </button>
                <button
                  className={styles.dangerButton}
                  disabled={cancellingId === heldSale.id}
                  type="button"
                  onClick={() => {
                    if (window.confirm(`¿Cancelar ${heldSale.code} y liberar sus productos?`)) {
                      void onCancel(heldSale)
                    }
                  }}
                >
                  {cancellingId === heldSale.id ? 'Liberando…' : 'Cancelar'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </SideDrawer>
  )
}
