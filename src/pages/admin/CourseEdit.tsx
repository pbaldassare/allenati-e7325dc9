import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CourseForm } from '@/components/admin/CourseForm';
import { Course, useAppData } from '@/contexts/AppDataContext';

const CourseEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCourseById } = useAppData();
  
  const course = getCourseById(id!);

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

  const handleSubmit = (courseData: Partial<Course>) => {
    // TODO: Implement course update in context
    console.log('Updating course:', courseData);
    navigate(`/admin/courses/${id}`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/admin/courses/${id}`)}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Modifica Corso
          </h1>
          <p className="text-muted-foreground">
            Modifica le informazioni del corso "{course.name}"
          </p>
        </div>
      </div>

      {/* Form */}
      <CourseForm course={course} onSubmit={handleSubmit} />
    </div>
  );
};

export default CourseEdit;