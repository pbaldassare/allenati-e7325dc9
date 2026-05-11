## Obiettivo
Limitare la navigazione del calendario lato utente alla settimana corrente e a quella successiva, in linea con la regola dei 14 giorni di prenotazione, e rimuovere il toggle Settimana/Mese ora superfluo.

## Modifiche

### `src/components/Dashboard.tsx`
- Rimuovere lo stato `viewMode` e il `ToggleGroup` Settimana/Mese (righe ~611-623).
- Rimuovere import e uso di `MonthlyCalendarCompact`.
- Mantenere solo `<WeeklyCalendarCompact />` all'interno della Card "Calendario", lasciando il titolo "Calendario" senza toggle.

### `src/components/WeeklyCalendarCompact.tsx`
- Calcolare la settimana di inizio corrente (lunedì di oggi) e definire come limite massimo il lunedì della settimana successiva.
- In `navigateWeek('next')`: bloccare l'avanzamento se la nuova settimana supererebbe il lunedì della settimana successiva.
- In `navigateWeek('prev')`: bloccare il ritorno indietro oltre il lunedì della settimana corrente (l'utente non deve vedere settimane passate per prenotare).
- Aggiungere prop `disabled` ai due bottoni di navigazione quando si è al limite (freccia destra disabilitata sulla settimana successiva, freccia sinistra disabilitata sulla settimana corrente), con stile attenuato.

## Note
- Nessuna modifica a backend, RLS o hook di prenotazione: il limite di 14 giorni è già applicato altrove. Questa è solo una restrizione UI coerente.
- `MonthlyCalendarCompact.tsx` resta nel codice (non usato altrove) ma non più referenziato dalla Dashboard.
