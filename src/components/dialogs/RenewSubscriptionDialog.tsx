import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CreditCard, RefreshCw } from "lucide-react";
import { format, addMonths } from "date-fns";
import { it } from "date-fns/locale";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
}

interface RenewSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: {
    id: string;
    user_id: string;
    plan_id: string;
    gym_id: string;
    status: string;
    starts_at: string;
    expires_at: string;
    activated_at?: string;
    receipt_number?: string;
    plan: {
      name: string;
      duration_days: number;
      credits_included: number;
      unlimited_access: boolean;
    };
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  onRenewed: () => void;
}

export const RenewSubscriptionDialog = ({
  isOpen,
  onClose,
  subscription,
  onRenewed,
}: RenewSubscriptionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState(subscription.plan_id);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [newExpiryDate, setNewExpiryDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setSelectedPlanId(subscription.plan_id);
      setStartDate(format(new Date(), "yyyy-MM-dd"));
      setNotes("");
    }
  }, [isOpen, subscription.plan_id]);

  useEffect(() => {
    calculateExpiryDate();
  }, [selectedPlanId, startDate, plans]);

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("gym_id", subscription.gym_id)
      .eq("is_active", true)
      .order("price", { ascending: true });

    if (error) {
      console.error("Error loading plans:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i piani disponibili",
        variant: "destructive",
      });
      return;
    }

    setPlans(data || []);
  };

  const calculateExpiryDate = () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan || !startDate) {
      setNewExpiryDate("");
      return;
    }

    const start = new Date(startDate);
    const durationMonths = Math.floor(selectedPlan.duration_days / 30);
    const expiry = addMonths(start, durationMonths);
    setNewExpiryDate(format(expiry, "yyyy-MM-dd"));
  };

  const handleRenew = async () => {
    if (!selectedPlanId || !startDate || !newExpiryDate) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi obbligatori",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const selectedPlan = plans.find((p) => p.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Piano non trovato");

      // 1. Save old subscription to history
      const { error: historyError } = await supabase
        .from("subscription_history")
        .insert({
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          gym_id: subscription.gym_id,
          status: subscription.status as any,
          starts_at: subscription.starts_at,
          expires_at: subscription.expires_at,
          activated_at: subscription.activated_at,
          renewed_at: new Date().toISOString(),
          renewed_by: user.id,
          receipt_number: subscription.receipt_number,
          notes: notes || `Rinnovato con piano: ${selectedPlan.name}`,
        } as any);

      if (historyError) throw historyError;

      // 2. Generate receipt number
      const { data: receiptData, error: receiptError } = await supabase
        .rpc("get_next_receipt_number", {
          _gym_id: subscription.gym_id,
        });

      if (receiptError) throw receiptError;

      // 3. Create new subscription (without affecting the old one)
      const { error: newSubError } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: subscription.user_id,
          plan_id: selectedPlanId,
          gym_id: subscription.gym_id,
          status: "active",
          starts_at: new Date(startDate).toISOString(),
          expires_at: new Date(newExpiryDate).toISOString(),
          activated_at: new Date().toISOString(),
          receipt_number: receiptData,
        });

      if (newSubError) throw newSubError;

      // 4. Add credits if plan includes them
      if (selectedPlan.credits_included > 0) {
        // Get current balance
        const { data: currentCredits } = await supabase
          .from("gym_credits")
          .select("credits")
          .eq("user_id", subscription.user_id)
          .eq("gym_id", subscription.gym_id)
          .single();

        const currentBalance = currentCredits?.credits || 0;
        const newBalance = currentBalance + selectedPlan.credits_included;

        // Create transaction
        const { error: txError } = await supabase
          .from("credits_transactions")
          .insert({
            user_id: subscription.user_id,
            gym_id: subscription.gym_id,
            amount: selectedPlan.credits_included,
            balance_after: newBalance,
            transaction_type: "subscription_renewal",
            description: `Rinnovo abbonamento - ${selectedPlan.name}`,
          });

        if (txError) throw txError;

        // Update gym credits
        await supabase
          .from("gym_credits")
          .upsert({
            user_id: subscription.user_id,
            gym_id: subscription.gym_id,
            credits: newBalance,
          });
      }

      toast({
        title: "Abbonamento rinnovato",
        description: `Abbonamento rinnovato con successo. ${selectedPlan.credits_included > 0 ? `Aggiunti ${selectedPlan.credits_included} crediti.` : ""}`,
      });

      onRenewed();
      onClose();
    } catch (error) {
      console.error("Error renewing subscription:", error);
      toast({
        title: "Errore",
        description: "Impossibile rinnovare l'abbonamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Rinnova Abbonamento
          </DialogTitle>
          <DialogDescription>
            Rinnova l'abbonamento di {subscription.user.first_name} {subscription.user.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Subscription Info */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <h3 className="font-semibold mb-2">Abbonamento Corrente</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Piano:</span>{" "}
                <span className="font-medium">{subscription.plan.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stato:</span>{" "}
                <span className="font-medium capitalize">{subscription.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Inizio:</span>{" "}
                <span className="font-medium">
                  {format(new Date(subscription.starts_at), "dd/MM/yyyy", { locale: it })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Scadenza:</span>{" "}
                <span className="font-medium">
                  {format(new Date(subscription.expires_at), "dd/MM/yyyy", { locale: it })}
                </span>
              </div>
            </div>
          </div>

          {/* New Subscription */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Nuovo Piano *</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona piano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => {
                    const months = Math.floor(plan.duration_days / 30);
                    return (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - €{plan.price} ({months} {months === 1 ? "mese" : "mesi"})
                        {plan.unlimited_access && " - Accesso Illimitato"}
                        {!plan.unlimited_access && plan.credits_included > 0 && ` - ${plan.credits_included} crediti`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inizio *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Scadenza</Label>
                <Input
                  type="date"
                  value={newExpiryDate}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border p-4 bg-primary/5">
                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-primary mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Riepilogo Nuovo Abbonamento</p>
                    <p className="text-muted-foreground mt-1">
                      Piano: <span className="font-medium text-foreground">{selectedPlan.name}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Durata: <span className="font-medium text-foreground">{Math.floor(selectedPlan.duration_days / 30)} {Math.floor(selectedPlan.duration_days / 30) === 1 ? "mese" : "mesi"}</span>
                    </p>
                    {selectedPlan.unlimited_access ? (
                      <p className="text-muted-foreground">
                        Tipo: <span className="font-medium text-foreground">Accesso Illimitato</span>
                      </p>
                    ) : (
                      <p className="text-muted-foreground">
                        Crediti inclusi: <span className="font-medium text-foreground">{selectedPlan.credits_included}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Note (opzionale)</Label>
              <Textarea
                id="notes"
                placeholder="Aggiungi eventuali note sul rinnovo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annulla
          </Button>
          <Button onClick={handleRenew} disabled={loading}>
            {loading ? "Rinnovo in corso..." : "Conferma Rinnovo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
