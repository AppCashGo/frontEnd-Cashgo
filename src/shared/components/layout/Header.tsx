import { LanguageSelect } from "@/shared/components/ui/LanguageSelect";
import { AppIcon } from "@/shared/components/icons/AppIcon";
import { useAppUiStore } from "@/shared/hooks/use-app-ui-store";
import { useTranslationsQuery } from "@/shared/hooks/use-translations-query";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import styles from "./Header.module.css";

export function Header() {
  const { dictionary, translationId, setLanguagePreference } =
    useAppTranslation();
  const { data: translations = [] } = useTranslationsQuery();
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
      <div className={styles.toolbar}>
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
          className={styles.desktopSidebarButton}
          type="button"
          onClick={toggleSidebarCollapse}
        >
          <AppIcon
            className={styles.sidebarToggleIcon}
            name={isSidebarCollapsed ? "panelOpen" : "panelClose"}
          />
          <span>{sidebarToggleLabel}</span>
        </button>

        {translations.length > 0 ? (
          <div className={styles.toolbarUtilities}>
            <div className={styles.languageField}>
              <LanguageSelect
                id="header-language"
                label={dictionary.layout.header.interfaceLanguage}
                options={translations}
                value={translationId}
                onChange={(translation) =>
                  setLanguagePreference({
                    code: translation.code,
                    translationId: translation.id,
                  })
                }
              />
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
