import {
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Store,
  Truck,
  X,
  Bell,
  Repeat2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/shared/services/api-client";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import { getCustomerCatalogOrders } from "../services/catalog-orders-api";
import {
  createCatalogPaymentCheckout,
  getCatalogPaymentConfiguration,
  type CatalogPaymentConfiguration,
} from "../services/catalog-payments-api";
import type {
  CatalogOrder,
  CatalogOrderStatus,
} from "../types/catalog-order";
import styles from "./CustomerOrdersModal.module.css";
import {
  getCatalogNotifications,
  markCatalogNotificationsRead,
} from "../services/catalog-customer-api";
import type { CatalogCustomerNotification } from "../types/catalog-customer";

const money = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 0,
  style: "currency",
});

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

const statusLabels: Record<CatalogOrderStatus, string> = {
  PENDING_CONFIRMATION: "Esperando confirmación",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY_FOR_PICKUP: "Listo para recoger",
  OUT_FOR_DELIVERY: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export function CustomerOrdersModal({
  accessToken,
  catalogSlug,
  initialOrder,
  onClose,
  onReorder,
}: {
  accessToken: string;
  catalogSlug: string;
  initialOrder?: CatalogOrder | null;
  onClose: () => void;
  onReorder: (order: CatalogOrder) => void;
}) {
  const [orders, setOrders] = useState<CatalogOrder[]>(
    initialOrder ? [initialOrder] : [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentConfiguration, setPaymentConfiguration] =
    useState<CatalogPaymentConfiguration | null>(null);
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<CatalogCustomerNotification[]>([]);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const result = await getCustomerCatalogOrders(catalogSlug, accessToken);
      setOrders(result);
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "No pudimos consultar tus pedidos."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, catalogSlug]);

  useEffect(() => {
    void loadOrders();
    void getCatalogPaymentConfiguration()
      .then(setPaymentConfiguration)
      .catch(() => setPaymentConfiguration(null));
    void getCatalogNotifications(catalogSlug, accessToken)
      .then((result) => {
        setNotifications(result);
        if (result.some((notification) => !notification.readAt)) {
          void markCatalogNotificationsRead(catalogSlug, accessToken);
        }
      })
      .catch(() => setNotifications([]));
    const timer = window.setInterval(() => void loadOrders(), 30_000);
    return () => window.clearInterval(timer);
  }, [accessToken, catalogSlug, loadOrders]);

  const startPayment = async (order: CatalogOrder) => {
    setPayingOrderId(order.id);
    setError(null);
    try {
      const checkout = await createCatalogPaymentCheckout(
        catalogSlug,
        order.id,
        accessToken,
      );
      window.location.assign(checkout.checkoutUrl);
    } catch (paymentError) {
      setError(
        getApiErrorMessage(paymentError, "No pudimos iniciar el pago con Wompi."),
      );
      setPayingOrderId(null);
    }
  };

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className={styles.layer}>
      <button aria-label="Cerrar pedidos" className={styles.backdrop} onClick={onClose} />
      <section aria-label="Mis pedidos" aria-modal="true" className={styles.modal} role="dialog">
        <header>
          <div>
            <p>Seguimiento</p>
            <h2>Mis pedidos</h2>
          </div>
          <div className={styles.headerActions}>
            <button aria-label="Actualizar pedidos" disabled={isLoading} onClick={() => void loadOrders()} type="button">
              <RefreshCw aria-hidden="true" />
            </button>
            <button aria-label="Cerrar pedidos" onClick={onClose} type="button">
              <X aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className={styles.content}>
          {initialOrder ? (
            <div className={styles.successBanner} role="status">
              <CheckCircle2 aria-hidden="true" />
              <span>
                <strong>¡Pedido creado!</strong>
                Guarda el número {initialOrder.orderNumber} para consultarlo.
              </span>
            </div>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {paymentConfiguration && !paymentConfiguration.enabled ? (
            <p className={styles.paymentUnavailable}>
              El pago en línea estará disponible cuando el negocio termine de configurar Wompi.
            </p>
          ) : null}
          {notifications.length > 0 ? (
            <section className={styles.notifications}>
              <div><Bell aria-hidden="true" /><strong>Novedades</strong></div>
              {notifications.slice(0, 3).map((notification) => (
                <article className={!notification.readAt ? styles.unreadNotification : ""} key={notification.id}>
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </article>
              ))}
            </section>
          ) : null}
          {isLoading && orders.length === 0 ? (
            <div className={styles.empty}><Clock3 aria-hidden="true" /><p>Cargando tus pedidos…</p></div>
          ) : orders.length === 0 ? (
            <div className={styles.empty}><ShoppingBag aria-hidden="true" /><h3>Aún no tienes pedidos</h3><p>Cuando finalices una compra podrás seguirla desde aquí.</p></div>
          ) : (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <OrderCard
                  canPay={Boolean(paymentConfiguration?.enabled)}
                  isPaying={payingOrderId === order.id}
                  key={order.id}
                  onPay={() => void startPayment(order)}
                  onReorder={() => onReorder(order)}
                  order={order}
                  provider={paymentConfiguration?.provider ?? "WOMPI"}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function OrderCard({
  canPay,
  isPaying,
  onPay,
  onReorder,
  order,
  provider,
}: {
  canPay: boolean;
  isPaying: boolean;
  onPay: () => void;
  onReorder: () => void;
  order: CatalogOrder;
  provider: string;
}) {
  const delivery = order.fulfillmentMethod === "DELIVERY";
  return (
    <article className={styles.orderCard}>
      <div className={styles.orderHeading}>
        <div><span>Pedido</span><h3>{order.orderNumber}</h3><small>{dateTime.format(new Date(order.createdAt))}</small></div>
        <strong className={`${styles.status} ${order.status === "CANCELLED" ? styles.cancelled : ""}`}>{statusLabels[order.status]}</strong>
      </div>
      <div className={styles.progress} aria-label={`Estado: ${statusLabels[order.status]}`}>
        <StatusStep active icon={<Clock3 />} label="Recibido" />
        <StatusStep active={hasReached(order, "PREPARING")} icon={<PackageCheck />} label="Preparando" />
        <StatusStep active={hasReached(order, delivery ? "OUT_FOR_DELIVERY" : "READY_FOR_PICKUP")} icon={delivery ? <Truck /> : <Store />} label={delivery ? "En camino" : "Para recoger"} />
        <StatusStep active={order.status === "DELIVERED"} icon={<CheckCircle2 />} label="Entregado" />
      </div>
      <div className={styles.items}>
        {order.items.map((item) => (
          <div key={item.id}>
            <span className={styles.itemImage}>{item.imageUrl ? <img alt="" src={resolveApiAssetUrl(item.imageUrl) ?? undefined} /> : <ShoppingBag />}</span>
            <span><strong>{item.quantity} × {item.productName}</strong><small>{money.format(Number(item.lineTotal))}</small></span>
          </div>
        ))}
      </div>
      <div className={styles.orderFooter}>
        <span>{delivery ? <Truck /> : <Store />} {delivery ? "Domicilio" : "Retiro en tienda"}</span>
        {order.address ? <span><MapPin /> {order.address}</span> : null}
        <strong>Total {money.format(Number(order.total))}</strong>
      </div>
      <div className={styles.paymentRow}>
        <span className={styles[`payment${order.paymentStatus}`]}>
          {paymentLabel(order.paymentStatus)}
        </span>
        {canPay &&
        (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED") &&
        order.status !== "CANCELLED" &&
        order.status !== "DELIVERED" ? (
          <button disabled={isPaying} onClick={onPay} type="button">
            {isPaying
              ? "Abriendo pago…"
              : `Pagar con ${provider === "WOMPI" ? "Wompi" : provider}`}
          </button>
        ) : null}
      </div>
      <button className={styles.reorderButton} onClick={onReorder} type="button">
        <Repeat2 aria-hidden="true" />
        Volver a comprar
      </button>
    </article>
  );
}

function paymentLabel(status: CatalogOrder["paymentStatus"]) {
  if (status === "PAID") return "Pago aprobado";
  if (status === "FAILED") return "Pago rechazado";
  if (status === "REFUNDED") return "Pago reembolsado";
  return "Pendiente de pago";
}

function StatusStep({ active, icon, label }: { active: boolean; icon: React.ReactNode; label: string }) {
  return <span className={active ? styles.activeStep : ""}>{icon}<small>{label}</small></span>;
}

function hasReached(order: CatalogOrder, target: CatalogOrderStatus) {
  if (order.status === "CANCELLED") return false;
  const flow: CatalogOrderStatus[] = order.fulfillmentMethod === "DELIVERY"
    ? ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]
    : ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP", "DELIVERED"];
  return flow.indexOf(order.status) >= flow.indexOf(target);
}
