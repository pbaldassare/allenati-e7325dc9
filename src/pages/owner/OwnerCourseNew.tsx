import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { OwnerCourseForm } from '@/components/owner/OwnerCourseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const OwnerCourseNew: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = "Nuovo Corso | Area Proprietario";
  }, []);

  const handleBack = () => {
    // Smart navigation for owner pages
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/courses');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Nuovo Corso
          </h1>
          <p className="text-muted-foreground">
            Crea un nuovo corso per la tua palestra
          </p>
        </div>
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
