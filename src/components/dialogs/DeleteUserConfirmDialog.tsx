import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeleteUserConfirmDialogProps {
  userEmail: string;
  userName: string;
  onUserDeleted: () => void;
}

export const DeleteUserConfirmDialog: React.FC<DeleteUserConfirmDialogProps> = ({
  userEmail,
  userName,
  onUserDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDeleteUser = async () => {
    try {
      setIsDeleting(true);

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { email: userEmail }
      });

      if (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Errore",
          description: error.message || "Impossibile eliminare l'utente",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Utente eliminato",
        description: `L'utente ${userName} (${userEmail}) è stato eliminato con successo`,
      });

      setOpen(false);
      onUserDeleted();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione dell'utente",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive" 
          size="sm"
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conferma eliminazione utente</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler eliminare definitivamente l'utente <strong>{userName}</strong> ({userEmail})?
            <br /><br />
            <strong>Questa azione:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Eliminerà completamente l'account utente</li>
              <li>Anonimizzerà i messaggi chat e le prenotazioni</li>
              <li>Rimuoverà tutti i dati personali</li>
              <li>Non potrà essere annullata</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Annulla
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteUser}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina Utente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};