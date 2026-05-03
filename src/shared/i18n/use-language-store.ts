import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

function toSafeLanguageCode(value?: string | null): AppLanguageCode {
  return value === "en" ? "en" : "es";
}

type LanguageStoreState = {
  code: AppLanguageCode;
  translationId: string | null;
  setLanguagePreference: (input: {
    code?: string | null;
    translationId?: string | null;
  }) => void;
};

export const useLanguageStore = create<LanguageStoreState>()(
  persist(
    (set) => ({
      code: "es",
      translationId: "translation_es",
      setLanguagePreference: ({ code, translationId }) =>
        set((state) => ({
          code: toSafeLanguageCode(code ?? state.code),
          translationId: translationId ?? state.translationId,
        })),
    }),
    {
      name: "cashgo-language",
    },
  ),
);
