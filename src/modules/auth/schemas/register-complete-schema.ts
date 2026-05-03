import { z } from "zod";
import { businessCategoryOptions } from "@/shared/constants/business-categories";

type RegisterCompleteSchemaMessages = {
  fullNameRequired: string;
  businessNameRequired: string;
  categoryRequired: string;
  emailRequired: string;
  emailInvalid: string;
  passwordMinLength: string;
};

export function createRegisterCompleteSchema(
  messages: RegisterCompleteSchemaMessages,
) {
  return z.object({
    fullName: z.string().trim().min(2, messages.fullNameRequired),
    businessName: z.string().trim().min(2, messages.businessNameRequired),
    businessCategory: z.enum(businessCategoryOptions, {
      errorMap: () => ({
        message: messages.categoryRequired,
      }),
    }),
    sellerCode: z.string().trim().max(80).optional().or(z.literal("")),
    email: z
      .string()
      .trim()
      .min(1, messages.emailRequired)
      .email(messages.emailInvalid),
    password: z.string().min(8, messages.passwordMinLength),
  });
}

export type RegisterCompleteValues = z.infer<
  ReturnType<typeof createRegisterCompleteSchema>
>;
