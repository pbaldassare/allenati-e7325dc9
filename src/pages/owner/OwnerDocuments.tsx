import React from 'react';
import { OwnerLayout } from '@/layouts/OwnerLayout';
import { OwnerDocumentsManager } from '@/components/owner/OwnerDocumentsManager';
import { useOwnerGym } from '@/contexts/OwnerGymContext';

export const OwnerDocuments: React.FC = () => {
  const { selectedGym } = useOwnerGym();

  if (!selectedGym) {
    return (
      <OwnerLayout>
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">
            Seleziona una palestra per gestire i documenti
          </p>
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      <div className="container mx-auto px-4 py-6">
        <OwnerDocumentsManager gymId={selectedGym.id} />
      </div>
    </OwnerLayout>
  );
};

export default OwnerDocuments;
