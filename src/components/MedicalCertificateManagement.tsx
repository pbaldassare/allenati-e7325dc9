import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, FileIcon, UploadIcon } from "lucide-react";
import MedicalCertificateUploadDialog from "./MedicalCertificateUploadDialog";

interface MedicalCertificate {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  expiry_date: string | null;
  status: "pending" | "approved" | "rejected" | "expired";
  created_at: string;
  rejection_reason?: string;
}

export const MedicalCertificateManagement = () => {
  const [certificates, setCertificates] = useState<MedicalCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadCertificates = async () => {
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Utente non autenticato");

      const { data, error } = await supabase
        .from("medical_certificates")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error: any) {
      console.error("Errore nel caricamento certificati:", error);
      toast({
        title: "Errore",
        description: "Impossibile caricare i certificati medici",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const viewCertificate = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("medical-certificates")
        .createSignedUrl(filePath, 60);

      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Errore nell'apertura del certificato:", error);
      toast({
        title: "Errore",
        description: "Impossibile aprire il certificato",
        variant: "destructive",
      });
    }
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffInDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffInDays <= 30 && diffInDays >= 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  if (loading) {
    return <div className="p-4">Caricamento certificati...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl sm:text-2xl font-bold">Certificati Medici</h2>
          <p className="text-base sm:text-sm text-foreground sm:text-muted-foreground">
            Gestisci i tuoi certificati medici sportivi
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} className="h-12 sm:h-10">
          <UploadIcon className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
          Carica Certificato
        </Button>
      </div>

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl sm:text-lg font-medium mb-2">Nessun certificato caricato</h3>
              <p className="text-base sm:text-sm text-foreground sm:text-muted-foreground mb-4">
                Carica il tuo certificato medico sportivo per accedere ai corsi
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Carica il primo certificato
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl sm:text-lg">{cert.file_name}</CardTitle>
                  <Badge variant="secondary" className="text-sm">Caricato</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
                      <span className="text-base sm:text-sm">
                        Caricato il{" "}
                        {format(new Date(cert.created_at), "dd MMMM yyyy", { locale: it })}
                      </span>
                    </div>
                    {cert.expiry_date && (
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="text-base sm:text-sm">
                          Scadenza:{" "}
                          <span className={
                            isExpired(cert.expiry_date) 
                              ? "text-destructive font-medium"
                              : isExpiringSoon(cert.expiry_date)
                              ? "text-orange-600 font-medium"
                              : ""
                          }>
                            {format(new Date(cert.expiry_date), "dd MMMM yyyy", { locale: it })}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>


                  {(isExpired(cert.expiry_date) || isExpiringSoon(cert.expiry_date)) && (
                    <div className={`p-3 rounded-md ${
                      isExpired(cert.expiry_date) 
                        ? "bg-destructive/10 text-destructive" 
                        : "bg-orange-50 text-orange-800"
                    }`}>
                      <p className="text-base sm:text-sm font-medium">
                        {isExpired(cert.expiry_date) 
                          ? "⚠️ Certificato scaduto" 
                          : "⚠️ Certificato in scadenza entro 30 giorni"}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewCertificate(cert.file_path)}
                      className="h-11 sm:h-9"
                    >
                      <FileIcon className="w-5 h-5 sm:w-4 sm:h-4 mr-2" />
                      Visualizza
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MedicalCertificateUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploaded={loadCertificates}
      />
    </div>
  );
};

export default MedicalCertificateManagement;