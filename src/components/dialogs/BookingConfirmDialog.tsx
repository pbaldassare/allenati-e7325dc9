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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Conferma Prenotazione
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Stai per prenotare il seguente corso. Confermi?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-accent/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-foreground">{course.name}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(scheduledDate)}</span>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatTime(scheduledTime)}</span>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <User className="w-4 h-4 mr-2" />
                <span>{getInstructorName()}</span>
              </div>

              {course.max_participants && (
                <div className="flex items-center text-muted-foreground">
                  <Users className="w-4 h-4 mr-2" />
                  <span>Max {course.max_participants} partecipanti</span>
                </div>
              )}

              {course.credits_required && (
                <div className="flex items-center text-muted-foreground">
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span>{course.credits_required} crediti richiesti</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {course.difficulty_level && (
                <Badge variant="outline">
                  {getDifficultyLabel(course.difficulty_level)}
                </Badge>
              )}
            </div>

            {course.description && (
              <p className="text-xs text-muted-foreground mt-2">
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