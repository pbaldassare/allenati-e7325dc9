

## Piano: Edge Function per Notifiche Push OneSignal

### Situazione Attuale
- OneSignal SDK integrato nel frontend con App ID `2936021b-a20f-44bb-81dd-0cba1d64c481`
- Secrets gia configurati: `ONESIGNAL_APP_ID` e `ONESIGNAL_REST_API_KEY`
- Utenti collegati a OneSignal tramite `external_user_id` = Supabase `user.id`
- Tag utente per segmentazione: `push_bookings`, `push_promotions`, `notifications_enabled`

### Architettura

Creare una edge function `send-push-notification` che:
1. Riceve tipo evento + dati (userId, titolo, messaggio, ecc.)
2. Chiama OneSignal REST API v1 (`https://api.onesignal.com/notifications`) per inviare la notifica
3. Salva la notifica nella tabella `mobile_notifications` per storico
4. Rispetta i tag utente (es. non inviare notifiche booking se `push_bookings = false`)

### File da Creare/Modificare

| File | Azione |
|------|--------|
| `supabase/functions/send-push-notification/index.ts` | Creare edge function |
| `supabase/config.toml` | Aggiungere configurazione function |
| `src/lib/bookingHelpers.ts` | Chiamare la function dopo prenotazione/cancellazione |

### Edge Function: `send-push-notification`

**Endpoint:** POST con body:
```json
{
  "userId": "uuid",
  "title": "Prenotazione Confermata",
  "message": "Hai prenotato Boxe - Lunedi 10/03 alle 18:00",
  "type": "booking",          // booking | payment | course_update | system
  "data": { "bookingId": "...", "courseId": "..." }
}
```

**Logica:**
1. Valida il JWT (solo utenti autenticati o service role possono invocare)
2. Controlla preferenze utente su `user_preferences` (es. se `push_bookings = false` e type = `booking`, non inviare)
3. Invia notifica via OneSignal REST API usando `include_aliases` con `external_id` = userId
4. Salva record in `mobile_notifications`

**OneSignal REST API call:**
```typescript
await fetch('https://api.onesignal.com/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [userId] },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: message },
    data: extraData,
  }),
});
```

### Integrazione nel Codice Frontend

In `bookingHelpers.ts`, dopo una prenotazione confermata o cancellazione, chiamare:
```typescript
await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: userId,
    title: 'Prenotazione Confermata',
    message: `Hai prenotato ${courseName} - ${date} alle ${time}`,
    type: 'booking',
    data: { bookingId, courseId }
  }
});
```

Le chiamate saranno fire-and-forget (senza await o con catch silenzioso) per non bloccare il flusso principale.

### Eventi Supportati

| Evento | Tipo | Titolo |
|--------|------|--------|
| Prenotazione confermata | `booking` | "Prenotazione Confermata" |
| Prenotazione cancellata | `booking` | "Prenotazione Cancellata" |
| Crediti acquistati | `payment` | "Crediti Acquistati" |
| Corso aggiornato/cancellato | `course_update` | "Aggiornamento Corso" |

### Config TOML

```toml
[functions.send-push-notification]
verify_jwt = true
```

