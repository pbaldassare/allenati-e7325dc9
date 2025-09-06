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
  const { selectedGym, ownedGyms, loading: gymLoading } = useOwnerGym();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  useEffect(() => {
    const load = async () => {
      console.log("🏋️ OwnerInstructors - DEBUG START:", {
        gymLoading,
        selectedGym: selectedGym?.id,
        selectedGymName: selectedGym?.name,
        ownedGyms: ownedGyms?.length,
        timestamp: new Date().toISOString()
      });

      // Test authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("🔐 Auth check:", { userId: user?.id, error: authError });

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
        console.log("🔍 Fetching instructors for gym:", selectedGym.id);
        
        // TEMPORANEO: Prima proviamo senza filtro per vedere se ci sono istruttori
        const { data: allInstructors, error: allError } = await supabase
          .from("instructors")
          .select("*")
          .eq("is_active", true);
        
        console.log("📊 All active instructors:", allInstructors?.length || 0, allInstructors);

        // 1) Carica gli istruttori per la palestra selezionata
        const { data: instData, error: instError } = await (supabase as any)
          .from("instructors")
          .select(
            `id, user_id, bio, is_active, has_owner_privileges, created_at, specializations, certifications, experience_years, hourly_rate`
          )
          .eq("is_active", true)
          .eq("gym_id", selectedGym.id)
          .order("created_at", { ascending: false });

        console.log("🎯 Filtered instructors for gym:", instData?.length || 0, instData);

        if (instError) {
          console.error("Errore nel caricamento degli istruttori:", instError);
          setInstructors([]);
          setLoading(false);
          return;
        }

        const instructorsList = (instData || []) as any[];
        const userIds = instructorsList.map((i) => i.user_id).filter(Boolean);

        // 2) Carica i profili collegati (nome, cognome, telefono, avatar)
        let profilesById = new Map<string, any>();
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await (supabase as any)
            .from("profiles")
            .select("user_id, first_name, last_name, phone, profile_picture_url")
            .in("user_id", userIds);

          if (!profilesError && profilesData) {
            profilesById = new Map(
              profilesData.map((p: any) => [p.user_id as string, p])
            );
          } else if (profilesError) {
            console.warn("Impossibile caricare i profili collegati:", profilesError);
          }
        }

        // 3) Merge dei dati
        const merged: Instructor[] = instructorsList.map((ins: any) => ({
          ...ins,
          profile: profilesById.get(ins.user_id) || {
            first_name: "",
            last_name: "",
            phone: null,
            profile_picture_url: null,
          },
        }));

        console.log('✅ Instructors loaded successfully:', {
          totalInstructors: merged.length,
          instructorsWithProfiles: merged.filter(i => i.profile?.first_name).length,
          sample: merged.slice(0, 3).map(i => ({ 
            name: `${i.profile?.first_name} ${i.profile?.last_name}`, 
            hasPrivileges: i.has_owner_privileges,
            userId: i.user_id
          }))
        });

        setInstructors(merged);
      } catch (e) {
        console.error("❌ Errore imprevisto nel caricamento istruttori:", e);
        setInstructors([]);
        toast.error('Errore nel caricamento degli istruttori');
      } finally {
        setLoading(false);
      }
    };

    // Add small delay to ensure gym context is fully ready
    const timer = setTimeout(() => {
      load();
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedGym?.id, gymLoading]);

  useEffect(() => {
    const channel = supabase
      .channel('owner-instructors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'instructors' },
        async (payload: any) => {
          const newRow = payload.new as any;
          const oldRow = payload.old as any;

          if (payload.eventType === 'UPDATE') {
            if (newRow?.is_active === false) {
              setInstructors((prev) => prev.filter((i) => i.id !== newRow.id));
            } else if (newRow?.is_active === true) {
              const { data: p } = await (supabase as any)
                .from('profiles')
                .select('user_id, first_name, last_name, phone, profile_picture_url')
                .eq('user_id', newRow.user_id)
                .maybeSingle();

              setInstructors((prev) => {
                const merged: Instructor = {
                  ...(newRow as any),
                  profile:
                    p || { first_name: '', last_name: '', phone: null, profile_picture_url: null },
                };
                const exists = prev.some((i) => i.id === newRow.id);
                return exists
                  ? prev.map((i) => (i.id === newRow.id ? merged : i))
                  : [merged, ...prev];
              });
            }
          } else if (payload.eventType === 'INSERT') {
            if (newRow?.is_active) {
              const { data: p } = await (supabase as any)
                .from('profiles')
                .select('user_id, first_name, last_name, phone, profile_picture_url')
                .eq('user_id', newRow.user_id)
                .maybeSingle();

              setInstructors((prev) => [
                {
                  ...(newRow as any),
                  profile:
                    p || { first_name: '', last_name: '', phone: null, profile_picture_url: null },
                } as Instructor,
                ...prev,
              ]);
            }
          } else if (payload.eventType === 'DELETE') {
            if (oldRow?.id) {
              setInstructors((prev) => prev.filter((i) => i.id !== oldRow.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
