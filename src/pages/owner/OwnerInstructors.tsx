import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface Instructor {
  id: string;
  user_id: string;
  bio: string | null;
  is_active: boolean;
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
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Istruttori | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("instructors")
        .select(`
          id,
          user_id,
          bio,
          is_active,
          created_at,
          specializations,
          certifications,
          experience_years,
          hourly_rate,
          profile:profiles!user_id(
            first_name,
            last_name,
            phone,
            profile_picture_url
          )
        `)
        .order("created_at", { ascending: false });
      if (!error && data) setInstructors(data as Instructor[]);
      setLoading(false);
    };
    load();
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
