import { useState, useEffect } from "react";
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
import { Loader2, CreditCard, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ManualCreditAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  gymId: string;
  onSuccess?: () => void;
}

interface UserInfo {
  currentCredits: number;
  activeSubscription?: {
    name: string;
    expires_at: string;
    unlimited_access: boolean;
    credits_included: number;
  };
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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const { toast } = useToast();

  const fetchUserInfo = async () => {
    if (!open || !userId || !gymId) return;
    
    setIsLoadingInfo(true);
    try {
      // Fetch crediti disponibili
      const { data: creditsData } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .maybeSingle();

      // Fetch active subscription
      const { data: subscriptionData } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans!inner(name, unlimited_access, credits_included)
        `)
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      setUserInfo({
        currentCredits: creditsData?.credits || 0,
        activeSubscription: subscriptionData ? {
          name: subscriptionData.subscription_plans.name,
          expires_at: subscriptionData.expires_at,
          unlimited_access: subscriptionData.subscription_plans.unlimited_access,
          credits_included: subscriptionData.subscription_plans.credits_included,
        } : undefined,
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento delle informazioni utente",
        variant: "destructive",
      });
    } finally {
      setIsLoadingInfo(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [open, userId, gymId]);

  const handleAssignCredits = async () => {
    const creditAmount = parseInt(credits);
    
    if (isNaN(creditAmount) || creditAmount === 0) {
      toast({
        title: "Errore",
        description: "Inserisci un numero valido (positivo per aggiungere, negativo per sottrarre)",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = userInfo?.currentCredits || 0;
    const newBalance = currentBalance + creditAmount;

    // Evita saldi negativi
    if (newBalance < 0) {
      toast({
        title: "Errore",
        description: `Impossibile sottrarre ${Math.abs(creditAmount)} crediti. L'utente ha solo ${currentBalance} crediti disponibili.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {

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

      const actionText = creditAmount > 0 ? "aggiunti" : "sottratti";
      toast({
        title: "Operazione completata",
        description: `${Math.abs(creditAmount)} crediti ${actionText} ${creditAmount > 0 ? "a" : "da"} ${userName}`,
      });

      setCredits("");
      setReason("");
      onOpenChange(false);
      onSuccess?.();
      // Aggiorna le info utente
      fetchUserInfo();
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
        
        {/* Informazioni utente */}
        {isLoadingInfo ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Caricamento informazioni...</span>
          </div>
        ) : userInfo && (
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">Stato Attuale</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Crediti disponibili:</span>
                <Badge variant="secondary" className="font-mono">
                  {userInfo.currentCredits}
                </Badge>
              </div>
              
              {userInfo.activeSubscription ? (
                <>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Abbonamento:</span>
                    <Badge variant={userInfo.activeSubscription.unlimited_access ? "default" : "outline"}>
                      {userInfo.activeSubscription.name}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Scadenza:</span>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {new Date(userInfo.activeSubscription.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                  {userInfo.activeSubscription.unlimited_access && (
                    <div className="text-sm text-green-600 font-medium">
                      🎯 Accesso illimitato attivo
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Separator />
                  <div className="text-sm text-muted-foreground">
                    Nessun abbonamento attivo
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="credits" className="text-right">
              Crediti
            </Label>
            <Input
              id="credits"
              type="number"
              value={credits}
              onChange={(e) => setCredits(e.target.value)}
              className="col-span-3"
              placeholder="Es: 5 (aggiungi) o -3 (sottrai)"
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
              placeholder="Motivo dell'operazione (opzionale)"
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
            disabled={isLoading || !credits || isLoadingInfo}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {parseInt(credits) > 0 ? "Aggiungi Crediti" : parseInt(credits) < 0 ? "Sottrai Crediti" : "Modifica Crediti"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}