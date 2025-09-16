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
import { useOwnerGym } from '@/contexts/OwnerGymContext';

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

const presets = [
  {
    name: 'Piano 10 entrate',
    description: 'Ideale per chi va in palestra saltuariamente',
    price: 50,
    duration_days: 60,
    credits_included: 10,
    unlimited_access: false,
    is_trial: false,
    features: ['10 ingressi in 60 giorni', 'Valido per tutti i corsi', 'Assistenza clienti']
  },
  {
    name: 'Piano 20 entrate',
    description: 'Perfetto per chi si allena regolarmente',
    price: 90,
    duration_days: 90,
    credits_included: 20,
    unlimited_access: false,
    is_trial: false,
    features: ['20 ingressi in 90 giorni', 'Valido per tutti i corsi', 'Assistenza clienti']
  },
  {
    name: 'Abbonamento Mensile',
    description: 'Accesso illimitato per 30 giorni',
    price: 60,
    duration_days: 30,
    credits_included: 0,
    unlimited_access: true,
    is_trial: false,
    features: ['Accesso illimitato', 'Tutti i corsi inclusi', 'Assistenza clienti', 'App mobile']
  },
  {
    name: 'Abbonamento Annuale',
    description: 'Accesso illimitato per un anno intero',
    price: 600,
    duration_days: 365,
    credits_included: 0,
    unlimited_access: true,
    is_trial: false,
    features: ['Accesso illimitato', 'Tutti i corsi inclusi', 'Assistenza clienti', 'App mobile', 'Sconto 17%']
  }
];

const SubscriptionPlanForm: React.FC<SubscriptionPlanFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingPlan,
}) => {
  const { selectedGym } = useOwnerGym();
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
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Validation: if unlimited_access is true, force credits_included to 0
      if (field === 'unlimited_access' && value === true) {
        updated.credits_included = 0;
      }
      
      // If setting credits_included > 0, force unlimited_access to false
      if (field === 'credits_included' && value > 0) {
        updated.unlimited_access = false;
      }
      
      return updated;
    });
  };

  const handlePresetSelect = (preset: typeof presets[0]) => {
    setFormData({
      ...formData,
      ...preset
    });
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
      // Debug logging
      console.log('🔍 DEBUG - Form submission started');
      console.log('📍 User auth state:', { uid: (await supabase.auth.getUser()).data.user?.id });
      console.log('🏃 Selected gym:', selectedGym);
      console.log('📋 Form data:', formData);
      
      if (!selectedGym?.id) {
        console.error('❌ No gym selected');
        throw new Error('Nessuna palestra selezionata');
      }

      const planData = {
        ...formData,
        gym_id: selectedGym.id,
        features: formData.features,
      };
      
      console.log('📦 Plan data to be sent:', planData);

      let error, data;
      if (editingPlan) {
        console.log('✏️ Updating existing plan:', editingPlan.id);
        ({ error, data } = await supabase
          .from('subscription_plans')
          .update(planData)
          .eq('id', editingPlan.id)
          .select());
      } else {
        console.log('🆕 Creating new plan');
        ({ error, data } = await supabase
          .from('subscription_plans')
          .insert([planData])
          .select());
      }

      console.log('📤 Supabase response:', { error, data });

      if (error) {
        console.error('❌ Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Plan saved successfully:', data);

      toast({
        title: editingPlan ? 'Piano aggiornato' : 'Piano creato',
        description: `Il piano "${formData.name}" è stato ${editingPlan ? 'aggiornato' : 'creato'} con successo`,
      });

      onSuccess();
    } catch (error) {
      console.error('💥 Error saving plan:', error);
      
      // More detailed error message
      let errorMessage = `Impossibile ${editingPlan ? 'aggiornare' : 'creare'} il piano`;
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      toast({
        title: 'Errore',
        description: errorMessage,
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

        {/* Preset Selection - Only show for new plans */}
        {!editingPlan && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h3 className="font-semibold text-sm">Modelli Rapidi</h3>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="text-xs h-auto p-2 flex flex-col items-start"
                >
                  <div className="font-medium">{preset.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {preset.unlimited_access ? preset.name : `${preset.credits_included} crediti`} - {preset.duration_days}gg
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

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
              <Label htmlFor="credits">
                Crediti Inclusi 
                {formData.unlimited_access && (
                  <span className="text-xs text-muted-foreground ml-1">(disabilitato per accesso illimitato)</span>
                )}
              </Label>
              <Input
                id="credits"
                type="number"
                min="0"
                value={formData.credits_included}
                onChange={(e) => handleInputChange('credits_included', parseInt(e.target.value) || 0)}
                disabled={formData.unlimited_access}
                className={formData.unlimited_access ? 'bg-muted' : ''}
              />
              {!formData.unlimited_access && formData.credits_included > 0 && (
                <p className="text-xs text-muted-foreground">
                  Piano a crediti: ogni prenotazione consumerà 1 credito
                </p>
              )}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Accesso Illimitato</Label>
                <p className="text-xs text-muted-foreground">
                  Abbonamento mensile/annuale senza limite di ingressi
                </p>
              </div>
              <Switch
                checked={formData.unlimited_access}
                onCheckedChange={(checked) => handleInputChange('unlimited_access', checked)}
              />
            </div>
            
            {formData.unlimited_access && formData.credits_included > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Attenzione: Non puoi avere accesso illimitato E crediti inclusi contemporaneamente
                </p>
              </div>
            )}

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