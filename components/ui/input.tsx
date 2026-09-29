import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "w-full rounded-sm border border-line-2 bg-card px-2.5 py-2 outline-none focus:border-primary",
        className
      )}
      {...props}
    />
  );
}

export { Input };
