import { z } from "zod";
import { assignableUserRoles } from "@/shared/constants/user-roles";

export const employeeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(120, "Name must contain at most 120 characters."),
  email: z
    .string()
    .trim()
    .max(191, "Email must contain at most 191 characters.")
    .refine(
      (value) =>
        value.length === 0 || z.string().email().safeParse(value).success,
      "Email must be a valid email address.",
    ),
  phone: z
    .string()
    .trim()
    .min(8, "Phone number must contain at least 8 characters.")
    .max(30, "Phone number must contain at most 30 characters."),
  role: z.enum(assignableUserRoles, {
    errorMap: () => ({
      message: "Role must be selected.",
    }),
  }),
  password: z
    .string()
    .max(72, "Access code must contain at most 72 characters.")
    .refine(
      (value) => value.length === 0 || value.trim().length >= 8,
      "Access code must contain at least 8 characters.",
    ),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
