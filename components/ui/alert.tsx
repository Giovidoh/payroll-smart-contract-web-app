import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "./tone";

const alertVariants = cva("border px-4 py-3", {
  variants: {
    tone: {
      ok: "border-ok/35 bg-ok-bg",
      warn: "border-warn/35 bg-warn-bg",
      err: "border-err/35 bg-err-bg",
      accent: "border-primary/25 bg-tint",
      neutral: "border-line bg-surface-2",
    } satisfies Record<Tone, string>,
  },
  defaultVariants: { tone: "neutral" },
});

/** Bandeau en tête d'écran : un titre appuyé, suivi d'une explication. */
function Alert({
  tone,
  title,
  children,
  className,
}: {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-slot="alert" className={cn(alertVariants({ tone }), className)}>
      <span className="font-semibold">{title}</span>
      {children && <span className="text-ink-2"> {children}</span>}
    </div>
  );
}

const alertMessageVariants = cva("rounded-sm border px-3 py-2.5", {
  variants: {
    tone: {
      ok: "border-ok/35 bg-ok-bg text-ok",
      warn: "border-warn/35 bg-warn-bg text-warn",
      err: "border-err/35 bg-err-bg text-err",
      accent: "border-primary/25 bg-tint text-primary",
      neutral: "border-line bg-surface-2 text-ink-2",
    } satisfies Record<Tone, string>,
  },
  defaultVariants: { tone: "neutral" },
});

/** Message encadré dans le corps d'un panneau, entièrement dans la couleur du ton. */
function AlertMessage({
  tone,
  className,
  ...props
}: React.ComponentProps<"p"> & { tone?: Tone }) {
  return (
    <p
      data-slot="alert-message"
      className={cn(alertMessageVariants({ tone }), className)}
      {...props}
    />
  );
}

export { Alert, AlertMessage };
