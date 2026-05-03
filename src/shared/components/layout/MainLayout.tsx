import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/shared/components/layout/Header";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { useAppUiStore } from "@/shared/hooks/use-app-ui-store";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const location = useLocation();
  const { languageCode } = useAppTranslation();
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

      <div className={styles.content}>
        <Header />

        <main className={styles.main}>
          <div className={styles.mainInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
