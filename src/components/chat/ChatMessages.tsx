import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ChatMessagesProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export const ChatMessages = ({ messages, loading }: ChatMessagesProps) => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-1/4 mb-2" />
              <div className="h-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Nessun messaggio ancora</p>
          <p className="text-sm text-muted-foreground">
            Inizia la conversazione inviando un messaggio!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isOwnMessage = message.user_id === user?.id;
        const showAvatar = !isOwnMessage && 
          (index === 0 || messages[index - 1].user_id !== message.user_id);
        const showName = !isOwnMessage && showAvatar;

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              isOwnMessage && "justify-end"
            )}
          >
            {!isOwnMessage && (
              <div className="flex-shrink-0">
                {showAvatar ? (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.user_profile?.profile_picture_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        message.user_profile?.first_name,
                        message.user_profile?.last_name
                      )}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8 h-8" />
                )}
              </div>
            )}

            <div className={cn(
              "flex flex-col max-w-[75%]",
              isOwnMessage && "items-end"
            )}>
              {showName && (
                <span className="text-sm font-medium text-muted-foreground mb-1">
                  {message.user_profile?.first_name} {message.user_profile?.last_name}
                </span>
              )}

              <Card className={cn(
                "inline-block",
                isOwnMessage 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted"
              )}>
                <CardContent className="p-3">
                  <p className="text-sm break-words">
                    {message.content}
                  </p>
                  
                  <div className={cn(
                    "flex items-center gap-2 mt-2 text-xs",
                    isOwnMessage 
                      ? "text-primary-foreground/70" 
                      : "text-muted-foreground"
                  )}>
                    <span>
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: it
                      })}
                    </span>
                    
                    {message.is_edited && (
                      <span>(modificato)</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {isOwnMessage && (
              <div className="flex-shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profile_picture_url} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user?.first_name, user?.last_name)}
                    </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};