import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Errore",
        description: "Inserisci la tua email",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        toast({
          title: "Errore",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Email inviata",
          description: "Controlla la tua email per le istruzioni di reset password"
        });
        onClose();
        setEmail('');
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio dell'email",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Password dimenticata?
          </DialogTitle>
          <DialogDescription className="text-center">
            Inserisci la tua email per ricevere le istruzioni di reset
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="mario@esempio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="h-12"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Annulla
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                'Invia Reset'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};