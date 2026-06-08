## Problema

`/admin/courses/new` mostra "Accesso Negato" perché `AdminLayout` richiede ruolo `admin` e la sessione corrente in preview non lo ha. Oggi la card di errore non dà alcuna informazione utile per capire perché.

## Soluzione

Migliorare la card "Accesso Negato" in `ProtectedRoute` per renderla auto-diagnostica, così la prossima volta vedi subito cosa non torna senza chiedere a me.

### Cambiamenti UI in `src/components/ProtectedRoute.tsx`

Quando l'accesso viene negato, mostrare:

- **Email** dell'utente attualmente loggato (`user?.email`).
- **Ruolo rilevato** (`user?.role`) con badge colorato.
- **Ruoli richiesti** dalla rotta (`requireAdmin` → "admin", oppure lista `requiredRoles`).
- Bottone **"Vai alla mia area"** che reindirizza alla home appropriata per il ruolo attuale (`/admin`, `/owner`, `/instructor`, oppure `/`).
- Bottone **"Esci e accedi con altro account"** che chiama `signOut()` e apre il modale di login.

Inoltre `console.warn` con: route corrente, email, ruolo, ruoli richiesti — così resta traccia anche nei log per debug futuro.

### Nessuna modifica backend/RLS

Nessun cambiamento al DB o ai ruoli. Se davvero sei admin ma non risulta loggato come tale nella preview, ti basterà fare logout/login dall'apposito bottone.

### Verifica

Aprire `/admin/courses/new` da una sessione non-admin: la card mostra email, ruolo attuale, ruolo richiesto e i due bottoni operativi.

## Fuori scope

- Non tocco le route né i requisiti di ruolo: `/admin/*` resta admin-only.
- Se confermi che con un certo account dovresti essere admin ma `get_user_role` restituisce altro, lo correggiamo come task separato controllando `user_roles` per quell'email.
