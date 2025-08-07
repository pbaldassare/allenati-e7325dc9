import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppData } from '@/contexts/AppDataContext';
import { Search, Mail, Phone, Calendar, UserMinus } from 'lucide-react';

interface CourseParticipantsProps {
  courseId: string;
}

export const CourseParticipants: React.FC<CourseParticipantsProps> = ({ courseId }) => {
  const { getAllUsers, bookings } = useAppData();
  const users = getAllUsers();
  
  // Get participants for this course
  const courseBookings = bookings.filter(booking => 
    booking.courseId === courseId && booking.status === 'confirmed'
  );
  
  const participants = users.filter(user => 
    courseBookings.some(booking => booking.userId === user.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Partecipanti ({participants.length})</span>
          <Button variant="outline" size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Invia Email
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca partecipanti..."
            className="pl-10"
          />
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          {participants.map((participant) => {
            const booking = courseBookings.find(b => b.userId === participant.id);
            return (
              <div key={participant.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-white text-xs">
                      {participant.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{participant.name}</p>
                    <p className="text-xs text-muted-foreground">{participant.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant={participant.subscription === 'Premium' ? 'default' : 'secondary'}>
                    {participant.subscription}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {participants.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nessun partecipante iscritto</p>
          </div>
        )}

        {/* Waiting List */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Lista d'Attesa (0)</h4>
          <p className="text-sm text-muted-foreground">
            Nessuno in lista d'attesa
          </p>
        </div>
      </CardContent>
    </Card>
  );
};