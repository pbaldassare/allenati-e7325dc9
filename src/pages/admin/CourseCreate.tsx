import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CourseForm } from '@/components/admin/CourseForm';
import { Course } from '@/contexts/AppDataContext';

const CourseCreate = () => {
  const navigate = useNavigate();

  const handleSubmit = (courseData: Partial<Course>) => {
    // TODO: Implement course creation in context
    console.log('Creating course:', courseData);
    navigate('/admin/courses');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
            Nuovo Corso
          </h1>
          <p className="text-muted-foreground">
            Crea un nuovo corso per la palestra
          </p>
        </div>
      </div>

      {/* Form */}
      <CourseForm onSubmit={handleSubmit} />
    </div>
  );
};

export default CourseCreate;