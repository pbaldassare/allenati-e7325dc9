export interface ScheduleItem {
  dayOfWeek: number;
  time: string;
  end_time: string;
  roomId: string;
  day?: string;
  date?: string;
  maxParticipantsOverride?: number | null;
  difficultyLevelOverride?: number | null;
}

export interface GymRoom {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface CourseSchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  max_participants_override?: number | null;
  difficulty_level_override?: number | null;
}

export interface CourseSession {
  id?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  max_participants: number;
  available_spots: number;
  difficulty_level?: number | null;
  status: 'scheduled' | 'cancelled' | 'completed';
}