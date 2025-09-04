import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, CreditCard, Calendar, User } from 'lucide-react';

interface SubscriptionPlan {
  id: string;
  name: string;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  price: number;
}

interface GymMember {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture_url?: string;
}

interface ManualSubscriptionActivationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  preselectedUserId?: string;
}

export default function ManualSubscriptionActivationDialog({
  isOpen,
  onClose,
  onActivated,
  preselectedUserId
}: ManualSubscriptionActivationDialogProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [members, setMembers] = useState<GymMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<GymMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedUserId && members.length > 0) {
      const preselected = members.find(member => member.user_id === preselectedUserId);
      if (preselected) {
        setSelectedMember(preselected);
        setSearchQuery('');
      }
    }
  }, [preselectedUserId, members]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = members.filter(member => 
        member.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMembers(filtered);
    } else {
      setFilteredMembers(members);
    }
  }, [searchQuery, members]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) return;

      // Load subscription plans for this gym
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('price');

      if (plansError) throw plansError;

      // Load gym members - first get memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', gymId)
        .eq('status', 'active');

      if (membershipsError) {
        console.error('Error loading memberships:', membershipsError);
        throw membershipsError;
      }

      if (!membershipsData || membershipsData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Then get profiles for those users
      const userIds = membershipsData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      const membersData = profilesData?.map((profile: any) => ({
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        profile_picture_url: profile.profile_picture_url
      })) || [];

      setPlans(plansData || []);
      setMembers(membersData);
      setFilteredMembers(membersData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Errore nel caricamento dei dati');
    }
  };

  const getSelectedPlan = () => {
    return plans.find(plan => plan.id === selectedPlan);
  };

  const calculateExpiryDate = () => {
    if (!selectedPlan) return null;
    const plan = getSelectedPlan();
    if (!plan) return null;
    
    const start = new Date(startDate);
    const expiry = new Date(start);
    expiry.setDate(expiry.getDate() + plan.duration_days);
    return expiry;
  };

  const handleActivateSubscription = async () => {
    if (!selectedMember || !selectedPlan) {
      toast.error('Seleziona utente e piano abbonamento');
      return;
    }

    setLoading(true);
    try {
      const plan = getSelectedPlan()!;
      const expiryDate = calculateExpiryDate()!;

      // Get current user and gym ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) throw new Error('Gym not found');

      // Check for existing active subscriptions
      const { data: existingSubscriptions } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', selectedMember.user_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // Cancel existing active subscriptions
      if (existingSubscriptions && existingSubscriptions.length > 0) {
        await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', selectedMember.user_id)
          .eq('status', 'active');
      }

      // Create new subscription
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: selectedMember.user_id,
          plan_id: selectedPlan,
          gym_id: gymId,
          status: 'active',
          starts_at: new Date(startDate).toISOString(),
          expires_at: expiryDate.toISOString(),
          auto_renew: false
        });

      if (subscriptionError) throw subscriptionError;

      // Add credits if the plan includes them
      if (plan.credits_included > 0) {
        await supabase
          .from('credits_transactions')
          .insert({
            user_id: selectedMember.user_id,
            gym_id: gymId,
            amount: plan.credits_included,
            balance_after: plan.credits_included,
            transaction_type: 'subscription_activation',
            description: `Crediti da attivazione manuale abbonamento: ${plan.name}${notes ? ` - ${notes}` : ''}`
          });
      }

      toast.success(`Abbonamento ${plan.name} attivato per ${selectedMember.first_name} ${selectedMember.last_name}`);
      onActivated();
      handleClose();

    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Errore nell\'attivazione dell\'abbonamento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMember(null);
    setSelectedPlan('');
    setSearchQuery('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Attivazione Manuale Abbonamento
          </DialogTitle>
          <DialogDescription>
            Attiva un abbonamento per un membro della palestra senza pagamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Member Selection */}
          {!preselectedUserId && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Seleziona Utente
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
            
            {!preselectedUserId && searchQuery && (
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                {filteredMembers.map((member) => (
                  <div
                    key={member.user_id}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${
                      selectedMember?.user_id === member.user_id ? 'bg-primary/10 border-primary' : ''
                    }`}
                    onClick={() => {
                      setSelectedMember(member);
                      setSearchQuery('');
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profile_picture_url} />
                        <AvatarFallback>
                          {`${member.first_name?.[0] || ''}${member.last_name?.[0] || ''}` || member.email?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {`${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email}
                        </div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          {selectedMember && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedMember.profile_picture_url} />
                      <AvatarFallback>
                        {`${selectedMember.first_name?.[0] || ''}${selectedMember.last_name?.[0] || ''}` || selectedMember.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {`${selectedMember.first_name || ''} ${selectedMember.last_name || ''}`.trim() || selectedMember.email}
                      </div>
                      <div className="text-sm text-muted-foreground">{selectedMember.email}</div>
                    </div>
                  </div>
                  {preselectedUserId && (
                    <div className="text-xs text-muted-foreground">
                      Utente preselezionato
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label>Piano Abbonamento</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona piano abbonamento" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex justify-between items-center w-full">
                      <span>{plan.name}</span>
                      <span className="text-muted-foreground ml-4">
                        €{plan.price} - {plan.duration_days} giorni
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data Inizio
            </Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Textarea
              placeholder="Aggiungi una nota per questa attivazione manuale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedMember && selectedPlan && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Anteprima Abbonamento</h4>
                <div className="space-y-1 text-sm">
                  <div><strong>Utente:</strong> {selectedMember.first_name} {selectedMember.last_name}</div>
                  <div><strong>Piano:</strong> {getSelectedPlan()?.name}</div>
                  <div><strong>Durata:</strong> {getSelectedPlan()?.duration_days} giorni</div>
                  <div><strong>Inizio:</strong> {new Date(startDate).toLocaleDateString('it-IT')}</div>
                  <div><strong>Scadenza:</strong> {calculateExpiryDate()?.toLocaleDateString('it-IT')}</div>
                  {getSelectedPlan()?.credits_included && (
                    <div><strong>Crediti inclusi:</strong> {getSelectedPlan()?.credits_included}</div>
                  )}
                  {getSelectedPlan()?.unlimited_access && (
                    <div className="text-green-600"><strong>Accesso illimitato</strong></div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annulla
          </Button>
          <Button 
            onClick={handleActivateSubscription} 
            disabled={loading || !selectedMember || !selectedPlan}
          >
            {loading ? 'Attivazione...' : 'Attiva Abbonamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}