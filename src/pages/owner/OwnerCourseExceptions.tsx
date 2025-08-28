import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CourseScheduleExceptions } from '@/components/owner/CourseScheduleExceptions';
import { useToast } from '@/hooks/use-toast';

const OwnerCourseExceptions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);

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
        
        // Load course data
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Load existing exceptions
        const { data: exceptionsData, error: exceptionsError } = await supabase
          .from('course_schedule_exceptions')
          .select('*')
          .eq('course_id', id)
          .order('start_date', { ascending: true });

        if (exceptionsError) throw exceptionsError;
        setExceptions(exceptionsData || []);
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleExceptionsChange = async (newExceptions: any[]) => {
    if (!id) return;

    try {
      // Delete existing exceptions
      await supabase
        .from('course_schedule_exceptions')
        .delete()
        .eq('course_id', id);

      // Insert new exceptions
      if (newExceptions.length > 0) {
        const exceptionsToInsert = newExceptions.map(exception => ({
          course_id: id,
          start_date: exception.start_date,
          end_date: exception.end_date,
          reason: exception.reason,
        }));

        const { error } = await supabase
          .from('course_schedule_exceptions')
          .insert(exceptionsToInsert);

        if (error) throw error;
      }

      setExceptions(newExceptions);
      toast({
        title: 'Successo',
        description: 'Eccezioni corso aggiornate con successo',
      });
    } catch (error) {
      console.error('Error updating exceptions:', error);
      toast({
        title: 'Errore',
        description: 'Errore nell\'aggiornamento delle eccezioni',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Caricamento dati...</p>
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
            Gestione Eccezioni
          </h1>
          <p className="text-muted-foreground">
            Configura le eccezioni al programma per "{course.name}"
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eccezioni Programma</CardTitle>
          <CardDescription>
            Imposta i periodi in cui il corso non si svolge (vacanze, chiusure, etc.)
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

export default OwnerCourseExceptions;