import { Badge } from "@/components/ui/badge";
import type { Tone } from "@/components/ui/tone";
import { LIBELLES, type TypeEvenement } from "../hooks/use-events";

const TON: Partial<Record<TypeEvenement, Tone>> = {
  PayrollCompleted: "ok",
  SalaryPaid: "ok",
  FundsDeposited: "accent",
  EmployeeRemoved: "warn",
  AmountWithdrawn: "warn",
};

/** Type d'un événement du contrat, en clair et dans sa couleur. */
export function EventBadge({ type }: { type: TypeEvenement }) {
  return <Badge tone={TON[type] ?? "neutral"}>{LIBELLES[type]}</Badge>;
}
