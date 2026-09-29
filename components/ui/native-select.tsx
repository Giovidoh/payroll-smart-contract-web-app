import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const nativeSelectVariants = cva("rounded-sm border border-line-2 bg-card", {
  variants: {
    size: {
      default: "px-2.5 py-2",
      sm: "px-2 py-1 text-xs",
    },
  },
  defaultVariants: { size: "default" },
});

/** Liste déroulante native : suffisante ici, et accessible sans effort. */
function NativeSelect({
  className,
  size,
  ...props
}: Omit<React.ComponentProps<"select">, "size"> &
  VariantProps<typeof nativeSelectVariants>) {
  return (
    <select
      data-slot="native-select"
      className={cn(nativeSelectVariants({ size }), className)}
      {...props}
    />
  );
}

export { NativeSelect };
