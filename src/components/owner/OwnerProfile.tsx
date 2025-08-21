import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGym } from '@/contexts/GymContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Loader2, Building, User } from 'lucide-react';

const profileSchema = z.object({
  // Dati Palestra
  gymName: z.string().min(1, 'Nome palestra richiesto'),
  gymDescription: z.string().optional(),
  gymAddress: z.string().min(1, 'Indirizzo richiesto'),
  gymCity: z.string().min(1, 'Città richiesta'),
  gymPostalCode: z.string().optional(),
  gymPhone: z.string().optional(),
  gymEmail: z.string().email('Email non valida').optional().or(z.literal('')),
  gymWebsite: z.string().url('URL non valido').optional().or(z.literal('')),
  
  // Dati Proprietario
  firstName: z.string().min(1, 'Nome richiesto'),
  lastName: z.string().min(1, 'Cognome richiesto'),
  phone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const OwnerProfile: React.FC = () => {
  const { user } = useAuth();
  const { selectedGym, refreshGyms } = useGym();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      gymName: '',
      gymDescription: '',
      gymAddress: '',
      gymCity: '',
      gymPostalCode: '',
      gymPhone: '',
      gymEmail: '',
      gymWebsite: '',
      firstName: '',
      lastName: '',
      phone: '',
    },
  });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user || !selectedGym) return;

      try {
        // Load gym data
        const { data: gymData, error: gymError } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', selectedGym.id)
          .single();

        if (gymError) throw gymError;

        // Load profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) throw profileError;

        // Update form values
        form.reset({
          gymName: gymData.name || '',
          gymDescription: gymData.description || '',
          gymAddress: gymData.address || '',
          gymCity: gymData.city || '',
          gymPostalCode: gymData.postal_code || '',
          gymPhone: gymData.phone || '',
          gymEmail: gymData.email || '',
          gymWebsite: gymData.website || '',
          firstName: profileData.first_name || '',
          lastName: profileData.last_name || '',
          phone: profileData.phone || '',
        });

        setLogoUrl(gymData.logo_url || '');
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Errore',
          description: 'Errore nel caricamento dei dati',
          variant: 'destructive',
        });
      }
    };

    loadData();
  }, [user, selectedGym, form]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedGym) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `gym-${selectedGym.id}-${Math.random()}.${fileExt}`;
      const filePath = `gym-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newLogoUrl = data.publicUrl;

      // Update gym logo in database
      const { error: updateError } = await supabase
        .from('gyms')
        .update({ logo_url: newLogoUrl })
        .eq('id', selectedGym.id);

      if (updateError) throw updateError;

      setLogoUrl(newLogoUrl);
      await refreshGyms();
      
      toast({
        title: 'Successo',
        description: 'Logo aggiornato con successo',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento del logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !selectedGym) return;

    setIsLoading(true);
    try {
      // Update gym data
      const { error: gymError } = await supabase
        .from('gyms')
        .update({
          name: data.gymName,
          description: data.gymDescription,
          address: data.gymAddress,
          city: data.gymCity,
          postal_code: data.gymPostalCode,
          phone: data.gymPhone,
          email: data.gymEmail || null,
          website: data.gymWebsite || null,
        })
        .eq('id', selectedGym.id);

      if (gymError) throw gymError;

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      await refreshGyms();
      
      toast({
        title: 'Successo',
        description: 'Profilo aggiornato con successo',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Errore',
        description: 'Errore nell\'aggiornamento del profilo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedGym) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profilo Palestra</CardTitle>
          <CardDescription>
            Nessuna palestra selezionata
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profilo Palestra</h1>
        <p className="text-muted-foreground">
          Gestisci i dati della tua palestra e del tuo profilo
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Logo Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Logo Palestra
              </CardTitle>
              <CardDescription>
                Carica il logo della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback>
                    <Building className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isUploadingLogo}
                      asChild
                    >
                      <span className="cursor-pointer">
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Caricamento...
                          </>
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            Cambia Logo
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gym Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Dati Palestra
              </CardTitle>
              <CardDescription>
                Informazioni generali della palestra
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gymName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Palestra *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="gymCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Città *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gymDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gymAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="gymPostalCode"
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

                <FormField
                  control={form.control}
                  name="gymPhone"
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
                  control={form.control}
                  name="gymEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gymWebsite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sito Web</FormLabel>
                    <FormControl>
                      <Input {...field} type="url" placeholder="https://" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Owner Data Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dati Proprietario
              </CardTitle>
              <CardDescription>
                Le tue informazioni personali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
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
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                'Salva Modifiche'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};