import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface GymDocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  userId?: string; // Optional: if provided, the document is for this specific user
  onUploaded: () => void;
}

const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'Generale' },
  { value: 'contract', label: 'Contratti' },
  { value: 'rules', label: 'Regolamenti' },
  { value: 'communication', label: 'Comunicazioni' },
  { value: 'forms', label: 'Modulistica' },
  { value: 'other', label: 'Altro' },
];

export const GymDocumentUploadDialog: React.FC<GymDocumentUploadDialogProps> = ({
  open,
  onOpenChange,
  gymId,
  userId,
  onUploaded,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(userId || '');
  const [gymUsers, setGymUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch gym users if owner is uploading (no userId provided)
  useEffect(() => {
    if (open && !userId) {
      fetchGymUsers();
    } else if (userId) {
      setSelectedUserId(userId);
    }
  }, [open, gymId, userId]);

  const fetchGymUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('user_gym_memberships')
        .select(`
          user_id,
          profiles!user_gym_memberships_user_id_fkey (
            user_id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (error) throw error;

      const users = data
        ?.filter(m => m.profiles)
        .map(m => ({
          id: m.user_id,
          name: `${(m.profiles as any).first_name} ${(m.profiles as any).last_name}`,
          email: (m.profiles as any).email || '',
        })) || [];

      setGymUsers(users);
    } catch (error) {
      console.error('Error fetching gym users:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare gli utenti della palestra',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !user) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi obbligatori',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is selected (owner uploading)
    const targetUserId = userId || selectedUserId;
    if (!targetUserId) {
      toast({
        title: 'Errore',
        description: 'Seleziona un utente per il documento',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${gymId}/${targetUserId}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('gym-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Insert document record
      const { error: dbError } = await supabase.from('gym_documents').insert({
        gym_id: gymId,
        user_id: targetUserId,
        uploaded_by: user.id,
        title,
        description: description || null,
        category,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        mime_type: file.type,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Documento caricato',
        description: 'Il documento è stato caricato con successo',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('general');
      setFile(null);
      setSelectedUserId(userId || '');
      onOpenChange(false);
      onUploaded();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare il documento',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Carica Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titolo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Inserisci il titolo del documento"
            />
          </div>

          {!userId && (
            <div className="space-y-2">
              <Label htmlFor="user">Utente destinatario *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingUsers}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Caricamento..." : "Seleziona utente"} />
                </SelectTrigger>
                <SelectContent>
                  {gymUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrizione opzionale"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">File *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Annulla
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file || !title || (!userId && !selectedUserId)}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Carica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
