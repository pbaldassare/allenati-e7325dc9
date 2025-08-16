import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseScheduleManager } from '@/components/admin/CourseScheduleManager';
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
  description: z.string().optional(),
  instructor_id: z.string().min(1, 'Seleziona un istruttore'),
  category: z.string().min(1, 'Seleziona una categoria'),
  level: z.string().min(1, 'Seleziona un livello'),
  price: z.coerce.number().min(0, 'Il prezzo deve essere positivo'),
  maxParticipants: z.coerce.number().min(1, 'Massimo partecipanti deve essere almeno 1'),
  reservedSpots: z.coerce.number().min(0, 'I posti riservati non possono essere negativi').optional(),
  duration: z.coerce.number().min(15, 'La durata minima è 15 minuti'),
  deadlineHours: z.coerce.number().min(0.5, 'La deadline deve essere almeno 0.5 ore').default(24),
  image: z.string().url('Inserisci un URL valido per l\'immagine').optional().or(z.literal("")),
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

interface Instructor {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Category {
  id: string;
  name: string;
}

export const OwnerCourseForm: React.FC<CourseFormProps> = ({ mode, course }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load owner's gym data
  useEffect(() => {
    const loadOwnerData = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        // Get owner's gym ID
        const { data: gymData } = await supabase
          .rpc('get_user_gym_id', { _user_id: user.user.id });

        if (!gymData) {
          toast({
            title: "Errore",
            description: "Non sei associato a nessuna palestra",
            variant: "destructive"
          });
          return;
        }

        // Load gym rooms for this gym
        const { data: roomsData } = await supabase
          .from('gym_rooms')
          .select('id, name')
          .eq('gym_id', gymData)
          .eq('is_active', true)
          .order('name');

        // Load instructors for this gym with profiles via separate query
        const { data: instructorsData } = await supabase
          .from('instructors')
          .select('id, user_id')
          .eq('gym_id', gymData)
          .eq('is_active', true);

        let instructorsWithProfiles: Instructor[] = [];
        if (instructorsData && instructorsData.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', instructorsData.map(i => i.user_id));

          instructorsWithProfiles = instructorsData.map(instructor => {
            const profile = profilesData?.find(p => p.user_id === instructor.user_id);
            return {
              id: instructor.id,
              user_id: instructor.user_id,
              first_name: profile?.first_name || 'Nome',
              last_name: profile?.last_name || 'Cognome'
            };
          });
        }

        // Load categories for this gym
        const { data: categoriesData } = await supabase
          .from('course_categories')
          .select('id, name')
          .eq('gym_id', gymData)
          .eq('is_active', true)
          .order('name');

        if (roomsData) setGymRooms(roomsData);
        setInstructors(instructorsWithProfiles);
        if (categoriesData) setCategories(categoriesData);

      } catch (error) {
        console.error('Error loading owner data:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento dei dati",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadOwnerData();
  }, [toast]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? {
      name: course.name,
      description: course.description,
      instructor_id: '', // Will be populated by owner selection
      category: course.category,
      level: course.level,
      price: course.price,
      maxParticipants: course.maxParticipants,
      reservedSpots: (course as any).reservedSpots || 0,
      duration: course.duration,
      deadlineHours: course.deadlineHours || 24,
      image: course.image,
      benefits: course.benefits,
      requirements: course.requirements || [],
      schedule: course.schedule?.map(s => ({
        dayOfWeek: s.dayOfWeek || 1,
        time: s.time || '09:00',
        roomId: s.roomId || '',
        day: s.day,
        date: s.date
      })) || [],
    } : {
      name: '',
      description: '',
      instructor_id: '',
      category: '',
      level: '',
      price: 0,
      maxParticipants: 20,
      reservedSpots: 0,
      duration: 60,
      deadlineHours: 24,
      image: '',
      benefits: [''],
      requirements: [''],
      schedule: [{ dayOfWeek: 1, time: '09:00', roomId: '', day: 'Lunedì' }],
    },
  });

  const onSubmit = async (data: CourseFormData) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: gymId } = await supabase
        .rpc('get_user_gym_id', { _user_id: user.user.id });

      if (!gymId) {
        toast({
          title: "Errore",
          description: "Non sei associato a nessuna palestra",
          variant: "destructive"
        });
        return;
      }

      // Get selected category ID
      const selectedCategory = categories.find(c => c.name === data.category);
      if (!selectedCategory) {
        toast({
          title: "Errore", 
          description: "Categoria non valida",
          variant: "destructive"
        });
        return;
      }

      // Prepare course data for database
      const courseData = {
        name: data.name,
        description: data.description,
        instructor_id: data.instructor_id,
        category_id: selectedCategory.id,
        gym_id: gymId,
        difficulty_level: data.level === 'Principiante' ? 1 : data.level === 'Intermedio' ? 2 : 3,
        price_per_session: data.price,
        max_participants: data.maxParticipants,
        reserved_spots: data.reservedSpots || 0,
        duration_minutes: data.duration,
        deadline_hours: data.deadlineHours,
        image_url: data.image,
        benefits: data.benefits.filter(b => b.trim() !== ''),
        requirements: data.requirements?.filter(r => r.trim() !== '') || [],
        is_active: true
      };

      if (mode === 'create') {
        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (error) throw error;

        // Insert course schedules
        const scheduleData = data.schedule.map(s => ({
          course_id: newCourse.id,
          day_of_week: s.dayOfWeek,
          start_time: s.time,
          end_time: `${String(Math.floor((parseInt(s.time.split(':')[0]) * 60 + parseInt(s.time.split(':')[1]) + data.duration) / 60)).padStart(2, '0')}:${String((parseInt(s.time.split(':')[0]) * 60 + parseInt(s.time.split(':')[1]) + data.duration) % 60).padStart(2, '0')}`,
          room_id: s.roomId,
          is_active: true
        }));

        const { error: scheduleError } = await supabase
          .from('course_schedules')
          .insert(scheduleData);

        if (scheduleError) throw scheduleError;
      } else if (mode === 'edit' && course) {
        // Update existing course
        const { error: updateError } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id);

        if (updateError) throw updateError;

        // Delete existing schedules
        const { error: deleteScheduleError } = await supabase
          .from('course_schedules')
          .delete()
          .eq('course_id', course.id);

        if (deleteScheduleError) throw deleteScheduleError;

        // Insert new schedules
        const scheduleData = data.schedule.map(s => ({
          course_id: course.id,
          day_of_week: s.dayOfWeek,
          start_time: s.time,
          end_time: `${String(Math.floor((parseInt(s.time.split(':')[0]) * 60 + parseInt(s.time.split(':')[1]) + data.duration) / 60)).padStart(2, '0')}:${String((parseInt(s.time.split(':')[0]) * 60 + parseInt(s.time.split(':')[1]) + data.duration) % 60).padStart(2, '0')}`,
          room_id: s.roomId,
          is_active: true
        }));

        const { error: newScheduleError } = await supabase
          .from('course_schedules')
          .insert(scheduleData);

        if (newScheduleError) throw newScheduleError;
      }

      toast({
        title: mode === 'create' ? 'Corso creato' : 'Corso aggiornato',
        description: mode === 'create' 
          ? 'Il nuovo corso è stato creato con successo'
          : 'Le modifiche sono state salvate',
      });

      navigate('/owner/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio del corso",
        variant: "destructive"
      });
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

  if (loading) {
    return <div className="flex justify-center p-8">Caricamento...</div>;
  }

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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona istruttore" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.first_name} {instructor.last_name}
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
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
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
                <FormLabel>Prezzo per Sessione (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="25.00"
                    {...field}
                  />
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
                  <FormLabel>Massimo Partecipanti</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reservedSpots"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posti riservati agli abbonati</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max={form.watch('maxParticipants') || 20}
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Numero di posti riservati esclusivamente a chi ha crediti o abbonamenti.
                    I restanti {(form.watch('maxParticipants') || 20) - (form.watch('reservedSpots') || 0)} posti saranno disponibili per l'acquisto diretto.
                  </FormDescription>
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
                  <Input
                    type="number"
                    min="15"
                    step="15"
                    placeholder="60"
                    {...field}
                  />
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
                <FormLabel>Deadline Prenotazione (ore)</FormLabel>
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
                  Ore prima del corso entro cui gli utenti possono prenotare/cancellare
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
                 <FormLabel>URL Immagine (opzionale)</FormLabel>
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
               <FormLabel>Descrizione (opzionale)</FormLabel>
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
            <CardTitle className="text-lg">Requisiti (opzionale)</CardTitle>
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
                          placeholder="es. Esperienza di base con yoga"
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

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orari e Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CourseScheduleManager
                      schedule={field.value as any}
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

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" size="lg">
            {mode === 'create' ? 'Crea Corso' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/owner/courses')}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};