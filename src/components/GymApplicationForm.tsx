import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Building2, Send } from 'lucide-react';

const applicationSchema = z.object({
  gym_name: z.string().min(2, 'Il nome della palestra deve essere di almeno 2 caratteri'),
  gym_description: z.string().optional(),
  gym_address: z.string().min(5, 'Inserisci un indirizzo valido'),
  gym_city: z.string().min(2, 'Inserisci una città valida'),
  gym_postal_code: z.string().optional(),
  gym_phone: z.string().optional(),
  gym_email: z.string().email('Inserisci un email valida').optional().or(z.literal('')),
  gym_website: z.string().url('Inserisci un URL valido').optional().or(z.literal('')),
  applicant_message: z.string().optional(),
  applicant_email: z.string().email('Inserisci un email valida'),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

interface GymApplicationFormProps {
  onSuccess?: () => void;
}

export const GymApplicationForm: React.FC<GymApplicationFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      gym_name: '',
      gym_description: '',
      gym_address: '',
      gym_city: '',
      gym_postal_code: '',
      gym_phone: '',
      gym_email: '',
      gym_website: '',
      applicant_message: '',
      applicant_email: user?.email || '',
    },
  });

  const onSubmit = async (data: ApplicationFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('gym_applications')
        .insert({
          applicant_user_id: user?.id || null,
          applicant_email: data.applicant_email,
          gym_name: data.gym_name,
          gym_description: data.gym_description || null,
          gym_address: data.gym_address,
          gym_city: data.gym_city,
          gym_postal_code: data.gym_postal_code || null,
          gym_phone: data.gym_phone || null,
          gym_email: data.gym_email || null,
          gym_website: data.gym_website || null,
          applicant_message: data.applicant_message || null,
        });

      if (error) throw error;

      toast({
        title: "Candidatura inviata!",
        description: "La tua candidatura è stata inviata con successo. Riceverai una risposta entro pochi giorni.",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'invio della candidatura",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Candidati come Proprietario di Palestra
        </CardTitle>
        <CardDescription>
          Compila il modulo per candidarti come proprietario di una palestra. La tua richiesta sarà valutata dal nostro team.
          {!user && " Non è necessario essere registrati per candidarsi."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="applicant_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>La tua Email *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="tua.email@example.com" 
                      {...field} 
                      disabled={!!user}
                    />
                  </FormControl>
                  <FormMessage />
                  {user && (
                    <p className="text-sm text-muted-foreground">
                      Email dal tuo account registrato
                    </p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gym_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Palestra *</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. FitnessPro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gym_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Città *</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Milano" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="gym_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi la tua palestra, i servizi offerti, la filosofia..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gym_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Via/Piazza, Numero civico" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gym_postal_code"
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
                name="gym_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="+39 02 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gym_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Palestra</FormLabel>
                    <FormControl>
                      <Input placeholder="info@palestra.it" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gym_website"
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
            </div>

            <FormField
              control={form.control}
              name="applicant_message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Messaggio per l'amministrazione</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Racconta la tua esperienza nel settore fitness, i tuoi obiettivi..."
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-gradient-primary"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Invio in corso...' : 'Invia Candidatura'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};