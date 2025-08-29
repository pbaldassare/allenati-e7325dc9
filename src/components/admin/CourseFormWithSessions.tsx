import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CourseScheduleManager } from './CourseScheduleManager';
import { CourseSessionManager } from './CourseSessionManager';
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
import { X, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoGenerateSessionsIfNeeded } from '@/lib/sessionGenerator';
import { supabase } from '@/integrations/supabase/client';

const courseSchema = z.object({
  name: z.string().min(3, 'Il nome deve essere almeno 3 caratteri'),
  description: z.string().min(10, 'La descrizione deve essere almeno 10 caratteri'),
  instructor_id: z.string().min(1, 'Seleziona un istruttore'),
  category_id: z.string().min(1, 'Seleziona una categoria'),
  level: z.string().min(1, 'Seleziona un livello'),
  price: z.coerce.number().min(0, 'Il prezzo deve essere positivo'),
  maxParticipants: z.coerce.number().min(1, 'Massimo partecipanti deve essere almeno 1'),
  reservedSpots: z.coerce.number().min(0, 'I posti riservati non possono essere negativi').optional(),
  duration: z.coerce.number().min(15, 'La durata minima è 15 minuti'),
  deadlineHours: z.coerce.number().min(0.5, 'La deadline deve essere almeno 0.5 ore').default(24),
  image: z.string().url('Inserisci un URL valido per l\'immagine').optional().or(z.literal("")),
  benefits: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  startDate: z.date({ required_error: "Seleziona la data di inizio" }),
  endDate: z.date({ required_error: "Seleziona la data di fine" }),
  autoGenerateSessions: z.boolean().default(true),
  schedule: z.array(z.object({
    dayOfWeek: z.number(),
    time: z.string(),
    end_time: z.string().optional(),
    roomId: z.string().min(1, 'La sala è obbligatoria'),
    date: z.string().optional(),
    day: z.string().optional()
  })).min(1, 'È necessario inserire almeno un orario'),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  mode: 'create' | 'edit';
  course?: SupabaseCourse & { schedules?: any[] };
}

interface GymRoom {
  id: string;
  name: string;
}

interface Instructor {
  id: string;
  user_id: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

interface Category {
  id: string;
  name: string;
}

interface CourseSession {
  id?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  room_id?: string;
  room_name?: string;
  max_participants: number;
  available_spots: number;
  status: 'scheduled' | 'cancelled' | 'completed';
}

export const CourseFormWithSessions: React.FC<CourseFormProps> = ({ mode, course }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [gymRooms, setGymRooms] = useState<GymRoom[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load gym rooms
        const { data: roomsData } = await supabase
          .from('gym_rooms')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        // Load instructors
        const { data: instructorsData } = await supabase
          .from('instructors')
          .select('id, user_id')
          .eq('is_active', true);

        let instructorsWithProfiles: Instructor[] = [];
        if (instructorsData) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', instructorsData.map(i => i.user_id));

          instructorsWithProfiles = instructorsData.map(instructor => {
            const profile = profilesData?.find(p => p.user_id === instructor.user_id);
            return {
              id: instructor.id,
              user_id: instructor.user_id,
              profiles: profile ? {
                first_name: profile.first_name,
                last_name: profile.last_name
              } : undefined
            };
          });
        }

        // Load categories
        const { data: categoriesData } = await supabase
          .from('course_categories')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (roomsData) setGymRooms(roomsData);
        setInstructors(instructorsWithProfiles);
        if (categoriesData) setCategories(categoriesData);

      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Errore",
          description: "Errore nel caricamento dei dati",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [toast]);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? {
      name: course.name || '',
      description: course.description || '',
      instructor_id: course.instructor_id || '',
      category_id: course.category_id || '',
      level: course.difficulty_level === 1 ? 'Principiante' : 
             course.difficulty_level === 2 ? 'Intermedio' : 
             course.difficulty_level === 3 ? 'Avanzato' : 'Principiante',
      price: course.price_per_session || 0,
      maxParticipants: course.max_participants || 20,
      reservedSpots: course.reserved_spots || 0,
      duration: course.duration_minutes || 60,
      deadlineHours: course.deadline_hours || 24,
      image: course.image_url || '',
      benefits: course.benefits || [''],
      requirements: course.requirements || [''],
      startDate: (course as any).start_date ? new Date((course as any).start_date) : new Date(),
      endDate: (course as any).end_date ? new Date((course as any).end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoGenerateSessions: (course as any).auto_generate_sessions ?? true,
      schedule: course.schedules?.map((s: any) => ({
        dayOfWeek: s.day_of_week || 1,
        time: s.start_time || '09:00',
        end_time: s.end_time || '10:00',
        roomId: s.room_id || '',
        day: ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][s.day_of_week || 1],
        date: s.date
      })) || [{ dayOfWeek: 1, time: '09:00', end_time: '10:00', roomId: '', day: 'Lunedì' }],
    } : {
      name: '',
      description: '',
      instructor_id: '',
      category_id: '',
      level: 'Principiante',
      price: 0,
      maxParticipants: 20,
      reservedSpots: 0,
      duration: 60,
      deadlineHours: 24,
      image: '',
      benefits: [],
      requirements: [''],
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      autoGenerateSessions: true,
      schedule: [{ dayOfWeek: 1, time: '09:00', end_time: '10:00', roomId: '', day: 'Lunedì' }],
    },
  });

  const onSubmit = async (data: CourseFormData) => {
    try {
      console.log('Saving course data:', data);
      
      if (mode === 'create') {
        // Create new course
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert({
            name: data.name,
            description: data.description,
            instructor_id: data.instructor_id,
            category_id: data.category_id,
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
            start_date: format(data.startDate, 'yyyy-MM-dd'),
            end_date: format(data.endDate, 'yyyy-MM-dd'),
            auto_generate_sessions: data.autoGenerateSessions
          })
          .select()
          .single();

        if (courseError) throw courseError;
        
        // Genera automaticamente le sessioni se necessario
        await autoGenerateSessionsIfNeeded(courseData.id);

        // Create course schedules
        if (data.schedule && data.schedule.length > 0) {
          const schedules = data.schedule.map(schedule => {
            const [hours, minutes] = schedule.time.split(':').map(Number);
            const totalStartMinutes = hours * 60 + minutes;
            const totalEndMinutes = totalStartMinutes + data.duration;
            const endHours = Math.floor(totalEndMinutes / 60);
            const endMinutes = totalEndMinutes % 60;
            const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

            return {
              course_id: courseData.id,
              day_of_week: schedule.dayOfWeek,
              start_time: schedule.time,
              end_time: endTime,
              room_id: schedule.roomId
            };
          });

          const { error: scheduleError } = await supabase
            .from('course_schedules')
            .insert(schedules);

          if (scheduleError) throw scheduleError;
        }

        // Generate sessions if auto-generate is enabled
        if (data.autoGenerateSessions) {
          const { data: sessionCount, error: sessionError } = await supabase
            .rpc('generate_course_sessions', {
              _course_id: courseData.id,
              _start_date: format(data.startDate, 'yyyy-MM-dd'),
              _end_date: format(data.endDate, 'yyyy-MM-dd')
            });

          if (sessionError) throw sessionError;
          
          toast({
            title: 'Corso creato',
            description: `Il corso è stato creato con successo. Generate ${sessionCount} sessioni.`,
          });
        } else {
          toast({
            title: 'Corso creato',
            description: 'Il corso è stato creato con successo.',
          });
        }
      } else {
        // Update existing course
        const { error: courseError } = await supabase
          .from('courses')
          .update({
            name: data.name,
            description: data.description,
            instructor_id: data.instructor_id,
            category_id: data.category_id,
            difficulty_level: data.level === 'Principiante' ? 1 : data.level === 'Intermedio' ? 2 : 3,
            price_per_session: data.price,
            max_participants: data.maxParticipants,
            reserved_spots: data.reservedSpots || 0,
            duration_minutes: data.duration,
            deadline_hours: data.deadlineHours,
            image_url: data.image || null,
            benefits: data.benefits.filter(b => b.trim() !== ''),
            requirements: data.requirements?.filter(r => r.trim() !== '') || [],
            start_date: format(data.startDate, 'yyyy-MM-dd'),
            end_date: format(data.endDate, 'yyyy-MM-dd'),
            auto_generate_sessions: data.autoGenerateSessions
          })
          .eq('id', course?.id);

        if (courseError) throw courseError;

        // Genera automaticamente le sessioni se necessario
        await autoGenerateSessionsIfNeeded(course.id);

        // Update schedules
        if (course?.id) {
          const { error: deleteError } = await supabase
            .from('course_schedules')
            .delete()
            .eq('course_id', course.id);

          if (deleteError) throw deleteError;

          if (data.schedule && data.schedule.length > 0) {
            const schedules = data.schedule.map(schedule => {
              const [hours, minutes] = schedule.time.split(':').map(Number);
              const totalStartMinutes = hours * 60 + minutes;
              const totalEndMinutes = totalStartMinutes + data.duration;
              const endHours = Math.floor(totalEndMinutes / 60);
              const endMinutes = totalEndMinutes % 60;
              const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

              return {
                course_id: course.id,
                day_of_week: schedule.dayOfWeek,
                start_time: schedule.time,
                end_time: endTime,
                room_id: schedule.roomId
              };
            });

            const { error: scheduleError } = await supabase
              .from('course_schedules')
              .insert(schedules);

            if (scheduleError) throw scheduleError;
          }
        }

        toast({
          title: 'Corso aggiornato',
          description: 'Le modifiche sono state salvate con successo',
        });
      }

      navigate('/admin/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Errore',
        description: mode === 'create' 
          ? 'Errore durante la creazione del corso. Riprova più tardi.'
          : 'Errore durante il salvataggio delle modifiche. Riprova più tardi.',
        variant: 'destructive',
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

  const getInstructorName = (instructor: Instructor): string => {
    const profile = instructor.profiles;
    if (!profile) return 'Istruttore';
    const { first_name, last_name } = profile;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();
    return fullName || 'Istruttore';
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Course Date Range */}
        <Card>
          <CardHeader>
            <CardTitle>Periodo del Corso</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
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
                        className={cn("p-3 pointer-events-auto")}
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
                        disabled={(date) => date < form.getValues('startDate')}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Base</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
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
                          {getInstructorName(instructor)}
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona categoria" />
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
                    <Input type="number" step="0.01" placeholder="15.00" {...field} />
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
                    Ore prima dell'inizio entro cui si può prenotare/cancellare
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
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
          </CardContent>
        </Card>

        {/* Schedule Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Programmazione Orari</CardTitle>
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
                        end_time: item.end_time || '10:00',
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

        {/* Session Management */}
        <CourseSessionManager 
          courseId={course?.id}
          startDate={form.watch('startDate')}
          endDate={form.watch('endDate')}
          schedules={(form.watch('schedule') || []).map(s => ({
            day_of_week: s.dayOfWeek,
            start_time: s.time,
            end_time: s.time, // Will be calculated properly
            room_id: s.roomId,
            room_name: gymRooms.find(r => r.id === s.roomId)?.name
          }))}
          maxParticipants={form.watch('maxParticipants')}
          onSessionsChange={setSessions}
          autoGenerate={form.watch('autoGenerateSessions')}
        />

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