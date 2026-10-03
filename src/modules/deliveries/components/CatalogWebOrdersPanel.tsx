import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, RefreshCw, Store, Truck } from "lucide-react";
import {
  getBusinessCatalogOrders,
  updateBusinessCatalogOrderStatus,
} from "@/modules/catalog/services/catalog-admin-orders-api";
import type {
  CatalogOrder,
  CatalogOrderStatus,
} from "@/modules/catalog/types/catalog-order";
import { formatCurrency } from "@/shared/utils/format-currency";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import styles from "./CatalogWebOrdersPanel.module.css";

const queryKey = ["catalog-orders", "business"] as const;
const labels: Record<CatalogOrderStatus, string> = {
  PENDING_CONFIRMATION: "Nuevo",
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY_FOR_PICKUP: "Listo para retirar",
  OUT_FOR_DELIVERY: "En reparto",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export function CatalogWebOrdersPanel() {
  const queryClient = useQueryClient();
  const ordersQuery = useQuery({
    queryKey,
    queryFn: getBusinessCatalogOrders,
    refetchInterval: 30_000,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CatalogOrderStatus }) =>
      updateBusinessCatalogOrderStatus(id, status),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
  });
  const activeOrders = (ordersQuery.data ?? []).filter(
    (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
  );

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <span>Catálogo virtual</span>
          <h3>Pedidos web</h3>
        </div>
        <button
          aria-label="Actualizar pedidos web"
          disabled={ordersQuery.isFetching}
          onClick={() => void ordersQuery.refetch()}
          type="button"
        >
          <RefreshCw aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {ordersQuery.isLoading ? (
        <p className={styles.state}>Consultando pedidos del catálogo…</p>
      ) : ordersQuery.isError ? (
        <p className={styles.error}>{getErrorMessage(ordersQuery.error, "No se pudieron consultar los pedidos web.")}</p>
      ) : activeOrders.length === 0 ? (
        <div className={styles.empty}>
          <PackageSearch aria-hidden="true" />
          <span>No hay pedidos web pendientes.</span>
        </div>
      ) : (
        <div className={styles.scroller}>
          {activeOrders.map((order) => (
            <WebOrderCard
              isUpdating={statusMutation.isPending}
              key={order.id}
              onStatus={(status) => statusMutation.mutate({ id: order.id, status })}
              order={order}
            />
          ))}
        </div>
      )}
      {statusMutation.isError ? (
        <p className={styles.error}>{getErrorMessage(statusMutation.error, "No se pudo actualizar el pedido.")}</p>
      ) : null}
    </section>
  );
}

function WebOrderCard({
  isUpdating,
  onStatus,
  order,
}: {
  isUpdating: boolean;
  onStatus: (status: CatalogOrderStatus) => void;
  order: CatalogOrder;
}) {
  const next = getNextStatus(order);
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div><strong>{order.orderNumber}</strong><small>{order.contactName}</small></div>
        <span>{labels[order.status]}</span>
      </div>
      <div className={styles.method}>
        {order.fulfillmentMethod === "DELIVERY" ? <Truck /> : <Store />}
        <span>{order.fulfillmentMethod === "DELIVERY" ? "Domicilio" : "Retiro"}</span>
        <strong>{formatCurrency(Number(order.total))}</strong>
      </div>
      <ul>
        {order.items.slice(0, 3).map((item) => (
          <li key={item.id}>{item.quantity} × {item.productName}</li>
        ))}
      </ul>
      <div className={styles.actions}>
        {next ? <button disabled={isUpdating} onClick={() => onStatus(next.value)} type="button">{next.label}</button> : null}
        <button className={styles.cancel} disabled={isUpdating} onClick={() => onStatus("CANCELLED")} type="button">Cancelar</button>
      </div>
    </article>
  );
}

function getNextStatus(order: CatalogOrder): { value: CatalogOrderStatus; label: string } | null {
  if (order.status === "PENDING_CONFIRMATION") return { value: "CONFIRMED", label: "Confirmar" };
  if (order.status === "CONFIRMED") return { value: "PREPARING", label: "Preparar" };
  if (order.status === "PREPARING") {
    return order.fulfillmentMethod === "DELIVERY"
      ? { value: "OUT_FOR_DELIVERY", label: "Enviar domicilio" }
      : { value: "READY_FOR_PICKUP", label: "Listo para retirar" };
  }
  if (order.status === "OUT_FOR_DELIVERY" || order.status === "READY_FOR_PICKUP") {
    return { value: "DELIVERED", label: "Marcar entregado" };
  }
  return null;
}
