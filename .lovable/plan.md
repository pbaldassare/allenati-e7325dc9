## Collegamento manuale utenti a più palestre (owner multi-gym)

Aggiungiamo all'owner la possibilità di abilitare un utente esistente di una sua palestra anche alle altre palestre del suo gruppo, senza obbligare l'utente a registrarsi/iscriversi di nuovo.

### 1. UI Owner — `OwnerUsers.tsx`

Per ogni utente nella lista, accanto alle azioni esistenti aggiungiamo:

- **Badge "Palestre"**: mostra le palestre dell'owner a cui l'utente è già collegato (es. `Charme`, `Charme Frosinone`).
- **Pulsante "Gestisci palestre"** (icona `Building2`): apre un dialog.

**Dialog `ManageUserGymsDialog`**:
- Lista checkbox di tutte le palestre dell'owner corrente (da `OwnerGymContext.ownedGyms`, solo dove `membership_type = 'owner'`).
- Per ogni palestra mostra lo stato attuale (`active` / non collegato).
- L'owner spunta/deseleziona le palestre e preme "Salva".
- Visibile solo se l'owner ha ≥2 palestre.

### 2. Logica salvataggio

Il salvataggio gira su una nuova edge function `owner-manage-user-gyms` (riusa il pattern di `owner-link-member`):

Input: `{ user_id, gym_ids: string[] }`

Per ogni `gym_id`:
- verifica che il caller sia effettivamente `owner` in `user_gym_memberships` per quella palestra (sicurezza),
- upsert riga `user_gym_memberships (user_id, gym_id, status='active', membership_type='member')` se selezionata,
- per le palestre **deselezionate** dell'owner: set `status = 'inactive'` (non eliminiamo, per preservare storico bookings/subscription).

Non tocchiamo `subscription_plan_gyms` né le subscription esistenti: questo flusso è solo abilitazione/disabilitazione della membership.

### 3. Vincoli e sicurezza

- L'owner può collegare/scollegare **solo** alle palestre di cui è owner.
- Disabilitare una palestra dove l'utente ha una subscription attiva multi-gym mostra un warning ("L'utente ha un abbonamento attivo valido in questa palestra"), ma resta possibile.
- Nessun effetto su crediti/abbonamenti esistenti: la membership disattivata blocca solo la prenotazione futura via RLS.

### File toccati

- **Nuovo**: `supabase/functions/owner-manage-user-gyms/index.ts`
- **Nuovo**: `src/components/owner/ManageUserGymsDialog.tsx`
- **Modificato**: `src/pages/owner/OwnerUsers.tsx` (colonna palestre + bottone + dialog)
- **Modificato**: `supabase/config.toml` (registra la nuova edge function)

Nessuna migration DB necessaria: usiamo le tabelle e RLS già esistenti.

Confermi e procedo?
