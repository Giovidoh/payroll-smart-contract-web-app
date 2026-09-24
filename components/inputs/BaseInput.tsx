import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FC } from "react";

interface BaseInputProps extends React.ComponentProps<"input"> {
  placeholder?: string;
  className?: string;
}

const BaseInput: FC<BaseInputProps> = ({
  placeholder,
  className,
  ...props
}) => {
  return (
    <Input
      placeholder={placeholder}
      className={cn(
        "border border-[#BCBABA] bg-white px-5 py-6 text-[clamp(14px,2vw,16px)] shadow-none rounded-lg",
        className
      )}
      {...props}
    />
  );
};

export default BaseInput;
