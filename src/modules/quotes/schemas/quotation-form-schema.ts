import { z } from "zod";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

export function getQuotationFormSchema(languageCode: AppLanguageCode) {
  const requiredItemsMessage =
    languageCode === "en"
      ? "Add at least one quoted item."
      : "Agrega al menos un producto o servicio.";
  const itemNameMessage =
    languageCode === "en"
      ? "Each item needs a name."
      : "Cada ítem debe tener un nombre.";

  return z.object({
    customerId: z.string().optional(),
    validUntil: z.string().optional(),
    notes: z.string().max(500).optional(),
    terms: z.string().max(500).optional(),
    items: z
      .array(
        z
          .object({
            productId: z.string().optional(),
            name: z.string().trim().max(191).optional(),
            description: z.string().trim().max(500).optional(),
            quantity: z.coerce.number().int().min(1),
            unitPrice: z.coerce.number().min(0),
            discount: z.coerce.number().min(0),
            taxRate: z.coerce.number().min(0).max(100),
          })
          .superRefine((item, context) => {
            if (!item.productId && !item.name?.trim()) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                message: itemNameMessage,
                path: ["name"],
              });
            }
          }),
      )
      .min(1, requiredItemsMessage),
  });
}

export type QuotationFormValues = z.infer<
  ReturnType<typeof getQuotationFormSchema>
>;
