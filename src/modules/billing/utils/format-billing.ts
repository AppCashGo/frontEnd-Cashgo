import type { AppLanguageCode } from "@/shared/i18n/app-dictionary";

function getLocale(languageCode: AppLanguageCode) {
  return languageCode === "en" ? "en-US" : "es-CO";
}

export function formatBillingCurrency(
  value: number,
  languageCode: AppLanguageCode,
) {
  return new Intl.NumberFormat(getLocale(languageCode), {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBillingDate(
  value: string | Date,
  languageCode: AppLanguageCode,
) {
  return new Intl.DateTimeFormat(getLocale(languageCode), {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function formatBillingDateTime(
  value: string | Date,
  languageCode: AppLanguageCode,
) {
  return new Intl.DateTimeFormat(getLocale(languageCode), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
