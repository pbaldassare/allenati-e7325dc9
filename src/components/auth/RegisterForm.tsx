import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, Building2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GymApplicationForm } from '@/components/GymApplicationForm';
import { useToast } from '@/hooks/use-toast';
import { MinorGuardianModal } from '@/components/auth/MinorGuardianModal';
import { useCategoriesWithMain } from '@/hooks/useCategoriesWithMain';
import { validateEmailDomain, createEmailValidator, type EmailValidationResult } from '@/lib/emailValidation';

interface Gym {
  id: string;
  name: string;
  city: string;
}

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onShowGymApplication?: (show: boolean) => void;
}

type ExistingAccountCheck = {
  exists?: boolean;
  email_exists?: boolean;
  fiscal_code_exists?: boolean;
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onShowGymApplication }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    fiscalCode: '',
    gymId: '',
    belt: 'Nessuna',
    guardianFirstName: '',
    guardianLastName: '',
    guardianPhone: '',
    privacyAccepted: false,
  });
  const [error, setError] = useState('');
  const [errorIsExistingAccount, setErrorIsExistingAccount] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [showGymApplication, setShowGymApplication] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [isGuardianModalOpen, setIsGuardianModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState('+39');
  const { register } = useAuth();
  const { toast } = useToast();
  const [shouldShowBelt, setShouldShowBelt] = useState(false);
  const { categories } = useCategoriesWithMain(formData.gymId, Boolean(formData.gymId));

  const [gymsLoading, setGymsLoading] = useState(true);
  const [emailValidation, setEmailValidation] = useState<EmailValidationResult>({ isValid: true });
  const [emailValidator] = useState(() => createEmailValidator(setEmailValidation));

  const checkExistingAccount = async (email: string, fiscalCode: string): Promise<ExistingAccountCheck> => {
    const { data, error } = await (supabase as any).rpc('check_registration_account_exists', {
      _email: email.trim().toLowerCase(),
      _fiscal_code: fiscalCode.trim().toUpperCase(),
    });

    if (error) {
      console.warn('Existing account pre-check failed:', error);
      return { exists: false };
    }

    return data ?? { exists: false };
  };

  useEffect(() => {
    loadGyms();
  }, []);

  useEffect(() => {
    onShowGymApplication?.(showGymApplication);
  }, [showGymApplication, onShowGymApplication]);

  useEffect(() => {
    if (formData.gymId && categories.length > 0) {
      const selectedGymCategories = categories.filter(cat => cat.gym_id === formData.gymId);
      const hasMartialArts = selectedGymCategories.some(cat => 
        cat.main_categories?.requires_belt === true
      );
      setShouldShowBelt(hasMartialArts);
      
      // Reset belt to "Nessuna" if martial arts not available
      if (!hasMartialArts) {
        setFormData(prev => ({ ...prev, belt: 'Nessuna' }));
      }
    } else {
      setShouldShowBelt(false);
      setFormData(prev => ({ ...prev, belt: 'Nessuna' }));
    }
  }, [formData.gymId, categories]);

  const loadGyms = async () => {
    setGymsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('id, name, city')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      const gymsList = data || [];
      setGyms(gymsList);
      
      // Auto-preselect if only one gym is available
      if (gymsList.length === 1) {
        setFormData(prev => ({ ...prev, gymId: gymsList[0].id }));
      }
    } catch (error) {
      console.error('Error loading gyms:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare le palestre disponibili",
        variant: "destructive",
      });
    } finally {
      setGymsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorIsExistingAccount(false);
    
    // Validazione accettazione privacy
    if (!formData.privacyAccepted) {
      setError("Devi accettare l'Informativa sulla Privacy per registrarti");
      toast({
        title: "Attenzione",
        description: "Devi accettare l'Informativa sulla Privacy per registrarti",
        variant: "destructive",
      });
      return;
    }
    
    // Validazione dominio email
    const emailDomainResult = validateEmailDomain(formData.email);
    if (!emailDomainResult.isValid) {
      setError(emailDomainResult.suggestion 
        ? `${emailDomainResult.error}. ${emailDomainResult.suggestion}` 
        : emailDomainResult.error || 'Dominio email non valido'
      );
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Il numero di telefono è obbligatorio');
      return;
    }

    if (!formData.fiscalCode.trim()) {
      setError('Il codice fiscale è obbligatorio');
      return;
    }

    // Validazione formato codice fiscale (16 caratteri alfanumerici)
    const fiscalCodeRegex = /^[A-Z0-9]{16}$/i;
    if (!fiscalCodeRegex.test(formData.fiscalCode.trim())) {
      setError('Il codice fiscale deve essere di 16 caratteri alfanumerici');
      return;
    }

    // Validazione formato telefono italiano
    const phoneRegex = /^(\+39|0039|\+390)?[\s\-]?3[0-9]{2}[\s\-]?[0-9]{3}[\s\-]?[0-9]{3,4}$/;
    if (!phoneRegex.test(formData.phone.trim().replace(/\s/g, ''))) {
      setError('Inserisci un numero di telefono italiano valido (es: +39 333 123 4567)');
      return;
    }

    if (!formData.gymId) {
      setError('Devi selezionare una palestra');
      return;
    }

    if (isMinor && (!formData.guardianFirstName || !formData.guardianLastName || !formData.guardianPhone)) {
      setError('Per i minorenni è necessario indicare nome, cognome e cellulare del genitore/tutore');
      return;
    }

    setIsLoading(true);

    try {
      const existingAccount = await checkExistingAccount(formData.email, formData.fiscalCode);

      if (existingAccount.exists) {
        setErrorIsExistingAccount(true);
        setError(
          existingAccount.fiscal_code_exists
            ? 'Account già esistente con questo codice fiscale. Effettua il login o recupera la password.'
            : 'Email già registrata. Effettua il login o recupera la password.'
        );
        return;
      }

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
            fiscal_code: formData.fiscalCode.toUpperCase(),
            selected_gym_id: formData.gymId,
            belt: formData.belt || 'Nessuna',
            privacy_accepted: true,
            privacy_version: '1.0',
            ...(isMinor
              ? {
                  is_minor: true,
                  guardian_first_name: formData.guardianFirstName,
                  guardian_last_name: formData.guardianLastName,
                  guardian_phone: formData.guardianPhone,
                }
              : { is_minor: false }),
          }
        }
      });

      if (registerError) throw registerError;

      // Gym membership will be created automatically by the database trigger

      toast({
        title: "Registrazione completata!",
        description: "Account creato con successo. Ora puoi accedere.",
      });

      // Reset form and switch to login
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        fiscalCode: '',
        gymId: '',
        belt: 'Nessuna',
        guardianFirstName: '',
        guardianLastName: '',
        guardianPhone: '',
        privacyAccepted: false,
      });
      setIsMinor(false);
      setIsGuardianModalOpen(false);
      
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg = (err?.message || '').toLowerCase();
      const fallbackExistingAccount = msg.includes('database error saving new user')
        ? await checkExistingAccount(formData.email, formData.fiscalCode)
        : { exists: false };
      const isExisting =
        fallbackExistingAccount.exists ||
        msg.includes('user already registered') ||
        msg.includes('already been registered') ||
        msg.includes('database error saving new user') ||
        (msg.includes('duplicate key') && msg.includes('fiscal_code')) ||
        (msg.includes('duplicate key') && msg.includes('profiles_user_id_key')) ||
        msg.includes('email_exists');

      if (isExisting) {
        setErrorIsExistingAccount(true);
        setError(
          fallbackExistingAccount.fiscal_code_exists
            ? 'Account già esistente con questo codice fiscale. Effettua il login o recupera la password.'
            : 'Account già esistente. Effettua il login o recupera la password.'
        );
      } else if (msg.includes('password should be at least 6 characters')) {
        setErrorIsExistingAccount(false);
        setError('La password deve essere di almeno 6 caratteri');
      } else if (msg.includes('invalid email')) {
        setErrorIsExistingAccount(false);
        setError('Formato email non valido');
      } else {
        setErrorIsExistingAccount(false);
        setError(err.message || 'Errore durante la registrazione');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Note: We don't return early here anymore to keep the layout consistent

  return (
    <Card className={`w-full ${showGymApplication ? 'max-w-2xl' : 'max-w-md'} mx-auto`}>
      <CardHeader className="space-y-1">
        {!showGymApplication && (
          <div className="flex flex-col items-center space-y-4 mb-2">
            <img 
              src="/lovable-uploads/f1aff50e-632e-46e0-b09f-145c702dc0be.png" 
              alt="Allenati Sport Logo" 
              className="h-24 sm:h-20 w-auto"
            />
          </div>
        )}
        <CardTitle className="text-4xl sm:text-3xl font-bold text-center">
          {showGymApplication ? 'Candidatura Palestra' : 'Registrazione'}
        </CardTitle>
        <CardDescription className="text-center text-base sm:text-sm">
          {showGymApplication 
            ? 'Compila il modulo per candidarti come proprietario di una palestra' 
            : 'Crea il tuo account per iniziare'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showGymApplication ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                onClick={() => setShowGymApplication(false)}
                size="sm"
              >
                ← Torna alla registrazione
              </Button>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-primary font-medium hover:underline text-sm"
              >
                Hai già un account? Accedi
              </button>
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
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="space-y-2">
                    <p>{error}</p>
                    {errorIsExistingAccount && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onSwitchToLogin}
                        className="mt-1"
                      >
                        Vai al login
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-2 gap-3 sm:gap-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-lg sm:text-base">Nome *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Mario"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="h-14 sm:h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-lg sm:text-base">Cognome *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Rossi"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="h-14 sm:h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-lg sm:text-base">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mario.rossi@email.com"
                  value={formData.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    setFormData({ ...formData, email });
                    emailValidator(email);
                  }}
                  required
                  className={`h-14 sm:h-12 text-base ${
                    emailValidation.isValid === false ? 'border-destructive focus:border-destructive' : ''
                  }`}
                />
                {emailValidation.isValid === false && (
                  <div className="flex items-start gap-2 mt-1 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                    <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-destructive">
                      <p>{emailValidation.error}</p>
                      {emailValidation.suggestion && (
                        <p className="font-medium mt-1">{emailValidation.suggestion}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-lg sm:text-base">Telefono *</Label>
                <div className="flex gap-2">
                  <select
                    value={phonePrefix}
                    onChange={(event) => setPhonePrefix(event.target.value)}
                    className="h-14 w-24 rounded-md border border-input bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:h-12"
                  >
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+34">🇪🇸 +34</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder={phonePrefix === '+39' ? '333 123 4567' : phonePrefix === '+1' ? '555 123 4567' : '123 456 789'}
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Auto-add prefix if not present
                      const fullPhone = value.startsWith(phonePrefix) ? value : `${phonePrefix} ${value}`;
                      setFormData({ ...formData, phone: fullPhone });
                    }}
                    required
                    className="flex-1 h-14 sm:h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fiscalCode" className="text-lg sm:text-base">Codice Fiscale *</Label>
                <Input
                  id="fiscalCode"
                  type="text"
                  placeholder="RSSMRA85M01H501Z"
                  value={formData.fiscalCode}
                  onChange={(e) => setFormData({ ...formData, fiscalCode: e.target.value.toUpperCase() })}
                  required
                   maxLength={16}
                   className="h-14 sm:h-12 text-base font-mono"
                />
              </div>

              {shouldShowBelt && (
                <div className="space-y-2">
                  <Label htmlFor="belt" className="text-lg sm:text-base">Cintura</Label>
                  <select
                    value={formData.belt}
                    onChange={(event) => setFormData({ ...formData, belt: event.target.value })}
                    className="h-14 w-full rounded-md border border-input bg-background px-3 text-base text-foreground transition-all duration-200 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:h-12"
                  >
                    <option value="Nessuna">🚫 Nessuna cintura</option>
                    <option value="Bianca">🥋 Bianca</option>
                    <option value="Blu">🥋 Blu</option>
                    <option value="Viola">🥋 Viola</option>
                    <option value="Marrone">🥋 Marrone</option>
                    <option value="Nera">🥋 Nera</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="gym" className="text-lg sm:text-base">Palestra *</Label>
                <select
                  value={formData.gymId}
                  onChange={(event) => setFormData({ ...formData, gymId: event.target.value })}
                  required
                  disabled={gymsLoading}
                  className="h-14 w-full rounded-md border border-input bg-background px-3 text-base text-foreground transition-all duration-200 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
                >
                  <option value="" disabled>
                    {gymsLoading
                      ? 'Caricamento palestre...'
                      : gyms.length === 0
                        ? 'Nessuna palestra disponibile'
                        : 'Seleziona la tua palestra'}
                  </option>
                  {gyms.map((gym) => (
                    <option key={gym.id} value={gym.id}>
                      {gym.name} — {gym.city}
                    </option>
                  ))}
                </select>
                {gyms.length === 0 && !gymsLoading && (
                  <div className="p-3 border border-dashed border-muted-foreground/20 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground text-center">
                      <Building2 className="h-4 w-4 inline mr-1" />
                      Non ci sono palestre disponibili al momento. 
                      <br />
                      Puoi candidarti come proprietario di palestra qui sotto.
                    </p>
                  </div>
                )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="isMinor"
                      checked={isMinor}
                      onCheckedChange={(checked) => {
                        const value = Boolean(checked);
                        setIsMinor(value);
                        if (value && (!formData.guardianFirstName || !formData.guardianLastName || !formData.guardianPhone)) {
                          setIsGuardianModalOpen(true);
                        }
                      }}
                    />
                    <div className="grid gap-1">
                      <Label htmlFor="isMinor" className="text-lg sm:text-base">Hai meno di 16 anni?</Label>
                      {isMinor && (
                        <div className="text-sm text-muted-foreground">
                          {formData.guardianFirstName && formData.guardianLastName && formData.guardianPhone ? (
                            <div className="flex items-center gap-2">
                              <span>
                                Dati genitore/tutore: {formData.guardianFirstName} {formData.guardianLastName} - {formData.guardianPhone}
                              </span>
                              <button
                                type="button"
                                className="text-primary font-medium hover:underline"
                                onClick={() => setIsGuardianModalOpen(true)}
                              >
                                Modifica
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-primary font-medium hover:underline"
                              onClick={() => setIsGuardianModalOpen(true)}
                            >
                              Inserisci i dati del genitore/tutore richiesti
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-lg sm:text-base">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caratteri"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-14 sm:h-12 text-base pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-lg sm:text-base">Conferma Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ripeti la password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-14 sm:h-12 text-base pr-12"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Privacy Checkbox */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="privacy"
                    checked={formData.privacyAccepted}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, privacyAccepted: checked as boolean })
                    }
                    required
                    className="mt-1"
                  />
                  <label
                    htmlFor="privacy"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Ho letto e accetto l'
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Informativa sulla Privacy
                    </a>
                    <span className="text-destructive ml-1">*</span>
                  </label>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-primary"
                disabled={isLoading || !formData.privacyAccepted}
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

            <MinorGuardianModal
              open={isGuardianModalOpen}
              onClose={() => setIsGuardianModalOpen(false)}
              values={{
                firstName: formData.guardianFirstName,
                lastName: formData.guardianLastName,
                phone: formData.guardianPhone,
              }}
              onSave={(vals) => {
                setFormData((prev) => ({
                  ...prev,
                  guardianFirstName: vals.firstName,
                  guardianLastName: vals.lastName,
                  guardianPhone: vals.phone,
                }));
                setIsGuardianModalOpen(false);
              }}
            />

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
          </>
        )}
      </CardContent>
    </Card>
  );
};