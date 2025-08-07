import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Dumbbell } from "lucide-react";

export const Dashboard = () => {
  return (
    <div className="pb-20 px-4 space-y-8">
      {/* Modern Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-4xl font-bold gradient-text mb-2">Ciao, Marco! 👋</h1>
        <p className="text-muted-foreground text-lg font-medium">Benvenuto nella tua palestra</p>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-primary text-primary-foreground shadow-glow border-0 animate-float">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">12</p>
                <p className="text-sm opacity-90 font-medium">Classi questo mese</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-secondary-foreground shadow-glow border-0 animate-float" style={{animationDelay: '0.5s'}}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-10 w-10 animate-glow" />
              <div>
                <p className="text-3xl font-bold">3°</p>
                <p className="text-sm opacity-90 font-medium">Posizione classifica</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern Status Abbonamento */}
      <Card className="shadow-glow bg-gradient-accent/5 border-accent/20 glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="gradient-text font-bold">Abbonamento Premium</span>
            <Badge className="bg-gradient-success text-success-foreground font-semibold px-3 py-1">Attivo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-xl font-bold">Piano Illimitato</p>
            <p className="text-base text-muted-foreground font-medium">Scade il 25 Marzo 2025</p>
            <div className="w-full bg-muted rounded-full h-3 mt-4 overflow-hidden">
              <div className="bg-gradient-primary h-3 rounded-full shadow-glow transition-smooth animate-glow" style={{width: '75%'}}></div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">23 giorni rimanenti</p>
          </div>
        </CardContent>
      </Card>

      {/* Modern Prossimi Corsi */}
      <Card className="shadow-glow glass">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <Calendar className="h-6 w-6 text-primary" />
            Prossimi Corsi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-primary/10 rounded-2xl border border-primary/20 hover:scale-[1.02] transition-bounce">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
                <Dumbbell className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">BJJ Intermedio</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                  <Clock className="h-4 w-4" />
                  <span>19:00 - 20:15</span>
                  <Users className="h-4 w-4 ml-1" />
                  <span>8/12</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="success" className="font-semibold">
              Prenotato
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-secondary/10 rounded-2xl border border-secondary/20 hover:scale-[1.02] transition-bounce">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-secondary rounded-2xl flex items-center justify-center shadow-glow">
                <Dumbbell className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">Yoga</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium">
                  <Clock className="h-4 w-4" />
                  <span>10:00 - 11:00</span>
                  <Users className="h-4 w-4 ml-1" />
                  <span>5/15</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline" className="font-semibold hover:bg-secondary hover:text-secondary-foreground">
              Prenota
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};