import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface UserCreditsData {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_credits: number;
  gym_credits: number;
  total_transactions: number;
  calculated_balance: number;
  has_discrepancy: boolean;
}

export const UserCreditsDebugPanel = () => {
  const [usersData, setUsersData] = useState<UserCreditsData[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedGym } = useOwnerGym();
  const { toast } = useToast();

  const fetchUserCreditsData = async () => {
    if (!selectedGym) return;
    
    setLoading(true);
    // Temporarily disabled - needs proper RPC function setup
    setLoading(false);
  };

  const fixUserCredits = async (userId: string) => {
    // Temporarily disabled - needs proper RPC function setup
    toast({
      title: "Info",
      description: "Funzione temporaneamente disabilitata"
    });
  };

  useEffect(() => {
    fetchUserCreditsData();
  }, [selectedGym]);

  if (!selectedGym) {
    return <div>Seleziona una palestra per visualizzare i dati dei crediti</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Debug Crediti Utenti
            <Badge variant="outline">{selectedGym.name}</Badge>
          </CardTitle>
          <Button
            onClick={fetchUserCreditsData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div>Caricamento...</div>
        ) : (
          <div className="space-y-4">
            {usersData.length === 0 ? (
              <p className="text-muted-foreground">Nessun dato disponibile</p>
            ) : (
              usersData.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span>Crediti Palestra: <strong>{user.gym_credits}</strong></span>
                      <span>Crediti Profilo: <strong>{user.profile_credits}</strong></span>
                      <span>Calcolati: <strong>{user.calculated_balance}</strong></span>
                      <span>Transazioni: {user.total_transactions}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.has_discrepancy ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <Button
                          onClick={() => fixUserCredits(user.user_id)}
                          size="sm"
                          variant="destructive"
                        >
                          Correggi
                        </Button>
                      </>
                    ) : (
                      <CheckCircle className="w-5 h-5 text-success" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};