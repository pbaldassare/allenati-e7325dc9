import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock } from 'lucide-react';

interface ScheduleItem {
  dayOfWeek: number;
  time: string;
  date?: string;
  day?: string;
}

interface CourseScheduleManagerProps {
  schedule: ScheduleItem[];
  onChange: (schedule: ScheduleItem[]) => void;
}

const daysOfWeek = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
];

export const CourseScheduleManager: React.FC<CourseScheduleManagerProps> = ({
  schedule,
  onChange,
}) => {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(
    schedule.length > 0 ? schedule : [{ dayOfWeek: 1, time: '09:00', day: 'Lunedì' }]
  );

  const addScheduleItem = () => {
    const newItem: ScheduleItem = {
      dayOfWeek: 1,
      time: '09:00',
      day: 'Lunedì'
    };
    const newSchedule = [...scheduleItems, newItem];
    setScheduleItems(newSchedule);
    onChange(newSchedule);
  };

  const removeScheduleItem = (index: number) => {
    if (scheduleItems.length > 1) {
      const newSchedule = scheduleItems.filter((_, i) => i !== index);
      setScheduleItems(newSchedule);
      onChange(newSchedule);
    }
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: any) => {
    const newSchedule = scheduleItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'dayOfWeek') {
          const dayLabel = daysOfWeek.find(d => d.value === value)?.label || '';
          updatedItem.day = dayLabel;
        }
        return updatedItem;
      }
      return item;
    });
    setScheduleItems(newSchedule);
    onChange(newSchedule);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Orari Settimanali</h4>
          <p className="text-sm text-muted-foreground">
            Configura gli orari ricorrenti del corso
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addScheduleItem}
        >
          <Plus className="mr-2 h-4 w-4" />
          Aggiungi Orario
        </Button>
      </div>

      <div className="space-y-3">
        {scheduleItems.map((item, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Giorno</label>
                  <Select
                    value={item.dayOfWeek.toString()}
                    onValueChange={(value) => 
                      updateScheduleItem(index, 'dayOfWeek', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium">Orario</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={item.time}
                      onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeScheduleItem(index)}
                    disabled={scheduleItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anteprima Orari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {scheduleItems.map((item, index) => (
              <Badge key={index} variant="secondary">
                {item.day} alle {item.time}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};