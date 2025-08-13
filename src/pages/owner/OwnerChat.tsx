import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Users, Plus } from 'lucide-react';

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

const OwnerChat: React.FC = () => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [userGymId, setUserGymId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeUsers: 0,
    todayMessages: 0
  });

  useEffect(() => {
    if (user) {
      loadUserGym();
    }
  }, [user]);

  useEffect(() => {
    if (userGymId) {
      loadChatRooms();
      loadStats();
    }
  }, [userGymId]);

  const loadUserGym = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_gym_id', { _user_id: user?.id });

      if (error) throw error;
      setUserGymId(data);
    } catch (error) {
      console.error('Error getting user gym:', error);
    }
  };

  const loadChatRooms = async () => {
    if (!userGymId) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          description,
          room_type,
          gym_id,
          is_active
        `)
        .eq('gym_id', userGymId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChatRooms(data?.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        room_type: room.room_type as 'gym_general' | 'course' | 'direct'
      })) || []);

      if (data && data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].id);
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

  const loadStats = async () => {
    if (!userGymId) return;

    try {
      // Count rooms for this gym
      const { count: roomCount } = await supabase
        .from('chat_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('gym_id', userGymId)
        .eq('is_active', true);

      // Count active participants in gym rooms
      const { data: roomIds } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('gym_id', userGymId)
        .eq('is_active', true);

      let participantCount = 0;
      let todayMessageCount = 0;

      if (roomIds && roomIds.length > 0) {
        const roomIdsList = roomIds.map(r => r.id);
        
        const { count: participants } = await supabase
          .from('chat_participants')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIdsList)
          .eq('is_active', true);

        // Count today's messages
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count: messages } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .in('room_id', roomIdsList)
          .gte('created_at', today.toISOString());

        participantCount = participants || 0;
        todayMessageCount = messages || 0;
      }

      setStats({
        totalRooms: roomCount || 0,
        activeUsers: participantCount,
        todayMessages: todayMessageCount
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const createGeneralChat = async () => {
    if (!userGymId || !user) return;

    try {
      const { data, error } = await supabase
        .rpc('create_gym_general_chat', { 
          _gym_id: userGymId, 
          _created_by: user.id 
        });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Chat generale creata con successo'
      });

      loadChatRooms();
    } catch (error) {
      console.error('Error creating general chat:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile creare la chat generale',
        variant: 'destructive'
      });
    }
  };

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chat Palestra</h1>
          <p className="text-muted-foreground">
            Comunica con i membri della tua palestra
          </p>
        </div>
        
        <Button onClick={createGeneralChat} disabled={!userGymId}>
          <Plus className="h-4 w-4 mr-2" />
          Chat Generale
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chat Attive</p>
                <p className="text-2xl font-bold">{stats.totalRooms}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utenti Attivi</p>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Messaggi Oggi</p>
                <p className="text-2xl font-bold">{stats.todayMessages}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Le tue Chat</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {chatRooms.length === 0 && !loading ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-4">Nessuna chat ancora</p>
                  <Button onClick={createGeneralChat} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Chat Generale
                  </Button>
                </div>
              ) : (
                <ChatList
                  chatRooms={chatRooms}
                  selectedRoomId={selectedRoomId}
                  onSelectRoom={setSelectedRoomId}
                  loading={loading}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedRoom ? (
            <div className="h-full">
              <div className="mb-4">
                <Badge variant="outline">
                  {selectedRoom.room_type === 'gym_general' ? 'Chat Generale' : 
                   selectedRoom.room_type === 'course' ? 'Chat Corso' : 'Chat Diretta'}
                </Badge>
              </div>
              <ChatWindow
                roomId={selectedRoom.id}
                roomName={selectedRoom.name}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Seleziona una chat</p>
                <p className="text-sm">Scegli una conversazione per iniziare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerChat;