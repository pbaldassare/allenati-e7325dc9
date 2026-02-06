
## Piano: Bloccare Prenotazioni Oltre Scadenza per Abbonamenti Illimitati

### Problema
Attualmente un utente con abbonamento illimitato mensile (es. "Mensile singola disciplina") può prenotare lezioni anche oltre la data di scadenza del suo abbonamento. Questo non è corretto perché l'accesso illimitato vale solo fino a `expires_at`.

I piani a crediti invece non devono avere questa restrizione perché i crediti sono già stati pagati e possono essere usati in qualsiasi momento.

### Regola di Business

| Tipo Piano | Controllo Data Sessione |
|------------|------------------------|
| **Illimitato** | Sessione deve essere ≤ `expires_at` dell'abbonamento |
| **A crediti** | Nessun controllo sulla data (crediti già pagati) |

### Modifiche Necessarie

#### 1. `src/lib/bookingHelpers.ts`

Modificare `checkBookingEligibility` per accettare un nuovo parametro `sessionDate` e verificare che la data della sessione sia entro la scadenza dell'abbonamento illimitato.

```typescript
export interface BookingEligibilityParams {
  userId: string;
  gymId: string;
  creditsRequired: number;
  sessionDate?: string;  // NUOVO: data della sessione (YYYY-MM-DD)
}

export const checkBookingEligibility = async (
  userId: string, 
  gymId: string, 
  creditsRequired: number,
  sessionDate?: string  // NUOVO parametro opzionale
): Promise<BookingEligibility> => {
  // ...
  
  // Check for unlimited subscription
  const subscriptions = await getUserActiveSubscriptions(userId, gymId);
  const unlimitedSub = subscriptions.find(sub => sub.subscription_plans.unlimited_access);
  
  if (unlimitedSub) {
    // NUOVO: Se la sessione è oltre la scadenza, non può prenotare con illimitato
    if (sessionDate && new Date(sessionDate) > new Date(unlimitedSub.expires_at)) {
      console.log('Session date beyond subscription expiry');
      return {
        canBook: false,
        hasUnlimitedAccess: false,
        gymCredits: availableCredits,
        reason: `La sessione è oltre la scadenza del tuo abbonamento (${format(new Date(unlimitedSub.expires_at), 'dd/MM/yyyy')}). Rinnova l'abbonamento per prenotare.`
      };
    }
    // OK: sessione entro la scadenza
    return {
      canBook: true,
      hasUnlimitedAccess: true,
      gymCredits: 0,
      subscriptionExpiresAt: unlimitedSub.expires_at  // NUOVO: per mostrare nella UI
    };
  }
  
  // Per piani a crediti: nessun controllo sulla data
  // ... logica esistente per crediti
};
```

#### 2. `src/lib/subscriptionHelpers.ts`

Aggiungere una nuova funzione per verificare la copertura temporale:

```typescript
export const isSessionCoveredBySubscription = async (
  userId: string,
  gymId: string,
  sessionDate: string
): Promise<{ covered: boolean; expiresAt?: string; reason?: string }> => {
  const subscriptions = await getUserActiveSubscriptions(userId, gymId);
  
  // Check unlimited subscriptions
  const unlimitedSub = subscriptions.find(s => s.subscription_plans.unlimited_access);
  if (unlimitedSub) {
    const sessionDateObj = new Date(sessionDate);
    const expiryDateObj = new Date(unlimitedSub.expires_at);
    
    if (sessionDateObj <= expiryDateObj) {
      return { covered: true, expiresAt: unlimitedSub.expires_at };
    }
    return { 
      covered: false, 
      expiresAt: unlimitedSub.expires_at,
      reason: 'La sessione è oltre la scadenza dell\'abbonamento'
    };
  }
  
  // Credit-based plans: always "covered" if credits available
  return { covered: true };
};
```

#### 3. `src/components/CourseCalendar.tsx`

Passare `sessionDate` a `checkBookingEligibility`:

```typescript
const eligibility = await checkBookingEligibility(
  user.id, 
  selectedGym.id, 
  session.credits_required || 1,
  session.session_date  // NUOVO: passa la data sessione
);
```

#### 4. `src/components/Dashboard.tsx`

Stesso aggiornamento per passare `sessionDate` quando si verifica l'eleggibilità.

#### 5. UI Miglioramento (opzionale)

Nella card della sessione, mostrare un indicatore visivo quando una sessione è oltre la scadenza dell'abbonamento:
- Badge "Oltre scadenza" per sessioni non prenotabili
- Tooltip con "Il tuo abbonamento scade il DD/MM/YYYY"

### Flusso Dopo le Modifiche

```text
Utente con "Mensile Singola Disciplina" (scade 15/02/2026)
         ↓
Prova a prenotare sessione del 20/02/2026
         ↓
checkBookingEligibility verifica:
  - Ha abbonamento illimitato attivo? SI
  - Data sessione (20/02) <= scadenza (15/02)? NO
         ↓
Ritorna canBook: false + messaggio esplicativo
         ↓
UI mostra: "La sessione è oltre la scadenza del tuo abbonamento"
```

### File da Modificare

| File | Modifica |
|------|----------|
| `src/lib/subscriptionHelpers.ts` | Nuova funzione `isSessionCoveredBySubscription` |
| `src/lib/bookingHelpers.ts` | Aggiungere parametro `sessionDate` e controllo scadenza |
| `src/components/CourseCalendar.tsx` | Passare `session_date` a `checkBookingEligibility` |
| `src/components/Dashboard.tsx` | Passare `session_date` a `checkBookingEligibility` |

### Impatto sui Piani a Crediti

I piani a crediti **non sono influenzati** da questa modifica:
- Non hanno `unlimited_access = true`
- La logica di controllo scade solo se trova un abbonamento illimitato
- I crediti possono essere usati per prenotare sessioni future senza limite di data

### Risultato Atteso

- Utenti con abbonamento illimitato: possono prenotare solo sessioni entro la scadenza
- Utenti con piano a crediti: nessuna restrizione sulla data delle sessioni
- Messaggio chiaro quando la prenotazione viene bloccata per scadenza
