import React, { useState, useEffect } from 'react';
import { ChatList } from '@/components/chat/ChatList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { MessageSquare, Users, Building } from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'gym_general' | 'course' | 'direct';
  gym_id?: string;
  gym_name?: string;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
  participant_count?: number;
}

const AdminChat: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeUsers: 0,
    totalMessages: 0
  });

  useEffect(() => {
    loadChatRooms();
    loadStats();
  }, []);

  const loadChatRooms = async () => {
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
          course_id,
          is_active,
          gyms (name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setChatRooms(data?.map(room => ({
        id: room.id,
        name: room.name,
        description: room.description,
        room_type: room.room_type as 'gym_general' | 'course' | 'direct',
        gym_id: room.gym_id,
        gym_name: (room.gyms as any)?.name
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
    try {
      // Count total rooms
      const { count: roomCount } = await supabase
        .from('chat_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Count total messages
      const { count: messageCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true });

      // Count active participants
      const { count: participantCount } = await supabase
        .from('chat_participants')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalRooms: roomCount || 0,
        activeUsers: participantCount || 0,
        totalMessages: messageCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const selectedRoom = chatRooms.find(room => room.id === selectedRoomId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestione Chat</h1>
        <p className="text-muted-foreground">
          Monitora e gestisci tutte le conversazioni della piattaforma
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stanze Chat</p>
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
                <p className="text-sm text-muted-foreground">Messaggi Totali</p>
                <p className="text-2xl font-bold">{stats.totalMessages}</p>
              </div>
              <Building className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">Tutte le Chat</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ChatList
                chatRooms={chatRooms}
                selectedRoomId={selectedRoomId}
                onSelectRoom={setSelectedRoomId}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedRoom ? (
            <div className="h-full">
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="outline">
                  {selectedRoom.room_type === 'gym_general' ? 'Chat Generale' : 
                   selectedRoom.room_type === 'course' ? 'Chat Corso' : 'Chat Diretta'}
                </Badge>
                {selectedRoom.gym_name && (
                  <Badge variant="secondary">
                    {selectedRoom.gym_name}
                  </Badge>
                )}
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
                <p className="text-sm">Scegli una conversazione per iniziare a moderare</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;