import type { TranslationRecord } from "@/shared/types/translation";
import styles from "./LanguageSelect.module.css";

type LanguageSelectProps = {
  id: string;
  label: string;
  options: TranslationRecord[];
  value: string | null;
  onChange: (translation: TranslationRecord) => void;
};

export function LanguageSelect({
  id,
  label,
  options,
  value,
  onChange,
}: LanguageSelectProps) {
  return (
    <label className={styles.field} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <select
        className={styles.select}
        id={id}
        value={value ?? ""}
        onChange={(event) => {
          const nextTranslation = options.find(
            (option) => option.id === event.target.value,
          );

          if (nextTranslation) {
            onChange(nextTranslation);
          }
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
