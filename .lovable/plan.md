## Obiettivo
Impostare una password temporanea per l'account di Danila De Castro (`danila...`) così puoi accedere e verificare di persona che sia collegata a Charme.

## Passi

1. **Verifica account Danila** — query su `auth.users` + `profiles` per confermare email e `user_id` corretto (già noto: `703553cb-dd5e-4e07-982c-995480be3377`).

2. **Verifica collegamento a Charme** — query su `user_gym_memberships` per confermare la riga `gym_id = 24140ca1...` con `status = active`. Se manca, te lo segnalo.

3. **Imposta password temporanea** — chiamata all'edge function admin (`update-user-password` o equivalente con service role) per settare una password tipo `Charme2026!` sull'account di Danila.
   - In alternativa, posso generare un magic link / reset link da inviarti via console.

4. **Ti restituisco le credenziali in chat:**
   - Email: (quella di Danila)
   - Password temporanea: `Charme2026!` (o altra a tua scelta)

5. **Ricorda** di cambiarla o chiedere a Danila di resettarla dopo la verifica.

## Domanda
Confermi password `Charme2026!` o ne preferisci un'altra? E vuoi che ti confermi prima anche l'email esatta di Danila prima di procedere?
