import React from 'react';
import { MedicalCertificateManagement } from '@/components/MedicalCertificateManagement';

export const MedicalCertificate: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <MedicalCertificateManagement />
    </div>
  );
};

export default MedicalCertificate;