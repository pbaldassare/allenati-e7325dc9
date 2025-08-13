import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      
      // Get user's gym chat rooms through their membership
      const { data, error } = await supabase
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
        .eq('is_active', true);

      if (error) throw error;

      // Filter rooms based on user's gym membership
      const { data: membership, error: membershipError } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        throw membershipError;
      }

      let filteredRooms = data || [];
      
      if (membership?.gym_id) {
        filteredRooms = data?.filter(room => 
          room.gym_id === membership.gym_id || room.gym_id === null
        ) || [];
      }

      setChatRooms(filteredRooms.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        room_type: room.room_type as 'gym_general' | 'course' | 'direct'
      })));

      // Auto-select first room
      if (filteredRooms.length > 0 && !selectedRoomId) {
        setSelectedRoomId(filteredRooms[0].id);
      }
    } catch (error) {
      console.error('Error loading chat rooms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le chat',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);

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
              onSelectRoom={setSelectedRoomId}
              loading={loading}
            />
          </div>

          <div className="lg:col-span-2">
            {selectedRoom ? (
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