import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  HandCoins,
  Landmark,
  PackagePlus,
  Plus,
  ReceiptText,
  UserRound,
} from 'lucide-react'
import type { CashRegisterPaymentMethod } from '@/modules/cash-register/types/cash-register'
import type { CustomerSummary } from '@/modules/customers/types/customer'
import type { SupplierSummary } from '@/modules/suppliers/types/supplier'
import { QuickCreateSupplierDrawer } from '@/modules/suppliers/components/QuickCreateSupplierDrawer'
import { COLLECTED_PAYMENT_METHOD_OPTIONS } from '@/shared/payments/payment-methods'
import { CashRegisterRetailDrawer } from './CashRegisterRetailDrawer'
import styles from './MovementCreateDrawer.module.css'

export type MovementCreateKind =
  | 'income'
  | 'expenses'
  | 'receivables'
  | 'payables'

export type MovementCreateInput = {
  kind: MovementCreateKind
  amount: number
  concept: string
  partyId?: string
  paymentMethod: CashRegisterPaymentMethod
  movementDate: string
  dueDate?: string
}

type MovementCreateDrawerProps = {
  isOpen: boolean
  kind: MovementCreateKind
  movementDate: string
  customers: CustomerSummary[]
  suppliers: SupplierSummary[]
  canCreateIncome: boolean
  isSubmitting: boolean
  onClose: () => void
  onOpenInventoryPurchase: () => void
  onSubmit: (input: MovementCreateInput) => Promise<void>
}

const paymentMethods: Array<{
  value: CashRegisterPaymentMethod
  label: string
}> = COLLECTED_PAYMENT_METHOD_OPTIONS.map(({ value, label }) => ({
  value: value as CashRegisterPaymentMethod,
  label,
}))

const drawerCopy = {
  income: {
    title: 'Registrar un ingreso',
    description:
      'Agrega dinero que entró al negocio y quedará reflejado en la caja.',
    eyebrow: 'Entrada de dinero',
    submit: 'Guardar ingreso',
    amount: 'Valor recibido',
    concept: 'Concepto del ingreso',
    placeholder: 'Ej. aporte de capital, devolución...',
    Icon: ArrowDownLeft,
  },
  expenses: {
    title: 'Registrar gasto operativo',
    description:
      'Registra una salida de caja que no aumenta las existencias del inventario.',
    eyebrow: 'Gasto operativo',
    submit: 'Guardar gasto',
    amount: 'Valor pagado',
    concept: 'Concepto del egreso',
    placeholder: 'Ej. transporte, servicios, caja menor...',
    Icon: ArrowUpRight,
  },
  receivables: {
    title: 'Crear una cuenta por cobrar',
    description:
      'Registra una venta pendiente y asígnala al cliente responsable.',
    eyebrow: 'Dinero por recibir',
    submit: 'Crear cuenta por cobrar',
    amount: 'Valor por cobrar',
    concept: 'Concepto de la cuenta',
    placeholder: 'Ej. venta a crédito, servicio pendiente...',
    Icon: HandCoins,
  },
  payables: {
    title: 'Crear una cuenta por pagar',
    description:
      'Registra un compromiso operativo pendiente que no corresponde a mercancía.',
    eyebrow: 'Dinero por pagar',
    submit: 'Crear cuenta por pagar',
    amount: 'Valor pendiente',
    concept: 'Concepto de la cuenta',
    placeholder: 'Ej. compra a crédito, factura de proveedor...',
    Icon: ReceiptText,
  },
} satisfies Record<MovementCreateKind, object>

const CREATE_SUPPLIER_VALUE = '__create_supplier__'

function toAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export function MovementCreateDrawer({
  isOpen,
  kind,
  movementDate,
  customers,
  suppliers,
  canCreateIncome,
  isSubmitting,
  onClose,
  onOpenInventoryPurchase,
  onSubmit,
}: MovementCreateDrawerProps) {
  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [partyId, setPartyId] = useState('')
  const [paymentMethod, setPaymentMethod] =
    useState<CashRegisterPaymentMethod>('CASH')
  const [selectedMovementDate, setSelectedMovementDate] = useState(movementDate)
  const [dueDate, setDueDate] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isQuickSupplierOpen, setQuickSupplierOpen] = useState(false)
  const copy = drawerCopy[kind]
  const Icon = copy.Icon
  const isReceivable = kind === 'receivables'
  const isExpense = kind === 'expenses'
  const isPayable = kind === 'payables'
  const partyOptions = useMemo(
    () => (isReceivable ? customers : suppliers),
    [customers, isReceivable, suppliers],
  )
  const isIncomeBlocked = kind === 'income' && !canCreateIncome

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setAmount('')
    setConcept('')
    setPartyId('')
    setPaymentMethod(kind === 'payables' ? 'CREDIT' : 'CASH')
    setSelectedMovementDate(movementDate)
    setDueDate('')
    setErrorMessage(null)
    setQuickSupplierOpen(false)
  }, [isOpen, kind, movementDate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (toAmount(amount) <= 0) {
      setErrorMessage('Ingresa un valor mayor a cero.')
      return
    }

    if (concept.trim().length < 2) {
      setErrorMessage('Escribe un concepto de al menos 2 caracteres.')
      return
    }

    if (isReceivable && !partyId) {
      setErrorMessage('Selecciona el cliente responsable de la cuenta.')
      return
    }

    try {
      await onSubmit({
        kind,
        amount: toAmount(amount),
        concept: concept.trim(),
        partyId: partyId || undefined,
        paymentMethod,
        movementDate: selectedMovementDate,
        dueDate: dueDate || undefined,
      })
      onClose()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible crear el movimiento.',
      )
    }
  }

  return (
    <>
      <CashRegisterRetailDrawer
        confirmClose
        isOpen={isOpen}
        title={copy.title}
        description={copy.description}
        onClose={onClose}
      >
        <form className={styles.form} noValidate onSubmit={handleSubmit}>
          <div
            className={`${styles.contextCard} ${styles[`contextCard_${kind}`]}`}
          >
            <span className={styles.contextIcon}>
              <Icon />
            </span>
            <span>
              <small>{copy.eyebrow}</small>
              <strong>{copy.title}</strong>
            </span>
          </div>

          {isIncomeBlocked ? (
            <div className={styles.warningBox}>
              <Landmark />
              <span>
                <strong>Necesitas abrir la caja</strong>
                <small>
                  Los ingresos manuales deben quedar asociados a un turno
                  activo.
                </small>
              </span>
            </div>
          ) : null}

          {isExpense || isPayable ? (
            <div className={styles.inventoryPurchaseCallout}>
              <span className={styles.inventoryPurchaseIcon}>
                <PackagePlus aria-hidden="true" />
              </span>
              <span className={styles.inventoryPurchaseCopy}>
                <strong>¿Compraste mercancía para vender?</strong>
                <small>
                  Registra la compra en Inventario para aumentar existencias,
                  asociar el proveedor y descontar de caja solo lo que pagaste.
                </small>
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenInventoryPurchase()
                }}
              >
                Registrar compra
              </button>
            </div>
          ) : null}

          <label className={styles.field}>
            <span>{copy.amount}</span>
            <div className={styles.moneyInput}>
              <strong>$</strong>
              <input
                autoFocus
                inputMode="decimal"
                min="0"
                placeholder="0,00"
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>{copy.concept}</span>
            <input
              placeholder={copy.placeholder}
              type="text"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
            />
          </label>

          {isReceivable ? (
            <label className={styles.field}>
              <span>Cliente *</span>
              <div className={styles.inputWithIcon}>
                <UserRound />
                <SearchableSelect
                  value={partyId}
                  onChange={(event) => setPartyId(event.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {partyOptions.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </SearchableSelect>
              </div>
            </label>
          ) : null}

          {isExpense || isPayable ? (
            <div className={styles.field}>
              <span>Proveedor (opcional)</span>
              <div className={styles.partyPickerRow}>
                <div className={styles.inputWithIcon}>
                  <UserRound />
                  <SearchableSelect
                    value={partyId}
                    onChange={(event) => {
                      if (event.target.value === CREATE_SUPPLIER_VALUE) {
                        setQuickSupplierOpen(true)
                        return
                      }
                      setPartyId(event.target.value)
                    }}
                  >
                    <option value="">Sin proveedor</option>
                    <option value={CREATE_SUPPLIER_VALUE}>
                      ＋ Crear proveedor nuevo
                    </option>
                    {partyOptions.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </SearchableSelect>
                </div>
                <button
                  aria-label="Crear proveedor"
                  className={styles.createPartyButton}
                  title="Crear proveedor"
                  type="button"
                  onClick={() => setQuickSupplierOpen(true)}
                >
                  <Plus aria-hidden="true" />
                </button>
              </div>
              <small className={styles.fieldHint}>
                Si no está registrado, créalo sin salir de este movimiento.
              </small>
            </div>
          ) : null}

          {isExpense ? (
            <label className={styles.field}>
              <span>Medio de pago</span>
              <SearchableSelect
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(
                    event.target.value as CashRegisterPaymentMethod,
                  )
                }
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </SearchableSelect>
            </label>
          ) : null}

          <div className={styles.dateGrid}>
            <label className={styles.field}>
              <span>
                {isPayable ? 'Fecha del compromiso' : 'Fecha del movimiento'}
              </span>
              <div className={styles.inputWithIcon}>
                <CalendarDays />
                <input
                  type="date"
                  value={selectedMovementDate}
                  onChange={(event) =>
                    setSelectedMovementDate(event.target.value)
                  }
                />
              </div>
            </label>

            {isReceivable ? (
              <label className={styles.field}>
                <span>Fecha límite (opcional)</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </label>
            ) : null}
          </div>

          {errorMessage ? (
            <p className={styles.errorMessage}>{errorMessage}</p>
          ) : null}

          <button
            className={`${styles.submitButton} ${styles[`submitButton_${kind}`]}`}
            disabled={isSubmitting || isIncomeBlocked}
            type="submit"
          >
            {isSubmitting ? 'Guardando movimiento...' : copy.submit}
          </button>
        </form>
      </CashRegisterRetailDrawer>
      <QuickCreateSupplierDrawer
        isOpen={isQuickSupplierOpen}
        suppliers={suppliers}
        onClose={() => setQuickSupplierOpen(false)}
        onCreated={(supplier) => {
          setPartyId(supplier.id)
          setQuickSupplierOpen(false)
        }}
      />
    </>
  )
}
