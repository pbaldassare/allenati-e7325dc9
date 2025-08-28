import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export const PaymentVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const success = searchParams.get('success');
      
      if (!sessionId || success !== 'true') {
        navigate('/subscriptions');
        return;
      }

      try {
        console.log('Verifying payment for session:', sessionId);
        
        const { data, error } = await supabase.functions.invoke('verify-subscription-payment', {
          body: { sessionId }
        });

        if (error) throw error;

        if (data?.paid && data?.processed) {
          toast({
            title: "Pagamento completato!",
            description: data.type === 'subscription' 
              ? "Il tuo abbonamento è stato attivato con successo."
              : "I crediti sono stati aggiunti al tuo account.",
          });
        } else {
          toast({
            title: "Pagamento in elaborazione",
            description: "Il pagamento è in corso di elaborazione. Controlla tra qualche minuto.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast({
          title: "Errore nella verifica",
          description: "Si è verificato un errore durante la verifica del pagamento.",
          variant: "destructive",
        });
      } finally {
        // Redirect to appropriate page
        const from = searchParams.get('from');
        navigate(from === 'shop' ? '/shop' : '/subscriptions', { replace: true });
      }
    };

    verifyPayment();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold">Verifica del pagamento in corso...</h2>
        <p className="text-muted-foreground">Attendere qualche secondo</p>
      </div>
    </div>
  );
};