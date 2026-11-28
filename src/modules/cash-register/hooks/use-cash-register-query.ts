import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { dashboardSummaryQueryKey } from "@/modules/dashboard/hooks/use-dashboard-summary-query";
import { readOfflineSnapshot, writeOfflineSnapshot } from "@/shared/services/offline-snapshot";
import type { CashRegisterSession } from "@/modules/cash-register/types/cash-register";
import {
  adjustReserveBalance,
  closeCashRegister,
  createCashRegisterManualEntry,
  createPaymentMethodTransfer,
  createReserveTransfer,
  downloadCashRegisterReport,
  downloadMovementsReport,
  getCashRegisterAssignees,
  getCashRegisterHistory,
  getCurrentCashRegisterSession,
  getMovementsOverview,
  getReserveSummary,
  openCashRegister,
} from "@/modules/cash-register/services/cash-register-api";
import type {
  CashRegisterManualEntryInput,
  CashRegisterReportDownloadInput,
  CloseCashRegisterInput,
  OpenCashRegisterInput,
  PaymentMethodTransferInput,
  ReserveTransferInput,
  ReserveBalanceAdjustmentInput,
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
export const reserveSummaryQueryKey = ["cash-register", "reserve"] as const;

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
    queryClient.invalidateQueries({ queryKey: reserveSummaryQueryKey }),
  ]);
}

export function useCurrentCashRegisterQuery(enabled = true) {
  const businessId = useAuthSessionStore((state) => state.user?.businessId);
  const query = useQuery({
    queryKey: cashRegisterCurrentQueryKey,
    queryFn: getCurrentCashRegisterSession,
    enabled,
    initialData: () =>
      readOfflineSnapshot<CashRegisterSession | null>(
        businessId,
        "cash-register-current",
      ),
  });

  useEffect(() => {
    if (enabled && query.data !== undefined) {
      writeOfflineSnapshot(businessId, "cash-register-current", query.data);
    }
  }, [businessId, enabled, query.data]);

  return query;
}

export function useReserveSummaryQuery() {
  return useQuery({
    queryKey: reserveSummaryQueryKey,
    queryFn: getReserveSummary,
  });
}

export function useCashRegisterHistoryQuery() {
  return useQuery({
    queryKey: cashRegisterHistoryQueryKey,
    queryFn: getCashRegisterHistory,
  });
}

export function useCashRegisterAssigneesQuery(enabled = true) {
  return useQuery({
    queryKey: cashRegisterAssigneesQueryKey,
    queryFn: getCashRegisterAssignees,
    enabled,
  });
}

export function useMovementsOverviewQuery(
  input: {
    from?: string;
    to?: string;
    search?: string;
    type?: "ALL" | "INCOME" | "EXPENSE";
  },
  enabled = true,
) {
  return useQuery({
    queryKey: [...movementsOverviewQueryKey, input],
    queryFn: () => getMovementsOverview(input),
    enabled,
  });
}

export function useOpenCashRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: OpenCashRegisterInput) => openCashRegister(input),
    onSuccess: async () => {
      await Promise.all([
        invalidateCashRegisterQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey }),
      ]);
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

export function useCreatePaymentMethodTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PaymentMethodTransferInput) =>
      createPaymentMethodTransfer(input),
    onSuccess: async () => {
      await invalidateCashRegisterQueries(queryClient);
    },
  });
}

export function useCreateReserveTransferMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReserveTransferInput) => createReserveTransfer(input),
    onSuccess: async () => {
      await invalidateCashRegisterQueries(queryClient);
    },
  });
}

export function useAdjustReserveBalanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReserveBalanceAdjustmentInput) =>
      adjustReserveBalance(input),
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
