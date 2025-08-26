import React, { useEffect, useState } from 'react';
import { Check, X, Eye, Clock, UserCheck, UserX, MapPin, Phone, Mail, Globe, Building2, MessageSquare, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/layouts/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

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
      setLoading(true);
      
      // First, get all applications
      const { data: applications, error: appsError } = await supabase
        .from('gym_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Error loading applications:', appsError);
        toast({
          title: "Errore",
          description: "Errore nel caricamento delle candidature",
          variant: "destructive",
        });
        return;
      }

      console.log('Raw applications from database:', applications);

      // Then get profile data for applications that have a user_id
      const applicationsWithUserIds = applications?.filter(app => app.applicant_user_id) || [];
      const userIds = applicationsWithUserIds.map(app => app.applicant_user_id);
      
      let profilesData = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, phone')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
        } else {
          profilesData = profiles || [];
        }
      }

      // Combine applications with profile data
      const applicationsWithProfiles = applications?.map(app => {
        const profile = profilesData.find(p => p.user_id === app.applicant_user_id);
        return {
          ...app,
          profiles: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone
          } : null
        };
      }) || [];

      console.log('Applications with profiles:', applicationsWithProfiles);
      setApplications(applicationsWithProfiles);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleApprove = async (application: GymApplication) => {
    if (!user) return;

    try {
      console.log('Starting approval for application:', application.id);
      
      // Call the Edge Function to create user and setup gym
      const { data: result, error: functionError } = await supabase.functions.invoke('create-gym-user', {
        body: {
          applicationId: application.id,
          userEmail: application.applicant_email,
          password: 'Allenati123!', // Default password - user should change on first login
          gymData: {
            gym_name: application.gym_name,
            gym_description: application.gym_description,
            gym_address: application.gym_address,
            gym_city: application.gym_city,
            gym_postal_code: application.gym_postal_code,
            gym_phone: application.gym_phone,
            gym_email: application.gym_email,
            gym_website: application.gym_website,
          }
        }
      });

      if (functionError) {
        console.error('Error calling create-gym-user function:', functionError);
        throw new Error(`Errore durante la creazione dell'utente: ${functionError.message}`);
      }

      if (!result.success) {
        console.error('Function returned error:', result.error);
        throw new Error(result.error);
      }

      console.log('Successfully created gym user:', result);

      // Update application status to approved
      const { error: updateError } = await supabase
        .from('gym_applications')
        .update({ 
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', application.id);

      if (updateError) {
        console.error('Error updating application status:', updateError);
        throw updateError;
      }

      toast({
        title: "Candidatura approvata!",
        description: result.userExists 
          ? `Utente esistente collegato alla palestra ${application.gym_name} con successo.`
          : `Palestra ${application.gym_name} approvata. Account creato per ${application.applicant_email} con password: Allenati123!`,
        duration: 8000,
      });

      loadApplications();
    } catch (error) {
      console.error('Error approving application:', error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'approvazione della candidatura",
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
        return (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 font-medium">
            <Clock className="w-3 h-3 mr-1" />
            In attesa
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-medium">
            <UserCheck className="w-3 h-3 mr-1" />
            Approvata
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-medium">
            <UserX className="w-3 h-3 mr-1" />
            Rifiutata
          </Badge>
        );
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
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="text-muted-foreground text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-semibold mb-2">Nessuna candidatura trovata</h3>
                <p className="text-sm">Non ci sono candidature da recensire al momento</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          applications.map((application) => (
            <Card key={application.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20">
              <CardHeader className="bg-gradient-to-r from-background to-muted/30">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {application.gym_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">{application.gym_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {application.profiles ? (
                            <>
                              <User className="w-4 h-4" />
                              {application.profiles.first_name} {application.profiles.last_name}
                              {application.profiles.phone && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <Phone className="w-3 h-3" />
                                  {application.profiles.phone}
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              {application.applicant_email || 'Candidatura anonima'}
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getStatusBadge(application.status)}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(application.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-6">
                {/* Location and Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Ubicazione</p>
                        <p className="text-sm text-muted-foreground">
                          {application.gym_address}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.gym_city}
                          {application.gym_postal_code && `, ${application.gym_postal_code}`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {application.gym_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Telefono</p>
                          <p className="text-sm text-muted-foreground">{application.gym_phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {application.gym_email && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Email</p>
                          <p className="text-sm text-muted-foreground">{application.gym_email}</p>
                        </div>
                      </div>
                    )}
                    
                    {application.gym_website && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Sito Web</p>
                          <a 
                            href={application.gym_website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {application.gym_website}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(application.gym_description || application.applicant_message) && (
                  <>
                    <Separator className="mb-6" />
                    
                    {application.gym_description && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Building2 className="w-4 h-4 text-primary" />
                          <h4 className="font-medium">Descrizione Palestra</h4>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm leading-relaxed">{application.gym_description}</p>
                        </div>
                      </div>
                    )}

                    {application.applicant_message && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <h4 className="font-medium">Messaggio del Candidato</h4>
                        </div>
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
                          <p className="text-sm leading-relaxed">{application.applicant_message}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {application.status === 'pending' && (
                  <>
                    <Separator className="mb-6" />
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(application)}
                        className="bg-success hover:bg-success/90 text-white flex-1"
                        size="lg"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approva Candidatura
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="border-destructive/20 text-destructive hover:bg-destructive/10 flex-1"
                            size="lg"
                          >
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
                              className="resize-none"
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleReject(application.id)}
                                disabled={!rejectionReason.trim()}
                                variant="destructive"
                                className="flex-1"
                              >
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
          ))
        )}
      </div>
    </AdminLayout>
  );
};