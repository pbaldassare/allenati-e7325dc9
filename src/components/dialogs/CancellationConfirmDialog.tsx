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
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertTriangle, Info } from "lucide-react";

interface CancellationConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    name: string;
    instructor?: { 
      profiles?: { first_name: string; last_name: string } 
    } | string;
    deadline_hours?: number;
  };
  booking: {
    scheduled_date?: string;
    scheduled_time?: string;
    credits_used?: number;
  };
  onConfirm: () => void;
  isLoading?: boolean;
}

export const CancellationConfirmDialog = ({
  open,
  onOpenChange,
  course,
  booking,
  onConfirm,
  isLoading = false
}: CancellationConfirmDialogProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data non disponibile';
    return new Date(dateString).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
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

  // Calcola se siamo ancora nel periodo di cancellazione gratuita
  const getDeadlineInfo = () => {
    if (!course.deadline_hours || !booking.scheduled_date || !booking.scheduled_time) return null;
    
    const bookingDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const deadlineTime = new Date(bookingDateTime.getTime() - (course.deadline_hours * 60 * 60 * 1000));
    const now = new Date();
    
    const isWithinDeadline = now <= deadlineTime;
    const timeUntilDeadline = deadlineTime.getTime() - now.getTime();
    const hoursUntil = Math.floor(timeUntilDeadline / (1000 * 60 * 60));
    
    return {
      isWithinDeadline,
      deadlineTime,
      hoursUntil
    };
  };

  const deadlineInfo = getDeadlineInfo();

  // Controllo di sicurezza - non renderizzare se non abbiamo dati essenziali
  if (!course || !booking) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center text-lg">
            <AlertTriangle className="w-6 h-6 mr-3" />
            Conferma Cancellazione
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground/70 text-base">
            Stai per cancellare la seguente prenotazione. Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border-2 border-destructive/30 rounded-lg p-5 sm:p-4 space-y-4">
            <h3 className="font-semibold text-foreground text-lg">{course.name}</h3>
            
            <div className="space-y-3 text-base sm:text-sm">
              <div className="flex items-center text-foreground">
                <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span className="font-medium">{formatDate(booking.scheduled_date)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <Clock className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span className="font-medium">{formatTime(booking.scheduled_time)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <User className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span>{getInstructorName()}</span>
              </div>
            </div>

            {booking.credits_used && (
              <div className="pt-3 border-t-2 border-destructive/30">
                <Badge variant="outline" className="text-destructive border-2 border-destructive/50 text-sm">
                  {booking.credits_used} crediti utilizzati
                </Badge>
              </div>
            )}
          </div>

          {/* Informazioni sulla politica di cancellazione */}
          {deadlineInfo && (
            <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 ${
              deadlineInfo.isWithinDeadline 
                ? 'bg-muted/50 border-border' 
                : 'bg-warning/10 border-warning/30'
            }`}>
              <Info className={`w-5 h-5 mt-0.5 ${
                deadlineInfo.isWithinDeadline ? 'text-muted-foreground' : 'text-warning'
              }`} />
              <div className="text-base sm:text-sm">
                {deadlineInfo.isWithinDeadline ? (
                  <div>
                    <p className="font-semibold text-foreground">Cancellazione gratuita</p>
                    <p className="text-foreground/80 mt-1 leading-relaxed">
                      Puoi cancellare gratuitamente fino a {deadlineInfo.hoursUntil} ore prima del corso.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-warning">Cancellazione tardiva</p>
                    <p className="text-foreground/80 mt-1 leading-relaxed">
                      Il periodo di cancellazione gratuita è scaduto. I crediti potrebbero non essere rimborsati.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Mantieni Prenotazione
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? "Cancellando..." : "Conferma Cancellazione"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};