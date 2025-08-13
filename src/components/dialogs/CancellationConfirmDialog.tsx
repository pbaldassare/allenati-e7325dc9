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
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Conferma Cancellazione
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Stai per cancellare la seguente prenotazione. Questa azione non può essere annullata.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-foreground">{course.name}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(booking.scheduled_date)}</span>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span>{formatTime(booking.scheduled_time)}</span>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <User className="w-4 h-4 mr-2" />
                <span>{getInstructorName()}</span>
              </div>
            </div>

            {booking.credits_used && (
              <div className="pt-2 border-t border-destructive/20">
                <Badge variant="outline" className="text-destructive border-destructive/50">
                  {booking.credits_used} crediti utilizzati
                </Badge>
              </div>
            )}
          </div>

          {/* Informazioni sulla politica di cancellazione */}
          {deadlineInfo && (
            <div className={`flex items-start space-x-2 p-3 rounded-lg ${
              deadlineInfo.isWithinDeadline 
                ? 'bg-muted/50 border border-border' 
                : 'bg-warning/10 border border-warning/20'
            }`}>
              <Info className={`w-4 h-4 mt-0.5 ${
                deadlineInfo.isWithinDeadline ? 'text-muted-foreground' : 'text-warning'
              }`} />
              <div className="text-sm">
                {deadlineInfo.isWithinDeadline ? (
                  <div>
                    <p className="font-medium text-foreground">Cancellazione gratuita</p>
                    <p className="text-muted-foreground">
                      Puoi cancellare gratuitamente fino a {deadlineInfo.hoursUntil} ore prima del corso.
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-warning">Cancellazione tardiva</p>
                    <p className="text-muted-foreground">
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