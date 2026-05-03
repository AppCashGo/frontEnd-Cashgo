import { appDictionary } from "@/shared/i18n/app-dictionary";
import { useLanguageStore } from "@/shared/i18n/use-language-store";

export function useAppTranslation() {
  const code = useLanguageStore((state) => state.code);
  const translationId = useLanguageStore((state) => state.translationId);
  const setLanguagePreference = useLanguageStore(
    (state) => state.setLanguagePreference,
  );

  return {
    languageCode: code,
    translationId,
    dictionary: appDictionary[code],
    setLanguagePreference,
  };
}
