# Fix — filtri date prenotazioni + gestione ricerche calendario

## Problemi individuati

1. **Le date in /owner/bookings non caricano correttamente i dati vecchi**
   - Il filtro `Dal/Al` ora passa valori direttamente al hook, ma resta legato a `input type="date"` nativo.
   - Su mobile/iOS e locale italiana il campo può mostrare `gg/mm/aaaa`, ma internamente può restare vuoto o non aggiornarsi finché la data non è completa.
   - In più, il filtro periodo rapido (`Oggi`, `Questa settimana`, `Questo mese`) resta client-side: se lo combini con un range server-side può dare risultati percepiti come incoerenti.

2. **Dati vecchi e query pesanti**
   - La paginazione che ho aggiunto è corretta secondo la documentazione Supabase: il limite default è 1000 righe e va usato `.range()` per paginare.
   - Però la query profili usa `.in("user_id", userIds)` con potenzialmente migliaia di ID: può diventare instabile o superare limiti URL/PostgREST.
   - Stesso rischio per le sessioni/stanze quando i risultati sono tanti.

3. **Calendario owner poco gestibile**
   - Il calendario desktop e mobile permettono solo avanti/indietro.
   - Non c’è un “vai alla data”, né ricerca per corso/sala/istruttore.
   - Su mobile, per trovare una data vecchia bisogna cliccare giorno per giorno.

## Implementazione proposta

### A. Prenotazioni owner: filtro date robusto
File: `src/pages/owner/OwnerBookings.tsx`

- Sostituire gli `input type="date"` con un selettore date via `Popover + Calendar` shadcn, usando `date-fns` per convertire sempre in `YYYY-MM-DD`.
- Mantenere due stati interni come stringa `YYYY-MM-DD`, ma far scegliere le date da calendario per evitare input incompleti tipo `gg/mm/aaaa`.
- Quando l’utente seleziona `Dal` o `Al`, passare il range al hook in modo stabile.
- Se `Dal > Al`, correggere automaticamente il range o mostrare feedback chiaro.
- Aggiungere pulsanti rapidi: `Oggi`, `Questo mese`, `Ultimi 3 mesi`, `Tutto`.
- Mostrare un indicatore chiaro: `Caricate X prenotazioni` e `Filtrate Y`.

### B. Hook prenotazioni: caricamento vecchi dati affidabile
File: `src/hooks/useOwnerBookings.ts`

- Mantenere la paginazione `.range()`.
- Applicare date server-side su `scheduled_date`.
- Dividere le query correlate in chunk:
  - profili utenti: blocchi da 500 ID
  - sessioni/stanze: blocchi da 500 ID
- Evitare `console.log` pesanti con migliaia di oggetti in produzione/dev preview, lasciando log sintetici.
- Aggiungere protezione da race condition: se cambio data velocemente, una risposta vecchia non deve sovrascrivere quella nuova.

### C. Calendario owner: ricerca e salto data
File desktop: `src/components/owner/SessionCalendar.tsx`

- Aggiungere in alto:
  - campo ricerca `Cerca corso, sala, istruttore...`
  - date picker `Vai alla data`
  - pulsante `Oggi`
- In vista settimana: il date picker porta alla settimana della data scelta.
- In vista mese: il date picker porta al mese della data scelta.
- Filtrare localmente le sessioni caricate per nome corso, sala, istruttore.

File mobile: `src/components/owner/SessionCalendarMobile.tsx`

- Aggiungere:
  - date picker `Vai alla data`
  - pulsante `Oggi`
  - ricerca testuale sopra la lista sessioni del giorno
- La ricerca filtra le sessioni del giorno corrente per corso/sala/istruttore.
- Correggere il testo vuoto: se sei su una data diversa da oggi, mostrare `Nessuna sessione in questa data` invece di `Nessuna sessione oggi`.

## Cosa non modifico

- Nessuna migrazione DB.
- Nessuna modifica RLS.
- Nessuna modifica a cancellazioni, crediti, waitlist o lifecycle sessioni.
- Nessuna modifica ai dati esistenti.

## Validazione

- Verifico che il range date venga passato come `YYYY-MM-DD`.
- Verifico che i dati vecchi non vengano tagliati a 1000 righe.
- Verifico che ricerca calendario e salto data funzionino sia desktop sia mobile.