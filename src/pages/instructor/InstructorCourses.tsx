import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { BookOpen, Users, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

const InstructorCourses = () => {
  const { courses, loading, error } = useInstructorCourses();

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[dayOfWeek];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          I Miei Corsi
        </h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          I Miei Corsi
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            I Miei Corsi
          </h1>
          <p className="text-muted-foreground">
            Gestisci i corsi che ti sono stati assegnati
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            <BookOpen className="w-3 h-3 mr-1" />
            {courses.length} corsi
          </Badge>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun corso assegnato</h3>
              <p className="text-muted-foreground">
                Non hai ancora corsi assegnati. Contatta l'amministratore per ricevere i tuoi corsi.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{course.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{course.gym.name}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    style={{ backgroundColor: course.category.color_hex + '20', borderColor: course.category.color_hex }}
                  >
                    {course.category.name}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{course.current_bookings}/{course.max_participants}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{course.duration_minutes} min</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    Orari:
                  </div>
                  {course.schedules.map((schedule, index) => (
                    <div key={index} className="text-sm text-muted-foreground ml-5">
                      {getDayName(schedule.day_of_week)} {schedule.start_time}-{schedule.end_time}
                      {schedule.room_name && ` • ${schedule.room_name}`}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link to={`/instructor/participants?course=${course.id}`}>
                      <Users className="w-4 h-4 mr-1" />
                      Partecipanti
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorCourses;