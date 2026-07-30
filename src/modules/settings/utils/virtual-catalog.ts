export const catalogBaseUrl = "https://catalogo.cashgo.co";

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

export function buildCatalogUrl(slug: string) {
  return `${catalogBaseUrl}/${slug}`;
}

export function extractCatalogSlug(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const firstPathSegment = parsedUrl.pathname
      .split("/")
      .map((segment) => segment.trim())
      .find(Boolean);

    return normalizeCatalogSlug(firstPathSegment ?? "");
  } catch {
    return normalizeCatalogSlug(trimmedValue.replace(catalogBaseUrl, ""));
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
