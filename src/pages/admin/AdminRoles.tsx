import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Plus, Edit, Trash2 } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

const AdminRoles = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUserRoles();
  }, []);

  const loadUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('granted_at', { ascending: false });

      if (error) throw error;
      setUserRoles(data || []);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i ruoli utente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRoleStatus = async (roleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ is_active: !currentStatus })
        .eq('id', roleId);

      if (error) throw error;

      setUserRoles(prev => prev.map(role => 
        role.id === roleId ? { ...role, is_active: !currentStatus } : role
      ));

      toast({
        title: "Successo",
        description: `Ruolo ${!currentStatus ? 'attivato' : 'disattivato'} con successo`,
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento del ruolo",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive';
      case 'gym_owner': return 'bg-secondary';
      case 'instructor': return 'bg-accent';
      default: return 'bg-muted';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Amministratore';
      case 'gym_owner': return 'Proprietario Palestra';
      case 'instructor': return 'Istruttore';
      case 'basic_user': return 'Utente Base';
      default: return role;
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Caricamento ruoli...</div>
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
              Ruoli e Permessi
            </h1>
            <p className="text-muted-foreground">
              Gestisci i ruoli e i permessi degli utenti
            </p>
          </div>
          <Button className="bg-gradient-primary hover:shadow-primary">
            <Plus className="h-4 w-4 mr-2" />
            Assegna Ruolo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Ruoli Utenti ({userRoles.length})
            </CardTitle>
            <CardDescription>
              Visualizza e gestisci i ruoli assegnati agli utenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Assegnato</TableHead>
                  <TableHead>Scade</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRoles.map((userRole) => (
                  <TableRow key={userRole.id}>
                    <TableCell className="font-medium">
                      {userRole.profiles?.first_name} {userRole.profiles?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(userRole.role)}>
                        {getRoleLabel(userRole.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={userRole.is_active ? "default" : "secondary"}>
                        {userRole.is_active ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(userRole.granted_at).toLocaleDateString('it-IT')}
                    </TableCell>
                    <TableCell>
                      {userRole.expires_at 
                        ? new Date(userRole.expires_at).toLocaleDateString('it-IT')
                        : 'Mai'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => toggleRoleStatus(userRole.id, userRole.is_active)}
                        >
                          {userRole.is_active ? 'Disattiva' : 'Attiva'}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive">
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
      </div>
    </AdminLayout>
  );
};

export default AdminRoles;