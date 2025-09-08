import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';

interface AIMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  actionRequired?: {
    type: 'booking' | 'cancellation';
    data: any;
    confirmed?: boolean;
  };
}

export const useAIAssistant = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Ciao! Sono il tuo assistente AI! Posso aiutarti con prenotazioni, crediti e informazioni sui corsi. Cosa vorresti fare oggi?',
      timestamp: new Date()
    }
  ]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [typingText, setTypingText] = useState('');

  const simulateTyping = useCallback((text: string, delay: number = 30) => {
    setTypingText('');
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setTypingText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setTimeout(() => setTypingText(''), 500);
      }
    }, delay);
  }, []);

  const sendMessage = useCallback(async (messageContent: string, retryCount: number = 0) => {
    if (!messageContent.trim() || isLoading) return;

    // Validation
    if (!user?.id || !selectedGym?.id) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato e selezionare una palestra.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Progressive typing indicators
    const typingMessage = retryCount > 0 
      ? `🔄 Tentativo ${retryCount + 1}/3...` 
      : '🤔 Elaborando la tua richiesta...';
    simulateTyping(typingMessage);

    try {
      const requestPayload = {
        message: messageContent.substring(0, 500),
        user_id: user.id,
        gym_id: selectedGym.id,
        conversation_history: messages.slice(-2).map(msg => ({
          type: msg.type,
          content: msg.content.substring(0, 150)
        }))
      };

      // Extended timeout with proper error handling
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 45000)
      );

      const requestPromise = supabase.functions.invoke('ai-assistant', {
        body: requestPayload
      });

      const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ AI API Error:', error);
        throw new Error(error.message || 'Errore nella comunicazione con l\'AI');
      }

      if (!data) {
        throw new Error('Nessuna risposta dall\'AI');
      }

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || data.message || 'Mi dispiace, non ho potuto elaborare la tua richiesta.',
        timestamp: new Date(),
        actionRequired: data.actionRequired
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      setTypingText('');
      
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
      
      // Smart retry logic
      const shouldRetry = (
        (errorMsg.includes('500') || errorMsg.includes('timeout') || 
         errorMsg.includes('network') || errorMsg.includes('AbortError')) && 
        retryCount < 2
      );
      
      if (shouldRetry) {
        console.log(`🔄 Smart retry (${retryCount + 1}/3):`, errorMsg.substring(0, 50));
        
        const delay = Math.min((retryCount + 1) * 1500, 5000);
        setTypingText(`🔄 Riprovo tra ${delay/1000} secondi...`);
        
        setTimeout(() => {
          sendMessage(messageContent, retryCount + 1);
        }, delay);
        
        return;
      }
      
      // User-friendly error handling
      let toastMessage: string;
      if (errorMsg.includes('timeout') || errorMsg.includes('AbortError')) {
        toastMessage = "L'AI sta impiegando troppo tempo. Prova con una domanda più semplice.";
      } else if (errorMsg.includes('500')) {
        toastMessage = "Servizio AI temporaneamente non disponibile. Riprova tra qualche minuto.";
      } else if (errorMsg.includes('network')) {
        toastMessage = "Problema di connessione. Controlla la tua connessione internet.";
      } else {
        toastMessage = "Errore imprevisto. Riprova o contatta il supporto.";
      }
      
      toast({
        title: "Errore AI",
        description: toastMessage,
        variant: "destructive"
      });

      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: toastMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTypingText('');
    }
  }, [user, selectedGym, messages, isLoading, toast, simulateTyping]);

  const confirmAction = useCallback(async (messageId: string, confirmed: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.actionRequired || !user || !selectedGym) return;

    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, actionRequired: { ...m.actionRequired!, confirmed } }
        : m
    ));

    if (confirmed) {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('ai-assistant', {
          body: {
            confirmAction: true,
            actionType: message.actionRequired.type,
            actionData: message.actionRequired.data,
            user_id: user.id,
            gym_id: selectedGym.id
          }
        });

        if (error) throw new Error(error.message);

        const confirmationMessage: AIMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: data?.response || data?.message || 'Azione completata!',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, confirmationMessage]);

        toast({
          title: "✅ Azione completata",
          description: confirmationMessage.content
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
        toast({
          title: "❌ Errore",
          description: `Errore nell'eseguire l'azione: ${errorMsg}`,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({
        title: "❌ Azione annullata",
        description: "L'azione è stata annullata."
      });
    }
  }, [messages, user, selectedGym, toast]);

  return {
    messages,
    isLoading,
    typingText,
    sendMessage,
    confirmAction
  };
};