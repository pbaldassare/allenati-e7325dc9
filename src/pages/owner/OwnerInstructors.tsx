import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOwnerGym } from "@/contexts/OwnerGymContext";

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
  console.log('🔥 OwnerInstructors COMPONENT MOUNT/RENDER');
  
  const { selectedGym, ownedGyms, loading: gymLoading } = useOwnerGym();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('🏋️ OwnerInstructors RENDER STATE:', {
    gymLoading,
    selectedGym: selectedGym?.id,
    selectedGymName: selectedGym?.name,
    ownedGymsCount: ownedGyms?.length,
    instructorsCount: instructors.length,
    loading,
    timestamp: new Date().toISOString()
  });

  const handlePrivilegeToggle = async (userId: string, currentPrivileges: boolean) => {
    try {
      const functionName = currentPrivileges ? 'demote_super_instructor' : 'promote_instructor_to_super';
      const { error } = await supabase.rpc(functionName, {
        _user_id: userId,
      });

      if (error) {
        console.error('Error updating instructor privileges:', error);
        toast.error('Errore nell\'aggiornamento dei privilegi');
        return;
      }

      // Update local state
      setInstructors(prev => prev.map(instructor => 
        instructor.user_id === userId 
          ? { ...instructor, has_owner_privileges: !currentPrivileges }
          : instructor
      ));

      toast.success(
        currentPrivileges 
          ? 'Privilegi da proprietario rimossi' 
          : 'Privilegi da proprietario assegnati'
      );
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Errore imprevisto');
    }
  };

  useEffect(() => {
    document.title = "Istruttori | Area Proprietario";
    console.log('📄 Document title set, component initialized');
    
    // Force a state update to trigger re-render and see logs
    const timer = setTimeout(() => {
      console.log('⏰ Timer triggered after 1 second');
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadInstructors = async () => {
      console.log("🏋️ OwnerInstructors - Loading START:", {
        gymLoading,
        selectedGym: selectedGym?.id,
        selectedGymName: selectedGym?.name,
        ownedGyms: ownedGyms?.length,
        timestamp: new Date().toISOString()
      });

      // Early return if no gym selected or still loading
      if (gymLoading) {
        console.log("⏳ Gym context still loading, waiting...");
        setLoading(true);
        return;
      }

      if (!selectedGym?.id) {
        console.log("🚫 No gym selected:", { 
          selectedGym: selectedGym?.id,
          ownedGymsCount: ownedGyms?.length 
        });
        setLoading(false);
        setInstructors([]);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 Loading instructors for gym:", {
          gymId: selectedGym.id,
          gymName: selectedGym.name
        });

        // STEP 1: Carica prima gli assignments per questa palestra
        const { data: assignments, error: assignmentsError } = await supabase
          .from("instructor_gym_assignments")
          .select("instructor_id, gym_id, has_owner_privileges, is_active")
          .eq("gym_id", selectedGym.id)
          .eq("is_active", true);

        console.log("📋 Assignments loaded:", {
          count: assignments?.length || 0,
          error: assignmentsError,
          data: assignments
        });

        if (assignmentsError) {
          console.error("❌ Error loading assignments:", assignmentsError);
          setInstructors([]);
          setLoading(false);
          return;
        }

        if (!assignments || assignments.length === 0) {
          console.log("📋 No assignments found for gym");
          setInstructors([]);
          setLoading(false);
          return;
        }

        // STEP 2: Carica i dettagli degli istruttori
        const instructorIds = assignments.map(a => a.instructor_id);
        const { data: instructorsData, error: instructorsError } = await supabase
          .from("instructors")
          .select("id, user_id, bio, created_at, specializations, certifications, experience_years, hourly_rate, first_name, last_name, is_active")
          .in("id", instructorIds)
          .eq("is_active", true);

        console.log("👨‍🏫 Instructors loaded:", {
          count: instructorsData?.length || 0,
          error: instructorsError,
          data: instructorsData
        });

        if (instructorsError) {
          console.error("❌ Error loading instructors:", instructorsError);
          setInstructors([]);
          setLoading(false);
          return;
        }

        if (!instructorsData || instructorsData.length === 0) {
          console.log("👨‍🏫 No instructors found");
          setInstructors([]);
          setLoading(false);
          return;
        }

        // STEP 3: Carica i profili utente
        const userIds = instructorsData.map(i => i.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, first_name, last_name, phone, profile_picture_url")
          .in("user_id", userIds);

        console.log("👤 Profiles loaded:", {
          requestedUserIds: userIds,
          foundProfiles: profilesData?.length || 0,
          error: profilesError,
          data: profilesData
        });

        // STEP 4: Crea mappe per un merge efficiente
        const assignmentsByInstructorId = new Map(
          assignments.map(a => [a.instructor_id, a])
        );
        const profilesByUserId = new Map(
          (profilesData || []).map(p => [p.user_id, p])
        );

        // STEP 5: Merge tutti i dati
        const mergedInstructors: Instructor[] = instructorsData.map(instructor => {
          const assignment = assignmentsByInstructorId.get(instructor.id);
          const profile = profilesByUserId.get(instructor.user_id);
          
          // Usa i dati dal profilo se disponibili, altrimenti fallback ai dati dell'istruttore
          const firstName = profile?.first_name || instructor.first_name || "Nome";
          const lastName = profile?.last_name || instructor.last_name || "Cognome";
          
          return {
            id: instructor.id,
            user_id: instructor.user_id,
            bio: instructor.bio || null,
            specializations: instructor.specializations || [],
            certifications: instructor.certifications || [],
            experience_years: instructor.experience_years || null,
            hourly_rate: instructor.hourly_rate || null,
            is_active: instructor.is_active ?? true,
            has_owner_privileges: assignment?.has_owner_privileges ?? false,
            created_at: instructor.created_at,
            profile: {
              first_name: firstName,
              last_name: lastName,
              phone: profile?.phone || null,
              profile_picture_url: profile?.profile_picture_url || null,
            },
          };
        });

        // STEP 6: Ordina per data di creazione (più recenti prima)
        const sortedInstructors = mergedInstructors.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        console.log('✅ Instructors merged and sorted:', {
          totalInstructors: sortedInstructors.length,
          instructorsWithPrivileges: sortedInstructors.filter(i => i.has_owner_privileges).length,
          sample: sortedInstructors.slice(0, 3).map(i => ({ 
            name: `${i.profile?.first_name} ${i.profile?.last_name}`, 
            hasPrivileges: i.has_owner_privileges,
            userId: i.user_id
          }))
        });

        setInstructors(sortedInstructors);
        
      } catch (error) {
        console.error("❌ Unexpected error loading instructors:", error);
        setInstructors([]);
        toast.error('Errore nel caricamento degli istruttori');
      } finally {
        setLoading(false);
      }
    };

    // Load instructors when gym context is ready
    loadInstructors();
  }, [selectedGym?.id, gymLoading]);

  useEffect(() => {
    const channel = supabase
      .channel('owner-instructors-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instructor_gym_assignments' },
        async (payload: any) => {
          console.log("🔄 Real-time update received:", payload);
          // Reload using the same logic as the main useEffect
          if (selectedGym?.id) {
            try {
              // STEP 1: Reload assignments
              const { data: assignments } = await supabase
                .from("instructor_gym_assignments")
                .select("instructor_id, gym_id, has_owner_privileges, is_active")
                .eq("gym_id", selectedGym.id)
                .eq("is_active", true);

              if (!assignments || assignments.length === 0) {
                setInstructors([]);
                return;
              }

              // STEP 2: Reload instructors
              const instructorIds = assignments.map(a => a.instructor_id);
              const { data: instructorsData } = await supabase
                .from("instructors")
                .select("id, user_id, bio, created_at, specializations, certifications, experience_years, hourly_rate, first_name, last_name, is_active")
                .in("id", instructorIds)
                .eq("is_active", true);

              if (!instructorsData) return;

              // STEP 3: Reload profiles
              const userIds = instructorsData.map(i => i.user_id);
              const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, first_name, last_name, phone, profile_picture_url")
                .in("user_id", userIds);

              // STEP 4: Create maps and merge
              const assignmentsByInstructorId = new Map(
                assignments.map(a => [a.instructor_id, a])
              );
              const profilesByUserId = new Map(
                (profilesData || []).map(p => [p.user_id, p])
              );

              const mergedInstructors: Instructor[] = instructorsData.map(instructor => {
                const assignment = assignmentsByInstructorId.get(instructor.id);
                const profile = profilesByUserId.get(instructor.user_id);
                
                const firstName = profile?.first_name || instructor.first_name || "Nome";
                const lastName = profile?.last_name || instructor.last_name || "Cognome";
                
                return {
                  id: instructor.id,
                  user_id: instructor.user_id,
                  bio: instructor.bio || null,
                  specializations: instructor.specializations || [],
                  certifications: instructor.certifications || [],
                  experience_years: instructor.experience_years || null,
                  hourly_rate: instructor.hourly_rate || null,
                  is_active: instructor.is_active ?? true,
                  has_owner_privileges: assignment?.has_owner_privileges ?? false,
                  created_at: instructor.created_at,
                  profile: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: profile?.phone || null,
                    profile_picture_url: profile?.profile_picture_url || null,
                  },
                };
              });

              // Sort and update
              const sortedInstructors = mergedInstructors.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );

              console.log("🔄 Real-time update completed:", sortedInstructors.length, "instructors");
              setInstructors(sortedInstructors);
            } catch (error) {
              console.error("❌ Error in real-time update:", error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGym?.id]);

  return (
    <section>
      <h1 className="sr-only">Istruttori palestra</h1>
      <Card>
        <CardHeader>
          <CardTitle>Istruttori</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Caricamento…</p>
          ) : instructors.length === 0 ? (
            <p className="text-muted-foreground">Nessun istruttore trovato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Istruttore</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Esperienza</TableHead>
                  <TableHead>Specializzazioni</TableHead>
                  <TableHead>Privilegi</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Dal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((instructor) => (
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
                          {instructor.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {instructor.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {instructor.profile?.phone || (
                        <span className="text-muted-foreground">Non fornito</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {instructor.experience_years ? (
                        <span>{instructor.experience_years} anni</span>
                      ) : (
                        <span className="text-muted-foreground">Non specificato</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {instructor.specializations && instructor.specializations.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {instructor.specializations.slice(0, 2).map((spec, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                          {instructor.specializations.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{instructor.specializations.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Nessuna</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={instructor.has_owner_privileges}
                          onCheckedChange={() => handlePrivilegeToggle(instructor.user_id, instructor.has_owner_privileges)}
                          id={`privileges-${instructor.id}`}
                        />
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
                      {new Date(instructor.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
};

export default OwnerInstructors;
