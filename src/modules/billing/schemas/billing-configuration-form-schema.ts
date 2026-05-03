import { z } from "zod";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";
import { getBillingCopy } from "@/modules/billing/i18n/billing-copy";

function optionalText(maxLength: number) {
  return z.string().max(maxLength).optional().or(z.literal(""));
}

function optionalNumericText(languageCode: AppLanguageCode) {
  const copy = getBillingCopy(languageCode);

  return z
    .string()
    .regex(/^\d+$/, copy.validationNumericField)
    .optional()
    .or(z.literal(""));
}

export function getBillingConfigurationFormSchema(languageCode: AppLanguageCode) {
  const copy = getBillingCopy(languageCode);

  return z.object({
    legalName: optionalText(140),
    taxId: optionalText(60),
    city: optionalText(80),
    email: z
      .string()
      .email(copy.validationEmail)
      .optional()
      .or(z.literal("")),
    phone: optionalText(40),
    address: optionalText(160),
    taxResponsibility: optionalText(120),
    taxRegime: optionalText(120),
    invoiceNote: optionalText(255),
    resolutionPrefix: optionalText(20),
    resolutionNumber: optionalText(60),
    resolutionStartNumber: optionalNumericText(languageCode),
    resolutionEndNumber: optionalNumericText(languageCode),
    resolutionCurrentNumber: optionalNumericText(languageCode),
    resolutionStartDate: z.string().optional(),
    resolutionEndDate: z.string().optional(),
    resolutionActive: z.boolean(),
  });
}

export type BillingConfigurationFormValues = z.infer<
  ReturnType<typeof getBillingConfigurationFormSchema>
>;
