import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

interface Message {
  id: string;
  content: string;
  user_id: string;
  sender_name: string;
  created_at: string;
  is_from_staff: boolean;
  avatar_url?: string;
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwnMessage }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn(
      "flex gap-3 max-w-[85%]",
      isOwnMessage ? "ml-auto flex-row-reverse" : "mr-auto"
    )}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={message.avatar_url} alt={message.sender_name} />
        <AvatarFallback className="text-xs">
          {getInitials(message.sender_name)}
        </AvatarFallback>
      </Avatar>
      
      {/* Message Content */}
      <div className={cn(
        "flex flex-col gap-1",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Header with name, badge, and time */}
        <div className={cn(
          "flex items-center gap-2 text-xs",
          isOwnMessage ? "flex-row-reverse" : ""
        )}>
          <span className="font-medium text-foreground">
            {message.sender_name}
          </span>
          {message.is_from_staff && (
            <Badge variant="secondary" className="text-[0.6rem] px-1 py-0">
              Staff
            </Badge>
          )}
          <span className="text-muted-foreground">
            {format(new Date(message.created_at), 'HH:mm', { locale: it })}
          </span>
        </div>
        
        {/* Message bubble */}
        <div className={cn(
          "rounded-lg px-3 py-2 text-sm break-words",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm"
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
};