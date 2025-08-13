import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface CourseItem {
  id: string;
  name: string;
  is_active: boolean;
  max_participants: number;
  created_at?: string;
}

const OwnerCoursesList: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Corsi | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        // Get user's gym_id
        const { data: gymId } = await (supabase as any)
          .rpc('get_user_gym_id', { _user_id: (await supabase.auth.getUser()).data.user?.id });
        
        if (!gymId) {
          setLoading(false);
          return;
        }

        // Fetch courses for this gym only
        const { data, error } = await (supabase as any)
          .from("courses")
          .select("id,name,is_active,max_participants,created_at")
          .eq('gym_id', gymId)
          .order("created_at", { ascending: false });
        
        if (!error && data) setCourses(data as CourseItem[]);
      } catch (error) {
        console.error('Error loading courses:', error);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section>
      <h1 className="sr-only">Corsi Palestra</h1>
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="text-xl">Corsi</CardTitle>
        <Button onClick={() => navigate("/owner/courses/new")}>Nuovo Corso</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Elenco Corsi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Caricamento…</p>
          ) : courses.length === 0 ? (
            <p className="text-muted-foreground">Nessun corso trovato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Partecipanti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creato il</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.max_participants}</TableCell>
                    <TableCell>{c.is_active ? "Attivo" : "Disattivo"}</TableCell>
                    <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : "-"}</TableCell>
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

export default OwnerCoursesList;
