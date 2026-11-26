import type { ReserveSummary } from "@/modules/cash-register/types/cash-register";
import { cashRegisterPaymentMethods } from "@/modules/cash-register/utils/cash-register-summary";
import { formatCashRegisterCurrency } from "@/modules/cash-register/utils/format-cash-register";
import styles from "./CashRegisterReserveBreakdown.module.css";

export function CashRegisterReserveBreakdown({
  balances,
}: Pick<ReserveSummary, "balances">) {
  return (
    <dl className={styles.breakdown}>
      {cashRegisterPaymentMethods.map(({ method, label }) => (
        <div key={method}>
          <dt>{label}</dt>
          <dd>
            {formatCashRegisterCurrency(
              balances.find((balance) => balance.method === method)?.amount ??
                0,
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
