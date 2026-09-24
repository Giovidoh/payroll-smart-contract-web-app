import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FC, ReactNode } from 'react';

interface BaseSelectOption {
  label?: ReactNode;
  value: string;
  disabled?: boolean;
}

interface BaseSelectProps {
  options: BaseSelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string; // applied to trigger for convenience (like BaseInput)
  triggerClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'md'; // maps to SelectTrigger size
}

const BaseSelect: FC<BaseSelectProps> = ({
  options,
  placeholder,
  value,
  defaultValue,
  onValueChange,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  size = 'md',
}) => {
  return (
    <Select
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        size={size === 'sm' ? 'sm' : 'default'}
        className={cn(
          // Align base visual style with BaseInput
          'border border-[#BCBABA] bg-white px-5 py-6 text-[clamp(14px,_2vw,_18px)] shadow-none',
          // Keep Trigger behavior and dimensions reasonable
          'w-fit rounded-md',
          className,
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn(contentClassName)}>
        {options.map(({ value: optionValue, label, disabled: optionDisabled }) => (
          <SelectItem key={optionValue} value={optionValue} disabled={optionDisabled}>
            {label ?? optionValue}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default BaseSelect;
