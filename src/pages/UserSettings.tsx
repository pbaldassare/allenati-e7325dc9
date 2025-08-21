import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Camera, User, AlertTriangle } from 'lucide-react';
import DeleteAccountDialog from '@/components/dialogs/DeleteAccountDialog';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Nome è obbligatorio').max(50, 'Nome troppo lungo'),
  last_name: z.string().min(1, 'Cognome è obbligatorio').max(50, 'Cognome troppo lungo'),
  nickname: z.string().optional().refine(val => !val || val.length >= 2, {
    message: 'Nickname deve avere almeno 2 caratteri'
  }),
  phone: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  fiscal_code: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  bio: z.string().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function UserSettings() {
  const { user, fetchUserData, isAdmin, isGymOwner, isInstructor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Redirect automatico da /impostazioni alle route specifiche per ruolo
  useEffect(() => {
    if (location.pathname === '/impostazioni') {
      if (isAdmin) {
        navigate('/admin/settings', { replace: true });
        return;
      } else if (isGymOwner) {
        navigate('/owner/settings', { replace: true });
        return;
      } else if (isInstructor) {
        navigate('/instructor/settings', { replace: true });
        return;
      }
    }
  }, [location.pathname, isAdmin, isGymOwner, isInstructor, navigate]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      nickname: '',
      phone: '',
      gender: '',
      date_of_birth: '',
      address: '',
      city: '',
      postal_code: '',
      fiscal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      bio: ''
    }
  });

  // Carica i dati del profilo al mount
  useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        nickname: user.nickname || '',
        phone: user.phone || '',
        gender: user.gender || '',
        date_of_birth: user.date_of_birth || '',
        address: user.address || '',
        city: user.city || '',
        postal_code: user.postal_code || '',
        fiscal_code: user.fiscal_code || '',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        bio: user.bio || ''
      });
      setAvatarUrl(user.profile_picture_url);
    }
  }, [user, form]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validazioni file
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Errore',
        description: 'Il file è troppo grande. Massimo 5MB.',
        variant: 'destructive'
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Errore',
        description: 'Seleziona un\'immagine valida.',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await fetchUserData();

      toast({
        title: 'Successo',
        description: 'Avatar aggiornato con successo!'
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante il caricamento dell\'avatar.',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          nickname: data.nickname || null,
          phone: data.phone || null,
          gender: data.gender || null,
          date_of_birth: data.date_of_birth || null,
          address: data.address || null,
          city: data.city || null,
          postal_code: data.postal_code || null,
          fiscal_code: data.fiscal_code || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_phone: data.emergency_contact_phone || null,
          bio: data.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchUserData();

      toast({
        title: 'Successo',
        description: 'Profilo aggiornato con successo!'
      });

      navigate('/');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante l\'aggiornamento del profilo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-40 md:pb-20">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                // Determina la destinazione in base al ruolo e al percorso corrente
                const currentPath = location.pathname;
                
                let destination = '/';
                
                if (currentPath.startsWith('/admin/settings') && isAdmin) {
                  destination = '/admin';
                } else if (currentPath.startsWith('/owner/settings') && isGymOwner) {
                  destination = '/owner';
                } else if (currentPath.startsWith('/instructor/settings') && isInstructor) {
                  destination = '/instructor';
                } else if (currentPath === '/impostazioni') {
                  // Gestisci il caso dell'utente sulla route globale /impostazioni
                  if (isInstructor) {
                    destination = '/instructor';
                  } else if (isGymOwner) {
                    destination = '/owner';
                  } else if (isAdmin) {
                    destination = '/admin';
                  } else {
                    destination = '/';
                  }
                } else if (window.history.length > 1) {
                  navigate(-1);
                  return;
                }
                
                navigate(destination, { replace: true });
              } catch (error) {
                console.error('Errore nella navigazione:', error);
                navigate('/', { replace: true });
              }
            }}
            className="flex items-center gap-2 w-fit min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna indietro
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Impostazioni Profilo</h1>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <p className="text-muted-foreground text-sm">
              Gestisci le tue informazioni personali e le preferenze dell'account.
            </p>
          </div>

        {/* Avatar Section */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Foto Profilo</CardTitle>
            <CardDescription className="text-sm">
              Carica la tua foto profilo. Formati supportati: JPG, PNG. Massimo 5MB.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="relative">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={avatarUrl || undefined} alt="Foto profilo" />
                  <AvatarFallback className="text-xl sm:text-2xl">
                    <User className="h-6 w-6 sm:h-8 sm:w-8" />
                  </AvatarFallback>
                </Avatar>
                <label className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-sm sm:text-base">Cambia foto profilo</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Clicca sull'icona della camera per caricare una nuova foto
                </p>
                {uploading && (
                  <p className="text-xs sm:text-sm text-blue-600 flex items-center gap-2 justify-center sm:justify-start mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Caricamento in corso...
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Informazioni Personali</CardTitle>
            <CardDescription className="text-sm">
              Aggiorna le tue informazioni personali e di contatto.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                 {/* Nome e Cognome */}
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Il tuo nome" className="h-12 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Cognome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Il tuo cognome" className="h-12 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Nickname */}
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Nickname</FormLabel>
                      <FormControl>
                        <Input placeholder="Come vuoi essere chiamato" className="h-12 sm:h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Telefono e Genere */}
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 123 456 7890" className="h-12 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Genere</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 sm:h-11">
                              <SelectValue placeholder="Seleziona genere" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Maschio</SelectItem>
                            <SelectItem value="female">Femmina</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                            <SelectItem value="prefer_not_to_say">Preferisco non dire</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Data di nascita */}
                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Data di nascita</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 sm:h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Indirizzo */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Indirizzo</FormLabel>
                      <FormControl>
                        <Input placeholder="Via, numero civico" className="h-12 sm:h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Città e CAP */}
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Città</FormLabel>
                        <FormControl>
                          <Input placeholder="La tua città" className="h-12 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">CAP</FormLabel>
                        <FormControl>
                          <Input placeholder="12345" className="h-12 sm:h-11" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Codice Fiscale */}
                <FormField
                  control={form.control}
                  name="fiscal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Codice Fiscale</FormLabel>
                      <FormControl>
                        <Input placeholder="RSSMRA80A01H501X" className="h-12 sm:h-11" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contatto di emergenza */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-medium">Contatto di Emergenza</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="emergency_contact_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Nome contatto emergenza</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome del contatto" className="h-12 sm:h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergency_contact_phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Telefono contatto emergenza</FormLabel>
                          <FormControl>
                            <Input placeholder="+39 123 456 7890" className="h-12 sm:h-11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Bio */}
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Bio</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Racconta qualcosa di te..." 
                          className="min-h-[100px] text-sm"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 {/* Submit Button */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-4 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/')}
                    className="w-full sm:w-auto h-12 sm:h-11 min-h-[44px]"
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12 sm:h-11 min-h-[44px]">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salva Modifiche
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/20">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
              <CardTitle className="text-destructive text-base sm:text-lg">Zona Pericolo</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Azioni irreversibili che comportano la perdita permanente dei dati.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive text-sm sm:text-base">Elimina Account</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Elimina definitivamente il tuo account e tutti i dati associati. 
                    Questa azione non può essere annullata.
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                    <li>Tutti i crediti residui verranno persi</li>
                    <li>Gli abbonamenti attivi verranno cancellati</li>
                    <li>Verrai rimosso da tutte le palestre e chat</li>
                    <li>I dati personali verranno eliminati definitivamente</li>
                  </ul>
                </div>
                <div className="pt-3">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="min-h-[44px] text-sm"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Elimina Account
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Delete Account Dialog */}
        <DeleteAccountDialog 
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
        />
      </div>
    </div>
  );
}