import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collectBillingDocument,
  createBillingDocumentFromSale,
  downloadBillingReceipt,
  downloadBillingReport,
  getAvailableBillingSales,
  getBillingConfiguration,
  getBillingDocumentDetail,
  getBillingDocuments,
  updateBillingConfiguration,
} from "@/modules/billing/services/billing-api";
import type {
  BillingConfigurationInput,
  BillingCollectionInput,
  CreateBillingInvoiceInput,
  BillingDocumentsFilters,
} from "@/modules/billing/types/billing";
import { cashRegisterCurrentQueryKey, cashRegisterHistoryQueryKey } from "@/modules/cash-register/hooks/use-cash-register-query";
import { customersQueryKey } from "@/modules/customers/hooks/use-customers-query";
import { dashboardSummaryQueryKey } from "@/modules/dashboard/hooks/use-dashboard-summary-query";
import { salesQueryKey } from "@/modules/sales/hooks/use-create-sale-mutation";

export const billingQueryKey = ["billing"] as const;
export const billingDocumentsQueryKey = ["billing", "documents"] as const;
export const billingDocumentDetailQueryKey = ["billing", "detail"] as const;
export const billingConfigurationQueryKey = ["billing", "config"] as const;
export const billingAvailableSalesQueryKey = ["billing", "sales", "available"] as const;

async function invalidateBillingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: billingQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: billingConfigurationQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: billingAvailableSalesQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: salesQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: customersQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: cashRegisterCurrentQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: cashRegisterHistoryQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardSummaryQueryKey,
    }),
  ]);
}

export function useBillingDocumentsQuery(filters: BillingDocumentsFilters) {
  return useQuery({
    queryKey: [...billingDocumentsQueryKey, filters],
    queryFn: () => getBillingDocuments(filters),
  });
}

export function useBillingConfigurationQuery() {
  return useQuery({
    queryKey: billingConfigurationQueryKey,
    queryFn: () => getBillingConfiguration(),
  });
}

export function useAvailableBillingSalesQuery(search: string, enabled = true) {
  return useQuery({
    queryKey: [...billingAvailableSalesQueryKey, search],
    queryFn: () => getAvailableBillingSales(search),
    enabled,
  });
}

export function useBillingDocumentDetailQuery(documentId: string | null) {
  return useQuery({
    queryKey: [...billingDocumentDetailQueryKey, documentId],
    queryFn: () => getBillingDocumentDetail(documentId as string),
    enabled: documentId !== null,
  });
}

export function useCollectBillingDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      input,
    }: {
      documentId: string;
      input: BillingCollectionInput;
    }) => collectBillingDocument(documentId, input),
    onSuccess: async () => {
      await invalidateBillingQueries(queryClient);
    },
  });
}

export function useUpdateBillingConfigurationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: BillingConfigurationInput) =>
      updateBillingConfiguration(input),
    onSuccess: async () => {
      await invalidateBillingQueries(queryClient);
    },
  });
}

export function useCreateBillingInvoiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBillingInvoiceInput) =>
      createBillingDocumentFromSale(input),
    onSuccess: async () => {
      await invalidateBillingQueries(queryClient);
    },
  });
}

export function useDownloadBillingReceiptMutation() {
  return useMutation({
    mutationFn: (documentId: string) => downloadBillingReceipt(documentId),
  });
}

export function useDownloadBillingReportMutation() {
  return useMutation({
    mutationFn: (filters: BillingDocumentsFilters) =>
      downloadBillingReport(filters),
  });
}
