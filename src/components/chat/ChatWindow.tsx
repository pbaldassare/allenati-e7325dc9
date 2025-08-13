import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  user_id: string;
  sender_name: string;
  created_at: string;
  is_from_staff: boolean;
}

interface ChatWindowProps {
  roomId: string;
  roomName: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, roomName }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load initial messages
  useEffect(() => {
    if (!roomId) return;
    loadMessages();
  }, [roomId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`chat_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Get user info for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', newMessage.user_id)
            .single();
            
          const { data: userRole } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', newMessage.user_id)
            .in('role', ['admin', 'gym_owner', 'instructor'])
            .single();
          
          setMessages(prev => [...prev, {
            id: newMessage.id,
            content: newMessage.content,
            user_id: newMessage.user_id,
            sender_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Utente',
            created_at: newMessage.created_at,
            is_from_staff: !!userRole
          }]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get unique user IDs to fetch profiles and roles
      const userIds = [...new Set(data.map(msg => msg.user_id))];
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      
      // Fetch staff roles
      const { data: staffRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .in('role', ['admin', 'gym_owner', 'instructor'])
        .eq('is_active', true);

      setMessages(data.map(msg => {
        const profile = profiles?.find(p => p.user_id === msg.user_id);
        const hasStaffRole = staffRoles?.some(r => r.user_id === msg.user_id);
        
        return {
          id: msg.id,
          content: msg.content,
          user_id: msg.user_id,
          sender_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Utente',
          created_at: msg.created_at,
          is_from_staff: hasStaffRole || false
        };
      }));
      
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i messaggi',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const sendMessage = async (content: string) => {
    if (!user || !content.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile inviare il messaggio',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-muted-foreground">Caricamento chat...</div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <div className="border-b p-4">
        <h3 className="font-semibold">{roomName}</h3>
      </div>
      
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.user_id === user?.id}
            />
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              Nessun messaggio ancora. Inizia la conversazione!
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <MessageInput onSend={sendMessage} disabled={sending} />
      </div>
    </Card>
  );
};