import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, FileText, Calendar, TrendingUp, Award, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { MedicalCertificate } from "./MedicalCertificate";

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout effettuato",
        description: "Arrivederci!"
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il logout",
        variant: "destructive"
      });
    }
  };

  const recentClasses = [
    { name: "BJJ Morning", time: "10:00 - 11:00", date: "February 5", instructor: "Marco" },
    { name: "BJJ Intermediate", time: "19:00 - 20:15", date: "February 2", instructor: "Andrea" },
    { name: "Yoga", time: "10:00 - 11:00", date: "February 1", instructor: "Sofia" },
    { name: "BJJ Basic", time: "10:00 - 11:00", date: "January 31", instructor: "Luca" },
    { name: "Wrestling", time: "19:00 - 20:00", date: "January 30", instructor: "Marco" },
  ];

  const userInitials = user?.first_name?.[0] + user?.last_name?.[0] || 'U';
  const userName = `${user?.first_name || 'Utente'} ${user?.last_name || ''}`.trim();

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4 text-center relative">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Avatar className="w-20 h-20 mx-auto mb-3 border-3 border-primary ring-4 ring-primary/20">
          <AvatarFallback className="text-lg font-space font-bold">{userInitials}</AvatarFallback>
        </Avatar>
        <h1 className="text-xl font-space font-bold">{userName}</h1>
        <Badge className="mt-2 bg-gradient-accent text-white font-medium">
          <Award className="w-3 h-3 mr-1" />
          {user?.role === 'admin' ? 'Admin' : 
           user?.role === 'gym_owner' ? 'Proprietario' :
           user?.role === 'instructor' ? 'Istruttore' : 'Utente'}
        </Badge>
        {user?.gym_name && (
          <p className="text-sm text-muted-foreground mt-1">{user.gym_name}</p>
        )}
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-glow text-center hover:scale-105 transition-all duration-300">
          <CardContent className="p-3">
            <p className="text-2xl font-mono font-bold text-primary">1</p>
            <p className="text-2xs text-muted-foreground">Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-glow text-center hover:scale-105 transition-all duration-300">
          <CardContent className="p-3">
            <p className="text-2xl font-mono font-bold text-secondary">3</p>
            <p className="text-2xs text-muted-foreground">Month</p>
          </CardContent>
        </Card>
        <Card className="shadow-glow text-center hover:scale-105 transition-all duration-300">
          <CardContent className="p-3">
            <p className="text-2xl font-mono font-bold text-accent">22</p>
            <p className="text-2xs text-muted-foreground">Year</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Stats */}
      <Card className="shadow-glow glass">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Questo studente ha partecipato a <span className="font-mono font-semibold text-primary">903</span> classi in totale</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Classes */}
      <Card className="shadow-glow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-space">
            <Calendar className="h-4 w-4" />
            Ultime Classi Frequentate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentClasses.map((classItem, index) => (
            <div key={index} className="flex items-center justify-between p-2 border border-border rounded-xl hover:bg-accent/10 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs font-space font-semibold">
                    {classItem.instructor[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{classItem.name}</p>
                  <p className="text-2xs text-muted-foreground font-mono">{classItem.time}</p>
                </div>
              </div>
              <p className="text-2xs text-muted-foreground font-mono">{classItem.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Medical Certificate Section */}
      <MedicalCertificate />

      {/* Profile Actions */}
      <div className="space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm h-10 hover:scale-105 transition-all duration-300"
          onClick={() => navigate('/settings')}
        >
          <Settings className="w-4 h-4 mr-3" />
          Impostazioni
        </Button>
        
        
        <Button 
          onClick={handleLogout}
          variant="outline" 
          className="w-full justify-start text-sm h-10 text-destructive hover:text-destructive hover:scale-105 transition-all duration-300"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Esci
        </Button>
      </div>
    </div>
  );
};