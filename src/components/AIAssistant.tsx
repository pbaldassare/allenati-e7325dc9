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
      content: 'Ciao! Sono il tuo assistente AI. Posso aiutarti a prenotare lezioni, vedere chi partecipa ai corsi, controllare i tuoi crediti e molto altro. Cosa vorresti fare oggi?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: messageContent,
          user_id: user?.id,
          gym_id: selectedGym?.id,
          conversation_history: messages.slice(-10) // Last 10 messages for context
        }
      });

      if (error) throw error;

      const aiMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date(),
        actionRequired: data.actionRequired
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive"
      });

      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'system',
        content: 'Si è verificato un errore. Per favore riprova.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmAction = async (messageId: string, confirmed: boolean) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.actionRequired) return;

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
            user_id: user?.id,
            gym_id: selectedGym?.id
          }
        });

        if (error) throw error;

        const confirmationMessage: AIMessage = {
          id: Date.now().toString(),
          type: 'ai',
          content: data.response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, confirmationMessage]);

        toast({
          title: "Azione completata",
          description: data.response
        });

      } catch (error) {
        console.error('Error confirming action:', error);
        toast({
          title: "Errore",
          description: "Errore nell'eseguire l'azione. Riprova.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
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
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Sto pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="border-t p-4">
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
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Esempi: "Voglio prenotarmi alla kickboxing di domani", "Chi c'è nella lezione di BJJ?"
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};