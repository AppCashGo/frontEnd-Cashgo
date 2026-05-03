import { getJson } from "@/shared/services/api-client";
import type { TranslationRecord } from "@/shared/types/translation";
import { normalizeId } from "@/shared/utils/normalize-id";

type ApiTranslationRecord = Omit<TranslationRecord, "id"> & {
  id: number | string;
};

function normalizeTranslationRecord(
  record: ApiTranslationRecord,
): TranslationRecord {
  return {
    ...record,
    id: normalizeId(record.id),
  };
}

export async function getTranslations(activeOnly = true) {
  const translations = await getJson<ApiTranslationRecord[]>(
    `/translations?activeOnly=${activeOnly ? "true" : "false"}`,
  );

  return translations.map(normalizeTranslationRecord);
}
