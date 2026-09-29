import { cn } from "@/lib/utils";

/** Liste de couples libellé / valeur, empilés. */
export function DetailList({ className, ...props }: React.ComponentProps<"dl">) {
  return <dl className={cn("grid gap-1.5", className)} {...props} />;
}

/**
 * Un couple libellé / valeur. `ruled` sépare les lignes d'un filet ; `mono`
 * compose la valeur en chasse fixe, ce qui convient aux montants et adresses.
 */
export function DetailItem({
  label,
  children,
  ruled = false,
  mono = true,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  ruled?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex justify-between",
        ruled && "flex-wrap gap-2 border-b border-line pb-1.5 last:border-0",
        className
      )}
    >
      <dt className="text-ink-2">{label}</dt>
      <dd className={cn(mono && "font-mono")}>{children}</dd>
    </div>
  );
}

/** Ligne de total, au-dessous d'un filet. */
export function DetailTotal({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-t border-line pt-1.5 font-semibold">
      <dt>{label}</dt>
      <dd className="font-mono">{children}</dd>
    </div>
  );
}
