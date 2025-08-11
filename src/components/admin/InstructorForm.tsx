import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Instructor } from '@/hooks/useInstructors';

const instructorSchema = z.object({
  firstName: z.string().min(2, 'Il nome deve essere almeno 2 caratteri'),
  lastName: z.string().min(2, 'Il cognome deve essere almeno 2 caratteri'),
  email: z.string().email('Inserisci un email valida'),
  bio: z.string().min(20, 'La biografia deve essere almeno 20 caratteri'),
  experienceYears: z.coerce.number().min(0, 'Gli anni di esperienza devono essere positivi'),
  hourlyRate: z.coerce.number().min(0, 'La tariffa oraria deve essere positiva'),
  specializations: z.array(z.string()).min(1, 'Aggiungi almeno una specializzazione'),
  certifications: z.array(z.string()).optional(),
});

type InstructorFormData = z.infer<typeof instructorSchema>;

interface InstructorFormProps {
  mode: 'create' | 'edit';
  instructor?: Instructor;
  onSuccess?: () => void;
}

export const InstructorForm: React.FC<InstructorFormProps> = ({ 
  mode, 
  instructor, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<InstructorFormData>({
    resolver: zodResolver(instructorSchema),
    defaultValues: instructor ? {
      firstName: instructor.profiles.first_name,
      lastName: instructor.profiles.last_name,
      email: '', // We'll need to get this from the user profile
      bio: instructor.bio || '',
      experienceYears: instructor.experience_years || 0,
      hourlyRate: Number(instructor.hourly_rate) || 0,
      specializations: instructor.specializations || [''],
      certifications: instructor.certifications || [''],
    } : {
      firstName: '',
      lastName: '',
      email: '',
      bio: '',
      experienceYears: 0,
      hourlyRate: 0,
      specializations: [''],
      certifications: [''],
    },
  });

  const onSubmit = async (data: InstructorFormData) => {
    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        // For new instructors, we need to create a user first, then the instructor profile
        // This is a simplified version - in a real app, you'd handle user creation differently
        toast({
          title: 'Funzionalità in sviluppo',
          description: 'La creazione di nuovi istruttori sarà disponibile a breve',
          variant: 'destructive',
        });
      } else {
        // Update existing instructor
        const { error: instructorError } = await supabase
          .from('instructors')
          .update({
            bio: data.bio,
            experience_years: data.experienceYears,
            hourly_rate: data.hourlyRate,
            specializations: data.specializations.filter(s => s.trim() !== ''),
            certifications: data.certifications?.filter(c => c.trim() !== '') || [],
          })
          .eq('id', instructor!.id);

        if (instructorError) throw instructorError;

        // Update profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
          })
          .eq('user_id', instructor!.user_id);

        if (profileError) throw profileError;
        
        toast({
          title: 'Istruttore aggiornato',
          description: 'Le modifiche sono state salvate con successo',
        });
      }

      onSuccess?.();
      navigate('/admin/instructors');
    } catch (error) {
      console.error('Error saving instructor:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSpecialization = () => {
    const current = form.getValues('specializations');
    form.setValue('specializations', [...current, '']);
  };

  const removeSpecialization = (index: number) => {
    const current = form.getValues('specializations');
    if (current.length > 1) {
      form.setValue('specializations', current.filter((_, i) => i !== index));
    }
  };

  const addCertification = () => {
    const current = form.getValues('certifications') || [];
    form.setValue('certifications', [...current, '']);
  };

  const removeCertification = (index: number) => {
    const current = form.getValues('certifications') || [];
    form.setValue('certifications', current.filter((_, i) => i !== index));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Personali</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Marco" {...field} />
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
                  <FormLabel>Cognome</FormLabel>
                  <FormControl>
                    <Input placeholder="Rossi" {...field} />
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
                    <Input type="email" placeholder="marco.rossi@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experienceYears"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anni di Esperienza</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tariffa Oraria (€)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Bio */}
        <Card>
          <CardHeader>
            <CardTitle>Biografia</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi la tua esperienza, filosofia di allenamento e qualifiche..."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Specializations */}
        <Card>
          <CardHeader>
            <CardTitle>Specializzazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('specializations').map((_, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`specializations.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="es. Yoga, Pilates, Crossfit"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSpecialization(index)}
                  disabled={form.watch('specializations').length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addSpecialization}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Specializzazione
            </Button>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certificazioni (Opzionale)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(form.watch('certifications') || []).map((_, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`certifications.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="es. RYT 200, NASM-CPT"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCertification(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCertification}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Certificazione
            </Button>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            className="bg-gradient-primary"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crea Istruttore' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/admin/instructors')}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};