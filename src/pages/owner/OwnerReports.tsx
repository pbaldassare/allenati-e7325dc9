import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerGym } from "@/contexts/OwnerGymContext";

const OwnerReports: React.FC = () => {
  const { selectedGym } = useOwnerGym();
  const [activeMembers, setActiveMembers] = useState<number | null>(null);
  const [coursesCount, setCoursesCount] = useState<number | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<number | null>(null);

  useEffect(() => {
    document.title = "Report | Area Proprietario";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        if (!selectedGym) {
          console.log('🚫 OwnerReports: No selected gym');
          setActiveMembers(0);
          setCoursesCount(0);
          setUpcomingBookings(0);
          return;
        }

        console.log('📊 OwnerReports: Loading reports for gym:', {
          gymId: selectedGym.id,
          gymName: selectedGym.name
        });

        // Active members for this gym
        const { count: membersCount } = await supabase
          .from("user_gym_memberships")
          .select("id", { count: "exact", head: true })
          .eq('gym_id', selectedGym.id)
          .eq('status', 'active');

        // Courses count for this gym
        const { count: cCount } = await supabase
          .from("courses")
          .select("id", { count: "exact", head: true })
          .eq('gym_id', selectedGym.id);

        // Get courses for this gym to filter bookings
        const { data: courses } = await supabase
          .from("courses")
          .select("id")
          .eq('gym_id', selectedGym.id);

        const courseIds = courses?.map((c: any) => c.id) || [];
        
        // Upcoming bookings for this gym's courses (from today)
        const today = new Date().toISOString().split("T")[0];
        const { count: bCount } = courseIds.length > 0 ? await supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in('course_id', courseIds)
          .gte("scheduled_date", today) : { count: 0 };

        console.log('✅ OwnerReports: Reports loaded:', {
          activeMembers: membersCount ?? 0,
          coursesCount: cCount ?? 0,
          upcomingBookings: bCount ?? 0
        });

        setActiveMembers(membersCount ?? 0);
        setCoursesCount(cCount ?? 0);
        setUpcomingBookings(bCount ?? 0);
      } catch (error) {
        console.error('❌ OwnerReports: Error loading reports:', error);
        setActiveMembers(0);
        setCoursesCount(0);
        setUpcomingBookings(0);
      }
    };
    load();
  }, [selectedGym]);

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
