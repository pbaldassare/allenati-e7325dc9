import { useEffect } from 'react';
import { ArrowLeft, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useChat, ChatRoom as ChatRoomType } from '@/hooks/useChat';

interface ChatRoomProps {
  room: ChatRoomType;
  onBack: () => void;
}

export const ChatRoom = ({ room, onBack }: ChatRoomProps) => {
  const { 
    messages, 
    participants,
    fetchMessages, 
    fetchParticipants,
    sendMessage, 
    markAsRead 
  } = useChat();

  const roomMessages = messages[room.id] || [];
  const roomParticipants = participants[room.id] || [];

  useEffect(() => {
    if (room.id) {
      fetchMessages(room.id);
      fetchParticipants(room.id);
      markAsRead(room.id);
    }
  }, [room.id, fetchMessages, fetchParticipants, markAsRead]);

  const handleSendMessage = (content: string) => {
    sendMessage(room.id, content);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="md:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div>
              <h2 className="font-semibold">{room.name}</h2>
              {room.description && (
                <p className="text-sm text-muted-foreground">
                  {room.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{roomParticipants.length}</span>
            </div>
            
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ChatMessages messages={roomMessages} />
        <ChatInput onSendMessage={handleSendMessage} />
      </CardContent>
    </Card>
  );
};