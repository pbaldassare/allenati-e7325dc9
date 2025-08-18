import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GymRoomsManager } from '@/components/admin/GymRoomsManager';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const OwnerRooms: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    document.title = 'Sale | Gym Manager - Area Proprietario';
  }, []);

  const handleBack = () => {
    // Smart navigation for owner pages
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/owner/dashboard');
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Indietro
      </Button>
      <GymRoomsManager />
    </div>
  );
};

export default OwnerRooms;