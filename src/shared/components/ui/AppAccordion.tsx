import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./AppAccordion.module.css";

export type AppAccordionItem = {
  action?: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
  description?: ReactNode;
  disabled?: boolean;
  icon?: ReactNode;
  id: string;
  title: ReactNode;
};

export type AppAccordionProps = {
  allowMultiple?: boolean;
  className?: string;
  defaultOpenIds?: string[];
  itemClassName?: string;
  items: AppAccordionItem[];
  openIds?: string[];
  panelClassName?: string;
  onOpenChange?: (openIds: string[]) => void;
};

export function AppAccordion({
  allowMultiple = true,
  className,
  defaultOpenIds,
  itemClassName,
  items,
  openIds,
  panelClassName,
  onOpenChange,
}: AppAccordionProps) {
  const [internalOpenIds, setInternalOpenIds] = useState<string[]>(
    defaultOpenIds ?? items.filter((item) => item.defaultOpen).map((item) => item.id),
  );
  const activeOpenIds = openIds ?? internalOpenIds;
  const isControlled = openIds !== undefined;

  function updateOpenIds(nextOpenIds: string[]) {
    if (!isControlled) {
      setInternalOpenIds(nextOpenIds);
    }

    onOpenChange?.(nextOpenIds);
  }

  function toggleItem(itemId: string) {
    const isOpen = activeOpenIds.includes(itemId);

    if (isOpen) {
      updateOpenIds(activeOpenIds.filter((openId) => openId !== itemId));
      return;
    }

    updateOpenIds(allowMultiple ? [...activeOpenIds, itemId] : [itemId]);
  }

  return (
    <div className={joinClassNames(styles.accordion, className)}>
      {items.map((item) => {
        const isOpen = activeOpenIds.includes(item.id);
        const panelId = `${item.id}-panel`;
        const triggerId = `${item.id}-trigger`;

        return (
          <section
            className={joinClassNames(
              styles.item,
              item.disabled && styles.itemDisabled,
              itemClassName,
            )}
            key={item.id}
          >
            <button
              aria-controls={panelId}
              aria-expanded={isOpen}
              className={styles.trigger}
              disabled={item.disabled}
              id={triggerId}
              type="button"
              onClick={() => toggleItem(item.id)}
            >
              {item.icon ? <span className={styles.icon}>{item.icon}</span> : null}
              <span className={styles.copy}>
                <span className={styles.title}>{item.title}</span>
                {item.description ? (
                  <span className={styles.description}>{item.description}</span>
                ) : null}
              </span>
              {item.action ? <span className={styles.action}>{item.action}</span> : null}
              <ChevronDown
                aria-hidden="true"
                className={joinClassNames(styles.chevron, isOpen && styles.chevronOpen)}
              />
            </button>

            {isOpen ? (
              <div
                aria-labelledby={triggerId}
                className={joinClassNames(styles.panel, panelClassName)}
                id={panelId}
                role="region"
              >
                <div className={styles.panelInner}>{item.content}</div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
