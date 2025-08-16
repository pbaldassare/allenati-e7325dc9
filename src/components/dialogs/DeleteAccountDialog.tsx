import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription,
  AlertDialogFooter
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [confirmDataLoss, setConfirmDataLoss] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFormValid = 
    password.length > 0 && 
    confirmationText === 'ELIMINA IL MIO ACCOUNT' && 
    confirmUnderstood && 
    confirmDataLoss;

  const handleDeleteAccount = async () => {
    if (!isFormValid) return;

    setIsDeleting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Sessione non valida');
      }

      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: {
          confirmationText,
          password
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;

      toast({
        title: 'Account eliminato',
        description: 'Il tuo account è stato eliminato con successo.',
      });

      // Logout and redirect
      await logout();
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({
        title: 'Errore',
        description: error.message || 'Errore durante l\'eliminazione dell\'account.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setPassword('');
    setConfirmationText('');
    setConfirmUnderstood(false);
    setConfirmDataLoss(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle>Elimina Account</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 text-left">
            <p className="font-medium text-foreground">
              Questa azione è irreversibile e comporterà:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Eliminazione completa del tuo profilo</li>
              <li>Perdita di tutti i crediti residui</li>
              <li>Annullamento di tutti gli abbonamenti attivi</li>
              <li>Rimozione da tutte le palestre e chat</li>
              <li>Eliminazione di tutte le tue preferenze</li>
            </ul>
            <p className="text-sm font-medium text-destructive">
              I dati storici delle prenotazioni verranno mantenuti in forma anonima per finalità statistiche.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Password Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="password">Conferma la tua password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la tua password"
              disabled={isDeleting}
            />
          </div>

          {/* Text Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Scrivi <span className="font-mono font-bold">ELIMINA IL MIO ACCOUNT</span> per confermare
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="ELIMINA IL MIO ACCOUNT"
              disabled={isDeleting}
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="understand"
                checked={confirmUnderstood}
                onCheckedChange={(checked) => setConfirmUnderstood(checked === true)}
                disabled={isDeleting}
              />
              <Label htmlFor="understand" className="text-sm leading-5">
                Comprendo che questa azione è irreversibile e non potrò recuperare i miei dati
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="dataLoss"
                checked={confirmDataLoss}
                onCheckedChange={(checked) => setConfirmDataLoss(checked === true)}
                disabled={isDeleting}
              />
              <Label htmlFor="dataLoss" className="text-sm leading-5">
                Accetto la perdita di tutti i miei crediti, abbonamenti e dati personali
              </Label>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Annulla
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={!isFormValid || isDeleting}
            className="w-full sm:w-auto"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeleting ? 'Eliminazione...' : 'Elimina Account'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}