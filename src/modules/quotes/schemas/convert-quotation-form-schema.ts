import { z } from "zod";
import type { CashRegisterPaymentMethod } from "@/modules/cash-register/types/cash-register";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

const paymentMethods = [
  "CASH",
  "CARD",
  "TRANSFER",
  "OTHER",
  "DIGITAL_WALLET",
  "BANK_DEPOSIT",
] as const satisfies readonly CashRegisterPaymentMethod[];

export function getConvertQuotationFormSchema(languageCode: AppLanguageCode) {
  const requiredCustomerMessage =
    languageCode === "en"
      ? "Customer is required for credit sales."
      : "Debes seleccionar un cliente para ventas a crédito.";
  const requiredPaymentMethodMessage =
    languageCode === "en"
      ? "Select a payment method."
      : "Selecciona un método de pago.";

  return z
    .object({
      paymentStatus: z.enum(["PAID", "CREDIT"]),
      customerId: z.string().optional(),
      paymentMethod: z.enum(paymentMethods).optional(),
      dueDate: z.string().optional(),
      notes: z.string().max(500).optional(),
    })
    .superRefine((values, context) => {
      if (values.paymentStatus === "CREDIT" && !values.customerId?.trim()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: requiredCustomerMessage,
          path: ["customerId"],
        });
      }

      if (values.paymentStatus === "PAID" && !values.paymentMethod) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: requiredPaymentMethodMessage,
          path: ["paymentMethod"],
        });
      }
    });
}

export type ConvertQuotationFormValues = z.infer<
  ReturnType<typeof getConvertQuotationFormSchema>
>;
