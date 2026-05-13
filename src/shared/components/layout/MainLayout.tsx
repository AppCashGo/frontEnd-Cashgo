import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/shared/components/layout/Header";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { useBusinessNavigationPreset } from "@/shared/hooks/use-business-navigation-preset";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { useAppUiStore } from "@/shared/hooks/use-app-ui-store";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const location = useLocation();
  const { languageCode } = useAppTranslation();
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
          className={joinClassNames(
            styles.main,
            isRetailPreset && styles.mainRetail,
          )}
        >
          <div
            className={joinClassNames(
              styles.mainInner,
              isRetailPreset && styles.mainInnerRetail,
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
