import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthSessionStore } from "@/modules/auth/hooks/use-auth-session-store";
import { useBusinessPlan } from "@/modules/auth/hooks/use-business-plan";
import {
  getActiveBusinessCategory,
  getActiveBusinessRole,
} from "@/modules/auth/utils/get-active-business";
import {
  getModuleLandingPath,
  getModuleNavigationRoutes,
} from "@/routes/module-navigation-routes";
import { Header } from "@/shared/components/layout/Header";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { ExperienceCenter } from "@/shared/components/experience/ExperienceCenter";
import { OfflineSalesSyncManager } from "@/modules/sales/components/OfflineSalesSyncManager";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { useAppUiStore } from "@/shared/hooks/use-app-ui-store";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const location = useLocation();
  const { languageCode } = useAppTranslation();
  const user = useAuthSessionStore((state) => state.user);
  const plan = useBusinessPlan().data?.plan;
  const activeBusinessCategory = getActiveBusinessCategory(user);
  const activeBusinessRole = getActiveBusinessRole(user);
  const navigationPreset = useBusinessNavigationPreset();
  const isRetailPreset = navigationPreset === "retail";
  const {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    closeMobileSidebar,
  } = useAppUiStore();

  useEffect(() => {
    closeMobileSidebar();
  }, [closeMobileSidebar, location.pathname]);

  useEffect(() => {
    document.documentElement.lang = languageCode;
  }, [languageCode]);

  const currentModule = getModuleNavigationRoutes(
    languageCode,
    activeBusinessCategory,
    activeBusinessRole,
  ).find(
    (route) =>
      location.pathname === route.path ||
      location.pathname.startsWith(`${route.path}/`),
  );

  if (activeBusinessRole && currentModule && !currentModule.isVisible) {
    return (
      <Navigate
        replace
        to={getModuleLandingPath(
          languageCode,
          activeBusinessCategory,
          activeBusinessRole,
        )}
      />
    );
  }

  const moduleAllowed = !plan || !currentModule ||
    !["billing", "quotes", "reports", "deliveries"].includes(currentModule.segment) ||
    plan.modules.some((module) => module === currentModule.segment);

  return (
    <div
      className={joinClassNames(
        styles.shell,
        isRetailPreset && styles.shellRetail,
        isSidebarCollapsed && styles.shellCollapsed,
      )}
    >
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      <button
        aria-label="Close navigation"
        className={joinClassNames(
          styles.backdrop,
          isMobileSidebarOpen && styles.backdropVisible,
        )}
        type="button"
        onClick={closeMobileSidebar}
      />

      <div
        className={joinClassNames(
          styles.content,
          isRetailPreset && styles.contentRetail,
        )}
      >
        <Header />

        <main
          className={styles.main}
        >
          <div
            className={joinClassNames(
              styles.mainInner,
              isRetailPreset && styles.mainInnerRetail,
            )}
          >
            {plan?.blocked ? (
              <section role="status">
                <h1>{plan.blocked === "suspended" ? "Empresa suspendida" : "Plan vencido"}</h1>
                <p>Contacta a administración de CashGo para reactivar el acceso a esta empresa.</p>
              </section>
            ) : moduleAllowed ? <Outlet /> : (
              <section role="status">
                <h1>Módulo fuera del plan</h1>
                <p>Contacta a administración de CashGo para habilitarlo.</p>
              </section>
            )}
          </div>
        </main>
      </div>

      {!plan?.blocked ? <ExperienceCenter assistantEnabled={!plan || plan.modules.includes("assistant")} /> : null}
      {!plan?.blocked ? <OfflineSalesSyncManager /> : null}
    </div>
  );
}
