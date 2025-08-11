import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Plus, Users, Calendar, Star, Edit, Mail } from 'lucide-react';
import { useInstructors } from '@/hooks/useInstructors';
import { InstructorForm } from '@/components/admin/InstructorForm';

const AdminInstructors = () => {
  const { instructors, loading, refetch } = useInstructors();
  const [selectedInstructor, setSelectedInstructor] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo Istruttore
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuovo Istruttore</DialogTitle>
            </DialogHeader>
            <InstructorForm 
              mode="create" 
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Caricamento istruttori...</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {instructors.map((instructor) => (
            <Card key={instructor.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {instructor.profiles.first_name} {instructor.profiles.last_name}
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span>ID: {instructor.user_id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <Badge variant={instructor.is_active ? 'default' : 'secondary'}>
                    {instructor.is_active ? 'Attivo' : 'Inattivo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{instructor.experience_years || 0} anni</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>€{instructor.hourly_rate || 0}/h</span>
                  </div>
                </div>

                {instructor.specializations && instructor.specializations.length > 0 && (
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
                )}

                {instructor.bio && (
                  <div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {instructor.bio}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedInstructor(instructor);
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Modifica
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Calendar className="mr-1 h-3 w-3" />
                    Corsi
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Modifica Istruttore: {selectedInstructor?.profiles.first_name} {selectedInstructor?.profiles.last_name}
            </DialogTitle>
          </DialogHeader>
          {selectedInstructor && (
            <InstructorForm 
              mode="edit" 
              instructor={selectedInstructor}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedInstructor(null);
                refetch();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInstructors;