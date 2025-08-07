import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';

interface ScheduleItem {
  dayOfWeek: number;
  time: string;
  date?: string;
  day?: string;
}

interface CourseScheduleDisplayProps {
  schedule: ScheduleItem[];
}

const daysOfWeek = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

export const CourseScheduleDisplay: React.FC<CourseScheduleDisplayProps> = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted-foreground">Nessun orario programmato</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schedule.map((item, index) => {
        const dayName = item.day || daysOfWeek[item.dayOfWeek] || 'Giorno non valido';
        
        return (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">{dayName}</p>
                {item.date && (
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">{item.time}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};