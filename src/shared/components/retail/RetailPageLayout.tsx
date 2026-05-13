import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./RetailPageLayout.module.css";

type RetailPageLayoutProps = {
  title: ReactNode;
  actions?: ReactNode;
  bodyVariant?: "padded" | "flush";
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  accent?: "default" | "success";
};

export function RetailPageLayout({
  accent = "default",
  actions,
  bodyClassName,
  bodyVariant = "padded",
  children,
  className,
  footer,
  headerClassName,
  meta,
  title,
}: RetailPageLayoutProps) {
  return (
    <section className={joinClassNames(styles.page, className)}>
      <header
        className={joinClassNames(
          styles.header,
          accent === "success" && styles.headerSuccess,
          headerClassName,
        )}
      >
        <div className={styles.headerLead}>
          <h1 className={styles.title}>{title}</h1>
          {meta ? <div className={styles.meta}>{meta}</div> : null}
        </div>

        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>

      <main
        className={joinClassNames(
          styles.body,
          bodyVariant === "flush" && styles.bodyFlush,
          bodyClassName,
        )}
      >
        {children}
      </main>

      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}
