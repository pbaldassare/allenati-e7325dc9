import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Course } from '@/contexts/AppDataContext';
import { CourseScheduleManager } from './CourseScheduleManager';

const courseSchema = z.object({
  name: z.string().min(2, 'Il nome deve essere di almeno 2 caratteri'),
  description: z.string().min(10, 'La descrizione deve essere di almeno 10 caratteri'),
  instructor: z.string().min(2, 'Il nome dell\'istruttore è obbligatorio'),
  category: z.string().min(1, 'Seleziona una categoria'),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  duration: z.number().min(15, 'La durata minima è 15 minuti').max(180, 'La durata massima è 180 minuti'),
  maxParticipants: z.number().min(1, 'Almeno 1 partecipante').max(50, 'Massimo 50 partecipanti'),
  price: z.number().min(0, 'Il prezzo non può essere negativo'),
  requiredCredits: z.number().min(1, 'Almeno 1 credito richiesto').max(5, 'Massimo 5 crediti'),
  image: z.string().url('Inserisci un URL valido per l\'immagine'),
  tags: z.array(z.string()).min(1, 'Aggiungi almeno un tag'),
  isActive: z.boolean(),
  schedule: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    time: z.string(),
  })).min(1, 'Aggiungi almeno un orario'),
});

type CourseFormData = z.infer<typeof courseSchema>;

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
  
  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: course?.name || '',
      description: course?.description || '',
      instructor: course?.instructor || '',
      category: course?.category || '',
      level: course?.level || 'Beginner',
      duration: course?.duration || 60,
      maxParticipants: course?.maxParticipants || 15,
      price: course?.price || 25,
      requiredCredits: course?.requiredCredits || 1,
      image: course?.image || '',
      tags: course?.tags || [],
      isActive: course?.isActive ?? true,
      schedule: course?.schedule || [],
    }
  });

  const { watch, setValue } = form;
  const tags = watch('tags');

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setValue('tags', [...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setValue('tags', tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (data: CourseFormData) => {
    const courseData: Partial<Course> = {
      ...data,
      id: course?.id || '',
      instructorImage: course?.instructorImage || '/api/placeholder/100/100',
      currentParticipants: course?.currentParticipants || 0,
      rating: course?.rating || 4.5,
      schedule: data.schedule.map(s => ({
        dayOfWeek: s.dayOfWeek,
        time: s.time,
      })),
    };
    onSubmit(courseData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Corso</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. BJJ Principianti" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrizione</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrivi il corso, i suoi benefici e cosa impareranno i partecipanti..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Immagine</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Link all'immagine rappresentativa del corso
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Corso Attivo</FormLabel>
                      <FormDescription>
                        Il corso sarà visibile e prenotabile dagli utenti
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle>Dettagli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Istruttore</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome Cognome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Livello</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Beginner">Principiante</SelectItem>
                          <SelectItem value="Intermediate">Intermedio</SelectItem>
                          <SelectItem value="Advanced">Avanzato</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durata (minuti)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Partecipanti</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiredCredits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Crediti Richiesti</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                {tags.map((tag) => (
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Aggiungi un tag..."]') as HTMLInputElement;
                    if (input) {
                      addTag(input.value);
                      input.value = '';
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <FormMessage />
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Programmazione Orari</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="schedule"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <CourseScheduleManager
                      schedule={field.value.map(s => ({ dayOfWeek: s.dayOfWeek, time: s.time }))}
                      onChange={(schedule) => field.onChange(schedule)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
    </Form>
  );
};