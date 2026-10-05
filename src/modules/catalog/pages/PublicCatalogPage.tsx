import {
  ChevronRight,
  CircleCheck,
  Clock3,
  Heart,
  Mail,
  MapPin,
  Minus,
  PackageSearch,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { resolveProductImageUrl } from "@/modules/products/utils/resolve-product-image-url";
import {
  catalogWeekdayIds,
  type CatalogBusinessHour,
} from "@/modules/settings/types/settings";
import { SearchableSelect } from "@/shared/components/ui/SearchableSelect";
import { formatTime12Hour } from "@/shared/utils/time";
import { CustomerAuthModal } from "../components/CustomerAuthModal";
import { CheckoutDeliveryPanel } from "../components/CheckoutDeliveryPanel";
import { CustomerOrdersModal } from "../components/CustomerOrdersModal";
import { CustomerAccountModal } from "../components/CustomerAccountModal";
import {
  emptyCatalogCheckout,
  useCatalogCheckoutStore,
} from "../hooks/use-catalog-checkout-store";
import { useCustomerSessionStore } from "../hooks/use-customer-session-store";
import {
  type PublicCartItem,
  usePublicCartStore,
} from "../hooks/use-public-cart-store";
import { usePublicCatalogQuery } from "../hooks/use-public-catalog-query";
import { createCatalogOrder } from "../services/catalog-orders-api";
import {
  getCatalogSavedAddresses,
  saveCatalogAddress,
  addCatalogCustomerFavorite,
  getCatalogCustomerFavorites,
  removeCatalogCustomerFavorite,
} from "../services/catalog-customer-api";
import type { CatalogOrder } from "../types/catalog-order";
import type { CatalogSavedAddress } from "../types/catalog-customer";
import {
  getApiErrorMessage,
  resolveApiAssetUrl,
} from "@/shared/services/api-client";
import { verifyCatalogCustomerEmail } from "../services/customer-auth-api";
import type {
  PublicCatalogCategory,
  PublicCatalogProduct,
} from "../types/public-catalog";
import styles from "./PublicCatalogPage.module.css";

const allCategoriesId = "all";
const emptyCartItems: PublicCartItem[] = [];

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 0,
  style: "currency",
});

const weekdayLabels = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
} as const;

