import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface MinorGuardianValues {
  firstName: string;
  lastName: string;
  phone: string;
}

interface MinorGuardianModalProps {
  open: boolean;
  onClose: () => void;
  values: MinorGuardianValues;
  onSave: (values: MinorGuardianValues) => void;
}

export const MinorGuardianModal: React.FC<MinorGuardianModalProps> = ({ open, onClose, values, onSave }) => {
  const [firstName, setFirstName] = useState(values.firstName || '');
  const [lastName, setLastName] = useState(values.lastName || '');
  const [phone, setPhone] = useState(values.phone || '');

  useEffect(() => {
    if (open) {
      setFirstName(values.firstName || '');
      setLastName(values.lastName || '');
      setPhone(values.phone || '');
    }
  }, [open, values]);

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0 && phone.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dati genitore/tutore</DialogTitle>
          <DialogDescription>
            Per utenti con meno di 16 anni è necessario fornire i dati di un genitore o tutore.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="guardianFirstName">Nome genitore *</Label>
              <Input
                id="guardianFirstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nome"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianLastName">Cognome genitore *</Label>
              <Input
                id="guardianLastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Cognome"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guardianPhone">Cellulare genitore *</Label>
            <Input
              id="guardianPhone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Es. +39 3xx xxx xxxx"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annulla</Button>
          <Button
            onClick={() => onSave({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() })}
            disabled={!canSave}
          >
            Conferma
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
