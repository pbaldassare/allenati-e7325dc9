import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Check, X } from 'lucide-react';
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

export const AIAssistant = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const { toast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: '👋 Ciao! Sono il tuo assistente AI intelligente! 🤖\n\n✨ **Posso aiutarti con:**\n• 📅 Prenotare e cancellare lezioni\n• 👥 Vedere partecipanti ai corsi\n• 💳 Gestire i tuoi crediti\n• 📊 Visualizzare le tue statistiche\n• 🔍 Informazioni dettagliate sui corsi\n• 👨‍🏫 Orari degli istruttori\n\n💬 **Cosa vorresti fare oggi?**',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingText, setTypingText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateTyping = (text: string, delay: number = 30) => {
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
  };

  const sendMessage = async (messageContent: string, retryCount: number = 0) => {
    if (!messageContent.trim() || isLoading) return;

    // Enhanced validation with detailed logging
    if (!user || !user.id) {
      console.error('❌ User validation failed:', { user: !!user, userId: user?.id });
      toast({
        title: "Errore",
        description: "Devi essere autenticato per usare l'AI Assistant.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedGym || !selectedGym.id) {
      console.error('❌ Gym validation failed:', { selectedGym: !!selectedGym, gymId: selectedGym?.id });
      toast({
        title: "Errore",
        description: "Seleziona una palestra per usare l'AI Assistant.",
        variant: "destructive"
      });
      return;
    }

    // Additional UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      console.error('❌ Invalid user ID format:', user.id);
      toast({
        title: "Errore",
        description: "ID utente non valido. Prova a fare il logout e login di nuovo.",
        variant: "destructive"
      });
      return;
    }

    if (!uuidRegex.test(selectedGym.id)) {
      console.error('❌ Invalid gym ID format:', selectedGym.id);
      toast({
        title: "Errore",
        description: "ID palestra non valido. Prova a selezionare nuovamente la palestra.",
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

    console.log('📤 Sending AI message (validated):', { 
      message: messageContent.substring(0, 50) + '...', 
      userId: user.id, 
      gymId: selectedGym.id,
      userType: typeof user.id,
      gymType: typeof selectedGym.id,
      retryCount 
    });

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Enhanced typing simulation with retry context
    const typingMessage = retryCount > 0 
      ? `Tentativo ${retryCount + 1}/3 - Elaborando...` 
      : 'Sto analizzando la tua richiesta...';
    simulateTyping(typingMessage);

    try {
      const requestPayload = {
        message: messageContent,
        user_id: user.id,
        gym_id: selectedGym.id,
        conversation_history: messages.slice(-5)
      };

      console.log('📤 Request payload validation:', {
        hasMessage: !!requestPayload.message,
        userIdValid: !!requestPayload.user_id && typeof requestPayload.user_id === 'string',
        gymIdValid: !!requestPayload.gym_id && typeof requestPayload.gym_id === 'string',
        historyLength: requestPayload.conversation_history?.length || 0
      });

      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: requestPayload
      });

      console.log('📥 Risposta AI ricevuta (raw):', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('❌ Errore API AI:', error);
        throw new Error(error.message || 'Errore nella comunicazione con l\'AI');
      }

      if (!data) {
        console.error('🚨 Nessun dato ricevuto dall\'AI');
        throw new Error('Nessuna risposta dall\'AI');
      }

      console.log('🔍 Analisi struttura dati ricevuti:', {
        hasResponse: !!data.response,
        hasMessage: !!data.message,
        hasActionRequired: !!data.actionRequired,
        dataKeys: Object.keys(data)
      });

      // Gestione migliorata delle risposte
      let aiMessage: AIMessage;
      
      if (data.response) {
        console.log('✅ Usando campo "response":', data.response.substring(0, 100) + '...');
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date(),
          actionRequired: data.actionRequired
        };
      } else if (data.message) {
        console.log('✅ Usando campo "message":', data.message.substring(0, 100) + '...');
        aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.message,
          timestamp: new Date(),
          actionRequired: data.actionRequired
        };
      } else {
        console.error('🚨 Formato risposta AI non riconosciuto:', JSON.stringify(data, null, 2));
        console.error('🔍 Campi disponibili:', Object.keys(data));
        throw new Error(`Formato risposta AI non valido. Campi ricevuti: ${Object.keys(data).join(', ')}`);
      }

      console.log('✅ Messaggio AI processato:', {
        id: aiMessage.id,
        contentLength: aiMessage.content.length,
        contentPreview: aiMessage.content.substring(0, 100) + '...',
        hasAction: !!aiMessage.actionRequired
      });
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      setTypingText('');
      console.error('💥 Complete error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : 'No stack',
        retryCount,
        maxRetries: 2
      });
      
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
      
      // Enhanced retry logic for 500 errors
      if ((errorMsg.includes('500') || errorMsg.includes('Internal server error')) && retryCount < 2) {
        console.log(`🔄 Retrying request (attempt ${retryCount + 1}/3) after server error`);
        
        // Show retry message
        setTypingText(`Riprovo... tentativo ${retryCount + 2}/3`);
        
        // Wait before retry (exponential backoff)
        const delay = (retryCount + 1) * 2000; // 2s, 4s delays
        setTimeout(() => {
          sendMessage(messageContent, retryCount + 1);
        }, delay);
        
        return; // Don't show error message yet
      }
      
      // Determine appropriate error message
      let toastMessage: string;
      if (errorMsg?.includes('Failed to fetch') || errorMsg?.includes('timeout')) {
        toastMessage = "L'AI sta impiegando più tempo del previsto. Riprova con una richiesta più semplice.";
      } else if (errorMsg?.includes('500') || errorMsg?.includes('Internal server error')) {
        toastMessage = retryCount >= 2 
          ? "Il servizio AI è temporaneamente non disponibile. Riprova tra qualche minuto."
          : "Si è verificato un errore del server. Riprovo automaticamente...";
      } else if (errorMsg?.includes('Invalid request parameters')) {
        toastMessage = "Parametri della richiesta non validi. Prova a rifare il login.";
      } else {
        toastMessage = `Si è verificato un errore: ${errorMsg}`;
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
  };

  const confirmAction = async (messageId: string, confirmed: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.actionRequired || !user || !selectedGym) {
      console.error('❌ Dati mancanti per conferma azione:', { 
        message: !!message, 
        actionRequired: !!message?.actionRequired,
        user: !!user, 
        selectedGym: !!selectedGym 
      });
      return;
    }

    console.log('🔄 Conferma azione:', { 
      messageId, 
      confirmed, 
      actionType: message.actionRequired.type,
      userId: user.id, 
      gymId: selectedGym.id 
    });

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

        console.log('📥 Risposta conferma azione:', { data, error });

        if (error) {
          console.error('❌ Errore API conferma azione:', error);
          throw new Error(error.message || 'Errore nella conferma dell\'azione');
        }

        if (!data) {
          throw new Error('Nessuna risposta per la conferma dell\'azione');
        }

        const confirmationMessage: AIMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: data.response || data.message || 'Azione completata!',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, confirmationMessage]);

        toast({
          title: "Azione completata",
          description: confirmationMessage.content
        });

      } catch (error) {
        console.error('💥 Errore completo conferma azione:', error);
        const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
        const errorMessage = errorMsg?.includes('Failed to fetch') || errorMsg?.includes('timeout')
          ? "L'operazione sta impiegando più tempo del previsto. Riprova."
          : `Errore nell'eseguire l'azione: ${errorMsg}`;
        
        toast({
          title: "Errore",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      toast({
        title: "Azione annullata",
        description: "L'azione è stata annullata."
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto p-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Assistente AI
            {selectedGym && (
              <Badge variant="outline" className="text-xs">
                {selectedGym.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type !== 'user' && (
                    <div className="flex-shrink-0">
                      {message.type === 'ai' ? (
                        <Bot className="h-8 w-8 p-1.5 bg-primary text-white rounded-full" />
                      ) : (
                        <div className="h-8 w-8 bg-muted rounded-full" />
                      )}
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.type === 'user'
                        ? 'bg-primary text-white'
                        : message.type === 'ai'
                        ? 'bg-muted'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    
                    {message.actionRequired && message.actionRequired.confirmed === undefined && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => confirmAction(message.id, true)}
                          className="flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Conferma
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => confirmAction(message.id, false)}
                          className="flex items-center gap-1"
                        >
                          <X className="h-3 w-3" />
                          Annulla
                        </Button>
                      </div>
                    )}
                    
                    {message.actionRequired?.confirmed === true && (
                      <Badge variant="default" className="mt-2">
                        Confermato
                      </Badge>
                    )}
                    
                    {message.actionRequired?.confirmed === false && (
                      <Badge variant="secondary" className="mt-2">
                        Annullato
                      </Badge>
                    )}
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 p-1.5 bg-primary text-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <Bot className="h-8 w-8 p-1.5 bg-primary text-white rounded-full" />
                  <div className="bg-muted rounded-lg p-3 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm font-medium">
                        {typingText || 'Sto pensando...'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      L'elaborazione può richiedere fino a 60 secondi
                    </p>
                    <div className="flex gap-1 mt-2">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="border-t p-4 space-y-3">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              {[
                "📅 Mostra corsi oggi",
                "💳 I miei crediti",
                "📊 Le mie statistiche",
                "🗓️ Prossime lezioni"
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => {
                    setInput(suggestion.substring(2)); // Remove emoji
                    sendMessage(suggestion.substring(2));
                  }}
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
            
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrivi qui la tua domanda..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Esempi:</strong> "Prenotami alla kickboxing di domani", "Dettagli corso BJJ", "Orari di Marco"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};