import React from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { CourseForm } from '@/components/admin/CourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminCourseNew = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Nuovo Corso
        </h1>
        <p className="text-muted-foreground">
          Crea un nuovo corso per la palestra
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Corso</CardTitle>
          <CardDescription>
            Inserisci tutti i dettagli per il nuovo corso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CourseForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCourseNew;