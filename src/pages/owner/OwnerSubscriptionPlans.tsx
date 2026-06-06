import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import SubscriptionPlanForm from '@/components/owner/SubscriptionPlanForm';
import { SubscriptionPlanDeleteConfirmDialog } from '@/components/dialogs/SubscriptionPlanDeleteConfirmDialog';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  is_trial: boolean;
  is_active: boolean;
  features: string[];
  gym_id: string | null;
  created_at: string;
  is_multi_gym?: boolean;
  multi_gyms?: { id: string; name: string }[];
}

const OwnerSubscriptionPlans: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    document.title = 'Gestione Piani Abbonamento | Area Proprietario';
    loadPlans();
  }, [selectedGym]);

  const loadPlans = async () => {
    try {
      if (!selectedGym) {
        setPlans([]);
        return;
      }

      // 1) Plans whose primary gym is the selected one
      const { data: primaryPlans, error: primaryError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('gym_id', selectedGym.id)
        .order('created_at', { ascending: false });
      if (primaryError) throw primaryError;

      // 2) Multi-gym plans that include the selected gym (but whose primary gym is different)
      const { data: linkedRows, error: linkedError } = await supabase
        .from('subscription_plan_gyms')
        .select('plan_id')
        .eq('gym_id', selectedGym.id);
      if (linkedError) throw linkedError;

      const linkedIds = (linkedRows || []).map(r => r.plan_id);
      const extraIds = linkedIds.filter(
        id => !(primaryPlans || []).some(p => p.id === id)
      );

      let extraPlans: any[] = [];
      if (extraIds.length > 0) {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .in('id', extraIds);
        if (error) throw error;
        extraPlans = data || [];
      }

      const all = [...(primaryPlans || []), ...extraPlans];

      // Load multi-gym labels for the plans that are multi-gym
      const multiPlanIds = all.filter(p => p.is_multi_gym).map(p => p.id);
      let labelsByPlan: Record<string, { id: string; name: string }[]> = {};
      if (multiPlanIds.length > 0) {
        const { data: links } = await supabase
          .from('subscription_plan_gyms')
          .select('plan_id, gym:gyms(id, name)')
          .in('plan_id', multiPlanIds);
        (links || []).forEach((row: any) => {
          if (!row.gym) return;
          if (!labelsByPlan[row.plan_id]) labelsByPlan[row.plan_id] = [];
          labelsByPlan[row.plan_id].push({ id: row.gym.id, name: row.gym.name });
        });
      }

      const enriched = all.map(p => ({
        ...p,
        multi_gyms: labelsByPlan[p.id] || [],
      }));

      setPlans(enriched);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i piani abbonamento',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = () => {
    setEditingPlan(null);
    setFormOpen(true);
  };

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const handleDeletePlan = (plan: SubscriptionPlan) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;

      toast({
        title: 'Piano eliminato',
        description: 'Il piano è stato eliminato definitivamente',
      });

      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il piano',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingPlan(null);
    loadPlans();
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento piani...</div>;
  }

  // Now all plans are gym-specific
  const gymPlans = plans;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Piani Abbonamento
          </h1>
          <p className="text-muted-foreground">
            Personalizza i piani abbonamento per la tua palestra
          </p>
        </div>
        <Button onClick={handleCreatePlan} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuovo Piano
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Piani Totali</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gymPlans.length}</div>
            <p className="text-xs text-muted-foreground">Piani di abbonamento della palestra</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Piani Attivi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {plans.filter(p => p.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Piani disponibili agli utenti</p>
          </CardContent>
        </Card>
      </div>

      {/* Gym Plans */}
      {gymPlans.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Piani Abbonamento della Palestra
            </CardTitle>
            <CardDescription>
              Gestisci i piani abbonamento per la tua palestra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prezzo</TableHead>
                  <TableHead>Durata</TableHead>
                  <TableHead>Accesso</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gymPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">{plan.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>€{plan.price.toFixed(2)}</TableCell>
                    <TableCell>{plan.duration_days} giorni</TableCell>
                    <TableCell>
                      {plan.unlimited_access ? (
                        <Badge>{plan.name}</Badge>
                      ) : (
                        <Badge variant="secondary">{plan.credits_included} crediti</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {plan.is_active ? (
                          <Badge>Attivo</Badge>
                        ) : (
                          <Badge variant="secondary">Non attivo</Badge>
                        )}
                        {plan.is_trial && <Badge variant="outline">Trial</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPlan(plan)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePlan(plan)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">Nessun piano abbonamento</h3>
                <p className="text-muted-foreground">
                  Crea il tuo primo piano abbonamento per iniziare a offrire servizi ai tuoi clienti.
                </p>
              </div>
              <Button onClick={handleCreatePlan} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Crea Primo Piano
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <SubscriptionPlanForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        editingPlan={editingPlan}
      />

      {/* Delete Confirmation Dialog */}
      <SubscriptionPlanDeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        planToDelete={planToDelete}
        isLoading={deleteLoading}
      />
    </div>
  );
};

export default OwnerSubscriptionPlans;