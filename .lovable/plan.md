# Piani Multi-Palestra

Aggiungiamo la possibilità per un owner con più palestre di creare abbonamenti (mensili illimitati o a crediti) validi su più palestre del suo gruppo. I crediti sono un **pool unico condiviso** tra tutte le palestre collegate al piano.

## 1. Database

### Nuova tabella `subscription_plan_gyms` (ponte)
- `plan_id` → `subscription_plans.id` (cascade)
- `gym_id` → `gyms.id` (cascade)
- PK composta `(plan_id, gym_id)`
- RLS: lettura pubblica (come `subscription_plans`); insert/update/delete solo per owner delle palestre coinvolte.

### `subscription_plans`
- Nuova colonna `is_multi_gym BOOLEAN DEFAULT false`.
- Il campo `gym_id` esistente resta come **palestra "primaria"** (palestra dove il piano è stato creato / mostrato di default). Per piani multi-gym la lista vera delle palestre abilitate vive in `subscription_plan_gyms`.

### `user_subscriptions`
Nessuna modifica strutturale: `gym_id` resta la palestra di "origine" dell'acquisto. La validità multi-palestra viene determinata via join su `subscription_plan_gyms`.

### `user_gym_memberships`
Trigger / funzione: quando viene creata una `user_subscriptions` su un piano `is_multi_gym=true`, inseriamo automaticamente righe `user_gym_memberships` (status `active`, type `member`) per ogni `gym_id` collegato al piano, se non esistenti.

## 2. Logica crediti (pool unico)

I crediti restano memorizzati come oggi (per subscription), ma la **lettura/spesa** considera l'intera subscription, non la singola palestra.

`subscriptionHelpers.ts`:
- `getUserActiveSubscriptions(userId, gymId)`: oltre alle subscription con `gym_id = gymId`, includere anche quelle di piani `is_multi_gym=true` collegati a quel `gymId` via `subscription_plan_gyms`.
- `getTotalAvailableCredits` / `hasActiveUnlimitedSubscription` / `isSessionCoveredBySubscription`: nessuna modifica di logica, beneficiano automaticamente del cambio sopra.
- I crediti spesi (booking) decrementano la stessa subscription qualunque palestra venga prenotata → pool unico naturale.

## 3. UI Owner – creazione/modifica piano

In `OwnerSubscriptionPlans` aggiungiamo:
- Toggle "**Piano multi-palestra**" (visibile solo se l'owner possiede ≥2 palestre).
- Quando attivo: multi-select con le palestre dove l'owner corrente è `owner` in `user_gym_memberships`. Pre-selezionata la palestra corrente.
- Su salvataggio: scriviamo `subscription_plans` (con `is_multi_gym=true`, `gym_id` = palestra corrente) e popoliamo `subscription_plan_gyms` con le palestre selezionate.

## 4. UI Cliente

`UserSubscriptionSelector` / pagina `Subscriptions`:
- Mostra i piani della palestra corrente **+** i piani multi-gym che includono la palestra corrente.
- Badge "**Valido in più palestre**" + lista palestre incluse.

Dopo l'acquisto di un piano multi-gym, il trigger crea automaticamente le membership: la palestra extra appare in "Le mie palestre" senza ulteriori azioni.

## 5. Migrazione dati esistenti
Nessuna conversione retroattiva: i piani esistenti restano single-gym (`is_multi_gym=false`). I nuovi piani multi-gym vanno creati dall'owner.

## Dettagli tecnici / file toccati
- **Migration**: nuova tabella `subscription_plan_gyms` + GRANT + RLS + colonna `is_multi_gym` + trigger `on_multi_gym_subscription_insert` che popola `user_gym_memberships`.
- **Frontend**:
  - `src/pages/owner/OwnerSubscriptionPlans.tsx` (toggle + multi-select palestre)
  - `src/lib/subscriptionHelpers.ts` (query estesa multi-gym)
  - `src/components/UserSubscriptionSelector.tsx` + `src/pages/Subscriptions.tsx` (lista piani estesa + badge)
- **Context**: `OwnerGymContext` già espone `ownedGyms`, riusato per il multi-select.

Confermi e procedo con migration + codice?
