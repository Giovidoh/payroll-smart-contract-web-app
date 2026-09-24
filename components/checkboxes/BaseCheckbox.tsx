"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BaseCheckboxProps extends ComponentProps<typeof Checkbox> {
  label?: string;
  children?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  checkboxClassName?: string;
  showLabel?: boolean;
  labelPosition?: "left" | "right";
}

const BaseCheckbox = forwardRef<HTMLButtonElement, BaseCheckboxProps>(
  (
    {
      label,
      children,
      containerClassName,
      labelClassName,
      checkboxClassName,
      showLabel = true,
      labelPosition = "right",
      className,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    const labelContent = children || label;

    return (
      <div
        className={cn(
          "flex items-center gap-2",
          labelPosition === "left" && "flex-row-reverse",
          containerClassName
        )}
      >
        <Checkbox
          ref={ref}
          id={id}
          className={cn(
            "border-[#A6A6A6] data-[state=checked]:bg-white data-[state=checked]:border-primary data-[state=checked]:text-primary",
            checkboxClassName,
            className
          )}
          {...props}
        />
        {showLabel && labelContent && (
          <Label
            htmlFor={id}
            className={cn(
              "text-[clamp(14px,1.5vw,16px)] leading-none font-normal peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              labelClassName
            )}
          >
            {labelContent}
          </Label>
        )}
      </div>
    );
  }
);

BaseCheckbox.displayName = "BaseCheckbox";

export default BaseCheckbox;
