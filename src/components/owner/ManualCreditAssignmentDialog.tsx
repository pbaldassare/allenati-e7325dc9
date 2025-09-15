import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ManualCreditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  gymId: string;
  onSuccess?: () => void;
}

export function ManualCreditAssignmentDialog({
  open,
  onOpenChange,
  userId,
  userName,
  gymId,
  onSuccess,
}: ManualCreditAssignmentDialogProps) {
  const [credits, setCredits] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAssignCredits = async () => {
    const creditAmount = parseInt(credits);
    
    if (!creditAmount || creditAmount <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un numero di crediti valido",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Ottieni il bilancio attuale
      const { data: currentCredits } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .single();

      const currentBalance = currentCredits?.credits || 0;
      const newBalance = currentBalance + creditAmount;

      // Aggiungi crediti tramite transazione
      const { error } = await supabase
        .from('credits_transactions')
        .insert({
          user_id: userId,
          gym_id: gymId,
          amount: creditAmount,
          balance_after: newBalance,
          transaction_type: 'manual_assignment',
          description: reason || `Crediti assegnati manualmente da proprietario`,
        });

      if (error) throw error;

      toast({
        title: "Crediti assegnati",
        description: `${creditAmount} crediti assegnati a ${userName}`,
      });

      setCredits("");
      setReason("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning credits:', error);
      toast({
        title: "Errore",
        description: "Errore durante l'assegnazione dei crediti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assegna Crediti</DialogTitle>
          <DialogDescription>
            Assegna crediti manualmente a {userName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="credits" className="text-right">
              Crediti
            </Label>
            <Input
              id="credits"
              type="number"
              min="1"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="col-span-3"
              placeholder="Numero di crediti"
            />
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="reason" className="text-right pt-2">
              Motivo
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
              placeholder="Motivo dell'assegnazione (opzionale)"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annulla
          </Button>
          <Button
            onClick={handleAssignCredits}
            disabled={isLoading || !credits}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assegna Crediti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}