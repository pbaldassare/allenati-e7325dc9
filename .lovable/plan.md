

## Piano: Limite Prenotazione 2 Settimane per Piani a Crediti

### Regola di Business Aggiornata

| Tipo Piano | Limite Data Sessione |
|------------|---------------------|
| **Illimitato** | Sessione deve essere ≤ `expires_at` |
| **A crediti** | Sessione deve essere ≤ `expires_at + 14 giorni` |

### Esempio Pratico

Utente con piano a crediti che scade il **15/02/2026**:
- Sessione 20/02/2026 → ✅ Può prenotare (entro 2 settimane)
- Sessione 01/03/2026 → ✅ Può prenotare (entro 2 settimane, scade 01/03)
- Sessione 05/03/2026 → ❌ Non può prenotare (oltre 2 settimane dalla scadenza)

### Modifiche Necessarie

#### 1. `src/lib/bookingHelpers.ts`

Aggiungere controllo date per piani a crediti nella funzione `checkBookingEligibility`:

```typescript
// Dopo il controllo abbonamento illimitato...

// Per piani a crediti: limite di 2 settimane dopo scadenza
if (sessionDate && subscriptions.length > 0) {
  // Trova la sottoscrizione a crediti con scadenza più lontana
  const creditSubs = subscriptions.filter(s => !s.subscription_plans.unlimited_access);
  
  if (creditSubs.length > 0) {
    // Trova la data limite massima (scadenza più lontana + 14 giorni)
    const latestExpiry = creditSubs.reduce((latest, sub) => {
      const expiry = new Date(sub.expires_at);
      return expiry > latest ? expiry : latest;
    }, new Date(0));
    
    const sessionDateObj = new Date(sessionDate);
    const maxBookingDate = new Date(latestExpiry);
    maxBookingDate.setDate(maxBookingDate.getDate() + 14); // +2 settimane
    
    if (sessionDateObj > maxBookingDate) {
      return {
        canBook: false,
        hasUnlimitedAccess: false,
        gymCredits: availableCredits,
        reason: `La sessione è oltre il limite di prenotazione (${format(maxBookingDate, 'dd/MM/yyyy')}). I crediti possono essere usati fino a 2 settimane dopo la scadenza del piano.`,
        subscriptionExpiresAt: latestExpiry.toISOString()
      };
    }
  }
}
```

#### 2. `src/lib/subscriptionHelpers.ts`

Aggiornare `isSessionCoveredBySubscription` per includere la logica delle 2 settimane:

```typescript
export const isSessionCoveredBySubscription = async (
  userId: string,
  gymId: string,
  sessionDate: string
): Promise<{ covered: boolean; expiresAt?: string; maxBookingDate?: string; reason?: string }> => {
  // ... controllo unlimited esistente ...
  
  // Credit-based plans: limite di 2 settimane dopo scadenza
  const creditSubs = subscriptions.filter(s => !s.subscription_plans.unlimited_access);
  if (creditSubs.length > 0) {
    const latestExpiry = creditSubs.reduce((latest, sub) => {
      const expiry = new Date(sub.expires_at);
      return expiry > latest ? expiry : latest;
    }, new Date(0));
    
    const maxBookingDate = new Date(latestExpiry);
    maxBookingDate.setDate(maxBookingDate.getDate() + 14);
    
    const sessionDateObj = new Date(sessionDate);
    
    if (sessionDateObj > maxBookingDate) {
      return { 
        covered: false, 
        expiresAt: latestExpiry.toISOString(),
        maxBookingDate: maxBookingDate.toISOString(),
        reason: 'La sessione è oltre il limite di 2 settimane dalla scadenza del piano'
      };
    }
    
    return { covered: true, expiresAt: latestExpiry.toISOString(), maxBookingDate: maxBookingDate.toISOString() };
  }
  
  return { covered: true };
};
```

### Flusso Dopo le Modifiche

```text
Utente con "Piano 10 Crediti" (scade 15/02/2026)
         ↓
Prova a prenotare sessione del 05/03/2026
         ↓
checkBookingEligibility verifica:
  - Ha abbonamento illimitato? NO
  - Ha piano a crediti? SI (scade 15/02)
  - Data limite: 15/02 + 14 giorni = 01/03/2026
  - Data sessione (05/03) <= limite (01/03)? NO
         ↓
Ritorna canBook: false + messaggio esplicativo
         ↓
UI mostra: "La sessione è oltre il limite di prenotazione (01/03/2026)"
```

### File da Modificare

| File | Modifica |
|------|----------|
| `src/lib/bookingHelpers.ts` | Aggiungere controllo 2 settimane per piani a crediti |
| `src/lib/subscriptionHelpers.ts` | Aggiornare `isSessionCoveredBySubscription` |

### Risultato Atteso

- **Piani illimitati**: prenotazione fino a scadenza esatta ✅
- **Piani a crediti**: prenotazione fino a 2 settimane dopo scadenza ✅
- Messaggio chiaro che spiega il limite e la data massima

