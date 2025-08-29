import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Edit, Copy, Eye, Users, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CourseParticipantOverview } from "@/components/CourseParticipantOverview";
import { useToast } from "@/hooks/use-toast";

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
}

const OwnerCoursesList: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
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
      try {
        setLoading(true);
        
        // Get user's gym_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: 'Errore',
            description: 'Utente non autenticato',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { data: gymId, error: gymError } = await supabase
          .rpc('get_user_gym_id', { _user_id: user.id });
        
        if (gymError) {
          console.error('Error getting gym ID:', gymError);
          toast({
            title: 'Errore',
            description: 'Impossibile ottenere l\'ID della palestra',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (!gymId) {
          console.log('No gym ID found for user');
          setLoading(false);
          return;
        }

        console.log('Loading courses for gym:', gymId);

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
          .eq('gym_id', gymId)
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

          // Transform the data to match our interface
          const transformedCourses = data.map(course => {
            const category = course.category_id ? categoriesMap.get(course.category_id) || null : null;
            const instructorData = course.instructor_id ? instructorsMap.get(course.instructor_id) : null;
            const schedules = schedulesMap.get(course.id) || [];
            
            console.log(`Course ${course.name} - instructor_id: ${course.instructor_id}, found instructor:`, instructorData);
            
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
              schedules
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
  }, [toast]);

  // TEMPORARILY DISABLED - Duplicate functionality
  /*
  const duplicateCourse = async (courseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) return;

      // Get original course data
      const { data: originalCourse } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (!originalCourse) return;

      // Create duplicate
      const { name, description, category_id, instructor_id, max_participants, 
             duration_minutes, difficulty_level, price_per_session, 
             credits_required, requirements, benefits, equipment_needed } = originalCourse;

      const { error } = await supabase
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
          gym_id: gymId,
          is_active: false // Start as inactive
        });

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Corso duplicato con successo',
      });

      // Reload courses
      window.location.reload();
    } catch (error) {
      console.error('Error duplicating course:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile duplicare il corso',
        variant: 'destructive',
      });
    }
  };
  */

  const toggleCourseStatus = async (course: CourseItem) => {
    try {
      setTogglingStatus(course.id);
      
      const newStatus = !course.is_active;
      
      // Update course status in database
      const { error } = await supabase
        .from('courses')
        .update({ is_active: newStatus })
        .eq('id', course.id);

      if (error) throw error;

      // Update local state
      setCourses(prevCourses => 
        prevCourses.map(c => 
          c.id === course.id ? { ...c, is_active: newStatus } : c
        )
      );

      toast({
        title: 'Successo',
        description: `Corso "${course.name}" ${newStatus ? 'attivato' : 'disattivato'} con successo`,
      });

    } catch (error) {
      console.error('Error toggling course status:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile modificare lo stato del corso',
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
    
    return (
      <div className="space-y-1">
        {sortedSchedules.map((schedule, index) => (
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
        <Button onClick={() => navigate("/owner/courses/new")}>
          Nuovo Corso
        </Button>
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
          ) : (
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
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "Attivo" : "Disattivo"}
                      </Badge>
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
                            {/* TEMPORARILY DISABLED - Duplicate functionality
                            <DropdownMenuItem
                              onClick={() => duplicateCourse(course.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplica
                            </DropdownMenuItem>
                            */}
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

    </div>
  );
};

export default OwnerCoursesList;
