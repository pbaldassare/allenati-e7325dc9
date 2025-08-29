import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { repairCoursesWithoutSessions } from '@/lib/sessionGenerator';
import { Wrench, Loader2 } from 'lucide-react';

export const RepairCoursesButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRepair = async () => {
    setLoading(true);
    try {
      const result = await repairCoursesWithoutSessions();
      
      if (result.repaired > 0) {
        toast({
          title: 'Riparazione completata',
          description: `Generati sessioni per ${result.repaired} corsi`,
        });
      } else {
        toast({
          title: 'Nessuna riparazione necessaria',
          description: 'Tutti i corsi hanno già le loro sessioni',
        });
      }
      
      if (result.errors.length > 0) {
        console.error('Errori durante la riparazione:', result.errors);
        toast({
          title: 'Riparazione parziale',
          description: `Completata con ${result.errors.length} errori. Vedi console per dettagli.`,
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('Error repairing courses:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la riparazione dei corsi',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleRepair} 
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wrench className="h-4 w-4" />
      )}
      Ripara Sessioni Mancanti
    </Button>
  );
};