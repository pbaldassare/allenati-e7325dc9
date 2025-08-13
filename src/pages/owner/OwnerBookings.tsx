import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface BookingItem {
  id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
}

const OwnerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    document.title = "Prenotazioni | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Get user's gym_id
        const { data: gymId } = await (supabase as any)
          .rpc('get_user_gym_id', { _user_id: (await supabase.auth.getUser()).data.user?.id });
        
        if (!gymId) {
          setLoading(false);
          return;
        }

        // Get courses for this gym to filter bookings
        const { data: courses } = await (supabase as any)
          .from("courses")
          .select("id")
          .eq('gym_id', gymId);

        const courseIds = courses?.map((c: any) => c.id) || [];
        
        if (courseIds.length === 0) {
          setBookings([]);
          setUserNames({});
          setLoading(false);
          return;
        }

        // Fetch bookings for courses in this gym only
        const { data, error } = await (supabase as any)
          .from("bookings")
          .select("id,user_id,scheduled_date,scheduled_time,status,created_at")
          .in('course_id', courseIds)
          .order("scheduled_date", { ascending: true });

        const bookingsData = (!error && data ? (data as BookingItem[]) : []);
        setBookings(bookingsData);

        const userIds = Array.from(new Set(bookingsData.map(b => b.user_id))).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await (supabase as any)
            .from("profiles")
            .select("user_id,first_name,last_name")
            .in("user_id", userIds);
          const map: Record<string, string> = {};
          (profiles || []).forEach((p: any) => {
            map[p.user_id] = [p.first_name, p.last_name].filter(Boolean).join(" ");
          });
          setUserNames(map);
        } else {
          setUserNames({});
        }
      } catch (error) {
        console.error('Error loading bookings:', error);
      }

      setLoading(false);
    };
    load();
  }, []);

  return (
    <section>
      <h1 className="sr-only">Prenotazioni corsi</h1>
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Caricamento…</p>
          ) : bookings.length === 0 ? (
            <p className="text-muted-foreground">Nessuna prenotazione trovata.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creata il</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>{userNames[b.user_id] ?? "—"}</TableCell>
                    <TableCell>{new Date(b.scheduled_date).toLocaleDateString()}</TableCell>
                    <TableCell>{b.scheduled_time}</TableCell>
                    <TableCell>{b.status}</TableCell>
                    <TableCell>{new Date(b.created_at).toLocaleDateString()}</TableCell>
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

export default OwnerBookings;
