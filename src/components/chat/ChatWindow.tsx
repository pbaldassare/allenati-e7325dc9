import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { MessageInput } from './MessageInput';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface Message {
  id: string;
  content: string;
  user_id: string;
  sender_name: string;
  created_at: string;
  is_from_staff: boolean;
  avatar_url?: string;
}

interface ChatWindowProps {
  roomId: string;
  roomName: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ roomId, roomName }) => {
  const { user, isAdmin, isGymOwner, isInstructor } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determina se l'utente può scrivere (solo staff: admin, gym_owner, instructor)
  const canWriteMessages = isAdmin || isGymOwner || isInstructor;

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
    console.log('🚀 Tentativo invio messaggio:', { 
      roomId, 
      userId: user.id, 
      userRole: user.role,
      content: content.trim() 
    });
    
    try {
      // Verifica che l'utente sia partecipante della chat
      console.log('🔍 Verifico partecipazione alla chat...');
      const { data: participation, error: participationError } = await supabase
        .from('chat_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();
      
      if (participationError) {
        console.error('❌ Errore verifica partecipazione:', participationError);
      } else {
        console.log('✅ Partecipazione confermata:', participation);
      }

      // Verifica membership alla palestra
      console.log('🏋️ Verifico membership alla palestra...');
      const { data: membership, error: membershipError } = await supabase
        .from('user_gym_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      if (membershipError) {
        console.error('❌ Errore verifica membership:', membershipError);
      } else {
        console.log('✅ Membership attiva:', membership);
      }

      console.log('📤 Invio messaggio al database...');
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        })
        .select();

      if (error) {
        console.error('❌ Errore INSERT database:', error);
        console.error('❌ Dettagli errore:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ Messaggio inviato con successo:', data);
      
    } catch (error: any) {
      console.error('💥 Errore completo invio messaggio:', error);
      
      let errorMessage = 'Impossibile inviare il messaggio';
      if (error.message?.includes('policy')) {
        errorMessage = 'Non hai i permessi per scrivere in questa chat';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Problema di connessione. Riprova.';
      }
      
      toast({
        title: 'Errore invio messaggio',
        description: `${errorMessage}: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${isMobile ? 'bg-background' : ''}`}>
        <div className="text-muted-foreground">Caricamento chat...</div>
      </div>
    );
  }

  // Mobile layout - no Card wrapper, full height with safe areas
  if (isMobile) {
    return (
      <div className="h-full flex flex-col bg-background">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 pb-2">
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

        <div className="border-t bg-background/80 backdrop-blur-sm p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {canWriteMessages ? (
            <MessageInput onSend={sendMessage} disabled={sending} />
          ) : (
            <div className="text-center text-sm text-muted-foreground py-3">
              Solo lo staff può scrivere in questa chat. Puoi leggere tutti i messaggi.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout - with Card wrapper
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
        {canWriteMessages ? (
          <MessageInput onSend={sendMessage} disabled={sending} />
        ) : (
          <div className="text-center text-sm text-muted-foreground py-3">
            Solo lo staff può scrivere in questa chat. Puoi leggere tutti i messaggi.
          </div>
        )}
      </div>
    </Card>
  );
};