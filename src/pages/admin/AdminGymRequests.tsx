import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Building, Clock, User, MessageSquare, Check, X, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface GymRequest {
  id: string;
  requester_user_id: string;
  gym_id: string;
  status: string;
  message: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
  gyms: {
    name: string;
    city: string;
  };
}

export default function AdminGymRequests() {
  const [requests, setRequests] = useState<GymRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from('additional_gym_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data manually
      const requestsWithData = await Promise.all(
        (requestsData || []).map(async (request) => {
          const [profileData, gymData] = await Promise.all([
            supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('user_id', request.requester_user_id)
              .single(),
            supabase
              .from('gyms')
              .select('name, city')
              .eq('id', request.gym_id)
              .single()
          ]);

          return {
            ...request,
            profiles: profileData.data || { first_name: '', last_name: '', email: '' },
            gyms: gymData.data || { name: '', city: '' }
          };
        })
      );

      setRequests(requestsWithData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento delle richieste',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase.functions.invoke('approve-gym-request', {
        body: { requestId, action: 'approve' }
      });

      if (error) throw error;

      toast({
        title: 'Richiesta Approvata',
        description: 'La richiesta è stata approvata con successo',
      });

      await fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: 'Errore',
        description: 'Errore nell\'approvazione della richiesta',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequestId) return;
    
    setProcessingRequest(selectedRequestId);
    try {
      const { error } = await supabase.functions.invoke('approve-gym-request', {
        body: { 
          requestId: selectedRequestId, 
          action: 'reject',
          reason: rejectionReason 
        }
      });

      if (error) throw error;

      toast({
        title: 'Richiesta Rifiutata',
        description: 'La richiesta è stata rifiutata',
      });

      setRejectionReason('');
      setSelectedRequestId(null);
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel rifiuto della richiesta',
        variant: 'destructive',
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">In Attesa</Badge>;
      case 'approved':
        return <Badge variant="default">Approvata</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rifiutata</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Richieste Collegamento Palestre</h1>
        <p className="text-muted-foreground">
          Gestisci le richieste di collegamento a palestre aggiuntive
        </p>
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">
              Nessuna richiesta trovata
            </h3>
            <p className="text-muted-foreground text-center">
              Non ci sono richieste di collegamento palestre al momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">
                        {request.profiles.first_name} {request.profiles.last_name}
                      </CardTitle>
                      <CardDescription>{request.profiles.email}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{request.gyms.name}</span>
                  <span className="text-muted-foreground">- {request.gyms.city}</span>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {format(new Date(request.created_at), 'dd MMMM yyyy - HH:mm', { locale: it })}
                  </span>
                </div>

                {request.message && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Messaggio:</span>
                    </div>
                    <p className="text-muted-foreground bg-muted p-3 rounded-lg">
                      {request.message}
                    </p>
                  </div>
                )}

                {request.status === 'pending' && (
                  <>
                    <Separator />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        disabled={processingRequest === request.id}
                        className="flex-1"
                      >
                        {processingRequest === request.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approva
                      </Button>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => setSelectedRequestId(request.id)}
                            disabled={processingRequest === request.id}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Rifiuta
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rifiuta Richiesta</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-muted-foreground">
                              Sei sicuro di voler rifiutare questa richiesta? Puoi aggiungere un motivo opzionale.
                            </p>
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Motivo del rifiuto (opzionale)"
                              rows={3}
                            />
                            <div className="flex gap-3">
                              <Button
                                onClick={handleReject}
                                disabled={processingRequest === selectedRequestId}
                                variant="destructive"
                                className="flex-1"
                              >
                                {processingRequest === selectedRequestId ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Conferma Rifiuto
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}