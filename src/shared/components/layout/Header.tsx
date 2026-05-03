import { LanguageSelect } from "@/shared/components/ui/LanguageSelect";
import { useTranslationsQuery } from "@/shared/hooks/use-translations-query";
import { useAppTranslation } from "@/shared/i18n/use-app-translation";
import styles from "./Header.module.css";

export function Header() {
  const { dictionary, translationId, setLanguagePreference } =
    useAppTranslation();
  const { data: translations = [] } = useTranslationsQuery();

  return (
    <header className={styles.header}>
      <div className={styles.toolbar}>
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
