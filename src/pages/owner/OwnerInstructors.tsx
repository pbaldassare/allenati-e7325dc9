import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Crown, UserPlus, Trash2, Loader2, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOwnerGym } from "@/contexts/OwnerGymContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddInstructorDialog } from "@/components/owner/AddInstructorDialog";
import { Button } from "@/components/ui/button";
import { useInstructorHoursWorked } from "@/hooks/useInstructorHoursWorked";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { it } from "date-fns/locale";

interface Instructor {
  id: string;
  user_id: string;
  bio: string | null;
  is_active: boolean;
  has_owner_privileges: boolean;
  created_at: string;
  specializations: string[] | null;
  certifications: string[] | null;
  experience_years: number | null;
  hourly_rate: number | null;
  profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
    profile_picture_url: string | null;
  };
}

const OwnerInstructors: React.FC = () => {
  const { selectedGym, loading: gymLoading } = useOwnerGym();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [removingInstructor, setRemovingInstructor] = useState<string | null>(null);
  
  // Date filters for hours
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  const { data: hoursData } = useInstructorHoursWorked(
    selectedGym?.id,
    startDate,
    endDate
  );
  
  // Create a map of instructor hours by user_id
  const hoursByUserId = new Map(
    hoursData?.map(h => [h.instructorUserId, h]) || []
  );
  
  const setPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisYear') => {
    const now = new Date();
    switch (preset) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'thisYear':
        setStartDate(startOfYear(now));
        setEndDate(now);
        break;
    }
  };
  
  const formatHours = (totalHours: number) => {
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);
    if (hours === 0 && minutes === 0) return "-";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };
  
  const totalHours = hoursData?.reduce((sum, h) => sum + h.totalHours, 0) || 0;

  const loadInstructors = async () => {
    if (gymLoading || !selectedGym?.id) {
      setLoading(false);
      setInstructors([]);
      return;
    }

    try {
      setLoading(true);

      // Load instructor assignments
      const { data: assignments, error: assignmentsError } = await supabase
        .from("instructor_gym_assignments")
        .select("instructor_id, gym_id, has_owner_privileges, is_active")
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      // Also load instructors with direct gym_id (legacy method)
      const { data: directInstructors, error: directError } = await supabase
        .from("instructors")
        .select("id, user_id, bio, created_at, specializations, certifications, experience_years, hourly_rate, first_name, last_name, is_active, gym_id")
        .eq("gym_id", selectedGym.id)
        .eq("is_active", true);

      if (assignmentsError || directError) {
        console.error("Error loading instructors:", { assignmentsError, directError });
        setInstructors([]);
        setLoading(false);
        return;
      }

      // Combine instructor IDs from both sources
      const assignmentInstructorIds = assignments?.map(a => a.instructor_id) || [];
      const directInstructorIds = directInstructors?.map(i => i.id) || [];
      const allInstructorIds = [...new Set([...assignmentInstructorIds, ...directInstructorIds])];

      if (allInstructorIds.length === 0) {
        setInstructors([]);
        setLoading(false);
        return;
      }

      // Load instructor details INCLUDING has_owner_privileges for synchronization
      const { data: instructorsData, error: instructorsError } = await supabase
        .from("instructors")
        .select("id, user_id, bio, created_at, specializations, certifications, experience_years, hourly_rate, first_name, last_name, is_active, has_owner_privileges")
        .in("id", allInstructorIds)
        .eq("is_active", true);

      if (instructorsError || !instructorsData) {
        setInstructors([]);
        setLoading(false);
        return;
      }

      // Load user profiles with comprehensive debugging
      const userIds = instructorsData.map(i => i.user_id);
      console.log('🔍 DEBUG: Loading profiles for instructor user_ids:', userIds);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, phone, profile_picture_url, email")
        .in("user_id", userIds);

      if (profilesError) {
        console.error('🚨 ERROR loading profiles:', profilesError);
      }
      console.log('📋 DEBUG: Profiles loaded:', profilesData?.length || 0, 'out of', userIds.length, 'requested');
      
      // Debug missing profiles
      if (profilesData) {
        const foundUserIds = new Set(profilesData.map(p => p.user_id));
        const missingUserIds = userIds.filter(id => !foundUserIds.has(id));
        if (missingUserIds.length > 0) {
          console.error('🚨 MISSING PROFILES for user_ids:', missingUserIds);
        }
      }

      // Create maps for efficient merging
      const assignmentsByInstructorId = new Map(
        (assignments || []).map(a => [a.instructor_id, a])
      );
      const directInstructorsByUserId = new Map(
        (directInstructors || []).map(i => [i.user_id, i])
      );
      const profilesByUserId = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      // Merge all data with comprehensive debugging
      const mergedInstructors: Instructor[] = instructorsData.map(instructor => {
        const assignment = assignmentsByInstructorId.get(instructor.id);
        const directInstructor = directInstructorsByUserId.get(instructor.user_id);
        const profile = profilesByUserId.get(instructor.user_id);
        
        // Debug missing profile data
        if (!profile) {
          console.error(`🚨 CRITICAL: No profile found for instructor user_id: ${instructor.user_id} (instructor_id: ${instructor.id})`);
        } else if (!profile.first_name || !profile.last_name) {
          console.error(`🚨 MISSING DATA for instructor user_id: ${instructor.user_id}:`, {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email
          });
        }
        
        const firstName = profile?.first_name || instructor.first_name || "Nome non disponibile";
        const lastName = profile?.last_name || instructor.last_name || "Cognome non disponibile";
        
        // CRITICAL: Synchronize privileges between both tables
        const assignmentPrivileges = assignment?.has_owner_privileges ?? false;
        const instructorPrivileges = instructor.has_owner_privileges ?? false;
        
        // Log discrepancies for debugging
        if (assignmentPrivileges !== instructorPrivileges) {
          console.warn(`🔄 PRIVILEGE SYNC ISSUE for ${firstName} ${lastName}:`, {
            instructor_id: instructor.id,
            user_id: instructor.user_id,
            assignment_privileges: assignmentPrivileges,
            instructor_privileges: instructorPrivileges,
            gym_id: selectedGym.id
          });
        }
        
        // Use instructor table as source of truth (updated by our functions)
        let hasOwnerPrivileges = instructorPrivileges;
        
        // If there's a discrepancy, log it but prefer the instructor table
        if (assignment && assignmentPrivileges !== instructorPrivileges) {
          console.log(`🔧 Using instructor table value (${instructorPrivileges}) over assignment (${assignmentPrivileges}) for user ${instructor.user_id}`);
        }
        
        return {
          id: instructor.id,
          user_id: instructor.user_id,
          bio: instructor.bio || null,
          specializations: instructor.specializations || [],
          certifications: instructor.certifications || [],
          experience_years: instructor.experience_years || null,
          hourly_rate: instructor.hourly_rate || null,
          is_active: instructor.is_active ?? true,
          has_owner_privileges: hasOwnerPrivileges,
          created_at: instructor.created_at,
          profile: {
            first_name: firstName,
            last_name: lastName,
            phone: profile?.phone || null,
            profile_picture_url: profile?.profile_picture_url || null,
          },
        };
      });

      // Sort by creation date
      const sortedInstructors = mergedInstructors.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setInstructors(sortedInstructors);
    } catch (error) {
      console.error("Error loading instructors:", error);
      setInstructors([]);
      toast.error('Errore nel caricamento degli istruttori');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivilegeToggle = async (userId: string, currentPrivileges: boolean) => {
    try {
      setToggleLoading(userId);
      const functionName = currentPrivileges ? 'demote_super_instructor' : 'promote_instructor_to_super';
      
      console.log(`🔧 ${currentPrivileges ? 'Demoting' : 'Promoting'} instructor ${userId} using ${functionName}`);
      
      const { error } = await supabase.rpc(functionName, {
        _user_id: userId,
      });

      if (error) {
        console.error('Error updating instructor privileges:', error);
        toast.error(`Errore durante la modifica dei privilegi: ${error.message}`);
        setToggleLoading(null);
        return;
      }

      console.log(`✅ Successfully ${currentPrivileges ? 'demoted' : 'promoted'} instructor ${userId}`);

      // Wait a moment to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reload instructors with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      let reloadSuccess = false;
      
      while (retryCount < maxRetries && !reloadSuccess) {
        try {
          await loadInstructors();
          
          // Verify the change was persisted by checking current state
          await new Promise(resolve => setTimeout(resolve, 100));
          const updatedInstructor = instructors.find(i => i.user_id === userId);
          if (updatedInstructor && updatedInstructor.has_owner_privileges !== currentPrivileges) {
            reloadSuccess = true;
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`🔄 Retry ${retryCount}/${maxRetries} - waiting for database sync...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          retryCount++;
          console.error(`Error during reload attempt ${retryCount}:`, error);
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!reloadSuccess) {
        console.warn('⚠️ Could not verify privilege change persistence - forcing page reload...');
        // Force a complete page reload as last resort
        window.location.reload();
      } else {
        toast.success(
          currentPrivileges 
            ? 'Privilegi da proprietario rimossi' 
            : 'Privilegi da proprietario assegnati'
        );
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleRemoveInstructor = async (userId: string) => {
    if (!selectedGym) return;
    
    setRemovingInstructor(userId);
    try {
      const { error } = await supabase.functions.invoke('remove-instructor-from-gym', {
        body: {
          instructor_user_id: userId,
          gym_id: selectedGym.id
        }
      });

      if (error) throw error;

      toast.success("Istruttore rimosso dalla palestra");
      loadInstructors();
    } catch (error: any) {
      console.error('Error removing instructor:', error);
      toast.error(error.message || "Errore durante la rimozione dell'istruttore");
    } finally {
      setRemovingInstructor(null);
    }
  };

  useEffect(() => {
    document.title = "Istruttori | Area Proprietario";
  }, []);

  useEffect(() => {
    loadInstructors();
  }, [selectedGym?.id, gymLoading]);

  useEffect(() => {
    const channel = supabase
      .channel('owner-instructors-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instructor_gym_assignments' },
        () => {
          loadInstructors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGym?.id]);

  return (
    <section className="space-y-6">
      <h1 className="sr-only">Istruttori palestra</h1>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              Istruttori della Palestra
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Date filters */}
              <div className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                      {format(startDate, "dd/MM", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                      {format(endDate, "dd/MM", { locale: it })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Presets */}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setPreset('thisMonth')}>Mese</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setPreset('lastMonth')}>Scorso</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setPreset('thisYear')}>Anno</Button>
              </div>
              
              {selectedGym && (
                <Button onClick={() => setAddDialogOpen(true)} size="sm">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Aggiungi
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Caricamento istruttori...</p>
          ) : instructors.length === 0 ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">Nessun istruttore trovato.</p>
              <button 
                onClick={loadInstructors}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                🔄 Ricarica
              </button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Istruttore</TableHead>
                  <TableHead className="text-right">Ore</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Privilegi</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => {
                  const instructorHours = hoursByUserId.get(instructor.user_id);
                  return (
                  <TableRow key={instructor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage 
                            src={instructor.profile?.profile_picture_url || undefined} 
                            alt={`${instructor.profile?.first_name} ${instructor.profile?.last_name}`} 
                          />
                          <AvatarFallback>
                            {instructor.profile?.first_name?.[0]}{instructor.profile?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {instructor.profile?.first_name} {instructor.profile?.last_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {instructorHours ? formatHours(instructorHours.totalHours) : "-"}
                    </TableCell>
                    <TableCell>
                      {instructor.profile?.phone || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={instructor.has_owner_privileges}
                          disabled={toggleLoading === instructor.user_id}
                          onCheckedChange={() => handlePrivilegeToggle(instructor.user_id, instructor.has_owner_privileges)}
                          id={`privileges-${instructor.id}`}
                        />
                        {toggleLoading === instructor.user_id && (
                          <div className="ml-2 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        )}
                        <Label htmlFor={`privileges-${instructor.id}`} className="text-sm">
                          {instructor.has_owner_privileges ? (
                            <div className="flex items-center gap-1 text-amber-600">
                              <Crown className="w-3 h-3" />
                              Super
                            </div>
                          ) : (
                            "Standard"
                          )}
                        </Label>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={instructor.is_active ? "default" : "secondary"}>
                        {instructor.is_active ? "Attivo" : "Inattivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={removingInstructor === instructor.user_id}
                          >
                            {removingInstructor === instructor.user_id ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-1" />
                            )}
                            Rimuovi
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Conferma Rimozione</AlertDialogTitle>
                            <AlertDialogDescription>
                              Vuoi rimuovere <strong>{instructor.profile.first_name} {instructor.profile.last_name}</strong> da questa palestra?
                              <br />
                              L'istruttore non verrà eliminato dal sistema e potrà essere aggiunto nuovamente in futuro.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveInstructor(instructor.user_id)}>
                              Rimuovi
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-medium">Totale</TableCell>
                  <TableCell className="text-right font-bold">{formatHours(totalHours)}</TableCell>
                  <TableCell colSpan={4}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedGym && (
        <AddInstructorDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          gymId={selectedGym.id}
          onSuccess={loadInstructors}
        />
      )}
    </section>
  );
};

export default OwnerInstructors;
