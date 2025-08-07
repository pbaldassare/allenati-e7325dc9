import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';
import { Course } from '@/contexts/AppDataContext';
import { CourseScheduleManager } from './CourseScheduleManager';

interface CourseFormProps {
  course?: Course;
  onSubmit: (data: Partial<Course>) => void;
}

const categories = [
  'BJJ', 'MMA', 'Boxing', 'Muay Thai', 'Wrestling', 
  'Grappling', 'Yoga', 'Functional', 'Cardio', 'Fitness'
];

export const CourseForm: React.FC<CourseFormProps> = ({ course, onSubmit }) => {
  const isEdit = !!course;
  
  const [formData, setFormData] = useState({
    name: course?.name || '',
    description: course?.description || '',
    instructor: course?.instructor || '',
    category: course?.category || '',
    level: course?.level || 'Beginner' as const,
    duration: course?.duration || 60,
    maxParticipants: course?.maxParticipants || 15,
    price: course?.price || 25,
    requiredCredits: course?.requiredCredits || 1,
    image: course?.image || '',
    tags: course?.tags || [],
    isActive: course?.isActive ?? true,
    schedule: course?.schedule || [],
  });

  const [newTag, setNewTag] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, tag] 
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const courseData: Partial<Course> = {
      ...formData,
      id: course?.id || '',
      instructorImage: course?.instructorImage || '/api/placeholder/100/100',
      currentParticipants: course?.currentParticipants || 0,
      rating: course?.rating || 4.5,
    };
    onSubmit(courseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Corso</Label>
              <Input
                id="name"
                placeholder="Es. BJJ Principianti"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                placeholder="Descrivi il corso, i suoi benefici e cosa impareranno i partecipanti..."
                className="min-h-[100px]"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">URL Immagine</Label>
              <Input
                id="image"
                placeholder="https://..."
                value={formData.image}
                onChange={(e) => handleInputChange('image', e.target.value)}
              />
            </div>

            <div className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base">Corso Attivo</Label>
                <p className="text-sm text-muted-foreground">
                  Il corso sarà visibile e prenotabile dagli utenti
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instructor">Istruttore</Label>
              <Input
                id="instructor"
                placeholder="Nome Cognome"
                value={formData.instructor}
                onChange={(e) => handleInputChange('instructor', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Livello</Label>
                <Select 
                  value={formData.level} 
                  onValueChange={(value) => handleInputChange('level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Principiante</SelectItem>
                    <SelectItem value="Intermediate">Intermedio</SelectItem>
                    <SelectItem value="Advanced">Avanzato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Durata (minuti)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  min={15}
                  max={180}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Max Partecipanti</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', parseInt(e.target.value))}
                  min={1}
                  max={50}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prezzo (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  min={0}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredCredits">Crediti Richiesti</Label>
                <Input
                  id="requiredCredits"
                  type="number"
                  value={formData.requiredCredits}
                  onChange={(e) => handleInputChange('requiredCredits', parseInt(e.target.value))}
                  min={1}
                  max={5}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Aggiungi un tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(newTag);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => addTag(newTag)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Programmazione Orari</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseScheduleManager
            schedule={formData.schedule}
            onChange={(schedule) => handleInputChange('schedule', schedule)}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline">
          Annulla
        </Button>
        <Button type="submit" className="bg-gradient-primary">
          {isEdit ? 'Salva Modifiche' : 'Crea Corso'}
        </Button>
      </div>
    </form>
  );
};