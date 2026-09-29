import * as React from "react";

import { cn } from "@/lib/utils";

type Align = "left" | "right";

/** Tableau dense, aligné sur la maquette : filet fin, en-tête discret. */
function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="overflow-x-auto border border-line">
      <table
        data-slot="table"
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader(props: React.ComponentProps<"thead">) {
  return <thead data-slot="table-header" {...props} />;
}

function TableBody(props: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...props} />;
}

function TableRow(props: React.ComponentProps<"tr">) {
  return <tr data-slot="table-row" {...props} />;
}

function TableHead({
  className,
  align = "left",
  ...props
}: Omit<React.ComponentProps<"th">, "align"> & { align?: Align }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "border-b border-line bg-surface-2 px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-ink-3",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  );
}

function TableCell({
  className,
  align = "left",
  ...props
}: Omit<React.ComponentProps<"td">, "align"> & { align?: Align }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "border-b border-line px-3.5 py-2.5",
        align === "right" && "text-right",
        className
      )}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
