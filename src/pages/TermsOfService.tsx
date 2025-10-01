import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
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
            <CardTitle className="text-3xl">Termini e Condizioni</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')} - Versione 1.0
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Accettazione dei Termini</h2>
              <p className="text-muted-foreground">
                Utilizzando questa applicazione, l'utente accetta di essere vincolato dai presenti Termini e Condizioni. 
                Se non si accettano questi termini, non utilizzare l'applicazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Registrazione e Account</h2>
              <p className="text-muted-foreground mb-2">
                Per utilizzare determinate funzionalità dell'applicazione, è necessario registrarsi e creare un account. 
                L'utente si impegna a:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Fornire informazioni accurate, complete e aggiornate</li>
                <li>Mantenere la sicurezza della propria password</li>
                <li>Notificare immediatamente qualsiasi uso non autorizzato del proprio account</li>
                <li>Non condividere il proprio account con terzi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Utilizzo del Servizio</h2>
              <p className="text-muted-foreground mb-2">
                L'utente si impegna a utilizzare l'applicazione in conformità con tutte le leggi applicabili e a non:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Violare i diritti di proprietà intellettuale</li>
                <li>Trasmettere contenuti illegali, offensivi o dannosi</li>
                <li>Interferire con il funzionamento dell'applicazione</li>
                <li>Utilizzare l'applicazione per scopi fraudolenti</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Prenotazioni e Pagamenti</h2>
              <p className="text-muted-foreground">
                Le prenotazioni dei corsi sono soggette alla disponibilità. I pagamenti devono essere effettuati 
                secondo i metodi indicati nell'applicazione. Le politiche di cancellazione e rimborso sono specificate 
                per ogni corso e palestra.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Crediti e Abbonamenti</h2>
              <p className="text-muted-foreground">
                I crediti acquistati hanno una validità specifica e non sono rimborsabili salvo quanto previsto dalla legge. 
                Gli abbonamenti si rinnovano automaticamente salvo disdetta nei termini previsti.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Responsabilità</h2>
              <p className="text-muted-foreground">
                L'applicazione è fornita "così com'è". Non garantiamo che il servizio sia ininterrotto o privo di errori. 
                L'utente utilizza l'applicazione a proprio rischio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Certificato Medico</h2>
              <p className="text-muted-foreground">
                Per partecipare alle attività sportive, potrebbe essere richiesto un certificato medico valido. 
                È responsabilità dell'utente assicurarsi di essere in condizioni fisiche idonee per l'attività scelta.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Modifiche ai Termini</h2>
              <p className="text-muted-foreground">
                Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. 
                Le modifiche entrano in vigore al momento della pubblicazione nell'applicazione.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Risoluzione</h2>
              <p className="text-muted-foreground">
                Ci riserviamo il diritto di sospendere o terminare l'account di un utente in caso di violazione 
                di questi termini.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Legge Applicabile</h2>
              <p className="text-muted-foreground">
                Questi termini sono regolati dalla legge italiana. Qualsiasi controversia sarà sottoposta 
                alla giurisdizione esclusiva dei tribunali italiani.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contatti</h2>
              <p className="text-muted-foreground">
                Per qualsiasi domanda riguardante questi termini, contattare il supporto attraverso l'applicazione.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
