import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  ArrowLeft,
  Edit,
  Users,
  Clock,
  Euro,
  Calendar,
  Star,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCourseById, bookings, getAllUsers } = useAppData();
  
  const course = getCourseById(id!);
  const users = getAllUsers();
  
  if (!course) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Corso non trovato</h1>
          <Button onClick={() => navigate('/admin/courses')} className="mt-4">
            Torna alla lista
          </Button>
        </div>
      </div>
    );
  }

  // Get course bookings and participants
  const courseBookings = bookings.filter(booking => booking.courseId === course.id);
  const participants = courseBookings
    .filter(booking => booking.status === 'confirmed')
    .map(booking => users.find(user => user.id === booking.userId))
    .filter(Boolean);

  const recentBookings = courseBookings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const occupancyRate = (course.currentParticipants / course.maxParticipants) * 100;
  const revenue = courseBookings.filter(b => b.status === 'confirmed').length * course.price;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/admin/courses')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {course.name}
            </h1>
            <p className="text-muted-foreground">
              Dettagli completi del corso
            </p>
          </div>
        </div>
        <Link to={`/admin/courses/${course.id}/edit`}>
          <Button className="bg-gradient-primary">
            <Edit className="mr-2 h-4 w-4" />
            Modifica Corso
          </Button>
        </Link>
      </div>

      {/* Course Info Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informazioni Corso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start space-x-4">
              <img 
                src={course.image} 
                alt={course.name}
                className="w-32 h-32 rounded-lg object-cover"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-xl font-semibold">{course.name}</h3>
                  <p className="text-muted-foreground">{course.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{course.category}</Badge>
                  <Badge className={getLevelColor(course.level)}>
                    {course.level}
                  </Badge>
                  {course.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Istruttore:</span>
                  <span>{course.instructor}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Durata:</span>
                  <span>{course.duration} minuti</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Prezzo:</span>
                  <span>€{course.price}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Crediti richiesti:</span>
                  <span>{course.requiredCredits}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Rating:</span>
                  <span>{course.rating}/5</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Orari:</span>
                  <span>
                    {course.schedule.map(s => {
                      const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
                      return `${days[s.dayOfWeek]} ${s.time}`;
                    }).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Occupazione</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {course.currentParticipants}/{course.maxParticipants} partecipanti
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{revenue}</div>
              <p className="text-xs text-muted-foreground">
                {courseBookings.filter(b => b.status === 'confirmed').length} prenotazioni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={course.isActive ? 'default' : 'secondary'}>
                {course.isActive ? 'Attivo' : 'Inattivo'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle>Partecipanti Iscritti ({participants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Abbonamento</TableHead>
                  <TableHead>Data Iscrizione</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((participant: any) => {
                  const booking = courseBookings.find(b => b.userId === participant.id);
                  return (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.name}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{participant.subscription}</Badge>
                      </TableCell>
                      <TableCell>
                        {booking ? new Date(booking.createdAt).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessun partecipante iscritto
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Attività Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentBookings.length > 0 ? (
            <div className="space-y-3">
              {recentBookings.map((booking) => {
                const user = users.find(u => u.id === booking.userId);
                return (
                  <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {user?.name} ha prenotato il corso
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(booking.createdAt).toLocaleDateString()} alle {new Date(booking.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      booking.status === 'confirmed' ? 'default' :
                      booking.status === 'waitlist' ? 'secondary' :
                      booking.status === 'cancelled' ? 'destructive' :
                      'outline'
                    }>
                      {booking.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna attività recente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseDetail;