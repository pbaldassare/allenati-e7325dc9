## Obiettivo

Quando un utente prova a registrarsi con un codice fiscale (o email) già presente nel database, mostrare un messaggio chiaro tipo **"Account già esistente. Accedi o recupera la password."** invece del generico "Database error saving new user".

## Approccio

Due livelli di difesa, entrambi solo lato frontend (nessuna modifica DB / trigger):

### 1. Pre-check prima della signup (preventivo)

In `src/components/auth/RegisterForm.tsx`, prima di chiamare `supabase.auth.signUp`:

- Query a `public.profiles` su `fiscal_code` (normalizzato uppercase) → se esiste, blocca subito con messaggio "Esiste già un account con questo codice fiscale. Accedi o usa 'Password dimenticata'."
- Opzionale: stesso check su `email`.

Questo evita di creare un auth user fantasma e dà feedback immediato.

### 2. Traduzione errori post-signup (fallback)

Nel `catch` della signup, mappare i messaggi Supabase più comuni in italiano user-friendly:

| Errore originale | Messaggio mostrato |
|---|---|
| `Database error saving new user` / `duplicate key … fiscal_code` | "Account già esistente con questo codice fiscale. Effettua il login." |
| `User already registered` | "Email già registrata. Effettua il login." |
| `duplicate key … profiles_user_id_key` | stesso messaggio account esistente |
| altri | messaggio generico già presente |

### 3. CTA "Vai al login" nel banner di errore

Quando il messaggio è "account già esistente", il banner rosso include un bottone/link **"Accedi"** che chiama `onSwitchToLogin()` (prop già presente nel form), così l'utente passa al login con un click.

## File toccati

- `src/components/auth/RegisterForm.tsx` — unico file modificato:
  - aggiunta funzione `checkExistingAccount(fiscalCode, email)` 
  - mapper `translateSignupError(err)` 
  - rendering condizionale del CTA "Accedi" nel banner errore

## Cosa NON viene toccato

- Nessuna migration, nessun trigger DB.
- Nessuna modifica a `handle_new_user`.
- Nessuna modifica al caso Danila specifico (account con email typo "hormail.it") — quello resta da gestire separatamente se serve.

Confermi e procedo?