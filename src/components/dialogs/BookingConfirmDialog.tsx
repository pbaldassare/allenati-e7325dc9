import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, Clock, Award, Coins } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditPurchaseDialog } from './CreditPurchaseDialog';
import { useGym } from '@/contexts/GymContext';
import { getUserGymCredits } from '@/lib/bookingHelpers';
import { hasActiveUnlimitedSubscription } from '@/lib/subscriptionHelpers';

interface BookingConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id?: string;
    name?: string;
    description?: string;
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
  sessionId?: string;
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
  sessionId,
  onConfirm, 
  isLoading 
}: BookingConfirmDialogProps) => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const [userCredits, setUserCredits] = useState<number>(0);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [showCreditPurchaseDialog, setShowCreditPurchaseDialog] = useState(false);
  const [gymName, setGymName] = useState<string>('');

  useEffect(() => {
    if (!user || !open || !selectedGym) return;

    const fetchUserCredits = async () => {
      try {
        // Get gym-specific credits
        const gymCredits = await getUserGymCredits(user.id, selectedGym.id);
        
        // Check for unlimited subscription for this gym
        const unlimited = await hasActiveUnlimitedSubscription(user.id, selectedGym.id);

        setUserCredits(gymCredits);
        setHasUnlimitedAccess(unlimited);
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoadingCredits(false);
      }
    };

    const fetchGymName = async () => {
      if (!course?.id) return;
      
      try {
        // Get course info with gym name
        const { data: courseData } = await supabase
          .from('courses')
          .select('gyms(name)')
          .eq('id', course.id)
          .single();
        
        setGymName(courseData?.gyms?.name || 'Palestra');
      } catch (error) {
        console.error('Error fetching gym name:', error);
      }
    };

    fetchUserCredits();
    fetchGymName();
  }, [user, open, selectedGym, course?.id, scheduledDate, scheduledTime, sessionId]);

  const hasInsufficientCredits = !hasUnlimitedAccess && userCredits < (course?.credits_required || 1);

  const handleCreditPurchaseComplete = async () => {
    // Ricarica i crediti specifici per palestra dopo l'acquisto
    if (user && selectedGym) {
      const gymCredits = await getUserGymCredits(user.id, selectedGym.id);
      setUserCredits(gymCredits);
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

        <div className="space-y-3">
          <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-3">
            <h3 className="font-semibold text-foreground text-base">{course?.name}</h3>
            {course?.description && (
              <p className="text-sm text-muted-foreground">{course.description}</p>
            )}
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                <span className="font-medium">{formatDate(scheduledDate)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <Clock className="w-4 h-4 mr-2" />
                <span className="font-medium">{formatTime(scheduledTime)}</span>
              </div>
              
              <div className="flex items-center text-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{gymName}</span>
              </div>

              {course?.credits_required && (
                <div className="flex items-center justify-between text-foreground">
                  <div className="flex items-center">
                    <Coins className="w-4 h-4 mr-2" />
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
                  <Award className="w-4 h-4 mr-2" />
                  <span>Livello: {getDifficultyLabel(course?.difficulty_level)}</span>
                </div>
              )}
            </div>
          </div>
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