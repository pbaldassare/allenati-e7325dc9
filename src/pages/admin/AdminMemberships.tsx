import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Plus, Edit, Users } from 'lucide-react';

interface Membership {
  id: string;
  user_id: string;
  gym_id: string;
  membership_type: string;
  status: string;
  joined_at: string;
  expires_at?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
  gyms?: {
    name: string;
  };
}

const AdminMemberships = () => {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadMemberships();
  }, []);

  const loadMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('user_gym_memberships')
        .select('*')
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMemberships(data || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare le membership",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMembershipStatus = async (membershipId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('user_gym_memberships')
        .update({ status: newStatus })
        .eq('id', membershipId);

      if (error) throw error;

      setMemberships(prev => prev.map(membership => 
        membership.id === membershipId ? { ...membership, status: newStatus } : membership
      ));

      toast({
        title: "Successo",
        description: "Status membership aggiornato con successo",
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento della membership",
        variant: "destructive",
      });
    }
  };

  const filteredMemberships = memberships.filter(membership => 
    statusFilter === 'all' || membership.status === statusFilter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'expired': return 'bg-warning';
      case 'suspended': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Attiva';
      case 'expired': return 'Scaduta';
      case 'suspended': return 'Sospesa';
      default: return status;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento membership...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Membership Palestre
            </h1>
            <p className="text-muted-foreground">
              Gestisci le membership degli utenti alle palestre
            </p>
          </div>
          <Button className="bg-gradient-primary hover:shadow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Nuova Membership
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Membership Attive ({filteredMemberships.length})
            </CardTitle>
            <CardDescription>
              Visualizza e gestisci le membership degli utenti
            </CardDescription>
            
            <div className="flex items-center space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtra per status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="active">Attive</SelectItem>
                  <SelectItem value="expired">Scadute</SelectItem>
                  <SelectItem value="suspended">Sospese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Palestra</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Iscritto</TableHead>
                  <TableHead>Scade</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMemberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell className="font-medium">
                      {membership.profiles?.first_name} {membership.profiles?.last_name}
                    </TableCell>
                    <TableCell>{membership.gyms?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {membership.membership_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(membership.status)}>
                        {getStatusLabel(membership.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(membership.joined_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      {membership.expires_at 
                        ? new Date(membership.expires_at).toLocaleDateString('it-IT')
                        : 'Mai'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Select 
                          value={membership.status}
                          onValueChange={(value) => updateMembershipStatus(membership.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Attiva</SelectItem>
                            <SelectItem value="expired">Scaduta</SelectItem>
                            <SelectItem value="suspended">Sospesa</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminMemberships;