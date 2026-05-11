import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Search, Users, UserPlus, Clock, MapPin, Calendar, CreditCard, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { useInstructorGym } from '@/contexts/InstructorGymContext';
import { getUserActiveSubscription } from '@/lib/subscriptionHelpers';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  current_credits: number;
  phone?: string;
  subscription?: {
    id: string;
    plan_name: string;
    unlimited_access: boolean;
    expires_at: string;
  };
}

interface CourseSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_name: string;
  max_participants: number;
  available_spots: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  unlimited_access: boolean;
  description: string;
}

export const InstructorManualEnrollment: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [activatingSubscription, setActivatingSubscription] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const { courses } = useInstructorCourses();
  const { selectedGymId } = useInstructorGym();

  // Load subscription plans for the gym
  const loadSubscriptionPlans = async () => {
    if (!selectedGymId) return;
    
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('gym_id', selectedGymId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setSubscriptionPlans(data || []);
    } catch (error) {
      console.error('Error loading subscription plans:', error);
    }
  };

  // Search users in the gym with subscription info
  const searchUsers = async () => {
    if (!searchTerm.trim() || !selectedGymId) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Searching users with term:', searchTerm, 'in gym:', selectedGymId);
      
      // Search users who are members of the selected gym
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          first_name, 
          last_name, 
          email, 
          phone,
          user_gym_memberships!inner(gym_id, status)
        `)
        .eq('user_gym_memberships.gym_id', selectedGymId)
        .eq('user_gym_memberships.status', 'active')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      console.log('🔍 Found profiles:', data?.length || 0);

      // Enhance users with subscription and gym credits info
      const enhancedUsers = await Promise.all(
        (data || []).map(async (profile) => {
          console.log('🔍 Checking subscription for user:', profile.email);
          const subscription = await getUserActiveSubscription(profile.user_id, selectedGymId);
          
          // Get gym-specific credits
          const { data: gymCredits } = await supabase
            .from('gym_credits')
            .select('credits')
            .eq('user_id', profile.user_id)
            .eq('gym_id', selectedGymId)
            .maybeSingle();
          
          const userObj = {
            id: profile.user_id,
            first_name: profile.first_name || 'Nome',
            last_name: profile.last_name || 'Cognome',
            email: profile.email || '',
            phone: profile.phone || '',
            current_credits: gymCredits?.credits || 0,
            subscription: subscription ? {
              id: subscription.id,
              plan_name: subscription.subscription_plans.name,
              unlimited_access: subscription.subscription_plans.unlimited_access,
              expires_at: subscription.expires_at
            } : undefined
          };
          
          console.log('🔍 Enhanced user:', userObj.email, 'has subscription:', !!userObj.subscription);
          return userObj;
        })
      );

      setUsers(enhancedUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Errore nella ricerca utenti"
      });
    } finally {
      setLoading(false);
    }
  };

  // Force refresh user data
  const refreshUserData = async (userId: string) => {
    if (!selectedGymId) return;
    
    console.log('🔄 Refreshing user data for:', userId);
    try {
      const subscription = await getUserActiveSubscription(userId, selectedGymId);
      
      if (selectedUser?.id === userId) {
        setSelectedUser({
          ...selectedUser,
          subscription: subscription ? {
            id: subscription.id,
            plan_name: subscription.subscription_plans.name,
            unlimited_access: subscription.subscription_plans.unlimited_access,
            expires_at: subscription.expires_at
          } : undefined
        });
      }
      
      // Also refresh the users list if the user is in it
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? {
            ...user,
            subscription: subscription ? {
              id: subscription.id,
              plan_name: subscription.subscription_plans.name,
              unlimited_access: subscription.subscription_plans.unlimited_access,
              expires_at: subscription.expires_at
            } : undefined
          } : user
        )
      );
      
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Load course sessions for the selected gym
  const loadSessions = async () => {
    if (!selectedCourse || !selectedGymId) {
      setSessions([]);
      return;
    }

    try {
      // Only load sessions for courses in the selected gym
      const { data, error } = await supabase
        .from('course_sessions')
        .select(`
          *,
          courses!inner(gym_id)
        `)
        .eq('course_id', selectedCourse)
        .eq('courses.gym_id', selectedGymId)
        .eq('status', 'scheduled')
        .gte('session_date', new Date().toISOString().split('T')[0])
        .order('session_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Errore nel caricamento delle sessioni"
      });
    }
  };

  // Manual enrollment
  const enrollUser = async (sessionId: string, userId: string) => {
    setEnrolling(sessionId);
    try {
      const { data, error } = await supabase.rpc('manual_enroll_user', {
        _user_id: userId,
        _session_id: sessionId,
        _enrolled_by: user?.id
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Utente iscritto con successo!"
      });
      
      // Reload sessions to update available spots
      await loadSessions();
      
      // Clear selection
      setSelectedUser(null);
      
    } catch (error: any) {
      console.error('Error enrolling user:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'iscrizione"
      });
    } finally {
      setEnrolling(null);
    }
  };

  // Activate subscription for user
  const activateSubscription = async (userId: string, planId: string) => {
    setActivatingSubscription(true);
    try {
      console.log('🔄 Activating subscription for user:', userId, 'plan:', planId);
      
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Piano non trovato');

      // First, cancel any existing active subscriptions
      console.log('🔄 Cancelling existing subscriptions...');
      await supabase
        .from('user_subscriptions')
        .update({ status: 'cancelled' })
        .eq('user_id', userId)
        .eq('gym_id', selectedGymId)
        .eq('status', 'active');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duration_days);

      console.log('🔄 Creating new subscription...', {
        user_id: userId,
        plan_id: planId,
        gym_id: selectedGymId,
        expires_at: expiresAt.toISOString()
      });

      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          gym_id: selectedGymId,
          status: 'active',
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        console.error('🔄 Insert error:', insertError);
        throw insertError;
      }

      console.log('🔄 Subscription created successfully');

      toast({
        title: "Successo",
        description: "Abbonamento attivato con successo!"
      });
      
      // Force refresh user data after a short delay to allow DB to update
      setTimeout(async () => {
        await refreshUserData(userId);
      }, 500);
      
    } catch (error: any) {
      console.error('🔄 Error activating subscription:', error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nell'attivazione dell'abbonamento"
      });
    } finally {
      setActivatingSubscription(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [selectedCourse]);

  useEffect(() => {
    loadSubscriptionPlans();
  }, [selectedGymId]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim() && selectedGymId) {
        searchUsers();
      } else {
        setUsers([]);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedGymId]);

  const selectedCourseName = courses.find(c => c.id === selectedCourse)?.name || '';
  const selectedCourseCredits = courses.find(c => c.id === selectedCourse)?.credits_required || 1;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="enrollment" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="enrollment">
            <UserPlus className="w-4 h-4 mr-2" />
            Iscrizione Corsi
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <CreditCard className="w-4 h-4 mr-2" />
            Gestione Abbonamenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enrollment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Iscrivi Nuovo Partecipante
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <Label>Seleziona Corso</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Scegli un corso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.name} ({course.credits_required} crediti)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Search */}
              {selectedCourse && (
                <div className="space-y-2">
                  <Label>Cerca Utente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cerca per nome, cognome o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Search Results */}
              {loading && selectedCourse && (
                <div className="text-center py-4 text-muted-foreground">
                  Ricerca in corso...
                </div>
              )}

              {users.length > 0 && selectedCourse && (
                <div className="space-y-2">
                  <Label>Risultati Ricerca</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              variant={user.current_credits >= selectedCourseCredits ? "default" : "destructive"}
                            >
                              {user.current_credits} crediti
                            </Badge>
                            {user.subscription ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                {user.subscription.plan_name}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Nessun abbonamento</Badge>
                            )}
                            {!user.subscription && user.current_credits < selectedCourseCredits && (
                              <Badge variant="outline" className="text-destructive">
                                Crediti insufficienti
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected User Info */}
              {selectedUser && selectedCourse && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          Utente Selezionato: {selectedUser.first_name} {selectedUser.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Corso: {selectedCourseName} ({selectedCourseCredits} crediti richiesti)
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant={selectedUser.current_credits >= selectedCourseCredits ? "default" : "destructive"}>
                          {selectedUser.current_credits} crediti disponibili
                        </Badge>
                        {selectedUser.subscription && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                            Abbonamento: {selectedUser.subscription.plan_name}
                            {selectedUser.subscription.unlimited_access && " (Illimitato)"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Course Sessions */}
          {selectedUser && selectedCourse && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Sessioni Disponibili - {selectedCourseName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sessions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nessuna sessione programmata per questo corso
                    </p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex justify-between items-center p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <p className="font-medium">
                            {format(new Date(session.session_date), 'EEEE dd MMMM yyyy', { locale: it })}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {session.start_time} - {session.end_time}
                            </span>
                            {session.room_name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {session.room_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {session.available_spots} / {session.max_participants} posti
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => enrollUser(session.id, selectedUser.id)}
                          disabled={
                            session.available_spots <= 0 || 
                            enrolling === session.id || 
                            (!selectedUser.subscription?.unlimited_access && selectedUser.current_credits < selectedCourseCredits)
                          }
                          size="sm"
                        >
                          {enrolling === session.id ? 'Iscrivendo...' : 'Iscrivi'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gestione Abbonamenti Utenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User Search for Subscriptions */}
              <div className="space-y-2">
                <Label>Cerca Utente per Gestire Abbonamento</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome, cognome o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Search Results for Subscriptions */}
              {loading && (
                <div className="text-center py-4 text-muted-foreground">
                  Ricerca in corso...
                </div>
              )}

              {users.length > 0 && (
                <div className="space-y-2">
                  <Label>Risultati Ricerca</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedUser?.id === user.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">
                              {user.first_name} {user.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.phone && (
                              <p className="text-xs text-muted-foreground">{user.phone}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">
                              {user.current_credits} crediti
                            </Badge>
                            {user.subscription ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                {user.subscription.plan_name}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600 border-orange-200">
                                Nessun abbonamento
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected User Subscription Management */}
              {selectedUser && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Gestione Abbonamento - {selectedUser.first_name} {selectedUser.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                       <div className="flex-1">
                         <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                         <p className="font-medium">Crediti disponibili: {selectedUser.current_credits}</p>
                         {selectedUser.subscription ? (
                           <div className="mt-2">
                             <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                               Abbonamento attivo: {selectedUser.subscription.plan_name}
                             </Badge>
                             <p className="text-xs text-muted-foreground mt-1">
                               Scade il: {format(new Date(selectedUser.subscription.expires_at), 'dd/MM/yyyy', { locale: it })}
                             </p>
                             {selectedUser.subscription.unlimited_access && (
                               <Badge variant="outline" className="text-green-600 border-green-200 mt-1">
                                 Accesso illimitato
                               </Badge>
                             )}
                           </div>
                         ) : (
                           <Badge variant="outline" className="text-orange-600 border-orange-200 mt-2">
                             Nessun abbonamento attivo
                           </Badge>
                         )}
                       </div>
                       <div className="flex gap-2">
                         <Button
                           onClick={() => refreshUserData(selectedUser.id)}
                           variant="outline"
                           size="sm"
                         >
                           <Settings className="w-4 h-4 mr-1" />
                           Aggiorna
                         </Button>
                       </div>
                     </div>

                     {/* Debug Information */}
                     <details className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                       <summary className="cursor-pointer font-medium">Debug Info (Clicca per espandere)</summary>
                       <div className="mt-2 space-y-1">
                         <p>User ID: {selectedUser.id}</p>
                         <p>Gym ID: {selectedGymId}</p>
                         <p>Has Subscription: {selectedUser.subscription ? 'Sì' : 'No'}</p>
                         {selectedUser.subscription && (
                           <>
                             <p>Subscription ID: {selectedUser.subscription.id}</p>
                             <p>Plan: {selectedUser.subscription.plan_name}</p>
                             <p>Expires: {selectedUser.subscription.expires_at}</p>
                             <p>Unlimited: {selectedUser.subscription.unlimited_access ? 'Sì' : 'No'}</p>
                           </>
                         )}
                         <p>Available Plans: {subscriptionPlans.length}</p>
                       </div>
                     </details>

                     {/* Subscription Plans */}
                     <div className="space-y-3">
                       <div className="flex items-center justify-between">
                         <Label>Gestione Abbonamenti</Label>
                         {selectedUser.subscription && (
                           <Badge variant="outline" className="text-blue-600">
                             Utente già abbonato
                           </Badge>
                         )}
                       </div>
                       
                       {subscriptionPlans.length > 0 ? (
                         <div className="grid gap-3">
                           {subscriptionPlans.map((plan) => (
                             <div
                               key={plan.id}
                               className="flex items-center justify-between p-3 border rounded-lg bg-white/50"
                             >
                               <div>
                                 <p className="font-medium">{plan.name}</p>
                                 <p className="text-sm text-muted-foreground">{plan.description}</p>
                                 <p className="text-xs text-muted-foreground">
                                   Durata: {plan.duration_days} giorni - €{plan.price}
                                   {plan.unlimited_access && ' - Accesso illimitato'}
                                 </p>
                               </div>
                               <Button
                                 onClick={() => activateSubscription(selectedUser.id, plan.id)}
                                 disabled={activatingSubscription || (selectedUser.subscription?.unlimited_access && plan.unlimited_access)}
                                 size="sm"
                                 variant={selectedUser.subscription ? "outline" : "default"}
                               >
                                 {activatingSubscription ? 'Attivando...' : 
                                  selectedUser.subscription ? 'Sostituisci' : 'Attiva'}
                               </Button>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="text-center py-4 text-muted-foreground">
                           <p>Nessun piano abbonamento disponibile per questa palestra</p>
                           <p className="text-xs">Contatta l'amministratore per configurare i piani</p>
                         </div>
                       )}
                     </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};