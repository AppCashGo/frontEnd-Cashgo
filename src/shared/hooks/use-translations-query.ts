import { useQuery } from "@tanstack/react-query";
import { getTranslations } from "@/shared/services/translations-api";

export function useTranslationsQuery(activeOnly = true) {
  return useQuery({
    queryKey: ["translations", activeOnly],
    queryFn: () => getTranslations(activeOnly),
    staleTime: 1000 * 60 * 10,
  });
}
