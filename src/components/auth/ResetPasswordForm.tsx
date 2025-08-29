import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export const ResetPasswordForm = ({ token, onSuccess }: ResetPasswordFormProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast({
        title: "Errore",
        description: "Compila tutti i campi",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Errore", 
        description: "Le password non corrispondono",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Errore",
        description: "La password deve essere di almeno 6 caratteri",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Validating token and updating password');
      
      // First, validate the token
      const { data: tokenData, error: tokenError } = await supabase
        .from('password_reset_tokens')
        .select('user_id, email, expires_at, used_at')
        .eq('token', token)
        .single();
      
      if (tokenError || !tokenData) {
        console.error('Token validation error:', tokenError);
        toast({
          title: "Errore",
          description: "Token non valido o scaduto",
          variant: "destructive"
        });
        return;
      }

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        toast({
          title: "Errore",
          description: "Il token è scaduto. Richiedi un nuovo reset password.",
          variant: "destructive"
        });
        return;
      }

      // Check if token has already been used
      if (tokenData.used_at) {
        toast({
          title: "Errore",
          description: "Il token è già stato utilizzato. Richiedi un nuovo reset password.",
          variant: "destructive"
        });
        return;
      }

      // Use user_id from token validation (no need for native auth call)

      // Update password using admin endpoint - we need to create a function for this
      const { error: updateError } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: tokenData.user_id,
          new_password: password,
          token: token
        }
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        toast({
          title: "Errore",
          description: "Errore durante l'aggiornamento della password",
          variant: "destructive"
        });
        return;
      }

      // Mark token as used
      await supabase
        .from('password_reset_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      toast({
        title: "Successo",
        description: "Password aggiornata con successo! Ora puoi effettuare il login."
      });
      
      onSuccess();
      
    } catch (error: any) {
      console.error('Unexpected error updating password:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore imprevisto",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Nuova Password</CardTitle>
        <CardDescription>
          Inserisci la tua nuova password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nuova Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la nuova password"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                disabled={isLoading}
              >
                {isPasswordVisible ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Conferma Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={isConfirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Conferma la nuova password"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                disabled={isLoading}
              >
                {isConfirmPasswordVisible ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? "Aggiornamento..." : "Aggiorna Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};