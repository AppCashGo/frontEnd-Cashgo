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
  Copy,
  Eye,
  EyeOff,
  Upload,
  Star,
  MessageSquareText,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "@/shared/services/api-client";
import { resolveApiAssetUrl } from "@/shared/services/api-client";
import {
  getCustomerCatalogOrders,
  reportCatalogManualPayment,
  reviewCatalogOrder,
} from "../services/catalog-orders-api";
import {
  createCatalogPaymentCheckout,
  getCatalogPaymentConfiguration,
  type CatalogPaymentConfiguration,
} from "../services/catalog-payments-api";
import type {
  CatalogOrder,
  CatalogOrderStatus,
  ReviewCatalogOrderPayload,
} from "../types/catalog-order";
import type { PublicCatalogDetail } from "../types/public-catalog";
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
  manualPayment,
  onClose,
  onReorder,
}: {
  accessToken: string;
  catalogSlug: string;
  initialOrder?: CatalogOrder | null;
  manualPayment: PublicCatalogDetail["settings"]["manualPayment"];
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
  const [reportingOrderId, setReportingOrderId] = useState<number | null>(null);
  const [reviewingOrderId, setReviewingOrderId] = useState<number | null>(null);
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

  const reportManualPayment = async (order: CatalogOrder, file: File) => {
    setReportingOrderId(order.id);
    setError(null);
    try {
      const updatedOrder = await reportCatalogManualPayment(
        catalogSlug,
        order.id,
        file,
        accessToken,
      );
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder,
        ),
      );
    } catch (reportError) {
      setError(
        getApiErrorMessage(
          reportError,
          "No pudimos enviar el comprobante de pago.",
        ),
      );
    } finally {
      setReportingOrderId(null);
    }
  };

  const submitReview = async (
    order: CatalogOrder,
    input: ReviewCatalogOrderPayload,
  ) => {
    setReviewingOrderId(order.id);
    setError(null);
    try {
      const updatedOrder = await reviewCatalogOrder(
        catalogSlug,
        order.id,
        input,
        accessToken,
      );
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === updatedOrder.id ? updatedOrder : currentOrder,
        ),
      );
      return true;
    } catch (reviewError) {
      setError(
        getApiErrorMessage(
          reviewError,
          "No pudimos guardar tu calificación.",
        ),
      );
      return false;
    } finally {
      setReviewingOrderId(null);
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
          {paymentConfiguration &&
          !paymentConfiguration.enabled &&
          !manualPayment.enabled ? (
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
                  manualPayment={manualPayment}
                  isPaying={payingOrderId === order.id}
                  isReporting={reportingOrderId === order.id}
                  isReviewing={reviewingOrderId === order.id}
                  key={order.id}
                  onPay={() => void startPayment(order)}
                  onReportManualPayment={(file) =>
                    void reportManualPayment(order, file)
                  }
                  onReorder={() => onReorder(order)}
                  onReview={(input) => submitReview(order, input)}
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
  manualPayment,
  isPaying,
  isReporting,
  isReviewing,
  onPay,
  onReportManualPayment,
  onReorder,
  onReview,
  order,
  provider,
}: {
  canPay: boolean;
  manualPayment: PublicCatalogDetail["settings"]["manualPayment"];
  isPaying: boolean;
  isReporting: boolean;
  isReviewing: boolean;
  onPay: () => void;
  onReportManualPayment: (file: File) => void;
  onReorder: () => void;
  onReview: (input: ReviewCatalogOrderPayload) => Promise<boolean>;
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
          {paymentLabel(order)}
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
      {manualPayment.enabled &&
      order.paymentMethod === "MANUAL_TRANSFER" &&
      (order.paymentStatus === "PENDING" || order.paymentStatus === "FAILED") &&
      order.status !== "CANCELLED" &&
      order.status !== "DELIVERED" ? (
        <ManualPaymentForm
          isReporting={isReporting}
          manualPayment={manualPayment}
          order={order}
          onReport={onReportManualPayment}
        />
      ) : null}
      {order.paymentStatus === "REPORTED" ? (
        <div className={styles.reportedPayment}>
          <Clock3 aria-hidden="true" />
          <span>
            <strong>Comprobante enviado</strong>
            El negocio está verificando el pago. Te avisaremos cuando sea aprobado.
          </span>
        </div>
      ) : null}
      {order.status === "DELIVERED" ? (
        <OrderReview
          isReviewing={isReviewing}
          order={order}
          onReview={onReview}
        />
      ) : null}
      <button className={styles.reorderButton} onClick={onReorder} type="button">
        <Repeat2 aria-hidden="true" />
        Volver a comprar
      </button>
    </article>
  );
}

function OrderReview({
  isReviewing,
  order,
  onReview,
}: {
  isReviewing: boolean;
  order: CatalogOrder;
  onReview: (input: ReviewCatalogOrderPayload) => Promise<boolean>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serviceRating, setServiceRating] = useState(
    order.serviceReview?.rating ?? 0,
  );
  const [serviceComment, setServiceComment] = useState(
    order.serviceReview?.comment ?? "",
  );
  const reviewableItems = order.items.filter(
    (item): item is typeof item & { productId: number } =>
      item.productId !== null,
  );
  const [productRatings, setProductRatings] = useState<Record<number, number>>(
    () =>
      Object.fromEntries(
        reviewableItems.map((item) => [
          item.productId,
          order.productReviews.find(
            (review) => review.productId === item.productId,
          )?.rating ?? 0,
        ]),
      ),
  );
  const [productComments, setProductComments] = useState<Record<number, string>>(
    () =>
      Object.fromEntries(
        reviewableItems.map((item) => [
          item.productId,
          order.productReviews.find(
            (review) => review.productId === item.productId,
          )?.comment ?? "",
        ]),
      ),
  );
  const hasReview = Boolean(order.serviceReview);
  const isComplete =
    serviceRating > 0 &&
    reviewableItems.every((item) => productRatings[item.productId] > 0);

  async function handleSubmit() {
    if (!isComplete) return;
    const wasSaved = await onReview({
      serviceRating,
      serviceComment: serviceComment.trim() || undefined,
      products: reviewableItems.map((item) => ({
        productId: item.productId,
        rating: productRatings[item.productId],
        comment: productComments[item.productId]?.trim() || undefined,
      })),
    });
    if (wasSaved) {
      setSaved(true);
      setIsOpen(false);
    }
  }

  return (
    <section className={styles.orderReview}>
      <div className={styles.reviewSummary}>
        <MessageSquareText aria-hidden="true" />
        <span>
          <strong>{hasReview || saved ? "Gracias por tu opinión" : "¿Cómo estuvo tu compra?"}</strong>
          <small>
            {hasReview || saved
              ? "Tu calificación ayuda a mejorar el catálogo."
              : "Califica el servicio y los productos que recibiste."}
          </small>
        </span>
        <button type="button" onClick={() => setIsOpen((value) => !value)}>
          {isOpen ? "Cerrar" : hasReview || saved ? "Editar" : "Calificar"}
        </button>
      </div>

      {isOpen ? (
        <div className={styles.reviewForm}>
          <div className={styles.serviceReviewField}>
            <span>
              <strong>Servicio de la tienda</strong>
              <small>Atención, preparación y entrega</small>
            </span>
            <StarRating
              label="Calificación del servicio"
              value={serviceRating}
              onChange={setServiceRating}
            />
            <textarea
              maxLength={800}
              placeholder="Cuéntanos cómo fue tu experiencia (opcional)"
              value={serviceComment}
              onChange={(event) => setServiceComment(event.target.value)}
            />
          </div>

          {reviewableItems.map((item) => (
            <div className={styles.productReviewField} key={item.productId}>
              <span>
                <strong>{item.productName}</strong>
                <small>Producto adquirido</small>
              </span>
              <StarRating
                label={`Calificación de ${item.productName}`}
                value={productRatings[item.productId] ?? 0}
                onChange={(rating) =>
                  setProductRatings((ratings) => ({
                    ...ratings,
                    [item.productId]: rating,
                  }))
                }
              />
              <textarea
                maxLength={800}
                placeholder="Comentario sobre el producto (opcional)"
                value={productComments[item.productId] ?? ""}
                onChange={(event) =>
                  setProductComments((comments) => ({
                    ...comments,
                    [item.productId]: event.target.value,
                  }))
                }
              />
            </div>
          ))}

          <button
            className={styles.saveReviewButton}
            disabled={!isComplete || isReviewing}
            type="button"
            onClick={() => void handleSubmit()}
          >
            {isReviewing ? "Guardando calificación…" : "Guardar calificación"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function StarRating({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (rating: number) => void;
  value: number;
}) {
  return (
    <div aria-label={label} className={styles.starRating} role="group">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          aria-label={`${rating} ${rating === 1 ? "estrella" : "estrellas"}`}
          className={rating <= value ? styles.starActive : ""}
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
        >
          <Star aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function paymentLabel(order: CatalogOrder) {
  if (order.paymentStatus === "PAID") return "Pago aprobado";
  if (order.paymentStatus === "REPORTED") return "Pago reportado";
  if (order.paymentStatus === "FAILED") return "Pago rechazado";
  if (order.paymentStatus === "REFUNDED") return "Pago reembolsado";
  if (order.paymentMethod === "PAY_ON_FULFILLMENT") {
    return order.fulfillmentMethod === "DELIVERY"
      ? "Pago contra entrega"
      : "Pago al recoger";
  }
  return "Pendiente de pago";
}

function ManualPaymentForm({
  isReporting,
  manualPayment,
  order,
  onReport,
}: {
  isReporting: boolean;
  manualPayment: PublicCatalogDetail["settings"]["manualPayment"];
  order: CatalogOrder;
  onReport: (file: File) => void;
}) {
  const [proof, setProof] = useState<File | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    if (!manualPayment.key) return;
    await navigator.clipboard.writeText(manualPayment.key);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className={styles.manualPayment}>
      <div className={styles.manualPaymentHeading}>
        <div>
          <span>Pago por QR o llave</span>
          <strong>Transfiere exactamente {money.format(Number(order.total))}</strong>
        </div>
        {manualPayment.holder ? <small>Titular: {manualPayment.holder}</small> : null}
      </div>
      <div className={styles.manualPaymentBody}>
        {manualPayment.qrUrl ? (
          <img
            alt="Código QR para realizar el pago"
            className={styles.paymentQr}
            src={resolveApiAssetUrl(manualPayment.qrUrl) ?? undefined}
          />
        ) : null}
        <div className={styles.manualPaymentSteps}>
          <ol>
            <li>Escanea el QR desde tu banco o billetera.</li>
            <li>Transfiere el total exacto del pedido.</li>
            <li>Adjunta una captura del comprobante.</li>
          </ol>
          {manualPayment.key ? (
            <div className={styles.paymentKey}>
              <span>Llave</span>
              <strong>
                {isKeyVisible ? manualPayment.key : manualPayment.keyMasked}
              </strong>
              <button
                aria-label={isKeyVisible ? "Ocultar llave" : "Mostrar llave"}
                type="button"
                onClick={() => setIsKeyVisible((value) => !value)}
              >
                {isKeyVisible ? <EyeOff /> : <Eye />}
              </button>
              <button aria-label="Copiar llave" type="button" onClick={() => void copyKey()}>
                <Copy />
              </button>
              {copied ? <small>Copiada</small> : null}
            </div>
          ) : null}
          <label className={styles.proofInput}>
            <Upload aria-hidden="true" />
            <span>{proof ? proof.name : "Seleccionar comprobante"}</span>
            <input
              accept="image/jpeg,image/png,image/webp"
              type="file"
              onChange={(event) => setProof(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            className={styles.reportPaymentButton}
            disabled={!proof || isReporting}
            type="button"
            onClick={() => proof && onReport(proof)}
          >
            {isReporting ? "Enviando comprobante…" : "Reportar pago"}
          </button>
        </div>
      </div>
    </section>
  );
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
