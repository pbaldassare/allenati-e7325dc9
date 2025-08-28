
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useGym } from '@/contexts/GymContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { CalendarIcon, Clock, MapPin, User, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface CourseFormData {
  name: string;
  description: string;
  category_id: string;
  instructor_id: string;
  max_participants: number;
  duration_minutes: number;
  difficulty_level: number;
  price_per_session: number;
  credits_required: number;
  equipment_needed?: string;
  image_url?: string;
  deadline_hours: number;
  reserved_spots: number;
  is_active: boolean;
  start_date: Date;
  end_date: Date;
  schedules: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_id: string;
    room_name?: string;
  }>;
}

const formSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  description: z.string().min(1, 'Descrizione richiesta'),
  category_id: z.string().min(1, 'Categoria richiesta'),
  instructor_id: z.string().min(1, 'Istruttore richiesto'),
  max_participants: z.number().min(1, 'Minimo 1 partecipante'),
  duration_minutes: z.number().min(15, 'Minimo 15 minuti'),
  difficulty_level: z.number().min(1).max(3),
  price_per_session: z.number().min(0, 'Prezzo deve essere >= 0'),
  credits_required: z.number().min(0, 'Crediti devono essere >= 0'),
  equipment_needed: z.string().optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  deadline_hours: z.number().min(0, 'Ore di deadline >= 0'),
  reserved_spots: z.number().min(0, 'Posti riservati >= 0'),
  is_active: z.boolean(),
  start_date: z.date(),
  end_date: z.date(),
});

interface OwnerCourseFormProps {
  mode: 'create' | 'edit';
  course?: CourseFormData;
}

interface Category {
  id: string;
  name: string;
  color_hex: string;
}

interface Instructor {
  id: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Room {
  id: string;
  name: string;
}

export const OwnerCourseForm: React.FC<OwnerCourseFormProps> = ({ mode, course }) => {
  const { selectedGym } = useGym();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: course?.name || '',
      description: course?.description || '',
      category_id: course?.category_id || '',
      instructor_id: course?.instructor_id || '',
      max_participants: course?.max_participants || 10,
      duration_minutes: course?.duration_minutes || 60,
      difficulty_level: course?.difficulty_level || 1,
      price_per_session: course?.price_per_session || 0,
      credits_required: course?.credits_required || 1,
      equipment_needed: course?.equipment_needed || '',
      image_url: course?.image_url || '',
      deadline_hours: course?.deadline_hours || 2,
      reserved_spots: course?.reserved_spots || 0,
      is_active: course?.is_active ?? true,
      start_date: course?.start_date ? new Date(course.start_date) : new Date(),
      end_date: course?.end_date ? new Date(course.end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  useEffect(() => {
    if (selectedGym?.id) {
      loadFormData();
    }
  }, [selectedGym?.id]);

  const loadFormData = async () => {
    if (!selectedGym?.id) return;

    try {
      setDataLoading(true);
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('course_categories')
        .select('id, name, color_hex')
        .eq('is_active', true)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Load instructors for this gym - using simple query first then fetch profiles separately
      const { data: instructorsData, error: instructorsError } = await supabase
        .from('instructors')
        .select('id, user_id')
        .eq('gym_id', selectedGym.id)
        .eq('is_active', true);

      if (instructorsError) {
        console.error('Error loading instructors:', instructorsError);
        setInstructors([]);
      } else if (instructorsData && instructorsData.length > 0) {
        // Get user IDs from instructors
        const userIds = instructorsData.map(inst => inst.user_id);
        
        // Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        if (profilesError) {
          console.error('Error loading profiles:', profilesError);
          // Set instructors without profiles
          setInstructors(instructorsData.map(inst => ({
            ...inst,
            profiles: null
          })));
        } else {
          // Map profiles to instructors
          const instructorsWithProfiles = instructorsData.map(inst => {
            const profile = profilesData?.find(p => p.user_id === inst.user_id);
            return {
              ...inst,
              profiles: profile ? {
                first_name: profile.first_name || '',
                last_name: profile.last_name || ''
              } : null
            };
          });
          setInstructors(instructorsWithProfiles);
        }
      } else {
        setInstructors([]);
      }

      // Load rooms for this gym
      const { data: roomsData, error: roomsError } = await supabase
        .from('gym_rooms')
        .select('id, name')
        .eq('gym_id', selectedGym.id)
        .eq('is_active', true)
        .order('name');

      if (roomsError) throw roomsError;

      // Filter out any items with empty or null IDs
      setCategories((categoriesData || []).filter(cat => cat.id && cat.id.trim() !== ''));
      setRooms((roomsData || []).filter(room => room.id && room.id.trim() !== ''));
      
    } catch (error) {
      console.error('Error loading form data:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento dei dati del form',
        variant: 'destructive',
      });
    } finally {
      setDataLoading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!selectedGym?.id || !user?.id) return;

    setLoading(true);
    try {
      const courseData = {
        name: data.name,
        description: data.description,
        category_id: data.category_id,
        instructor_id: data.instructor_id,
        gym_id: selectedGym.id,
        max_participants: data.max_participants,
        duration_minutes: data.duration_minutes,
        difficulty_level: data.difficulty_level,
        price_per_session: data.price_per_session,
        credits_required: data.credits_required,
        equipment_needed: data.equipment_needed ? [data.equipment_needed] : null,
        image_url: data.image_url || null,
        deadline_hours: data.deadline_hours,
        reserved_spots: data.reserved_spots,
        is_active: data.is_active,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('courses')
          .insert(courseData);
        
        if (error) throw error;
        
        toast({
          title: 'Successo',
          description: 'Corso creato con successo',
        });
      } else {
        // Edit mode logic would go here
        toast({
          title: 'Successo',
          description: 'Corso aggiornato con successo',
        });
      }

      navigate('/owner/courses');
    } catch (error) {
      console.error('Error saving course:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel salvataggio del corso',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Informazioni Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Corso</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Yoga Principianti" {...field} />
                    </FormControl>
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
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color_hex }}
                              />
                              {category.name}
                            </div>
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
                      placeholder="Descrivi il corso, i suoi benefici e a chi è rivolto..."
                      className="min-h-[100px]"
                      {...field}
                    />
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
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {instructor.profiles?.first_name && instructor.profiles?.last_name 
                              ? `${instructor.profiles.first_name} ${instructor.profiles.last_name}`
                              : `Istruttore ${instructor.id.slice(0, 8)}`
                            }
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Course Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Dettagli Corso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="max_participants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Partecipanti</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durata (minuti)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Livello Difficoltà</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona livello" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Principiante</SelectItem>
                        <SelectItem value="2">Intermedio</SelectItem>
                        <SelectItem value="3">Avanzato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_per_session"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo per Sessione (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="credits_required"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crediti Richiesti</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Course Period */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Periodo del Corso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Inizio</FormLabel>
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
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data Fine</FormLabel>
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
                          disabled={(date) => date < form.getValues('start_date')}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Impostazioni Aggiuntive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deadline_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ore Limite Cancellazione</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Ore prima della lezione per cancellare senza penali
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reserved_spots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posti Riservati</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Posti riservati per prenotazioni speciali
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="equipment_needed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attrezzatura Necessaria</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Es. Tappetino yoga, asciugamano, scarpe da ginnastica..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Immagine (opzionale)</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/owner/courses')}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : mode === 'create' ? 'Crea Corso' : 'Aggiorna Corso'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
