import { formatCountdown } from "@/lib/format";

/** Temps restant avant l'échéance, en grand ; `whenDue` s'affiche une fois l'échéance passée. */
export function CountdownFigure({
  remaining,
  whenDue,
}: {
  remaining: number | undefined;
  whenDue: string;
}) {
  return (
    <div className="font-mono text-[28px] font-medium tracking-[-0.02em]">
      {remaining === undefined ? "…" : (formatCountdown(remaining) ?? whenDue)}
    </div>
  );
}
