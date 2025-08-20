import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Plus, Trash2, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export interface ScheduleException {
  id?: string;
  start_date: Date;
  end_date: Date;
  reason?: string;
}

interface CourseScheduleExceptionsProps {
  exceptions: ScheduleException[];
  onChange: (exceptions: ScheduleException[]) => void;
}

export const CourseScheduleExceptions: React.FC<CourseScheduleExceptionsProps> = ({
  exceptions,
  onChange,
}) => {
  const [newException, setNewException] = useState<Partial<ScheduleException>>({});

  const addException = () => {
    if (newException.start_date && newException.end_date) {
      const exception: ScheduleException = {
        start_date: newException.start_date,
        end_date: newException.end_date,
        reason: newException.reason || '',
      };
      onChange([...exceptions, exception]);
      setNewException({});
    }
  };

  const removeException = (index: number) => {
    const updated = exceptions.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateException = (index: number, field: keyof ScheduleException, value: any) => {
    const updated = exceptions.map((exception, i) => 
      i === index ? { ...exception, [field]: value } : exception
    );
    onChange(updated);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Periodi di Esclusione
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Exceptions */}
        {exceptions.map((exception, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label>Data Inizio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !exception.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exception.start_date ? format(exception.start_date, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exception.start_date}
                    onSelect={(date) => date && updateException(index, 'start_date', date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fine</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !exception.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exception.end_date ? format(exception.end_date, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={exception.end_date}
                    onSelect={(date) => date && updateException(index, 'end_date', date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Motivo (opzionale)</Label>
              <Input
                value={exception.reason || ''}
                onChange={(e) => updateException(index, 'reason', e.target.value)}
                placeholder="Es. Vacanze estive"
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeException(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add New Exception */}
        <div className="border-2 border-dashed border-muted rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Aggiungi Nuovo Periodo di Esclusione</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Data Inizio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !newException.start_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newException.start_date ? format(newException.start_date, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newException.start_date}
                    onSelect={(date) => setNewException(prev => ({ ...prev, start_date: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fine</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !newException.end_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newException.end_date ? format(newException.end_date, "dd/MM/yyyy") : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newException.end_date}
                    onSelect={(date) => setNewException(prev => ({ ...prev, end_date: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Motivo (opzionale)</Label>
              <Input
                value={newException.reason || ''}
                onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Es. Vacanze estive"
              />
            </div>
          </div>

          <Button
            onClick={addException}
            disabled={!newException.start_date || !newException.end_date}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi Esclusione
          </Button>
        </div>

        {exceptions.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <strong>Riepilogo:</strong> {exceptions.length} periodo{exceptions.length !== 1 ? 'i' : ''} di esclusione configurato{exceptions.length !== 1 ? 'i' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
