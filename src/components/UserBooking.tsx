import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, MapPin, Star, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Course {
  id: string;
  name: string;
  description: string;
  instructor_name: string;
  category_name: string;
  max_participants: number;
  duration_minutes: number;
  credits_required: number;
  difficulty_level: number;
  image_url?: string;
  schedules: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_name?: string;
  }>;
}

interface UserBookingProps {
  course: Course;
  onBookingComplete?: () => void;
}

export const UserBooking: React.FC<UserBookingProps> = ({ course, onBookingComplete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBooking, setIsBooking] = useState(false);

  const getDayName = (dayNumber: number) => {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[dayNumber];
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5); // Remove seconds
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-orange-500';
      case 4: return 'bg-red-500';
      case 5: return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyText = (level: number) => {
    switch (level) {
      case 1: return 'Principiante';
      case 2: return 'Facile';
      case 3: return 'Intermedio';
      case 4: return 'Avanzato';
      case 5: return 'Esperto';
      default: return 'Non specificato';
    }
  };

  const handleBooking = async () => {
    if (!user) return;

    setIsBooking(true);
    
    try {
      // Get next occurrence of the course (simplified - takes first schedule)
      const schedule = course.schedules[0];
      if (!schedule) {
        toast({
          title: "Errore",
          description: "Nessun orario disponibile per questo corso",
          variant: "destructive"
        });
        return;
      }

      // For demo purposes, book for next week
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          user_id: user.id,
          course_id: course.id,
          scheduled_date: nextWeek.toISOString().split('T')[0],
          scheduled_time: schedule.start_time,
          credits_used: course.credits_required,
          status: 'confirmed'
        });

      if (error) throw error;

      toast({
        title: "Prenotazione confermata!",
        description: `Hai prenotato ${course.name} per ${getDayName(schedule.day_of_week)} alle ${formatTime(schedule.start_time)}`
      });

      onBookingComplete?.();
    } catch (error) {
      console.error('Error booking course:', error);
      toast({
        title: "Errore",
        description: "Impossibile completare la prenotazione. Riprova più tardi.",
        variant: "destructive"
      });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {course.image_url && (
        <div className="h-48 overflow-hidden">
          <img 
            src={course.image_url} 
            alt={course.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl">{course.name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{course.category_name}</Badge>
              <Badge 
                className={`text-white ${getDifficultyColor(course.difficulty_level)}`}
              >
                {getDifficultyText(course.difficulty_level)}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>{course.credits_required} crediti</span>
          </div>
        </div>
        {course.description && (
          <CardDescription className="text-sm">
            {course.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Course Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{course.duration_minutes} min</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Max {course.max_participants}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-4 w-4" />
            <span>{course.instructor_name}</span>
          </div>
        </div>

        {/* Schedules */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Orari disponibili:</h4>
          <div className="space-y-2">
            {course.schedules.map((schedule, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="font-medium">{getDayName(schedule.day_of_week)}</span>
                  <span className="text-muted-foreground">
                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </span>
                </div>
                {schedule.room_name && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{schedule.room_name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Booking Button */}
        <Button 
          onClick={handleBooking}
          disabled={isBooking}
          className="w-full"
          size="lg"
        >
          {isBooking ? "Prenotazione in corso..." : "Prenota Corso"}
        </Button>
      </CardContent>
    </Card>
  );
};