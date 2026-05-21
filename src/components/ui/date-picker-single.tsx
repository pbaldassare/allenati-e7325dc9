import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerSingleProps {
  /** value as YYYY-MM-DD or empty string */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

/**
 * Cross-browser date picker that always emits YYYY-MM-DD strings.
 * Replaces native <input type="date"> which behaves inconsistently on mobile/iOS
 * and shows "gg/mm/aaaa" in Italian locale until fully filled.
 */
export const DatePickerSingle: React.FC<DatePickerSingleProps> = ({
  value,
  onChange,
  placeholder = 'Seleziona data',
  className,
  allowClear = true,
}) => {
  const date = value ? parseISO(value) : undefined;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !value && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'dd MMM yyyy', { locale: it }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
          />
        </PopoverContent>
      </Popover>
      {allowClear && value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          aria-label="Cancella data"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
