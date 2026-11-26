import { z } from 'zod'
import { productUnits } from '@/modules/products/types/product'

const money = (label: string) =>
  z
    .number({
      invalid_type_error: `${label} debe ser un valor válido con hasta dos decimales.`,
      required_error: `Ingresa ${label.toLowerCase()}.`,
    })
    .min(0, `${label} debe ser mayor o igual a cero.`)
    .max(99_999_999.99, `${label} supera el monto máximo admitido.`)

const count = (label: string) =>
  z
    .number({
      invalid_type_error: `${label} debe ser un número entero.`,
      required_error: `Ingresa ${label.toLowerCase()}.`,
    })
    .int(`${label} debe ser un número entero.`)
    .min(0, `${label} debe ser mayor o igual a cero.`)
    .max(2_147_483_647, `${label} supera el máximo admitido.`)

export const productImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  name: z
    .string({ required_error: 'Ingresa el nombre del producto.' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre supera los 120 caracteres.'),
  description: z
    .string()
    .trim()
    .max(500, 'La descripción supera los 500 caracteres.')
    .optional(),
  sku: z.string().trim().max(80, 'El SKU supera los 80 caracteres.').optional(),
  barcode: z
    .string()
    .trim()
    .max(120, 'El código de barras supera los 120 caracteres.')
    .optional(),
  cost: money('Costo').optional(),
  price: money('Precio'),
  stock: count('Existencias'),
  minStock: count('Stock mínimo').optional(),
  unit: z
    .enum(productUnits, {
      errorMap: () => ({ message: 'La unidad no está admitida.' }),
    })
    .optional(),
  isActive: z
    .boolean({
      invalid_type_error:
        'Usa Sí o No para indicar si el producto está activo.',
    })
    .optional(),
})

export type ProductImportRowSchemaValues = z.infer<
  typeof productImportRowSchema
>
