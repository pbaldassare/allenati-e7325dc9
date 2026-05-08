## Nascondere il Debug Data dalla Dashboard Proprietario

Il componente `DebugDataComponent` è attualmente mostrato nella dashboard proprietario. Va rimosso dalla UI mantenendo il file componente intatto (per eventuale riuso futuro in sviluppo).

### Modifiche

**`src/pages/owner/OwnerDashboard.tsx`**
- Rimuovere l'import di `DebugDataComponent` (riga 14)
- Rimuovere il render `<DebugDataComponent />` (riga 180)

Nessun'altra modifica necessaria.