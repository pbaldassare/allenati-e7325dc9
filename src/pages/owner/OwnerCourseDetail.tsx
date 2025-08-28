import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Calendar, Clock, Users, FileX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            course_schedules (
              day_of_week,
              start_time,
              end_time,
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

        // Get instructor profile
        let instructorProfile = null;
        if (courseData.instructors?.user_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', courseData.instructors.user_id)
            .single();

          if (profileData) {
            instructorProfile = profileData;
          }
        }
        
        setCourse({
          ...courseData,
          instructors: courseData.instructors ? {
            ...courseData.instructors,
            profiles: instructorProfile
          } : null
        });
        
      } catch (err) {
        console.error('Error loading course:', err);
        setError('Errore nel caricamento del corso');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const getDifficultyBadge = (level: number | null) => {
    if (!level) return null;
    const variants = {
      1: { label: 'Principiante', variant: 'secondary' as const },
      2: { label: 'Intermedio', variant: 'default' as const },
      3: { label: 'Avanzato', variant: 'destructive' as const }
    };
    const difficulty = variants[level as keyof typeof variants];
    return difficulty ? <Badge variant={difficulty.variant}>{difficulty.label}</Badge> : null;
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return days[dayOfWeek] || 'Non programmato';
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {course.name}
            </h1>
            <p className="text-muted-foreground">
              Dettagli del corso
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/owner/courses/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </div>
        </div>
      </div>

      {/* Management Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate(`/owner/courses/${id}/schedules`)}>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-medium">Gestione Orari</h3>
              <p className="text-sm text-muted-foreground">Configura gli orari settimanali</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate(`/owner/courses/${id}/sessions`)}>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-medium">Gestione Sessioni</h3>
              <p className="text-sm text-muted-foreground">Genera e gestisci le sessioni</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" 
              onClick={() => navigate(`/owner/courses/${id}/exceptions`)}>
          <CardContent className="flex items-center gap-3 p-4">
            <FileX className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-medium">Eccezioni</h3>
              <p className="text-sm text-muted-foreground">Gestisci chiusure e eccezioni</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Generali</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Descrizione</label>
              <p className="text-sm">{course.description || 'Nessuna descrizione'}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <p className="text-sm">{course.course_categories?.name || 'Non specificata'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Livello</label>
                <div>{getDifficultyBadge(course.difficulty_level)}</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Istruttore</label>
              <p className="text-sm">
                {course.instructors?.profiles?.first_name && course.instructors?.profiles?.last_name 
                  ? `${course.instructors.profiles.first_name} ${course.instructors.profiles.last_name}`
                  : 'Non assegnato'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dettagli Corso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Max Partecipanti</label>
                <p className="text-sm">{course.max_participants}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Durata</label>
                <p className="text-sm">{course.duration_minutes} minuti</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Crediti Richiesti</label>
                <p className="text-sm">{course.credits_required}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Posti Riservati</label>
                <p className="text-sm">{course.reserved_spots}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Stato</label>
              <div>
                <Badge variant={course.is_active ? 'default' : 'secondary'}>
                  {course.is_active ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Information */}
      {course.course_schedules && course.course_schedules.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Programma Settimanale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {course.course_schedules.map((schedule: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{getDayName(schedule.day_of_week)}</span>
                    <span className="text-muted-foreground">
                      {schedule.start_time} - {schedule.end_time}
                    </span>
                  </div>
                  {schedule.room_name && (
                    <Badge variant="outline">{schedule.room_name}</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OwnerCourseDetail;