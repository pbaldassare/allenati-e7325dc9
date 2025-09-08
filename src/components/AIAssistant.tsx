import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Loader2, Check, X } from 'lucide-react';
import { useGym } from '@/contexts/GymContext';
import { useAIAssistant } from '@/hooks/useAIAssistant';

export const AIAssistant = () => {
  const { selectedGym } = useGym();
  const { messages, isLoading, typingText, sendMessage, confirmAction } = useAIAssistant();
  const [input, setInput] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
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
                         {typingText || '🤔 Sto pensando...'}
                       </span>
                    </div>
                     <p className="text-xs text-muted-foreground mt-1">
                       {typingText.includes('Riprovo') ? 'Nuovo tentativo in corso...' : 'Risposta ottimizzata e velocizzata'}
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