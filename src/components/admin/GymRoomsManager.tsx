import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, MapPin, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';

interface GymRoom {
  id: string;
  name: string;
  description?: string;
  capacity?: number;
  is_active: boolean;
}

export const GymRoomsManager: React.FC = () => {
  const [rooms, setRooms] = useState<GymRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<GymRoom | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userGymId, setUserGymId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    capacity: 20
  });

  useEffect(() => {
    const initializeData = async () => {
      // Get user's gym ID first
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
        setUserGymId(gymId);
      }
      await loadRooms();
    };
    
    initializeData();
  }, []);

  const loadRooms = async () => {
    if (!userGymId) return;
    
    try {
      const { data, error } = await supabase
        .from('gym_rooms')
        .select('*')
        .eq('gym_id', userGymId)
        .order('name');

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le sale',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', capacity: 20 });
    setEditingRoom(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (room: GymRoom) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      capacity: room.capacity || 20
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Errore',
        description: 'Il nome della sala è obbligatorio',
        variant: 'destructive',
      });
      return;
    }

    if (!userGymId) {
      toast({
        title: 'Errore',
        description: 'ID palestra non trovato',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingRoom) {
        // Update existing room
        const { error } = await supabase
          .from('gym_rooms')
          .update({
            name: formData.name,
            description: formData.description,
            capacity: formData.capacity,
          })
          .eq('id', editingRoom.id);

        if (error) throw error;

        toast({
          title: 'Successo',
          description: 'Sala aggiornata con successo',
        });
      } else {
        // Create new room
        const { error } = await supabase
          .from('gym_rooms')
          .insert({
            gym_id: userGymId,
            name: formData.name,
            description: formData.description,
            capacity: formData.capacity,
          });

        if (error) throw error;

        toast({
          title: 'Successo',
          description: 'Sala creata con successo',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await loadRooms();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la sala',
        variant: 'destructive',
      });
    }
  };

  const toggleRoomStatus = async (room: GymRoom) => {
    try {
      const { error } = await supabase
        .from('gym_rooms')
        .update({ is_active: !room.is_active })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: `Sala ${!room.is_active ? 'attivata' : 'disattivata'} con successo`,
      });

      await loadRooms();
    } catch (error) {
      console.error('Error toggling room status:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare lo stato della sala',
        variant: 'destructive',
      });
    }
  };

  const deleteRoom = async (roomId: string) => {
    try {
      const { error } = await supabase
        .from('gym_rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: 'Successo',
        description: 'Sala eliminata con successo',
      });

      await loadRooms();
    } catch (error) {
      console.error('Error deleting room:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la sala',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Caricamento sale...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Sale
          </h2>
          <p className="text-muted-foreground">
            Gestisci le sale della palestra per l'assegnazione ai corsi
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nuova Sala
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRoom ? 'Modifica Sala' : 'Nuova Sala'}
              </DialogTitle>
              <DialogDescription>
                {editingRoom 
                  ? 'Modifica i dettagli della sala esistente'
                  : 'Crea una nuova sala per la palestra'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Sala</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. Sala 1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Descrizione (opzionale)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="es. Sala principale per fitness"
                />
              </div>
              
              <div>
                <Label htmlFor="capacity">Capacità Massima</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 20 })}
                />
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Annulla
                </Button>
                <Button type="submit">
                  {editingRoom ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id} className={!room.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                </div>
                <Badge variant={room.is_active ? 'default' : 'secondary'}>
                  {room.is_active ? 'Attiva' : 'Disattiva'}
                </Badge>
              </div>
              {room.description && (
                <CardDescription>{room.description}</CardDescription>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
                <Users className="h-4 w-4" />
                <span>Capacità: {room.capacity || 20} persone</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(room)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleRoomStatus(room)}
                >
                  {room.is_active ? 'Disattiva' : 'Attiva'}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                      <AlertDialogDescription>
                        Sei sicuro di voler eliminare la sala "{room.name}"? 
                        Questa azione non può essere annullata e potrebbe influenzare i corsi esistenti.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteRoom(room.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Elimina
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooms.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessuna sala configurata</h3>
            <p className="text-muted-foreground mb-4">
              Crea la prima sala per iniziare ad assegnare i corsi
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Crea Prima Sala
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};