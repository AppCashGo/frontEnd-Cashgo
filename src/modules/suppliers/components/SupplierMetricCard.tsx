import {
  MetricCard,
  type MetricCardTone,
} from "@/shared/components/ui/MetricCard";

type SupplierMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
};

export function SupplierMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: SupplierMetricCardProps) {
  return <MetricCard hint={hint} label={label} tone={tone} value={value} />;
}
