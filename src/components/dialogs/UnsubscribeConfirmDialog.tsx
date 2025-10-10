import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserMinus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UnsubscribeConfirmDialogProps {
  participant: {
    id: string;
    user_id: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
    credits_used: number;
    scheduled_date: string;
    scheduled_time: string;
  };
  courseId: string;
  courseName: string;
  onUnsubscribeSuccess: () => void;
}

export const UnsubscribeConfirmDialog: React.FC<UnsubscribeConfirmDialogProps> = ({
  participant,
  courseId,
  courseName,
  onUnsubscribeSuccess
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleUnsubscribe = async () => {
    try {
      setLoading(true);
      
      // Calculate if refund is applicable (24h before session)
      const scheduledDateTime = new Date(`${participant.scheduled_date}T${participant.scheduled_time}`);
      const now = new Date();
      const hoursUntilSession = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const isRefundable = hoursUntilSession > 24;

      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || 'Rimosso da amministratore'
        })
        .eq('id', participant.id);

      if (bookingError) throw bookingError;

      // If refundable, add credits back
      if (isRefundable && participant.credits_used > 0) {
        // Get course gym_id
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('gym_id')
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;

        // Get current gym credits
        const { data: gymCreditsData, error: gymCreditsError } = await supabase
          .from('gym_credits')
          .select('credits')
          .eq('user_id', participant.user_id)
          .eq('gym_id', courseData.gym_id)
          .single();

        // Gestisci il caso in cui il record non esiste (PGRST116)
        if (gymCreditsError && gymCreditsError.code !== 'PGRST116') {
          throw gymCreditsError;
        }

        const currentCredits = gymCreditsData?.credits || 0;
        const newBalance = currentCredits + participant.credits_used;

        // Update gym credits con upsert per creare il record se non esiste
        const { error: creditsError } = await supabase
          .from('gym_credits')
          .upsert({
            user_id: participant.user_id,
            gym_id: courseData.gym_id,
            credits: newBalance
          }, {
            onConflict: 'user_id,gym_id'
          });

        if (creditsError) throw creditsError;

        // Add transaction record
        const { error: transactionError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: participant.user_id,
            gym_id: courseData.gym_id,
            amount: participant.credits_used,
            balance_after: newBalance,
            transaction_type: 'refund',
            description: `Rimborso per cancellazione corso: ${courseName}`,
            reference_id: participant.id
          });

        if (transactionError) throw transactionError;
      }

      toast({
        title: 'Partecipante rimosso',
        description: `${participant.user.first_name} ${participant.user.last_name} è stato rimosso dal corso${isRefundable ? ' e i crediti sono stati rimborsati' : ''}.`,
      });

      setOpen(false);
      setReason('');
      onUnsubscribeSuccess();
    } catch (error) {
      console.error('Error unsubscribing participant:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile rimuovere il partecipante',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rimuovi Partecipante</DialogTitle>
          <DialogDescription>
            Stai per rimuovere <strong>{participant.user.first_name} {participant.user.last_name}</strong> dal corso <strong>{courseName}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>Email:</strong> {participant.user.email}</p>
            <p><strong>Data lezione:</strong> {new Date(participant.scheduled_date).toLocaleDateString('it-IT')} alle {participant.scheduled_time.slice(0, 5)}</p>
            <p><strong>Crediti utilizzati:</strong> {participant.credits_used}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (opzionale)</Label>
            <Textarea
              id="reason"
              placeholder="Inserisci il motivo della rimozione..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Se la cancellazione avviene più di 24 ore prima della lezione, 
              i crediti verranno automaticamente rimborsati al partecipante.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={handleUnsubscribe} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Rimuovi Partecipante
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};