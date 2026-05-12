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

// Helper to extract a usable name from any instructor-like object
const extractName = (instructor: any): string | null => {
  if (!instructor) return null;
  // Handle arrays (Supabase nested selects sometimes return arrays)
  if (Array.isArray(instructor)) {
    for (const item of instructor) {
      const name = extractName(item);
      if (name) return name;
    }
    return null;
  }
  // Try profiles nested
  const profile = instructor.profiles;
  if (profile) {
    const profileName = extractName(profile);
    if (profileName) return profileName;
  }
  const first = instructor.first_name || '';
  const last = instructor.last_name || '';
  const full = `${first} ${last}`.trim();
  if (full) return full;
  if (instructor.full_name) return String(instructor.full_name).trim() || null;
  if (instructor.name) return String(instructor.name).trim() || null;
  return null;
};

/**
 * Get instructor name from any course/session-like object.
 * Supports:
 *  - course.instructors.profiles.{first_name,last_name}
 *  - course.instructors.{first_name,last_name}
 *  - arrays of instructors
 *  - session-level override via course.instructor_override / course.instructor
 *  - snapshot via course.instructor_name_snapshot
 */
export const getInstructorName = (course: any): string => {
  if (!course) return 'Istruttore non assegnato';

  // 1) Explicit session-level override (preferred)
  const overrideName = extractName(course.instructor_override) || extractName(course.instructorOverride);
  if (overrideName) return overrideName;

  // 2) Direct instructor on the object (e.g. session-level resolved instructor)
  const directName = extractName(course.instructor);
  if (directName) return directName;

  // 3) Course instructors relation
  const instructorsName = extractName(course.instructors);
  if (instructorsName) return instructorsName;

  // 4) Snapshot fallback
  if (course.instructor_name_snapshot && String(course.instructor_name_snapshot).trim()) {
    return String(course.instructor_name_snapshot).trim();
  }

  return 'Istruttore non assegnato';
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