import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import type { RiskLevel } from "@exam/shared";
import { Badge } from "@/components/ui/Badge";

const labels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const icons: Record<RiskLevel, React.ReactNode> = {
  low: <CircleCheck className="size-3.5" aria-hidden />,
  medium: <TriangleAlert className="size-3.5" aria-hidden />,
  high: <OctagonAlert className="size-3.5" aria-hidden />,
};

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <Badge tone={level} icon={icons[level]}>
      {labels[level]}
    </Badge>
  );
}
