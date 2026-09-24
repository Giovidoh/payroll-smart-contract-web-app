import BaseSpinner from "@/components/spinners/BaseSpinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VariantProps } from "class-variance-authority";
import Link from "next/link";
import { FC, ReactNode } from "react";

interface BaseButtonProps extends VariantProps<typeof buttonVariants> {
  variantStyle?:
    | "primary"
    | "secondary"
    | "outline"
    | "outline-2"
    | "ghost"
    | "date-picker-trigger";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
  isLink?: boolean;
  href?: string;
  onClick?: (e: any) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
}

const BaseButton: FC<BaseButtonProps> = ({
  variantStyle = "primary",
  size = "md",
  className,
  children,
  isLink = false,
  href,
  onClick,
  type,
  disabled,
  isLoading = false,
  ...restProps
}) => {
  let style =
    variantStyle === "primary"
      ? "bg-primary text-white hover:bg-primary/80 leading-0"
      : variantStyle === "secondary"
      ? "bg-black text-white hover:bg-primary leading-0"
      : variantStyle === "outline"
      ? "border border-[#5B5B5B] bg-transparent hover:bg-primary hover:text-white hover:border-primary text-black"
      : variantStyle === "outline-2"
      ? "border border-[#5B5B5B] bg-transparent hover:text-primary hover:border-primary text-black hover:bg-transparent"
      : variantStyle === "ghost"
      ? "border-none bg-transparent hover:text-primary text-[#505050] hover:bg-white"
      : variantStyle === "date-picker-trigger"
      ? "items-center bg-white hover:bg-white/80 rounded-md h-12 font-normal text-black border border-[#BCBABA] gap-2 px-4 text-[#8D8D8D]"
      : "";

  size === "sm"
    ? (style +=
        " px-[clamp(10px,_3vw,_15px)] h-[clamp(30px,_0.909rem_+_1.7vw,_35px)] text-sm")
    : size === "lg"
    ? (style += "")
    : (style += "");

  if (isLink) {
    return (
      <Link
        href={href || "#"}
        className={cn(
          "flex h-[clamp(35px,0.909rem+1.7vw,40px)] w-fit shrink-0 items-center justify-center gap-2 rounded-lg px-[clamp(20px,3vw,32px)] text-center text-[clamp(14px,1.5vw,16px)] shadow-none transition duration-300 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          style,
          className
        )}
      >
        {isLoading ? <BaseSpinner /> : children}
      </Link>
    );
  }

  return (
    <Button
      className={cn(
        "h-[clamp(35px,0.909rem+1.7vw,40px)] w-fit cursor-pointer rounded-lg px-[clamp(20px,3vw,32px)] text-[clamp(14px,1.5vw,16px)] shadow-none transition duration-300",
        style,
        className
      )}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...restProps}
    >
      {isLoading ? <BaseSpinner /> : children}
    </Button>
  );
};

export default BaseButton;
