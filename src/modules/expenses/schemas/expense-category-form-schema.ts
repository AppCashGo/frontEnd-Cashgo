import { z } from 'zod'

export const expenseCategoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Ponle un nombre claro a la categoría.')
    .max(120, 'El nombre no puede superar los 120 caracteres.'),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Usa un color hexadecimal válido.'),
})

export type ExpenseCategoryFormValues = z.infer<
  typeof expenseCategoryFormSchema
>
