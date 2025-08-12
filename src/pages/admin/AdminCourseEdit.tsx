import React from 'react';
import { useParams } from 'react-router-dom';
import { CourseForm } from '@/components/admin/CourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppData } from '@/contexts/AppDataContext';

const AdminCourseEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { getCourseById } = useAppData();
  const course = getCourseById(id!);

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Corso non trovato</p>
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
          <CourseForm mode="edit" course={course} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourseEdit;