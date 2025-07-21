import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, FileText, Calendar, TrendingUp, Award, LogOut } from "lucide-react";

export const Profile = () => {
  const recentClasses = [
    { name: "BJJ Morning", time: "10:00 - 11:00", date: "February 5", instructor: "Marco" },
    { name: "BJJ Intermediate", time: "19:00 - 20:15", date: "February 2", instructor: "Andrea" },
    { name: "Yoga", time: "10:00 - 11:00", date: "February 1", instructor: "Sofia" },
    { name: "BJJ Basic", time: "10:00 - 11:00", date: "January 31", instructor: "Luca" },
    { name: "Wrestling", time: "19:00 - 20:00", date: "January 30", instructor: "Marco" },
  ];

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4 text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary ring-4 ring-primary/20">
          <AvatarFallback className="text-2xl font-bold">BR</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">Brando Rossi</h1>
        <Badge className="mt-2 bg-warning text-warning-foreground">
          <Award className="w-4 h-4 mr-1" />
          Brown Belt
        </Badge>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-card text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-primary">1</p>
            <p className="text-sm text-muted-foreground">Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-secondary">3</p>
            <p className="text-sm text-muted-foreground">Month</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-accent">22</p>
            <p className="text-sm text-muted-foreground">Year</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Stats */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Questo studente ha partecipato a 903 classi in totale</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Classes */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ultime Classi Frequentate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentClasses.map((classItem, index) => (
            <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-sm font-semibold">
                    {classItem.instructor[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{classItem.name}</p>
                  <p className="text-sm text-muted-foreground">{classItem.time}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{classItem.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Profile Actions */}
      <div className="space-y-3">
        <Button variant="outline" size="lg" className="w-full justify-start">
          <Settings className="w-5 h-5 mr-3" />
          Impostazioni
        </Button>
        
        <Button variant="outline" size="lg" className="w-full justify-start">
          <FileText className="w-5 h-5 mr-3" />
          Certificato Medico
        </Button>
        
        <Button variant="outline" size="lg" className="w-full justify-start text-destructive hover:text-destructive">
          <LogOut className="w-5 h-5 mr-3" />
          Esci
        </Button>
      </div>
    </div>
  );
};