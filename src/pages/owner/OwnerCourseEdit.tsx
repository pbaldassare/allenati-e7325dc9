import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SupabaseCourse } from '@/types/course';

const OwnerCourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<SupabaseCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    // Smart navigation for owner pages
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // First, get the course data
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            course_schedules (
              day_of_week,
              start_time,
              end_time,
              room_id,
              room_name
            ),
            course_categories (
              name
            ),
            instructors (
              id,
              user_id
            )
          `)
          .eq('id', id)
          .single();

        if (courseError) throw courseError;

        // Then get the instructor's profile data if instructor exists
        let instructorProfile = null;
        if (courseData.instructors?.user_id) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', courseData.instructors.user_id)
            .single();

          if (!profileError && profileData) {
            instructorProfile = profileData;
          }
        }
        
        // Map database fields to form-expected format
        const mappedCourse = {
          ...courseData,
          // Keep original field names for consistency
          max_participants: courseData.max_participants,
          duration_minutes: courseData.duration_minutes,
          difficulty_level: courseData.difficulty_level,
          price_per_session: courseData.price_per_session,
          credits_required: courseData.credits_required,
          equipment_needed: courseData.equipment_needed,
          image_url: courseData.image_url,
          deadline_hours: courseData.deadline_hours,
          reserved_spots: courseData.reserved_spots,
          is_active: courseData.is_active,
          category_id: courseData.category_id,
          instructor_id: courseData.instructor_id,
          gym_id: courseData.gym_id,
          start_date: courseData.start_date,
          end_date: courseData.end_date,
          schedules: courseData.course_schedules || [],
          // Add instructor profile data
          instructors: courseData.instructors ? {
            ...courseData.instructors,
            profiles: instructorProfile
          } : null
        };
        
        setCourse(mappedCourse);
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Errore nel caricamento del corso');
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Caricamento corso...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">{error || 'Corso non trovato'}</p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/owner/courses')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna ai Corsi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Modifica Corso
          </h1>
          <p className="text-muted-foreground">
            Modifica i dettagli del corso "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Corso</CardTitle>
          <CardDescription>
            Modifica i dettagli del corso esistente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerCourseForm mode="edit" course={course as any} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseEdit;