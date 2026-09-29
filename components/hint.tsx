import { cn } from "@/lib/utils";

/** Note de bas de panneau, en petit corps et en gris clair. */
export function Hint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[11px] text-ink-3", className)} {...props} />;
}
