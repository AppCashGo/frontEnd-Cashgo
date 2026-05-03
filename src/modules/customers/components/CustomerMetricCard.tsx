import {
  MetricCard,
  type MetricCardTone,
} from "@/shared/components/ui/MetricCard";

type CustomerMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
};

export function CustomerMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: CustomerMetricCardProps) {
  return <MetricCard hint={hint} label={label} tone={tone} value={value} />;
}
