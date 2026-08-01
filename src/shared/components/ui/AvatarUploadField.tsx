import type { ReactNode } from "react";
import { Upload } from "lucide-react";
import { IMAGE_UPLOAD_ACCEPT } from "@/shared/utils/image-upload-validation";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./AvatarUploadField.module.css";

type AvatarUploadFieldVariant = "circle" | "card";

type AvatarUploadFieldProps = {
  alt: string;
  changeLabel?: string;
  className?: string;
  disabled?: boolean;
  hint?: string;
  imageUrl?: string | null;
  placeholderIcon?: ReactNode;
  trailingIcon?: ReactNode;
  uploadLabel?: string;
  variant?: AvatarUploadFieldVariant;
  onSelectFile: (file: File | null) => void;
};

export function AvatarUploadField({
  alt,
  changeLabel = "Cambiar avatar",
  className,
  disabled = false,
  hint,
  imageUrl = null,
  placeholderIcon,
  trailingIcon,
  uploadLabel = "Cargar avatar",
  variant = "circle",
  onSelectFile,
}: AvatarUploadFieldProps) {
  const hasImage = Boolean(imageUrl);
  const label = hasImage ? changeLabel : uploadLabel;

  return (
    <label
      className={joinClassNames(
        styles.root,
        styles[variant],
        disabled && styles.disabled,
        className,
      )}
    >
      <input
        accept={IMAGE_UPLOAD_ACCEPT}
        className={styles.input}
        disabled={disabled}
        type="file"
        onChange={(event) => {
          onSelectFile(event.target.files?.[0] ?? null);
          event.currentTarget.value = "";
        }}
      />

      <span className={styles.media}>
        {hasImage ? (
          <img alt={alt} className={styles.preview} src={imageUrl ?? ""} />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            {placeholderIcon ?? <Upload />}
          </span>
        )}
      </span>

      {variant === "card" ? (
        <span className={styles.copy}>
          <strong>{label}</strong>
          {hint ? <small>{hint}</small> : null}
        </span>
      ) : (
        <span className={styles.label}>{label}</span>
      )}

      {trailingIcon ? (
        <span className={styles.trailingIcon} aria-hidden="true">
          {trailingIcon}
        </span>
      ) : null}
    </label>
  );
}
