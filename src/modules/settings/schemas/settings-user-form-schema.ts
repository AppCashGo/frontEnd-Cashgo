import { z } from 'zod'
import { settingsUserRoles } from '@/modules/settings/types/settings'

export const settingsUserFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .email('Email must be a valid email address.')
    .max(191, 'Email must contain at most 191 characters.'),
  name: z
    .string()
    .trim()
    .min(2, 'Name must contain at least 2 characters.')
    .max(120, 'Name must contain at most 120 characters.'),
  role: z.enum(settingsUserRoles, {
    errorMap: () => ({
      message: 'Role must be selected.',
    }),
  }),
  password: z
    .string()
    .max(72, 'Password must contain at most 72 characters.')
    .refine(
      (value) => value.length === 0 || value.trim().length >= 8,
      'Password must contain at least 8 characters.',
    ),
})

export type SettingsUserFormValues = z.infer<typeof settingsUserFormSchema>
