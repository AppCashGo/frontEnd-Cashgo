import type { ReactNode } from "react";
import { SideDrawer } from "@/shared/components/ui/SideDrawer";

type CashRegisterRetailDrawerProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  panelClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  onClose: () => void;
  children: ReactNode;
};

export function CashRegisterRetailDrawer({
  isOpen,
  title,
  description,
  footer,
  className,
  panelClassName,
  bodyClassName,
  footerClassName,
  onClose,
  children,
}: CashRegisterRetailDrawerProps) {
  return (
    <SideDrawer
      closeLabel="Cerrar"
      bodyClassName={bodyClassName}
      className={className}
      description={description}
      footer={footer}
      footerClassName={footerClassName}
      isOpen={isOpen}
      panelClassName={panelClassName}
      title={title}
      onClose={onClose}
    >
      {children}
    </SideDrawer>
  );
}
