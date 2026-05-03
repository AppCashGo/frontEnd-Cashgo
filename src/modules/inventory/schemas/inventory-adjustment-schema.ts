import { z } from "zod";
import { manualInventoryAdjustmentTypes } from "@/modules/inventory/types/inventory";

export const inventoryAdjustmentSchema = z
  .object({
    productId: z.string().trim().min(1, "Select a product to adjust."),
    type: z.enum(manualInventoryAdjustmentTypes, {
      errorMap: () => ({
        message: "Choose how this inventory movement should affect stock.",
      }),
    }),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .min(0, "Quantity cannot be negative."),
    reason: z
      .string()
      .trim()
      .max(255, "Reason must contain 255 characters or fewer.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((values, context) => {
    if (values.type !== "ADJUSTMENT" && values.quantity < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "IN and OUT movements require at least 1 unit.",
        path: ["quantity"],
      });
    }
  });

export type InventoryAdjustmentFormValues = z.infer<
  typeof inventoryAdjustmentSchema
>;
