import {
  MetricCard,
  type MetricCardTone,
} from "@/shared/components/ui/MetricCard";

type ReportsMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
};

export function ReportsMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: ReportsMetricCardProps) {
  return <MetricCard hint={hint} label={label} tone={tone} value={value} />;
}
