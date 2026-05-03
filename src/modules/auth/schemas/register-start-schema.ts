import { z } from "zod";

type RegisterStartSchemaMessages = {
  countryRequired: string;
  phoneInvalid: string;
  translationRequired: string;
  acceptedTermsRequired: string;
};

export function createRegisterStartSchema(
  messages: RegisterStartSchemaMessages,
) {
  return z.object({
    countryCode: z.string().trim().length(2, messages.countryRequired),
    phone: z
      .string()
      .trim()
      .min(7, messages.phoneInvalid)
      .max(15, messages.phoneInvalid),
    translationId: z.string().trim().min(1, messages.translationRequired),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: messages.acceptedTermsRequired,
    }),
  });
}

export type RegisterStartValues = z.infer<
  ReturnType<typeof createRegisterStartSchema>
>;
