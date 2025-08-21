import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CourseParticipantOverviewProps {
  courseId: string;
  maxParticipants: number;
  className?: string;
}

export const CourseParticipantOverview: React.FC<CourseParticipantOverviewProps> = ({ 
  courseId, 
  maxParticipants, 
  className = ""
}) => {
  const [uniqueParticipantCount, setUniqueParticipantCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUniqueParticipantCount();
  }, [courseId]);

  const loadUniqueParticipantCount = async () => {
    try {
      // Count unique participants across all sessions of this course
      const { data, error } = await supabase
        .from('bookings')
        .select('user_id')
        .eq('course_id', courseId)
        .eq('status', 'confirmed');

      if (error) throw error;
      
      // Get unique user IDs
      const uniqueUsers = new Set(data?.map(booking => booking.user_id) || []);
      setUniqueParticipantCount(uniqueUsers.size);
    } catch (error) {
      console.error('Error loading unique participant count:', error);
      setUniqueParticipantCount(0);
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

  const spotsLeft = maxParticipants - uniqueParticipantCount;
  const isAlmostFull = spotsLeft <= 3 && spotsLeft > 0;
  const isFull = spotsLeft <= 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>{uniqueParticipantCount} partecipanti unici</span>
      </div>
      
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
  );
};