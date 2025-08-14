import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Settings, FileText, Calendar, TrendingUp, Award, LogOut, Coins, Star, CreditCard } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CreditsBalance } from "@/components/credits/CreditsBalance";
import { useState } from "react";
import { CreditsPurchase } from "@/components/credits/CreditsPurchase";
import { CreditsHistory } from "@/components/credits/CreditsHistory";

interface ProfileProps {
  onTabChange?: (tab: string) => void;
}

export const Profile = ({ onTabChange }: ProfileProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreditsPurchase, setShowCreditsPurchase] = useState(false);
  const [creditsKey, setCreditsKey] = useState(0);
  
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
        <Avatar className="w-24 sm:w-20 h-24 sm:h-20 mx-auto mb-3 border-3 border-primary ring-4 ring-primary/20">
          <AvatarFallback className="text-xl sm:text-lg font-space font-bold">{userInitials}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl sm:text-xl font-space font-bold">{userName}</h1>
        <Badge className="mt-2 bg-gradient-accent text-white font-medium text-sm">
          <Award className="w-4 h-4 sm:w-3 sm:h-3 mr-1" />
          {user?.role === 'admin' ? 'Admin' : 
           user?.role === 'gym_owner' ? 'Proprietario' :
           user?.role === 'instructor' ? 'Istruttore' : 'Utente'}
        </Badge>
        {user?.gym_name && (
          <p className="text-base sm:text-sm text-foreground sm:text-muted-foreground mt-1">{user.gym_name}</p>
        )}
      </div>

      {/* Credits Section */}
      <CreditsBalance 
        key={creditsKey}
        onPurchaseClick={() => setShowCreditsPurchase(true)} 
      />

      {/* Credits Purchase Modal */}
      {showCreditsPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Gestione Crediti</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowCreditsPurchase(false)}
                >
                  ✕
                </Button>
              </div>
              <CreditsPurchase 
                onPurchaseComplete={() => {
                  setCreditsKey(prev => prev + 1);
                  setShowCreditsPurchase(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-4 sm:p-3">
            <p className="text-3xl sm:text-2xl font-mono font-bold text-primary">1</p>
            <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-4 sm:p-3">
            <p className="text-3xl sm:text-2xl font-mono font-bold text-secondary">3</p>
            <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">Month</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-4 sm:p-3">
            <p className="text-3xl sm:text-2xl font-mono font-bold text-accent">22</p>
            <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground">Year</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Stats */}
      <Card className="shadow-card">
        <CardContent className="p-4 sm:p-3">
          <div className="flex items-center gap-2 text-base sm:text-lg text-foreground">
            <TrendingUp className="h-5 w-5 sm:h-4 sm:w-4" />
            <span>Questo studente ha partecipato a <span className="font-mono font-semibold text-primary">903</span> classi in totale</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Classes */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl sm:text-lg font-space">
            <Calendar className="h-5 w-5 sm:h-4 sm:w-4" />
            Ultime Classi Frequentate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentClasses.map((classItem, index) => (
            <div key={index} className="flex items-center justify-between p-3 sm:p-2 border border-border rounded-xl hover:bg-accent/10 transition-all duration-300">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 sm:w-8 sm:h-8">
                  <AvatarFallback className="text-sm sm:text-xs font-space font-semibold">
                    {classItem.instructor[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-base sm:text-sm">{classItem.name}</p>
                  <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground font-mono">{classItem.time}</p>
                </div>
              </div>
              <p className="text-sm sm:text-xs text-foreground sm:text-muted-foreground font-mono">{classItem.date}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Profile Actions */}
      <div className="space-y-3 sm:space-y-2">
        <Button 
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 transition-all duration-300"
          onClick={() => navigate('/impostazioni')}
        >
          <Settings className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Impostazioni
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 transition-all duration-300"
          onClick={() => onTabChange?.("leaderboard")}
        >
          <TrendingUp className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Classifica
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 transition-all duration-300"
          onClick={() => setShowCreditsPurchase(true)}
        >
          <CreditCard className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Gestisci Crediti
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 transition-all duration-300"
          onClick={() => window.location.href = '/abbonamenti'}
        >
          <Star className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Gestisci Abbonamento
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 transition-all duration-300"
          onClick={() => navigate('/certificato-medico')}
        >
          <FileText className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Certificato Medico
        </Button>
        
        <Button 
          onClick={handleLogout}
          variant="outline" 
          className="w-full justify-start text-base sm:text-sm h-12 sm:h-10 text-destructive hover:text-destructive transition-all duration-300"
        >
          <LogOut className="w-5 h-5 sm:w-4 sm:h-4 mr-3" />
          Esci
        </Button>
      </div>
    </div>
  );
};