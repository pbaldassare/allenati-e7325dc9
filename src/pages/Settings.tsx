import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, User, Shield, Bell, Heart, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const profileSchema = z.object({
  first_name: z.string().min(1, "Nome richiesto"),
  last_name: z.string().min(1, "Cognome richiesto"),
  phone: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  fiscal_code: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  bio: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
});

const accountSchema = z.object({
  email: z.string().email("Email non valida"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  newPassword: z.string().min(6, "Password deve essere almeno 6 caratteri"),
  confirmPassword: z.string().min(6, "Password deve essere almeno 6 caratteri"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

type ProfileData = z.infer<typeof profileSchema>;
type AccountData = z.infer<typeof accountSchema>;
type PasswordData = z.infer<typeof passwordSchema>;

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      phone: "",
      city: "",
      address: "",
      postal_code: "",
      fiscal_code: "",
      date_of_birth: "",
      gender: "",
      bio: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
    },
  });

  const accountForm = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      email: user?.email || "",
    },
  });

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Fetch preferences
      const { data: prefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;

      // Create profile if it doesn't exist
      if (!profile) {
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            first_name: user.first_name || '',
            last_name: user.last_name || '',
          })
          .select()
          .single();

        if (createProfileError) throw createProfileError;
        setProfileData(newProfile);
      } else {
        setProfileData(profile);
      }

      // Create preferences if they don't exist
      if (!prefs) {
        const { data: newPrefs, error: createPrefsError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (createPrefsError) throw createPrefsError;
        setPreferences(newPrefs);
      } else {
        setPreferences(prefs);
      }

      // Use the fetched data directly to update forms
      const currentProfile = profile || profileData;
      const currentPrefs = prefs || preferences;
      
      if (currentProfile) {
        profileForm.reset({
          first_name: currentProfile.first_name || "",
          last_name: currentProfile.last_name || "",
          phone: currentProfile.phone || "",
          city: currentProfile.city || "",
          address: currentProfile.address || "",
          postal_code: currentProfile.postal_code || "",
          fiscal_code: currentProfile.fiscal_code || "",
          date_of_birth: currentProfile.date_of_birth || "",
          gender: currentProfile.gender || "",
          bio: currentProfile.bio || "",
          emergency_contact_name: currentProfile.emergency_contact_name || "",
          emergency_contact_phone: currentProfile.emergency_contact_phone || "",
        });
      }

      accountForm.reset({
        email: user.email || "",
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati utente",
        variant: "destructive",
      });
    }
  };

  const onProfileSubmit = async (data: ProfileData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) throw error;

      await updateUser({
        first_name: data.first_name,
        last_name: data.last_name,
      });

      // Refresh data from database
      await fetchUserData();

      toast({
        title: "Successo",
        description: "Profilo aggiornato con successo",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il profilo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onAccountSubmit = async (data: AccountData) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
      });

      if (error) throw error;

      // Small delay to ensure database is updated, then refresh data
      setTimeout(async () => {
        await fetchUserData();
        console.log('Email updated and data refreshed');
      }, 100);

      toast({
        title: "Successo",
        description: "Email aggiornata con successo",
      });
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'email",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) throw error;

      passwordForm.reset();

      // Small delay to ensure database is updated, then refresh data
      setTimeout(async () => {
        await fetchUserData();
        console.log('Password updated and data refreshed');
      }, 100);
      
      toast({
        title: "Successo",
        description: "Password aggiornata con successo",
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh data from database
      await fetchUserData();

      toast({
        title: "Successo",
        description: "Avatar aggiornato con successo",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'avatar",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh data from database
      await fetchUserData();

      toast({
        title: "Successo",
        description: "Preferenza aggiornata",
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le preferenze",
        variant: "destructive",
      });
    }
  };

  const userInitials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}` : '';

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <header className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/')}
          className="mr-3"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-space font-bold">Impostazioni</h1>
      </header>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profilo
            </CardTitle>
            <CardDescription>
              Gestisci le tue informazioni personali
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profileData?.profile_picture_url} />
                <AvatarFallback className="text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadingAvatar ? 'Caricamento...' : 'Cambia foto'}
                </Button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
            </div>

            <Separator />

            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="date_of_birth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data di nascita</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={profileForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CAP</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={profileForm.control}
                  name="fiscal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice Fiscale</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salva profilo'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Contatto di emergenza
            </CardTitle>
            <CardDescription>
              Persona da contattare in caso di emergenza
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="emergency_contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome contatto</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="emergency_contact_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono contatto</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>
              Gestisci email e password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="space-y-4">
                <FormField
                  control={accountForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Aggiorna email'}
                </Button>
              </form>
            </Form>

            <Separator />

            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password attuale</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuova password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Cambia password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Preferenze
            </CardTitle>
            <CardDescription>
              Personalizza la tua esperienza
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Tema</div>
                <div className="text-sm text-muted-foreground">
                  Scegli il tema dell'app
                </div>
              </div>
              <ThemeToggle />
            </div>

            <Separator />

            {preferences && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Notifiche</div>
                    <div className="text-sm text-muted-foreground">
                      Ricevi notifiche dall'app
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notifications_enabled}
                    onCheckedChange={(checked) => updatePreference('notifications_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Notifiche prenotazioni</div>
                    <div className="text-sm text-muted-foreground">
                      Ricevi promemoria per le tue prenotazioni
                    </div>
                  </div>
                  <Switch
                    checked={preferences.push_bookings}
                    onCheckedChange={(checked) => updatePreference('push_bookings', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Notifiche promozioni</div>
                    <div className="text-sm text-muted-foreground">
                      Ricevi offerte e promozioni
                    </div>
                  </div>
                  <Switch
                    checked={preferences.push_promotions}
                    onCheckedChange={(checked) => updatePreference('push_promotions', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Check-in automatico</div>
                    <div className="text-sm text-muted-foreground">
                      Effettua automaticamente il check-in
                    </div>
                  </div>
                  <Switch
                    checked={preferences.auto_checkin}
                    onCheckedChange={(checked) => updatePreference('auto_checkin', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;