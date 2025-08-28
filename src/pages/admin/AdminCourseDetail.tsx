import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CourseParticipants } from '@/components/admin/CourseParticipants';
import { CourseScheduleDisplay } from '@/components/admin/CourseScheduleDisplay';
import { supabase } from '@/integrations/supabase/client';
import {
  Edit,
  Users,
  Calendar,
  Euro,
  MapPin,
  Clock,
  Award,
  TrendingUp
} from 'lucide-react';

const AdminCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (id) {
      loadCourse();
    }
  }, [id]);

  const loadCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          instructor:instructors!courses_instructor_id_fkey (
            profiles:user_id (
              first_name,
              last_name
            )
          ),
          course_categories (
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error loading course:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Caricamento corso...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Corso non trovato</p>
      </div>
    );
  }

  const instructorName = course.instructor?.profiles ? 
    `${course.instructor.profiles.first_name} ${course.instructor.profiles.last_name}` : 
    'Istruttore non assegnato';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src={course.image} 
            alt={course.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {course.name}
            </h1>
            <p className="text-muted-foreground">
              Istruttore: {instructorName}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/courses/${course.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Modifica Corso
          </Link>
        </Button>
      </div>

      {/* Course Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              0/{course.max_participants}
            </div>
            <p className="text-xs text-muted-foreground">
              0% occupazione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prezzo</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{course.price_per_session || 0}</div>
            <p className="text-xs text-muted-foreground">
              Per lezione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durata</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.duration_minutes}</div>
            <p className="text-xs text-muted-foreground">
              Minuti per lezione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livello</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant="secondary">
                {course.difficulty_level === 1 ? 'Principiante' : 
                 course.difficulty_level === 2 ? 'Intermedio' : 
                 course.difficulty_level === 3 ? 'Avanzato' : 'Non specificato'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Difficoltà corso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Corso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Descrizione</h4>
              <p className="text-sm text-muted-foreground">{course.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Categoria</h4>
                <Badge variant="outline">{course.course_categories?.name || 'Senza categoria'}</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-1">Livello</h4>
                <Badge variant="secondary">
                  {course.difficulty_level === 1 ? 'Principiante' : 
                   course.difficulty_level === 2 ? 'Intermedio' : 
                   course.difficulty_level === 3 ? 'Avanzato' : 'Non specificato'}
                </Badge>
              </div>
            </div>

            {course.benefits && (
              <div>
                <h4 className="font-medium mb-2">Benefici</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {course.benefits.map((benefit: string, index: number) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gestione Corso</CardTitle>
            <CardDescription>
              Accedi alle diverse sezioni di gestione del corso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/courses/${course.id}/schedules`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Orari
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/courses/${course.id}/sessions`}>
                  <Clock className="mr-2 h-4 w-4" />
                  Sessioni
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/courses/${course.id}/exceptions`}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Eccezioni
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Gestisci separatamente orari settimanali, sessioni generate ed eccezioni del corso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Participants */}
      <div>
        <CourseParticipants courseId={course.id} />
      </div>
    </div>
  );
};

export default AdminCourseDetail;