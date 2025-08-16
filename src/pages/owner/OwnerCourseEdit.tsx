import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  description: string;
  instructor_id: string;
  category_id: string;
  max_participants: number;
  duration_minutes: number;
  difficulty_level: number;
  price_per_session: number;
  credits_required: number;
  requirements: string[];
  benefits: string[];
  equipment_needed: string[];
  image_url: string;
  deadline_hours: number;
  reserved_spots: number;
  is_active: boolean;
}

const OwnerCourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setCourse(data);
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
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Modifica Corso
        </h1>
        <p className="text-muted-foreground">
          Modifica i dettagli del corso "{course.name}"
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Corso</CardTitle>
          <CardDescription>
            Modifica i dettagli del corso esistente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerCourseForm mode="edit" course={course} />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseEdit;