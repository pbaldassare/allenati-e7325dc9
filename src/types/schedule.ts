export interface ScheduleItem {
  dayOfWeek: number;
  time: string;
  end_time: string;
  roomId: string;
  day?: string;
  date?: string;
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
  status: 'scheduled' | 'cancelled' | 'completed';
}