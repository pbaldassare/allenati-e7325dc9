import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Plus, MapPin, Users, Calendar, Settings, Edit } from 'lucide-react';
import { RoomForm } from '@/components/admin/RoomForm';

const AdminRooms = () => {
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const rooms = [
    {
      id: '1',
      name: 'Sala A - Yoga',
      capacity: 25,
      equipment: ['Tappetini', 'Blocchi yoga', 'Cinghie'],
      status: 'available',
      currentBookings: 3,
      nextAvailable: '14:00'
    },
    {
      id: '2',
      name: 'Sala B - Cardio',
      capacity: 30,
      equipment: ['Tapis roulant', 'Cyclette', 'Ellittiche'],
      status: 'occupied',
      currentBookings: 5,
      nextAvailable: '16:00'
    },
    {
      id: '3',
      name: 'Sala C - Pesi',
      capacity: 20,
      equipment: ['Manubri', 'Bilancieri', 'Rack'],
      status: 'maintenance',
      currentBookings: 0,
      nextAvailable: 'Domani 09:00'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-success text-success-foreground';
      case 'occupied': return 'bg-warning text-warning-foreground';
      case 'maintenance': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponibile';
      case 'occupied': return 'Occupata';
      case 'maintenance': return 'Manutenzione';
      default: return 'Sconosciuto';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Sale
          </h1>
          <p className="text-muted-foreground">
            Gestisci le sale, equipaggiamenti e prenotazioni
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nuova Sala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuova Sala</DialogTitle>
            </DialogHeader>
            <RoomForm 
              mode="create" 
              onSuccess={() => {
                setIsCreateDialogOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{room.name}</CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Capacità: {room.capacity} persone</span>
                  </div>
                </div>
                <Badge className={getStatusColor(room.status)}>
                  {getStatusLabel(room.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Equipaggiamento:</p>
                <div className="flex flex-wrap gap-1">
                  {room.equipment.map((item, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{room.currentBookings} prenotazioni oggi</span>
                </div>
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">Prossima disponibilità: </span>
                <span className="font-medium">{room.nextAvailable}</span>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedRoom(room);
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Modifica
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Calendar className="mr-1 h-3 w-3" />
                  Calendario
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Statistiche Sale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-success">2</p>
              <p className="text-sm text-muted-foreground">Sale Disponibili</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">1</p>
              <p className="text-sm text-muted-foreground">Sale Occupate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">1</p>
              <p className="text-sm text-muted-foreground">In Manutenzione</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">87%</p>
              <p className="text-sm text-muted-foreground">Utilizzo Medio</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifica Sala: {selectedRoom?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <RoomForm 
              mode="edit" 
              room={selectedRoom}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedRoom(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRooms;