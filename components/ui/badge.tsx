import { cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "./tone";

const badgeVariants = cva(
  "inline-block whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[11px] font-medium",
  {
    variants: {
      tone: {
        ok: "bg-ok-bg text-ok",
        warn: "bg-warn-bg text-warn",
        err: "bg-err-bg text-err",
        accent: "bg-tint text-primary",
        neutral: "bg-surface-3 text-ink-2",
      } satisfies Record<Tone, string>,
    },
    defaultVariants: { tone: "neutral" },
  }
);

function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
