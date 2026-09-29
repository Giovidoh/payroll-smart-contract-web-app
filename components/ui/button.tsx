import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Bouton du système Modernist : angles à peine arrondis, filet d'un pixel,
 * aucune ombre. Les variantes reprennent les classes que les écrans écrivaient
 * jusqu'ici à la main.
 */
const buttonVariants = cva("rounded-sm border transition-colors disabled:opacity-50", {
  variants: {
    variant: {
      primary:
        "border-primary bg-primary font-medium text-primary-foreground hover:bg-primary/90",
      secondary: "border-line-2 bg-card hover:bg-surface-2",
      outline: "border-line-2",
      destructive: "border-err bg-err font-medium text-white hover:opacity-90",
      ghost: "border-0 hover:bg-surface-2",
      link: "border-0 text-primary underline underline-offset-2",
    },
    size: {
      default: "px-3.5 py-2",
      lg: "px-3.5 py-2.5",
      xl: "px-3.5 py-3",
      sm: "px-2 py-1 text-xs",
      xs: "px-2 py-1 text-[11px]",
      none: "",
    },
    block: {
      true: "w-full text-left",
      false: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "default",
    block: false,
  },
});

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
