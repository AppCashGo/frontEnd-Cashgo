import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./DrawerActionFooter.module.css";

type DrawerActionFooterLayout = "grid" | "inline" | "stack";

type DrawerActionFooterProps = {
  children: ReactNode;
  className?: string;
  layout?: DrawerActionFooterLayout;
};

export function DrawerActionFooter({
  children,
  className,
  layout = "grid",
}: DrawerActionFooterProps) {
  return (
    <div className={joinClassNames(styles.footer, styles[layout], className)}>
      {children}
    </div>
  );
}
