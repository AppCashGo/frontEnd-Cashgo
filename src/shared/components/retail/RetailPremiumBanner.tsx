import styles from "./RetailUI.module.css";

type RetailPremiumBannerProps = {
  title: string;
  description: string;
  linkLabel?: string;
};

export function RetailPremiumBanner({
  title,
  description,
  linkLabel,
}: RetailPremiumBannerProps) {
  return (
    <section className={styles.premiumBanner}>
      <p className={styles.premiumTitle}>{title}</p>
      <p className={styles.premiumDescription}>{description}</p>
      {linkLabel ? <span className={styles.premiumLink}>{linkLabel}</span> : null}
    </section>
  );
}
