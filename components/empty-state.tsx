import { cn } from "@/lib/utils";

function State({
  title,
  titleClassName,
  children,
}: {
  title: string;
  titleClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center gap-1.5 px-4 py-12 text-center">
      <div className={cn("font-semibold", titleClassName)}>{title}</div>
      {children && <p className="max-w-md text-ink-2">{children}</p>}
    </div>
  );
}

/** Rien à afficher, et c'est une réponse. */
export function EmptyState(props: { title: string; children?: React.ReactNode }) {
  return <State {...props} />;
}

/** Rien à afficher parce que la lecture a échoué : ce n'est pas une absence. */
export function ErrorState(props: { title: string; children?: React.ReactNode }) {
  return <State {...props} titleClassName="text-err" />;
}
