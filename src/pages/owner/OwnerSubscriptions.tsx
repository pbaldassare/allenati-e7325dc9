import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CreditCard, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionStats {
  total: number;
  active: number;
  expiring_soon: number;
  by_plan: { [key: string]: number };
}

interface UserSubscription {
  id: string;
  user_id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  plan: {
    name: string;
    credits_included: number;
    unlimited_access: boolean;
  };
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

const OwnerSubscriptions: React.FC = () => {
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    expiring_soon: 0,
    by_plan: {}
  });
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Abbonamenti | Area Proprietario';
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) return;

      // First get gym member user IDs
      const { data: memberIds } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (!memberIds || memberIds.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      console.log('Loading subscriptions for gym members:', memberIds.map(m => m.user_id));
      
      // Load subscriptions for gym members - usando query separate per evitare problemi di JOIN
      const { data: subscriptionsData, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .in('user_id', memberIds.map(m => m.user_id))
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Load related data separately
      const subscriptionIds = subscriptionsData?.map(s => s.plan_id) || [];
      const userIds = subscriptionsData?.map(s => s.user_id) || [];
      
      const [plansData, profilesData] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('id, name, credits_included, unlimited_access')
          .in('id', subscriptionIds),
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, profile_picture_url')
          .in('user_id', userIds)
      ]);

      const plansMap = new Map(plansData.data?.map(p => [p.id, p]) || []);
      const profilesMap = new Map(profilesData.data?.map(p => [p.user_id, p]) || []);
      
      const subs = (subscriptionsData || []).map((sub: any) => ({
        ...sub,
        plan: plansMap.get(sub.plan_id),
        user: profilesMap.get(sub.user_id)
      })).filter(sub => sub.plan && sub.user); // Filtra solo le subscription con dati validi
      
      console.log('Processed subscriptions:', subs);
      setSubscriptions(subs);

      // Calculate stats
      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 7); // 7 days from now

      const active = subs.filter(s => s.status === 'active').length;
      const expiring_soon = subs.filter(s => 
        s.status === 'active' && 
        new Date(s.expires_at) <= soon
      ).length;

      const by_plan: { [key: string]: number } = {};
      subs.forEach(s => {
        if (s.status === 'active' && s.plan) {
          by_plan[s.plan.name] = (by_plan[s.plan.name] || 0) + 1;
        }
      });

      setStats({
        total: subs.length,
        active,
        expiring_soon,
        by_plan
      });

    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, expires_at: string) => {
    if (status !== 'active') {
      return <Badge variant="secondary">{status}</Badge>;
    }

    const expiresDate = new Date(expires_at);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry <= 0) {
      return <Badge variant="destructive">Scaduto</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="outline" className="border-orange-500 text-orange-600">In scadenza</Badge>;
    } else {
      return <Badge variant="default">Attivo</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento abbonamenti...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Gestione Abbonamenti
        </h1>
        <p className="text-muted-foreground">
          Monitora e gestisci gli abbonamenti dei membri della palestra
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Abbonamenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abbonamenti Attivi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Scadenza (7gg)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiring_soon}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Piani Attivi</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.by_plan).length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tutti ({stats.total})</TabsTrigger>
          <TabsTrigger value="active">Attivi ({stats.active})</TabsTrigger>
          <TabsTrigger value="expiring">In Scadenza ({stats.expiring_soon})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tutti gli Abbonamenti</CardTitle>
              <CardDescription>
                Lista completa degli abbonamenti dei membri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Inizio</TableHead>
                    <TableHead>Scadenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={sub.user.profile_picture_url} />
                            <AvatarFallback>
                              {sub.user.first_name?.[0]}{sub.user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {sub.user.first_name} {sub.user.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sub.user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.plan.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {sub.plan.unlimited_access ? 
                              'Illimitato' : 
                              `${sub.plan.credits_included} crediti`
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sub.status, sub.expires_at)}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.starts_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.expires_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Abbonamenti Attivi</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead>Scadenza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions
                    .filter(sub => sub.status === 'active')
                    .map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={sub.user.profile_picture_url} />
                            <AvatarFallback>
                              {sub.user.first_name?.[0]}{sub.user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {sub.user.first_name} {sub.user.last_name}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{sub.plan.name}</TableCell>
                      <TableCell>
                        {new Date(sub.expires_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>Abbonamenti in Scadenza</CardTitle>
              <CardDescription>
                Abbonamenti che scadono nei prossimi 7 giorni
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utente</TableHead>
                    <TableHead>Piano</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Giorni Rimanenti</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions
                    .filter(sub => {
                      if (sub.status !== 'active') return false;
                      const expiresDate = new Date(sub.expires_at);
                      const now = new Date();
                      const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      return daysUntilExpiry <= 7;
                    })
                    .map((sub) => {
                      const expiresDate = new Date(sub.expires_at);
                      const now = new Date();
                      const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={sub.user.profile_picture_url} />
                                <AvatarFallback>
                                  {sub.user.first_name?.[0]}{sub.user.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">
                                  {sub.user.first_name} {sub.user.last_name}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{sub.plan.name}</TableCell>
                          <TableCell>
                            {expiresDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant={daysUntilExpiry <= 3 ? "destructive" : "outline"}>
                              {daysUntilExpiry <= 0 ? 'Scaduto' : `${daysUntilExpiry} giorni`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plans Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuzione per Piano</CardTitle>
          <CardDescription>
            Numero di abbonamenti attivi per ogni piano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(stats.by_plan).map(([planName, count]) => (
              <div key={planName} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="font-medium">{planName}</div>
                <Badge variant="secondary">{count} utenti</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerSubscriptions;