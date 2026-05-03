import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  expenseFormSchema,
  type ExpenseFormValues,
} from "@/modules/expenses/schemas/expense-form-schema";
import type {
  Expense,
  ExpenseCategory,
  ExpenseMutationInput,
} from "@/modules/expenses/types/expense";
import {
  toExpenseDateInputValue,
  toExpenseRequestDate,
} from "@/modules/expenses/utils/format-expense";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { ApiError } from "@/shared/services/api-client";
import styles from "./ExpenseFormPanel.module.css";

type ExpenseFormPanelProps = {
  categories: ExpenseCategory[];
  expense: Expense | null;
  isSubmitting: boolean;
  onStartCreate: () => void;
  onSubmit: (input: ExpenseMutationInput) => Promise<void>;
};

function getDefaultValues(expense: Expense | null): ExpenseFormValues {
  return {
    concept: expense?.concept ?? "",
    categoryId: expense?.categoryId ?? "",
    amount: expense?.amount ?? 0,
    paymentMethod: expense?.paymentMethod ?? "CASH",
    status: expense?.status ?? "PAID",
    expenseDate: toExpenseDateInputValue(expense?.expenseDate ?? new Date()),
    notes: expense?.notes ?? "",
  };
}

function normalizeOptionalValue(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function normalizeOptionalRelationId(value: string | undefined) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No pudimos guardar el gasto en este momento.";
}

export function ExpenseFormPanel({
  categories,
  expense,
  isSubmitting,
  onStartCreate,
  onSubmit,
}: ExpenseFormPanelProps) {
  const isEditing = expense !== null;
  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: getDefaultValues(expense),
  });

  const selectedStatus = watch("status");
  const selectedPaymentMethod = watch("paymentMethod");

  useEffect(() => {
    reset(getDefaultValues(expense));
  }, [expense, reset]);

  const submitExpense = handleSubmit(async (values) => {
    try {
      await onSubmit({
        concept: values.concept.trim(),
        categoryId: normalizeOptionalRelationId(values.categoryId),
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        status: values.status,
        expenseDate: toExpenseRequestDate(values.expenseDate),
        notes: normalizeOptionalValue(values.notes) ?? null,
      });

      if (!isEditing) {
        reset(getDefaultValues(null));
      }
    } catch (error) {
      setError("root", {
        message: getErrorMessage(error),
      });
    }
  });

  return (
    <SurfaceCard className={styles.card}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            {isEditing ? "Editar gasto" : "Nuevo gasto"}
          </p>
          <h3 className={styles.title}>
            {isEditing ? expense.concept : "Registra un nuevo egreso"}
          </h3>
          <p className={styles.description}>
            Guarda concepto, categoría, método de pago y estado para mantener
            caja, reportes y clasificación financiera alineados.
          </p>
        </div>

        <button
          className={styles.secondaryButton}
          type="button"
          onClick={onStartCreate}
        >
          {isEditing ? "Crear otro" : "Limpiar"}
        </button>
      </div>

      <form className={styles.form} noValidate onSubmit={submitExpense}>
        <label className={styles.field}>
          <span className={styles.label}>Concepto</span>
          <input
            aria-invalid={Boolean(errors.concept)}
            className={styles.input}
            placeholder="Arriendo del local"
            type="text"
            {...register("concept")}
          />
          {errors.concept ? (
            <p className={styles.errorMessage}>{errors.concept.message}</p>
          ) : null}
        </label>

        <div className={styles.inlineFields}>
          <label className={styles.field}>
            <span className={styles.label}>Categoría</span>
            <select className={styles.select} {...register("categoryId")}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Valor</span>
            <input
              aria-invalid={Boolean(errors.amount)}
              className={styles.input}
              inputMode="decimal"
              min="0.01"
              step="0.01"
              type="number"
              {...register("amount")}
            />
            {errors.amount ? (
              <p className={styles.errorMessage}>{errors.amount.message}</p>
            ) : null}
          </label>
        </div>

        <div className={styles.inlineFields}>
          <label className={styles.field}>
            <span className={styles.label}>Método de pago</span>
            <select className={styles.select} {...register("paymentMethod")}>
              <option value="CASH">Efectivo</option>
              <option value="CARD">Tarjeta</option>
              <option value="TRANSFER">Transferencia</option>
              <option value="DIGITAL_WALLET">Billetera digital</option>
              <option value="BANK_DEPOSIT">Consignación</option>
              <option value="CREDIT">Crédito</option>
              <option value="OTHER">Otro</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Estado</span>
            <select className={styles.select} {...register("status")}>
              <option value="PAID">Pagado</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Fecha del gasto</span>
          <input
            aria-invalid={Boolean(errors.expenseDate)}
            className={styles.input}
            type="date"
            {...register("expenseDate")}
          />
          {errors.expenseDate ? (
            <p className={styles.errorMessage}>{errors.expenseDate.message}</p>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Notas</span>
          <textarea
            className={styles.textarea}
            placeholder="Detalle adicional para auditoría, proveedor o contexto del pago."
            rows={4}
            {...register("notes")}
          />
          {errors.notes ? (
            <p className={styles.errorMessage}>{errors.notes.message}</p>
          ) : null}
        </label>

        {selectedStatus === "PAID" && selectedPaymentMethod === "CASH" ? (
          <div className={styles.helperBanner}>
            Si hay una caja abierta, este gasto impactará automáticamente el
            arqueo diario.
          </div>
        ) : null}

        {errors.root?.message ? (
          <div className={styles.errorBanner} role="alert">
            {errors.root.message}
          </div>
        ) : null}

        <div className={styles.footer}>
          <p className={styles.helperText}>
            Usa categorías claras para que reportes y flujo de caja sean más
            útiles después.
          </p>

          <button
            className={styles.primaryButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? isEditing
                ? "Guardando..."
                : "Creando..."
              : isEditing
                ? "Guardar cambios"
                : "Crear gasto"}
          </button>
        </div>
      </form>
    </SurfaceCard>
  );
}
