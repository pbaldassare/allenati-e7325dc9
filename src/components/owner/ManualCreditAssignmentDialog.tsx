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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Calendar, Plus, Minus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [addCredits, setAddCredits] = useState("");
  const [removeCredits, setRemoveCredits] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    type: 'add' | 'remove';
    amount: number;
    reason: string;
  } | null>(null);
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

  const validateAndPrepareOperation = (type: 'add' | 'remove') => {
    const amountStr = type === 'add' ? addCredits : removeCredits;
    const amount = parseInt(amountStr);
    
    // Validazione input base
    if (!amountStr || isNaN(amount) || amount <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un numero valido maggiore di 0",
        variant: "destructive",
      });
      return;
    }

    // Validazione limite massimo per singola operazione
    if (amount > 100) {
      toast({
        title: "Errore",
        description: "Non è possibile assegnare più di 100 crediti in una singola operazione",
        variant: "destructive",
      });
      return;
    }

    // Validazione motivo obbligatorio per operazioni >= 10 crediti
    if (amount >= 10 && !reason.trim()) {
      toast({
        title: "Motivo richiesto",
        description: "Per operazioni di 10 o più crediti è necessario specificare un motivo",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = userInfo?.currentCredits || 0;
    
    // Validazione specifica per rimozione
    if (type === 'remove') {
      if (amount > currentBalance) {
        toast({
          title: "Errore",
          description: `Impossibile rimuovere ${amount} crediti. L'utente ha solo ${currentBalance} crediti disponibili.`,
          variant: "destructive",
        });
        return;
      }
    }

    // Prepara operazione
    const operation = {
      type,
      amount,
      reason: reason.trim() || `${type === 'add' ? 'Aggiunta' : 'Rimozione'} manuale crediti da proprietario`,
    };

    // Se è rimozione o operazione >= 20 crediti, richiedi conferma
    if (type === 'remove' || amount >= 20) {
      setPendingOperation(operation);
      setShowConfirmDialog(true);
    } else {
      executeOperation(operation);
    }
  };

  const executeOperation = async (operation: { type: 'add' | 'remove'; amount: number; reason: string }) => {
    setIsLoading(true);
    setShowConfirmDialog(false);
    
    try {
      const currentBalance = userInfo?.currentCredits || 0;
      const creditAmount = operation.type === 'add' ? operation.amount : -operation.amount;
      const newBalance = currentBalance + creditAmount;

      // Doppio controllo per evitare saldi negativi
      if (newBalance < 0) {
        throw new Error(`Operazione non valida: saldo risultante sarebbe negativo (${newBalance})`);
      }

      const { error } = await supabase
        .from('credits_transactions')
        .insert({
          user_id: userId,
          gym_id: gymId,
          amount: creditAmount,
          balance_after: newBalance,
          transaction_type: 'manual_assignment',
          description: operation.reason,
        });

      if (error) throw error;

      const actionText = operation.type === 'add' ? "aggiunti" : "rimossi";
      toast({
        title: "Operazione completata",
        description: `${operation.amount} crediti ${actionText} ${operation.type === 'add' ? "a" : "da"} ${userName}`,
      });

      // Reset form
      setAddCredits("");
      setRemoveCredits("");
      setReason("");
      setPendingOperation(null);
      onOpenChange(false);
      onSuccess?.();
      
      // Aggiorna le info utente
      fetchUserInfo();
    } catch (error) {
      console.error('Error processing credits:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore durante l'operazione sui crediti",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNewBalance = (type: 'add' | 'remove') => {
    const amountStr = type === 'add' ? addCredits : removeCredits;
    const amount = parseInt(amountStr);
    const currentBalance = userInfo?.currentCredits || 0;
    
    if (isNaN(amount) || amount <= 0) return currentBalance;
    
    return type === 'add' ? currentBalance + amount : currentBalance - amount;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gestione Crediti</DialogTitle>
            <DialogDescription>
              Gestisci i crediti di {userName} con controlli di sicurezza
            </DialogDescription>
          </DialogHeader>
          
          {/* Informazioni utente */}
          {isLoadingInfo ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Caricamento informazioni...</span>
            </div>
          ) : userInfo && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <CardTitle className="text-sm">Stato Attuale</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Crediti disponibili:</span>
                  <Badge variant="secondary" className="font-mono text-lg">
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
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="add" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="add" className="text-green-600">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi
              </TabsTrigger>
              <TabsTrigger value="remove" className="text-red-600">
                <Minus className="h-4 w-4 mr-2" />
                Rimuovi
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-600">Aggiungi Crediti</CardTitle>
                  <CardDescription>
                    Assegna crediti aggiuntivi all'utente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-credits">Numero di crediti da aggiungere</Label>
                    <Input
                      id="add-credits"
                      type="number"
                      min="1"
                      max="100"
                      value={addCredits}
                      onChange={(e) => setAddCredits(e.target.value)}
                      placeholder="Es: 5"
                    />
                  </div>
                  
                  {addCredits && !isNaN(parseInt(addCredits)) && parseInt(addCredits) > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm text-green-800">
                        <strong>Anteprima:</strong> {userInfo?.currentCredits || 0} + {parseInt(addCredits)} = {calculateNewBalance('add')} crediti
                      </div>
                    </div>
                  )}
                  
                  <Button
                    onClick={() => validateAndPrepareOperation('add')}
                    disabled={!addCredits || isLoading || isLoadingInfo}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Plus className="mr-2 h-4 w-4" />
                    Aggiungi {addCredits} Crediti
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="remove" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-red-600">Rimuovi Crediti</CardTitle>
                  <CardDescription>
                    Sottrai crediti dall'utente (richiede conferma)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="remove-credits">Numero di crediti da rimuovere</Label>
                    <Input
                      id="remove-credits"
                      type="number"
                      min="1"
                      max={userInfo?.currentCredits || 0}
                      value={removeCredits}
                      onChange={(e) => setRemoveCredits(e.target.value)}
                      placeholder="Es: 3"
                    />
                  </div>
                  
                  {removeCredits && !isNaN(parseInt(removeCredits)) && parseInt(removeCredits) > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-sm text-red-800">
                        <strong>Anteprima:</strong> {userInfo?.currentCredits || 0} - {parseInt(removeCredits)} = {calculateNewBalance('remove')} crediti
                      </div>
                      {calculateNewBalance('remove') < 0 && (
                        <div className="text-sm text-red-600 font-medium mt-1">
                          ⚠️ Operazione non valida: saldo risultante negativo
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    onClick={() => validateAndPrepareOperation('remove')}
                    disabled={!removeCredits || isLoading || isLoadingInfo || calculateNewBalance('remove') < 0}
                    variant="destructive"
                    className="w-full"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Minus className="mr-2 h-4 w-4" />
                    Rimuovi {removeCredits} Crediti
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Campo motivo condiviso */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Motivo {(addCredits && parseInt(addCredits) >= 10) || (removeCredits && parseInt(removeCredits) >= 10) ? '(obbligatorio)' : '(opzionale)'}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descrivi il motivo dell'operazione..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma per operazioni sensibili */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Conferma Operazione
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div>
                Stai per <strong>{pendingOperation?.type === 'add' ? 'aggiungere' : 'rimuovere'}</strong> <strong>{pendingOperation?.amount} crediti</strong> {pendingOperation?.type === 'add' ? 'a' : 'da'} <strong>{userName}</strong>.
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm">
                  <div>Saldo attuale: <strong>{userInfo?.currentCredits || 0} crediti</strong></div>
                  <div>Saldo risultante: <strong>
                    {pendingOperation?.type === 'add' 
                      ? (userInfo?.currentCredits || 0) + (pendingOperation?.amount || 0)
                      : (userInfo?.currentCredits || 0) - (pendingOperation?.amount || 0)
                    } crediti</strong>
                  </div>
                </div>
              </div>
              
              {pendingOperation?.reason && (
                <div>
                  <strong>Motivo:</strong> {pendingOperation.reason}
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                Questa operazione verrà registrata e non può essere annullata automaticamente.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingOperation && executeOperation(pendingOperation)}
              disabled={isLoading}
              className={pendingOperation?.type === 'remove' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Conferma {pendingOperation?.type === 'add' ? 'Aggiunta' : 'Rimozione'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}