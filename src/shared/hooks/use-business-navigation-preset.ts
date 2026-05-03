import { getActiveBusinessCategory } from "@/modules/auth/utils/get-active-business";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { getBusinessNavigationPreset } from "@/shared/constants/business-categories";

export function useBusinessNavigationPreset() {
  const businessCategory = useAuthSessionStore((state) =>
    getActiveBusinessCategory(state.user),
  );

  return getBusinessNavigationPreset(businessCategory);
}
