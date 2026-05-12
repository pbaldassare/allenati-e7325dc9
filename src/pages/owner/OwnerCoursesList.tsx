import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Edit, Copy, Eye, Users, EyeOff, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CourseParticipantOverview } from "@/components/CourseParticipantOverview";
import { useToast } from "@/hooks/use-toast";
import { autoGenerateSessionsIfNeeded } from '@/lib/sessionGenerator';
import { CourseDeleteConfirmDialog } from "@/components/dialogs/CourseDeleteConfirmDialog";

import { useIsMobile } from '@/hooks/use-mobile';
import { useOwnerGym } from '@/contexts/OwnerGymContext';
import {
  isCourseActivationError,
  COURSE_ACTIVATION_ERROR_MESSAGE,
  loadValidSchedulesMap,
} from '@/lib/courseValidation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CourseItem {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  max_participants: number;
  created_at?: string;
  category?: {
    name: string;
  };
  instructor?: {
    user: {
      first_name: string;
      last_name: string;
    };
  };
  credits_required: number;
  difficulty_level?: number;
  schedules?: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    room_name?: string;
  }>;
  has_valid_schedule?: boolean;
}

const OwnerCoursesList: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { selectedGym } = useOwnerGym();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<CourseItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Corsi | Area Proprietario";
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredCourses(courses);
    } else {
      const filtered = courses.filter(course => 
        course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.category?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.instructor?.user && 
          `${course.instructor.user.first_name} ${course.instructor.user.last_name}`
            .toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredCourses(filtered);
    }
  }, [searchTerm, courses]);

  useEffect(() => {
    const load = async () => {
      if (!selectedGym?.id) {
        setCourses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        console.log('Loading courses for gym:', selectedGym.id);

        // Fetch courses with separate queries for better compatibility
        const { data, error } = await supabase
          .from("courses")
          .select(`
            id,
            name,
            description,
            is_active,
            max_participants,
            credits_required,
            difficulty_level,
            created_at,
            category_id,
            instructor_id
          `)
          .eq('gym_id', selectedGym.id)
          .order("created_at", { ascending: false });
        
        if (error) {
          console.error('Error loading courses:', error);
          toast({
            title: 'Errore',
            description: 'Impossibile caricare i corsi',
            variant: 'destructive',
          });
        } else if (data) {
          console.log('Loaded courses:', data);
          
          // Get categories, instructors and schedules separately
          const categoryIds = [...new Set(data.map(c => c.category_id).filter(Boolean))];
          const instructorIds = [...new Set(data.map(c => c.instructor_id).filter(Boolean))];
          const courseIds = data.map(c => c.id);
          
          console.log('Instructor IDs from courses:', instructorIds);
          
          // Fetch categories
          const categoriesPromise = categoryIds.length > 0 
            ? supabase.from('course_categories').select('id, name').in('id', categoryIds)
            : Promise.resolve({ data: [] });
            
          // Fetch instructors with profiles using separate query approach  
          let instructorsWithProfiles: any[] = [];
          if (instructorIds.length > 0) {
            const { data: instructorsData, error: instructorsError } = await supabase
              .from('instructors')
              .select('id, user_id')
              .in('id', instructorIds);
              
            console.log('Instructors data:', instructorsData, 'Error:', instructorsError);
              
            if (instructorsData && instructorsData.length > 0) {
              const userIds = instructorsData.map(i => i.user_id);
              const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, first_name, last_name, email')
                .in('user_id', userIds);
                
              console.log('Profiles data:', profilesData, 'Error:', profilesError);
                
              instructorsWithProfiles = instructorsData.map(instructor => {
                const profile = profilesData?.find(p => p.user_id === instructor.user_id);
                const result = {
                  id: instructor.id,
                  user_id: instructor.user_id,
                  first_name: profile?.first_name || 'Nome',
                  last_name: profile?.last_name || 'Cognome',
                  email: profile?.email || 'Email non disponibile'
                };
                console.log(`Instructor ${instructor.id} mapped to:`, result);
                return result;
              });
            }
          }
          
          console.log('Final instructorsWithProfiles:', instructorsWithProfiles);
          
          const instructorsPromise = Promise.resolve({ data: instructorsWithProfiles });

          // Fetch course schedules
          const schedulesPromise = courseIds.length > 0 
            ? supabase.from('course_schedules')
                     .select('course_id, day_of_week, start_time, end_time, room_name')
                     .in('course_id', courseIds)
                     .eq('is_active', true)
            : Promise.resolve({ data: [] });

          const [categoriesResult, instructorsResult, schedulesResult] = await Promise.all([
            categoriesPromise,
            instructorsPromise,
            schedulesPromise
          ]);

          const categoriesMap = new Map(
            (categoriesResult.data || []).map(cat => [cat.id, cat])
          );
          
          const instructorsMap = new Map(
            (instructorsResult.data || []).map(inst => [inst.id, inst])
          );

          // Group schedules by course_id
          const schedulesMap = new Map();
          (schedulesResult.data || []).forEach(schedule => {
            if (!schedulesMap.has(schedule.course_id)) {
              schedulesMap.set(schedule.course_id, []);
            }
            schedulesMap.get(schedule.course_id).push(schedule);
          });
          
          console.log('Categories Map:', categoriesMap);
          console.log('Instructors Map:', instructorsMap);
          console.log('Schedules Map:', schedulesMap);

          // Calcola validità schedule (orario attivo + sala assegnata)
          const validMap = await loadValidSchedulesMap(courseIds);

          // Transform the data to match our interface
          const transformedCourses = data.map(course => {
            const category = course.category_id ? categoriesMap.get(course.category_id) || null : null;
            const instructorData = course.instructor_id ? instructorsMap.get(course.instructor_id) : null;
            const schedules = schedulesMap.get(course.id) || [];

            return {
              id: course.id,
              name: course.name,
              description: course.description,
              is_active: course.is_active,
              max_participants: course.max_participants,
              credits_required: course.credits_required,
              difficulty_level: course.difficulty_level,
              created_at: course.created_at,
              category,
              instructor: instructorData ? {
                user: instructorData
              } : null,
              schedules,
              has_valid_schedule: validMap.get(course.id) === true,
            };
          });
          
          setCourses(transformedCourses);
        } else {
          console.log('No courses found');
          setCourses([]);
        }
      } catch (error) {
        console.error('Unexpected error loading courses:', error);
        toast({
          title: 'Errore',
          description: 'Errore imprevisto durante il caricamento dei corsi',
          variant: 'destructive',
        });
      }
      setLoading(false);
    };
    load();
  }, [selectedGym?.id, toast]);

  const duplicateCourse = async (courseId: string) => {
    try {
      setDuplicating(courseId);
      
      if (!selectedGym?.id) {
        throw new Error('Nessuna palestra selezionata');
      }

      console.log('Duplicating course:', courseId);

      // Step 1: Get original course data
      const { data: originalCourse, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      if (!originalCourse) throw new Error('Corso non trovato');

      // Step 2: Get original schedules
      const { data: originalSchedules, error: schedulesError } = await supabase
        .from('course_schedules')
        .select('*')
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (schedulesError) throw schedulesError;

      console.log('Original schedules:', originalSchedules);

      // Step 3: Calculate new dates (today + 12 weeks)
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (12 * 7)); // 12 weeks

      // Step 4: Create duplicate course
      const { 
        name, description, category_id, instructor_id, max_participants,
        duration_minutes, difficulty_level, price_per_session,
        credits_required, requirements, benefits, equipment_needed,
        image_url, deadline_hours, reserved_spots
      } = originalCourse;

      const { data: newCourse, error: insertError } = await supabase
        .from('courses')
        .insert({
          name: `${name} (Copia)`,
          description,
          category_id,
          instructor_id,
          max_participants,
          duration_minutes,
          difficulty_level,
          price_per_session,
          credits_required,
          requirements,
          benefits,
          equipment_needed,
          image_url,
          deadline_hours,
          reserved_spots,
          gym_id: selectedGym.id,
          is_active: false, // Start as inactive
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          duration_weeks: 12
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newCourse) throw new Error('Errore nella creazione del corso');

      console.log('New course created:', newCourse.id);

      // Step 5: Duplicate schedules
      if (originalSchedules && originalSchedules.length > 0) {
        const newSchedules = originalSchedules.map(schedule => ({
          course_id: newCourse.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          room_id: schedule.room_id,
          room_name: schedule.room_name,
          is_active: true
        }));

        const { error: scheduleInsertError } = await supabase
          .from('course_schedules')
          .insert(newSchedules);

        if (scheduleInsertError) throw scheduleInsertError;
        
        console.log('Schedules duplicated successfully');
      }

      // Step 6: Generate sessions automatically
      console.log('Triggering automatic session generation');
      await autoGenerateSessionsIfNeeded(newCourse.id);

      toast({
        title: 'Successo',
        description: 'Corso duplicato con successo. Modifica le date e gli orari prima di attivarlo.',
      });

      // Redirect to edit page
      navigate(`/owner/courses/${newCourse.id}/edit`);

    } catch (error) {
      console.error('Error duplicating course:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile duplicare il corso',
        variant: 'destructive',
      });
    } finally {
      setDuplicating(null);
    }
  };

  const deleteCourse = async () => {
    if (!deletingCourse) return;

    try {
      setIsDeleting(true);
      console.log('Deleting course:', deletingCourse.id);

      // Step 1: Cancel all active bookings for this course
      const { error: bookingsError } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Corso eliminato',
          cancelled_at: new Date().toISOString()
        })
        .eq('course_id', deletingCourse.id)
        .eq('status', 'confirmed');

      if (bookingsError) {
        console.error('Error cancelling bookings:', bookingsError);
        throw new Error('Errore durante la cancellazione delle prenotazioni');
      }

      // Step 2: Delete all sessions (this will cascade to bookings via foreign keys)
      const { error: sessionsError } = await supabase
        .from('course_sessions')
        .delete()
        .eq('course_id', deletingCourse.id);

      if (sessionsError) {
        console.error('Error deleting sessions:', sessionsError);
        throw new Error('Errore durante l\'eliminazione delle sessioni');
      }

      // Step 3: Delete all schedules
      const { error: schedulesError } = await supabase
        .from('course_schedules')
        .delete()
        .eq('course_id', deletingCourse.id);

      if (schedulesError) {
        console.error('Error deleting schedules:', schedulesError);
        throw new Error('Errore durante l\'eliminazione degli orari');
      }

      // Step 4: Delete schedule exceptions
      const { error: exceptionsError } = await supabase
        .from('course_schedule_exceptions')
        .delete()
        .eq('course_id', deletingCourse.id);

      if (exceptionsError) {
        console.error('Error deleting exceptions:', exceptionsError);
      }

      // Step 5: Delete the course itself
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', deletingCourse.id);

      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw new Error('Errore durante l\'eliminazione del corso');
      }

      toast({
        title: 'Successo',
        description: `Corso "${deletingCourse.name}" eliminato con successo`,
      });

      // Reload the page
      window.location.reload();

    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile eliminare il corso',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeletingCourse(null);
    }
  };

  const toggleCourseStatus = async (course: CourseItem) => {
    // Blocco preventivo lato UI: se sto attivando un corso senza orari validi
    // mostro subito il messaggio amichevole senza colpire il DB.
    if (!course.is_active && !course.has_valid_schedule) {
      toast({
        title: 'Impossibile attivare',
        description: COURSE_ACTIVATION_ERROR_MESSAGE,
        variant: 'destructive',
      });
      return;
    }
    try {
      setTogglingStatus(course.id);
      const newStatus = !course.is_active;
      
      // Update course status in database
      const { data, error } = await supabase
        .from('courses')
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', course.id)
        .select()
        .single();

      if (error) throw error;

      console.log('Course status updated successfully:', data);

      // If deactivating, hide all future sessions
      if (!newStatus) {
        const today = new Date().toISOString().split('T')[0];
        
        const { error: sessionsError } = await supabase
          .from('course_sessions')
          .update({ 
            status: 'hidden',
            updated_at: new Date().toISOString()
          })
          .eq('course_id', course.id)
          .eq('status', 'scheduled')
          .gte('session_date', today);

        if (sessionsError) {
          console.error('Error hiding sessions:', sessionsError);
        } else {
          console.log('Future sessions hidden successfully');
        }
      } else {
        // If reactivating, restore hidden sessions
        const today = new Date().toISOString().split('T')[0];
        
        const { error: sessionsError } = await supabase
          .from('course_sessions')
          .update({ 
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('course_id', course.id)
          .eq('status', 'hidden')
          .gte('session_date', today);

        if (sessionsError) {
          console.error('Error restoring sessions:', sessionsError);
        } else {
          console.log('Future sessions restored successfully');
        }
      }

      toast({
        title: 'Successo',
        description: `Corso "${course.name}" ${newStatus ? 'attivato' : 'disattivato'} con successo`,
      });

      // Force reload to ensure fresh data
      console.log('Reloading courses list...');
      window.location.reload();

    } catch (error) {
      console.error('Error toggling course status:', error);
      const isActivationErr = isCourseActivationError(error);
      toast({
        title: 'Errore',
        description: isActivationErr
          ? COURSE_ACTIVATION_ERROR_MESSAGE
          : (error instanceof Error ? error.message : 'Impossibile modificare lo stato del corso'),
        variant: 'destructive',
      });
    } finally {
      setTogglingStatus(null);
    }
  };

  const getDifficultyBadge = (level?: number) => {
    if (!level) return null;
    const variants = {
      1: { label: 'Principiante', variant: 'secondary' as const },
      2: { label: 'Intermedio', variant: 'default' as const },
      3: { label: 'Avanzato', variant: 'destructive' as const }
    };
    const difficulty = variants[level as keyof typeof variants];
    return difficulty ? <Badge variant={difficulty.variant}>{difficulty.label}</Badge> : null;
  };

  const getScheduleDisplay = (schedules?: CourseItem['schedules']) => {
    if (!schedules || schedules.length === 0) {
      return <span className="text-muted-foreground text-sm">Nessun programma</span>;
    }

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    
    const sortedSchedules = schedules.sort((a, b) => a.day_of_week - b.day_of_week);
    const displaySchedules = sortedSchedules.slice(0, 2);
    const remainingCount = sortedSchedules.length - 2;
    
    return (
      <div className="space-y-1">
        {displaySchedules.map((schedule, index) => (
          <div key={index} className="text-sm">
            <span className="font-medium">{dayNames[schedule.day_of_week]}</span>
            <span className="text-muted-foreground ml-2">
              {schedule.start_time} - {schedule.end_time}
            </span>
            {schedule.room_name && (
              <span className="text-xs text-muted-foreground ml-2">
                ({schedule.room_name})
              </span>
            )}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="text-xs text-muted-foreground font-medium">
            +{remainingCount} altri orari
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Corsi
          </h1>
          <p className="text-muted-foreground">
            Gestisci tutti i corsi della palestra
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/owner/courses/new")}>
            Nuovo Corso
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca corsi, istruttori, categorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elenco Corsi ({filteredCourses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Caricamento corsi...</p>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nessun corso trovato per la ricerca.' : 'Nessun corso configurato.'}
              </p>
              {!searchTerm && (
                <Button 
                  className="mt-4" 
                  onClick={() => navigate("/owner/courses/new")}
                >
                  Crea il primo corso
                </Button>
              )}
            </div>
          ) : isMobile ? (
            // Mobile Card Layout
            <div className="space-y-4">
              {filteredCourses.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{course.name}</CardTitle>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {course.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <Badge variant={course.is_active ? "default" : "secondary"}>
                          {course.is_active ? "Attivo" : "Disattivo"}
                        </Badge>
                        {!course.has_valid_schedule && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            Senza orario
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="font-medium">Istruttore:</span>
                        <div className="text-muted-foreground">
                          {course.instructor?.user ? (
                            `${course.instructor.user.first_name} ${course.instructor.user.last_name}`
                          ) : (
                            "Non assegnato"
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Categoria:</span>
                        <div className="text-muted-foreground">
                          {course.category ? (
                            <Badge variant="outline" className="mt-1">{course.category.name}</Badge>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Livello:</span>
                        <div className="mt-1">
                          {getDifficultyBadge(course.difficulty_level)}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Crediti:</span>
                        <div className="mt-1">
                          <Badge variant="secondary">{course.credits_required}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-sm">Programma:</span>
                      <div className="mt-1">
                        {getScheduleDisplay(course.schedules)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium text-sm">Partecipanti:</span>
                      <div className="mt-1">
                        <CourseParticipantOverview 
                          courseId={course.id} 
                          maxParticipants={course.max_participants}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/owner/courses/${course.id}`)}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizza
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => navigate(`/owner/courses/${course.id}/edit`)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifica
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => duplicateCourse(course.id)}
                        disabled={duplicating === course.id}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant={course.is_active ? "destructive" : "default"}
                        onClick={() => toggleCourseStatus(course)}
                        disabled={togglingStatus === course.id}
                      >
                        {course.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => setDeletingCourse(course)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Desktop Table Layout
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Istruttore</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Livello</TableHead>
                  <TableHead>Programma</TableHead>
                  <TableHead>Partecipanti</TableHead>
                  <TableHead>Crediti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{course.name}</div>
                        {course.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {course.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {course.instructor?.user ? (
                        `${course.instructor.user.first_name} ${course.instructor.user.last_name}`
                      ) : (
                        <span className="text-muted-foreground">Non assegnato</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {course.category ? (
                        <Badge variant="outline">{course.category.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getDifficultyBadge(course.difficulty_level)}
                    </TableCell>
                    <TableCell>
                      {getScheduleDisplay(course.schedules)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CourseParticipantOverview 
                          courseId={course.id} 
                          maxParticipants={course.max_participants}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{course.credits_required}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={course.is_active ? "default" : "secondary"}>
                          {course.is_active ? "Attivo" : "Disattivo"}
                        </Badge>
                        {!course.has_valid_schedule && (
                          <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                            Senza orario
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/owner/courses/${course.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/owner/courses/${course.id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateCourse(course.id)}
                              disabled={duplicating === course.id}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {duplicating === course.id ? 'Duplicando...' : 'Duplica'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleCourseStatus(course)}
                              disabled={togglingStatus === course.id}
                              className={course.is_active 
                                ? "text-destructive focus:text-destructive" 
                                : "text-green-600 focus:text-green-600"
                              }
                            >
                              {course.is_active ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  {togglingStatus === course.id ? 'Disattivando...' : 'Disattiva'}
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  {togglingStatus === course.id ? 'Attivando...' : 'Attiva'}
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingCourse(course)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CourseDeleteConfirmDialog
        open={!!deletingCourse}
        onOpenChange={(open) => !open && setDeletingCourse(null)}
        onConfirm={deleteCourse}
        courseNames={deletingCourse ? [deletingCourse.name] : []}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default OwnerCoursesList;
