import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  MessageSquareText,
  PackageSearch,
  RefreshCw,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import {
  getBusinessCatalogOrders,
  getBusinessCatalogReviews,
  reviewBusinessCatalogManualPayment,
  updateBusinessCatalogOrderStatus,
} from "@/modules/catalog/services/catalog-admin-orders-api";
import type {
  CatalogOrder,
  CatalogOrderStatus,
} from "@/modules/catalog/types/catalog-order";
import { formatCurrency } from "@/shared/utils/format-currency";
import { getErrorMessage } from "@/shared/utils/get-error-message";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import styles from "./CatalogWebOrdersPanel.module.css";

const queryKey = ["catalog-orders", "business"] as const;
const reviewsQueryKey = ["catalog-orders", "business", "reviews"] as const;
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
  const reviewsQuery = useQuery({
    queryKey: reviewsQueryKey,
    queryFn: getBusinessCatalogReviews,
    refetchInterval: 60_000,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: CatalogOrderStatus }) =>
      updateBusinessCatalogOrderStatus(id, status),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
  });
  const paymentMutation = useMutation({
    mutationFn: ({ id, approved }: { id: number; approved: boolean }) =>
      reviewBusinessCatalogManualPayment(id, approved),
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
              isReviewingPayment={paymentMutation.isPending}
              key={order.id}
              onStatus={(status) => statusMutation.mutate({ id: order.id, status })}
              onReviewPayment={(approved) =>
                paymentMutation.mutate({ id: order.id, approved })
              }
              order={order}
            />
          ))}
        </div>
      )}
      {statusMutation.isError ? (
        <p className={styles.error}>{getErrorMessage(statusMutation.error, "No se pudo actualizar el pedido.")}</p>
      ) : null}
      {paymentMutation.isError ? (
        <p className={styles.error}>{getErrorMessage(paymentMutation.error, "No se pudo revisar el comprobante.")}</p>
      ) : null}

      {(reviewsQuery.data?.length ?? 0) > 0 ? (
        <section className={styles.reviewsSection}>
          <div className={styles.reviewsHeading}>
            <MessageSquareText aria-hidden="true" />
            <div>
              <span>Opiniones verificadas</span>
              <strong>Lo que dicen tus clientes</strong>
            </div>
          </div>
          <div className={styles.reviewList}>
            {reviewsQuery.data?.slice(0, 8).map((review) => (
              <article key={review.id}>
                <div className={styles.reviewHead}>
                  <span>
                    <strong>{review.customer.name}</strong>
                    <small>{review.order.orderNumber}</small>
                  </span>
                  <StarDisplay rating={review.rating} />
                </div>
                {review.comment ? <p>{review.comment}</p> : null}
                {review.order.productReviews.length > 0 ? (
                  <div className={styles.productReviewList}>
                    {review.order.productReviews.map((productReview) => (
                      <span key={productReview.id}>
                        <strong>{productReview.product.name}</strong>
                        <StarDisplay rating={productReview.rating} />
                        {productReview.comment ? (
                          <small>{productReview.comment}</small>
                        ) : null}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} de 5 estrellas`} className={styles.stars}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          aria-hidden="true"
          className={value <= rating ? styles.starFilled : ""}
          key={value}
        />
      ))}
    </span>
  );
}

function WebOrderCard({
  isUpdating,
  isReviewingPayment,
  onReviewPayment,
  onStatus,
  order,
}: {
  isUpdating: boolean;
  isReviewingPayment: boolean;
  onReviewPayment: (approved: boolean) => void;
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
      <div className={styles.paymentStatus}>
        <span>{paymentMethodLabel(order)}</span>
        <strong data-status={order.paymentStatus}>
          {paymentStatusLabel(order.paymentStatus)}
        </strong>
      </div>
      {order.paymentStatus === "REPORTED" && order.manualPaymentProofUrl ? (
        <section className={styles.proofReview}>
          <a
            href={resolveApiAssetUrl(order.manualPaymentProofUrl) ?? undefined}
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt={`Comprobante del pedido ${order.orderNumber}`}
              src={resolveApiAssetUrl(order.manualPaymentProofUrl) ?? undefined}
            />
            <span>Ver comprobante completo</span>
          </a>
          <div>
            <button
              disabled={isReviewingPayment}
              type="button"
              onClick={() => onReviewPayment(true)}
            >
              <Check aria-hidden="true" /> Aprobar pago
            </button>
            <button
              className={styles.rejectPayment}
              disabled={isReviewingPayment}
              type="button"
              onClick={() => onReviewPayment(false)}
            >
              <X aria-hidden="true" /> Rechazar
            </button>
          </div>
        </section>
      ) : null}
      <div className={styles.actions}>
        {next ? <button disabled={isUpdating} onClick={() => onStatus(next.value)} type="button">{next.label}</button> : null}
        <button className={styles.cancel} disabled={isUpdating} onClick={() => onStatus("CANCELLED")} type="button">Cancelar</button>
      </div>
    </article>
  );
}

function paymentStatusLabel(status: CatalogOrder["paymentStatus"]) {
  if (status === "REPORTED") return "Por verificar";
  if (status === "PAID") return "Aprobado";
  if (status === "FAILED") return "Rechazado";
  if (status === "REFUNDED") return "Reembolsado";
  return "Pendiente";
}

function paymentMethodLabel(order: CatalogOrder) {
  if (order.paymentMethod === "MANUAL_TRANSFER") return "Transferencia / QR";
  if (order.paymentMethod === "ONLINE_GATEWAY") return "Pasarela en línea";
  return order.fulfillmentMethod === "DELIVERY"
    ? "Efectivo contra entrega"
    : "Efectivo al recoger";
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
    return {
      value: "DELIVERED",
      label:
        order.paymentMethod === "PAY_ON_FULFILLMENT"
          ? "Confirmar cobro y entregar"
          : "Marcar entregado",
    };
  }
  return null;
}
