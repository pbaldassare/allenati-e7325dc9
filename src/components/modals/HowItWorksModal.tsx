import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Smartphone, 
  CreditCard, 
  Calendar, 
  Users, 
  Clock,
  Trophy,
  Infinity,
  CheckCircle
} from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Come funziona l'app Allenati
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cos'è */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Cos'è Allenati?
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              La tua app per prenotare corsi fitness in modo semplice e veloce. 
              Scegli tra centinaia di corsi, prenota il tuo posto e allena il tuo corpo come preferisci.
            </p>
          </div>

          <Separator />

          {/* Sistema Crediti */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              💳 Sistema Crediti
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>1 credito gratuito di benvenuto al primo accesso</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>1 credito = 1 prenotazione corso</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Acquista crediti aggiuntivi quando ne hai bisogno</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>I crediti non scadono mai!</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Come Funziona */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              🚀 Come Funziona
            </h3>
            <div className="grid gap-3">
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">1</div>
                    <div>
                      <p className="text-sm font-medium">Scegli il corso</p>
                      <p className="text-xs text-muted-foreground">Naviga tra i corsi disponibili e trova quello perfetto per te</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-secondary">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-secondary text-white text-xs flex items-center justify-center font-bold">2</div>
                    <div>
                      <p className="text-sm font-medium">Prenota il tuo posto</p>
                      <p className="text-xs text-muted-foreground">Usa 1 credito per prenotare istantaneamente</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-accent">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">3</div>
                    <div>
                      <p className="text-sm font-medium">Allenati!</p>
                      <p className="text-xs text-muted-foreground">Partecipa al corso e raggiungi i tuoi obiettivi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Vantaggi */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              ✨ Vantaggi
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Prenotazioni istantanee 24/7</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-green-500" />
                <span>Cancellazioni flessibili</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-purple-500" />
                <span>Centinaia di corsi disponibili</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Infinity className="w-4 h-4 text-orange-500" />
                <span>Crediti che non scadono</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Ricarica Crediti */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              💰 Come Ricaricare i Crediti
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Quando i tuoi crediti stanno per finire, puoi acquistarne di nuovi direttamente dall'app.
              Vai su <span className="font-medium text-foreground">"Abbonamenti"</span> e scegli il pacchetto più adatto alle tue esigenze.
            </p>
          </div>

          <Button 
            onClick={onClose} 
            className="w-full bg-gradient-primary text-white"
            size="lg"
          >
            Ho capito, iniziamo!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};