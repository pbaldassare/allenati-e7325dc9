import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, FileText, Calendar, TrendingUp, Award, LogOut, Coins, Star, CreditCard, ShoppingBag } from "lucide-react";
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
    <div className="pb-20 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 text-center relative">
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
          <ThemeToggle />
        </div>
        <Avatar className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-3 border-3 border-primary ring-4 ring-primary/20">
          <AvatarImage src={user?.profile_picture_url || undefined} alt="Foto profilo" />
          <AvatarFallback className="text-lg sm:text-xl font-space font-bold">{userInitials}</AvatarFallback>
        </Avatar>
        <h1 className="text-xl sm:text-2xl font-space font-bold">{userName}</h1>
        <Badge className="mt-2 bg-gradient-accent text-white font-medium text-xs sm:text-sm px-3 py-1">
          <Award className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          {user?.role === 'admin' ? 'Admin' : 
           user?.role === 'gym_owner' ? 'Proprietario' :
           user?.role === 'instructor' ? 'Istruttore' : 'Utente'}
        </Badge>
        {user?.gym_name && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{user.gym_name}</p>
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-3 sm:p-4">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary">1</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-3 sm:p-4">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-secondary">3</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Month</p>
          </CardContent>
        </Card>
        <Card className="shadow-card text-center transition-all duration-300">
          <CardContent className="p-3 sm:p-4">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-accent">22</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Year</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Stats */}
      <Card className="shadow-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm sm:text-base text-foreground">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>Questo studente ha partecipato a <span className="font-mono font-semibold text-primary">903</span> classi in totale</span>
          </div>
        </CardContent>
      </Card>


      {/* Profile Actions */}
      <div className="space-y-2 sm:space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => navigate('/impostazioni')}
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Impostazioni
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => onTabChange?.("leaderboard")}
        >
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Classifica
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => setShowCreditsPurchase(true)}
        >
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Gestisci Crediti
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => window.location.href = '/abbonamenti'}
        >
          <Star className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Gestisci Abbonamento
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => navigate('/certificato-medico')}
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Certificato Medico
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
          onClick={() => navigate('/shop')}
        >
          <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Shop
        </Button>
        
        <Button 
          onClick={handleLogout}
          variant="destructive" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px]"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-3" />
          Esci
        </Button>
      </div>
    </div>
  );
};