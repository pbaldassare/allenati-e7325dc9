import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GymDocumentsManagement } from '@/components/GymDocumentsManagement';
import { useGym } from '@/contexts/GymContext';
import { useAuth } from '@/contexts/AuthContext';

export const GymDocuments: React.FC = () => {
  const navigate = useNavigate();
  const { selectedGym } = useGym();
  const { user } = useAuth();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  if (!selectedGym) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">
          Seleziona una palestra per visualizzare i documenti
        </p>
      </div>
    );
  }

  const isOwner = user?.role === 'gym_owner' || user?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
      </header>
      <GymDocumentsManagement 
        gymId={selectedGym.id} 
        userId={user?.id} 
        isOwner={isOwner} 
      />
    </div>
  );
};

export default GymDocuments;
