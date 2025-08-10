import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Upload, FileText, Calendar, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MedicalCertificate {
  id: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  issue_date: string | null;
  expiry_date: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export const MedicalCertificate = () => {
  const { user } = useAuth();
  const [certificate, setCertificate] = useState<MedicalCertificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchCertificate();
    }
  }, [user]);

  const fetchCertificate = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_certificates')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCertificate(data);
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Formato file non supportato. Usa PDF, JPG o PNG.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Il file è troppo grande. Massimo 10MB.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadCertificate = async () => {
    if (!selectedFile || !user || !issueDate || !expiryDate) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setUploading(true);

    try {
      // Get user's gym ID from memberships or bookings
      const { data: membership } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      let gymId = membership?.gym_id;

      // If no membership, try to get gym from recent bookings
      if (!gymId) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('courses(gym_id)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        gymId = booking?.courses?.gym_id;
      }

      if (!gymId) {
        toast.error('Non riesco a determinare la tua palestra di appartenenza');
        return;
      }

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-certificates')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Save certificate record to database
      const { error: dbError } = await supabase
        .from('medical_certificates')
        .insert({
          user_id: user.id,
          gym_id: gymId,
          file_name: selectedFile.name,
          file_path: fileName,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          issue_date: issueDate,
          expiry_date: expiryDate,
        });

      if (dbError) throw dbError;

      toast.success('Certificato caricato con successo!');
      setSelectedFile(null);
      setIssueDate('');
      setExpiryDate('');
      fetchCertificate();
    } catch (error) {
      console.error('Error uploading certificate:', error);
      toast.error('Errore durante il caricamento del certificato');
    } finally {
      setUploading(false);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Certificato Medico
        </CardTitle>
        <CardDescription>
          Carica il tuo certificato medico per accedere ai corsi della palestra
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {certificate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{certificate.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  Caricato il {format(new Date(certificate.created_at), 'dd/MM/yyyy')}
                </p>
              </div>
              {getStatusBadge(certificate.status)}
            </div>

            {certificate.issue_date && certificate.expiry_date && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Rilasciato: {format(new Date(certificate.issue_date), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Scade: {format(new Date(certificate.expiry_date), 'dd/MM/yyyy')}</span>
                </div>
              </div>
            )}

            {certificate.status === 'rejected' && certificate.rejection_reason && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Motivo rifiuto:</strong> {certificate.rejection_reason}
                </AlertDescription>
              </Alert>
            )}

            {certificate.reviewed_at && (
              <p className="text-sm text-muted-foreground">
                Rivisto il {format(new Date(certificate.reviewed_at), 'dd/MM/yyyy HH:mm')}
              </p>
            )}
          </div>
        )}

        {(!certificate || certificate.status === 'rejected' || certificate.status === 'expired') && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file">Seleziona certificato medico *</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Formati supportati: PDF, JPG, PNG (max 10MB)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue-date">Data rilascio *</Label>
                <Input
                  id="issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry-date">Data scadenza *</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={uploading}
                />
              </div>
            </div>

            <Button
              onClick={uploadCertificate}
              disabled={!selectedFile || !issueDate || !expiryDate || uploading}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Caricamento...' : 'Carica Certificato'}
            </Button>
          </div>
        )}

        {certificate && certificate.status === 'pending' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Il tuo certificato è in attesa di approvazione da parte della palestra.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};