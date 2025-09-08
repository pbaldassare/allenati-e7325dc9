import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';

interface CreditTransaction {
  id: string;
  amount: number;
  balance_after: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export const CreditsHistory = () => {
  const { user } = useAuth();
  const { selectedGym } = useGym();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !selectedGym) return;

    const fetchTransactions = async () => {
      try {
        const { data, error } = await supabase
          .from('credits_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('gym_id', selectedGym.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user, selectedGym]);

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome_bonus':
        return 'Credito Benvenuto';
      case 'purchase':
        return 'Acquisto';
      case 'booking':
        return 'Prenotazione';
      case 'refund':
        return 'Rimborso';
      default:
        return type;
    }
  };

  const getTransactionTypeVariant = (type: string) => {
    switch (type) {
      case 'welcome_bonus':
      case 'purchase':
      case 'refund':
        return 'default';
      case 'booking':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-pulse">Caricamento storico...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Storico Crediti
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna transazione trovata
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    transaction.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {transaction.amount > 0 ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm">
                      {transaction.description}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Saldo: {transaction.balance_after}
                  </div>
                  <Badge 
                    variant={getTransactionTypeVariant(transaction.transaction_type)}
                    className="text-xs mt-1"
                  >
                    {getTransactionTypeLabel(transaction.transaction_type)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};