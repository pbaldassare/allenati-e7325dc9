import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Key, 
  Shield,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface GymStripeData {
  id: string;
  name: string;
  stripe_secret_key: string | null;
  stripe_publishable_key: string | null;
  stripe_credentials_configured: boolean;
}

const OwnerStripeSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gym, setGym] = useState<GymStripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  
  const [formData, setFormData] = useState({
    secretKey: '',
    publishableKey: ''
  });

  useEffect(() => {
    document.title = 'Configurazione Stripe | Gym Manager';
    loadGymData();
  }, []);

  const loadGymData = async () => {
    try {
      if (!user) return;

      // Get user's gym
      const { data: membership } = await supabase
        .from('user_gym_memberships')
        .select('gym_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .eq('membership_type', 'owner')
        .single();

      if (!membership) {
        toast({
          title: "Errore",
          description: "Nessuna palestra trovata per questo proprietario",
          variant: "destructive",
        });
        return;
      }

      // Get gym with Stripe data
      const { data: gymData, error } = await supabase
        .from('gyms')
        .select(`
          id, 
          name, 
          stripe_secret_key,
          stripe_publishable_key,
          stripe_credentials_configured
        `)
        .eq('id', membership.gym_id)
        .single();

      if (error) throw error;
      setGym(gymData);
      
      // Populate form if credentials exist
      if (gymData.stripe_secret_key && gymData.stripe_publishable_key) {
        setFormData({
          secretKey: gymData.stripe_secret_key,
          publishableKey: gymData.stripe_publishable_key
        });
      }
    } catch (error) {
      console.error('Error loading gym data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della palestra",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testStripeCredentials = async () => {
    if (!formData.secretKey || !formData.publishableKey) {
      toast({
        title: "Errore",
        description: "Inserisci entrambe le chiavi Stripe",
        variant: "destructive",
      });
      return false;
    }

    setTesting(true);
    try {
      // Basic validation of key formats
      if (!formData.secretKey.startsWith('sk_')) {
        throw new Error('Secret Key deve iniziare con "sk_"');
      }
      
      if (!formData.publishableKey.startsWith('pk_')) {
        throw new Error('Publishable Key deve iniziare con "pk_"');
      }

      // TODO: Add actual Stripe API test call here if needed
      toast({
        title: "Successo",
        description: "Credenziali Stripe valide",
      });
      return true;
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Credenziali Stripe non valide",
        variant: "destructive",
      });
      return false;
    } finally {
      setTesting(false);
    }
  };

  const saveCredentials = async () => {
    if (!gym) return;

    const isValid = await testStripeCredentials();
    if (!isValid) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          stripe_secret_key: formData.secretKey,
          stripe_publishable_key: formData.publishableKey,
          stripe_credentials_configured: true
        })
        .eq('id', gym.id);

      if (error) throw error;

      setGym(prev => prev ? {
        ...prev,
        stripe_secret_key: formData.secretKey,
        stripe_publishable_key: formData.publishableKey,
        stripe_credentials_configured: true
      } : null);

      toast({
        title: "Successo",
        description: "Credenziali Stripe salvate correttamente",
      });
    } catch (error) {
      console.error('Error saving credentials:', error);
      toast({
        title: "Errore",
        description: "Impossibile salvare le credenziali",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Palestra non trovata</div>
      </div>
    );
  }

  const isConfigured = gym.stripe_credentials_configured && gym.stripe_secret_key && gym.stripe_publishable_key;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Configurazione Stripe
        </h1>
        <p className="text-muted-foreground">
          Configura le tue credenziali Stripe per accettare pagamenti
        </p>
      </div>

      {/* Status Alert */}
      <Alert variant={isConfigured ? "default" : "destructive"}>
        {isConfigured ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <div>
          <div className="font-medium">
            {isConfigured ? 'Credenziali configurate' : 'Credenziali mancanti'}
          </div>
          <AlertDescription className="mt-1">
            {isConfigured 
              ? 'Le tue credenziali Stripe sono configurate e pronte per accettare pagamenti.'
              : 'Configura le tue credenziali Stripe per iniziare ad accettare pagamenti per corsi e abbonamenti.'
            }
          </AlertDescription>
        </div>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Form */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Credenziali Stripe</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Chiavi API Stripe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="publishable-key">Publishable Key</Label>
                <Input
                  id="publishable-key"
                  placeholder="pk_test_..."
                  value={formData.publishableKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, publishableKey: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret-key">Secret Key</Label>
                <div className="relative">
                  <Input
                    id="secret-key"
                    type={showSecretKey ? "text" : "password"}
                    placeholder="sk_test_..."
                    value={formData.secretKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, secretKey: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={testStripeCredentials}
                  disabled={testing || !formData.secretKey || !formData.publishableKey}
                  variant="outline"
                  className="flex-1"
                >
                  {testing ? 'Testando...' : 'Testa Credenziali'}
                </Button>
                <Button
                  onClick={saveCredentials}
                  disabled={saving || !formData.secretKey || !formData.publishableKey}
                  className="flex-1"
                >
                  {saving ? 'Salvando...' : 'Salva Credenziali'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Information Panel */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Informazioni</h2>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Come ottenere le chiavi Stripe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>1. Crea un account Stripe</strong>
                <p className="text-muted-foreground">
                  Vai su stripe.com e crea un account per la tua palestra
                </p>
              </div>
              <div>
                <strong>2. Accedi al Dashboard</strong>
                <p className="text-muted-foreground">
                  Nel dashboard Stripe, vai su "Sviluppatori" → "Chiavi API"
                </p>
              </div>
              <div>
                <strong>3. Copia le chiavi</strong>
                <p className="text-muted-foreground">
                  Copia la "Publishable key" e la "Secret key" e incollale qui
                </p>
              </div>
              <div>
                <strong>4. Modalità Test vs Live</strong>
                <p className="text-muted-foreground">
                  Usa le chiavi "test" per sviluppo e "live" per produzione
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Cards */}
          {isConfigured && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Funzionalità Abilitate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Pagamenti per corsi e lezioni</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Vendita abbonamenti</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Acquisto crediti</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Gestione completa pagamenti</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerStripeSetup;