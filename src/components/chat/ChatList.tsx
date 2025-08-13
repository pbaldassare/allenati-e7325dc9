import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface ChatListProps {
  chatRooms: ChatRoom[];
  selectedRoomId?: string;
  onSelectRoom: (roomId: string) => void;
  loading?: boolean;
}

export const ChatList: React.FC<ChatListProps> = ({ 
  chatRooms, 
  selectedRoomId, 
  onSelectRoom, 
  loading 
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            Caricamento chat...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chatRooms.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nessuna chat disponibile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {chatRooms.map((room) => (
        <Card 
          key={room.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            selectedRoomId === room.id && "bg-muted border-primary"
          )}
          onClick={() => onSelectRoom(room.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium truncate">{room.name}</h3>
                  {room.unread_count && room.unread_count > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {room.unread_count}
                    </Badge>
                  )}
                </div>
                
                {room.description && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {room.description}
                  </p>
                )}
                
                {room.last_message && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {room.last_message}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1">
                {room.participant_count && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {room.participant_count}
                  </div>
                )}
                
                <Badge variant="outline" className="text-xs">
                  {room.room_type === 'gym_general' ? 'Generale' : 
                   room.room_type === 'course' ? 'Corso' : 'Diretto'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};