import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction, Sparkles } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface LeaderboardProps {
  onBack?: () => void;
}

export const Leaderboard = ({ onBack }: LeaderboardProps) => {
  const navigate = useNavigate();

  return (
    <div className="pb-20 px-4 space-y-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header con tasto indietro */}
        <div className="flex items-center gap-4 mb-8 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/', { replace: true });
              }
            }}
            className="flex items-center gap-2 hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna indietro
          </Button>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Classifica</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Compete with Friends</p>
          </div>
        </div>

        {/* Under Development Section */}
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
          {/* Main Card */}
          <Card className="w-full max-w-lg bg-gradient-to-br from-primary/5 via-background to-accent/5 border-2 border-primary/20 shadow-xl animate-fade-in">
            <CardContent className="p-8 text-center space-y-6">
              {/* Animated Icon */}
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse opacity-20"></div>
                <div className="relative w-full h-full bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
                  <Construction className="h-12 w-12 text-white animate-bounce" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-accent animate-pulse" />
                <Sparkles className="absolute -bottom-1 -left-2 h-4 w-4 text-primary animate-pulse delay-300" />
              </div>

              {/* Main Title */}
              <div className="space-y-3">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Sezione in Sviluppo
                </h2>
                <p className="text-lg text-muted-foreground">
                  Stiamo lavorando per portarti presto questa funzionalità
                </p>
              </div>

              {/* Description */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  La classifica sarà presto disponibile per confrontarti con i tuoi amici e vedere chi partecipa a più lezioni!
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-primary">
                  <Sparkles className="h-3 w-3" />
                  <span>Coming Soon</span>
                  <Sparkles className="h-3 w-3" />
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso sviluppo</span>
                  <span>75%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: '75%' }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
            <Card className="bg-gradient-to-br from-fitness-primary/10 to-fitness-primary/5 border-fitness-primary/20 hover-scale">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 bg-fitness-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">🏆</span>
                </div>
                <h4 className="font-semibold text-sm mb-1">Classifiche</h4>
                <p className="text-xs text-muted-foreground">Mensili e settimanali</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-strength-primary/10 to-strength-primary/5 border-strength-primary/20 hover-scale">
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 bg-strength-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-sm">🎯</span>
                </div>
                <h4 className="font-semibold text-sm mb-1">Obiettivi</h4>
                <p className="text-xs text-muted-foreground">Sfide personalizzate</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};