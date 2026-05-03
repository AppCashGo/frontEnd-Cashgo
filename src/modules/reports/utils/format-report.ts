import type {
  SalesDetailGranularity,
} from '@/modules/reports/types/report'
import type { AppLanguageCode } from '@/shared/i18n/app-dictionary'

function getLocale(languageCode: AppLanguageCode) {
  return languageCode === 'en' ? 'en-US' : 'es-CO'
}

export function formatReportCurrency(
  value: number,
  languageCode: AppLanguageCode,
) {
  return new Intl.NumberFormat(getLocale(languageCode), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatReportBucketLabel(
  bucketStart: string,
  granularity: SalesDetailGranularity,
  languageCode: AppLanguageCode,
) {
  const value = new Date(bucketStart)

  return new Intl.DateTimeFormat(getLocale(languageCode), {
    ...(granularity === 'HOUR'
      ? {
          hour: 'numeric',
          minute: '2-digit',
        }
      : {
          day: 'numeric',
          month: 'short',
        }),
  }).format(value)
}
