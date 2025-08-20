import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Clock, User, Users, CreditCard, Award, Coins, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditPurchaseDialog } from './CreditPurchaseDialog';

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id?: string;
    name?: string;
    instructor_id?: string;
    max_participants?: number;
    credits_required?: number;
    difficulty_level?: number;
    price_per_session?: number;
    reserved_spots?: number;
    instructors?: {
      id?: string;
      profiles?: {
        first_name?: string;
        last_name?: string;
      };
    };
  } | null;
  scheduledDate: string;
  scheduledTime: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString: string) => {
  return timeString?.split('T')[1]?.split('.')[0]?.slice(0, 5) || timeString;
};

const getInstructorName = (course: any) => {
  if (course?.instructors?.profiles) {
    return `${course.instructors.profiles.first_name || ''} ${course.instructors.profiles.last_name || ''}`.trim();
  }
  return 'Istruttore non specificato';
};

const getDifficultyLabel = (level?: number) => {
  switch (level) {
    case 1: return 'Principiante';
    case 2: return 'Intermedio';
    case 3: return 'Avanzato';
    default: return 'Non specificato';
  }
};

export const BookingConfirmDialog = ({ 
  open, 
  onOpenChange, 
  course, 
  scheduledDate, 
  scheduledTime, 
  onConfirm, 
  isLoading 
}: BookingConfirmDialogProps) => {
  const { user } = useAuth();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [showCreditPurchaseDialog, setShowCreditPurchaseDialog] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [gymName, setGymName] = useState<string>('');
  const [loadingParticipants, setLoadingParticipants] = useState(true);

  useEffect(() => {
    if (!user || !open) return;

    const fetchUserCredits = async () => {
      try {
        // Get current credits
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_credits')
          .eq('user_id', user.id)
          .single();

        // Check for active unlimited subscription
        const { data: subscription } = await supabase
          .from('user_subscriptions')
          .select(`
            subscription_plans!inner(unlimited_access)
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .single();

        setUserCredits(profile?.current_credits || 0);
        setHasUnlimitedAccess(subscription?.subscription_plans?.unlimited_access || false);
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoadingCredits(false);
      }
    };

    const fetchParticipants = async () => {
      if (!course?.id) return;
      
      try {
        // Get course info with gym name
        const { data: courseData } = await supabase
          .from('courses')
          .select('gyms(name)')
          .eq('id', course.id)
          .single();
        
        setGymName(courseData?.gyms?.name || 'Palestra');

        // Get participants for this specific session
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            profiles(first_name, last_name)
          `)
          .eq('course_id', course.id)
          .eq('scheduled_date', scheduledDate)
          .eq('scheduled_time', scheduledTime)
          .eq('status', 'confirmed');

        setParticipants(bookingsData || []);
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchUserCredits();
    fetchParticipants();
  }, [user, open, course?.id, scheduledDate, scheduledTime]);

  const hasInsufficientCredits = !hasUnlimitedAccess && userCredits < (course?.credits_required || 1);

  const handleCreditPurchaseComplete = async () => {
    // Ricarica i crediti dopo l'acquisto
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_credits')
        .eq('user_id', user.id)
        .single();
      
      setUserCredits(profileData?.current_credits || 0);
    }
  };

  return (
    <>
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
            <h3 className="font-semibold text-foreground text-lg">{course?.name}</h3>
            
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
                <span>{getInstructorName(course)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <Calendar className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                <span>{gymName}</span>
              </div>

              {course?.max_participants && (
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                    <span>Partecipanti:</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${participants.length >= course.max_participants ? 'border-destructive text-destructive' : ''}`}>
                    {participants.length}/{course.max_participants}
                    {participants.length >= course.max_participants ? ' (Completo)' : ` (${course.max_participants - participants.length} liberi)`}
                  </Badge>
                </div>
              )}

              {course?.reserved_spots && course.reserved_spots > 0 && (
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                    <span>Posti riservati:</span>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {course?.reserved_spots} per abbonati
                  </Badge>
                </div>
              )}

              {course?.max_participants && course?.reserved_spots && (
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                    <span>Posti pubblici:</span>
                  </div>
                  <Badge variant="outline">
                    {(course?.max_participants || 0) - (course?.reserved_spots || 0)} disponibili
                  </Badge>
                </div>
              )}

              {course?.credits_required && (
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center">
                    <Coins className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                    <span>{course?.credits_required} crediti richiesti</span>
                  </div>
                  {!loadingCredits && (
                    <div className="text-right">
                      {hasUnlimitedAccess ? (
                        <Badge variant="default" className="text-xs">
                          Accesso Illimitato
                        </Badge>
                      ) : (
                         <Badge 
                           variant={userCredits >= (course?.credits_required || 1) ? "default" : "destructive"}
                           className="text-xs"
                         >
                          Hai {userCredits} crediti
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {course?.difficulty_level && (
                <div className="flex items-center text-muted-foreground">
                  <Award className="w-5 h-5 sm:w-4 sm:h-4 mr-3 sm:mr-2" />
                  <span>Livello: {getDifficultyLabel(course?.difficulty_level)}</span>
                </div>
              )}
            </div>
          </div>

          {participants.length > 0 && (
            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-foreground text-sm flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Partecipanti attuali ({participants.length}{course?.max_participants ? `/${course.max_participants}` : ''})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {participants.slice(0, 6).map((booking, index) => (
                  <div key={index} className="text-xs text-muted-foreground bg-background rounded p-2">
                    {booking.profiles?.first_name} {booking.profiles?.last_name}
                  </div>
                ))}
                {participants.length > 6 && (
                  <div className="text-xs text-muted-foreground bg-background rounded p-2 flex items-center justify-center">
                    +{participants.length - 6} altri
                  </div>
                )}
              </div>
              
              {course?.max_participants && participants.length >= course.max_participants - (course.reserved_spots || 0) && (
                <div className="flex items-center text-warning text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  <span>Corso quasi al completo!</span>
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
          <AlertDialogCancel className="w-full sm:w-auto text-base sm:text-sm h-12 sm:h-10">
            Annulla
          </AlertDialogCancel>
          
          {hasInsufficientCredits ? (
            <Button
              onClick={() => setShowCreditPurchaseDialog(true)}
              className="w-full sm:w-auto text-base sm:text-sm h-12 sm:h-10"
            >
              <Coins className="w-4 h-4 mr-2" />
              Acquista Crediti
            </Button>
          ) : (
            <AlertDialogAction 
              onClick={onConfirm}
              disabled={isLoading || loadingCredits}
              className="w-full sm:w-auto text-base sm:text-sm h-12 sm:h-10"
            >
              {isLoading ? "Confermando..." : "Conferma Prenotazione"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <CreditPurchaseDialog
      open={showCreditPurchaseDialog}
      onOpenChange={setShowCreditPurchaseDialog}
      courseName={course?.name || ''}
      coursePrice={course?.price_per_session}
      creditsNeeded={course?.credits_required || 1}
      onPurchaseComplete={handleCreditPurchaseComplete}
    />
    </>
  );
};