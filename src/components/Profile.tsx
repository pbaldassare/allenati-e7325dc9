
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, FileText, Calendar, TrendingUp, Award, LogOut, Coins, Star, CreditCard, ShoppingBag, Sparkles, Zap } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useUserBeltVisibility } from "@/hooks/useUserBeltVisibility";
import { CreditsBalance } from "@/components/credits/CreditsBalance";
import { useState } from "react";
import { CreditsPurchase } from "@/components/credits/CreditsPurchase";
import { CreditsHistory } from "@/components/credits/CreditsHistory";
import { useUserStats } from "@/hooks/useUserStats";

interface ProfileProps {
  onTabChange?: (tab: string) => void;
}

export const Profile = ({ onTabChange }: ProfileProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showCreditsPurchase, setShowCreditsPurchase] = useState(false);
  const [creditsKey, setCreditsKey] = useState(0);
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const { shouldShowBelt } = useUserBeltVisibility();
  
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

  const userInitials = user?.first_name?.[0] + user?.last_name?.[0] || 'U';
  const userName = `${user?.first_name || 'Utente'} ${user?.last_name || ''}`.trim();

  return (
    <div className="pb-20 px-3 sm:px-4 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="pt-6 sm:pt-8 pb-3 sm:pb-4 text-center relative">
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
          <ThemeToggle />
        </div>
        <div className="relative">
          <Avatar className="w-20 sm:w-24 h-20 sm:h-24 mx-auto mb-3 border-3 border-primary ring-4 ring-primary/20 shadow-glow transition-all duration-300 hover:scale-110">
            <AvatarImage src={user?.profile_picture_url || undefined} alt="Foto profilo" />
            <AvatarFallback className="text-lg sm:text-xl font-space font-bold bg-gradient-primary text-white">{userInitials}</AvatarFallback>
          </Avatar>
          <Sparkles className="absolute top-0 right-1/2 translate-x-12 w-4 h-4 text-secondary animate-pulse" />
        </div>
        <h1 className="text-xl sm:text-2xl font-space font-bold bg-gradient-text bg-clip-text text-transparent">
          {userName}
        </h1>
        <Badge className="mt-2 bg-gradient-accent text-white font-medium text-xs sm:text-sm px-3 py-1 shadow-glow animate-pulse">
          <Award className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          {user?.role === 'admin' ? 'Admin' : 
           user?.role === 'gym_owner' ? 'Proprietario' :
           user?.role === 'instructor' ? 'Istruttore' : 'Utente'}
        </Badge>
        {shouldShowBelt && user?.belt && user.belt !== 'Nessuna' && (
          <Badge variant="outline" className="mt-2 border-primary text-primary">
            <Award className="w-3 h-3 mr-1" />
            Cintura {user.belt}
          </Badge>
        )}
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
        <Card className="shadow-glow text-center transition-all duration-300 hover:scale-105 bg-gradient-primary/5 border-primary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-primary opacity-5" />
          <CardContent className="p-3 sm:p-4 relative z-10">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-primary">
              {statsLoading ? '...' : stats.weekClasses}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Settimana</p>
            <Zap className="w-3 h-3 absolute top-2 right-2 text-primary animate-pulse" />
          </CardContent>
        </Card>
        <Card className="shadow-glow text-center transition-all duration-300 hover:scale-105 bg-gradient-secondary/5 border-secondary/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-secondary opacity-5" />
          <CardContent className="p-3 sm:p-4 relative z-10">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-secondary">
              {statsLoading ? '...' : stats.monthClasses}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Mese</p>
            <Star className="w-3 h-3 absolute top-2 right-2 text-secondary animate-pulse" />
          </CardContent>
        </Card>
        <Card className="shadow-glow text-center transition-all duration-300 hover:scale-105 bg-gradient-accent/5 border-accent/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-accent opacity-5" />
          <CardContent className="p-3 sm:p-4 relative z-10">
            <p className="text-2xl sm:text-3xl font-mono font-bold text-accent">
              {statsLoading ? '...' : stats.yearClasses}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">Anno</p>
            <Sparkles className="w-3 h-3 absolute top-2 right-2 text-accent animate-pulse" />
          </CardContent>
        </Card>
      </div>

      {/* Overall Stats */}
      <Card className="shadow-glow bg-gradient-subtle border-primary/20 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-primary opacity-5" />
        <CardContent className="p-3 sm:p-4 relative z-10">
          <div className="flex items-center gap-3 text-sm sm:text-base text-foreground">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-primary" />
            <span>
              Questo studente ha partecipato a{' '}
              <span className="font-mono font-bold text-xl bg-gradient-text bg-clip-text text-transparent">
                {statsLoading ? '...' : stats.totalClasses}
              </span>
              {' '}classi in totale
            </span>
            <Sparkles className="w-4 h-4 text-secondary animate-pulse ml-auto" />
          </div>
        </CardContent>
      </Card>

      {/* Profile Actions */}
      <div className="space-y-2 sm:space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-primary hover:text-white hover:border-primary hover:shadow-glow group"
          onClick={() => navigate('/impostazioni')}
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:rotate-90 transition-transform" />
          Impostazioni
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-secondary hover:text-white hover:border-secondary hover:shadow-glow group"
          onClick={() => onTabChange?.("leaderboard")}
        >
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Classifica
          <Star className="w-3 h-3 ml-auto group-hover:animate-pulse" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-accent hover:text-white hover:border-accent hover:shadow-glow group"
          onClick={() => navigate('/subscriptions')}
        >
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Gestisci Crediti e Abbonamenti
          <Sparkles className="w-3 h-3 ml-auto group-hover:animate-pulse" />
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-primary hover:text-white hover:border-primary hover:shadow-glow group"
          onClick={() => navigate('/certificato-medico')}
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Certificato Medico
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-secondary hover:text-white hover:border-secondary hover:shadow-glow group"
          onClick={() => navigate('/documenti')}
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Documenti Palestra
        </Button>
        
        <Button 
          onClick={handleLogout}
          variant="destructive" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:shadow-glow group"
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Esci
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm sm:text-base h-12 transition-all duration-300 min-h-[44px] hover:bg-gradient-accent hover:text-white hover:border-accent hover:shadow-glow group"
          onClick={() => navigate('/shop')}
        >
          <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mr-3 group-hover:scale-110 transition-transform" />
          Shop
          <Zap className="w-3 h-3 ml-auto group-hover:animate-pulse" />
        </Button>
      </div>
    </div>
  );
};
