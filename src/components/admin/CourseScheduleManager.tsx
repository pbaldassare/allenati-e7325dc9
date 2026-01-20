import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, MapPin, Users, Signal, Save, RotateCcw } from 'lucide-react';
import type { ScheduleItem, GymRoom } from '@/types/schedule';
import { DeleteScheduleConfirmDialog } from '@/components/dialogs/DeleteScheduleConfirmDialog';
import { SaveScheduleConfirmDialog } from '@/components/dialogs/SaveScheduleConfirmDialog';

interface CourseScheduleManagerProps {
  schedule: ScheduleItem[];
  /** For manual save mode - shows save/cancel buttons with confirmation */
  onSave?: (schedule: ScheduleItem[]) => Promise<void>;
  /** For inline/form mode - called on every change (no confirmation dialog) */
  onChange?: (schedule: ScheduleItem[]) => void;
  gymRooms: GymRoom[];
  courseMaxParticipants?: number;
  courseDifficultyLevel?: number;
}

const daysOfWeek = [
  { value: 1, label: 'Lunedì' },
  { value: 2, label: 'Martedì' },
  { value: 3, label: 'Mercoledì' },
  { value: 4, label: 'Giovedì' },
  { value: 5, label: 'Venerdì' },
  { value: 6, label: 'Sabato' },
  { value: 0, label: 'Domenica' },
];

const difficultyOptions = [
  { value: 'default', label: 'Come corso' },
  { value: '1', label: '1 - Principiante' },
  { value: '2', label: '2 - Intermedio' },
  { value: '3', label: '3 - Avanzato' },
];

