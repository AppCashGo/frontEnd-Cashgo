import { Navigate, Outlet } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import {
  getActiveBusinessCategory,
  getActiveBusinessRole,
} from "@/modules/auth/utils/get-active-business";
import { getModuleLandingPath } from "@/routes/module-navigation-routes";
import { useLanguageStore } from "@/shared/i18n/use-language-store";

export function PublicOnlyRoute() {
  const accessToken = useAuthSessionStore((state) => state.accessToken);
  const user = useAuthSessionStore((state) => state.user);
  const languageCode = useLanguageStore((state) => state.code);

  if (accessToken && user) {
    return (
      <Navigate
        replace
        to={getModuleLandingPath(
          languageCode,
          getActiveBusinessCategory(user),
          getActiveBusinessRole(user),
        )}
      />
    );
  }

  return <Outlet />;
}
