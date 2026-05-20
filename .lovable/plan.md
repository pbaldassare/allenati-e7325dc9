## Causa del problema

Nel file `src/components/owner/SessionManagementDrawer.tsx` si è creato un ciclo infinito di rendering che fa crashare React (`Maximum update depth exceeded`) e quindi blocca il caricamento delle pagine ovunque il drawer venga renderizzato (es. calendario owner, gestione sessioni).

Due bug si combinano:

1. **`HeaderContent` e `BodyContent` sono definiti come componenti dentro il componente padre** (`const BodyContent = () => (...)`). Ad ogni render del padre vengono ricreati come funzioni nuove, quindi React li smonta e rimonta l'intero sottoalbero ad ogni render.

2. **L'`<Input>` di ricerca usa `ref={setSearchInputRef}`** dove `setSearchInputRef` è il setter di un `useState` (riga 117). Combinato con il remount continuo del punto 1 (e con il `composeRefs` di Radix), il ref viene invocato con `null` → nuovo nodo ad ogni render, aggiornando lo state → nuovo render → loop infinito. Questo è esattamente lo stack trace visto (`setRef` → `dispatchSetState` → `checkForNestedUpdates`).

## Fix

In `src/components/owner/SessionManagementDrawer.tsx`:

1. Sostituire `useState<HTMLInputElement | null>` per `searchInputRef` con un normale `useRef<HTMLInputElement>(null)`, e aggiornare l'uso (`searchInputRef.current.scrollIntoView(...)` invece di `searchInputRef.scrollIntoView(...)`).
2. Spostare `HeaderContent` e `BodyContent` fuori dal corpo del componente padre (componenti separati che ricevono via props quello che serve), oppure — più semplice e meno invasivo — inlinarli direttamente dentro `<DialogContent>` / `<DrawerContent>` invece di estrarli come funzioni-componente dentro il padre.

Il fix #1 da solo dovrebbe già rompere il ciclo; il #2 elimina il pattern fragile (remount continuo) e migliora le performance e il focus dell'input durante la digitazione.

## Verifica

- Aprire `/owner/schedule`, cliccare su una sessione, controllare che il drawer si apra senza crash e senza errori in console.
- Verificare che la ricerca utenti nel drawer funzioni e mantenga il focus mentre si digita.