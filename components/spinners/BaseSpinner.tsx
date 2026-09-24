import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { FC } from 'react';

interface BaseSpinnerProps {
  className?: string;
}

const BaseSpinner: FC<BaseSpinnerProps> = ({ className }) => {
  return <Spinner className={cn('size-4', className)} />;
};

export default BaseSpinner;
