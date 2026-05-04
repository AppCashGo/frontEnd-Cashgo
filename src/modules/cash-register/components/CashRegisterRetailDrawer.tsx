import type { ReactNode } from "react";
import { SideDrawer } from "@/shared/components/ui/SideDrawer";

type CashRegisterRetailDrawerProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  footer?: ReactNode;
  onClose: () => void;
  children: ReactNode;
};

export function CashRegisterRetailDrawer({
  isOpen,
  title,
  description,
  footer,
  onClose,
  children,
}: CashRegisterRetailDrawerProps) {
  return (
    <SideDrawer
      closeLabel="Cerrar"
      description={description}
      footer={footer}
      isOpen={isOpen}
      title={title}
      onClose={onClose}
    >
      {children}
    </SideDrawer>
  );
}
