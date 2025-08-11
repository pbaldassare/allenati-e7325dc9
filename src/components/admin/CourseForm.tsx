import React, { useEffect, useState } from 'react';
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
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const courseSchema = z.object({
  name: z.string().min(3, 'Il nome deve essere almeno 3 caratteri'),
  description: z.string().min(10, 'La descrizione deve essere almeno 10 caratteri'),
  instructor: z.string().min(2, 'Inserisci il nome dell\'istruttore'),
  category: z.string().min(1, 'Seleziona una categoria'),
  level: z.string().min(1, 'Seleziona un livello'),
  price: z.coerce.number().min(0, 'Il prezzo deve essere positivo'),
  maxParticipants: z.coerce.number().min(1, 'Massimo partecipanti deve essere almeno 1'),
  duration: z.coerce.number().min(15, 'La durata minima è 15 minuti'),
  deadlineHours: z.coerce.number().min(0.5, 'La deadline deve essere almeno 0.5 ore').default(24),
  image: z.string().url('Inserisci un URL valido per l\'immagine'),
  benefits: z.array(z.string()).min(1, 'Aggiungi almeno un beneficio'),
  requirements: z.array(z.string()).optional(),
  schedule: z.array(z.object({
    dayOfWeek: z.number(),
    time: z.string(),
    roomId: z.string().min(1, 'La sala è obbligatoria'),
    date: z.string().optional(),
    day: z.string().optional()
  })).min(1, 'È necessario inserire almeno un orario'),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  course?: Course;
}

interface GymRoom {
  id: string;
  name: string;
}

export const CourseForm: React.FC<CourseFormProps> = ({ mode, course }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  
  // Load gym rooms
  useEffect(() => {
    const loadGymRooms = async () => {
      const { data, error } = await supabase
        .from('gym_rooms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (!error && data) {
        setGymRooms(data);
      }
    };
    
    loadGymRooms();
  }, []);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? {
      name: course.name,
      description: course.description,
      instructor: course.instructor,
      category: course.category,
      level: course.level,
      price: course.price,
      maxParticipants: course.maxParticipants,
      duration: course.duration,
      deadlineHours: course.deadlineHours || 24,
      image: course.image,
      benefits: course.benefits,
      requirements: course.requirements || [],
      schedule: course.schedule?.map(s => ({
        dayOfWeek: s.dayOfWeek,
        time: s.time,
        roomId: s.roomId || '',
        day: s.day,
        date: s.date
      })) || [],
    } : {
      name: '',
      description: '',
      instructor: '',
      category: '',
      level: '',
      price: 0,
      maxParticipants: 20,
      duration: 60,
      deadlineHours: 24,
      image: '',
      benefits: [''],
      requirements: [''],
      schedule: [{ dayOfWeek: 1, time: '09:00', roomId: '', day: 'Lunedì' }],
    },
  });

  const onSubmit = (data: CourseFormData) => {
    console.log('Course data:', data);
    
    toast({
      title: mode === 'create' ? 'Corso creato' : 'Corso aggiornato',
      description: mode === 'create' 
        ? 'Il nuovo corso è stato creato con successo'
        : 'Le modifiche sono state salvate',
    });

    navigate('/admin/courses');
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
            name="instructor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Istruttore</FormLabel>
                <FormControl>
                  <Input placeholder="Nome dell'istruttore" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="pilates">Pilates</SelectItem>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="forza">Forza</SelectItem>
                    <SelectItem value="danza">Danza</SelectItem>
                    <SelectItem value="arti-marziali">Arti Marziali</SelectItem>
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
            name="deadlineHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline Prenotazione/Cancellazione (ore)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    placeholder="24"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Ore prima dell'inizio del corso entro cui gli utenti possono prenotare/cancellare. Admin, proprietari palestra e istruttori non hanno limiti.
                </FormDescription>
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
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
              <FormControl>
                <CourseScheduleManager 
                  schedule={(field.value || []).map(item => ({
                    dayOfWeek: item.dayOfWeek || 1,
                    time: item.time || '09:00',
                    roomId: item.roomId || '',
                    day: item.day,
                    date: item.date
                  }))}
                  onChange={field.onChange}
                  gymRooms={gymRooms}
                />
              </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button type="submit" className="bg-gradient-primary">
            {mode === 'create' ? 'Crea Corso' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/admin/courses')}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};