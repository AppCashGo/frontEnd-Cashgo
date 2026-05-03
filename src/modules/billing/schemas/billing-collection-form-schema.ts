import { z } from "zod";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getBillingCopy } from "@/modules/billing/i18n/billing-copy";

export function getBillingCollectionFormSchema(languageCode: AppLanguageCode) {
  const copy = getBillingCopy(languageCode);

  return z.object({
    amount: z.coerce.number().min(0.01, copy.validationAmount),
    method: z.enum([
      "CASH",
      "CARD",
      "TRANSFER",
      "DIGITAL_WALLET",
      "BANK_DEPOSIT",
      "CREDIT",
      "OTHER",
    ]),
    reference: z.string().max(120, copy.validationReference).optional(),
    notes: z.string().max(255, copy.validationNotes).optional(),
  });
}

export type BillingCollectionFormValues = z.infer<
  ReturnType<typeof getBillingCollectionFormSchema>
>;
