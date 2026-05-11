## Obiettivo

Ottimizzare l'esperienza mobile dell'area **Proprietario** e **Istruttore** (incluso Super Istruttore) con:
- Bottom navigation dedicate per ruolo
- Scroll corretto in tutte le pagine (oggi alcune pagine come `/owner/schedule` non scrollano)
- Layout responsive su pagine con tabelle dense (Utenti, Prenotazioni, Abbonamenti, Calendario)
- Nessuna perdita di funzionalità o dati

---

## 1. Bottom Navigation dedicate (mobile)

Oggi `BottomNavigation` è usata solo nell'area utente (`Index.tsx`, `BookingHistory.tsx`). Le aree owner/instructor hanno solo la sidebar sotto un `SheetContent` mobile, quindi su telefono mancano le scorciatoie rapide.

### `OwnerBottomNav` (nuovo componente)
Voci principali (5 max, secondo le linee guida iOS/Android):
- Dashboard → `/owner`
- Calendario → `/owner/schedule`
- Prenotazioni → `/owner/bookings`
- Utenti → `/owner/users`
- Menu → apre la `Sidebar` (SheetContent mobile) per accesso completo a tutte le altre voci (Corsi, Istruttori, Sale, Abbonamenti, Stripe, Report, Documenti, Profilo, Chat, Logout)

### `InstructorBottomNav` (nuovo componente)
Voci principali:
- Dashboard → `/instructor`
- Corsi → `/instructor/courses`
- Calendario → `/instructor/schedule`
- Partecipanti → `/instructor/participants`
- Menu → apre la sidebar per le altre voci (Statistiche, Shop, Profilo, Logout, e — se Super Istruttore — l'intero blocco owner)

Caratteristiche comuni:
- Visibili solo su mobile (`useIsMobile`)
- Si nascondono allo scroll-down e quando appare la tastiera virtuale (riuso di `useScrollDirection` + `useVirtualKeyboard`, come già fa `BottomNavigation`)
- Stile coerente con `BottomNavigation` esistente (gradient primary su tab attivo, design tokens, safe-area-bottom)
- Highlight automatico in base a `useLocation`

### Integrazione nei layout
- `OwnerLayout.tsx`: aggiungere `<OwnerBottomNav />` prima della chiusura `SidebarInset`; aggiungere `pb-24` al `<main>` su mobile per evitare che il contenuto sia coperto.
- `InstructorLayout.tsx`: stesso pattern con `<InstructorBottomNav />`.

---

## 2. Fix scroll e layout mobile

### Problema scroll calendario `/owner/schedule`
Verificare il container: il main del layout è già `flex-1` ma il `SessionCalendarMobile` potrebbe usare `h-screen` o overflow nascosto. Garantire `overflow-y-auto` sul `<main>` (o sul wrapper interno) e `min-h-0` sui flex children. Aggiungere `pb-24` quando bottom nav presente.

### Header mobile
- Spostare il pulsante "Vista Utente" e "Logout" nel menu della sidebar; in header mobile lasciare solo: trigger sidebar, titolo compatto, gym selector. Riduce affollamento visibile nello screenshot.

### Pagine con tabelle dense (già parzialmente responsive)
Per ognuna verificare che esista una variante "card list" su mobile e che il padding/margine non causi overflow orizzontale:
- `OwnerUsers.tsx` (1208 righe — già usa `useIsMobile`, controllare che il rendering mobile sia card-list e non tabella)
- `OwnerBookings.tsx` (filtri Dal/Al appena aggiunti — verificare wrapping su mobile)
- `OwnerSubscriptions.tsx`
- `OwnerCoursesList.tsx`
- `OwnerBookingsAnalytics.tsx`
- `InstructorSchedule.tsx`

Dove la versione mobile manca o è degradata, sostituire `<Table>` con elenco di `<Card>` compatte (pattern già usato in altre pagine del progetto).

### `SessionCalendar` (owner)
- Su mobile usa già `SessionCalendarMobile`, ma le card "Nascondi/Cancella" sforano (vedi screenshot: i bottoni escono a destra). Convertire la riga di azioni in un layout `flex-wrap` con bottoni `size="sm"` e icone-only sotto i 360px.

---

## 3. Note tecniche

- **Memoria progetto** rispettata: layout mobile identici tra ruoli (stessa struttura, varia solo la nav dedicata e le azioni). UI proprietario pulita (nessun debug).
- Nessuna modifica a logica business, RPC o RLS. Solo presentazione.
- Tutto via design tokens (no colori hardcoded).
- `safe-area-bottom` per iOS notch.

---

## File toccati

```text
NUOVI
  src/components/owner/OwnerBottomNav.tsx
  src/components/instructor/InstructorBottomNav.tsx

MODIFICATI
  src/layouts/OwnerLayout.tsx          (aggancio bottom nav, padding main, header snello)
  src/layouts/InstructorLayout.tsx     (idem)
  src/components/owner/SessionCalendarMobile.tsx  (azioni card responsive, scroll)
  src/pages/owner/OwnerUsers.tsx       (verifica/migliora card list mobile)
  src/pages/owner/OwnerBookings.tsx    (wrapping filtri Dal/Al)
  src/pages/owner/OwnerSubscriptions.tsx
  src/pages/owner/OwnerCoursesList.tsx
  src/pages/owner/OwnerBookingsAnalytics.tsx
  src/pages/instructor/InstructorSchedule.tsx
```

Lavoro fatto pagina per pagina, verificando in preview mobile (390px) dopo ogni step.
