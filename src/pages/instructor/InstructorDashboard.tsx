import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { useInstructorBookings } from '@/hooks/useInstructorBookings';
import { useInstructorHoursWorked } from '@/hooks/useInstructorHoursWorked';
import { BookOpen, Users, Calendar, TrendingUp, Clock, CalendarIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorGym } from '@/contexts/InstructorGymContext';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { it } from 'date-fns/locale';

const InstructorDashboard = () => {
  const { selectedGymId } = useInstructorGym();
  const { courses, loading: coursesLoading } = useInstructorCourses();
  const { bookings, loading: bookingsLoading } = useInstructorBookings();
  const { hasOwnerPrivileges, user } = useAuth();

  // Date filters for hours worked
  const today = new Date();
  const [hoursStartDate, setHoursStartDate] = useState<Date>(startOfMonth(today));
  const [hoursEndDate, setHoursEndDate] = useState<Date>(today);

  const { data: hoursData, loading: hoursLoading } = useInstructorHoursWorked(
    selectedGymId,
    hoursStartDate,
    hoursEndDate,
    user?.id
  );

  const myHoursData = hoursData[0];

  const setHoursPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    switch (preset) {
      case 'thisMonth':
        setHoursStartDate(startOfMonth(now));
        setHoursEndDate(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setHoursStartDate(startOfMonth(lastMonth));
        setHoursEndDate(endOfMonth(lastMonth));
        break;
      case 'thisYear':
        setHoursStartDate(startOfYear(now));
        setHoursEndDate(now);
        break;
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const stats = {
    totalCourses: courses.length,
    totalParticipants: courses.reduce((sum, course) => sum + (course.current_bookings || 0), 0),
    thisWeekBookings: bookings.filter(booking => {
      const bookingDate = new Date(booking.scheduled_date);
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return bookingDate >= weekStart && bookingDate <= weekEnd;
    }).length,
    activeBookings: bookings.filter(b => b.status === 'confirmed').length
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[dayOfWeek];
  };

  if (coursesLoading || bookingsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard Istruttore
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {hasOwnerPrivileges ? 'Dashboard Super Istruttore' : 'Dashboard Istruttore'}
        </h1>
        <p className="text-muted-foreground">
          {hasOwnerPrivileges 
            ? 'Panoramica completa della palestra'
            : 'Panoramica delle tue attività e corsi'
          }
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {hasOwnerPrivileges ? 'Corsi Totali' : 'Corsi Attivi'}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {hasOwnerPrivileges ? 'corsi nella palestra' : 'corsi assegnati'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants}</div>
            <p className="text-xs text-muted-foreground">
              {hasOwnerPrivileges ? 'iscritti palestra' : 'iscritti totali'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questa Settimana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeekBookings}</div>
            <p className="text-xs text-muted-foreground">
              lezioni programmate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prenotazioni Attive</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">
              confermate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Le Mie Ore Lavorate */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Le Mie Ore Lavorate
            </CardTitle>
            
            {/* Date filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {format(hoursStartDate, 'dd/MM/yy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={hoursStartDate}
                    onSelect={(d) => d && setHoursStartDate(d)}
                    disabled={(date) => date > hoursEndDate || date > today}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground text-sm">-</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8">
                    <CalendarIcon className="mr-2 h-3 w-3" />
                    {format(hoursEndDate, 'dd/MM/yy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={hoursEndDate}
                    onSelect={(d) => d && setHoursEndDate(d)}
                    disabled={(date) => date < hoursStartDate || date > today}
                    locale={it}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-1 ml-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => setHoursPreset('thisMonth')}
                >
                  Mese
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => setHoursPreset('lastMonth')}
                >
                  Scorso
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={() => setHoursPreset('thisYear')}
                >
                  Anno
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {hoursLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {myHoursData ? formatHours(myHoursData.totalHours) : '0h'}
                </p>
                <p className="text-sm text-muted-foreground">Ore Lavorate</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">
                  {myHoursData?.sessionCount || 0}
                </p>
                <p className="text-sm text-muted-foreground">Sessioni Tenute</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses Overview */}
      <Card>
        <CardHeader>
          <CardTitle>
            {hasOwnerPrivileges ? 'Tutti i Corsi della Palestra' : 'I Miei Corsi'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {hasOwnerPrivileges ? 'Nessun corso presente' : 'Nessun corso assegnato'}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((course) => (
                <Card key={course.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{course.name}</h3>
                      <Badge 
                        variant="outline" 
                        style={{ backgroundColor: course.category.color_hex + '20', borderColor: course.category.color_hex }}
                      >
                        {course.category.name}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {course.current_bookings}/{course.max_participants} partecipanti
                    </p>
                    <div className="space-y-1">
                      {course.schedules.map((schedule, index) => (
                        <div key={index} className="text-xs text-muted-foreground">
                          {getDayName(schedule.day_of_week)} {schedule.start_time}-{schedule.end_time}
                          {schedule.room_name && ` • ${schedule.room_name}`}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstructorDashboard;