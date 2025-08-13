import React, { useEffect } from 'react';
import { GymRoomsManager } from '@/components/admin/GymRoomsManager';

export const OwnerRooms: React.FC = () => {
  useEffect(() => {
    document.title = 'Sale | Gym Manager - Area Proprietario';
  }, []);

  return <GymRoomsManager />;
};

export default OwnerRooms;