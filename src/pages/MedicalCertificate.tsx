import React from 'react';
import { MedicalCertificateManagement } from '@/components/MedicalCertificateManagement';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MedicalCertificate: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
      </header>
      <MedicalCertificateManagement />
    </div>
  );
};

export default MedicalCertificate;