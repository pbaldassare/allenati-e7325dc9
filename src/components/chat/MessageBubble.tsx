import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface Message {
  id: string;
  content: string;
  user_id: string;
  sender_name: string;
  created_at: string;
  is_from_staff: boolean;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  return (
    <div className={cn(
      "flex flex-col gap-1",
      isOwnMessage ? "items-end" : "items-start"
    )}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {message.sender_name}
        </span>
        {message.is_from_staff && (
          <Badge variant="secondary" className="text-xs">
            Staff
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.created_at), 'HH:mm', { locale: it })}
        </span>
      </div>
      
      <div className={cn(
        "max-w-[70%] rounded-lg px-3 py-2 text-sm",
        isOwnMessage
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        {message.content}
      </div>
    </div>
  );
};