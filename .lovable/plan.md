## Obiettivo
Rendere pienamente utilizzabili su mobile (iPhone, viewport 320–414px) tutti i pop-up che un Istruttore può aprire dall'app: drawer di gestione sessione, dialog di iscrizione manuale, dialog di conferma cancellazione partecipante, e i dialog condivisi (es. partecipanti corso, dettagli utente, certificato medico) raggiungibili dalle pagine istruttore.

## Problemi rilevati
1. **DialogContent base** (`src/components/ui/dialog.tsx`) usa `max-w-lg`, `top/left 50%`, `p-6`, `max-h-[90vh]`. Su 390×595 il dialog risulta:
   - largo quasi uguale al viewport ma con padding 24px che taglia i CTA
   - non rispetta `safe-area-inset-bottom` né la BottomNav (z-40 vs dialog z-50: ok per layering, ma l'altezza interna non lascia spazio agli ultimi pulsanti)
   - tastiera virtuale iOS: dialog non si rimpicciolisce, i campi finiscono sotto la tastiera
2. **`InstructorManualEnrollment`** ha sezioni lunghe (ricerca utenti, lista risultati, conferma) dentro Card senza wrapping in Dialog mobile-friendly. Su mobile deve diventare un **Drawer bottom-sheet** o una pagina full-screen, non un dialog centrato.
3. **`InstructorParticipants` → AlertDialog di cancellazione**: usa `AlertDialogContent` standard, footer con due pulsanti che vanno a capo male su 320px.
4. **`SessionManagementDrawer`** (già condiviso owner/instructor): l'altezza `max-h-[90vh]` + header sticky lascia il footer CTA fuori vista; lo scroll interno funziona ma i pulsanti d'azione (Modifica/Elimina/Conferma) non sono sempre raggiungibili senza scroll esplicito, e l'area di input ricerca utenti finisce sotto la tastiera.
5. **Dialog condivisi aperti dall'istruttore** (`CourseParticipantsViewModal`, `CourseParticipantsList`, `UserHistoryModal`, `MedicalCertificateUploadDialog`): tutti `DialogContent` desktop-first con `max-w-2xl/4xl` e `max-h-[80vh]`. Su mobile si schiacciano e i CTA footer escono dal viewport.

## Soluzione

### A. Pattern responsive unificato per i pop-up
Creare un wrapper `ResponsiveDialog` (`src/components/ui/responsive-dialog.tsx`) che:
- su `md+` renderizza un `Dialog` Radix (comportamento attuale)
- su mobile renderizza un `Drawer` (Vaul) bottom-sheet con `max-h-[92dvh]`, header sticky in alto, footer sticky in basso con `safe-area-inset-bottom`, body con `overflow-y-auto` e `pb-[env(safe-area-inset-bottom)]`
- supporta gli stessi sotto-componenti (`Header`, `Title`, `Description`, `Body`, `Footer`)
- gestisce `keyboardVisible` (hook esistente `useKeyboardVisible` o nuovo) riducendo l'altezza body quando la tastiera è aperta

### B. Migrazione dei pop-up istruttore
Sostituire `Dialog/DialogContent` con `ResponsiveDialog` in:
- `src/components/instructor/InstructorManualEnrollment.tsx` (dialog principale + eventuali sub-dialog di conferma)
- `src/pages/instructor/InstructorParticipants.tsx` (AlertDialog cancellazione → `ResponsiveAlertDialog` analogo)
- `src/components/CourseParticipantsViewModal.tsx`
- `src/components/CourseParticipantsList.tsx`
- `src/components/UserHistoryModal.tsx`
- `src/components/MedicalCertificateUploadDialog.tsx`
- `src/components/GymDocumentUploadDialog.tsx` (raggiungibile da istruttore in alcune sezioni)

Footer dei dialog: passare a `flex-col sm:flex-row gap-2`, pulsanti `w-full sm:w-auto`, ordine logico (azione primaria in basso su mobile, a destra su desktop).

### C. Fix specifici `SessionManagementDrawer`
- Footer CTA sempre sticky in basso (`sticky bottom-0 bg-background border-t`) con `pb-[env(safe-area-inset-bottom)]`
- Body `flex-1 min-h-0 overflow-y-auto` per garantire scroll corretto sotto il footer
- Quando `keyboardVisible`: `max-h-[60dvh]` invece di `[30vh]` solo sul body interno, mantenendo header+footer visibili
- Scroll automatico al campo focusato (`scrollIntoView({ block: 'center' })`)

### D. CSS / safe-area
- Aggiungere classe utility `.dialog-mobile-safe` in `src/index.css` con `padding-bottom: max(1rem, env(safe-area-inset-bottom))`
- Verificare che `dvh` sia usato al posto di `vh` per gestire la barra Safari iOS

### E. QA
- Test manuale via browser tool a 390×844 e 320×568: aprire ogni pop-up istruttore, verificare che header, scroll, ultimo CTA siano raggiungibili
- Aggiungere test Vitest per `ResponsiveDialog` (rendering corretto Drawer su mobile, Dialog su desktop, presenza classi safe-area)
- Estendere il `useBottomNavCollisionDetector` esistente perché ignori elementi dentro `[role="dialog"]` aperti (evita falsi positivi) ma segnali CTA tagliati fuori viewport dentro un dialog mobile

## File toccati
**Nuovi**
- `src/components/ui/responsive-dialog.tsx`
- `src/components/ui/responsive-dialog.test.tsx`
- `src/hooks/useKeyboardVisible.ts` (se non esiste già; altrimenti riuso)

**Modificati**
- `src/components/ui/dialog.tsx` (solo aggiunta `dvh` + safe-area come fallback)
- `src/index.css`
- `src/components/instructor/InstructorManualEnrollment.tsx`
- `src/pages/instructor/InstructorParticipants.tsx`
- `src/components/owner/SessionManagementDrawer.tsx` (sticky footer + keyboard handling)
- `src/components/CourseParticipantsViewModal.tsx`
- `src/components/CourseParticipantsList.tsx`
- `src/components/UserHistoryModal.tsx`
- `src/components/MedicalCertificateUploadDialog.tsx`
- `src/components/GymDocumentUploadDialog.tsx`
- `src/hooks/useBottomNavCollisionDetector.ts`

## Fuori scopo
- Modifiche alla logica di business (iscrizione, cancellazione, gestione crediti)
- Refactor pop-up esclusivi dell'area Owner desktop
- Cambi al BottomNav (già ottimizzato nel turno precedente)
