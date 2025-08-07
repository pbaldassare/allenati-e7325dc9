import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/layouts/AdminLayout';
import { useAppData } from '@/contexts/AppDataContext';
import { CourseParticipants } from '@/components/admin/CourseParticipants';
import { CourseAnalytics } from '@/components/admin/CourseAnalytics';
import { CourseScheduleDisplay } from '@/components/admin/CourseScheduleDisplay';
import {
  Edit,
  Users,
  Calendar,
  Euro,
  MapPin,
  Clock,
  Award,
  TrendingUp
} from 'lucide-react';

const AdminCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { getCourseById } = useAppData();
  const course = getCourseById(id!);

  if (!course) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Corso non trovato</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img 
            src={course.image} 
            alt={course.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {course.name}
            </h1>
            <p className="text-muted-foreground">
              Istruttore: {course.instructor}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/courses/${course.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Modifica Corso
          </Link>
        </Button>
      </div>

      {/* Course Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {course.currentParticipants}/{course.maxParticipants}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((course.currentParticipants / course.maxParticipants) * 100)}% occupazione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prezzo</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{course.price}</div>
            <p className="text-xs text-muted-foreground">
              Per lezione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durata</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{course.duration}</div>
            <p className="text-xs text-muted-foreground">
              Minuti per lezione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livello</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant="secondary">{course.level}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Difficoltà corso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Corso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Descrizione</h4>
              <p className="text-sm text-muted-foreground">{course.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Categoria</h4>
                <Badge variant="outline">{course.category}</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-1">Livello</h4>
                <Badge variant="secondary">{course.level}</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Benefici</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {course.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programma Settimanale</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseScheduleDisplay schedule={course.schedule} />
          </CardContent>
        </Card>
      </div>

      {/* Analytics and Participants */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CourseAnalytics courseId={course.id} />
        </div>
        <div>
          <CourseParticipants courseId={course.id} />
        </div>
      </div>
    </div>
  );
};

export default AdminCourseDetail;