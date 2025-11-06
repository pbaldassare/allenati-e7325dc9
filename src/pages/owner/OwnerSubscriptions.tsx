import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Users, CreditCard, TrendingUp, Calendar, Clock, Plus, Download, Play, Pause, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ExtendSubscriptionDialog from '@/components/dialogs/ExtendSubscriptionDialog';
import ManualSubscriptionActivationDialog from '@/components/dialogs/ManualSubscriptionActivationDialog';
import { RenewSubscriptionDialog } from '@/components/dialogs/RenewSubscriptionDialog';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import { useIsMobile } from '@/hooks/use-mobile';

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

// Helper function to check if a subscription is truly active
const isSubscriptionActive = (subscription: UserSubscription): boolean => {
  if (subscription.status !== 'active') return false;
  
  const expiresDate = new Date(subscription.expires_at);
  const now = new Date();
  
  return expiresDate > now;
};

const OwnerSubscriptions: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const isMobile = useIsMobile();
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
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedSubscriptionToRenew, setSelectedSubscriptionToRenew] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'status' | 'expires_at' | 'created_at'>('status');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [userCredits, setUserCredits] = useState<Map<string, number>>(new Map());
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
      
      // Load subscriptions for gym members in the current gym only
      const { data: subscriptionsData, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .in('user_id', memberIds.map(m => m.user_id))
        .eq('gym_id', selectedGym.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Load related data separately
      const subscriptionIds = subscriptionsData?.map(s => s.plan_id) || [];
      const userIds = subscriptionsData?.map(s => s.user_id) || [];
      
      const [plansData, profilesData, creditsData] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('id, name, credits_included, unlimited_access, duration_days')
          .in('id', subscriptionIds),
        supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, profile_picture_url')
          .in('user_id', userIds),
        supabase
          .from('gym_credits')
          .select('user_id, credits')
          .in('user_id', userIds)
          .eq('gym_id', selectedGym.id)
      ]);

      const plansMap = new Map(plansData.data?.map(p => [p.id, p]) || []);
      const profilesMap = new Map(profilesData.data?.map(p => [p.user_id, p]) || []);
      const creditsMap = new Map(creditsData.data?.map(c => [c.user_id, c.credits]) || []);
      
      setUserCredits(creditsMap);
      
      // Function to get complete user data with fallbacks
      const getUserData = (userId: string) => {
        const profile = profilesMap.get(userId);
        
        return {
          first_name: profile?.first_name || 'Nome',
          last_name: profile?.last_name || 'Cognome',
          email: profile?.email || `user-${userId.slice(0, 8)}`,
          profile_picture_url: profile?.profile_picture_url || null
        };
      };
      
      const subs = (subscriptionsData || []).map((sub: any) => {
        const plan = plansMap.get(sub.plan_id);
        const user = getUserData(sub.user_id);
        
        console.log(`Processing subscription ${sub.id}:`, {
          plan_id: sub.plan_id,
          user_id: sub.user_id,
          plan,
          user
        });
        
        return {
          ...sub,
          plan: plan || null,
          user: user // Always return user data, even if incomplete
        };
      }); // Rimosso filtro - mostriamo tutte le subscription anche se incomplete
      
      console.log('Processed subscriptions:', subs);
      setSubscriptions(subs);

      // Calculate stats
      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 7); // 7 days from now

      const active = subs.filter(s => isSubscriptionActive(s)).length;
      const expiring_soon = subs.filter(s => {
        if (!isSubscriptionActive(s)) return false;
        return new Date(s.expires_at) <= soon && new Date(s.expires_at) > now;
      }).length;

      const by_plan: { [key: string]: number } = {};
      subs.forEach(s => {
        if (isSubscriptionActive(s) && s.plan) {
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
      subscription.plan?.unlimited_access &&
      subscription.plan?.duration_days === 365
    );
  };

  const handleExtendClick = (subscription: UserSubscription) => {
    setSelectedSubscription(subscription);
    setExtendDialogOpen(true);
  };

  const handleRenewClick = (subscription: UserSubscription) => {
    setSelectedSubscriptionToRenew(subscription);
    setRenewDialogOpen(true);
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

  const handleDownloadReceipt = async (subscription: UserSubscription, retryCount = 0) => {
    try {
      setGeneratingReceipt(subscription.id);
      
      console.log(`[RECEIPT-DOWNLOAD] Starting receipt generation for subscription: ${subscription.id}, attempt: ${retryCount + 1}`);
      
      const { data, error } = await supabase.functions.invoke('generate-subscription-receipt', {
        body: { subscriptionId: subscription.id }
      });

      if (error) {
        console.error('[RECEIPT-DOWNLOAD] Edge function error:', error);
        throw error;
      }

      console.log('[RECEIPT-DOWNLOAD] Edge function response received:', typeof data, data ? 'has data' : 'no data');

      if (!data || !data.pdf) {
        throw new Error('Invalid response format - missing PDF data');
      }

      // Convert base64 to blob using fetch approach for better compatibility
      const base64Response = await fetch(`data:application/pdf;base64,${data.pdf}`);
      const blob = await base64Response.blob();
      
      console.log('[RECEIPT-DOWNLOAD] PDF blob created, size:', blob.size, 'bytes');

      if (blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ricevuta-abbonamento-${subscription.user?.first_name || 'utente'}-${subscription.user?.last_name || 'sconosciuto'}.pdf`;
      
      // Ensure link is temporarily added to DOM for compatibility
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      console.log('[RECEIPT-DOWNLOAD] Download completed successfully');
      
      toast({
        title: "Ricevuta scaricata",
        description: "La ricevuta è stata generata e scaricata con successo.",
      });

    } catch (error) {
      console.error('[RECEIPT-DOWNLOAD] Error generating receipt:', error);
      
      // Retry logic for transient failures
      if (retryCount < 2 && (
        error.message?.includes('network') || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch')
      )) {
        console.log(`[RECEIPT-DOWNLOAD] Retrying download, attempt ${retryCount + 2}/3...`);
        setTimeout(() => {
          handleDownloadReceipt(subscription, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Progressive delay
        return;
      }

      // Show user-friendly error message
      const errorMessage = error.message?.includes('PDF') 
        ? 'Errore nella generazione del PDF. Riprova più tardi.'
        : error.message?.includes('network') || error.message?.includes('fetch')
        ? 'Errore di connessione. Verifica la tua connessione e riprova.'
        : 'Errore nella generazione della ricevuta. Riprova più tardi.';

      toast({
        title: "Errore download ricevuta",
        description: errorMessage,
        variant: "destructive",
      });
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
        <div className="text-sm text-muted-foreground">
          Scaduto il {format(new Date(subscription.expires_at), 'dd/MM/yyyy')}
        </div>
      );
    }
    
    return null;
  };

  // Filter and sort subscriptions
  const filteredAndSortedSubscriptions = React.useMemo(() => {
    // First filter by search query
    let filtered = subscriptions.filter(sub => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const userName = `${sub.user?.first_name || ''} ${sub.user?.last_name || ''}`.toLowerCase();
      const userEmail = (sub.user?.email || '').toLowerCase();
      return userName.includes(query) || userEmail.includes(query);
    });

    // Then sort
    filtered.sort((a, b) => {
      if (sortBy === 'status') {
        // Custom status priority: active > expiring > expired > cancelled
        const statusPriority = {
          'active': 1,
          'expired': 2,
          'cancelled': 3
        };
        
        const aPriority = statusPriority[a.status] || 4;
        const bPriority = statusPriority[b.status] || 4;
        
        if (aPriority !== bPriority) {
          return sortOrder === 'asc' ? aPriority - bPriority : bPriority - aPriority;
        }
        
        // If same status, sort by expiration date for active subscriptions
        if (a.status === 'active' && b.status === 'active') {
          const aExpires = new Date(a.expires_at).getTime();
          const bExpires = new Date(b.expires_at).getTime();
          return aExpires - bExpires; // Sooner expiring first
        }
        
        return 0;
      } else if (sortBy === 'expires_at') {
        const aDate = new Date(a.expires_at).getTime();
        const bDate = new Date(b.expires_at).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      } else if (sortBy === 'created_at') {
        const aDate = new Date(a.starts_at).getTime();
        const bDate = new Date(b.starts_at).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      return 0;
    });

    return filtered;
  }, [subscriptions, searchQuery, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = filteredAndSortedSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, sortOrder]);

  // Calculate filtered stats
  const filteredStats = {
    total: filteredAndSortedSubscriptions.length,
    active: filteredAndSortedSubscriptions.filter(s => isSubscriptionActive(s)).length,
    expiring_soon: filteredAndSortedSubscriptions.filter(s => {
      if (!isSubscriptionActive(s)) return false;
      const now = new Date();
      const soon = new Date();
      soon.setDate(soon.getDate() + 7);
      return new Date(s.expires_at) <= soon && new Date(s.expires_at) > now;
    }).length
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento abbonamenti...</div>;
  }

  return (
    <div className="space-y-6">
      <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-start'}`}>
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
          className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}
        >
          <Plus className="w-4 h-4" />
          {isMobile ? 'Attiva Abbonamento' : 'Attiva Abbonamento Manuale'}
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

      {/* Search and Sorting Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cerca utente per nome o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: 'status' | 'expires_at' | 'created_at') => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Ordina per" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Stato</SelectItem>
                  <SelectItem value="expires_at">Scadenza</SelectItem>
                  <SelectItem value="created_at">Data inizio</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="expiring" className="w-full">
        <TabsList>
          <TabsTrigger value="expiring">In Scadenza ({searchQuery ? filteredStats.expiring_soon : stats.expiring_soon})</TabsTrigger>
          <TabsTrigger value="active">Attivi ({searchQuery ? filteredStats.active : stats.active})</TabsTrigger>
          <TabsTrigger value="all">Tutti ({searchQuery ? filteredStats.total : stats.total})</TabsTrigger>
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
                   {paginatedSubscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                             <AvatarImage src={sub.user?.profile_picture_url || undefined} />
                              <AvatarFallback>
                                {`${sub.user.first_name?.[0] || ''}${sub.user.last_name?.[0] || ''}` || 
                                 sub.user.email?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                           </Avatar>
                            <div>
                              <div className="font-medium">
                                {sub.user.first_name} {sub.user.last_name}
                                {(!sub.user.first_name || sub.user.first_name === 'Nome') && 
                                 (!sub.user.last_name || sub.user.last_name === 'Cognome') && (
                                  <span className="text-muted-foreground text-xs ml-2">(ID: {sub.user_id.slice(0, 8)})</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sub.user.email}
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
                           <Button
                             variant="default"
                             size="sm"
                             onClick={() => handleRenewClick(sub)}
                             className="flex items-center space-x-1"
                           >
                             <RefreshCw className="w-3 h-3" />
                             <span>Rinnova</span>
                           </Button>
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
               
               {/* Pagination */}
               {totalPages > 1 && (
                 <div className="mt-6 flex items-center justify-between">
                   <div className="text-sm text-muted-foreground">
                     Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedSubscriptions.length)} di {filteredAndSortedSubscriptions.length} abbonamenti
                   </div>
                   <Pagination>
                     <PaginationContent>
                       <PaginationItem>
                         <PaginationPrevious 
                           onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                           className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                         />
                       </PaginationItem>
                       
                       {[...Array(totalPages)].map((_, index) => {
                         const page = index + 1;
                         if (totalPages > 7 && (page > 3 && page < totalPages - 2 && Math.abs(page - currentPage) > 1)) {
                           return page === 4 || page === totalPages - 3 ? (
                             <PaginationItem key={page}>
                               <span className="px-3 py-2">...</span>
                             </PaginationItem>
                           ) : null;
                         }
                         return (
                           <PaginationItem key={page}>
                             <PaginationLink
                               onClick={() => setCurrentPage(page)}
                               isActive={currentPage === page}
                               className="cursor-pointer"
                             >
                               {page}
                             </PaginationLink>
                           </PaginationItem>
                         );
                       })}
                       
                       <PaginationItem>
                         <PaginationNext
                           onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                           className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                         />
                       </PaginationItem>
                     </PaginationContent>
                   </Pagination>
                 </div>
               )}
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
                    <TableHead>Inizio</TableHead>
                    <TableHead>Scadenza</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {filteredAndSortedSubscriptions
                     .filter(sub => isSubscriptionActive(sub))
                     .map((sub) => {
                       const userCreditsBalance = userCredits.get(sub.user_id) || 0;
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
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.plan?.name || 'Piano non disponibile'}</div>
                          {sub.plan && !sub.plan.unlimited_access && (
                            <div className="text-sm text-muted-foreground">
                              {userCreditsBalance} crediti residui
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(sub.starts_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.expires_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                       );
                     })}
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
                    <TableHead>Inizio</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Giorni Rimanenti</TableHead>
                  </TableRow>
                </TableHeader>
                 <TableBody>
                   {filteredAndSortedSubscriptions
                     .filter(sub => {
                       if (!isSubscriptionActive(sub)) return false;
                       const expiresDate = new Date(sub.expires_at);
                       const now = new Date();
                       const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                       return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
                     })
                     .map((sub) => {
                      const expiresDate = new Date(sub.expires_at);
                      const now = new Date();
                      const daysUntilExpiry = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      const userCreditsBalance = userCredits.get(sub.user_id) || 0;
                      
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
                          <TableCell>
                            <div>
                              <div className="font-medium">{sub.plan?.name || 'Piano non disponibile'}</div>
                              {sub.plan && !sub.plan.unlimited_access && (
                                <div className="text-sm text-muted-foreground">
                                  {userCreditsBalance} crediti residui
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(sub.starts_at).toLocaleDateString()}
                          </TableCell>
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

      {/* Renew Subscription Dialog */}
      {selectedSubscriptionToRenew && (
        <RenewSubscriptionDialog
          isOpen={renewDialogOpen}
          onClose={() => {
            setRenewDialogOpen(false);
            setSelectedSubscriptionToRenew(null);
          }}
          subscription={selectedSubscriptionToRenew}
          onRenewed={() => {
            loadSubscriptionData();
            setRenewDialogOpen(false);
            setSelectedSubscriptionToRenew(null);
          }}
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