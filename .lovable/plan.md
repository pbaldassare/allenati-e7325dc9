## Problema

Sulla preview mobile (390x844, /owner/schedule) la BottomNav scompare o copre contenuti, e i drawer "ingoiano" la nav senza dare modo di tornare indietro o vedere le CTA. Dopo aver letto il codice, i problemi reali sono **5**, non solo "navbar non si vede":

### 1. `pb-bottom-nav` troppo piccolo
`src/index.css` definisce `padding-bottom: calc(5.5rem + safe-area)` (~88px), ma la nav reale misura **64px contenuto + 16px padding + 34px safe-area iPhone ≈ 114px**. Risultato: gli ultimi ~25px di ogni pagina (toggle "Mostra annullate", ultime card sessione, ecc.) finiscono **sotto la nav** e l'utente percepisce "la nav copre/non si vede".

### 2. `useScrollDirection` ascolta `window.scroll`, ma il main scrolla
In `OwnerLayout`/`InstructorLayout` lo scroll avviene dentro `<main overflow-y-auto>`, quindi `window` non emette mai `scroll`. Conseguenza: la logica "nascondi nav su scroll giù / mostra su scroll su" è **morta** e in alcuni casi resta in stato stale `down` → `translate-y-full` → nav invisibile. Va agganciato al container giusto (o disattivato del tutto, come da UX app-like).

### 3. `DrawerContent` non sale a tutta altezza in modo coerente
`src/components/ui/drawer.tsx` ha `mt-24` hard-coded e `h-auto`. Quando `SessionManagementDrawer` apre liste lunghe, l'header sticky finisce dietro la "barra" del drawer (i 24*4=96px di mt) e l'utente vede una grossa fascia nera in cima senza pulsante chiudi visibile. Va resa configurabile (`mt-0` quando si vuole full-height + handle drag interno).

### 4. Nessun pulsante "Chiudi" esplicito nel drawer su iPhone
`SessionManagementDrawer` su mobile non ha un'azione di chiusura sticky in alto (l'utente può solo trascinare). Su iPhone senza gesture, sembra un vicolo cieco. Va aggiunta una X sticky nell'header.

### 5. Header `OwnerLayout` mobile è sovraffollato e va a capo a 320px
A 320px (iPhone SE) `Proprietario | OwnerGymSelector | 🏠 | LogOut` non sta in 14px di altezza e le icone si tagliano. Da compattare e rendere icon-only con `aria-label`.

---

## Cosa cambia (solo presentation/layout)

### a) `src/index.css`
Aggiornare il valore di `.pb-bottom-nav` per riflettere l'altezza reale:
```css
.pb-bottom-nav {
  /* nav: h-16 (4rem) + py-2 (1rem) + safe-area + margine respiro */
  padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
}
```
Aggiungere variante "lg" per pagine con sticky toolbar interna (calendario):
```css
.pb-bottom-nav-lg { padding-bottom: calc(7.5rem + env(safe-area-inset-bottom, 0px)); }
```

### b) `src/hooks/useScrollDirection.ts`
Accettare opzionalmente un `target?: HTMLElement | Window` (default `window`) e attaccare il listener lì. Se nessun target ha mai scrollato, restare `stable`.

### c) `src/components/RoleBottomNav.tsx`
- **Disattivare** il comportamento "nascondi su scroll giù" per default (rimuovere `translate-y-full` legato allo scroll). Mantenere il nascondimento solo per `keyboardVisible`. Più predicibile, evita regressioni.
- Garantire che la nav usi `h-16 + py-2 + safe-area-bottom` esattamente come stimato in `pb-bottom-nav`.
- Aggiungere `data-bottom-nav-height` come attribute per future misure dinamiche.

### d) `src/components/ui/drawer.tsx`
- Aggiungere prop `fullHeight?: boolean` su `DrawerContent`. Quando true: `mt-0 h-[100dvh] rounded-t-none`. Quando false: comportamento attuale.
- Mantenere `pb-[env(safe-area-inset-bottom)]`.
- Esportare un `DrawerCloseButton` riutilizzabile (X assoluta in alto a destra).

### e) `src/components/owner/SessionManagementDrawer.tsx`
- Passare `fullHeight` al `DrawerContent` su mobile.
- Aggiungere header sticky con titolo + pulsante X di chiusura (sempre visibile).
- Footer CTA (Salva / Chiudi) sticky con `mobile-action-safe`.

### f) `src/layouts/OwnerLayout.tsx` + `src/layouts/InstructorLayout.tsx`
- Header mobile: collassare i bottoni "Vista Utente" / "Esci" in icon-only su `< 360px` (`hidden xs:inline` per testo che già non c'è, ma ridurre `gap` e `px`).
- `<main>` mobile: usare `pb-bottom-nav-lg` su `/owner/schedule` e `/instructor/schedule` (calendari hanno extra toolbar). Oppure più semplice: sempre `pb-bottom-nav` aggiornato.

### g) `src/components/owner/SessionCalendarMobile.tsx`
- Card wrapper: rimuovere `overflow-hidden` che taglia eventuali popover, sostituire con `overflow-visible`.
- Toggle "Mostra annullate" e ultima card devono restare visibili sopra la nav (verificato dal fix di `pb-bottom-nav`).

### h) QA manuale (in dev)
- 320×568, 390×844, 414×896: caricare /owner/schedule, /owner/bookings, /owner/users, /instructor, /instructor/schedule, /instructor/participants.
- Verificare: (1) nav sempre visibile a riposo; (2) nav nascosta solo con tastiera aperta; (3) ultima riga di contenuto NON coperta dalla nav; (4) drawer apre full-height con X chiaramente cliccabile; (5) CTA del drawer sempre raggiungibile sopra la safe-area.
- Aggiornare il test esistente `RoleBottomNav.test.tsx` per riflettere il nuovo comportamento (no auto-hide on scroll).

## File toccati

- `src/index.css`
- `src/hooks/useScrollDirection.ts`
- `src/components/RoleBottomNav.tsx`
- `src/components/RoleBottomNav.test.tsx` (aggiorna assertions)
- `src/components/ui/drawer.tsx`
- `src/components/owner/SessionManagementDrawer.tsx`
- `src/components/owner/SessionCalendarMobile.tsx`
- `src/layouts/OwnerLayout.tsx`
- `src/layouts/InstructorLayout.tsx`

## Cosa NON tocco
Logica di business, query Supabase, hook dati, regole RLS, calcoli prenotazioni — solo layout/presentazione mobile.
