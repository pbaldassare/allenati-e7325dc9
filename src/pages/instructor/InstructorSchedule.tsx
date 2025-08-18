import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { useInstructorBookings } from '@/hooks/useInstructorBookings';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight } from 'lucide-react';

const InstructorSchedule = () => {
  const { courses, loading: coursesLoading } = useInstructorCourses();
  const { bookings, loading: bookingsLoading } = useInstructorBookings();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[dayOfWeek];
  };

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getSchedulesForDay = (dayOfWeek: number) => {
    return courses.flatMap(course => 
      course.schedules
        .filter(schedule => schedule.day_of_week === dayOfWeek)
        .map(schedule => ({
          ...schedule,
          course: {
            id: course.id,
            name: course.name,
            category: course.category,
            current_bookings: course.current_bookings,
            max_participants: course.max_participants
          }
        }))
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const formatWeekRange = () => {
    const weekDays = getWeekDays(currentWeek);
    const start = weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
    const end = weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${start} - ${end}`;
  };

  const isToday = (dayOfWeek: number) => {
    const today = new Date().getDay();
    return today === dayOfWeek;
  };

  if (coursesLoading || bookingsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Calendario
        </h1>
        <div className="animate-pulse">
          <Card>
            <CardHeader>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-4">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const weekDays = getWeekDays(currentWeek);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Calendario
          </h1>
          <p className="text-muted-foreground">
            Il tuo programma settimanale
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {formatWeekRange()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                Oggi
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {weekDays.map((day, index) => {
              const dayOfWeek = day.getDay();
              const schedules = getSchedulesForDay(dayOfWeek);
              
              return (
                <div 
                  key={index} 
                  className={`space-y-2 p-3 rounded-lg border ${
                    isToday(dayOfWeek) ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                  }`}
                >
                  <div className="text-center">
                    <div className={`font-semibold ${isToday(dayOfWeek) ? 'text-primary' : ''}`}>
                      {getDayName(dayOfWeek)}
                    </div>
                    <div className={`text-sm ${isToday(dayOfWeek) ? 'text-primary' : 'text-muted-foreground'}`}>
                      {day.getDate()}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {schedules.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Nessuna lezione
                      </p>
                    ) : (
                      schedules.map((schedule, scheduleIndex) => (
                        <div 
                          key={scheduleIndex} 
                          className="p-2 rounded bg-background border text-xs space-y-1"
                        >
                          <div className="font-medium line-clamp-1">
                            {schedule.course.name}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {schedule.start_time.slice(0, 5)}-{schedule.end_time.slice(0, 5)}
                          </div>
                          {schedule.room_name && (
                            <div className="text-muted-foreground">
                              📍 {schedule.room_name}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{schedule.course.current_bookings}/{schedule.course.max_participants}</span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{ 
                              backgroundColor: schedule.course.category.color_hex + '20', 
                              borderColor: schedule.course.category.color_hex 
                            }}
                          >
                            {schedule.course.category.name}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {courses.reduce((sum, course) => sum + course.schedules.length, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Lezioni settimanali</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {courses.reduce((sum, course) => sum + (course.current_bookings || 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Partecipanti totali</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {courses.reduce((sum, course) => sum + course.schedules.reduce((scheduleSum, schedule) => {
                  const start = new Date(`1970-01-01T${schedule.start_time}`);
                  const end = new Date(`1970-01-01T${schedule.end_time}`);
                  return scheduleSum + (end.getTime() - start.getTime()) / (1000 * 60);
                }, 0), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Minuti settimanali</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InstructorSchedule;