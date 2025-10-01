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
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              ai sensi dell'art. 13 del Regolamento europeo 679/2016
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <p>
                <strong>Allenati.me</strong> è un marchio di <strong>LEG S.r.l.</strong>, P.IVA 04231050982, con sede legale in Desenzano del Garda (BS), Viale Michelangelo n. 71. Con la presente informativa desideriamo informarla dell'uso dei Suoi dati personali e dei Suoi diritti, comunicando quanto segue:
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Titolari e co-titolari del trattamento</h2>
              <p className="mb-3">
                Titolare del trattamento è <strong>LEG S.r.l.</strong>, marchio Allenati.me. Email di riferimento: <a href="mailto:amministrazione@allenati.me" className="text-primary hover:underline">amministrazione@allenati.me</a>
              </p>
              <p>
                Considerata la natura dell'applicazione, che integra più palestre aderenti, i titolari delle singole palestre sono da considerarsi co-titolari del trattamento dei dati personali insieme a LEG S.r.l. I dati conferiti dall'utente sono quindi gestiti in un sistema condiviso, accessibile a tutte le palestre aderenti, anche diverse da quella presso la quale l'utente ha sottoscritto l'iscrizione. L'elenco aggiornato delle palestre co-titolari è disponibile su richiesta scrivendo a <a href="mailto:amministrazione@allenati.me" className="text-primary hover:underline">amministrazione@allenati.me</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Tipologia di dati trattati e raccolti</h2>
              <p className="mb-3">
                Fra i dati personali raccolti da questa applicazione, in modo autonomo o tramite terze parti, ci sono:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Nome, cognome, data di nascita, codice fiscale;</li>
                <li>Indirizzo, email, numero di telefono;</li>
                <li>Dati relativi all'iscrizione in palestra, abbonamenti e frequenza;</li>
                <li>Dati di pagamento;</li>
                <li>Certificato medico di idoneità sportiva (allegato caricato dall'utente e visibile ai co-titolari);</li>
                <li>Cookie, dati di utilizzo e log di accesso (IP, data, orario, preferenze).</li>
              </ul>
              <p className="mt-3">
                Tutti i dati richiesti da questa applicazione sono obbligatori. Se l'utente rifiuta di comunicarli, potrebbe essere impossibile per questa applicazione fornire il servizio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Finalità e natura obbligatoria o facoltativa del trattamento</h2>
              <p className="mb-3">
                I dati sono trattati per consentire al Titolare e ai co-titolari di:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>erogare i servizi previsti dall'app Allenati.me;</li>
                <li>gestire le iscrizioni e i rapporti contrattuali con le palestre;</li>
                <li>adempiere a obblighi di legge (ad es. conservazione del certificato medico);</li>
                <li>inviare comunicazioni tecniche e di servizio.</li>
              </ul>
              <p className="mb-2">
                <strong>Finalità facoltative, previo consenso esplicito:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>invio di comunicazioni promozionali e commerciali tramite email e notifiche push;</li>
                <li>attività di marketing diretto e ricerche di mercato.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Soggetti autorizzati al trattamento</h2>
              <p>
                I dati possono essere trattati da dipendenti e collaboratori dei titolari e co-titolari, debitamente autorizzati e istruiti. Possono inoltre essere coinvolti fornitori esterni (società informatiche, hosting provider, agenzie di comunicazione), nominati responsabili del trattamento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Modalità del trattamento</h2>
              <p>
                Il trattamento avviene mediante strumenti informatici e telematici, con logiche organizzative e misure di sicurezza idonee a garantire la protezione dei dati.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Luogo del trattamento</h2>
              <p>
                I dati sono trattati presso le sedi operative dei titolari e co-titolari e in ogni altro luogo in cui le parti coinvolte siano localizzate. I dati personali potrebbero essere trasferiti in Paesi diversi da quello in cui l'utente si trova, sempre nel rispetto della normativa vigente.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Periodo di conservazione</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>Dati contrattuali: conservati per la durata del rapporto e fino a 10 anni dalla cessazione;</li>
                <li>Dati marketing: 24 mesi dal consenso o cessazione del rapporto;</li>
                <li>Certificati medici: conservati per la durata di validità e poi eliminati.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Base giuridica del trattamento</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>consenso dell'utente;</li>
                <li>esecuzione del contratto;</li>
                <li>adempimento di obblighi legali;</li>
                <li>legittimo interesse dei titolari.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Trasferimento dei dati all'estero</h2>
              <p>
                I dati personali potranno essere trasferiti verso Paesi membri dell'Unione Europea e verso Paesi al di fuori dell'UE, nel rispetto della normativa e delle garanzie previste dal GDPR.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Utenti minori di età</h2>
              <p className="mb-3">
                L'app non è destinata a minori di anni 18.
              </p>
              <p>
                Qualora l'utente abbia meno di 18 anni, l'iscrizione e l'utilizzo dell'applicazione devono avvenire con il consenso e sotto la responsabilità di un genitore o tutore legale. I titolari si riservano la possibilità di richiedere in qualsiasi momento documenti o prove idonee a verificare l'età e il consenso del genitore/tutore.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Diritti dell'interessato</h2>
              <p className="mb-3">
                L'utente ha diritto di:
              </p>
              <ul className="list-disc pl-6 space-y-1 mb-4">
                <li>accedere ai propri dati;</li>
                <li>chiederne la rettifica o cancellazione;</li>
                <li>limitarne il trattamento;</li>
                <li>opporsi al trattamento;</li>
                <li>richiedere la portabilità dei dati;</li>
                <li>revocare il consenso in qualsiasi momento;</li>
                <li>proporre reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.garanteprivacy.it</a>).</li>
              </ul>
              <p>
                Le richieste vanno inviate a: <a href="mailto:amministrazione@allenati.me" className="text-primary hover:underline">amministrazione@allenati.me</a>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
