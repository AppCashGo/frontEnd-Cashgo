import {
  Clock3,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { resolveProductImageUrl } from "@/modules/products/utils/resolve-product-image-url";
import { usePublicCatalogQuery } from "../hooks/use-public-catalog-query";
import type {
  PublicCatalogCategory,
  PublicCatalogProduct,
} from "../types/public-catalog";
import styles from "./PublicCatalogPage.module.css";

const allCategoriesId = "all";

const weekdayLabels = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
} as const;

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  currency: "COP",
  maximumFractionDigits: 0,
  style: "currency",
});

export function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const normalizedSlug = slug?.trim() ?? null;
  const catalogQuery = usePublicCatalogQuery(normalizedSlug);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState(allCategoriesId);

  const catalog = catalogQuery.data;
  const categories = useMemo(
    () =>
      buildVisibleCategories(catalog?.categories ?? [], catalog?.products ?? []),
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
  const enabledHours = useMemo(
    () =>
      catalog?.settings.businessHours
        ?.filter((businessHour) => businessHour.enabled)
        .map((businessHour) => ({
          ...businessHour,
          label: weekdayLabels[businessHour.day],
        })) ?? [],
    [catalog?.settings.businessHours],
  );

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
          <p>El enlace no existe o el negocio todavía no tiene catálogo activo.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.businessBlock}>
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

        <section className={styles.hoursPanel}>
          <div className={styles.sectionTitle}>
            <Clock3 aria-hidden="true" />
            <h2>Horarios de atención</h2>
          </div>
          {enabledHours.length > 0 ? (
            <div className={styles.hoursGrid}>
              {enabledHours.map((businessHour) => (
                <span key={businessHour.day}>
                  <strong>{businessHour.label}</strong>
                  {businessHour.opensAt} - {businessHour.closesAt}
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
                selectedCategoryId === allCategoriesId ? styles.activeFilter : ""
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
        </div>

        {filteredProducts.length > 0 ? (
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
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

function ProductCard({ product }: { product: PublicCatalogProduct }) {
  const imageUrl = resolveProductImageUrl(product.imageUrls);

  return (
    <article
      className={`${styles.productCard} ${
        product.isAvailable ? "" : styles.unavailableCard
      }`}
    >
      <div className={styles.productImage}>
        {imageUrl ? (
          <img alt={product.name} src={imageUrl} />
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
    </article>
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
