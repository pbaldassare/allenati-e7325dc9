import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GymApplicationForm } from '@/components/GymApplicationForm';
import { useToast } from '@/hooks/use-toast';

interface Gym {
  id: string;
  name: string;
  city: string;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    gymId: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [showGymApplication, setShowGymApplication] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadGyms();
  }, []);

  const loadGyms = async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, city')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setGyms(data || []);
    } catch (error) {
      console.error('Error loading gyms:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (!formData.gymId) {
      setError('Devi selezionare una palestra');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Register the user
      const { data: authData, error: registerError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
          }
        }
      });

      if (registerError) throw registerError;

      if (authData.user) {
        // Create gym membership
        const { error: membershipError } = await supabase
          .from('user_gym_memberships')
          .insert({
            user_id: authData.user.id,
            gym_id: formData.gymId,
            membership_type: 'member',
            status: 'active',
          });

        if (membershipError) {
          console.error('Error creating gym membership:', membershipError);
        }
      }

      toast({
        title: "Registrazione completata!",
        description: "Controlla la tua email per confermare l'account.",
      });

      // Reset form and switch to login
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        gymId: '',
      });
      
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.message?.includes('User already registered')) {
        setError('Un utente con questa email è già registrato');
      } else if (err.message?.includes('Password should be at least 6 characters')) {
        setError('La password deve essere di almeno 6 caratteri');
      } else if (err.message?.includes('Invalid email')) {
        setError('Formato email non valido');
      } else {
        setError(err.message || 'Errore durante la registrazione');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showGymApplication) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-4">
          <Button 
            variant="outline" 
            onClick={() => setShowGymApplication(false)}
          >
            ← Torna alla registrazione
          </Button>
        </div>
        <GymApplicationForm 
          onSuccess={() => {
            setShowGymApplication(false);
            toast({
              title: "Candidatura inviata!",
              description: "La tua candidatura è stata inviata con successo. Verrai contattato appena sarà valutata.",
            });
          }}
        />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Registrazione
        </CardTitle>
        <CardDescription className="text-center">
          Crea il tuo account per iniziare
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="Mario"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Cognome *</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Rossi"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="mario.rossi@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefono</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+39 123 456 7890"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gym">Palestra *</Label>
            <Select
              value={formData.gymId}
              onValueChange={(value) => setFormData({ ...formData, gymId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona la tua palestra" />
              </SelectTrigger>
              <SelectContent>
                {gyms.map((gym) => (
                  <SelectItem key={gym.id} value={gym.id}>
                    {gym.name} - {gym.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimo 6 caratteri"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Ripeti la password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrazione...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Registrati
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                oppure
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-white"
            onClick={() => setShowGymApplication(true)}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Candidati come Proprietario di Palestra
          </Button>
        </div>

        <div className="mt-4 text-center text-sm">
          <span className="text-muted-foreground">Hai già un account?</span>{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-primary font-medium hover:underline"
          >
            Accedi
          </button>
        </div>
      </CardContent>
    </Card>
  );
};