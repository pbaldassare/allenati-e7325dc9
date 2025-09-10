import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseParticipantsViewModal } from './CourseParticipantsViewModal';

interface CourseParticipantCountProps {
  sessionId: string;
  maxParticipants: number;
  showProgressBar?: boolean;
  className?: string;
}

export const CourseParticipantCount: React.FC<CourseParticipantCountProps> = ({ 
  sessionId, 
  maxParticipants, 
  showProgressBar = false,
  className = ""
}) => {
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    loadParticipantCount();

    // Set up real-time subscription for booking changes
    const channel = supabase
      .channel('booking-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Real-time booking change detected:', payload);
          loadParticipantCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadParticipantCount = async () => {
    try {
      console.log(`🔄 Loading participant count for session ${sessionId}...`);
      const startTime = Date.now();
      
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('status', 'confirmed');

      if (error) throw error;
      
      const newCount = count || 0;
      const loadTime = Date.now() - startTime;
      const timestamp = new Date();
      
      console.log(`✅ Participant count loaded: ${newCount} participants (${loadTime}ms) at ${timestamp.toLocaleTimeString()}`);
      
      setParticipantCount(newCount);
      setLastUpdated(timestamp);
    } catch (error) {
      console.error('❌ Error loading participant count:', error);
      setParticipantCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
        <Users className="h-3 w-3" />
        <span>Caricamento...</span>
      </div>
    );
  }

  const spotsLeft = maxParticipants - participantCount;
  const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;
  const fillPercentage = (participantCount / maxParticipants) * 100;

  return (
    <>
      <div 
        className={`flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={() => setShowParticipantsList(true)}
      >
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>{participantCount}/{maxParticipants} partecipanti</span>
          {lastUpdated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadParticipantCount();
              }}
              className="ml-1 p-0.5 hover:bg-muted rounded"
              title={`Ultimo aggiornamento: ${lastUpdated.toLocaleTimeString()}`}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
        
        {showProgressBar && (
          <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                isFull ? 'bg-destructive' : 
                isAlmostFull ? 'bg-warning' : 
                'bg-primary'
              }`}
              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
            />
          </div>
        )}
        
        {isFull && (
          <Badge variant="destructive" className="text-xs">
            Pieno
          </Badge>
        )}
        {isAlmostFull && !isFull && (
          <Badge variant="outline" className="text-xs border-warning text-warning">
            Ultimi posti
          </Badge>
        )}
        {spotsLeft > 3 && (
          <Badge variant="outline" className="text-xs">
            {spotsLeft} posti liberi
          </Badge>
        )}
      </div>

      {showParticipantsList && (
        <CourseParticipantsViewModal 
          sessionId={sessionId}
          isOpen={showParticipantsList}
          onClose={() => setShowParticipantsList(false)}
        />
      )}
    </>
  );
};