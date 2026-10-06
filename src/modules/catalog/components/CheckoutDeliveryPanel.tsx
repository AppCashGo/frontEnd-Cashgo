import {
  Banknote,
  MapPin,
  MessageSquareText,
  Phone,
  ShoppingBag,
  Truck,
  QrCode,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  CatalogCheckoutDetails,
} from "../hooks/use-catalog-checkout-store";
import styles from "./CheckoutDeliveryPanel.module.css";
import type { CatalogSavedAddress } from "../types/catalog-customer";

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 0,
  style: "currency",
});

export function CheckoutDeliveryPanel({
  businessAddress,
  checkout,
  deliveryEnabled,
  deliveryFee,
  notice,
  isSubmitting,
  manualPaymentEnabled,
  onBack,
  onContinue,
  onUpdate,
  savedAddresses,
  pickupEnabled,
  subtotal,
}: {
  businessAddress: string;
  checkout: CatalogCheckoutDetails;
  deliveryEnabled: boolean;
  deliveryFee: number;
  notice: string | null;
  isSubmitting: boolean;
  manualPaymentEnabled: boolean;
  onBack: () => void;
  onContinue: () => void;
  onUpdate: (patch: Partial<CatalogCheckoutDetails>) => void;
  savedAddresses: CatalogSavedAddress[];
  pickupEnabled: boolean;
  subtotal: number;
}) {
  const appliedDeliveryFee = checkout.method === "delivery" ? deliveryFee : 0;
  const total = subtotal + appliedDeliveryFee;
  const isContactComplete =
    checkout.contactName.trim().length >= 2 && checkout.phone.trim().length >= 7;
  const isAddressComplete =
    checkout.method !== "delivery" || checkout.address.trim().length >= 5;
  const canContinue =
    Boolean(checkout.method) &&
    isContactComplete &&
    isAddressComplete &&
    (checkout.paymentMethod !== "MANUAL_TRANSFER" || manualPaymentEnabled);

  return (
    <div className={styles.panel}>
      <button className={styles.backButton} onClick={onBack} type="button">
        ← Revisar productos
      </button>
      <div className={styles.sectionHeading}>
        <strong>¿Cómo quieres recibir tu compra?</strong>
        <span>Selecciona una opción para calcular el total.</span>
      </div>

      <div className={styles.methodGrid}>
        {pickupEnabled ? (
          <MethodButton
            active={checkout.method === "pickup"}
            description={businessAddress || "Dirección por confirmar"}
            icon={<ShoppingBag aria-hidden="true" />}
            label="Retiro en tienda"
            onClick={() => onUpdate({ method: "pickup" })}
          />
        ) : null}
        {deliveryEnabled ? (
          <MethodButton
            active={checkout.method === "delivery"}
            description={
              deliveryFee > 0
                ? `Recargo ${currencyFormatter.format(deliveryFee)}`
                : "Sin recargo"
            }
            icon={<Truck aria-hidden="true" />}
            label="Domicilio"
            onClick={() => onUpdate({ method: "delivery" })}
          />
        ) : null}
      </div>

      {!pickupEnabled && !deliveryEnabled ? (
        <p className={styles.unavailableMessage}>
          El negocio todavía no ha habilitado métodos de entrega.
        </p>
      ) : null}

      {checkout.method ? (
        <div className={styles.fields}>
          <label>
            Nombre de quien recibe
            <input
              autoComplete="name"
              onChange={(event) => onUpdate({ contactName: event.target.value })}
              placeholder="Nombre completo"
              value={checkout.contactName}
            />
          </label>
          <label>
            Celular de contacto
            <span className={styles.iconInput}>
              <Phone aria-hidden="true" />
              <input
                autoComplete="tel"
                inputMode="tel"
                onChange={(event) => onUpdate({ phone: event.target.value })}
                placeholder="300 000 0000"
                value={checkout.phone}
              />
            </span>
          </label>
          {checkout.method === "delivery" ? (
            <>
              {savedAddresses.length > 0 ? (
                <div className={`${styles.fullField} ${styles.savedAddresses}`}>
                  <strong>Mis direcciones</strong>
                  <div>
                    {savedAddresses.map((savedAddress) => (
                      <button
                        aria-pressed={checkout.address === savedAddress.address}
                        key={savedAddress.id}
                        onClick={() =>
                          onUpdate({
                            address: savedAddress.address,
                            instructions:
                              savedAddress.instructions || checkout.instructions,
                            saveAddress: false,
                          })
                        }
                        type="button"
                      >
                        <MapPin aria-hidden="true" />
                        <span><strong>{savedAddress.label}</strong><small>{savedAddress.address}</small></span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <label className={styles.fullField}>
                Dirección de entrega
                <span className={styles.iconInput}>
                  <MapPin aria-hidden="true" />
                  <input
                    autoComplete="street-address"
                    onChange={(event) => onUpdate({ address: event.target.value })}
                    placeholder="Calle, número, barrio y referencias"
                    value={checkout.address}
                  />
                </span>
              </label>
              <label className={`${styles.fullField} ${styles.saveAddress}`}>
                <input
                  checked={checkout.saveAddress}
                  onChange={(event) => onUpdate({ saveAddress: event.target.checked })}
                  type="checkbox"
                />
                Guardar esta dirección
                {checkout.saveAddress ? (
                  <input
                    aria-label="Nombre de la dirección"
                    maxLength={60}
                    onChange={(event) => onUpdate({ addressLabel: event.target.value })}
                    placeholder="Casa, trabajo…"
                    value={checkout.addressLabel}
                  />
                ) : null}
              </label>
            </>
          ) : null}
          <label className={styles.fullField}>
            Indicaciones para el pedido <small>(opcional)</small>
            <span className={styles.iconInput}>
              <MessageSquareText aria-hidden="true" />
              <input
                onChange={(event) => onUpdate({ instructions: event.target.value })}
                placeholder={
                  checkout.method === "delivery"
                    ? "Apto, torre, portería..."
                    : "Hora aproximada de retiro..."
                }
                value={checkout.instructions}
              />
            </span>
          </label>
        </div>
      ) : null}

      {checkout.method ? (
        <section className={styles.paymentSection}>
          <div className={styles.sectionHeading}>
            <strong>¿Cómo deseas pagar?</strong>
            <span>El pedido conservará este método hasta completar la venta.</span>
          </div>
          <div className={styles.methodGrid}>
            {manualPaymentEnabled ? (
              <MethodButton
                active={checkout.paymentMethod === "MANUAL_TRANSFER"}
                description="Escanea el QR y envía el comprobante"
                icon={<QrCode aria-hidden="true" />}
                label="Transferencia / DaviPlata"
                onClick={() =>
                  onUpdate({ paymentMethod: "MANUAL_TRANSFER" })
                }
              />
            ) : null}
            <MethodButton
              active={checkout.paymentMethod === "PAY_ON_FULFILLMENT"}
              description={
                checkout.method === "delivery"
                  ? "Paga en efectivo al recibir"
                  : "Paga en efectivo al recoger"
              }
              icon={<Banknote aria-hidden="true" />}
              label={
                checkout.method === "delivery"
                  ? "Pago contra entrega"
                  : "Pago al recoger"
              }
              onClick={() =>
                onUpdate({ paymentMethod: "PAY_ON_FULFILLMENT" })
              }
            />
          </div>
        </section>
      ) : null}

      <div className={styles.totals}>
        <span>Productos <strong>{currencyFormatter.format(subtotal)}</strong></span>
        {checkout.method === "delivery" ? (
          <span>
            Domicilio <strong>{currencyFormatter.format(deliveryFee)}</strong>
          </span>
        ) : null}
        <span className={styles.totalRow}>
          Total <strong>{currencyFormatter.format(total)}</strong>
        </span>
      </div>

      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}

      <button
        className={styles.continueButton}
        disabled={!canContinue || isSubmitting}
        onClick={onContinue}
        type="button"
      >
        {isSubmitting ? "Creando pedido…" : "Crear pedido"}
      </button>
    </div>
  );
}

function MethodButton({
  active,
  description,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={active ? styles.activeMethod : styles.methodButton}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
    </button>
  );
}
