import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  HandCoins,
  Landmark,
  ReceiptText,
  UserRound,
} from "lucide-react";
import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";
import type { CustomerSummary } from "@/modules/customers/types/customer";
import type { SupplierSummary } from "@/modules/suppliers/types/supplier";
import { CashRegisterRetailDrawer } from "./CashRegisterRetailDrawer";
import styles from "./MovementCreateDrawer.module.css";

export type MovementCreateKind =
  | "income"
  | "expenses"
  | "receivables"
  | "payables";

export type MovementCreateInput = {
  kind: MovementCreateKind;
  amount: number;
  concept: string;
  partyId?: string;
  paymentMethod: CashRegisterPaymentMethod;
  movementDate: string;
  dueDate?: string;
};

type MovementCreateDrawerProps = {
  isOpen: boolean;
  kind: MovementCreateKind;
  movementDate: string;
  customers: CustomerSummary[];
  suppliers: SupplierSummary[];
  canCreateIncome: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: MovementCreateInput) => Promise<void>;
};

const paymentMethods: Array<{
  value: CashRegisterPaymentMethod;
  label: string;
}> = [
  { value: "CASH", label: "Efectivo" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
  { value: "BANK_DEPOSIT", label: "Consignación" },
  { value: "OTHER", label: "Otro" },
];

const drawerCopy = {
  income: {
    title: "Registrar un ingreso",
    description: "Agrega dinero que entró al negocio y quedará reflejado en la caja.",
    eyebrow: "Entrada de dinero",
    submit: "Guardar ingreso",
    amount: "Valor recibido",
    concept: "Concepto del ingreso",
    placeholder: "Ej. aporte de capital, devolución...",
    Icon: ArrowDownLeft,
  },
  expenses: {
    title: "Registrar un egreso",
    description: "Registra un gasto pagado y el medio utilizado.",
    eyebrow: "Salida de dinero",
    submit: "Guardar egreso",
    amount: "Valor pagado",
    concept: "Concepto del egreso",
    placeholder: "Ej. transporte, servicios, caja menor...",
    Icon: ArrowUpRight,
  },
  receivables: {
    title: "Crear una cuenta por cobrar",
    description: "Registra una venta pendiente y asígnala al cliente responsable.",
    eyebrow: "Dinero por recibir",
    submit: "Crear cuenta por cobrar",
    amount: "Valor por cobrar",
    concept: "Concepto de la cuenta",
    placeholder: "Ej. venta a crédito, servicio pendiente...",
    Icon: HandCoins,
  },
  payables: {
    title: "Crear una cuenta por pagar",
    description: "Registra un compromiso pendiente con un proveedor.",
    eyebrow: "Dinero por pagar",
    submit: "Crear cuenta por pagar",
    amount: "Valor pendiente",
    concept: "Concepto de la cuenta",
    placeholder: "Ej. compra a crédito, factura de proveedor...",
    Icon: ReceiptText,
  },
} satisfies Record<MovementCreateKind, object>;

function toAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
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
  onSubmit,
}: MovementCreateDrawerProps) {
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [partyId, setPartyId] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<CashRegisterPaymentMethod>("CASH");
  const [selectedMovementDate, setSelectedMovementDate] = useState(movementDate);
  const [dueDate, setDueDate] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const copy = drawerCopy[kind];
  const Icon = copy.Icon;
  const isReceivable = kind === "receivables";
  const isExpense = kind === "expenses";
  const isPayable = kind === "payables";
  const partyOptions = useMemo(
    () => (isReceivable ? customers : suppliers),
    [customers, isReceivable, suppliers],
  );
  const isIncomeBlocked = kind === "income" && !canCreateIncome;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setAmount("");
    setConcept("");
    setPartyId("");
    setPaymentMethod(kind === "payables" ? "CREDIT" : "CASH");
    setSelectedMovementDate(movementDate);
    setDueDate("");
    setErrorMessage(null);
  }, [isOpen, kind, movementDate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (toAmount(amount) <= 0) {
      setErrorMessage("Ingresa un valor mayor a cero.");
      return;
    }

    if (concept.trim().length < 2) {
      setErrorMessage("Escribe un concepto de al menos 2 caracteres.");
      return;
    }

    if (isReceivable && !partyId) {
      setErrorMessage("Selecciona el cliente responsable de la cuenta.");
      return;
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
      });
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No fue posible crear el movimiento.",
      );
    }
  }

  return (
    <CashRegisterRetailDrawer
      isOpen={isOpen}
      title={copy.title}
      description={copy.description}
      onClose={onClose}
    >
      <form className={styles.form} noValidate onSubmit={handleSubmit}>
        <div className={`${styles.contextCard} ${styles[`contextCard_${kind}`]}`}>
          <span className={styles.contextIcon}><Icon /></span>
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
              <small>Los ingresos manuales deben quedar asociados a un turno activo.</small>
            </span>
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

        {isReceivable || isExpense || isPayable ? (
          <label className={styles.field}>
            <span>{isReceivable ? "Cliente *" : "Proveedor (opcional)"}</span>
            <div className={styles.inputWithIcon}>
              <UserRound />
              <select value={partyId} onChange={(event) => setPartyId(event.target.value)}>
                <option value="">
                  {isReceivable ? "Selecciona un cliente" : "Sin proveedor"}
                </option>
                {partyOptions.map((party) => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </div>
          </label>
        ) : null}

        {isExpense ? (
          <label className={styles.field}>
            <span>Medio de pago</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as CashRegisterPaymentMethod)}>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </label>
        ) : null}

        <div className={styles.dateGrid}>
          <label className={styles.field}>
            <span>{isPayable ? "Fecha del compromiso" : "Fecha del movimiento"}</span>
            <div className={styles.inputWithIcon}>
              <CalendarDays />
              <input type="date" value={selectedMovementDate} onChange={(event) => setSelectedMovementDate(event.target.value)} />
            </div>
          </label>

          {isReceivable ? (
            <label className={styles.field}>
              <span>Fecha límite (opcional)</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          ) : null}
        </div>

        {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}

        <button className={`${styles.submitButton} ${styles[`submitButton_${kind}`]}`} disabled={isSubmitting || isIncomeBlocked} type="submit">
          {isSubmitting ? "Guardando movimiento..." : copy.submit}
        </button>
      </form>
    </CashRegisterRetailDrawer>
  );
}
