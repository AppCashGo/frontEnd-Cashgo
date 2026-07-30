import { useQuery } from "@tanstack/react-query";
import { getPublicCatalog } from "../services/public-catalog-api";

export const publicCatalogQueryKey = ["public-catalog"] as const;

export function usePublicCatalogQuery(slug: string | null) {
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getPublicCatalog(slug ?? ""),
    queryKey: [...publicCatalogQueryKey, slug],
    retry: false,
  });
}
