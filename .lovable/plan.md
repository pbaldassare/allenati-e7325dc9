# Fix vero — la ricerca perde focus ad ogni carattere

## Causa root (confermata)

In `src/components/owner/SessionManagementDrawer.tsx` ci sono due **componenti definiti DENTRO il corpo della funzione del drawer**:

```tsx
const HeaderContent = () => ( ... );   // riga 1082
const BodyContent   = () => ( ... );   // riga 1156
```

e poi vengono usati come componenti JSX:

```tsx
<HeaderContent />
<BodyContent />
```

Questo è un classico anti-pattern React: ad ogni render del drawer (es. ad ogni `setSearchTerm`), `HeaderContent` e `BodyContent` sono **nuove function reference**. React vede un "tipo di componente diverso" e **smonta + rimonta l'intero sottoalbero** — compreso l'`<Input>` della ricerca. Risultato: la tastiera si chiude e perdi il focus ad ogni carattere → "uno alla volta".

I miei fix precedenti (rimozione di `scrollIntoView`, debounce, ecc.) erano corretti come pulizia ma **non potevano risolvere** questo, perché il vero remount avviene a livello di tipo componente.

## Soluzione

Trasformare `HeaderContent` e `BodyContent` da **componenti** a **espressioni JSX**:

```tsx
const headerContent = ( ... );   // niente arrow function, solo JSX
const bodyContent   = ( ... );
```

e usarle come valori, non come tag:

```tsx
{headerContent}
{bodyContent}
```

In questo modo React vede sempre lo stesso albero, non rimonta nulla e l'`<Input>` mantiene il focus → si può digitare normalmente, incluse stringhe multi-carattere.

## File toccato
- `src/components/owner/SessionManagementDrawer.tsx` (solo rinomina + rimozione `() =>` + cambio di `<HeaderContent />`/`<BodyContent />` in `{headerContent}`/`{bodyContent}` nei 4 punti di utilizzo).

Nessuna modifica a logica, RLS, DB o ad altri file.

Procedo?