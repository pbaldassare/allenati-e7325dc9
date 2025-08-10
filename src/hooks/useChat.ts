import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  room_type: 'gym_general' | 'course' | 'direct';
  gym_id?: string;
  course_id?: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  metadata?: any;
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  user_profile?: {
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  last_read_at?: string;
  is_active: boolean;
}

export const useChat = () => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [participants, setParticipants] = useState<Record<string, ChatParticipant[]>>({});
  const [loading, setLoading] = useState(false);

  // Fetch user's chat rooms
  const fetchChatRooms = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          chat_participants!inner(user_id, is_active)
        `)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChatRooms((data || []) as ChatRoom[]);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      toast.error('Errore nel caricamento delle chat');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for a specific room
  const fetchMessages = useCallback(async (roomId: string, limit = 50) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch user profiles separately
      const userIds = [...new Set((data || []).map(msg => msg.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_picture_url')
        .in('user_id', userIds);

      const profilesMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      const messagesWithProfile = (data || []).map(msg => ({
        ...msg,
        user_profile: profilesMap[msg.user_id]
      })).reverse() as ChatMessage[];

      setMessages(prev => ({
        ...prev,
        [roomId]: messagesWithProfile
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Errore nel caricamento dei messaggi');
    }
  }, [user]);

  // Fetch participants for a specific room
  const fetchParticipants = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true);

      if (error) throw error;

      setParticipants(prev => ({
        ...prev,
        [roomId]: (data || []) as ChatParticipant[]
      }));
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (roomId: string, content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    if (!user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: content.trim(),
          message_type: messageType
        });

      if (error) throw error;

      // Update room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Errore nell\'invio del messaggio');
    }
  }, [user]);

  // Join a chat room
  const joinChatRoom = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          role: 'member',
          is_active: true
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) throw error;
      
      await fetchParticipants(roomId);
      toast.success('Sei entrato nella chat');
    } catch (error) {
      console.error('Error joining chat room:', error);
      toast.error('Errore nell\'entrare nella chat');
    }
  }, [user, fetchParticipants]);

  // Leave a chat room
  const leaveChatRoom = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ is_active: false })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchChatRooms();
      toast.success('Hai lasciato la chat');
    } catch (error) {
      console.error('Error leaving chat room:', error);
      toast.error('Errore nell\'uscire dalla chat');
    }
  }, [user, fetchChatRooms]);

  // Mark messages as read
  const markAsRead = useCallback(async (roomId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name, profile_picture_url')
            .eq('user_id', newMessage.user_id)
            .maybeSingle();

          const messageWithProfile = {
            ...newMessage,
            user_profile: profile
          };

          setMessages(prev => ({
            ...prev,
            [newMessage.room_id]: [
              ...(prev[newMessage.room_id] || []),
              messageWithProfile
            ]
          }));
        }
      )
      .subscribe();

    // Subscribe to room updates
    const roomsChannel = supabase
      .channel('chat_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        () => {
          fetchChatRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, [user, fetchChatRooms]);

  // Fetch initial data
  useEffect(() => {
    if (user) {
      fetchChatRooms();
    }
  }, [user, fetchChatRooms]);

  return {
    chatRooms,
    messages,
    participants,
    loading,
    fetchChatRooms,
    fetchMessages,
    fetchParticipants,
    sendMessage,
    joinChatRoom,
    leaveChatRoom,
    markAsRead
  };
};