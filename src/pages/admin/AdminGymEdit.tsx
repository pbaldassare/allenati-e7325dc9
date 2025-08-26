import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const gymSchema = z.object({
  name: z.string().min(1, 'Il nome è obbligatorio'),
  description: z.string().optional(),
  address: z.string().min(1, 'L\'indirizzo è obbligatorio'),
  city: z.string().min(1, 'La città è obbligatoria'),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  website: z.string().url('URL non valido').optional().or(z.literal('')),
  logo_url: z.string().url('URL logo non valido').optional().or(z.literal('')),
  is_active: z.boolean()
});

type GymFormData = z.infer<typeof gymSchema>;

const AdminGymEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
    defaultValues: {
      name: '',
      description: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      website: '',
      logo_url: '',
      is_active: true
    }
  });

  useEffect(() => {
    if (id) {
      loadGymData();
    }
  }, [id]);

  const loadGymData = async () => {
    try {
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      form.reset({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        logo_url: data.logo_url || '',
        is_active: data.is_active
      });
    } catch (error) {
      console.error('Error loading gym data:', error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i dati della palestra",
        variant: "destructive",
      });
      navigate('/admin/gyms');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: GymFormData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gyms')
        .update({
          name: data.name,
          description: data.description || null,
          address: data.address,
          city: data.city,
          postal_code: data.postal_code || null,
          phone: data.phone || null,
          email: data.email || null,
          website: data.website || null,
          logo_url: data.logo_url || null,
          is_active: data.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Palestra aggiornata con successo",
      });

      navigate(`/admin/gyms/${id}`);
    } catch (error) {
      console.error('Error updating gym:', error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la palestra",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/gyms/${id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna ai dettagli
          </Button>
          <h1 className="text-2xl font-bold">Modifica Palestra</h1>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-t-xl">
          <CardTitle>Informazioni Palestra</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Palestra *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome della palestra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Palestra Attiva</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Abilita o disabilita la palestra
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrizione della palestra..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informazioni di Ubicazione</h3>
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Indirizzo *</FormLabel>
                      <FormControl>
                        <Input placeholder="Via, numero civico" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Città *</FormLabel>
                        <FormControl>
                          <Input placeholder="Città" {...field} />
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
                        <FormLabel>Codice Postale</FormLabel>
                        <FormControl>
                          <Input placeholder="CAP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informazioni di Contatto</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefono</FormLabel>
                        <FormControl>
                          <Input placeholder="Numero di telefono" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="email@esempio.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sito Web</FormLabel>
                      <FormControl>
                        <Input placeholder="https://www.esempio.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="logo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Logo</FormLabel>
                      <FormControl>
                        <Input placeholder="https://esempio.com/logo.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin/gyms/${id}`)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? 'Salvando...' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminGymEdit;