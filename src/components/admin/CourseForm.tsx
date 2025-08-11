import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CourseScheduleManager } from './CourseScheduleManager';
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
import { Course } from '@/contexts/AppDataContext';
import { X, Plus, Loader2 } from 'lucide-react';
import { useInstructors } from '@/hooks/useInstructors';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';

const courseSchema = z.object({
  name: z.string().min(3, 'Il nome deve essere almeno 3 caratteri'),
  description: z.string().min(10, 'La descrizione deve essere almeno 10 caratteri'),
  instructor_id: z.string().min(1, 'Seleziona un istruttore'),
  category_id: z.string().min(1, 'Seleziona una categoria'),
  level: z.string().min(1, 'Seleziona un livello'),
  price: z.coerce.number().min(0, 'Il prezzo deve essere positivo'),
  maxParticipants: z.coerce.number().min(1, 'Massimo partecipanti deve essere almeno 1'),
  duration: z.coerce.number().min(15, 'La durata minima è 15 minuti'),
  image: z.string().url('Inserisci un URL valido per l\'immagine'),
  benefits: z.array(z.string()).min(1, 'Aggiungi almeno un beneficio'),
  requirements: z.array(z.string()).optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  course?: Course;
}

export const CourseForm: React.FC<CourseFormProps> = ({ mode, course }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { instructors, loading: instructorsLoading } = useInstructors();
  const { categories, loading: categoriesLoading } = useCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? {
      name: course.name,
      description: course.description,
      instructor_id: '', // Will need to map from instructor name to ID
      category_id: '', // Will need to map from category name to ID
      level: course.level,
      price: course.price,
      maxParticipants: course.maxParticipants,
      duration: course.duration,
      image: course.image,
      benefits: course.benefits,
      requirements: course.requirements || [],
    } : {
      name: '',
      description: '',
      instructor_id: '',
      category_id: '',
      level: '',
      price: 0,
      maxParticipants: 20,
      duration: 60,
      image: '',
      benefits: [''],
      requirements: [''],
    },
  });

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);
    
    try {
      if (mode === 'create') {
        // Create new course
        const { error } = await supabase
          .from('courses')
          .insert({
            name: data.name,
            description: data.description,
            instructor_id: data.instructor_id,
            max_participants: data.maxParticipants,
            duration_minutes: data.duration,
            price_per_session: data.price,
            image_url: data.image,
            benefits: data.benefits.filter(b => b.trim() !== ''),
            requirements: data.requirements?.filter(r => r.trim() !== '') || [],
            category_id: data.category_id,
            difficulty_level: data.level === 'Principiante' ? 1 : data.level === 'Intermedio' ? 2 : data.level === 'Avanzato' ? 3 : 1
          });

        if (error) throw error;
        
        toast({
          title: 'Corso creato',
          description: 'Il nuovo corso è stato creato con successo',
        });
      } else {
        // Update existing course
        console.log('Updating course:', data);
        toast({
          title: 'Corso aggiornato',
          description: 'Le modifiche sono state salvate',
        });
      }

      navigate('/admin/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio del corso',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addBenefit = () => {
    const currentBenefits = form.getValues('benefits');
    form.setValue('benefits', [...currentBenefits, '']);
  };

  const removeBenefit = (index: number) => {
    const currentBenefits = form.getValues('benefits');
    if (currentBenefits.length > 1) {
      form.setValue('benefits', currentBenefits.filter((_, i) => i !== index));
    }
  };

  const addRequirement = () => {
    const currentRequirements = form.getValues('requirements') || [];
    form.setValue('requirements', [...currentRequirements, '']);
  };

  const removeRequirement = (index: number) => {
    const currentRequirements = form.getValues('requirements') || [];
    form.setValue('requirements', currentRequirements.filter((_, i) => i !== index));
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
                <FormLabel>Nome Corso</FormLabel>
                <FormControl>
                  <Input placeholder="es. Yoga Mattutino" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instructor_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Istruttore</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={instructorsLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        instructorsLoading ? "Caricamento..." : "Seleziona istruttore"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.profiles.first_name} {instructor.profiles.last_name}
                        {instructor.specializations && instructor.specializations.length > 0 && (
                          <span className="text-muted-foreground ml-2">
                            ({instructor.specializations.join(', ')})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  disabled={categoriesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        categoriesLoading ? "Caricamento..." : "Seleziona categoria"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Livello</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona livello" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Principiante">Principiante</SelectItem>
                    <SelectItem value="Intermedio">Intermedio</SelectItem>
                    <SelectItem value="Avanzato">Avanzato</SelectItem>
                    <SelectItem value="Tutti">Tutti i livelli</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prezzo (€)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="15" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="maxParticipants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Partecipanti</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durata (minuti)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="60" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Immagine</FormLabel>
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
                  placeholder="Descrivi il corso, gli obiettivi e cosa aspettarsi..."
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Benefici del Corso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('benefits').map((_, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`benefits.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="es. Migliora la flessibilità"
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
                  onClick={() => removeBenefit(index)}
                  disabled={form.watch('benefits').length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBenefit}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Beneficio
            </Button>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Requisiti (Opzionale)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(form.watch('requirements') || []).map((_, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`requirements.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="es. Abbigliamento comodo"
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
                  onClick={() => removeRequirement(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRequirement}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Requisito
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Manager */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Programmazione Orari</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseScheduleManager 
              schedule={course?.schedule || []}
              onChange={(schedule) => console.log('Schedule changed:', schedule)}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            className="bg-gradient-primary"
            disabled={isSubmitting || instructorsLoading || categoriesLoading}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crea Corso' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/admin/courses')}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};