const generateScheduleId = () => `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const CourseScheduleManager: React.FC<CourseScheduleManagerProps> = ({
  schedule,
  onSave,
  onChange,
  gymRooms,
  courseMaxParticipants,
  courseDifficultyLevel,
}) => {
  // Determine mode: manual save (with confirmation) or inline (immediate updates)
  const isManualSaveMode = Boolean(onSave);
  
  // Initialize schedules from prop with tracking fields
  const initializeSchedules = useCallback((schedules: ScheduleItem[]): ScheduleItem[] => {
    if (schedules.length > 0) {
      return schedules.map(item => ({
        ...item,
        id: item.id || generateScheduleId(),
        originalDayOfWeek: item.dayOfWeek,
        originalTime: item.time
      }));
    }
    return [{ 
      id: generateScheduleId(),
      dayOfWeek: 1, 
      time: '09:00', 
      end_time: '10:00', 
      roomId: '', 
      day: 'Lunedì',
      maxParticipantsOverride: null,
      difficultyLevelOverride: null,
      originalDayOfWeek: undefined,
      originalTime: undefined
    }];
  }, []);

  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(() => initializeSchedules(schedule));
  const [originalSchedules, setOriginalSchedules] = useState<ScheduleItem[]>(() => initializeSchedules(schedule));
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{
    index: number;
    day: string;
    time: string;
    end_time: string;
    roomName?: string;
  } | null>(null);

  // Sync with external schedule changes (e.g., after page reload)
  useEffect(() => {
    const initialized = initializeSchedules(schedule);
    setScheduleItems(initialized);
    setOriginalSchedules(initialized);
    setHasUnsavedChanges(false);
  }, [schedule, initializeSchedules]);

  // Detect changes
  const detectChanges = useCallback(() => {
    const changes: { type: 'added' | 'removed' | 'modified'; schedule: ScheduleItem; oldSchedule?: ScheduleItem }[] = [];
    
    // Find added and modified schedules
    scheduleItems.forEach(item => {
      const original = originalSchedules.find(o => o.id === item.id);
      if (!original) {
        // New schedule (no matching ID in original)
        changes.push({ type: 'added', schedule: item });
      } else if (
        original.dayOfWeek !== item.dayOfWeek ||
        original.time !== item.time ||
        original.end_time !== item.end_time ||
        original.roomId !== item.roomId ||
        original.maxParticipantsOverride !== item.maxParticipantsOverride ||
        original.difficultyLevelOverride !== item.difficultyLevelOverride
      ) {
        // Modified schedule
        changes.push({ type: 'modified', schedule: item, oldSchedule: original });
      }
    });
    
    // Find removed schedules
    originalSchedules.forEach(original => {
      const exists = scheduleItems.find(item => item.id === original.id);
      if (!exists) {
        changes.push({ type: 'removed', schedule: original });
      }
    });
    
    return changes;
  }, [scheduleItems, originalSchedules]);

  const notifyChange = useCallback((newSchedules: ScheduleItem[]) => {
    if (!isManualSaveMode && onChange) {
      // In inline mode, call onChange immediately
      const hasIncomplete = newSchedules.some(item => !item.roomId);
      if (!hasIncomplete) {
        onChange(newSchedules);
      }
    } else {
      // In manual save mode, just mark as having unsaved changes
      setHasUnsavedChanges(true);
    }
  }, [isManualSaveMode, onChange]);

  const addScheduleItem = () => {
    const newItem: ScheduleItem = {
      id: generateScheduleId(),
      dayOfWeek: 1,
      time: '09:00',
      end_time: '10:00',
      roomId: '',
      day: 'Lunedì',
      maxParticipantsOverride: null,
      difficultyLevelOverride: null,
      originalDayOfWeek: undefined,
      originalTime: undefined
    };
    const newSchedules = [newItem, ...scheduleItems];
    setScheduleItems(newSchedules);
    notifyChange(newSchedules);
  };

  const confirmRemoveScheduleItem = (index: number) => {
    if (scheduleItems.length > 1) {
      const item = scheduleItems[index];
      const roomName = getRoomName(item.roomId);
      setScheduleToDelete({
        index,
        day: item.day || '',
        time: item.time,
        end_time: item.end_time,
        roomName: roomName !== 'Sala non selezionata' ? roomName : undefined
      });
      setDeleteDialogOpen(true);
    }
  };

  const removeScheduleItem = () => {
    if (scheduleToDelete && scheduleItems.length > 1) {
      const newSchedules = scheduleItems.filter((_, i) => i !== scheduleToDelete.index);
      setScheduleItems(newSchedules);
      notifyChange(newSchedules);
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

  const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: any) => {
    const newSchedules = scheduleItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'dayOfWeek') {
          const dayLabel = daysOfWeek.find(d => d.value === value)?.label || '';
          updatedItem.day = dayLabel;
        }
        return updatedItem;
      }
      return item;
    });
    setScheduleItems(newSchedules);
    notifyChange(newSchedules);
  };

  const handleReset = () => {
    setScheduleItems([...originalSchedules]);
    setHasUnsavedChanges(false);
  };

  const handleSaveClick = () => {
    // Check for invalid schedules before saving
    const hasIncomplete = scheduleItems.some(item => !item.roomId);
    if (hasIncomplete) {
      return; // Don't open dialog if there are invalid schedules
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(scheduleItems);
      // Update original schedules to current after successful save
      setOriginalSchedules([...scheduleItems]);
      setHasUnsavedChanges(false);
      setShowSaveConfirm(false);
    } catch (error) {
      console.error('Error saving schedules:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasInvalidSchedules = scheduleItems.some(item => !item.roomId || item.roomId === '');
  const changes = detectChanges();

  const getRoomName = (roomId: string) => {
    return gymRooms.find(room => room.id === roomId)?.name || 'Sala non selezionata';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium">Orari Settimanali</h4>
          <p className="text-sm text-muted-foreground">
            Configura gli orari ricorrenti del corso e assegna le sale
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManualSaveMode && hasUnsavedChanges && (
            <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-warning/30">
              Modifiche non salvate
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addScheduleItem}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi Orario
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {scheduleItems.map((item, index) => (
          <Card key={item.id || index}>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                <div>
                  <label className="text-sm font-medium">Giorno</label>
                  <Select
                    value={item.dayOfWeek.toString()}
                    onValueChange={(value) => 
                      updateScheduleItem(index, 'dayOfWeek', parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map(day => (
                        <SelectItem key={day.value} value={day.value.toString()}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Inizio</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={item.time}
                      onChange={(e) => updateScheduleItem(index, 'time', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Fine</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      value={item.end_time}
                      onChange={(e) => updateScheduleItem(index, 'end_time', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Sala <span className="text-destructive">*</span></label>
                  <Select
                    value={item.roomId}
                    onValueChange={(value) => 
                      updateScheduleItem(index, 'roomId', value)
                    }
                    disabled={gymRooms.length === 0}
                  >
                    <SelectTrigger className={!item.roomId ? 'border-destructive' : ''}>
                      <SelectValue placeholder={gymRooms.length === 0 ? "Nessuna sala disponibile" : "Seleziona sala"}>
                        {item.roomId && (
                          <div className="flex items-center">
                            <MapPin className="mr-2 h-4 w-4" />
                            {getRoomName(item.roomId)}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {gymRooms.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nessuna sala configurata
                        </SelectItem>
                      ) : (
                        gymRooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>
                            <div className="flex items-center">
                              <MapPin className="mr-2 h-4 w-4" />
                              {room.name}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {!item.roomId && (
                    <p className="text-xs text-destructive mt-1">
                      {gymRooms.length === 0 ? 'Nessuna sala disponibile' : 'Sala obbligatoria'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Max Part.
                  </label>
                  <Input
                    type="number"
                    min={1}
                    placeholder={courseMaxParticipants ? courseMaxParticipants.toString() : 'Corso'}
                    value={item.maxParticipantsOverride ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value);
                      updateScheduleItem(index, 'maxParticipantsOverride', val);
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    Difficoltà
                  </label>
                  <Select
                    value={item.difficultyLevelOverride?.toString() ?? 'default'}
                    onValueChange={(value) => {
                      const val = value === 'default' ? null : parseInt(value);
                      updateScheduleItem(index, 'difficultyLevelOverride', val);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Come corso" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => confirmRemoveScheduleItem(index)}
                    disabled={scheduleItems.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Anteprima Orari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {scheduleItems.map((item, index) => {
              const roomName = getRoomName(item.roomId);
              return (
                <Badge key={item.id || index} variant="secondary" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.day} {item.time}-{item.end_time}
                  <MapPin className="h-3 w-3" />
                  {roomName}
                  {item.maxParticipantsOverride && (
                    <>
                      <Users className="h-3 w-3 ml-1" />
                      {item.maxParticipantsOverride}
                    </>
                  )}
                  {item.difficultyLevelOverride && (
                    <>
                      <Signal className="h-3 w-3 ml-1" />
                      Lv.{item.difficultyLevelOverride}
                    </>
                  )}
                </Badge>
              );
            })}
          </div>
          {hasInvalidSchedules && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Tutti gli orari devono avere una sala selezionata prima del salvataggio
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Actions - Only in manual save mode */}
      {isManualSaveMode && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={!hasUnsavedChanges || isSaving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Annulla Modifiche
          </Button>
          <Button
            type="button"
            onClick={handleSaveClick}
            disabled={!hasUnsavedChanges || hasInvalidSchedules || isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            Salva Orari
          </Button>
        </div>
      )}

      <DeleteScheduleConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={removeScheduleItem}
        scheduleToDelete={scheduleToDelete}
      />

      {isManualSaveMode && (
        <SaveScheduleConfirmDialog
          open={showSaveConfirm}
          onOpenChange={setShowSaveConfirm}
          onConfirm={handleConfirmSave}
          changes={changes}
          isLoading={isSaving}
        />
      )}
    </div>
  );
};