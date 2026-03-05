import { Bell, BellOff, CalendarCheck, Megaphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { requestPermission } from '@/lib/onesignal';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationSettings() {
  const { preferences, loading, saving, updatePreference } = useNotificationPreferences();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 sm:pb-6">
        <div className="flex items-center gap-2">
          {preferences.notifications_enabled ? (
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          )}
          <CardTitle className="text-base sm:text-lg">Notifiche Push</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Gestisci le notifiche push che ricevi dall'app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Global toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
          <div className="space-y-0.5 flex-1 mr-4">
            <Label htmlFor="notifications_enabled" className="text-sm font-medium cursor-pointer">
              Attiva notifiche
            </Label>
            <p className="text-xs text-muted-foreground">
              Abilita o disabilita tutte le notifiche push
            </p>
          </div>
          <Switch
            id="notifications_enabled"
            checked={preferences.notifications_enabled}
            onCheckedChange={(value) => updatePreference('notifications_enabled', value)}
            disabled={saving}
          />
        </div>

        {/* Category toggles */}
        <div className={`space-y-3 ${!preferences.notifications_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3 flex-1 mr-4">
              <CalendarCheck className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="space-y-0.5">
                <Label htmlFor="push_bookings" className="text-sm font-medium cursor-pointer">
                  Prenotazioni
                </Label>
                <p className="text-xs text-muted-foreground">
                  Conferme, cancellazioni e promemoria delle tue lezioni
                </p>
              </div>
            </div>
            <Switch
              id="push_bookings"
              checked={preferences.push_bookings}
              onCheckedChange={(value) => updatePreference('push_bookings', value)}
              disabled={saving || !preferences.notifications_enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3 flex-1 mr-4">
              <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="space-y-0.5">
                <Label htmlFor="push_promotions" className="text-sm font-medium cursor-pointer">
                  Promozioni e Novità
                </Label>
                <p className="text-xs text-muted-foreground">
                  Offerte speciali, nuovi corsi e aggiornamenti
                </p>
              </div>
            </div>
            <Switch
              id="push_promotions"
              checked={preferences.push_promotions}
              onCheckedChange={(value) => updatePreference('push_promotions', value)}
              disabled={saving || !preferences.notifications_enabled}
            />
          </div>
        </div>

        {/* Permission request button */}
        {preferences.notifications_enabled && (
          <Button
            variant="outline"
            size="sm"
            className="w-full min-h-[44px] text-sm"
            onClick={requestPermission}
          >
            <Bell className="h-4 w-4 mr-2" />
            Richiedi permesso notifiche al browser
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
