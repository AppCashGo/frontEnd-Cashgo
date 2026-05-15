import { z } from "zod";
import { assignableUserRoles } from "@/shared/constants/user-roles";

export const employeeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(120, "El nombre debe tener maximo 120 caracteres."),
  email: z
    .string()
    .trim()
    .max(191, "El correo debe tener maximo 191 caracteres.")
    .refine(
      (value) =>
        value.length === 0 || z.string().email().safeParse(value).success,
      "El correo debe tener un formato valido.",
    ),
  phone: z
    .string()
    .trim()
    .min(8, "El celular debe tener al menos 8 caracteres.")
    .max(30, "El celular debe tener maximo 30 caracteres."),
  role: z.enum(assignableUserRoles, {
    errorMap: () => ({
      message: "Selecciona un rol.",
    }),
  }),
  password: z
    .string()
    .max(72, "El codigo debe tener maximo 72 caracteres.")
    .refine(
      (value) => value.length === 0 || value.trim().length >= 8,
      "El codigo debe tener al menos 8 caracteres.",
    ),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
