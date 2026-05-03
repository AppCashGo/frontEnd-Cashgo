import { z } from "zod";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getBillingCopy } from "@/modules/billing/i18n/billing-copy";

export function getCreateBillingInvoiceFormSchema(languageCode: AppLanguageCode) {
  const copy = getBillingCopy(languageCode);

  return z.object({
    saleId: z.string().min(1, copy.validationRequiredSale),
    type: z.enum([
      "SIMPLE_RECEIPT",
      "POS_DOCUMENT",
      "ELECTRONIC_INVOICE",
    ]),
    note: z.string().max(255, copy.validationNotes).optional().or(z.literal("")),
  });
}

export type CreateBillingInvoiceFormValues = z.infer<
  ReturnType<typeof getCreateBillingInvoiceFormSchema>
>;
