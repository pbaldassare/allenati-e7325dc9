import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Edit, Copy, Eye, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CourseParticipantsList } from "@/components/CourseParticipantsList";
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
}

const OwnerCoursesList: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<CourseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
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
          
          // Get categories and instructors separately
          const categoryIds = [...new Set(data.map(c => c.category_id).filter(Boolean))];
          const instructorIds = [...new Set(data.map(c => c.instructor_id).filter(Boolean))];
          
          // Fetch categories
          const categoriesPromise = categoryIds.length > 0 
            ? supabase.from('course_categories').select('id, name').in('id', categoryIds)
            : Promise.resolve({ data: [] });
            
          // Fetch instructors with profiles
          const instructorsPromise = instructorIds.length > 0
            ? supabase.from('instructors').select(`
                id,
                profiles!inner(first_name, last_name)
              `).in('id', instructorIds)
            : Promise.resolve({ data: [] });

          const [categoriesResult, instructorsResult] = await Promise.all([
            categoriesPromise,
            instructorsPromise
          ]);

          const categoriesMap = new Map(
            (categoriesResult.data || []).map(cat => [cat.id, cat])
          );
          
          const instructorsMap = new Map(
            (instructorsResult.data || []).map(inst => [inst.id, inst])
          );

          // Transform the data to match our interface
          const transformedCourses = data.map(course => ({
            id: course.id,
            name: course.name,
            description: course.description,
            is_active: course.is_active,
            max_participants: course.max_participants,
            credits_required: course.credits_required,
            difficulty_level: course.difficulty_level,
            created_at: course.created_at,
            category: course.category_id ? categoriesMap.get(course.category_id) || null : null,
            instructor: course.instructor_id ? {
              user: instructorsMap.get(course.instructor_id)?.profiles || null
            } : null
          }));
          
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
                    <TableCell>{course.max_participants}</TableCell>
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
                        <CourseParticipantsList 
                          courseId={course.id} 
                          courseName={course.name} 
                        />
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/courses/${course.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizza
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/courses/${course.id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Modifica
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateCourse(course.id)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Duplica
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