export function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const normalizedSlug = slug?.trim() ?? null;
  const catalogQuery = usePublicCatalogQuery(normalizedSlug);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(allCategoriesId);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [isFulfillmentOpen, setIsFulfillmentOpen] = useState(false);
  const [fulfillmentNotice, setFulfillmentNotice] = useState<string | null>(
    null,
  );
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CatalogOrder | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CatalogSavedAddress[]>(
    [],
  );

  const catalog = catalogQuery.data;
  const categories = useMemo(
    () =>
      buildVisibleCategories(
        catalog?.categories ?? [],
        catalog?.products ?? [],
      ),
    [catalog?.categories, catalog?.products],
  );
  const filteredProducts = useMemo(
    () =>
      filterProducts(
        catalog?.products ?? [],
        categories,
        selectedCategoryId,
        searchTerm,
      ),
    [catalog?.products, categories, selectedCategoryId, searchTerm],
  );
  const groupedHours = useMemo(
    () => groupBusinessHours(catalog?.settings.businessHours),
    [catalog?.settings.businessHours],
  );
  const catalogKey = catalog?.slug ?? normalizedSlug ?? "";
  const cartItems = usePublicCartStore(
    (state) => state.carts[catalogKey] ?? emptyCartItems,
  );
  const addItem = usePublicCartStore((state) => state.addItem);
  const reconcileCart = usePublicCartStore((state) => state.reconcileCart);
  const setQuantity = usePublicCartStore((state) => state.setQuantity);
  const removeItem = usePublicCartStore((state) => state.removeItem);
  const clearCart = usePublicCartStore((state) => state.clearCart);
  const replaceFromOrder = usePublicCartStore(
    (state) => state.replaceFromOrder,
  );
  const customerSession = useCustomerSessionStore(
    (state) => state.sessions[catalogKey],
  );
  const setCustomerSession = useCustomerSessionStore(
    (state) => state.setSession,
  );
  const clearCustomerSession = useCustomerSessionStore(
    (state) => state.clearSession,
  );
  const updateCustomerSession = useCustomerSessionStore(
    (state) => state.updateCustomer,
  );
  const checkout = useCatalogCheckoutStore(
    (state) => state.checkouts[catalogKey] ?? emptyCatalogCheckout,
  );
  const initializeCheckoutContact = useCatalogCheckoutStore(
    (state) => state.initializeContact,
  );
  const updateCheckout = useCatalogCheckoutStore(
    (state) => state.updateCheckout,
  );
  const cartItemCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const cartSubtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const handleCreateOrder = async () => {
    if (
      !catalog?.settings.shoppingEnabled ||
      !customerSession ||
      !checkout.method ||
      cartItems.length === 0
    ) {
      return;
    }
    setIsCreatingOrder(true);
    setFulfillmentNotice(null);
    try {
      const order = await createCatalogOrder(
        catalogKey,
        customerSession.accessToken,
        {
          fulfillmentMethod:
            checkout.method === "delivery" ? "DELIVERY" : "PICKUP",
          contactName: checkout.contactName,
          email: checkout.email || customerSession.customer.email,
          phone: checkout.phone,
          address:
            checkout.method === "delivery" ? checkout.address : undefined,
          instructions: checkout.instructions || undefined,
          items: cartItems.map((item) => ({
            productId: Number(item.productId),
            quantity: item.quantity,
          })),
        },
      );
      if (
        checkout.method === "delivery" &&
        checkout.saveAddress &&
        checkout.addressLabel.trim().length >= 2
      ) {
        void saveCatalogAddress(catalogKey, customerSession.accessToken, {
          label: checkout.addressLabel,
          address: checkout.address,
          instructions: checkout.instructions || undefined,
        })
          .then((savedAddress) =>
            setSavedAddresses((current) => [
              savedAddress,
              ...current.filter((address) => address.id !== savedAddress.id),
            ]),
          )
          .catch(() => undefined);
      }
      clearCart(catalogKey);
      setCreatedOrder(order);
      setIsFulfillmentOpen(false);
      setIsCartOpen(false);
      setIsOrdersOpen(true);
    } catch (error) {
      setFulfillmentNotice(
        getApiErrorMessage(
          error,
          "No pudimos crear el pedido. Intenta nuevamente.",
        ),
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  useEffect(() => {
    if (!catalogKey || !catalog) {
      return;
    }

    reconcileCart(catalogKey, catalog.products);
  }, [catalog, catalogKey, reconcileCart]);

  useEffect(() => {
    if (!customerSession || !catalogKey) {
      return;
    }

    initializeCheckoutContact(catalogKey, {
      email: customerSession.customer.email,
      name: customerSession.customer.name,
    });
  }, [catalogKey, customerSession, initializeCheckoutContact]);

  useEffect(() => {
    if (!customerSession || !catalogKey) {
      setSavedAddresses([]);
      return;
    }
    void getCatalogSavedAddresses(catalogKey, customerSession.accessToken)
      .then((addresses) => {
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((address) => address.isDefault);
        const currentAddress =
          useCatalogCheckoutStore.getState().checkouts[catalogKey]?.address;
        if (defaultAddress && !currentAddress) {
          updateCheckout(catalogKey, {
            address: defaultAddress.address,
            instructions: defaultAddress.instructions,
          });
        }
      })
      .catch(() => setSavedAddresses([]));
  }, [catalogKey, customerSession, updateCheckout]);

  useEffect(() => {
    if (!customerSession || !catalogKey) {
      setFavoriteIds(new Set());
      return;
    }
    void getCatalogCustomerFavorites(catalogKey, customerSession.accessToken)
      .then((items) =>
        setFavoriteIds(new Set(items.map((item) => item.product.id))),
      )
      .catch(() => setFavoriteIds(new Set()));
  }, [catalogKey, customerSession]);

  useEffect(() => {
    if (!catalogKey || customerSession) return;
    const parameters = new URLSearchParams(window.location.search);
    const token = parameters.get("verificar-correo");
    if (!token) return;
    setPageNotice("Estamos verificando tu correo…");
    void verifyCatalogCustomerEmail(catalogKey, token)
      .then((response) => {
        setCustomerSession(catalogKey, response);
        setPageNotice("Correo verificado. Tu cuenta ya está activa.");
        parameters.delete("verificar-correo");
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${parameters.size ? `?${parameters}` : ""}`,
        );
        setIsAccountOpen(true);
      })
      .catch((error) =>
        setPageNotice(
          getApiErrorMessage(
            error,
            "El enlace de verificación no es válido o venció.",
          ),
        ),
      );
  }, [catalogKey, customerSession, setCustomerSession]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    };
    document.body.classList.add(styles.cartOpen);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove(styles.cartOpen);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!customerSession) return;
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get("pago") === "retorno") {
      setCreatedOrder(null);
      setIsOrdersOpen(true);
    }
  }, [customerSession]);

  if (catalogQuery.isLoading) {
    return (
      <main className={styles.page}>
        <section className={styles.statePanel}>
          <Store aria-hidden="true" />
          <h1>Cargando catálogo</h1>
          <p>Estamos preparando los productos del negocio.</p>
        </section>
      </main>
    );
  }

  if (catalogQuery.isError || !catalog) {
    return (
      <main className={styles.page}>
        <section className={styles.statePanel}>
          <PackageSearch aria-hidden="true" />
          <h1>Catálogo no disponible</h1>
          <p>
            El enlace no existe o el negocio todavía no tiene catálogo activo.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {catalog.settings.shoppingEnabled ? (
        <header className={styles.stickyCommerceBar}>
          <button
            className={styles.stickyBrand}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            type="button"
          >
            <span>
              {catalog.business.logoUrl ? (
                <img alt="" src={catalog.business.logoUrl} />
              ) : (
                <Store aria-hidden="true" />
              )}
            </span>
            <strong>{catalog.business.businessName}</strong>
          </button>
          <div className={styles.stickyActions}>
            {customerSession ? (
              <button
                className={styles.accountButton}
                onClick={() => setIsAccountOpen(true)}
                type="button"
              >
                <span>
                  {customerSession.customer.avatarUrl ? (
                    <img
                      alt=""
                      src={
                        resolveApiAssetUrl(
                          customerSession.customer.avatarUrl,
                        ) ?? undefined
                      }
                    />
                  ) : (
                    <UserRound aria-hidden="true" />
                  )}
                </span>
                <span>
                  <small>Mi cuenta</small>
                  {customerSession.customer.name.split(" ")[0]}
                </span>
              </button>
            ) : (
              <button
                className={styles.customerAccessButton}
                onClick={() => setIsCustomerAuthOpen(true)}
                type="button"
              >
                <UserRound aria-hidden="true" /> Ingresar
              </button>
            )}
            <button
              aria-label={`Abrir carrito con ${cartItemCount} productos`}
              className={styles.cartButton}
              onClick={() => setIsCartOpen(true)}
              type="button"
            >
              <ShoppingCart aria-hidden="true" />
              <span>Mi carrito</span>
              {cartItemCount > 0 ? <strong>{cartItemCount}</strong> : null}
            </button>
          </div>
        </header>
      ) : null}
      {pageNotice ? (
        <div className={styles.pageNotice} role="status">
          {pageNotice}
          <button
            aria-label="Cerrar aviso"
            onClick={() => setPageNotice(null)}
            type="button"
          >
            <X />
          </button>
        </div>
      ) : null}
      <section className={styles.hero}>
        <div
          className={`${styles.businessBlock} ${
            catalog.settings.shoppingEnabled ? "" : styles.businessBlockReadOnly
          }`}
        >
          <div className={styles.logoBox}>
            {catalog.business.logoUrl ? (
              <img
                alt={`Logo de ${catalog.business.businessName}`}
                src={catalog.business.logoUrl}
              />
            ) : (
              <Store aria-hidden="true" />
            )}
          </div>
          <div>
            <p className={styles.kicker}>Catálogo virtual</p>
            <h1>{catalog.business.businessName}</h1>
            {catalog.business.businessCategory ? (
              <p className={styles.categoryLabel}>
                {catalog.business.businessCategory}
              </p>
            ) : null}
          </div>
        </div>

        <div className={styles.infoGrid}>
          {catalog.business.address || catalog.business.city ? (
            <InfoChip
              icon={<MapPin aria-hidden="true" />}
              label={[catalog.business.address, catalog.business.city]
                .filter(Boolean)
                .join(", ")}
            />
          ) : null}
          {catalog.business.phone ? (
            <InfoChip
              href={`tel:${catalog.business.phone}`}
              icon={<Phone aria-hidden="true" />}
              label={catalog.business.phone}
            />
          ) : null}
          {catalog.business.email ? (
            <InfoChip
              href={`mailto:${catalog.business.email}`}
              icon={<Mail aria-hidden="true" />}
              label={catalog.business.email}
            />
          ) : null}
        </div>

        {catalog.settings.shoppingEnabled ? (
          <div className={styles.serviceGrid}>
            <ServicePill
              active={catalog.settings.pickupEnabled}
              icon={<ShoppingBag aria-hidden="true" />}
              label="Retiro en tienda"
            />
            <ServicePill
              active={catalog.settings.deliveryEnabled}
              icon={<Truck aria-hidden="true" />}
              label="Entrega a domicilio"
            />
          </div>
        ) : null}

        <section className={styles.hoursPanel}>
          <div className={styles.sectionTitle}>
            <Clock3 aria-hidden="true" />
            <h2>Horarios de atención</h2>
          </div>
          {groupedHours.length > 0 ? (
            <div className={styles.hoursGrid}>
              {groupedHours.map((businessHour) => (
                <span key={`${businessHour.firstDay}-${businessHour.lastDay}`}>
                  <strong>{businessHour.label}</strong>
                  <small>
                    {formatTime12Hour(businessHour.opensAt)} –{" "}
                    {formatTime12Hour(businessHour.closesAt)}
                  </small>
                </span>
              ))}
            </div>
          ) : (
            <p>Horarios por confirmar.</p>
          )}
        </section>
      </section>

      <section className={styles.catalogShell}>
        <div className={styles.toolbar}>
          <label className={styles.searchBox}>
            <Search aria-hidden="true" />
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar productos"
              type="search"
              value={searchTerm}
            />
          </label>
          <div className={styles.categoryFilters}>
            <button
              className={
                selectedCategoryId === allCategoriesId
                  ? styles.activeFilter
                  : ""
              }
              onClick={() => setSelectedCategoryId(allCategoriesId)}
              type="button"
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                className={
                  selectedCategoryId === category.id ? styles.activeFilter : ""
                }
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.name}
              </button>
            ))}
          </div>
          <div className={styles.mobileCategoryFilter}>
            <SearchableSelect
              aria-label="Filtrar productos por categoría"
              className={styles.mobileCategorySelect}
              emptyMessage="No hay categorías coincidentes"
              searchPlaceholder="Buscar categoría..."
              value={selectedCategoryId}
              onChange={(event) => setSelectedCategoryId(event.target.value)}
            >
              <option value={allCategoriesId}>Todos los productos</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SearchableSelect>
          </div>
        </div>

        {filteredProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                cartItem={cartItems.find(
                  (item) => item.productId === product.id,
                )}
                isFavorite={favoriteIds.has(Number(product.id))}
                key={product.id}
                onAdd={() =>
                  addItem(
                    catalogKey,
                    product,
                    resolveProductImageUrl(product.imageUrls),
                  )
                }
                onQuantityChange={(quantity) =>
                  setQuantity(catalogKey, product.id, quantity)
                }
                onToggleFavorite={() => {
                  if (!customerSession) {
                    setIsCustomerAuthOpen(true);
                    return;
                  }
                  const productId = Number(product.id);
                  const wasFavorite = favoriteIds.has(productId);
                  setFavoriteIds((current) => {
                    const next = new Set(current);
                    wasFavorite ? next.delete(productId) : next.add(productId);
                    return next;
                  });
                  void (
                    wasFavorite
                      ? removeCatalogCustomerFavorite
                      : addCatalogCustomerFavorite
                  )(catalogKey, customerSession.accessToken, productId).catch(
                    () => {
                      setFavoriteIds((current) => {
                        const next = new Set(current);
                        wasFavorite
                          ? next.add(productId)
                          : next.delete(productId);
                        return next;
                      });
                    },
                  );
                }}
                product={product}
                shoppingEnabled={catalog.settings.shoppingEnabled}
              />
            ))}
          </div>
        ) : (
          <section className={styles.statePanel}>
            <PackageSearch aria-hidden="true" />
            <h2>No hay productos para mostrar</h2>
            <p>Prueba con otra búsqueda o categoría.</p>
          </section>
        )}
      </section>

      {catalog.settings.shoppingEnabled && cartItemCount > 0 ? (
        <button
          className={styles.mobileCartBar}
          onClick={() => setIsCartOpen(true)}
          type="button"
        >
          <span>
            <ShoppingCart aria-hidden="true" />
            {cartItemCount} {cartItemCount === 1 ? "producto" : "productos"}
          </span>
          <strong>{currencyFormatter.format(cartSubtotal)}</strong>
        </button>
      ) : null}

      {catalog.settings.shoppingEnabled && isCartOpen ? (
        <CartDrawer
          itemCount={cartItemCount}
          items={cartItems}
          businessAddress={[catalog.business.address, catalog.business.city]
            .filter(Boolean)
            .join(", ")}
          checkout={checkout}
          deliveryEnabled={catalog.settings.deliveryEnabled}
          deliveryFee={catalog.settings.deliveryFee}
          fulfillmentNotice={fulfillmentNotice}
          isCreatingOrder={isCreatingOrder}
          isFulfillmentOpen={isFulfillmentOpen}
          onClear={() => clearCart(catalogKey)}
          onClose={() => setIsCartOpen(false)}
          onQuantityChange={(productId, quantity) =>
            setQuantity(catalogKey, productId, quantity)
          }
          onRemove={(productId) => removeItem(catalogKey, productId)}
          checkoutNotice={checkoutNotice}
          customerName={customerSession?.customer.name ?? null}
          onContinue={() => {
            setCheckoutNotice(null);
            if (!customerSession) {
              setIsCustomerAuthOpen(true);
              return;
            }
            setIsFulfillmentOpen(true);
          }}
          onContinueOrder={() => void handleCreateOrder()}
          onBackToCart={() => setIsFulfillmentOpen(false)}
          onUpdateCheckout={(patch) => {
            setFulfillmentNotice(null);
            updateCheckout(catalogKey, patch);
          }}
          pickupEnabled={catalog.settings.pickupEnabled}
          savedAddresses={savedAddresses}
          subtotal={cartSubtotal}
        />
      ) : null}

      {catalog.settings.shoppingEnabled && isCustomerAuthOpen ? (
        <CustomerAuthModal
          businessName={catalog.business.businessName}
          catalogSlug={catalogKey}
          onAuthenticated={(response) => {
            setCustomerSession(catalogKey, response);
            setIsCustomerAuthOpen(false);
            initializeCheckoutContact(catalogKey, {
              email: response.customer.email,
              name: response.customer.name,
            });
            setCheckoutNotice(null);
            setIsFulfillmentOpen(true);
          }}
          onClose={() => setIsCustomerAuthOpen(false)}
        />
      ) : null}

      {catalog.settings.shoppingEnabled && isOrdersOpen && customerSession ? (
        <CustomerOrdersModal
          accessToken={customerSession.accessToken}
          catalogSlug={catalogKey}
          initialOrder={createdOrder}
          onReorder={(order) => {
            const availableCount = order.items.filter((item) =>
              catalog.products.some(
                (product) =>
                  Number(product.id) === item.productId &&
                  product.isAvailable &&
                  product.stock > 0,
              ),
            ).length;
            replaceFromOrder(catalogKey, order.items, catalog.products);
            setCheckoutNotice(
              availableCount === order.items.length
                ? "Agregamos nuevamente los productos con sus precios actuales."
                : "Agregamos los productos disponibles; algunos ya no están en el catálogo.",
            );
            setCreatedOrder(null);
            setIsOrdersOpen(false);
            setIsFulfillmentOpen(false);
            setIsCartOpen(true);
          }}
          onClose={() => {
            setCreatedOrder(null);
            setIsOrdersOpen(false);
          }}
        />
      ) : null}

      {catalog.settings.shoppingEnabled && isAccountOpen && customerSession ? (
        <CustomerAccountModal
          accessToken={customerSession.accessToken}
          catalogSlug={catalogKey}
          customer={customerSession.customer}
          onClose={() => setIsAccountOpen(false)}
          onLogout={() => {
            clearCustomerSession(catalogKey);
            setIsAccountOpen(false);
          }}
          onOpenOrders={() => {
            setIsAccountOpen(false);
            setCreatedOrder(null);
            setIsOrdersOpen(true);
          }}
          onProfileUpdated={(patch) => updateCustomerSession(catalogKey, patch)}
          onShop={() => {
            setIsAccountOpen(false);
            document
              .querySelector(`.${styles.toolbar}`)
              ?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      ) : null}
    </main>
  );
}

function InfoChip({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
}) {
  const content = (
    <>
      {icon}
      <span>{label}</span>
    </>
  );

  return href ? (
    <a className={styles.infoChip} href={href}>
      {content}
    </a>
  ) : (
    <span className={styles.infoChip}>{content}</span>
  );
}

function ServicePill({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className={`${styles.servicePill} ${active ? styles.isActive : ""}`}>
      {icon}
      {label}
    </span>
  );
}

function ProductCard({
  cartItem,
  isFavorite,
  onAdd,
  onQuantityChange,
  onToggleFavorite,
  product,
  shoppingEnabled,
}: {
  cartItem?: PublicCartItem;
  isFavorite: boolean;
  onAdd: () => void;
  onQuantityChange: (quantity: number) => void;
  onToggleFavorite: () => void;
  product: PublicCatalogProduct;
  shoppingEnabled: boolean;
}) {
  const imageUrl = resolveProductImageUrl(product.imageUrls);

  return (
    <article
      className={`${styles.productCard} ${
        product.isAvailable ? "" : styles.unavailableCard
      }`}
    >
      {shoppingEnabled ? (
        <button
          aria-label={
            isFavorite
              ? `Quitar ${product.name} de favoritos`
              : `Guardar ${product.name} en favoritos`
          }
          className={`${styles.favoriteButton} ${
            isFavorite ? styles.favoriteActive : ""
          }`}
          onClick={onToggleFavorite}
          type="button"
        >
          <Heart aria-hidden="true" />
        </button>
      ) : null}
      <div className={styles.productImage}>
        {imageUrl ? (
          <img
            alt={product.name}
            decoding="async"
            loading="lazy"
            src={imageUrl}
          />
        ) : (
          <ShoppingBag aria-hidden="true" />
        )}
      </div>
      <div className={styles.productInfo}>
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
      </div>
      <div className={styles.productFooter}>
        <strong>{currencyFormatter.format(product.price)}</strong>
        <span
          className={
            product.isAvailable ? styles.stockPill : styles.unavailablePill
          }
        >
          {product.isAvailable
            ? `${product.stock} disponibles`
            : "No disponible"}
        </span>
      </div>
      {shoppingEnabled && product.isAvailable ? (
        cartItem ? (
          <QuantityControl
            label={`Cantidad de ${product.name}`}
            max={product.stock}
            onChange={onQuantityChange}
            quantity={cartItem.quantity}
          />
        ) : (
          <button className={styles.addButton} onClick={onAdd} type="button">
            <Plus aria-hidden="true" />
            Agregar
          </button>
        )
      ) : shoppingEnabled ? (
        <button className={styles.addButton} disabled type="button">
          No disponible
        </button>
      ) : null}
    </article>
  );
}

function QuantityControl({
  label,
  max,
  onChange,
  quantity,
}: {
  label: string;
  max: number;
  onChange: (quantity: number) => void;
  quantity: number;
}) {
  return (
    <div aria-label={label} className={styles.quantityControl} role="group">
      <button
        aria-label="Disminuir cantidad"
        onClick={() => onChange(quantity - 1)}
        type="button"
      >
        <Minus aria-hidden="true" />
      </button>
      <output aria-live="polite">{quantity}</output>
      <button
        aria-label="Aumentar cantidad"
        disabled={quantity >= max}
        onClick={() => onChange(quantity + 1)}
        type="button"
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

function CartDrawer({
  businessAddress,
  checkout,
  checkoutNotice,
  customerName,
  deliveryEnabled,
  deliveryFee,
  fulfillmentNotice,
  isCreatingOrder,
  isFulfillmentOpen,
  itemCount,
  items,
  onClear,
  onClose,
  onContinue,
  onContinueOrder,
  onBackToCart,
  onQuantityChange,
  onRemove,
  onUpdateCheckout,
  pickupEnabled,
  savedAddresses,
  subtotal,
}: {
  businessAddress: string;
  checkout: typeof emptyCatalogCheckout;
  checkoutNotice: string | null;
  customerName: string | null;
  deliveryEnabled: boolean;
  deliveryFee: number;
  fulfillmentNotice: string | null;
  isCreatingOrder: boolean;
  isFulfillmentOpen: boolean;
  itemCount: number;
  items: PublicCartItem[];
  onClear: () => void;
  onClose: () => void;
  onContinue: () => void;
  onContinueOrder: () => void;
  onBackToCart: () => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateCheckout: (patch: Partial<typeof emptyCatalogCheckout>) => void;
  pickupEnabled: boolean;
  savedAddresses: CatalogSavedAddress[];
  subtotal: number;
}) {
  return (
    <div className={styles.cartLayer}>
      <button
        aria-label="Cerrar carrito"
        className={styles.cartBackdrop}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Resumen de compra"
        aria-modal="true"
        className={`${styles.cartDrawer} ${
          isFulfillmentOpen ? styles.fulfillmentDrawer : ""
        }`}
        role="dialog"
      >
        <header className={styles.cartHeader}>
          <div>
            <p>Tu compra</p>
            <h2>Mi carrito</h2>
          </div>
          <button aria-label="Cerrar carrito" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </header>

        {items.length > 0 && !isFulfillmentOpen ? (
          <>
            <div className={styles.cartItems}>
              {items.map((item) => (
                <article className={styles.cartItem} key={item.productId}>
                  <div className={styles.cartItemImage}>
                    {item.imageUrl ? (
                      <img alt="" src={item.imageUrl} />
                    ) : (
                      <ShoppingBag aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.cartItemInfo}>
                    <h3>{item.name}</h3>
                    <span>{currencyFormatter.format(item.price)} c/u</span>
                    <QuantityControl
                      label={`Cantidad de ${item.name}`}
                      max={item.stock}
                      onChange={(quantity) =>
                        onQuantityChange(item.productId, quantity)
                      }
                      quantity={item.quantity}
                    />
                  </div>
                  <div className={styles.cartItemTotal}>
                    <button
                      aria-label={`Eliminar ${item.name}`}
                      onClick={() => onRemove(item.productId)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                    <strong>
                      {currencyFormatter.format(item.price * item.quantity)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>
            <button
              className={styles.clearButton}
              onClick={onClear}
              type="button"
            >
              Vaciar carrito
            </button>
          </>
        ) : items.length === 0 ? (
          <div className={styles.emptyCart}>
            <ShoppingCart aria-hidden="true" />
            <h3>Tu carrito está vacío</h3>
            <p>Agrega productos del catálogo para comenzar tu compra.</p>
            <button onClick={onClose} type="button">
              Ver productos
            </button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <footer className={styles.cartSummary}>
            {customerName ? (
              <div className={styles.customerReady}>
                <CircleCheck aria-hidden="true" />
                <span>
                  Compra como <strong>{customerName}</strong>
                </span>
              </div>
            ) : null}
            {isFulfillmentOpen && customerName ? (
              <CheckoutDeliveryPanel
                businessAddress={businessAddress}
                checkout={checkout}
                deliveryEnabled={deliveryEnabled}
                deliveryFee={deliveryFee}
                isSubmitting={isCreatingOrder}
                notice={fulfillmentNotice}
                onBack={onBackToCart}
                onContinue={onContinueOrder}
                onUpdate={onUpdateCheckout}
                pickupEnabled={pickupEnabled}
                savedAddresses={savedAddresses}
                subtotal={subtotal}
              />
            ) : (
              <>
                <div className={styles.summaryTotalRow}>
                  <span>
                    Subtotal ({itemCount}{" "}
                    {itemCount === 1 ? "producto" : "productos"})
                  </span>
                  <strong>{currencyFormatter.format(subtotal)}</strong>
                </div>
                <small>
                  Los costos de entrega se calcularán en el siguiente paso.
                </small>
                {checkoutNotice ? (
                  <p className={styles.checkoutNotice} role="status">
                    {checkoutNotice}
                  </p>
                ) : null}
                <button onClick={onContinue} type="button">
                  {customerName
                    ? "Continuar con la entrega"
                    : "Ingresar para continuar"}
                  <ChevronRight aria-hidden="true" />
                </button>
                {!customerName ? (
                  <p>Inicia sesión o crea tu cuenta sin perder el carrito.</p>
                ) : null}
              </>
            )}
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function buildVisibleCategories(
  categories: PublicCatalogCategory[],
  products: PublicCatalogProduct[],
) {
  const usedCategoryIds = new Set(
    products
      .map((product) => product.categoryId)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  );

  return categories.filter((category) => usedCategoryIds.has(category.id));
}

function filterProducts(
  products: PublicCatalogProduct[],
  categories: PublicCatalogCategory[],
  selectedCategoryId: string,
  searchTerm: string,
) {
  const normalizedSearchTerm = normalizeSearchValue(searchTerm);
  const categoryById = new Map(
    categories.map((category) => [category.id, category.name]),
  );

  return products.filter((product) => {
    const matchesCategory =
      selectedCategoryId === allCategoriesId ||
      product.categoryId === selectedCategoryId;
    const searchableText = normalizeSearchValue(
      [
        product.name,
        product.description,
        product.sku,
        product.barcode,
        product.categoryId ? categoryById.get(product.categoryId) : "",
      ]
        .filter(Boolean)
        .join(" "),
    );

    return (
      matchesCategory &&
      (!normalizedSearchTerm || searchableText.includes(normalizedSearchTerm))
    );
  });
}

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function groupBusinessHours(
  businessHours: CatalogBusinessHour[] | null | undefined,
) {
  const businessHoursByDay = new Map(
    (businessHours ?? []).map((businessHour) => [
      businessHour.day,
      businessHour,
    ]),
  );
  const groups: Array<{
    closesAt: string;
    firstDay: CatalogBusinessHour["day"];
    label: string;
    lastDay: CatalogBusinessHour["day"];
    opensAt: string;
  }> = [];

  catalogWeekdayIds.forEach((day, dayIndex) => {
    const businessHour = businessHoursByDay.get(day);
    if (!businessHour?.enabled) {
      return;
    }

    const previousGroup = groups[groups.length - 1];
    const previousDayIndex = previousGroup
      ? catalogWeekdayIds.indexOf(previousGroup.lastDay)
      : -1;
    const canJoinPreviousGroup =
      previousGroup &&
      previousDayIndex === dayIndex - 1 &&
      previousGroup.opensAt === businessHour.opensAt &&
      previousGroup.closesAt === businessHour.closesAt;

    if (canJoinPreviousGroup) {
      previousGroup.lastDay = day;
      previousGroup.label = `${weekdayLabels[previousGroup.firstDay]} a ${weekdayLabels[
        day
      ].toLocaleLowerCase("es")}`;
      return;
    }

    groups.push({
      closesAt: businessHour.closesAt,
      firstDay: day,
      label: weekdayLabels[day],
      lastDay: day,
      opensAt: businessHour.opensAt,
    });
  });

  return groups;
}
