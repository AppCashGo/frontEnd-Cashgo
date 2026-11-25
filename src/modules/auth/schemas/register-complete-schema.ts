import { z } from "zod";
import { businessCategoryOptions } from "@/shared/constants/business-categories";

type RegisterCompleteSchemaMessages = {
  fullNameRequired: string;
  businessNameRequired: string;
  categoryRequired: string;
  phoneInvalid: string;
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
    businessPhone: z.string().trim().regex(/^\+?[0-9 ()-]{7,25}$/, messages.phoneInvalid).or(z.literal("")),
    password: z.string().min(8, messages.passwordMinLength),
  });
}

export type RegisterCompleteValues = z.infer<
  ReturnType<typeof createRegisterCompleteSchema>
>;
