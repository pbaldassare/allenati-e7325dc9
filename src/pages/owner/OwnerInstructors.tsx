import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface Instructor {
  id: string;
  user_id: string;
  bio: string | null;
  is_active: boolean;
  created_at: string;
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
        .select("id,user_id,bio,is_active,created_at")
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
                  <TableHead>ID</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Attivo</TableHead>
                  <TableHead>Creato il</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.id.slice(0, 8)}…</TableCell>
                    <TableCell className="font-mono text-xs">{i.user_id.slice(0, 8)}…</TableCell>
                    <TableCell>{i.is_active ? "Sì" : "No"}</TableCell>
                    <TableCell>{new Date(i.created_at).toLocaleDateString()}</TableCell>
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
