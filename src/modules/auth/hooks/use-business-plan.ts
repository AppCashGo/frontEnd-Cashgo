import { useQuery } from "@tanstack/react-query";
import { getJson } from "@/shared/services/api-client";
import { getAuthAccessToken } from "@/shared/services/auth-session";
import { useAuthSessionStore } from "./use-auth-session-store";
import type { PlanModule } from "@/modules/platform-admin/platform-admin-api";

type BusinessPlan = {
  blocked: "suspended" | "expired" | null;
  modules: PlanModule[];
};

export function useBusinessPlan() {
  const user = useAuthSessionStore((state) => state.user);
  return useQuery({
    queryKey: ["business-plan", user?.id, user?.businessId],
    queryFn: () => getJson<{ plan: BusinessPlan | null }>("/auth/business-plan", {
      accessToken: getAuthAccessToken(),
    }),
    enabled: Boolean(user),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });
}
