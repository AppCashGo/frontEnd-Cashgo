import { X } from "lucide-react";
import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import { SideDrawer } from "./SideDrawer";
import styles from "./AppDrawer.module.css";

export type AppDrawerSize = "sm" | "md" | "lg" | "xl" | "full";

export type AppDrawerProps = {
  ariaLabel?: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeButtonClassName?: string;
  closeButtonPlacement?: "start" | "end";
  closeContent?: ReactNode;
  closeLabel?: string;
  description?: string;
  footer?: ReactNode;
  footerClassName?: string;
  isOpen: boolean;
  panelClassName?: string;
  size?: AppDrawerSize;
  title: string;
  titleAccessory?: ReactNode;
  onClose: () => void;
};

export function AppDrawer({
  bodyClassName,
  closeContent,
  panelClassName,
  size = "md",
  ...props
}: AppDrawerProps) {
  return (
    <SideDrawer
      bodyClassName={joinClassNames(styles.body, bodyClassName)}
      closeContent={closeContent ?? <X aria-hidden="true" className={styles.closeIcon} />}
      panelClassName={joinClassNames(styles.panel, styles[size], panelClassName)}
      {...props}
    />
  );
}
