import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CheckCircle, Clock, AlertCircle, Building2 } from 'lucide-react';

interface GymJoinRequest {
  id: string;
  gym: {
    name: string;
    city: string;
  };
  status: string;
  created_at: string;
  message?: string;
}

export function GymRequestsCard() {
  const { user } = useAuth();
  const { refreshGyms } = useGym();
  const { toast } = useToast();
  const [requests, setRequests] = useState<GymJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('gym_join_requests')
        .select(`
          id,
          status,
          created_at,
          message,
          gym:gyms(name, city)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading gym requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approvata';
      case 'rejected':
        return 'Rifiutata';
      default:
        return 'In attesa';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-muted-foreground">Caricamento richieste...</div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5" />
            Richieste Palestre
          </CardTitle>
          <CardDescription>
            Le tue richieste di accesso alle palestre
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          Nessuna richiesta effettuata
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5" />
          Richieste Palestre
        </CardTitle>
        <CardDescription>
          Le tue richieste di accesso alle palestre
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {requests.slice(0, 3).map((request) => (
          <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="font-medium">{request.gym.name}</div>
              <div className="text-sm text-muted-foreground">{request.gym.city}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(request.created_at).toLocaleDateString('it-IT')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(request.status)}
              <Badge className={`text-xs ${getStatusColor(request.status)}`}>
                {getStatusText(request.status)}
              </Badge>
            </div>
          </div>
        ))}
        
        {requests.length > 3 && (
          <div className="text-center pt-2">
            <Button variant="link" size="sm">
              Vedi tutte ({requests.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}