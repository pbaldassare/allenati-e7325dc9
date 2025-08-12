import React, { useEffect, useState } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface GymApplication {
  id: string;
  applicant_user_id: string | null;
  applicant_email: string | null;
  gym_name: string;
  gym_description: string | null;
  gym_address: string;
  gym_city: string;
  gym_postal_code: string | null;
  gym_phone: string | null;
  gym_email: string | null;
  gym_website: string | null;
  applicant_message: string | null;
  status: string;
  created_at: string;
  profiles?: any;
}

export const AdminGymApplications = () => {
  const [applications, setApplications] = useState<GymApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('gym_applications')
        .select(`
          *,
          profiles:applicant_user_id!left (
            first_name,
            last_name,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error loading applications:', error);
      toast({
        title: "Errore",
        description: "Errore nel caricamento delle candidature",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (application: GymApplication) => {
    if (!user) return;

    // Check if this is an anonymous application
    if (!application.applicant_user_id) {
      toast({
        title: "Errore",
        description: "Non è possibile approvare candidature anonime. L'utente deve essere registrato.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create the gym
      const { data: gymData, error: gymError } = await supabase
        .from('gyms')
        .insert({
          name: application.gym_name,
          description: application.gym_description,
          address: application.gym_address,
          city: application.gym_city,
          postal_code: application.gym_postal_code,
          phone: application.gym_phone,
          email: application.gym_email,
          website: application.gym_website,
        })
        .select()
        .single();

      if (gymError) throw gymError;

      // Assign gym_owner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: application.applicant_user_id,
          role: 'gym_owner',
          granted_by: user.id,
        });

      if (roleError) throw roleError;

      // Create gym membership for the owner
      const { error: membershipError } = await supabase
        .from('user_gym_memberships')
        .insert({
          user_id: application.applicant_user_id,
          gym_id: gymData.id,
          membership_type: 'owner',
          status: 'active',
        });

      if (membershipError) throw membershipError;

      // Update application status
      const { error: updateError } = await supabase
        .from('gym_applications')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', application.id);

      if (updateError) throw updateError;

      toast({
        title: "Candidatura approvata!",
        description: `La palestra "${application.gym_name}" è stata creata e il ruolo gym_owner è stato assegnato.`,
      });

      loadApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: "Errore",
        description: "Errore nell'approvazione della candidatura",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (applicationId: string) => {
    if (!user || !rejectionReason.trim()) return;

    try {
      const { error } = await supabase
        .from('gym_applications')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: "Candidatura rifiutata",
        description: "La candidatura è stata rifiutata con successo",
      });

      setRejectionReason('');
      loadApplications();
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({
        title: "Errore",
        description: "Errore nel rifiuto della candidatura",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />In attesa</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><UserCheck className="w-3 h-3 mr-1" />Approvata</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><UserX className="w-3 h-3 mr-1" />Rifiutata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Caricamento candidature...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Candidature Palestre
          </h1>
          <p className="text-muted-foreground">
            Gestisci le richieste di candidatura per nuove palestre
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-muted-foreground text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium">Nessuna candidatura trovata</h3>
                <p className="text-sm mt-1">Non ci sono candidature da recensire al momento</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {application.gym_name}
                      {getStatusBadge(application.status)}
                    </CardTitle>
                    <CardDescription>
                      {application.profiles ? (
                        <>
                          Candidatura di {application.profiles.first_name} {application.profiles.last_name}
                          {application.profiles.phone && ` • ${application.profiles.phone}`}
                        </>
                      ) : (
                        <>
                          Candidatura anonima
                          {application.applicant_email && ` • ${application.applicant_email}`}
                        </>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(application.created_at).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Indirizzo</p>
                    <p className="text-sm text-muted-foreground">
                      {application.gym_address}, {application.gym_city}
                      {application.gym_postal_code && ` ${application.gym_postal_code}`}
                    </p>
                  </div>
                  {application.gym_phone && (
                    <div>
                      <p className="text-sm font-medium">Telefono</p>
                      <p className="text-sm text-muted-foreground">{application.gym_phone}</p>
                    </div>
                  )}
                  {application.gym_email && (
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{application.gym_email}</p>
                    </div>
                  )}
                  {application.gym_website && (
                    <div>
                      <p className="text-sm font-medium">Sito Web</p>
                      <p className="text-sm text-muted-foreground">{application.gym_website}</p>
                    </div>
                  )}
                </div>

                {application.gym_description && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Descrizione</p>
                    <p className="text-sm text-muted-foreground">{application.gym_description}</p>
                  </div>
                )}

                {application.applicant_message && (
                  <div className="mb-4">
                    <p className="text-sm font-medium">Messaggio del candidato</p>
                    <p className="text-sm text-muted-foreground">{application.applicant_message}</p>
                  </div>
                )}

                {application.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(application)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!application.applicant_user_id}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {application.applicant_user_id ? 'Approva' : 'Candidatura anonima - Non approvabile'}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                          <X className="mr-2 h-4 w-4" />
                          Rifiuta
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Rifiuta candidatura</DialogTitle>
                          <DialogDescription>
                            Indica il motivo del rifiuto della candidatura per "{application.gym_name}"
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Textarea
                            placeholder="Motivo del rifiuto..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleReject(application.id)}
                              disabled={!rejectionReason.trim()}
                              variant="destructive"
                            >
                              Conferma Rifiuto
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
};