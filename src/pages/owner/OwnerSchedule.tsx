import React, { useEffect } from "react";
import SessionCalendar from "@/components/owner/SessionCalendar";

const OwnerSchedule: React.FC = () => {
  useEffect(() => {
    document.title = "Calendario Sessioni | Area Proprietario";
  }, []);

  return (
    <section>
      <h1 className="sr-only">Calendario sessioni corsi</h1>
      <SessionCalendar />
    </section>
  );
};

export default OwnerSchedule;
