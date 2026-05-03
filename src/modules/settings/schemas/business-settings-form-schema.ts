import { z } from 'zod'
import { supportedCurrencies } from '@/modules/settings/types/settings'
import { businessCategoryOptions } from '@/shared/constants/business-categories'

function buildOptionalTextSchema(label: string, minLength: number, maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} debe tener máximo ${maxLength.toString()} caracteres.`)
    .refine(
      (value) => value.length === 0 || value.length >= minLength,
      `${label} debe tener al menos ${minLength.toString()} caracteres.`,
    )
}

function buildOptionalEmailSchema() {
  return z
    .string()
    .trim()
    .max(191, 'El correo debe tener máximo 191 caracteres.')
    .refine(
      (value) =>
        value.length === 0 || z.string().email().safeParse(value).success,
      'Ingresa un correo válido.',
    )
}

export const businessProfileFormSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(2, 'El nombre del negocio debe tener al menos 2 caracteres.')
    .max(120, 'El nombre del negocio debe tener máximo 120 caracteres.'),
  businessCategory: z.enum(businessCategoryOptions, {
    errorMap: () => ({
      message: 'Selecciona una categoría para el negocio.',
    }),
  }),
  legalName: buildOptionalTextSchema('La razón social', 2, 191),
  taxId: buildOptionalTextSchema('El NIT o ID fiscal', 5, 80),
  email: buildOptionalEmailSchema(),
  phone: buildOptionalTextSchema('El teléfono', 7, 30),
  address: buildOptionalTextSchema('La dirección', 5, 255),
})

export const taxSettingsFormSchema = z.object({
  currency: z.enum(supportedCurrencies, {
    errorMap: () => ({
      message: 'Currency must be selected.',
    }),
  }),
  taxRate: z
    .coerce
    .number({
      invalid_type_error: 'La tasa de impuesto debe ser un porcentaje válido.',
    })
    .refine(Number.isFinite, 'La tasa de impuesto debe ser un porcentaje válido.')
    .refine(
      (value) => value >= 0 && value <= 100,
      'La tasa de impuesto debe estar entre 0 y 100.',
    ),
  taxLabel: buildOptionalTextSchema('La etiqueta del impuesto', 2, 80),
})

export const operationalSettingsFormSchema = z.object({
  allowSaleWithoutStock: z.boolean(),
  lowStockAlertsEnabled: z.boolean(),
  defaultLowStockThreshold: z
    .coerce
    .number({
      invalid_type_error: 'El umbral base debe ser un número válido.',
    })
    .int('El umbral base debe ser un número entero.')
    .min(0, 'El umbral base no puede ser negativo.')
    .max(9999, 'El umbral base es demasiado alto.'),
  useWeightedAverageCost: z.boolean(),
})

export type BusinessProfileFormValues = z.infer<
  typeof businessProfileFormSchema
>
export type TaxSettingsFormValues = z.infer<typeof taxSettingsFormSchema>
export type OperationalSettingsFormValues = z.infer<
  typeof operationalSettingsFormSchema
>
