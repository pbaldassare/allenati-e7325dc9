import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, CreditCard, TrendingUp, Calendar, Clock, Plus, Download, Play, Pause, RotateCcw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ExtendSubscriptionDialog from '@/components/dialogs/ExtendSubscriptionDialog';
import ManualSubscriptionActivationDialog from '@/components/dialogs/ManualSubscriptionActivationDialog';
import { useOwnerGym } from '@/contexts/OwnerGymContext';

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
    duration_days: number;
  };
  user: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

const OwnerSubscriptions: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    expiring_soon: 0,
    by_plan: {}
  });
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [manualActivationDialogOpen, setManualActivationDialogOpen] = useState(false);
  const [generatingReceipt, setGeneratingReceipt] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    document.title = 'Abbonamenti | Area Proprietario';
    if (selectedGym?.id) {
      loadSubscriptionData();
    } else {
      setSubscriptions([]);
      setLoading(false);
    }
  }, [selectedGym?.id]);

  const loadSubscriptionData = async () => {
    if (!selectedGym?.id) return;

    try {
      console.log('Loading subscriptions for gym:', selectedGym.id);

      // First get gym member user IDs
      const { data: memberIds } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active');

      if (!memberIds || memberIds.length === 0) {
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      console.log('Loading subscriptions for gym members:', memberIds.map(m => m.user_id));
      
      // Load ALL subscriptions for gym members (not just active) to see everything 
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
          .select('id, name, credits_included, unlimited_access, duration_days')
          .in('id', subscriptionIds),
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, profile_picture_url')
          .in('user_id', userIds)
      ]);

      const plansMap = new Map(plansData.data?.map(p => [p.id, p]) || []);
      const profilesMap = new Map(profilesData.data?.map(p => [p.user_id, p]) || []);
      
      const subs = (subscriptionsData || []).map((sub: any) => {
        const plan = plansMap.get(sub.plan_id);
        const user = profilesMap.get(sub.user_id);
        
        console.log(`Processing subscription ${sub.id}:`, {
          plan_id: sub.plan_id,
          user_id: sub.user_id,
          plan,
          user
        });
        
        return {
          ...sub,
          plan: plan || null,
          user: user || null // Ensure user is null if not found instead of undefined
        };
      }).filter(sub => sub.plan && sub.user); // Filter out subscriptions without plan or user data
      
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

  const canExtendSubscription = (subscription: UserSubscription) => {
    return (
      subscription.status === 'active' &&
      subscription.plan.unlimited_access &&
      subscription.plan.duration_days === 365
    );
  };

  const handleExtendClick = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setExtendDialogOpen(true);
  };

  const handleExtensionCompleted = async (subscriptionId: string, newExpiryDate: string) => {
    console.log('Extension completed, updating optimistically...', subscriptionId, newExpiryDate);
    
    // Optimistic update: immediately update the subscription in the state
    setSubscriptions(prevSubscriptions => 
      prevSubscriptions.map(sub => 
        sub.id === subscriptionId 
          ? { ...sub, expires_at: newExpiryDate }
          : sub
      )
    );
    
    // Update stats optimistically as well
    setStats(prevStats => ({ ...prevStats })); // Force re-calculation
    
    setSelectedSubscription(null);
    
    // Backup reload with longer delay for database sync
    setTimeout(() => {
      console.log('Backup reload after optimistic update...');
      loadSubscriptionData();
    }, 1000);
  };

  const handleManualActivationCompleted = async () => {
    setManualActivationDialogOpen(false);
    
    toast({
      title: "Abbonamento attivato",
      description: "L'abbonamento è stato attivato con successo.",
    });
    
    // Reload data to reflect changes
    await loadSubscriptionData();
  };

  const handleDownloadReceipt = async (subscription: UserSubscription) => {
    try {
      setGeneratingReceipt(subscription.id);
      
      const { data, error } = await supabase.functions.invoke('generate-subscription-receipt', {
        body: { subscriptionId: subscription.id }
      });

      if (error) throw error;

      // Create blob from response and trigger download
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ricevuta-abbonamento-${subscription.user?.first_name || 'utente'}-${subscription.user?.last_name || 'sconosciuto'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error generating receipt:', error);
      alert('Errore nella generazione della ricevuta. Riprova più tardi.');
    } finally {
      setGeneratingReceipt(null);
    }
  };

  const handleUpdateSubscriptionStatus = async (subscriptionId: string, newStatus: 'active' | 'cancelled' | 'expired' | 'trial', actionLabel: string) => {
    try {
      setUpdatingStatus(subscriptionId);

      const { error } = await supabase
        .from('user_subscriptions')
        .update({ status: newStatus })
        .eq('id', subscriptionId);

      if (error) throw error;

      // Aggiornamento ottimistico
      setSubscriptions(prevSubscriptions => 
        prevSubscriptions.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, status: newStatus }
            : sub
        )
      );

      // Ricalcola statistiche
      setTimeout(() => {
        loadSubscriptionData();
      }, 500);

      toast({
        title: "Abbonamento aggiornato",
        description: `L'abbonamento è stato ${actionLabel} con successo.`,
      });

    } catch (error) {
      console.error('Error updating subscription status:', error);
      toast({
        title: "Errore",
        description: "Errore nell'aggiornamento dell'abbonamento. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusActionButton = (subscription: UserSubscription) => {
    const isUpdating = updatingStatus === subscription.id;
    
    if (subscription.status === 'active') {
      return (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              className="flex items-center space-x-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Pause className="w-3 h-3" />
              <span>{isUpdating ? 'Disattivando...' : 'Disattiva'}</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disattivare abbonamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione disattiverà l'abbonamento di {subscription.user?.first_name || 'questo utente'} {subscription.user?.last_name || ''}. 
                L'utente non potrà più accedere ai servizi dell'abbonamento.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleUpdateSubscriptionStatus(subscription.id, 'cancelled', 'disattivato')}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Disattiva
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      );
    }
    
    if (subscription.status === 'cancelled') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUpdateSubscriptionStatus(subscription.id, 'active', 'riattivato')}
          disabled={isUpdating}
          className="flex items-center space-x-1 border-success text-success hover:bg-success hover:text-success-foreground"
        >
          <Play className="w-3 h-3" />
          <span>{isUpdating ? 'Attivando...' : 'Attiva'}</span>
        </Button>
      );
    }
    
    if (subscription.status === 'expired') {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUpdateSubscriptionStatus(subscription.id, 'active', 'riattivato')}
          disabled={isUpdating}
          className="flex items-center space-x-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <RotateCcw className="w-3 h-3" />
          <span>{isUpdating ? 'Riattivando...' : 'Riattiva'}</span>
        </Button>
      );
    }
    
    return null;
  };

  // Filter subscriptions based on search query
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const userName = `${sub.user?.first_name || ''} ${sub.user?.last_name || ''}`.toLowerCase();
    const userEmail = (sub.user?.email || '').toLowerCase();
    return userName.includes(query) || userEmail.includes(query);
  });

  // Calculate filtered stats
  const filteredStats = {
    total: filteredSubscriptions.length,
    active: filteredSubscriptions.filter(s => s.status === 'active').length,
    expiring_soon: filteredSubscriptions.filter(s => {
      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      return s.status === 'active' && new Date(s.expires_at) <= soon;
    }).length
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento abbonamenti...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Abbonamenti
          </h1>
          <p className="text-muted-foreground">
            Monitora e gestisci gli abbonamenti dei membri della palestra
          </p>
        </div>
        <Button 
          onClick={() => setManualActivationDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Attiva Abbonamento Manuale
        </Button>
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

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Cerca utente per nome o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Tutti ({searchQuery ? filteredStats.total : stats.total})</TabsTrigger>
          <TabsTrigger value="active">Attivi ({searchQuery ? filteredStats.active : stats.active})</TabsTrigger>
          <TabsTrigger value="expiring">In Scadenza ({searchQuery ? filteredStats.expiring_soon : stats.expiring_soon})</TabsTrigger>
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
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                             <AvatarImage src={sub.user?.profile_picture_url || undefined} />
                             <AvatarFallback>
                               {sub.user ? 
                                 `${sub.user.first_name?.[0] || ''}${sub.user.last_name?.[0] || ''}` ||
                                 sub.user.email?.[0]?.toUpperCase() || 'U'
                                 : 'U'
                               }
                             </AvatarFallback>
                          </Avatar>
                           <div>
                             <div className="font-medium">
                               {sub.user ? 
                                 `${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim() || 
                                 sub.user.email || 'Utente senza nome'
                                 : 'Utente non trovato'
                               }
                             </div>
                             <div className="text-sm text-muted-foreground">
                               {sub.user?.email || 'Email non disponibile'}
                             </div>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                           <div className="font-medium">{sub.plan?.name || 'Piano non disponibile'}</div>
                           <div className="text-sm text-muted-foreground">
                             {sub.plan?.unlimited_access ? 
                               sub.plan?.name : 
                               `${sub.plan?.credits_included || 0} crediti`
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
                       <TableCell>
                         <div className="flex items-center space-x-2">
                           {getStatusActionButton(sub)}
                           {canExtendSubscription(sub) && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleExtendClick(sub)}
                               className="flex items-center space-x-1"
                             >
                               <Clock className="w-3 h-3" />
                               <span>Estendi</span>
                             </Button>
                           )}
                           {(sub.status === 'active' || sub.status === 'expired') && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => handleDownloadReceipt(sub)}
                               disabled={generatingReceipt === sub.id}
                               className="flex items-center space-x-1"
                             >
                               <Download className="w-3 h-3" />
                               <span>{generatingReceipt === sub.id ? 'Generando...' : 'Ricevuta'}</span>
                             </Button>
                           )}
                         </div>
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
                  {filteredSubscriptions
                    .filter(sub => sub.status === 'active')
                    .map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={sub.user.profile_picture_url} />
                             <AvatarFallback>
                               {sub.user ? 
                                 `${sub.user.first_name?.[0] || ''}${sub.user.last_name?.[0] || ''}` ||
                                 sub.user.email?.[0]?.toUpperCase() || 'U'
                                 : 'U'
                               }
                             </AvatarFallback>
                          </Avatar>
                           <div>
                             <div className="font-medium">
                               {sub.user ? 
                                 `${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim() || 
                                 sub.user.email || 'Utente senza nome'
                                 : 'Utente non trovato'
                               }
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
                  {filteredSubscriptions
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
                                   {sub.user ? 
                                     `${sub.user.first_name?.[0] || ''}${sub.user.last_name?.[0] || ''}` ||
                                     sub.user.email?.[0]?.toUpperCase() || 'U'
                                     : 'U'
                                   }
                                 </AvatarFallback>
                              </Avatar>
                               <div>
                                 <div className="font-medium">
                                   {sub.user ? 
                                     `${sub.user.first_name || ''} ${sub.user.last_name || ''}`.trim() || 
                                     sub.user.email || 'Utente senza nome'
                                     : 'Utente non trovato'
                                   }
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

      {/* Extend Subscription Dialog */}
      {selectedSubscription && (
        <ExtendSubscriptionDialog
          isOpen={extendDialogOpen}
          onClose={() => setExtendDialogOpen(false)}
          subscription={selectedSubscription}
          onExtended={handleExtensionCompleted}
        />
      )}

      {/* Manual Activation Dialog */}
      <ManualSubscriptionActivationDialog
        isOpen={manualActivationDialogOpen}
        onClose={() => setManualActivationDialogOpen(false)}
        onActivated={handleManualActivationCompleted}
      />
    </div>
  );
};

export default OwnerSubscriptions;