import { z } from 'zod'
import { productUnits } from '@/modules/products/types/product'

export const productImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters.')
    .max(120, 'Name must contain at most 120 characters.'),
  description: z
    .string()
    .trim()
    .max(500, 'Description must contain at most 500 characters.')
    .optional(),
  sku: z.string().trim().max(80, 'SKU must contain at most 80 characters.').optional(),
  barcode: z
    .string()
    .trim()
    .max(120, 'Barcode must contain at most 120 characters.')
    .optional(),
  cost: z
    .number({
      invalid_type_error: 'Cost must be a valid amount.',
    })
    .finite('Cost must be a valid amount.')
    .min(0, 'Cost must be greater than or equal to 0.')
    .optional(),
  price: z
    .number({
      invalid_type_error: 'Price must be a valid amount.',
    })
    .finite('Price must be a valid amount.')
    .min(0, 'Price must be greater than or equal to 0.'),
  stock: z
    .number({
      invalid_type_error: 'Stock must be a valid integer.',
    })
    .int('Stock must be a valid integer.')
    .min(0, 'Stock must be greater than or equal to 0.'),
  minStock: z
    .number({
      invalid_type_error: 'Minimum stock must be a valid integer.',
    })
    .int('Minimum stock must be a valid integer.')
    .min(0, 'Minimum stock must be greater than or equal to 0.')
    .optional(),
  unit: z.enum(productUnits).optional(),
  isActive: z.boolean().optional(),
})

export type ProductImportRowSchemaValues = z.infer<
  typeof productImportRowSchema
>
