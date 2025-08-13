
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

const MedicalCertificateUploadDialog = ({ open, onOpenChange, onUploaded }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Errore", description: "Seleziona un file del certificato", variant: "destructive" });
      return;
    }
    if (!expiryDate) {
      toast({ title: "Errore", description: "Inserisci la data di scadenza", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      console.log("[MedicalCert] Starting upload");
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Utente non autenticato");

      const { data: gymId, error: gymErr } = await (supabase as any).rpc("get_user_gym_id", { _user_id: userId });
      if (gymErr) throw gymErr;
      if (!gymId) throw new Error("Nessuna palestra associata all'utente");

      const path = `${userId}/${Date.now()}_${file.name}`;
      console.log("[MedicalCert] Uploading to storage path:", path);
      const { error: uploadErr } = await supabase.storage
        .from("medical-certificates")
        .upload(path, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      console.log("[MedicalCert] Inserting DB record");
      const { error: insertErr } = await supabase.from("medical_certificates").insert([
        {
          user_id: userId,
          gym_id: gymId,
          file_size: file.size,
          file_name: file.name,
          file_path: path,
          file_type: file.type || "application/octet-stream",
          expiry_date: expiryDate, // format YYYY-MM-DD from input[type="date"]
        },
      ]);
      if (insertErr) throw insertErr;

      toast({ title: "Certificato caricato", description: "Il certificato medico è stato caricato correttamente." });
      setFile(null);
      setExpiryDate("");
      onOpenChange(false);
      onUploaded();
    } catch (e: any) {
      console.error("[MedicalCert] Upload error", e);
      toast({
        title: "Errore caricamento",
        description: e?.message ?? "Impossibile caricare il certificato",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Carica certificato medico</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="expiry">Data di scadenza</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate">File certificato (PDF o immagine)</Label>
            <Input
              id="certificate"
              type="file"
              accept=".pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
              Annulla
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Caricamento..." : "Carica"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MedicalCertificateUploadDialog;
