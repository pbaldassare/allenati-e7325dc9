import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
  onSaved?: () => void;
}

export default function ManageUserGymsDialog({ open, onOpenChange, userId, userName, onSaved }: Props) {
  const { ownedGyms } = useOwnerGym();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_gym_memberships')
          .select('gym_id, status, membership_type')
          .eq('user_id', userId)
          .in('gym_id', ownedGyms.map(g => g.id));
        if (error) throw error;
        const active = new Set<string>(
          (data || [])
            .filter((m: any) => m.status === 'active')
            .map((m: any) => m.gym_id)
        );
        setSelectedIds(active);
      } catch (e: any) {
        toast({ title: 'Errore', description: e.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, userId, ownedGyms, toast]);

  const toggle = (gymId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(gymId)) next.delete(gymId);
      else next.add(gymId);
      return next;
    });
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('owner-manage-user-gyms', {
        body: { user_id: userId, gym_ids: Array.from(selectedIds) },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Errore sconosciuto');
      toast({ title: 'Palestre aggiornate', description: `Accessi di ${userName} aggiornati.` });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Errore', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestisci palestre
          </DialogTitle>
          <DialogDescription>
            Seleziona le palestre del tuo gruppo a cui {userName} può accedere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Caricamento...</p>
          ) : ownedGyms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna palestra disponibile.</p>
          ) : (
            ownedGyms.map(g => (
              <label
                key={g.id}
                className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.has(g.id)}
                  onCheckedChange={() => toggle(g.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.city}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annulla
          </Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
