import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  closeCashRegister,
  createCashRegisterManualEntry,
  downloadCashRegisterReport,
  downloadMovementsReport,
  getCashRegisterAssignees,
  getCashRegisterHistory,
  getCurrentCashRegisterSession,
  getMovementsOverview,
  openCashRegister,
} from "@/modules/cash-register/services/cash-register-api";
import type {
  CashRegisterManualEntryInput,
  CashRegisterReportDownloadInput,
  CloseCashRegisterInput,
  OpenCashRegisterInput,
} from "@/modules/cash-register/types/cash-register";

export const cashRegisterCurrentQueryKey = [
  "cash-register",
  "current",
] as const;
export const cashRegisterHistoryQueryKey = [
  "cash-register",
  "history",
] as const;
export const cashRegisterAssigneesQueryKey = [
  "cash-register",
  "assignees",
] as const;
export const movementsOverviewQueryKey = ["movements", "overview"] as const;

export function invalidateCashRegisterQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: cashRegisterCurrentQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: cashRegisterHistoryQueryKey,
    }),
    queryClient.invalidateQueries({
      queryKey: movementsOverviewQueryKey,
    }),
  ]);
}

export function useCurrentCashRegisterQuery() {
  return useQuery({
    queryKey: cashRegisterCurrentQueryKey,
    queryFn: getCurrentCashRegisterSession,
  });
}

export function useCashRegisterHistoryQuery() {
  return useQuery({
    queryKey: cashRegisterHistoryQueryKey,
    queryFn: getCashRegisterHistory,
  });
}

export function useCashRegisterAssigneesQuery() {
  return useQuery({
    queryKey: cashRegisterAssigneesQueryKey,
    queryFn: getCashRegisterAssignees,
  });
}

export function useMovementsOverviewQuery(input: {
  from?: string;
  to?: string;
  search?: string;
  type?: "ALL" | "INCOME" | "EXPENSE";
}) {
  return useQuery({
    queryKey: [...movementsOverviewQueryKey, input],
    queryFn: () => getMovementsOverview(input),
  });
}

export function useOpenCashRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenCashRegisterInput) => openCashRegister(input),
    onSuccess: async () => {
      await invalidateCashRegisterQueries(queryClient);
    },
  });
}

export function useCloseCashRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CloseCashRegisterInput) => closeCashRegister(input),
    onSuccess: async () => {
      await invalidateCashRegisterQueries(queryClient);
    },
  });
}

export function useCreateCashRegisterManualEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CashRegisterManualEntryInput) =>
      createCashRegisterManualEntry(input),
    onSuccess: async () => {
      await invalidateCashRegisterQueries(queryClient);
    },
  });
}

export function useDownloadCashRegisterReportMutation() {
  return useMutation({
    mutationFn: (input: CashRegisterReportDownloadInput) =>
      downloadCashRegisterReport(input),
  });
}

export function useDownloadMovementsReportMutation() {
  return useMutation({
    mutationFn: (input: {
      from?: string;
      to?: string;
      search?: string;
      type?: "ALL" | "INCOME" | "EXPENSE";
    }) => downloadMovementsReport(input),
  });
}
