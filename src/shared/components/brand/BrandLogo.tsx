import cashgoSymbolUrl from "@/shared/assets/brand/cashgo-symbol.svg";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./BrandLogo.module.css";

type BrandLogoProps = {
  brand?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  tagline?: string;
  variant?: "default" | "mark";
  version?: string;
};

export function BrandLogo({
  brand = "Cashgo",
  className,
  size = "md",
  tagline,
  variant = "default",
  version,
}: BrandLogoProps) {
  const isMarkOnly = variant === "mark";

  return (
    <div
      aria-label={brand}
      className={joinClassNames(
        styles.logo,
        styles[size],
        isMarkOnly && styles.markOnly,
        className,
      )}
    >
      <img alt="" className={styles.mark} src={cashgoSymbolUrl} />

      {!isMarkOnly ? (
        <span className={styles.copy}>
          <span className={styles.wordmarkRow}>
            <span className={styles.wordmark}>{brand}</span>
            {version ? <span className={styles.version}>{version}</span> : null}
          </span>
          {tagline ? <span className={styles.tagline}>{tagline}</span> : null}
        </span>
      ) : null}
    </div>
  );
}
