import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  expenseCategoryFormSchema,
  type ExpenseCategoryFormValues,
} from '@/modules/expenses/schemas/expense-category-form-schema'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryInput,
} from '@/modules/expenses/types/expense'
import { SurfaceCard } from '@/shared/components/ui/SurfaceCard'
import { ApiError } from '@/shared/services/api-client'
import styles from './ExpenseCategoriesPanel.module.css'

type ExpenseCategoriesPanelProps = {
  categories: ExpenseCategory[]
  expenses: Expense[]
  isSubmitting: boolean
  onSubmit: (input: ExpenseCategoryInput) => Promise<void>
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'No pudimos crear la categoría en este momento.'
}

export function ExpenseCategoriesPanel({
  categories,
  expenses,
  isSubmitting,
  onSubmit,
}: ExpenseCategoriesPanelProps) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(expenseCategoryFormSchema),
    defaultValues: {
      name: '',
      color: '#EEF2FF',
    },
  })

  const usageCountByCategoryId = expenses.reduce<Record<string, number>>(
    (counts, expense) => {
      if (!expense.categoryId) {
        return counts
      }

      counts[expense.categoryId] = (counts[expense.categoryId] ?? 0) + 1
      return counts
    },
    {},
  )

  const submitCategory = handleSubmit(async (values) => {
    try {
      await onSubmit({
        name: values.name.trim(),
        color: values.color,
      })

      reset({
        name: '',
        color: '#EEF2FF',
      })
    } catch (error) {
      setError('root', {
        message: getErrorMessage(error),
      })
    }
  })

  return (
    <SurfaceCard className={styles.card}>
      <div>
        <p className={styles.eyebrow}>Clasificación</p>
        <h3 className={styles.title}>Categorías activas</h3>
        <p className={styles.description}>
          Define grupos simples para separar operación, transporte, servicios,
          nómina o cualquier gasto recurrente de tu negocio.
        </p>
      </div>

      <div className={styles.categoryList}>
        {categories.map((category) => (
          <div key={category.id} className={styles.categoryItem}>
            <div>
              <p className={styles.categoryName}>{category.name}</p>
              <p className={styles.categoryMeta}>
                {usageCountByCategoryId[category.id] ?? 0} gasto
                {(usageCountByCategoryId[category.id] ?? 0) === 1 ? '' : 's'}
              </p>
            </div>

            <span className={styles.categoryColor}>{category.color}</span>
          </div>
        ))}
      </div>

      <form className={styles.form} noValidate onSubmit={submitCategory}>
        <div className={styles.formHeader}>
          <p className={styles.formTitle}>Nueva categoría</p>
          <p className={styles.formDescription}>
            Úsala para clasificar egresos y enriquecer reportes.
          </p>
        </div>

        <div className={styles.inlineFields}>
          <label className={styles.field}>
            <span className={styles.label}>Nombre</span>
            <input
              aria-invalid={Boolean(errors.name)}
              className={styles.input}
              placeholder="Arriendo"
              type="text"
              {...register('name')}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Color</span>
            <input className={styles.colorInput} type="color" {...register('color')} />
          </label>
        </div>

        {errors.name ? <p className={styles.errorMessage}>{errors.name.message}</p> : null}
        {errors.color ? (
          <p className={styles.errorMessage}>{errors.color.message}</p>
        ) : null}
        {errors.root?.message ? (
          <div className={styles.errorBanner}>{errors.root.message}</div>
        ) : null}

        <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creando...' : 'Crear categoría'}
        </button>
      </form>
    </SurfaceCard>
  )
}
