# Fix — Cerca utenti da iscrivere non funziona

## Cosa ho trovato

Nella drawer `SessionManagementDrawer` (sezione "Cerca utenti da iscrivere"):

1. **Soglia silenziosa di 2 caratteri**
   `searchUsers()` parte solo se `searchTerm.length >= 2`. Con 1 carattere (come la "r" nello screenshot) non parte nessuna query e non viene mostrato alcun messaggio → l'utente vede una casella vuota e pensa che sia rotta.

2. **Nessun feedback per "0 risultati"**
   Anche con ≥2 caratteri, il blocco risultati viene renderizzato solo se `searchResults.length > 0`. Quando la query gira ma non trova nulla (es. utente già iscritto, oppure nome non presente nella palestra), non viene mostrato niente — stesso effetto "rotto".

3. **Nessuno stato di "caricamento"**
   Non c'è uno spinner durante la chiamata: con rete lenta sembra che nulla stia succedendo.

4. **Query N+1 sui crediti**
   Per ogni profilo trovato viene fatta una query separata su `gym_credits` (Promise.all): con 8 risultati = 9 round-trip. Rende la ricerca percepita lenta su mobile.

5. RLS e schema sono OK (verificato): `profiles.email` esiste, le policy per `gym_owner` permettono di leggere i membri della palestra, le funzioni `SECURITY DEFINER` referenziate hanno ancora `EXECUTE` per `authenticated`. Quindi il backend non è il problema.

## Cosa farò

In `src/components/owner/SessionManagementDrawer.tsx`:

- Aggiungere uno stato `searching` (boolean) e mostrare uno spinner inline mentre la query è in corso.
- Sotto la search box, mostrare sempre un messaggio chiaro:
  - 1 carattere → "Digita almeno 2 caratteri…"
  - in corso → spinner "Ricerca in corso…"
  - 0 risultati → "Nessun utente trovato in questa palestra"
  - risultati → la lista (comportamento attuale)
- Abbassare la soglia da 2 a **1 carattere** (più tollerante; il debounce a 300 ms evita il flood) — è sicuro perché la query è già scoped per `gym_id`.
- Ottimizzare la query crediti: una sola SELECT `IN (...)` invece del `Promise.all` N+1.
- Sanitizzare l'input nella clausola `.or(...)` (escape di `%`, `,` e `()` per evitare PostgREST syntax errors quando l'utente digita caratteri speciali).

## Cosa NON tocco
- RLS / migrazioni DB (non servono).
- Logica di enrollment, conteggio posti, waitlist — invariata.
- Altre parti del drawer.

Procedo?