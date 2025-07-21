import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Trophy, Dumbbell } from "lucide-react";

export const Dashboard = () => {
  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4">
        <h1 className="text-3xl font-bold text-foreground">Ciao, Marco!</h1>
        <p className="text-muted-foreground mt-1">Benvenuto nella tua palestra</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-primary text-primary-foreground shadow-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8" />
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm opacity-90">Classi questo mese</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-secondary-foreground shadow-secondary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-8 w-8" />
              <div>
                <p className="text-2xl font-bold">3°</p>
                <p className="text-sm opacity-90">Posizione classifica</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Abbonamento */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Abbonamento Attivo
            <Badge className="bg-success text-success-foreground">Attivo</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-lg font-semibold">Piano Illimitato</p>
            <p className="text-sm text-muted-foreground">Scade il 25 Marzo 2025</p>
            <div className="w-full bg-muted rounded-full h-2 mt-3">
              <div className="bg-primary h-2 rounded-full" style={{width: '75%'}}></div>
            </div>
            <p className="text-xs text-muted-foreground">23 giorni rimanenti</p>
          </div>
        </CardContent>
      </Card>

      {/* Prossimi Corsi */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Prossimi Corsi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold">BJJ Intermedio</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>19:00 - 20:15</span>
                  <Users className="h-4 w-4 ml-2" />
                  <span>8/12</span>
                </div>
              </div>
            </div>
            <Button size="sm" className="bg-success text-success-foreground">
              Prenotato
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                <Dumbbell className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="font-semibold">Yoga</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>10:00 - 11:00</span>
                  <Users className="h-4 w-4 ml-2" />
                  <span>5/15</span>
                </div>
              </div>
            </div>
            <Button size="sm" variant="outline">
              Prenota
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};