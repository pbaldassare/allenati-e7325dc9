import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, X, Download, Eye, Calendar, FileText, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MedicalCertificate {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  issue_date: string | null;
  expiry_date: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

export const MedicalCertificatesManager = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<MedicalCertificate | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchCertificates();
    }
  }, [user]);

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select(`
          id,
          user_id,
          file_name,
          file_path,
          status,
          issue_date,
          expiry_date,
          reviewed_at,
          rejection_reason,
          created_at,
          profiles!inner (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match our interface
      const transformedData: MedicalCertificate[] = (data || []).map(item => ({
        ...item,
        profiles: item.profiles && typeof item.profiles === 'object' && !Array.isArray(item.profiles) 
          ? item.profiles as { first_name: string; last_name: string }
          : null
      })).filter(item => item.profiles !== null);

      setCertificates(transformedData);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Errore nel caricamento dei certificati');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (certificateId: string) => {
    try {
      const { error } = await supabase
        .from('medical_certificates')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', certificateId);

      if (error) throw error;

      toast.success('Certificato approvato');
      fetchCertificates();
    } catch (error) {
      console.error('Error approving certificate:', error);
      toast.error('Errore nell\'approvazione del certificato');
    }
  };

  const handleReject = async () => {
    if (!selectedCertificate || !rejectionReason.trim()) {
      toast.error('Inserisci un motivo per il rifiuto');
      return;
    }

    try {
      const { error } = await supabase
        .from('medical_certificates')
        .update({
          status: 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', selectedCertificate.id);

      if (error) throw error;

      toast.success('Certificato rifiutato');
      setReviewDialogOpen(false);
      setSelectedCertificate(null);
      setRejectionReason('');
      fetchCertificates();
    } catch (error) {
      console.error('Error rejecting certificate:', error);
      toast.error('Errore nel rifiuto del certificato');
    }
  };

  const downloadCertificate = async (certificate: MedicalCertificate) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-certificates')
        .download(certificate.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = certificate.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast.error('Errore nel download del certificato');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'In attesa', variant: 'secondary' as const, icon: AlertCircle },
      approved: { label: 'Approvato', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Rifiutato', variant: 'destructive' as const, icon: X },
      expired: { label: 'Scaduto', variant: 'outline' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredCertificates = certificates.filter(cert => {
    if (!cert.profiles) return false;
    
    const matchesSearch = 
      cert.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gestione Certificati Medici
          </CardTitle>
          <CardDescription>
            Gestisci i certificati medici degli utenti della palestra
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca per nome utente o nome file..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md"
            >
              <option value="all">Tutti gli stati</option>
              <option value="pending">In attesa</option>
              <option value="approved">Approvati</option>
              <option value="rejected">Rifiutati</option>
              <option value="expired">Scaduti</option>
            </select>
          </div>

          {/* Certificates List */}
          <div className="space-y-4">
            {filteredCertificates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun certificato trovato
              </div>
            ) : (
              filteredCertificates.map((certificate) => (
                <Card key={certificate.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium">
                            {certificate.profiles?.first_name} {certificate.profiles?.last_name}
                          </h3>
                          {getStatusBadge(certificate.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {certificate.file_name}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Caricato: {format(new Date(certificate.created_at), 'dd/MM/yyyy HH:mm')}</span>
                          {certificate.issue_date && (
                            <span>Rilasciato: {format(new Date(certificate.issue_date), 'dd/MM/yyyy')}</span>
                          )}
                          {certificate.expiry_date && (
                            <span>Scade: {format(new Date(certificate.expiry_date), 'dd/MM/yyyy')}</span>
                          )}
                        </div>

                        {certificate.rejection_reason && (
                          <p className="text-sm text-destructive">
                            Motivo rifiuto: {certificate.rejection_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadCertificate(certificate)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        {certificate.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(certificate.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approva
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedCertificate(certificate);
                                setReviewDialogOpen(true);
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Rifiuta
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rifiuta Certificato</DialogTitle>
            <DialogDescription>
              Inserisci il motivo per cui stai rifiutando questo certificato medico.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo del rifiuto *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Esempio: Certificato scaduto, illeggibile, non conforme..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReviewDialogOpen(false);
                  setRejectionReason('');
                }}
              >
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Rifiuta Certificato
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};