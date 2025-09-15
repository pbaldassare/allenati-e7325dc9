import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Gift } from "lucide-react";

export const AssignWelcomeCreditsButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAssignCredits = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('assign-welcome-credits');
      
      if (error) {
        console.error('Error assigning welcome credits:', error);
        toast.error('Errore durante l\'assegnazione dei crediti');
        return;
      }

      if (data.success) {
        toast.success(
          `Crediti di benvenuto assegnati con successo! ${data.processed} utenti aggiornati.`
        );
      } else {
        toast.error(data.error || 'Errore durante l\'assegnazione dei crediti');
      }
    } catch (error) {
      console.error('Error calling assign-welcome-credits function:', error);
      toast.error('Errore di connessione');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleAssignCredits}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      <Gift className="h-4 w-4" />
      {isLoading ? 'Assegnando...' : 'Assegna Crediti di Benvenuto Retroattivi'}
    </Button>
  );
};