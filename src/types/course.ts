// Unified Course interface matching Supabase schema
export interface SupabaseCourse {
  id: string;
  name: string;
  description: string | null;
  instructor_id: string;
  category_id: string;
  gym_id: string | null;
  max_participants: number;
  duration_minutes: number;
  difficulty_level: number | null;
  price_per_session: number | null;
  credits_required: number;
  requirements: string[] | null;
  benefits: string[] | null;
  equipment_needed: string[] | null;
  image_url: string | null;
  deadline_hours: number | null;
  reserved_spots: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Extended Course interface with joined data
export interface CourseWithRelations extends SupabaseCourse {
  gym?: {
    id: string;
    name: string;
    address?: string;
    city?: string;
  } | null;
  course_categories?: {
    name: string;
  } | null;
  course_schedules?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
  instructors?: {
    profiles?: {
      first_name: string | null;
      last_name: string | null;
    } | null;
  } | null;
  _count?: {
    bookings: number;
  };
}

// Helper function to get instructor name from profile data
export const getInstructorName = (course: CourseWithRelations): string => {
  const instructorProfile = course.instructors?.profiles;
  if (!instructorProfile) {
    return 'Istruttore non assegnato';
  }
  
  const { first_name, last_name } = instructorProfile;
  const fullName = `${first_name || ''} ${last_name || ''}`.trim();
  return fullName || 'Istruttore non assegnato';
};

// Helper function to get difficulty level text
export const getDifficultyText = (level: number | null): string => {
  switch (level) {
    case 1: return 'Principiante';
    case 2: return 'Intermedio';
    case 3: return 'Avanzato';
    default: return 'Non specificato';
  }
};

// Helper function to get day name
export const getDayName = (dayOfWeek: number): string => {
  const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  return days[dayOfWeek] || 'Non programmato';
};