import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface CourseFormData {
  name: string;
  description?: string;
  price_per_session?: number;
  max_participants?: number;
  duration_minutes?: number;
  deadline_hours?: number;
}

const OwnerCourseNew: React.FC = () => {
  const { register, handleSubmit, reset } = useForm<CourseFormData>();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Nuovo Corso | Area Proprietario";
  }, []);

  const onSubmit = (data: CourseFormData) => {
    toast({ title: "Salvataggio non ancora attivo", description: "La creazione corsi sarà abilitata nella prossima fase." });
    console.log("Form data (preview)", data);
    reset();
  };

  return (
    <section>
      <h1 className="sr-only">Crea nuovo corso</h1>
      <Card>
        <CardHeader>
          <CardTitle>Nuovo Corso</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nome</label>
              <Input {...register("name", { required: true })} placeholder="Es. Yoga Base" />
            </div>
            <div>
              <label className="block text-sm mb-1">Descrizione</label>
              <Textarea {...register("description")} placeholder="Dettagli del corso" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Prezzo per lezione (€)</label>
                <Input type="number" step="0.01" {...register("price_per_session")} />
              </div>
              <div>
                <label className="block text-sm mb-1">Partecipanti max</label>
                <Input type="number" {...register("max_participants")} />
              </div>
              <div>
                <label className="block text-sm mb-1">Durata (minuti)</label>
                <Input type="number" {...register("duration_minutes")} />
              </div>
              <div>
                <label className="block text-sm mb-1">Deadline prenotazione (ore)</label>
                <Input type="number" {...register("deadline_hours")} />
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit">Salva (preview)</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
};

export default OwnerCourseNew;
