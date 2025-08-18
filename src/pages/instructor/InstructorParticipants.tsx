import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInstructorBookings } from '@/hooks/useInstructorBookings';
import { useInstructorCourses } from '@/hooks/useInstructorCourses';
import { Users, Search, Calendar, Mail, Phone, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
} from "@/components/ui/alert-dialog";

const InstructorParticipants = () => {
  const [searchParams] = useSearchParams();
  const selectedCourseId = searchParams.get('course');
  
  const { bookings, loading, cancelBooking } = useInstructorBookings();
  const { courses } = useInstructorCourses();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>(selectedCourseId || 'all');

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchTerm || 
      booking.user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || booking.course.id === selectedCourse;
    const isActive = booking.status === 'confirmed';
    
    return matchesSearch && matchesCourse && isActive;
  });

  const formatDate = (date: string, time: string) => {
    const dateObj = new Date(`${date}T${time}`);
    return dateObj.toLocaleDateString('it-IT', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCancelBooking = async (bookingId: string, userName: string) => {
    await cancelBooking(bookingId, `Cancellata dall'istruttore per ${userName}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Partecipanti
        </h1>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted rounded w-full mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Partecipanti
          </h1>
          <p className="text-muted-foreground">
            Gestisci i partecipanti ai tuoi corsi
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          <Users className="w-3 h-3 mr-1" />
          {filteredBookings.length} partecipanti
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                <option value="all">Tutti i corsi</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Users className="w-12 h-12 mx-auto text-muted-foreground" />
              <h3 className="text-lg font-semibold">Nessun partecipante trovato</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCourse !== 'all' 
                  ? 'Prova a modificare i filtri di ricerca.'
                  : 'Non ci sono partecipanti attivi ai tuoi corsi.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {booking.user.first_name} {booking.user.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {booking.course.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(booking.scheduled_date, booking.scheduled_time)}
                      </div>
                      {booking.user.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {booking.user.email}
                        </div>
                      )}
                      {booking.user.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {booking.user.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Confermata
                    </Badge>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <X className="w-4 h-4 mr-1" />
                          Cancella
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Conferma Cancellazione</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sei sicuro di voler cancellare la prenotazione di {booking.user.first_name} {booking.user.last_name} 
                            per il corso "{booking.course.name}"?
                            <br /><br />
                            Questa azione non può essere annullata.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleCancelBooking(booking.id, `${booking.user.first_name} ${booking.user.last_name}`)}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            Conferma Cancellazione
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InstructorParticipants;