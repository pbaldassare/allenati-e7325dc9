import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { X, Plus, Loader2 } from 'lucide-react';

const roomSchema = z.object({
  name: z.string().min(3, 'Il nome deve essere almeno 3 caratteri'),
  capacity: z.coerce.number().min(1, 'La capacità deve essere almeno 1'),
  description: z.string().optional(),
  equipment: z.array(z.string()).min(1, 'Aggiungi almeno un equipaggiamento'),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface Room {
  id: string;
  name: string;
  capacity: number;
  description?: string;
  equipment: string[];
}

interface RoomFormProps {
  mode: 'create' | 'edit';
  room?: Room;
  onSuccess?: () => void;
}

export const RoomForm: React.FC<RoomFormProps> = ({ 
  mode, 
  room, 
  onSuccess 
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: room ? {
      name: room.name,
      capacity: room.capacity,
      description: room.description || '',
      equipment: room.equipment.length > 0 ? room.equipment : [''],
    } : {
      name: '',
      capacity: 20,
      description: '',
      equipment: [''],
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual database operations
      console.log('Room data:', data);
      
      toast({
        title: mode === 'create' ? 'Sala creata' : 'Sala aggiornata',
        description: 'Le modifiche sono state salvate con successo',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error saving room:', error);
      toast({
        title: 'Errore',
        description: 'Si è verificato un errore durante il salvataggio',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEquipment = () => {
    const current = form.getValues('equipment');
    form.setValue('equipment', [...current, '']);
  };

  const removeEquipment = (index: number) => {
    const current = form.getValues('equipment');
    if (current.length > 1) {
      form.setValue('equipment', current.filter((_, i) => i !== index));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni Sala</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Sala</FormLabel>
                    <FormControl>
                      <Input placeholder="Sala A - Yoga" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacità (persone)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="25" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrizione (Opzionale)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrivi la sala e le sue caratteristiche..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader>
            <CardTitle>Equipaggiamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.watch('equipment').map((_, index) => (
              <div key={index} className="flex gap-2">
                <FormField
                  control={form.control}
                  name={`equipment.${index}`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="es. Tappetini yoga, Manubri, Cyclette"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeEquipment(index)}
                  disabled={form.watch('equipment').length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEquipment}
            >
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi Equipaggiamento
            </Button>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button 
            type="submit" 
            className="bg-gradient-primary"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Crea Sala' : 'Salva Modifiche'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            disabled={isSubmitting}
          >
            Annulla
          </Button>
        </div>
      </form>
    </Form>
  );
};