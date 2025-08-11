import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

interface RoleAssignmentDialogProps {
  userId: string;
  userName: string;
  currentRole?: string;
  onRoleAssigned?: () => void;
}

interface GymData {
  name: string;
  description: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

const RoleAssignmentDialog = ({ userId, userName, currentRole, onRoleAssigned }: RoleAssignmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [gymData, setGymData] = useState<GymData>({
    name: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const roles = [
    { value: 'basic_user', label: 'Utente Base' },
    { value: 'instructor', label: 'Istruttore' },
    { value: 'gym_owner', label: 'Proprietario Palestra' },
    { value: 'admin', label: 'Amministratore' }
  ];

  const handleAssignRole = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      // Remove existing role
      if (currentRole) {
        await supabase
          .from('user_roles')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('role', currentRole as any);
      }

      // Add new role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: selectedRole as any,
          is_active: true
        });

      if (roleError) throw roleError;

      // If gym_owner role, create gym
      if (selectedRole === 'gym_owner') {
        const { data: gym, error: gymError } = await supabase
          .from('gyms')
          .insert({
            ...gymData,
            owner_email: (await supabase.auth.getUser()).data.user?.email || ''
          })
          .select()
          .single();

        if (gymError) throw gymError;

        // Update user's gym membership
        await supabase
          .from('user_gym_memberships')
          .insert({
            user_id: userId,
            gym_id: gym.id,
            membership_type: 'owner',
            status: 'active'
          });
      }

      toast({
        title: "Successo",
        description: `Ruolo ${selectedRole} assegnato a ${userName}`,
      });

      onRoleAssigned?.();
      setOpen(false);
      setSelectedRole('');
      setGymData({
        name: '',
        description: '',
        address: '',
        city: '',
        phone: '',
        email: ''
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'assegnazione del ruolo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Shield className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assegna Ruolo a {userName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label>Ruolo</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un ruolo" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole === 'gym_owner' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dati Palestra</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome Palestra</Label>
                  <Input
                    value={gymData.name}
                    onChange={(e) => setGymData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome della palestra"
                  />
                </div>
                <div>
                  <Label>Indirizzo</Label>
                  <Input
                    value={gymData.address}
                    onChange={(e) => setGymData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Via, numero civico"
                  />
                </div>
                <div>
                  <Label>Città</Label>
                  <Input
                    value={gymData.city}
                    onChange={(e) => setGymData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Città"
                  />
                </div>
                <div>
                  <Label>Telefono</Label>
                  <Input
                    value={gymData.phone}
                    onChange={(e) => setGymData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Numero di telefono"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={gymData.email}
                    onChange={(e) => setGymData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email della palestra"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={handleAssignRole} 
              disabled={loading || !selectedRole || (selectedRole === 'gym_owner' && !gymData.name)}
              className="flex-1"
            >
              {loading ? 'Assegnando...' : 'Assegna Ruolo'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annulla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleAssignmentDialog;