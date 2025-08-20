import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CourseSessionManager } from '@/components/admin/CourseSessionManager';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { SupabaseCourse } from '@/types/course';
import { X, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  isVisible: z.boolean().default(true),
  benefits: z.array(z.string()).min(1, 'Aggiungi almeno un beneficio'),
  requirements: z.array(z.string()).optional(),
  startDate: z.date({ required_error: 'La data di inizio è obbligatoria' }),
  endDate: z.date({ required_error: 'La data di fine è obbligatoria' }),
  autoGenerateSessions: z.boolean().default(true),
  schedule: z.array(z.object({
    dayOfWeek: z.number(),
    time: z.string(),
    roomId: z.string().min(1, 'La sala è obbligatoria'),
    date: z.string().optional(),
    day: z.string().optional()
  })).min(1, 'È necessario inserire almeno un orario'),
}).refine((data) => data.endDate > data.startDate, {
  message: "La data di fine deve essere successiva alla data di inizio",
  path: ["endDate"]
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  course?: SupabaseCourse & { 
    schedules?: any[];
    start_date?: string;
    end_date?: string;
    auto_generate_sessions?: boolean;
  };
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
  const [sessions, setSessions] = useState<any[]>([]);
  
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
    defaultValues: {
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
      isVisible: true,
      benefits: [''],
      requirements: [''],
      startDate: new Date(),
      endDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000), // 3 mesi dopo
      autoGenerateSessions: true,
      schedule: [{ dayOfWeek: 1, time: '09:00', roomId: '', day: 'Lunedì' }],
    },
  });

  // Reset form values when in edit mode and data is loaded
  useEffect(() => {
    if (mode === 'edit' && course && categories.length > 0 && instructors.length > 0 && !loading) {
      console.log('Resetting form with course data:', course);
      const categoryName = categories.find(c => c.id === course.category_id)?.name || '';
      
      form.reset({
        name: course.name || '',
        description: course.description || '',
        instructor_id: course.instructor_id || '',
        category: categoryName,
        level: course.difficulty_level === 1 ? 'Principiante' : course.difficulty_level === 2 ? 'Intermedio' : course.difficulty_level === 3 ? 'Avanzato' : 'Principiante',
        price: course.price_per_session || 0,
        maxParticipants: course.max_participants || 20,
        reservedSpots: course.reserved_spots || 0,
        duration: course.duration_minutes || 60,
        deadlineHours: course.deadline_hours || 24,
        image: course.image_url || '',
        isVisible: course.is_active ?? true,
        benefits: course.benefits || [''],
        requirements: course.requirements || [''],
        startDate: course.start_date ? new Date(course.start_date) : new Date(),
        endDate: course.end_date ? new Date(course.end_date) : new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000),
        autoGenerateSessions: course.auto_generate_sessions ?? true,
        schedule: course.schedules?.map((s: any) => ({
          dayOfWeek: s.day_of_week || 1,
          time: s.start_time || '09:00',
          roomId: s.room_id || '',
          day: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][s.day_of_week || 1],
          date: s.date
        })) || [{ dayOfWeek: 1, time: '09:00', roomId: '', day: 'Lunedì' }],
      });
    }
  }, [mode, course, categories, instructors, loading, form]);

  const onSubmit = async (data: CourseFormData) => {
    try {
      console.log('Form submission started with data:', data);
      
      // Validate form state before proceeding
      if (!form.formState.isValid) {
        console.log('Form validation errors:', form.formState.errors);
        
        toast({
          title: "Errori di validazione",
          description: "Compila tutti i campi obbligatori per continuare",
          variant: "destructive"
        });
        
        // Scroll to first error
        const firstErrorField = Object.keys(form.formState.errors)[0];
        if (firstErrorField) {
          const element = document.querySelector(`[name="${firstErrorField}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        return;
      }

      // Validate schedule has rooms assigned
      const scheduleHasRooms = data.schedule.every(s => s.roomId && s.roomId.trim() !== '');
      if (!scheduleHasRooms) {
        toast({
          title: "Errore",
          description: "Assegna una sala a tutti gli orari del corso",
          variant: "destructive"
        });
        return;
      }
      
      // Validate required data before proceeding
      if (!data.instructor_id || data.instructor_id.trim() === '') {
        toast({
          title: "Errore",
          description: "Seleziona un istruttore per continuare",
          variant: "destructive"
        });
        return;
      }

      if (!data.category || categories.length === 0) {
        toast({
          title: "Errore",
          description: "Categorie non caricate o categoria non selezionata",
          variant: "destructive"
        });
        return;
      }

      if (instructors.length === 0) {
        toast({
          title: "Errore",
          description: "Istruttori non caricati",
          variant: "destructive"
        });
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Errore",
          description: "Utente non autenticato",
          variant: "destructive"
        });
        return;
      }

      const { data: gymId } = await supabase
        .rpc('get_user_gym_id', { _user_id: user.user.id });

      console.log('Gym ID retrieved:', gymId);

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
      console.log('Selected category:', selectedCategory);
      
      if (!selectedCategory) {
        toast({
          title: "Errore", 
          description: "Categoria non valida",
          variant: "destructive"
        });
        return;
      }

      // Validate instructor exists
      const selectedInstructor = instructors.find(i => i.id === data.instructor_id);
      console.log('Selected instructor:', selectedInstructor);
      
      if (!selectedInstructor) {
        toast({
          title: "Errore",
          description: "Istruttore non valido",
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
        image_url: data.image || null,
        benefits: data.benefits.filter(b => b.trim() !== ''),
        requirements: data.requirements?.filter(r => r.trim() !== '') || [],
        credits_required: 1,
        is_active: data.isVisible,
        start_date: data.startDate.toISOString().split('T')[0],
        end_date: data.endDate.toISOString().split('T')[0],
        auto_generate_sessions: data.autoGenerateSessions
      };

      if (mode === 'create') {
        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (error) throw error;

        // Insert course schedules with safe calculations
        const scheduleData = data.schedule.map(s => {
          console.log('Processing schedule item:', s);
          
          // Validate schedule data
          if (!s.time || !s.roomId || !data.duration) {
            console.error('Invalid schedule data:', { time: s.time, roomId: s.roomId, duration: data.duration });
            throw new Error('Dati orario non validi');
          }
          
          const [hours, minutes] = s.time.split(':').map(Number);
          const totalStartMinutes = hours * 60 + minutes;
          const totalEndMinutes = totalStartMinutes + data.duration;
          const endHours = Math.floor(totalEndMinutes / 60);
          const endMinutes = totalEndMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
          
          console.log('Calculated end time:', endTime);
          
          return {
            course_id: newCourse.id,
            day_of_week: s.dayOfWeek,
            start_time: s.time,
            end_time: endTime,
            room_id: s.roomId,
            is_active: true
          };
        });

        const { error: scheduleError } = await supabase
          .from('course_schedules')
          .insert(scheduleData);

        if (scheduleError) throw scheduleError;

        // Generate sessions if auto-generate is enabled
        if (data.autoGenerateSessions) {
          const { error: sessionError } = await supabase
            .rpc('generate_course_sessions', {
              _course_id: newCourse.id,
              _start_date: data.startDate.toISOString().split('T')[0],
              _end_date: data.endDate.toISOString().split('T')[0]
            });

          if (sessionError) {
            console.error('Error generating sessions:', sessionError);
            toast({
              title: "Attenzione",
              description: "Corso creato ma errore nella generazione delle sessioni",
              variant: "destructive"
            });
          }
        }
      } else if (mode === 'edit' && course) {
        // Update existing course
        console.log('Updating course with data:', data);
        console.log('Course ID:', course.id);
        
        const { data: updatedCourse, error: updateError } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id)
          .select()
          .single();

        if (updateError) {
          console.error('Course update error:', updateError);
          throw updateError;
        }

        console.log('Course updated successfully:', updatedCourse);

        // Delete existing schedules
        const { error: deleteScheduleError } = await supabase
          .from('course_schedules')
          .delete()
          .eq('course_id', course.id);

        if (deleteScheduleError) {
          console.error('Schedule delete error:', deleteScheduleError);
          throw deleteScheduleError;
        }

        // Insert new schedules with safe calculations
        const scheduleData = data.schedule.map(s => {
          console.log('Processing schedule item for update:', s);
          
          // Validate schedule data
          if (!s.time || !s.roomId || !data.duration) {
            console.error('Invalid schedule data:', { time: s.time, roomId: s.roomId, duration: data.duration });
            throw new Error('Dati orario non validi');
          }
          
          const [hours, minutes] = s.time.split(':').map(Number);
          const totalStartMinutes = hours * 60 + minutes;
          const totalEndMinutes = totalStartMinutes + data.duration;
          const endHours = Math.floor(totalEndMinutes / 60);
          const endMinutes = totalEndMinutes % 60;
          const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
          
          console.log('Calculated end time for update:', endTime);
          
          return {
            course_id: course.id,
            day_of_week: s.dayOfWeek,
            start_time: s.time,
            end_time: endTime,
            room_id: s.roomId,
            is_active: true
          };
        });

        if (scheduleData.length > 0) {
          const { error: newScheduleError } = await supabase
            .from('course_schedules')
            .insert(scheduleData);

          if (newScheduleError) {
            console.error('Schedule insert error:', newScheduleError);
            throw newScheduleError;
          }

          // Generate sessions if auto-generate is enabled
          if (data.autoGenerateSessions) {
            const { error: sessionError } = await supabase
              .rpc('generate_course_sessions', {
                _course_id: course.id,
                _start_date: data.startDate.toISOString().split('T')[0],
                _end_date: data.endDate.toISOString().split('T')[0]
              });

            if (sessionError) {
              console.error('Error generating sessions:', sessionError);
              toast({
                title: "Attenzione",
                description: "Corso aggiornato ma errore nella generazione delle sessioni",
                variant: "destructive"
              });
            }
          }
        }
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
                <FormLabel className="flex items-center gap-1">
                  Nome Corso 
                  <span className="text-destructive">*</span>
                </FormLabel>
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
                <FormLabel className="flex items-center gap-1">
                  Istruttore 
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.instructor_id ? "border-destructive" : ""}>
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
                <FormLabel className="flex items-center gap-1">
                  Categoria 
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.category ? "border-destructive" : ""}>
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
                <FormLabel className="flex items-center gap-1">
                  Livello 
                  <span className="text-destructive">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={form.formState.errors.level ? "border-destructive" : ""}>
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
                  <FormLabel className="flex items-center gap-1">
                    Massimo Partecipanti 
                    <span className="text-destructive">*</span>
                  </FormLabel>
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
                <FormLabel className="flex items-center gap-1">
                  Durata (minuti) 
                  <span className="text-destructive">*</span>
                </FormLabel>
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

           <FormField
             control={form.control}
             name="isVisible"
             render={({ field }) => (
               <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                 <div className="space-y-0.5">
                   <FormLabel className="text-base">
                     Visibile agli utenti
                   </FormLabel>
                   <FormDescription>
                     Quando attivo, gli utenti possono vedere e prenotare questo corso
                   </FormDescription>
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
            <CardTitle className="text-lg flex items-center gap-1">
              Benefici del Corso 
              <span className="text-destructive">*</span>
            </CardTitle>
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

        {/* Course Period */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-1">
              Periodo del Corso 
              <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data di Inizio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Seleziona data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data di Fine</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Seleziona data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date <= form.getValues('startDate')}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="autoGenerateSessions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Genera Sessioni Automaticamente
                    </FormLabel>
                    <FormDescription>
                      Crea automaticamente le sessioni del corso in base agli orari e al periodo selezionato
                    </FormDescription>
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
          </CardContent>
        </Card>

        {/* Schedule and Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-1">
              Orari e Sessioni
              <span className="text-destructive">*</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orari Ricorrenti</FormLabel>
                  <FormControl>
                    <CourseSessionManager
                      courseId={mode === 'edit' ? course?.id : undefined}
                      startDate={form.watch('startDate')}
                      endDate={form.watch('endDate')}
                      schedules={field.value.map(s => ({
                        day_of_week: s.dayOfWeek,
                        start_time: s.time,
                        end_time: '',
                        room_id: s.roomId,
                        room_name: gymRooms.find(r => r.id === s.roomId)?.name || ''
                      }))}
                      maxParticipants={form.watch('maxParticipants')}
                      onSessionsChange={setSessions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Error Summary */}
        {Object.keys(form.formState.errors).length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h3 className="font-medium text-destructive mb-2">Errori di validazione:</h3>
            <ul className="text-sm space-y-1">
              {Object.entries(form.formState.errors).map(([field, error]) => (
                <li key={field} className="text-destructive">
                  • {error?.message || `Campo ${field} non valido`}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            size="lg"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
            className="min-w-[140px]"
          >
            {form.formState.isSubmitting ? 'Salvataggio...' : (mode === 'create' ? 'Crea Corso' : 'Salva Modifiche')}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            size="lg"
            onClick={() => navigate('/owner/courses')}
            disabled={form.formState.isSubmitting}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};