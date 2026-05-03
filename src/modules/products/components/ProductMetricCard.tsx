import { MetricCard } from "@/shared/components/ui/MetricCard";

type ProductMetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function ProductMetricCard({
  label,
  value,
  hint,
}: ProductMetricCardProps) {
  return <MetricCard hint={hint} label={label} value={value} />;
}
