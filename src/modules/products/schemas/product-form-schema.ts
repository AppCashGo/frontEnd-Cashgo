import { z } from 'zod'
import { productUnits } from '@/modules/products/types/product'

export const productFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters.').max(120, 'Name must contain at most 120 characters.'),
  description: z.string().trim().max(500, 'Description must contain at most 500 characters.').optional(),
  sku: z.string().trim().max(80, 'SKU must contain at most 80 characters.').optional(),
  barcode: z.string().trim().max(120, 'Barcode must contain at most 120 characters.').optional(),
  cost: z
    .coerce
    .number({
      invalid_type_error: 'Cost must be a valid amount.',
    })
    .refine(Number.isFinite, 'Cost must be a valid amount.')
    .refine((value) => value >= 0, 'Cost must be greater than or equal to 0.'),
  price: z
    .coerce
    .number({
      invalid_type_error: 'Price must be a valid amount.',
    })
    .refine(Number.isFinite, 'Price must be a valid amount.')
    .refine((value) => value >= 0, 'Price must be greater than or equal to 0.'),
  stock: z
    .coerce
    .number({
      invalid_type_error: 'Stock must be a valid integer.',
    })
    .int('Stock must be a valid integer.')
    .refine((value) => value >= 0, 'Stock must be greater than or equal to 0.'),
  minStock: z
    .coerce
    .number({
      invalid_type_error: 'Minimum stock must be a valid integer.',
    })
    .int('Minimum stock must be a valid integer.')
    .refine((value) => value >= 0, 'Minimum stock must be greater than or equal to 0.'),
  unit: z.enum(productUnits),
  isActive: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
