import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText, Download, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { GymDocumentUploadDialog } from './GymDocumentUploadDialog';

interface GymDocument {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  category: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  uploaded_by: string;
}

interface GymDocumentsManagementProps {
  gymId: string;
  userId?: string; // Se fornito, filtra per questo utente specifico
  isOwner?: boolean;
}

export const GymDocumentsManagement: React.FC<GymDocumentsManagementProps> = ({ 
  gymId,
  userId,
  isOwner = false 
}) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<GymDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('gym_documents')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true);
      
      // Se userId è fornito, filtra per quell'utente
      // Altrimenti se non è owner, filtra per l'utente corrente
      if (userId) {
        query = query.eq('user_id', userId);
      } else if (!isOwner && user) {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i documenti',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [gymId, userId]);

  const handleDownload = async (doc: GymDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('gym-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download completato',
        description: `${doc.file_name} scaricato con successo`,
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile scaricare il documento',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (doc: GymDocument) => {
    if (!confirm(`Sei sicuro di voler eliminare "${doc.title}"?`)) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('gym-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('gym_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: 'Documento eliminato',
        description: 'Il documento è stato eliminato con successo',
      });

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il documento',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento documenti...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Documenti della Palestra</h2>
        {isOwner && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Carica Documento
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nessun documento disponibile</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <span>{doc.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Scarica
                    </Button>
                    {isOwner && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {doc.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {doc.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Categoria: {doc.category}</span>
                  <span>Dimensione: {formatFileSize(doc.file_size)}</span>
                  <span>Caricato il: {formatDate(doc.created_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GymDocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        gymId={gymId}
        userId={userId}
        onUploaded={fetchDocuments}
      />
    </div>
  );
};
