import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cashRegisterCurrentQueryKey,
  cashRegisterHistoryQueryKey,
  movementsOverviewQueryKey,
} from "@/modules/cash-register/hooks/use-cash-register-query";
import { customersQueryKey } from "@/modules/customers/hooks/use-customers-query";
import { dashboardSummaryQueryKey } from "@/modules/dashboard/hooks/use-dashboard-summary-query";
import { productsQueryKey } from "@/modules/products/hooks/use-products-query";
import type {
  ConvertQuotationToSaleInput,
  CreateQuotationInput,
  QuotationFilters,
  UpdateQuotationInput,
} from "@/modules/quotes/types/quotation";
import {
  acceptQuotation,
  acceptPublicQuotation,
  cancelQuotation,
  convertQuotationToSale,
  createQuotation,
  deleteQuotation,
  downloadPublicQuotationDocument,
  downloadQuotationDocument,
  getPublicQuotationDetail,
  getQuotationDetail,
  getQuotations,
  rejectQuotation,
  rejectPublicQuotation,
  sendQuotation,
  updateQuotation,
} from "@/modules/quotes/services/quotations-api";
import { salesQueryKey } from "@/modules/sales/hooks/use-create-sale-mutation";

export const quotationsQueryKey = ["quotations"] as const;
export const quotationDetailQueryKey = ["quotations", "detail"] as const;
export const publicQuotationQueryKey = ["quotations", "public"] as const;

async function invalidateQuotationDependencies(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: quotationsQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: quotationDetailQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: salesQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: productsQueryKey,
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
      queryKey: movementsOverviewQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardSummaryQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: ["reports", "overview"],
    }),
  ]);
}

export function useQuotationsQuery(filters: QuotationFilters) {
  return useQuery({
    queryKey: [...quotationsQueryKey, filters],
    queryFn: () => getQuotations(filters),
  });
}

export function useQuotationDetailQuery(quotationId: string | null) {
  return useQuery({
    queryKey: [...quotationDetailQueryKey, quotationId],
    queryFn: () => getQuotationDetail(quotationId as string),
    enabled: quotationId !== null,
  });
}

export function usePublicQuotationQuery(publicToken: string | null) {
  return useQuery({
    queryKey: [...publicQuotationQueryKey, publicToken],
    queryFn: () => getPublicQuotationDetail(publicToken as string),
    enabled: publicToken !== null,
  });
}

export function useCreateQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateQuotationInput) => createQuotation(input),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useUpdateQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      input,
    }: {
      quotationId: string;
      input: UpdateQuotationInput;
    }) => updateQuotation(quotationId, input),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useDeleteQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => deleteQuotation(quotationId),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useSendQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => sendQuotation(quotationId),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useAcceptQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => acceptQuotation(quotationId),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useRejectQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => rejectQuotation(quotationId),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useCancelQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quotationId: string) => cancelQuotation(quotationId),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useConvertQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      input,
    }: {
      quotationId: string;
      input: ConvertQuotationToSaleInput;
    }) => convertQuotationToSale(quotationId, input),
    onSuccess: async () => {
      await invalidateQuotationDependencies(queryClient);
    },
  });
}

export function useDownloadQuotationDocumentMutation() {
  return useMutation({
    mutationFn: (quotationId: string) => downloadQuotationDocument(quotationId),
  });
}

export function useAcceptPublicQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicToken: string) => acceptPublicQuotation(publicToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: publicQuotationQueryKey,
      });
    },
  });
}

export function useRejectPublicQuotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (publicToken: string) => rejectPublicQuotation(publicToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: publicQuotationQueryKey,
      });
    },
  });
}

export function useDownloadPublicQuotationDocumentMutation() {
  return useMutation({
    mutationFn: (publicToken: string) =>
      downloadPublicQuotationDocument(publicToken),
  });
}
