import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';
import { format, addWeeks } from 'date-fns';

interface WeeksSelectorProps {
  value: number;
  onChange: (weeks: number) => void;
  startDate?: Date;
  className?: string;
  disabled?: boolean;
}

export const WeeksSelector: React.FC<WeeksSelectorProps> = ({
  value,
  onChange,
  startDate,
  className,
  disabled = false
}) => {
  const calculateEndDate = (weeks: number) => {
    if (!startDate) return null;
    return addWeeks(startDate, weeks);
  };

  const endDate = calculateEndDate(value);

  return (
    <div className={className}>
      <div className="space-y-3">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Durata Corso (Settimane)
        </Label>
        
        <Select 
          value={value.toString()} 
          onValueChange={(val) => onChange(parseInt(val))}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona durata" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => i + 1).map(weeks => (
              <SelectItem key={weeks} value={weeks.toString()}>
                {weeks} settiman{weeks === 1 ? 'a' : 'e'}
                {weeks === 12 && ' (default)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {startDate && endDate && (
          <div className="text-xs text-muted-foreground space-y-1">
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
                Durata totale: {value} settimane
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};