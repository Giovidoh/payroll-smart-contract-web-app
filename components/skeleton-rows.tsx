import { Skeleton } from "@/components/ui/skeleton";

/** Lignes d'attente, animées en cascade. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-8" style={{ animationDelay: `${i * 70}ms` }} />
      ))}
    </div>
  );
}
