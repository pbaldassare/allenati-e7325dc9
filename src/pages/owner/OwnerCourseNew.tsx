import React, { useEffect } from 'react';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const OwnerCourseNew: React.FC = () => {
  useEffect(() => {
    document.title = "Nuovo Corso | Area Proprietario";
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Nuovo Corso
        </h1>
        <p className="text-muted-foreground">
          Crea un nuovo corso per la tua palestra
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
          <OwnerCourseForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerCourseNew;
