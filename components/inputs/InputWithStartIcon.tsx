'use client';

import type { ComponentProps, ReactNode } from 'react';
import { forwardRef, useId } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import BaseInput from '@/components/inputs/BaseInput';

interface InputWithStartIconProps extends ComponentProps<typeof Input> {
  icon: ReactNode;
  label?: string;
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  iconSize?: number;
}

const InputWithStartIcon = forwardRef<HTMLInputElement, InputWithStartIconProps>(
  (
    {
      icon,
      label,
      containerClassName,
      labelClassName,
      inputClassName,
      iconClassName,
      iconSize = 16,
      className,
      id: providedId,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;

    return (
      <div className={cn('*:not-first:mt-2', containerClassName)}>
        {label && (
          <Label htmlFor={id} className={labelClassName}>
            {label}
          </Label>
        )}
        <div className="relative">
          <BaseInput
            ref={ref}
            id={id}
            className={cn('peer ps-10', inputClassName, className)}
            {...props}
          />
          <div
            className={cn(
              'text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50',
              iconClassName,
            )}
          >
            {typeof icon === 'string' ? (
              <span className="text-sm font-medium" aria-hidden="true">
                {icon}
              </span>
            ) : (
              <div style={{ fontSize: iconSize }} aria-hidden="true">
                {icon}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

InputWithStartIcon.displayName = 'InputWithStartIcon';

export default InputWithStartIcon;
