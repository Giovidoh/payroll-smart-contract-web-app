/** Indicateur chiffré : libellé, valeur en chasse fixe, indice facultatif. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="border border-line bg-card p-3">
      <div className="mb-1.5 text-[11px] text-ink-2">{label}</div>
      <div className="font-mono text-[19px] font-medium tracking-[-0.01em]">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}
