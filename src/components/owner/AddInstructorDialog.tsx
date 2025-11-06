import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, UserPlus, Loader2 } from "lucide-react";

interface AddInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
  onSuccess: () => void;
}

interface InstructorSearchResult {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string | null;
  is_assigned: boolean;
}

export function AddInstructorDialog({ open, onOpenChange, gymId, onSuccess }: AddInstructorDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<InstructorSearchResult[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();

  const searchInstructors = async () => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      // Search for users with instructor role
      const { data: instructorRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'instructor')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      const instructorUserIds = instructorRoles?.map(r => r.user_id) || [];

      if (instructorUserIds.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      // Get all profiles for instructors
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, profile_picture_url')
        .in('user_id', instructorUserIds);

      if (profilesError) throw profilesError;

      // Client-side filtering with multi-word support
      const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
      
      const filteredProfiles = profiles?.filter(profile => {
        const firstName = (profile.first_name || '').toLowerCase();
        const lastName = (profile.last_name || '').toLowerCase();
        const email = (profile.email || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;

        // Check if all search words match somewhere in the profile
        return searchWords.every(word => 
          firstName.includes(word) || 
          lastName.includes(word) || 
          email.includes(word) ||
          fullName.includes(word)
        );
      }) || [];

      // Get current gym instructors
      const { data: currentInstructors, error: currentError } = await supabase
        .from('instructor_gym_assignments')
        .select('instructors!inner(user_id)')
        .eq('gym_id', gymId)
        .eq('is_active', true);

      if (currentError) throw currentError;

      const assignedUserIds = new Set(currentInstructors?.map(i => i.instructors.user_id) || []);

      const formattedResults: InstructorSearchResult[] = filteredProfiles.map(profile => ({
        user_id: profile.user_id,
        first_name: profile.first_name || 'Nome',
        last_name: profile.last_name || 'Cognome',
        email: profile.email || '',
        avatar_url: profile.profile_picture_url || null,
        is_assigned: assignedUserIds.has(profile.user_id)
      }));

      setResults(formattedResults);
    } catch (error) {
      console.error('Error searching instructors:', error);
      toast({
        title: "Errore",
        description: "Errore durante la ricerca degli istruttori",
        variant: "destructive"
      });
    } finally {
      setSearching(false);
    }
  };

  const handleAddInstructor = async (instructorUserId: string) => {
    setAdding(instructorUserId);
    try {
      const { data, error } = await supabase.functions.invoke('assign-instructor-to-gym', {
        body: {
          instructor_user_id: instructorUserId,
          gym_id: gymId
        }
      });

      if (error) throw error;

      toast({
        title: "Successo",
        description: "Istruttore aggiunto alla palestra"
      });

      onSuccess();
      onOpenChange(false);
      setSearchTerm("");
      setResults([]);
    } catch (error: any) {
      console.error('Error adding instructor:', error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiunta dell'istruttore",
        variant: "destructive"
      });
    } finally {
      setAdding(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aggiungi Istruttore</DialogTitle>
          <DialogDescription>
            Cerca un istruttore per nome, cognome o email e aggiungilo a questa palestra
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Cerca per nome, cognome o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchInstructors()}
            />
            <Button onClick={searchInstructors} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            {results.length === 0 && searchTerm && !searching && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nessun istruttore trovato
              </p>
            )}

            {results.map((instructor) => (
              <div
                key={instructor.user_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={instructor.avatar_url || undefined} />
                    <AvatarFallback>
                      {instructor.first_name[0]}{instructor.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {instructor.first_name} {instructor.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{instructor.email}</p>
                  </div>
                </div>

                {instructor.is_assigned ? (
                  <Badge variant="secondary">Già assegnato</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleAddInstructor(instructor.user_id)}
                    disabled={adding === instructor.user_id}
                  >
                    {adding === instructor.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-1" />
                    )}
                    Aggiungi
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
