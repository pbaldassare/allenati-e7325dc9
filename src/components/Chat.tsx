import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChatRoomsList } from './chat/ChatRoomsList';
import { ChatRoom } from './chat/ChatRoom';
import { useChat } from '@/hooks/useChat';

export const Chat = () => {
  const { chatRooms, loading } = useChat();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const handleBack = () => {
    setSelectedRoomId(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Mobile: Show either room list or chat room */}
      <div className="md:hidden h-full">
        {selectedRoom ? (
          <ChatRoom room={selectedRoom} onBack={handleBack} />
        ) : (
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <ChatRoomsList
                rooms={chatRooms}
                selectedRoomId={selectedRoomId || undefined}
                onRoomSelect={handleRoomSelect}
                loading={loading}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop: Show both side by side */}
      <div className="hidden md:flex h-full gap-4">
        <div className="w-80 flex-shrink-0">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <ChatRoomsList
                rooms={chatRooms}
                selectedRoomId={selectedRoomId || undefined}
                onRoomSelect={handleRoomSelect}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex-1">
          {selectedRoom ? (
            <ChatRoom room={selectedRoom} onBack={handleBack} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Seleziona una chat per iniziare la conversazione
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};