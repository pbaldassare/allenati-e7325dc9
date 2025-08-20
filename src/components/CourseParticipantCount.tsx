import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseParticipantsViewModal } from './CourseParticipantsViewModal';

interface CourseParticipantCountProps {
  courseId: string;
  maxParticipants: number;
  showProgressBar?: boolean;
  className?: string;
}

export const CourseParticipantCount: React.FC<CourseParticipantCountProps> = ({ 
  courseId, 
  maxParticipants, 
  showProgressBar = false,
  className = ""
}) => {
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showParticipantsList, setShowParticipantsList] = useState(false);

  useEffect(() => {
    loadParticipantCount();
  }, [courseId]);

  const loadParticipantCount = async () => {
    try {
      const { count, error } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .eq('status', 'confirmed');

      if (error) throw error;
      setParticipantCount(count || 0);
    } catch (error) {
      console.error('Error loading participant count:', error);
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
          courseId={courseId}
          isOpen={showParticipantsList}
          onClose={() => setShowParticipantsList(false)}
        />
      )}
    </>
  );
};