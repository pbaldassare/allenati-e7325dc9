import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Informativa sulla Privacy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')} - Versione 1.0
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduzione</h2>
              <p className="text-muted-foreground">
                La presente informativa sulla privacy descrive come raccogliamo, utilizziamo e proteggiamo 
                i dati personali degli utenti in conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Titolare del Trattamento</h2>
              <p className="text-muted-foreground">
                Il titolare del trattamento dei dati è la palestra o l'organizzazione presso cui l'utente 
                si è registrato attraverso questa applicazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Dati Raccolti</h2>
              <p className="text-muted-foreground mb-2">Raccogliamo le seguenti categorie di dati personali:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Dati di registrazione:</strong> nome, cognome, email, telefono, codice fiscale</li>
                <li><strong>Dati di pagamento:</strong> informazioni sulle transazioni (tramite provider esterni sicuri)</li>
                <li><strong>Dati di utilizzo:</strong> prenotazioni, partecipazione ai corsi, crediti utilizzati</li>
                <li><strong>Dati medici:</strong> certificato medico sportivo (quando richiesto)</li>
                <li><strong>Dati di contatto emergenza:</strong> nome e telefono del contatto di emergenza</li>
                <li><strong>Dati tecnici:</strong> indirizzo IP, tipo di dispositivo, browser utilizzato</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Finalità del Trattamento</h2>
              <p className="text-muted-foreground mb-2">I dati personali sono trattati per le seguenti finalità:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Gestione della registrazione e dell'account utente</li>
                <li>Prenotazione e partecipazione ai corsi</li>
                <li>Elaborazione dei pagamenti</li>
                <li>Comunicazioni relative ai servizi</li>
                <li>Gestione delle emergenze</li>
                <li>Miglioramento dei servizi offerti</li>
                <li>Adempimento degli obblighi di legge</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Base Giuridica del Trattamento</h2>
              <p className="text-muted-foreground mb-2">Il trattamento dei dati si basa su:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Esecuzione del contratto:</strong> per fornire i servizi richiesti</li>
                <li><strong>Consenso:</strong> per comunicazioni marketing (quando applicabile)</li>
                <li><strong>Obbligo di legge:</strong> per adempimenti fiscali e normativi</li>
                <li><strong>Interesse legittimo:</strong> per migliorare i servizi e prevenire frodi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Condivisione dei Dati</h2>
              <p className="text-muted-foreground mb-2">I dati personali possono essere condivisi con:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Istruttori della palestra (per gestione corsi)</li>
                <li>Provider di servizi di pagamento</li>
                <li>Fornitori di servizi cloud (Supabase)</li>
                <li>Autorità competenti (quando richiesto dalla legge)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Non vendiamo né condividiamo i dati personali con terze parti per scopi di marketing.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Conservazione dei Dati</h2>
              <p className="text-muted-foreground">
                I dati personali sono conservati per il tempo necessario a fornire i servizi richiesti e per 
                adempiere agli obblighi di legge. I dati contabili sono conservati per 10 anni come previsto 
                dalla normativa fiscale italiana.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Diritti dell'Utente</h2>
              <p className="text-muted-foreground mb-2">
                In conformità con il GDPR, l'utente ha diritto a:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Accesso:</strong> ottenere conferma del trattamento dei propri dati</li>
                <li><strong>Rettifica:</strong> correggere dati inesatti o incompleti</li>
                <li><strong>Cancellazione:</strong> richiedere la cancellazione dei dati ("diritto all'oblio")</li>
                <li><strong>Limitazione:</strong> limitare il trattamento dei dati</li>
                <li><strong>Portabilità:</strong> ricevere i dati in formato strutturato</li>
                <li><strong>Opposizione:</strong> opporsi al trattamento dei dati</li>
                <li><strong>Revoca del consenso:</strong> revocare il consenso in qualsiasi momento</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Per esercitare questi diritti, contattare il supporto attraverso l'applicazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Sicurezza dei Dati</h2>
              <p className="text-muted-foreground">
                Implementiamo misure tecniche e organizzative appropriate per proteggere i dati personali 
                da accessi non autorizzati, perdita o distruzione. I dati sono crittografati durante la 
                trasmissione e l'archiviazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Cookie e Tecnologie Simili</h2>
              <p className="text-muted-foreground">
                L'applicazione utilizza cookie tecnici necessari per il funzionamento del servizio. 
                Non utilizziamo cookie di profilazione senza il consenso dell'utente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Modifiche all'Informativa</h2>
              <p className="text-muted-foreground">
                Ci riserviamo il diritto di modificare questa informativa sulla privacy. 
                Le modifiche saranno pubblicate nell'applicazione con indicazione della data di aggiornamento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Reclami</h2>
              <p className="text-muted-foreground">
                L'utente ha il diritto di presentare un reclamo all'Autorità Garante per la Protezione 
                dei Dati Personali (www.garanteprivacy.it) in caso di violazione della normativa sulla privacy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">13. Contatti</h2>
              <p className="text-muted-foreground">
                Per qualsiasi domanda riguardante questa informativa sulla privacy o per esercitare i propri diritti, 
                contattare il supporto attraverso l'applicazione.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
