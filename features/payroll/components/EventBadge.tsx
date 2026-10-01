import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/tone";
import { LABELS, type EventType } from "../hooks/use-events";

const TONE: Partial<Record<EventType, Tone>> = {
  PayrollCompleted: "ok",
  SalaryPaid: "ok",
  FundsDeposited: "accent",
  EmployeeRemoved: "warn",
  AmountWithdrawn: "warn",
};

/** Type d'un événement du contrat, en clair et dans sa couleur. */
export function EventBadge({ type }: { type: EventType }) {
  return <Badge tone={TONE[type] ?? "neutral"}>{LABELS[type]}</Badge>;
}
