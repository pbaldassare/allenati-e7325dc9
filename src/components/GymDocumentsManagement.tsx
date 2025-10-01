import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Download, Trash2, Search } from 'lucide-react';
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
  user_id: string;
  user_first_name?: string;
  user_last_name?: string;
  user_email?: string;
}

interface GymDocumentsManagementProps {
  gymId: string;
  userId?: string; // Optional: if provided, shows documents for this specific user
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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from('gym_documents')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true);

      // If userId is provided (user view), filter by user_id
      if (userId) {
        query = query.eq('user_id', userId);
      }
      // If owner and no specific userId, they see all documents

      const { data: documents, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique user IDs from documents
      const userIds = [...new Set(documents?.map(doc => doc.user_id).filter(Boolean))];
      
      let userProfiles: any[] = [];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        } else {
          userProfiles = profiles || [];
        }
      }

      // Map documents with user info
      const documentsWithUserInfo = (documents || []).map((doc) => {
        const userProfile = userProfiles.find(p => p.user_id === doc.user_id);
        return {
          ...doc,
          user_first_name: userProfile?.first_name,
          user_last_name: userProfile?.last_name,
          user_email: userProfile?.email,
        };
      });
      
      setDocuments(documentsWithUserInfo);
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

  // Filter documents based on search query
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const title = doc.title.toLowerCase();
    const fileName = doc.file_name.toLowerCase();
    const userName = `${doc.user_first_name || ''} ${doc.user_last_name || ''}`.toLowerCase();
    const userEmail = (doc.user_email || '').toLowerCase();
    
    return (
      title.includes(query) ||
      fileName.includes(query) ||
      userName.includes(query) ||
      userEmail.includes(query)
    );
  });

  if (loading) {
    return <div className="text-center py-8">Caricamento documenti...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          {isOwner ? 'Documenti Utenti' : 'I Tuoi Documenti'}
        </h2>
        {isOwner && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Carica Documento
          </Button>
        )}
      </div>

      {isOwner && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per titolo, nome file, utente o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>
              {searchQuery 
                ? 'Nessun documento trovato per questa ricerca' 
                : 'Nessun documento disponibile'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => (
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
                {isOwner && (doc.user_first_name || doc.user_last_name || doc.user_email) && (
                  <div className="mb-2 pb-2 border-b">
                    <p className="text-sm font-medium">
                      Utente: {doc.user_first_name} {doc.user_last_name}
                    </p>
                    {doc.user_email && (
                      <p className="text-xs text-muted-foreground">{doc.user_email}</p>
                    )}
                  </div>
                )}
                <div className="flex gap-4 text-xs text-muted-foreground">
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
