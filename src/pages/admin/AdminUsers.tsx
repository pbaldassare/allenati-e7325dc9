import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Download, Calendar, Mail, MapPin } from 'lucide-react';
import RoleAssignmentDialog from '@/components/admin/RoleAssignmentDialog';
import { AdminUserStats } from '@/components/admin/AdminUserStats';
import { AdminUserFilters, UserFilters } from '@/components/admin/AdminUserFilters';
import { AssignWelcomeCreditsButton } from '@/components/admin/AssignWelcomeCreditsButton';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  created_at: string;
  is_active: boolean;
  role: string;
  gym_name?: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    gym: 'all',
    city: 'all'
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalGyms: 0,
    roleDistribution: {} as Record<string, number>,
    gymDistribution: {} as Record<string, number>
  });
  const [gyms, setGyms] = useState<Array<{ id: string; name: string }>>([]);
  const [cities, setCities] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUsers(), loadGyms()]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    // Get user profiles and roles separately to avoid complex joins
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .eq('is_active', true);

    if (rolesError) throw rolesError;

    // Transform data
    const transformedUsers = profiles?.map(profile => {
      const userRole = roles?.find(role => role.user_id === profile.user_id);
      
      return {
        id: profile.id,
        user_id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        city: profile.city || '',
        created_at: profile.created_at,
        is_active: profile.is_active,
        role: userRole?.role || 'basic_user',
        gym_name: ''
      };
    }) || [];

    setUsers(transformedUsers);
    calculateStats(transformedUsers);
    extractCities(transformedUsers);
  };

  const loadGyms = async () => {
    const { data: gymsData, error } = await supabase
      .from('gyms')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    setGyms(gymsData || []);
  };

  const calculateStats = (usersData: User[]) => {
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.is_active).length;
    const inactiveUsers = totalUsers - activeUsers;

    // Role distribution
    const roleDistribution = usersData.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Gym distribution
    const gymDistribution = usersData.reduce((acc, user) => {
      if (user.gym_name) {
        acc[user.gym_name] = (acc[user.gym_name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    setStats({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalGyms: gyms.length,
      roleDistribution,
      gymDistribution
    });
  };

  const extractCities = (usersData: User[]) => {
    const uniqueCities = [...new Set(usersData.map(u => u.city).filter(Boolean))];
    setCities(uniqueCities.sort());
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search || 
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.phone.includes(filters.search);
    
    const matchesRole = filters.role === 'all' || user.role === filters.role;
    const matchesStatus = filters.status === 'all' || 
      (filters.status === 'active' && user.is_active) ||
      (filters.status === 'inactive' && !user.is_active);
    
    const matchesGym = filters.gym === 'all' || user.gym_name?.includes(filters.gym);
    const matchesCity = filters.city === 'all' || user.city === filters.city;

    return matchesSearch && matchesRole && matchesStatus && matchesGym && matchesCity;
  });

  const clearFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      gym: 'all',
      city: 'all'
    });
  };

  const exportToCSV = () => {
    const csvData = filteredUsers.map(user => ({
      Nome: `${user.first_name} ${user.last_name}`,
      Email: user.email,
      Telefono: user.phone,
      Città: user.city,
      Ruolo: getRoleLabel(user.role),
      Stato: user.is_active ? 'Attivo' : 'Inattivo',
      Palestra: user.gym_name || 'Nessuna',
      'Data Registrazione': new Date(user.created_at).toLocaleDateString('it-IT')
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utenti_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export completato",
      description: `${filteredUsers.length} utenti esportati con successo`,
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive';
      case 'gym_owner':
        return 'bg-primary';
      case 'instructor':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Amministratore';
      case 'gym_owner':
        return 'Proprietario';
      case 'instructor':
        return 'Istruttore';
      default:
        return 'Utente Base';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Gestione Utenti
            </h1>
            <p className="text-muted-foreground">
              Visualizza e gestisci gli utenti del sistema
            </p>
          </div>
          <div className="flex gap-2">
            <AssignWelcomeCreditsButton />
            <Button onClick={exportToCSV} disabled={filteredUsers.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV ({filteredUsers.length})
            </Button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        {!loading && (
          <AdminUserStats
            totalUsers={stats.totalUsers}
            activeUsers={stats.activeUsers}
            inactiveUsers={stats.inactiveUsers}
            totalGyms={stats.totalGyms}
            roleDistribution={stats.roleDistribution}
            gymDistribution={stats.gymDistribution}
          />
        )}

        {/* Filters */}
        <AdminUserFilters
          filters={filters}
          onFiltersChange={setFilters}
          gyms={gyms}
          cities={cities}
          onClearFilters={clearFilters}
        />

        <Card>
          <CardHeader>
            <CardTitle>Utenti Registrati ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Caricamento utenti...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center text-white font-medium">
                        {user.first_name.charAt(0).toUpperCase()}{user.last_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium">{user.first_name} {user.last_name}</h4>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.phone && (
                            <span>{user.phone}</span>
                          )}
                          {user.city && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{user.city}</span>
                            </div>
                          )}
                        </div>
                        {user.gym_name && (
                          <div className="text-xs text-primary">
                            📍 {user.gym_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right space-y-1">
                        <Badge className={getRoleColor(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-success' : 'bg-destructive'}`} />
                          <span>{user.is_active ? 'Attivo' : 'Inattivo'}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(user.created_at).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <RoleAssignmentDialog 
                          userId={user.user_id}
                          userName={`${user.first_name} ${user.last_name}`}
                          currentRole={user.role}
                          onRoleAssigned={loadData}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {Object.entries(filters).some(([key, value]) => value !== '' && value !== 'all') ? 
                        'Nessun utente corrisponde ai filtri selezionati' : 
                        'Nessun utente trovato'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;