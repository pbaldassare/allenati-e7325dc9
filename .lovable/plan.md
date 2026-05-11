## Obiettivo
Ripristinare il filtro per intervallo di date personalizzato (Dal — Al) nella pagina Prenotazioni proprietario, accanto ai filtri esistenti.

## Modifiche in `src/pages/owner/OwnerBookings.tsx`

1. **Stato**: aggiungere due nuovi stati `dateFrom` e `dateTo` (string, formato `YYYY-MM-DD`, default vuoto).

2. **Logica di filtro** (in `filteredBookings`): dopo il filtro per `dateFilter`, applicare anche un filtro per intervallo:
   - se `dateFrom` valorizzato → tenere solo prenotazioni con `scheduled_date >= dateFrom 00:00`
   - se `dateTo` valorizzato → tenere solo prenotazioni con `scheduled_date <= dateTo 23:59`
   - I due filtri funzionano in combinazione con il filtro periodo predefinito esistente.

3. **UI Desktop** (riga filtri ~290-326): aggiungere due `<Input type="date">` con label "Dal" e "Al" dopo il Select periodo. Aggiungere un piccolo pulsante "Reset date" (icona X) che appare solo quando almeno uno dei due è valorizzato e azzera entrambi.

4. **UI Mobile** (~213-242): aggiungere una seconda riga con i due input date affiancati (`flex gap-2`), stessa logica di reset.

5. **Empty state** (~434): includere `dateFrom`/`dateTo` nella condizione che distingue "nessuna prenotazione trovata" da "nessuna presente".

## Note tecniche
- I filtri esistenti (Periodo: Oggi/Settimana/Mese, Stato) restano invariati.
- L'intervallo Dal/Al è additivo: l'utente può combinarli o usare solo Dal o solo Al.
- Nessuna modifica a hook, query o backend.
