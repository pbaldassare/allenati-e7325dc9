import React from 'react';
import { GymForm } from '@/components/admin/GymForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminGymNew = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Nuova Palestra
        </h1>
        <p className="text-muted-foreground">
          Crea una nuova palestra nel sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Palestra</CardTitle>
          <CardDescription>
            Inserisci tutti i dettagli per la nuova palestra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GymForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGymNew;