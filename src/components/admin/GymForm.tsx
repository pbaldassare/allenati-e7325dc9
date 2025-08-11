import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const gymSchema = z.object({
  name: z.string().min(3, 'Il nome deve essere almeno 3 caratteri'),
  description: z.string().min(10, 'La descrizione deve essere almeno 10 caratteri'),
  address: z.string().min(5, 'L\'indirizzo deve essere almeno 5 caratteri'),
  city: z.string().min(2, 'La città deve essere almeno 2 caratteri'),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email non valida').optional().or(z.literal('')),
  website: z.string().url('URL non valido').optional().or(z.literal('')),
  logo_url: z.string().url('URL non valido').optional().or(z.literal('')),
  owner_email: z.string().email('Email proprietario non valida').optional().or(z.literal(''))
});

type GymFormData = z.infer<typeof gymSchema>;

interface GymFormProps {
  mode: 'create' | 'edit';
  gym?: any;
}

export const GymForm: React.FC<GymFormProps> = ({ mode, gym }) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<GymFormData>({
    resolver: zodResolver(gymSchema),
    defaultValues: gym ? {
      name: gym.name,
      description: gym.description || '',
      address: gym.address,
      city: gym.city,
      postal_code: gym.postal_code || '',
      phone: gym.phone || '',
      email: gym.email || '',
      website: gym.website || '',
      logo_url: gym.logo_url || '',
      owner_email: gym.owner_email || ''
    } : {
      name: '',
      description: '',
      address: '',
      city: '',
      postal_code: '',
      phone: '',
      email: '',
      website: '',
      logo_url: '',
      owner_email: ''
    },
  });

  const onSubmit = async (data: GymFormData) => {
    try {
      if (mode === 'create') {
        const { error } = await supabase
          .from('gyms')
          .insert([{
            name: data.name,
            description: data.description,
            address: data.address,
            city: data.city,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            email: data.email || null,
            website: data.website || null,
            logo_url: data.logo_url || null,
            owner_email: data.owner_email || null,
            is_active: true
          }]);

        if (error) throw error;

        toast({
          title: 'Palestra creata',
          description: 'La nuova palestra è stata creata con successo',
        });
      } else {
        const { error } = await supabase
          .from('gyms')
          .update({
            name: data.name,
            description: data.description,
            address: data.address,
            city: data.city,
            postal_code: data.postal_code || null,
            phone: data.phone || null,
            email: data.email || null,
            website: data.website || null,
            logo_url: data.logo_url || null,
            owner_email: data.owner_email || null
          })
          .eq('id', gym.id);

        if (error) throw error;

        toast({
          title: 'Palestra aggiornata',
          description: 'Le modifiche sono state salvate',
        });
      }

      navigate('/admin/gyms');
    } catch (error) {
      console.error('Error saving gym:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Palestra</FormLabel>
                <FormControl>
                  <Input placeholder="es. Fight Club Milano" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Città</FormLabel>
                <FormControl>
                  <Input placeholder="Milano" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Input placeholder="Via Roma 123" {...field} />
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
                <FormLabel>CAP</FormLabel>
                <FormControl>
                  <Input placeholder="20100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input placeholder="+39 02 123456" {...field} />
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
                  <Input placeholder="info@palestra.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sito Web</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.palestra.it" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="owner_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Proprietario</FormLabel>
                <FormControl>
                  <Input placeholder="proprietario@palestra.it" {...field} />
                </FormControl>
                <FormDescription>
                  Email del proprietario della palestra
                </FormDescription>
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
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrizione</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descrivi la palestra, i servizi offerti, la mission..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button type="submit" className="bg-gradient-primary">
            {mode === 'create' ? 'Crea Palestra' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/admin/gyms')}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};