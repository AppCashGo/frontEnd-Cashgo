import { z } from 'zod'
import { productUnits } from '@/modules/products/types/product'

export const retailProductCreateSchema = z.object({
  barcode: z
    .string()
    .trim()
    .max(120, 'El código debe tener máximo 120 caracteres.')
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre debe tener máximo 120 caracteres.'),
  stock: z.coerce
    .number({
      invalid_type_error: 'La cantidad debe ser un número válido.',
    })
    .int('La cantidad debe ser un número entero.')
    .min(0, 'La cantidad debe ser mayor o igual a 0.'),
  minStock: z.coerce
    .number({
      invalid_type_error: 'La cantidad mínima debe ser un número válido.',
    })
    .int('La cantidad mínima debe ser un número entero.')
    .min(0, 'La cantidad mínima debe ser mayor o igual a 0.'),
  price: z.coerce
    .number({
      invalid_type_error: 'El precio debe ser un valor válido.',
    })
    .min(0, 'El precio debe ser mayor o igual a 0.'),
  cost: z.coerce
    .number({
      invalid_type_error: 'El costo debe ser un valor válido.',
    })
    .min(0, 'El costo debe ser mayor o igual a 0.'),
  unit: z.enum(productUnits),
  categoryId: z.string().trim().optional(),
  description: z
    .string()
    .trim()
    .max(500, 'La descripción debe tener máximo 500 caracteres.')
    .optional(),
  taxOptionId: z.string().trim().min(1, 'Selecciona una opción.'),
  isVisibleInCatalog: z.boolean(),
  variants: z
    .array(
      z.object({
        name: z
          .string()
          .trim()
          .min(1, 'El nombre de la variante es obligatorio.')
          .max(80, 'La variante debe tener máximo 80 caracteres.'),
        sku: z.string().trim().max(80, 'El SKU debe tener máximo 80 caracteres.').optional(),
        barcode: z
          .string()
          .trim()
          .max(120, 'El código debe tener máximo 120 caracteres.')
          .optional(),
        stock: z.coerce
          .number({ invalid_type_error: 'La cantidad debe ser válida.' })
          .int('La cantidad debe ser un número entero.')
          .min(0, 'La cantidad debe ser mayor o igual a 0.'),
        minStock: z.coerce
          .number({ invalid_type_error: 'La cantidad mínima debe ser válida.' })
          .int('La cantidad mínima debe ser un número entero.')
          .min(0, 'La cantidad mínima debe ser mayor o igual a 0.'),
        price: z.coerce
          .number({ invalid_type_error: 'El precio debe ser válido.' })
          .min(0, 'El precio debe ser mayor o igual a 0.'),
        cost: z.coerce
          .number({ invalid_type_error: 'El costo debe ser válido.' })
          .min(0, 'El costo debe ser mayor o igual a 0.'),
      }),
    )
    .optional(),
})

export type RetailProductCreateValues = z.infer<
  typeof retailProductCreateSchema
>
