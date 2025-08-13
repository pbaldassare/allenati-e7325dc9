import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const isMobile = useIsMobile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Scrivi un messaggio..."
        disabled={disabled}
        className={`flex-1 ${isMobile ? 'text-base' : ''}`}
        style={isMobile ? { fontSize: '16px' } : undefined} // Prevents zoom on iOS
      />
      <Button 
        type="submit" 
        disabled={!message.trim() || disabled}
        className={isMobile ? 'shrink-0 min-w-[44px] h-[44px]' : ''}
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};