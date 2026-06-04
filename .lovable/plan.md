## Azione

Inserire una riga in `user_gym_memberships` per collegare Danila De Castro alla palestra Charme:

- `user_id`: `703553cb-82e0-46a3-b87a-b68df12ec9a5` (Danila De Castro)
- `gym_id`: `24140ca1-d9b9-4987-a5b8-6077fa20015b` (Charme)
- `membership_type`: `member`
- `status`: `active`

Nessun piano/credito assegnato — solo il collegamento alla palestra.

## Nota sulla creazione utenze

Hai segnalato che ogni nuovo utente dovrebbe essere sempre collegato a una palestra in fase di registrazione. Questo è un punto separato da affrontare: probabilmente il `RegisterForm` non sta creando la riga in `user_gym_memberships` (es. tramite gym slug, codice invito o selezione esplicita). Se vuoi, dopo questo fix posso fare un'analisi del flusso di registrazione e proporti come renderlo obbligatorio.