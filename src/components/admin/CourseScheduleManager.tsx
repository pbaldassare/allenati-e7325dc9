import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock } from 'lucide-react';

interface ScheduleItem {
  dayOfWeek: number;
  time: string;
}

interface CourseScheduleManagerProps {
  schedule: ScheduleItem[];
  onChange: (schedule: ScheduleItem[]) => void;
}

const weekDays = [
  { value: 0, label: 'Domenica' },
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
];

export const CourseScheduleManager: React.FC<CourseScheduleManagerProps> = ({
  schedule,
  onChange,
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const addScheduleItem = () => {
    if (selectedTime && !schedule.some(s => s.dayOfWeek === selectedDay && s.time === selectedTime)) {
      const newSchedule = [...schedule, { dayOfWeek: selectedDay, time: selectedTime }];
      // Sort by day and time
      newSchedule.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) {
          return a.dayOfWeek - b.dayOfWeek;
        }
        return a.time.localeCompare(b.time);
      });
      onChange(newSchedule);
      setSelectedTime('');
    }
  };

  const removeScheduleItem = (index: number) => {
    const newSchedule = schedule.filter((_, i) => i !== index);
    onChange(newSchedule);
  };

  const getDayLabel = (dayOfWeek: number) => {
    return weekDays.find(d => d.value === dayOfWeek)?.label || '';
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label>Orari Settimanali</Label>
        
        {/* Add new schedule item */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Label className="text-sm">Giorno</Label>
            <Select 
              value={selectedDay.toString()} 
              onValueChange={(value) => setSelectedDay(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map(day => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Label className="text-sm">Orario</Label>
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
            />
          </div>
          
          <Button
            type="button"
            onClick={addScheduleItem}
            disabled={!selectedTime}
            className="h-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Current schedule */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Orari Programmati</Label>
        {schedule.length > 0 ? (
          <div className="space-y-2">
            {schedule.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Badge variant="outline" className="mr-2">
                      {getDayLabel(item.dayOfWeek)}
                    </Badge>
                    <span className="font-medium">{item.time}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeScheduleItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nessun orario programmato</p>
            <p className="text-sm">Aggiungi almeno un orario per il corso</p>
          </div>
        )}
      </div>

      {/* Quick preset buttons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Preset Comuni</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedTime('09:00')}
          >
            09:00
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedTime('18:00')}
          >
            18:00
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedTime('19:00')}
          >
            19:00
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedTime('20:00')}
          >
            20:00
          </Button>
        </div>
      </div>
    </div>
  );
};