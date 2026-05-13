import { AppIcon } from "@/shared/components/icons/AppIcon";
import { useAppUiStore } from "@/shared/hooks/use-app-ui-store";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./Header.module.css";

export function Header() {
  const { dictionary } = useAppTranslation();
  const {
    isMobileSidebarOpen,
    isSidebarCollapsed,
    toggleMobileSidebar,
    toggleSidebarCollapse,
  } = useAppUiStore();
  const sidebarToggleLabel = isSidebarCollapsed
    ? dictionary.layout.header.expandSidebar
    : dictionary.layout.header.collapseSidebar;

  return (
    <header className={styles.header}>
      <button
        aria-controls="app-sidebar"
        aria-expanded={isMobileSidebarOpen}
        aria-label={dictionary.layout.header.menu}
        className={styles.mobileMenuButton}
        type="button"
        onClick={toggleMobileSidebar}
      >
        <AppIcon className={styles.mobileMenuIcon} name="menu" />
        <span>{dictionary.layout.header.menu}</span>
      </button>

      <button
        aria-controls="app-sidebar"
        aria-expanded={!isSidebarCollapsed}
        aria-label={sidebarToggleLabel}
        className={joinClassNames(
          styles.desktopSidebarButton,
          !isSidebarCollapsed && styles.desktopSidebarButtonExpanded,
        )}
        type="button"
        onClick={toggleSidebarCollapse}
      >
        <AppIcon
          className={styles.sidebarToggleIcon}
          name={isSidebarCollapsed ? "panelOpen" : "panelClose"}
        />
      </button>
    </header>
  );
}
