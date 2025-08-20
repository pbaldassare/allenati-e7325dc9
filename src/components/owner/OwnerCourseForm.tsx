import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
import { CourseScheduleExceptions, ScheduleException } from './CourseScheduleExceptions';
import { ManualEnrollment } from './ManualEnrollment';

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
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'schedule' | 'exceptions' | 'enrollment'>('general');
  
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

        // Load existing exceptions if editing
        if (mode === 'edit' && course?.id) {
          loadExceptions(course.id);
        }

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
  }, [toast, mode, course]);

  // Load course exceptions
  const loadExceptions = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_schedule_exceptions')
        .select('*')
        .eq('course_id', courseId)
        .order('start_date');

      if (error) throw error;

      const mappedExceptions = data?.map(exception => ({
        id: exception.id,
        start_date: new Date(exception.start_date),
        end_date: new Date(exception.end_date),
        reason: exception.reason || '',
      })) || [];

      setExceptions(mappedExceptions);
    } catch (error) {
      console.error('Error loading exceptions:', error);
    }
  };

  // Save course exceptions
  const saveExceptions = async (courseId: string) => {
    try {
      // Delete existing exceptions
      const { error: deleteError } = await supabase
        .from('course_schedule_exceptions')
        .delete()
        .eq('course_id', courseId);

      if (deleteError) throw deleteError;

      // Insert new exceptions
      if (exceptions.length > 0) {
        const { data: user } = await supabase.auth.getUser();
        const exceptionsToInsert = exceptions.map(exception => ({
          course_id: courseId,
          start_date: exception.start_date.toISOString().split('T')[0],
          end_date: exception.end_date.toISOString().split('T')[0],
          reason: exception.reason,
          created_by: user.user?.id,
        }));

        const { error: insertError } = await supabase
          .from('course_schedule_exceptions')
          .insert(exceptionsToInsert);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error saving exceptions:', error);
      throw error;
    }
  };

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
        end_date: data.endDate.toISOString().split('T')[0]
      };

      let courseId: string;

      if (mode === 'create') {
        const { data: newCourse, error } = await supabase
          .from('courses')
          .insert([courseData])
          .select()
          .single();

        if (error) throw error;
        courseId = newCourse.id;

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
      } else if (mode === 'edit' && course) {
        courseId = course.id;
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
        }
      } else {
        throw new Error('Course ID not available');
      }

      // Save exceptions
      await saveExceptions(courseId);

      // Generate sessions with exceptions if dates are provided
      if (data.startDate && data.endDate) {
        const { error: sessionError } = await supabase.rpc('generate_course_sessions_with_exceptions', {
          _course_id: courseId,
          _start_date: data.startDate.toISOString().split('T')[0],
          _end_date: data.endDate.toISOString().split('T')[0]
        });
        
        if (sessionError) {
          console.error('Error generating sessions:', sessionError);
          toast({
            title: "Avviso",
            description: "Corso salvato ma errore nella generazione delle sessioni",
            variant: "destructive"
          });
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-lg text-muted-foreground">Caricamento dati...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'general' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Informazioni Generali
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'schedule' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Programmazione
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('exceptions')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'exceptions' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Eccezioni
        </button>
        {mode === 'edit' && course?.id && (
          <button
            type="button"
            onClick={() => setActiveTab('enrollment')}
            className={`px-4 py-2 border-b-2 transition-colors ${
              activeTab === 'enrollment' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Iscrizioni Manuali
          </button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Corso *</FormLabel>
                      <FormControl>
                        <Input placeholder="Es. Yoga Mattutino" {...field} />
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
                      <FormLabel>Categoria *</FormLabel>
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrivi il corso..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="instructor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Istruttore *</FormLabel>
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
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Livello *</FormLabel>
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
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (minuti) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="60" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Course Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Partecipanti *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="20" {...field} />
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
                      <FormLabel>Posti Riservati</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormDescription>
                        Numero di posti riservati per iscrizioni dell'ultimo minuto
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€) *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="15.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="deadlineHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline Prenotazione (ore) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" placeholder="24" {...field} />
                    </FormControl>
                    <FormDescription>
                      Ore prima dell'inizio del corso entro cui è possibile prenotare
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
                    <FormDescription>
                      URL dell'immagine che rappresenta il corso
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Benefits */}
              <FormField
                control={form.control}
                name="benefits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Benefici del Corso *</FormLabel>
                    <FormDescription>
                      Elenca i principali benefici che i partecipanti otterranno
                    </FormDescription>
                    <div className="space-y-2">
                      {field.value.map((benefit, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Es. Migliora la flessibilità"
                            value={benefit}
                            onChange={(e) => {
                              const newBenefits = [...field.value];
                              newBenefits[index] = e.target.value;
                              field.onChange(newBenefits);
                            }}
                          />
                          {field.value.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                const newBenefits = field.value.filter((_, i) => i !== index);
                                field.onChange(newBenefits);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => field.onChange([...field.value, ''])}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Beneficio
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Requirements */}
              <FormField
                control={form.control}
                name="requirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requisiti (opzionale)</FormLabel>
                    <FormDescription>
                      Eventuali prerequisiti o attrezzature richieste
                    </FormDescription>
                    <div className="space-y-2">
                      {field.value?.map((requirement, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Es. Tappetino yoga"
                            value={requirement}
                            onChange={(e) => {
                              const newRequirements = [...(field.value || [])];
                              newRequirements[index] = e.target.value;
                              field.onChange(newRequirements);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const newRequirements = (field.value || []).filter((_, i) => i !== index);
                              field.onChange(newRequirements);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )) || []}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => field.onChange([...(field.value || []), ''])}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Requisito
                      </Button>
                    </div>
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
                      <FormLabel className="text-base">Corso Attivo</FormLabel>
                      <FormDescription>
                        Il corso sarà visibile e prenotabile dagli utenti
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

              {/* Course Period */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Periodo del Corso</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Inizio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
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
                              disabled={(date) => date < new Date()}
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
                        <FormLabel>Data Fine</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
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
                              disabled={(date) => date < new Date()}
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
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Programmazione Settimanale</h3>
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orari Settimanali *</FormLabel>
                    <FormDescription>
                      Configura gli orari ricorrenti del corso per ogni settimana
                    </FormDescription>
                    <div className="space-y-4">
                      {field.value.map((schedule, index) => (
                        <Card key={index}>
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <FormLabel>Giorno</FormLabel>
                                <Select
                                  value={schedule.dayOfWeek.toString()}
                                  onValueChange={(value) => {
                                    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
                                    const newSchedule = [...field.value];
                                    newSchedule[index] = {
                                      ...schedule,
                                      dayOfWeek: parseInt(value),
                                      day: dayNames[parseInt(value)]
                                    };
                                    field.onChange(newSchedule);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">Lunedì</SelectItem>
                                    <SelectItem value="2">Martedì</SelectItem>
                                    <SelectItem value="3">Mercoledì</SelectItem>
                                    <SelectItem value="4">Giovedì</SelectItem>
                                    <SelectItem value="5">Venerdì</SelectItem>
                                    <SelectItem value="6">Sabato</SelectItem>
                                    <SelectItem value="0">Domenica</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <FormLabel>Orario</FormLabel>
                                <Input
                                  type="time"
                                  value={schedule.time}
                                  onChange={(e) => {
                                    const newSchedule = [...field.value];
                                    newSchedule[index] = { ...schedule, time: e.target.value };
                                    field.onChange(newSchedule);
                                  }}
                                />
                              </div>

                              <div>
                                <FormLabel>Sala</FormLabel>
                                <Select
                                  value={schedule.roomId}
                                  onValueChange={(value) => {
                                    const newSchedule = [...field.value];
                                    newSchedule[index] = { ...schedule, roomId: value };
                                    field.onChange(newSchedule);
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleziona sala" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {gymRooms.map((room) => (
                                      <SelectItem key={room.id} value={room.id}>
                                        {room.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex items-end">
                                {field.value.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => {
                                      const newSchedule = field.value.filter((_, i) => i !== index);
                                      field.onChange(newSchedule);
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          field.onChange([
                            ...field.value,
                            { dayOfWeek: 1, time: '09:00', roomId: '', day: 'Lunedì' }
                          ]);
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Orario
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {activeTab === 'exceptions' && (
            <CourseScheduleExceptions
              exceptions={exceptions}
              onChange={setExceptions}
            />
          )}

          {activeTab === 'enrollment' && mode === 'edit' && course?.id && (
            <ManualEnrollment
              courseId={course.id}
              courseName={course.name}
            />
          )}

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
            >
              Annulla
            </Button>
            {activeTab !== 'enrollment' && (
              <Button type="submit">
                {mode === 'create' ? 'Crea Corso' : 'Aggiorna Corso'}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};