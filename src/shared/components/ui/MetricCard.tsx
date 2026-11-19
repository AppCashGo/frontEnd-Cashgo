import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Calculator,
  CircleDollarSign,
  Clock3,
  Package,
  ReceiptText,
  Settings2,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { SurfaceCard } from "@/shared/components/ui/SurfaceCard";
import { joinClassNames } from "@/shared/utils/join-class-names";
import styles from "./MetricCard.module.css";

export type MetricCardTone = "default" | "accent" | "success" | "alert";

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
  className?: string;
  icon?: ReactNode;
};

function getMetricIcon(label: string, tone: MetricCardTone) {
  const normalizedLabel = label.toLocaleLowerCase("es");

  if (/ganancia|utilidad|profit|balance/.test(normalizedLabel)) return <TrendingUp />;
  if (/por cobrar|pendiente|pending|saldo/.test(normalizedLabel)) return <Clock3 />;
  if (/cobrado|pagado|paid|activo|listo/.test(normalizedLabel)) return <BadgeCheck />;
  if (/venta|revenue|factur/.test(normalizedLabel)) return <ReceiptText />;
  if (/cliente|customer/.test(normalizedLabel)) return <Users />;
  if (/empleado|equipo|acceso/.test(normalizedLabel)) return <UsersRound />;
  if (/proveedor|supplier/.test(normalizedLabel)) return <Truck />;
  if (/inventario|stock|referencia/.test(normalizedLabel)) return <Boxes />;
  if (/producto/.test(normalizedLabel)) return <Package />;
  if (/alerta|vencid|falta|seguimiento/.test(normalizedLabel)) return <TriangleAlert />;
  if (/config|perfil|política/.test(normalizedLabel)) return <Settings2 />;
  if (/ticket|promedio/.test(normalizedLabel)) return <Calculator />;
  if (/total|volumen|monto/.test(normalizedLabel)) return <CircleDollarSign />;
  if (tone === "alert") return <TriangleAlert />;
  if (tone === "success") return <BadgeCheck />;
  return <BarChart3 />;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
  className,
  icon,
}: MetricCardProps) {
  return (
    <SurfaceCard
      className={joinClassNames(
        styles.card,
        tone === "accent" && styles.cardAccent,
        tone === "success" && styles.cardSuccess,
        tone === "alert" && styles.cardAlert,
        className,
      )}
    >
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
        <span className={styles.icon} aria-hidden="true">
          {icon ?? getMetricIcon(label, tone)}
        </span>
      </div>
      <p className={styles.value}>{value}</p>
      <p className={styles.hint}>{hint}</p>
    </SurfaceCard>
  );
}
