import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleItem {
  id: string;
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_name: string | null;
}

const days = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

const OwnerSchedule: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Calendario | Area Proprietario";
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

        // Get courses for this gym to filter schedules
        const { data: courses } = await (supabase as any)
          .from("courses")
          .select("id")
          .eq('gym_id', gymId);

        const courseIds = courses?.map((c: any) => c.id) || [];
        
        if (courseIds.length === 0) {
          setSchedules([]);
          setLoading(false);
          return;
        }

        // Fetch schedules for courses in this gym only
        const { data, error } = await (supabase as any)
          .from("course_schedules")
          .select("id,course_id,day_of_week,start_time,end_time,room_name")
          .in('course_id', courseIds)
          .order("day_of_week", { ascending: true });
        
        if (!error && data) setSchedules(data as ScheduleItem[]);
      } catch (error) {
        console.error('Error loading schedules:', error);
      }
      setLoading(false);
    };
    load();
  }, []);

  return (
    <section>
      <h1 className="sr-only">Calendario corsi</h1>
      <Card>
        <CardHeader>
          <CardTitle>Calendario / Orari</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Caricamento…</p>
          ) : schedules.length === 0 ? (
            <p className="text-muted-foreground">Nessun orario configurato.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Giorno</TableHead>
                  <TableHead>Inizio</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Sala</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{days[s.day_of_week % 7]}</TableCell>
                    <TableCell>{s.start_time}</TableCell>
                    <TableCell>{s.end_time}</TableCell>
                    <TableCell>{s.room_name ?? "-"}</TableCell>
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

export default OwnerSchedule;
