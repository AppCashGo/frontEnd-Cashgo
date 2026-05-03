import { z } from "zod";

type LoginFormSchemaMessages = {
  identifierRequired: string;
  passwordRequired: string;
  passwordMinLength: string;
};

export function createLoginFormSchema(messages: LoginFormSchemaMessages) {
  return z.object({
    identifier: z.string().trim().min(1, messages.identifierRequired),
    password: z
      .string()
      .min(1, messages.passwordRequired)
      .min(8, messages.passwordMinLength),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginFormSchema>>;
