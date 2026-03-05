

## Piano: Integrazione OneSignal Push Notifications

### Situazione Attuale
Il database ha già le tabelle necessarie:
- **`user_preferences`**: con campi `notifications_enabled`, `push_bookings`, `push_promotions`
- **`mobile_notifications`**: per lo storico notifiche con tipi `booking`, `payment`, `course_update`, `achievement`, `system`

Non esiste ancora nessuna integrazione OneSignal nel codice.

### Dati Forniti
- **App ID**: `2936021b-a20f-44bb-81dd-0cba1d64c481`
- **Safari Web ID**: `web.onesignal.auto.2900aeea-27da-4bc5-9f95-2e3d9a76781c`
- **Service Worker**: `OneSignalSDKWorker.js`

### Modifiche da Implementare

#### 1. Service Worker → `public/OneSignalSDKWorker.js`
Copiare il file uploadato nella cartella public.

#### 2. SDK Initialization → `index.html`
Aggiungere lo script OneSignal SDK nel `<head>`.

#### 3. Provider OneSignal → `src/lib/onesignal.ts`
Creare un modulo di inizializzazione e utility:
- `initOneSignal()` - inizializza l'SDK con l'appId
- `setExternalUserId(userId)` - collega l'utente Supabase a OneSignal
- `removeExternalUserId()` - al logout
- `setNotificationPreferences(prefs)` - sincronizza tag/preferenze con OneSignal

#### 4. Hook → `src/hooks/useNotificationPreferences.ts`
Hook per gestire le preferenze notifiche dell'utente:
- Carica preferenze da `user_preferences`
- Salva modifiche su Supabase + sincronizza tag OneSignal
- Gestisce opt-in/opt-out per categoria (prenotazioni, promozioni, ecc.)

#### 5. Componente Preferenze → `src/components/NotificationSettings.tsx`
Card con toggle per:
- Notifiche push (on/off globale)
- Prenotazioni confermate/cancellate
- Promozioni e novità
- Aggiornamenti corsi

#### 6. Integrazione in `src/pages/UserSettings.tsx`
Aggiungere la card `NotificationSettings` nella pagina impostazioni utente.

#### 7. Integrazione Auth → `src/contexts/AuthContext.tsx`
- Al login: chiamare `setExternalUserId(userId)` per associare l'utente
- Al logout: chiamare `removeExternalUserId()`

#### 8. Inizializzazione App → `src/App.tsx`
Chiamare `initOneSignal()` all'avvio dell'app.

### File da Creare/Modificare

| File | Azione |
|------|--------|
| `public/OneSignalSDKWorker.js` | Copiare da upload |
| `index.html` | Aggiungere script SDK |
| `src/lib/onesignal.ts` | Creare modulo inizializzazione |
| `src/hooks/useNotificationPreferences.ts` | Creare hook preferenze |
| `src/components/NotificationSettings.tsx` | Creare UI preferenze |
| `src/pages/UserSettings.tsx` | Aggiungere card notifiche |
| `src/contexts/AuthContext.tsx` | Collegare utente a OneSignal |
| `src/App.tsx` | Inizializzare OneSignal |

### Note
- L'App ID OneSignal (`2936021b-a20f-44bb-81dd-0cba1d64c481`) è una chiave pubblica, sicuro metterla nel codice frontend.
- Le preferenze utente vengono salvate sia su Supabase (persistenza) che come tag OneSignal (per segmentazione lato server).

