import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface BookingItem {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  created_at: string;
}

const OwnerBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Prenotazioni | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select("id,scheduled_date,scheduled_time,status,created_at")
        .order("scheduled_date", { ascending: true });
      if (!error && data) setBookings(data as BookingItem[]);
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
                  <TableHead>Data</TableHead>
                  <TableHead>Ora</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Creata il</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((b) => (
                  <TableRow key={b.id}>
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
