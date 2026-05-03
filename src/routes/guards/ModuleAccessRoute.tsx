import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import {
  getActiveBusinessCategory,
  getActiveBusinessRole,
} from "@/modules/auth/utils/get-active-business";
import {
  getModuleLandingPath,
  getModuleNavigationRoutes,
} from "@/routes/module-navigation-routes";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

type ModuleAccessRouteProps = {
  children: ReactNode;
  languageCode?: AppLanguageCode;
  segment: string;
};

export function ModuleAccessRoute({
  children,
  languageCode = "es",
  segment,
}: ModuleAccessRouteProps) {
  const user = useAuthSessionStore((state) => state.user);

  if (!user) {
    return <>{children}</>;
  }

  const businessCategory = getActiveBusinessCategory(user);
  const role = getActiveBusinessRole(user);
  const routes = getModuleNavigationRoutes(
    languageCode,
    businessCategory,
    role,
  );
  const route = routes.find((currentRoute) => currentRoute.segment === segment);

  if (!route?.isVisible) {
    return (
      <Navigate
        replace
        to={getModuleLandingPath(languageCode, businessCategory, role)}
      />
    );
  }

  return <>{children}</>;
}

export function WorkspaceLandingRoute({
  languageCode = "es",
}: Pick<ModuleAccessRouteProps, "languageCode">) {
  const user = useAuthSessionStore((state) => state.user);

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
