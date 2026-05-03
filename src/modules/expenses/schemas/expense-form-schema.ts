import { z } from 'zod'

export const expenseFormSchema = z.object({
  concept: z
    .string()
    .trim()
    .min(2, 'Ingresa un concepto con al menos 2 caracteres.')
    .max(191, 'El concepto no puede superar los 191 caracteres.'),
  categoryId: z.string().optional(),
  amount: z.coerce
    .number()
    .min(0.01, 'Ingresa un valor mayor a 0 para el gasto.'),
  paymentMethod: z.enum([
    'CASH',
    'CARD',
    'TRANSFER',
    'DIGITAL_WALLET',
    'BANK_DEPOSIT',
    'CREDIT',
    'OTHER',
  ]),
  status: z.enum(['PAID', 'PENDING', 'CANCELLED']),
  expenseDate: z.string().min(1, 'Selecciona la fecha del gasto.'),
  notes: z
    .string()
    .max(500, 'Las notas no pueden superar los 500 caracteres.')
    .optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>
