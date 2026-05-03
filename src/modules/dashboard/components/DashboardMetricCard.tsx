import {
  MetricCard,
  type MetricCardTone,
} from "@/shared/components/ui/MetricCard";

type DashboardMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: DashboardMetricCardProps) {
  return <MetricCard hint={hint} label={label} tone={tone} value={value} />;
}
