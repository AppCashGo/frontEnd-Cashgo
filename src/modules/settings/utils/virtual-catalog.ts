export const catalogBaseUrl = "https://catalogo.cashgo.co";
export const catalogRouteSegment = "catalogo";

export type CatalogIdentity = {
  businessName?: string | null;
  businessId?: string | number | null;
  catalogSlug?: string | null;
};

export function normalizeCatalogSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function buildDefaultCatalogSlug(identity: CatalogIdentity) {
  const baseName = normalizeCatalogSlug(identity.businessName ?? "");
  const suffix = identity.businessId ? `-${String(identity.businessId)}` : "";

  return `${baseName || "catalogo"}${suffix}`;
}

export function getCatalogBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_PUBLIC_CATALOG_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return trimTrailingSlashes(configuredBaseUrl);
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}/${catalogRouteSegment}`;
  }

  return catalogBaseUrl;
}

export function buildCatalogUrl(slug: string) {
  return `${getCatalogBaseUrl()}/${normalizeCatalogSlug(slug)}`;
}

export function extractCatalogSlug(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const pathSegments = parsedUrl.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    const catalogSegmentIndex = pathSegments.findIndex(
      (segment) => normalizeCatalogSlug(segment) === catalogRouteSegment,
    );
    const slugSegment =
      catalogSegmentIndex >= 0
        ? pathSegments[catalogSegmentIndex + 1]
        : pathSegments[pathSegments.length - 1];

    return normalizeCatalogSlug(slugSegment ?? "");
  } catch {
    const knownBaseUrls = [getCatalogBaseUrl(), catalogBaseUrl];
    const valueWithoutBaseUrl = knownBaseUrls.reduce(
      (currentValue, baseUrl) => currentValue.replace(baseUrl, ""),
      trimmedValue,
    );

    return normalizeCatalogSlug(
      valueWithoutBaseUrl.replace(`/${catalogRouteSegment}/`, ""),
    );
  }
}

export function buildConfiguredCatalogUrl(identity: CatalogIdentity) {
  const slug =
    identity.catalogSlug ??
    buildDefaultCatalogSlug({
      businessName: identity.businessName,
      businessId: identity.businessId,
    });

  return buildCatalogUrl(slug);
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/g, "");
}
