import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const OwnerReports: React.FC = () => {
  const [activeMembers, setActiveMembers] = useState<number | null>(null);
  const [coursesCount, setCoursesCount] = useState<number | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Report | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      // Active members
      const { count: membersCount } = await (supabase as any)
        .from("user_gym_memberships")
        .select("id", { count: "exact", head: true });

      // Courses count
      const { count: cCount } = await (supabase as any)
        .from("courses")
        .select("id", { count: "exact", head: true });

      // Upcoming bookings (from today)
      const today = new Date().toISOString().split("T")[0];
      const { count: bCount } = await (supabase as any)
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_date", today);

      setActiveMembers(membersCount ?? 0);
      setCoursesCount(cCount ?? 0);
      setUpcomingBookings(bCount ?? 0);
    };
    load();
  }, []);

  const StatCard = ({ label, value }: { label: string; value: number | null }) => (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value ?? "-"}</p>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <h1 className="sr-only">Report e Statistiche</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Iscritti attivi" value={activeMembers} />
        <StatCard label="Numero corsi" value={coursesCount} />
        <StatCard label="Prenotazioni imminenti" value={upcomingBookings} />
      </div>
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Pagamenti</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Sezione in allestimento.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default OwnerReports;
