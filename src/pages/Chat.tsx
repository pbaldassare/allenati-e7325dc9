import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'gym_general' | 'course' | 'direct';
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
  participant_count?: number;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const isMobile = useIsMobile();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showChatList, setShowChatList] = useState(true);

  useEffect(() => {
    if (user && selectedGym) {
      loadChatRooms();
    }
  }, [user, selectedGym]);

  const loadChatRooms = async (retry = 0) => {
    try {
      setLoading(true);
      
      if (!selectedGym?.id) {
        setChatRooms([]);
        return;
      }

      const { data: rooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          description,
          room_type,
          gym_id,
          course_id,
          is_active
        `)
        .eq('is_active', true)
        .eq('gym_id', selectedGym.id);

      if (roomsError) throw roomsError;

      const filteredRooms = rooms || [];
      
      setChatRooms(filteredRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        room_type: room.room_type as 'gym_general' | 'course' | 'direct'
      })));

      // Auto-select first room only on desktop
      if (filteredRooms.length > 0 && !selectedRoomId && !isMobile) {
        setSelectedRoomId(filteredRooms[0].id);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      // Retry silenzioso (max 2) per errori transitori durante switch tab
      if (retry < 2) {
        setTimeout(() => { loadChatRooms(retry + 1).catch(() => {}); }, 800);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);

  const handleSelectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
    if (isMobile) {
      setShowChatList(false);
    }
  };

  const handleBackToList = () => {
    setShowChatList(true);
    if (isMobile) {
      setSelectedRoomId(undefined);
    }
  };

  // Mobile: show either chat list OR chat window
  if (isMobile) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        {showChatList ? (
          <div className="flex-1 flex flex-col pb-20">
            <div className="p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
              <h1 className="text-2xl font-bold">Chat</h1>
              <p className="text-muted-foreground">
                Comunica con la tua palestra
              </p>
            </div>
            <div className="flex-1 p-4">
              <ChatList
                chatRooms={chatRooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={handleSelectRoom}
                loading={loading}
              />
            </div>
          </div>
        ) : selectedRoom ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-background/80 backdrop-blur-sm flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{selectedRoom.name}</h3>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ChatWindow
                roomId={selectedRoom.id}
                roomName={selectedRoom.name}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-muted-foreground">
              <p>Seleziona una chat per iniziare</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Chat</h1>
          <p className="text-muted-foreground">
            Comunica con la tua palestra
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Le tue chat</h2>
            <ChatList
              chatRooms={chatRooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleSelectRoom}
              loading={loading}
            />
          </div>

          <div className="lg:col-span-2">
            {loading ? (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                <div className="text-center text-muted-foreground">
                  <p>Caricamento chat...</p>
                </div>
              </div>
            ) : chatRooms.length === 0 ? (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                <div className="text-center text-muted-foreground">
                  <p className="mb-2">Nessuna chat disponibile</p>
                  <p className="text-sm">Assicurati di essere registrato in una palestra per accedere alle chat</p>
                </div>
              </div>
            ) : selectedRoom ? (
              <ChatWindow
                roomId={selectedRoom.id}
                roomName={selectedRoom.name}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                <div className="text-center text-muted-foreground">
                  <p>Seleziona una chat per iniziare</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};