import { UserRound } from "lucide-react";
import styles from "./CashRegisterOperatorAvatar.module.css";

export function CashRegisterOperatorAvatar({ name }: { name?: string | null }) {
  const initials = (name ?? "")
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toLocaleUpperCase();

  return (
    <span className={styles.avatar} aria-hidden="true">
      {initials || <UserRound />}
    </span>
  );
}
