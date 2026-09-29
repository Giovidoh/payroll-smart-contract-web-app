import * as React from "react";

import { cn } from "@/lib/utils";

/** Bloc encadré, filet supérieur épais : la signature visuelle du système Modernist. */
function Card({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section data-slot="card" className={cn("border border-line bg-card", className)} {...props} />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn(
        "flex items-center justify-between gap-3 border-b-2 border-rule px-4 py-3",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 data-slot="card-title" className={cn("font-semibold", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("p-4", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent };
