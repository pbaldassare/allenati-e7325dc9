import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Users, CreditCard } from "lucide-react";

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    name: string;
    instructor?: { 
      profiles?: { first_name: string; last_name: string } 
    } | string;
    difficulty_level?: number;
    credits_required?: number;
    max_participants?: number;
    description?: string;
  };
  scheduledDate: string;
  scheduledTime: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const BookingConfirmDialog = ({
  open,
  onOpenChange,
  course,
  scheduledDate,
  scheduledTime,
  onConfirm,
  isLoading = false
}: BookingConfirmDialogProps) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data non disponibile';
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'Orario non disponibile';
    return timeString.slice(0, 5);
  };

  const getInstructorName = () => {
    if (typeof course.instructor === 'string') {
      return course.instructor;
    }
    if (course.instructor?.profiles) {
      return `${course.instructor.profiles.first_name} ${course.instructor.profiles.last_name}`;
    }
    return 'Istruttore non disponibile';
  };

  const getDifficultyLabel = (level?: number) => {
    switch (level) {
      case 1: return 'Principiante';
      case 2: return 'Intermedio';
      case 3: return 'Avanzato';
      default: return 'Non specificato';
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground text-lg">
            Conferma Prenotazione
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/70 text-base">
            Stai per prenotare il seguente corso. Confermi?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-accent border border-border rounded-lg p-5 sm:p-4 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">{course.name}</h3>
            
            <div className="space-y-3 text-base sm:text-sm">
              <div className="flex items-center text-foreground">
                <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span className="font-medium">{formatDate(scheduledDate)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <Clock className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span className="font-medium">{formatTime(scheduledTime)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <User className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span>{getInstructorName()}</span>
              </div>

              {course.max_participants && (
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                  <span>Max {course.max_participants} partecipanti</span>
                </div>
              )}

              {course.credits_required && (
                <div className="flex items-center text-foreground">
                  <CreditCard className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                  <span className="font-medium">{course.credits_required} crediti richiesti</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {course.difficulty_level && (
                <Badge variant="outline" className="border-2 text-sm">
                  {getDifficultyLabel(course.difficulty_level)}
                </Badge>
              )}
            </div>

            {course.description && (
              <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
                {course.description}
              </p>
            )}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            {isLoading ? "Prenotando..." : "Conferma Prenotazione"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};