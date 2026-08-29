import { z } from 'zod'
import { settingsUserRoles } from '@/modules/settings/types/settings'

export const settingsUserFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El correo electrónico es obligatorio.')
    .email('Ingresa un correo electrónico válido.')
    .max(191, 'El correo no puede superar 191 caracteres.'),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(120, 'El nombre no puede superar 120 caracteres.'),
  role: z.enum(settingsUserRoles, {
    errorMap: () => ({
      message: 'Selecciona un rol.',
    }),
  }),
  password: z
    .string()
    .max(72, 'La contraseña no puede superar 72 caracteres.')
    .refine(
      (value) => value.length === 0 || value.trim().length >= 8,
      'La contraseña debe tener al menos 8 caracteres.',
    ),
})

export type SettingsUserFormValues = z.infer<typeof settingsUserFormSchema>
