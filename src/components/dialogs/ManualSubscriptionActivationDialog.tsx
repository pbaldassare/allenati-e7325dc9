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
import { useOwnerGym } from '@/contexts/OwnerGymContext';

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
  const { selectedGym } = useOwnerGym();
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
      console.log('🔄 Dialog opened, loading data...');
      console.log('🔄 Current selectedGym:', selectedGym);
      setLoading(true);
      loadData();
    }
  }, [isOpen, selectedGym]);

  useEffect(() => {
    console.log('🔍 Preselection effect triggered');
    console.log('🔍 Preselected user ID:', preselectedUserId);
    console.log('🔍 Members available:', members.length);
    
    if (preselectedUserId && members.length > 0) {
      const preselected = members.find(member => member.user_id === preselectedUserId);
      console.log('🔍 Found preselected member:', preselected);
      
      if (preselected) {
        setSelectedMember(preselected);
        setSearchQuery('');
        console.log('✅ Preselected member set:', preselected);
      } else {
        console.log('❌ Preselected member not found in members list');
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
      console.log('🔍 ManualSubscriptionActivationDialog - Loading data...');
      console.log('🔍 Selected gym:', selectedGym);
      console.log('🔍 Preselected user ID:', preselectedUserId);
      
      if (!selectedGym?.id) {
        console.error('❌ No gym selected');
        toast.error('Errore: Nessuna palestra selezionata. Ricarica la pagina e seleziona una palestra.');
        setLoading(false);
        return;
      }

      console.log('✅ Using gym:', selectedGym.name, 'ID:', selectedGym.id);

      // Load subscription plans for this gym
      console.log('🔍 Loading subscription plans for gym:', selectedGym.id);
      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('gym_id', selectedGym.id)
        .eq('is_active', true)
        .order('price');

      if (plansError) {
        console.error('❌ Error loading plans:', plansError);
        throw plansError;
      }
      console.log('✅ Loaded plans:', plansData);

      // Load gym members - first get memberships
      console.log('🔍 Loading gym memberships for gym ID:', selectedGym.id);
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('user_gym_memberships')
        .select('user_id')
        .eq('gym_id', selectedGym.id)
        .eq('status', 'active');

      if (membershipsError) {
        console.error('❌ Error loading memberships:', membershipsError);
        toast.error('Errore nel caricamento dei membri della palestra');
        throw membershipsError;
      }
      console.log('✅ Loaded memberships:', membershipsData?.length || 0, 'members');

      if (!membershipsData || membershipsData.length === 0) {
        console.log('⚠️ No active memberships found for gym:', selectedGym.name);
        toast.error(`Nessun membro attivo trovato per la palestra "${selectedGym.name}". Aggiungi membri prima di attivare abbonamenti.`);
        setMembers([]);
        setPlans([]);
        return;
      }

      // Then get profiles for those users
      const userIds = membershipsData.map(m => m.user_id);
      console.log('🔍 Loading profiles for user IDs:', userIds);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ Error loading profiles:', profilesError);
        throw profilesError;
      }
      console.log('✅ Loaded profiles:', profilesData);

      const membersData = profilesData?.map((profile: any) => ({
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        profile_picture_url: profile.profile_picture_url
      })) || [];

      console.log('✅ Final members data:', membersData);

      setPlans(plansData || []);
      setMembers(membersData);
      setFilteredMembers(membersData);

    } catch (error) {
      console.error('❌ Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore nel caricamento dei dati: ${errorMessage}`);
      setMembers([]);
      setPlans([]);
    } finally {
      setLoading(false);
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
    console.log('🚀 Starting manual subscription activation...');
    console.log('🚀 Selected member:', selectedMember);
    console.log('🚀 Selected plan:', selectedPlan);
    console.log('🚀 Selected gym:', selectedGym);
    
    if (!selectedMember || !selectedPlan) {
      console.error('❌ Missing selection - Member or plan not selected');
      toast.error('Seleziona utente e piano abbonamento');
      return;
    }

    setLoading(true);
    try {
      const plan = getSelectedPlan()!;
      const expiryDate = calculateExpiryDate()!;
      
      console.log('🚀 Plan details:', plan);
      console.log('🚀 Expiry date:', expiryDate);

      // Check if gym is selected
      if (!selectedGym?.id) {
        console.error('❌ No gym ID available');
        throw new Error('Nessuna palestra selezionata');
      }

      // Check for existing active subscriptions
      console.log('🔍 Checking for existing subscriptions...');
      const { data: existingSubscriptions, error: existingError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', selectedMember.user_id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      if (existingError) {
        console.error('❌ Error checking existing subscriptions:', existingError);
        throw existingError;
      }
      console.log('🔍 Existing subscriptions:', existingSubscriptions);

      // Cancel existing active subscriptions
      if (existingSubscriptions && existingSubscriptions.length > 0) {
        console.log('🔄 Cancelling existing subscriptions...');
        const { error: cancelError } = await supabase
          .from('user_subscriptions')
          .update({ status: 'cancelled' })
          .eq('user_id', selectedMember.user_id)
          .eq('status', 'active');
          
        if (cancelError) {
          console.error('❌ Error cancelling subscriptions:', cancelError);
          throw cancelError;
        }
        console.log('✅ Existing subscriptions cancelled');
      }

      // Create new subscription
      console.log('📝 Creating new subscription...');
      const subscriptionData = {
        user_id: selectedMember.user_id,
        plan_id: selectedPlan,
        gym_id: selectedGym.id,
        status: 'active' as const,
        starts_at: new Date(startDate).toISOString(),
        expires_at: expiryDate.toISOString(),
        auto_renew: false
      };
      console.log('📝 Subscription data:', subscriptionData);
      
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .insert(subscriptionData);

      if (subscriptionError) {
        console.error('❌ Error creating subscription:', subscriptionError);
        throw subscriptionError;
      }
      console.log('✅ Subscription created successfully');

      // Add credits if the plan includes them
      if (plan.credits_included > 0) {
        console.log('💳 Adding credits:', plan.credits_included);
        const { error: creditsError } = await supabase
          .from('credits_transactions')
          .insert({
            user_id: selectedMember.user_id,
            gym_id: selectedGym.id,
            amount: plan.credits_included,
            balance_after: plan.credits_included,
            transaction_type: 'subscription_activation',
            description: `Crediti da attivazione manuale abbonamento: ${plan.name}${notes ? ` - ${notes}` : ''}`
          });
          
        if (creditsError) {
          console.error('❌ Error adding credits:', creditsError);
          // Don't throw here, subscription was created successfully
          toast.error('Abbonamento attivato ma errore nell\'aggiunta crediti');
        } else {
          console.log('✅ Credits added successfully');
        }
      }

      console.log('🎉 Manual subscription activation completed successfully');
      toast.success(`Abbonamento ${plan.name} attivato per ${selectedMember.first_name} ${selectedMember.last_name}`);
      onActivated();
      handleClose();

    } catch (error) {
      console.error('❌ Error activating subscription:', error);
      toast.error(`Errore nell'attivazione dell'abbonamento: ${error.message || 'Errore sconosciuto'}`);
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
          {/* Debug Info */}
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <div>🏢 Palestra: {selectedGym?.name || 'Non selezionata'}</div>
            <div>👥 Membri caricati: {members.length}</div>
            <div>📋 Piani disponibili: {plans.length}</div>
            {preselectedUserId && <div>🎯 Utente preselezionato: {preselectedUserId}</div>}
          </div>
          
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
            {plans.length === 0 ? (
              <div className="p-3 border border-muted rounded-md text-sm text-muted-foreground text-center">
                Nessun piano abbonamento disponibile per questa palestra.
                <br />
                Contatta l'amministratore per configurare i piani.
              </div>
            ) : (
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
            )}
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
            disabled={loading || !selectedMember || !selectedPlan || plans.length === 0}
          >
            {loading ? 'Attivazione...' : 
             plans.length === 0 ? 'Nessun piano disponibile' :
             !selectedMember ? 'Seleziona un utente' : 
             !selectedPlan ? 'Seleziona un piano' : 
             'Attiva Abbonamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}