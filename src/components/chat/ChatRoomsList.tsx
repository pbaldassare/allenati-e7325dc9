import { MessageCircle, Users, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChatRoom } from '@/hooks/useChat';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ChatRoomsListProps {
  rooms: ChatRoom[];
  selectedRoomId?: string;
  onRoomSelect: (roomId: string) => void;
  loading?: boolean;
}

export const ChatRoomsList = ({ 
  rooms, 
  selectedRoomId, 
  onRoomSelect, 
  loading 
}: ChatRoomsListProps) => {
  const getRoomIcon = (roomType: ChatRoom['room_type']) => {
    switch (roomType) {
      case 'gym_general':
        return <Users className="h-5 w-5" />;
      case 'course':
        return <Hash className="h-5 w-5" />;
      case 'direct':
        return <MessageCircle className="h-5 w-5" />;
      default:
        return <MessageCircle className="h-5 w-5" />;
    }
  };

  const getRoomTypeLabel = (roomType: ChatRoom['room_type']) => {
    switch (roomType) {
      case 'gym_general':
        return 'Generale';
      case 'course':
        return 'Corso';
      case 'direct':
        return 'Diretto';
      default:
        return 'Chat';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nessuna chat disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md",
            selectedRoomId === room.id && "ring-2 ring-primary bg-primary/5"
          )}
          onClick={() => onRoomSelect(room.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className={cn(
                  "p-2 rounded-lg",
                  selectedRoomId === room.id ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {getRoomIcon(room.room_type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">
                      {room.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {getRoomTypeLabel(room.room_type)}
                    </Badge>
                  </div>
                  
                  {room.description && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {room.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(room.updated_at), {
                        addSuffix: true,
                        locale: it
                      })}
                    </span>
                    
                    {room.unread_count && room.unread_count > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {room.unread_count > 99 ? '99+' : room.unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};