import {
  MetricCard,
  type MetricCardTone,
} from "@/shared/components/ui/MetricCard";

type SettingsMetricCardProps = {
  label: string;
  value: string;
  hint: string;
  tone?: MetricCardTone;
};

export function SettingsMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: SettingsMetricCardProps) {
  return <MetricCard hint={hint} label={label} tone={tone} value={value} />;
}
