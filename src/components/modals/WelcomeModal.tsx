import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Sparkles, Calendar, Users } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const WelcomeModal = ({ isOpen, onClose, userName }: WelcomeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Benvenuto{userName ? `, ${userName}` : ""}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-foreground">Credito di Benvenuto</h3>
                  <p className="text-sm text-muted-foreground">
                    Hai ricevuto <span className="font-bold text-primary">1 credito gratuito</span> per iniziare il tuo percorso!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h4 className="font-semibold text-center">Cosa puoi fare ora:</h4>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-secondary flex-shrink-0" />
                <span>Scegli il tuo piano di abbonamento preferito</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-5 h-5 text-secondary flex-shrink-0" />
                <span>Prenota la tua prima lezione</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Sparkles className="w-5 h-5 text-secondary flex-shrink-0" />
                <span>Esplora tutti i corsi disponibili</span>
              </div>
            </div>
          </div>


          <Button 
            onClick={onClose} 
            className="w-full bg-gradient-primary text-primary-foreground"
            size="lg"
          >
            Inizia il tuo percorso!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};