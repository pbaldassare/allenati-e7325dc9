import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  credits_included: number;
  unlimited_access: boolean;
  is_trial: boolean;
  is_active: boolean;
  features: string[];
  gym_id: string | null;
}

interface SubscriptionPlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingPlan: SubscriptionPlan | null;
}

const SubscriptionPlanForm: React.FC<SubscriptionPlanFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPlan,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    duration_days: 30,
    credits_included: 0,
    unlimited_access: false,
    is_trial: false,
    is_active: true,
    features: [] as string[],
  });
  const [newFeature, setNewFeature] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingPlan) {
      setFormData({
        name: editingPlan.name,
        description: editingPlan.description || '',
        price: editingPlan.price,
        duration_days: editingPlan.duration_days,
        credits_included: editingPlan.credits_included,
        unlimited_access: editingPlan.unlimited_access,
        is_trial: editingPlan.is_trial,
        is_active: editingPlan.is_active,
        features: editingPlan.features || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        duration_days: 30,
        credits_included: 0,
        unlimited_access: false,
        is_trial: false,
        is_active: true,
        features: [],
      });
    }
  }, [editingPlan, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: gymId } = await supabase.rpc('get_user_gym_id', { _user_id: user.id });
      if (!gymId) throw new Error('Gym not found');

      const planData = {
        ...formData,
        gym_id: gymId,
        features: formData.features,
      };

      let error;
      if (editingPlan) {
        ({ error } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id));
      } else {
        ({ error } = await supabase
          .from('subscription_plans')
          .insert([planData]));
      }

      if (error) throw error;

      toast({
        title: editingPlan ? 'Piano aggiornato' : 'Piano creato',
        description: `Il piano "${formData.name}" è stato ${editingPlan ? 'aggiornato' : 'creato'} con successo`,
      });

      onSuccess();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: 'Errore',
        description: `Impossibile ${editingPlan ? 'aggiornare' : 'creare'} il piano`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'Modifica Piano Abbonamento' : 'Nuovo Piano Abbonamento'}
          </DialogTitle>
          <DialogDescription>
            {editingPlan 
              ? 'Modifica i dettagli del piano abbonamento'
              : 'Crea un nuovo piano abbonamento personalizzato per la tua palestra'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Piano *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="es. Premium Mensile"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Prezzo (€) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrizione</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descrizione del piano abbonamento"
              rows={3}
            />
          </div>

          {/* Duration and Access */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Durata (giorni) *</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={formData.duration_days}
                onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 30)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credits">Crediti Inclusi</Label>
              <Input
                id="credits"
                type="number"
                min="0"
                value={formData.credits_included}
                onChange={(e) => handleInputChange('credits_included', parseInt(e.target.value) || 0)}
                disabled={formData.unlimited_access}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Accesso Illimitato</Label>
                <p className="text-sm text-muted-foreground">
                  Permette accesso illimitato a tutti i corsi
                </p>
              </div>
              <Switch
                checked={formData.unlimited_access}
                onCheckedChange={(checked) => {
                  handleInputChange('unlimited_access', checked);
                  if (checked) {
                    handleInputChange('credits_included', 0);
                  }
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Piano Trial</Label>
                <p className="text-sm text-muted-foreground">
                  Contrassegna come piano di prova gratuito
                </p>
              </div>
              <Switch
                checked={formData.is_trial}
                onCheckedChange={(checked) => handleInputChange('is_trial', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Piano Attivo</Label>
                <p className="text-sm text-muted-foreground">
                  Il piano sarà disponibile per la sottoscrizione
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <Label>Caratteristiche del Piano</Label>
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Aggiungi una caratteristica..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
              />
              <Button type="button" onClick={handleAddFeature} variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFeature(index)}
                    className="h-4 w-4 p-0 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? 'Salvando...' 
                : editingPlan 
                  ? 'Aggiorna Piano' 
                  : 'Crea Piano'
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPlanForm;