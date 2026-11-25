import { z } from "zod";

type RegisterStartSchemaMessages = {
  emailRequired: string;
  emailInvalid: string;
  translationRequired: string;
  acceptedTermsRequired: string;
};

export function createRegisterStartSchema(
  messages: RegisterStartSchemaMessages,
) {
  return z.object({
    email: z.string().trim().min(1, messages.emailRequired).max(191).email(messages.emailInvalid),
    translationId: z.string().trim().min(1, messages.translationRequired),
    acceptedTerms: z.boolean().refine((value) => value, {
      message: messages.acceptedTermsRequired,
    }),
  });
}

export type RegisterStartValues = z.infer<
  ReturnType<typeof createRegisterStartSchema>
>;
