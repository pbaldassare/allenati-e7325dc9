import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Plus, Users, Calendar, Star } from 'lucide-react';

const AdminInstructors = () => {
  const instructors = [
    {
      id: '1',
      name: 'Marco Rossi',
      email: 'marco.rossi@gmail.com',
      specializations: ['Yoga', 'Pilates'],
      rating: 4.8,
      activeCourses: 3,
      totalStudents: 45,
      status: 'active'
    },
    {
      id: '2',
      name: 'Sofia Bianchi',
      email: 'sofia.bianchi@gmail.com',
      specializations: ['Cardio', 'HIIT'],
      rating: 4.9,
      activeCourses: 2,
      totalStudents: 38,
      status: 'active'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Gestione Istruttori
          </h1>
          <p className="text-muted-foreground">
            Gestisci gli istruttori e le loro specializzazioni
          </p>
        </div>
        <Button className="bg-gradient-primary">
          <Plus className="mr-2 h-4 w-4" />
          Nuovo Istruttore
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {instructors.map((instructor) => (
          <Card key={instructor.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{instructor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{instructor.email}</p>
                </div>
                <Badge variant={instructor.status === 'active' ? 'default' : 'secondary'}>
                  {instructor.status === 'active' ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-warning fill-warning" />
                  <span>{instructor.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{instructor.activeCourses} corsi</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{instructor.totalStudents} studenti</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Specializzazioni:</p>
                <div className="flex flex-wrap gap-1">
                  {instructor.specializations.map((spec, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Dettagli
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Calendario
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminInstructors;