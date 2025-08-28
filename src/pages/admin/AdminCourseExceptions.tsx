import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CourseScheduleExceptions } from '@/components/owner/CourseScheduleExceptions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const AdminCourseExceptions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, name')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;

        // Fetch existing exceptions
        const { data: exceptionsData, error: exceptionsError } = await supabase
          .from('course_schedule_exceptions')
          .select('*')
          .eq('course_id', id)
          .order('start_date', { ascending: true });

        if (exceptionsError) throw exceptionsError;

        setCourse(courseData);
        setExceptions(exceptionsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Errore',
          description: 'Errore nel caricamento dei dati',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, toast]);

  const handleExceptionsChange = (newExceptions: any[]) => {
    setExceptions(newExceptions);
    // Here you could also save to database if needed
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Corso non trovato</p>
        <Button onClick={() => navigate('/admin/courses')} className="mt-4">
          Torna alla lista corsi
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al corso
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Eccezioni del Corso
          </h1>
          <p className="text-muted-foreground">
            Gestisci i periodi di sospensione per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestione Eccezioni</CardTitle>
          <CardDescription>
            Configura i periodi in cui il corso sarà sospeso (festività, chiusure, ecc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseScheduleExceptions
            exceptions={exceptions}
            onChange={handleExceptionsChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourseExceptions;