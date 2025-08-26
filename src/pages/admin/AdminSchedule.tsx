import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminLayout } from '@/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock, Users, MapPin, Filter } from 'lucide-react';

const AdminSchedule = () => {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors!courses_instructor_id_fkey (
            profiles:user_id (
              first_name,
              last_name
            )
          ),
          course_categories (
            name
          )
        `)
        .eq('is_active', true);

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };
  const [viewMode, setViewMode] = useState('week');
  const [selectedRoom, setSelectedRoom] = useState('all');

  // Mock schedule data
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  const daysOfWeek = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

  const rooms = ['Sala A', 'Sala B', 'Sala C'];

  // Generate schedule grid
  const scheduleGrid = courses.reduce((acc, course) => {
    course.schedule.forEach(schedule => {
      const day = daysOfWeek[schedule.dayOfWeek - 1] || daysOfWeek[schedule.dayOfWeek];
      const time = schedule.time;
      const key = `${day}-${time}`;
      
      if (!acc[key]) {
        acc[key] = [];
      }
      
      acc[key].push({
        course,
        room: `Sala ${course.id.charAt(0).toUpperCase()}`,
        occupancy: Math.round((course.currentParticipants / course.maxParticipants) * 100)
      });
    });
    return acc;
  }, {} as Record<string, any[]>);

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-destructive text-destructive-foreground';
    if (occupancy >= 70) return 'bg-warning text-warning-foreground';
    if (occupancy >= 40) return 'bg-success text-success-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Calendario Master
          </h1>
          <p className="text-muted-foreground">
            Vista completa di tutti i corsi e prenotazioni sale
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Giorno</SelectItem>
              <SelectItem value="week">Settimana</SelectItem>
              <SelectItem value="month">Mese</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-40">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le sale</SelectItem>
              {rooms.map(room => (
                <SelectItem key={room} value={room}>{room}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Programmazione Settimanale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-2 text-sm font-medium">Orario</div>
                {daysOfWeek.map(day => (
                  <div key={day} className="p-2 text-sm font-medium text-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Time slots */}
              {timeSlots.map(time => (
                <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="p-2 text-sm font-medium bg-muted rounded">
                    {time}
                  </div>
                  {daysOfWeek.map(day => {
                    const key = `${day}-${time}`;
                    const events = scheduleGrid[key] || [];
                    
                    return (
                      <div key={`${day}-${time}`} className="min-h-[60px] border rounded p-1">
                        {events.map((event, index) => (
                          <div
                            key={index}
                            className={`text-xs p-1 rounded mb-1 ${getOccupancyColor(event.occupancy)}`}
                          >
                            <div className="font-medium truncate">
                              {event.course.name}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.room}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.course.currentParticipants}/{event.course.maxParticipants}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Corsi Oggi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-muted-foreground">+2 rispetto a ieri</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Utilizzo Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">87%</p>
            <p className="text-xs text-muted-foreground">Media giornaliera</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Partecipanti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">156</p>
            <p className="text-xs text-muted-foreground">Prenotazioni oggi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conflitti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">0</p>
            <p className="text-xs text-muted-foreground">Nessun conflitto</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSchedule;