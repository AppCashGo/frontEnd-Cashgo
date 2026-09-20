import {
  CashRegisterSessionDrawer,
  type CashRegisterDrawerMode,
} from '@/modules/cash-register/components/CashRegisterSessionDrawer'
import {
  useAdjustReserveBalanceMutation,
  useCashRegisterAssigneesQuery,
  useCashRegisterHistoryQuery,
  useCloseCashRegisterMutation,
  useCreateCashRegisterManualEntryMutation,
  useCreatePaymentMethodTransferMutation,
  useCreateReserveTransferMutation,
  useCurrentCashRegisterQuery,
  useOpenCashRegisterMutation,
  useReserveSummaryQuery,
} from '@/modules/cash-register/hooks/use-cash-register-query'

type CashRegisterFlowDrawerProps = {
  isOpen: boolean
  mode?: CashRegisterDrawerMode
  onClose: () => void
  onOpened?: () => void
}

export function CashRegisterFlowDrawer({
  isOpen,
  mode = 'manage',
  onClose,
  onOpened,
}: CashRegisterFlowDrawerProps) {
  const assigneesQuery = useCashRegisterAssigneesQuery()
  const currentQuery = useCurrentCashRegisterQuery()
  const historyQuery = useCashRegisterHistoryQuery()
  const reserveSummaryQuery = useReserveSummaryQuery()
  const openMutation = useOpenCashRegisterMutation()
  const closeMutation = useCloseCashRegisterMutation()
  const manualEntryMutation = useCreateCashRegisterManualEntryMutation()
  const transferMutation = useCreatePaymentMethodTransferMutation()
  const reserveTransferMutation = useCreateReserveTransferMutation()
  const reserveAdjustmentMutation = useAdjustReserveBalanceMutation()
  const currentSession = currentQuery.data ?? null
  const latestClosedSession =
    (historyQuery.data ?? []).find((session) => session.status === 'CLOSED') ??
    null
  const isSubmitting =
    openMutation.isPending ||
    closeMutation.isPending ||
    manualEntryMutation.isPending ||
    transferMutation.isPending ||
    reserveTransferMutation.isPending ||
    reserveAdjustmentMutation.isPending

  return (
    <CashRegisterSessionDrawer
      assignees={assigneesQuery.data ?? []}
      currentSession={currentSession}
      initialMode={mode}
      isOpen={isOpen}
      isSubmitting={isSubmitting}
      latestClosedSession={latestClosedSession}
      reserveSummary={reserveSummaryQuery.data ?? null}
      onClose={onClose}
      onCloseSession={(input) => closeMutation.mutateAsync(input)}
      onManualEntry={async (input) => {
        await manualEntryMutation.mutateAsync(input)
      }}
      onOpenSession={async (input) => {
        await openMutation.mutateAsync(input)
      }}
      onOpened={onOpened}
      onReserveAdjust={async (input) => {
        await reserveAdjustmentMutation.mutateAsync(input)
      }}
      onReserveTransfer={async (input) => {
        await reserveTransferMutation.mutateAsync(input)
      }}
      onTransfer={async (input) => {
        await transferMutation.mutateAsync(input)
      }}
    />
  )
}
