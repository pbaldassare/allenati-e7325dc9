import React from 'react';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format, differenceInWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeSelectorProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  className?: string;
  disabled?: boolean;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className,
  disabled = false
}) => {
  const calculateDuration = () => {
    if (!startDate || !endDate) return null;
    const weeks = differenceInWeeks(endDate, startDate);
    return weeks;
  };

  const duration = calculateDuration();

  return (
    <div className={className}>
      <div className="space-y-4">
        <Label className="text-sm font-medium flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Date del Corso
        </Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Inizio */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Inizio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd/MM/yyyy") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={onStartDateChange}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || (endDate && date >= endDate);
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Data Fine */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Data Fine</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                  disabled={disabled || !startDate}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={onEndDateChange}
                  disabled={(date) => {
                    if (!startDate) return true;
                    const maxDate = new Date(startDate);
                    maxDate.setFullYear(maxDate.getFullYear() + 2); // Max 2 anni
                    return date <= startDate || date > maxDate;
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {startDate && endDate && duration !== null && (
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/30 rounded-md">
            <div className="flex items-center justify-between">
              <span>Inizio:</span>
              <span className="font-mono">{format(startDate, 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Fine:</span>
              <span className="font-mono">{format(endDate, 'dd/MM/yyyy')}</span>
            </div>
            <div className="pt-1 border-t">
              <span className="text-xs font-medium text-primary">
                Durata: {duration} settiman{duration === 1 ? 'a' : 'e'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};