import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, CreditCard, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserHistoryModalProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  gymId?: string;
}

interface BookingHistory {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
  course_name_snapshot?: string;
  course: {
    name: string;
  };
}

interface SubscriptionHistory {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  plan: {
    name: string;
    credits_included: number;
    unlimited_access: boolean;
  };
}

interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export const UserHistoryModal: React.FC<UserHistoryModalProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
  gymId
}) => {
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionHistory[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserHistory();
    }
  }, [isOpen, userId]);

  const loadUserHistory = async () => {
    setLoading(true);
    try {
      // Load booking history with consolidated data preference
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          course:courses(name, gym_id)
        `)
        .eq('user_id', userId);

      // Filter by gym if gymId is provided
      if (gymId) {
        bookingsQuery = bookingsQuery.eq('course.gym_id', gymId);
      }

      const { data: bookingsData } = await bookingsQuery
        .order('created_at', { ascending: false })
        .limit(50);

      // Load subscription history
      let subscriptionsQuery = supabase
        .from('user_subscriptions')
        .select(`
          *,
          plan:subscription_plans(name, credits_included, unlimited_access)
        `)
        .eq('user_id', userId);

      // Filter by gym if gymId is provided
      if (gymId) {
        subscriptionsQuery = subscriptionsQuery.eq('gym_id', gymId);
      }

      const { data: subscriptionsData } = await subscriptionsQuery
        .order('created_at', { ascending: false });

      // Load credit transactions
      let transactionsQuery = supabase
        .from('credits_transactions')
        .select('*')
        .eq('user_id', userId);

      // Filter by gym if gymId is provided
      if (gymId) {
        transactionsQuery = transactionsQuery.eq('gym_id', gymId);
      }

      const { data: transactionsData } = await transactionsQuery
        .order('created_at', { ascending: false })
        .limit(50);

      setBookings(bookingsData || []);
      setSubscriptions(subscriptionsData || []);
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error('Error loading user history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: any } = {
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'secondary',
      active: 'default',
      expired: 'outline'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Storico Utente - {userName}</DialogTitle>
          <DialogDescription>
            Cronologia completa di prenotazioni, abbonamenti e transazioni crediti
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Caricamento storico...</div>
        ) : (
          <Tabs defaultValue="bookings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="bookings" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Prenotazioni ({bookings.length})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Abbonamenti ({subscriptions.length})
              </TabsTrigger>
              <TabsTrigger value="credits" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Crediti ({transactions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bookings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cronologia Prenotazioni</CardTitle>
                  <CardDescription>
                    Tutte le prenotazioni effettuate dall'utente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nessuna prenotazione trovata
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Corso</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Ora</TableHead>
                          <TableHead>Stato</TableHead>
                          <TableHead>Prenotato il</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell className="font-medium">
                              {booking.course_name_snapshot || booking.course?.name || 'Corso non disponibile'}
                            </TableCell>
                            <TableCell>
                              {new Date(booking.scheduled_date).toLocaleDateString('it-IT')}
                            </TableCell>
                             <TableCell>
                               {booking.scheduled_time.slice(0, 5)}
                             </TableCell>
                            <TableCell>
                              {getStatusBadge(booking.status)}
                            </TableCell>
                            <TableCell>
                              {new Date(booking.created_at).toLocaleDateString('it-IT')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscriptions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cronologia Abbonamenti</CardTitle>
                  <CardDescription>
                    Tutti gli abbonamenti sottoscritti dall'utente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subscriptions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nessun abbonamento trovato
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Piano</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Inizio</TableHead>
                          <TableHead>Scadenza</TableHead>
                          <TableHead>Stato</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">
                              {sub.plan.name}
                            </TableCell>
                            <TableCell>
                              {sub.plan.unlimited_access ? 
                                sub.plan.name : 
                                `${sub.plan.credits_included} crediti`
                              }
                            </TableCell>
                            <TableCell>
                              {new Date(sub.starts_at).toLocaleDateString('it-IT')}
                            </TableCell>
                            <TableCell>
                              {new Date(sub.expires_at).toLocaleDateString('it-IT')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(sub.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="credits" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cronologia Crediti</CardTitle>
                  <CardDescription>
                    Tutte le transazioni di crediti dell'utente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Nessuna transazione trovata
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Importo</TableHead>
                          <TableHead>Saldo</TableHead>
                          <TableHead>Descrizione</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getTransactionIcon(tx.transaction_type, tx.amount)}
                                <span className="capitalize">{tx.transaction_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">
                              {tx.balance_after}
                            </TableCell>
                            <TableCell>
                              {tx.description}
                            </TableCell>
                            <TableCell>
                              {new Date(tx.created_at).toLocaleDateString('it-IT')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};