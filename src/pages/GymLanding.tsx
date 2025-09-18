import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Smartphone, 
  Calendar, 
  CreditCard, 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle, 
  Star,
  ArrowRight,
  Mail,
  Phone
} from "lucide-react";

const GymLanding = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gymName: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const features = [
    {
      icon: Smartphone,
      title: "App Mobile Intuitiva",
      description: "I tuoi clienti prenotano facilmente da smartphone con un'interfaccia moderna e user-friendly"
    },
    {
      icon: Calendar,
      title: "Gestione Corsi Automatizzata",
      description: "Pianifica, modifica e gestisci tutti i tuoi corsi con calendario intelligente e notifiche automatiche"
    },
    {
      icon: CreditCard,
      title: "Pagamenti Digitali",
      description: "Sistema di crediti e abbonamenti integrato con pagamenti sicuri tramite Stripe"
    },
    {
      icon: BarChart3,
      title: "Analytics Avanzati",
      description: "Dashboard completa con statistiche su prenotazioni, ricavi e performance della tua palestra"
    },
    {
      icon: Users,
      title: "Gestione Istruttori",
      description: "Coordina il tuo staff con ruoli personalizzati e accesso dedicato per ogni istruttore"
    },
    {
      icon: Clock,
      title: "Risparmio di Tempo",
      description: "Automatizza prenotazioni, cancellazioni e gestione liste d'attesa"
    }
  ];

  const benefits = [
    "Aumento del 40% nelle prenotazioni online",
    "Riduzione del 60% nel tempo di gestione amministrativa",
    "Miglioramento della soddisfazione clienti",
    "Incremento dei ricavi tramite abbonamenti digitali",
    "Gestione professionale della tua palestra",
    "Supporto clienti dedicato 24/7"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">A</span>
            </div>
            <span className="text-xl font-bold">Allenati</span>
          </div>
          <Button className="hidden md:flex">
            Contattaci
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">
            🚀 Trasforma la tua palestra
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-secondary bg-clip-text text-transparent mb-6">
            La Piattaforma Digitale per la Tua Palestra
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gestisci prenotazioni, corsi e pagamenti con la soluzione all-in-one che fa crescere il tuo business fitness
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Richiedi Demo Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              Guarda il Video
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Tutto Quello di Cui Hai Bisogno
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Una soluzione completa per modernizzare la gestione della tua palestra
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-lg transition-all duration-300 border-0 bg-background/60 backdrop-blur">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Risultati Concreti per la Tua Palestra
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Le palestre che usano Allenati vedono miglioramenti immediati nella gestione e nei ricavi
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 backdrop-blur">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                    <Star className="h-8 w-8 text-yellow-500 fill-current" />
                  </div>
                  <blockquote className="text-lg italic mb-4">
                    "Con Allenati abbiamo digitalizzato completamente la nostra palestra. 
                    I clienti sono più soddisfatti e noi gestiamo tutto con maggiore efficienza."
                  </blockquote>
                  <cite className="font-semibold">
                    Marco R. - Proprietario Fitness Club Milano
                  </cite>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary via-primary to-secondary">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
            Pronto a Trasformare la Tua Palestra?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Unisciti alle centinaia di palestre che hanno già scelto Allenati per crescere nel digitale
          </p>
          
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Richiedi una Demo Personalizzata</CardTitle>
              <CardDescription>
                Ti mostriamo come Allenati può migliorare la gestione della tua palestra
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Nome e Cognome"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    type="tel"
                    placeholder="Telefono"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                  <Input
                    placeholder="Nome Palestra"
                    value={formData.gymName}
                    onChange={(e) => setFormData({...formData, gymName: e.target.value})}
                    required
                  />
                </div>
                <Textarea
                  placeholder="Raccontaci della tua palestra e delle tue esigenze..."
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="min-h-[100px]"
                />
                <Button type="submit" size="lg" className="w-full">
                  Richiedi Demo Gratuita
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-primary-foreground font-bold">A</span>
                </div>
                <span className="text-xl font-bold">Allenati</span>
              </div>
              <p className="text-muted-foreground mb-4">
                La piattaforma digitale che trasforma la gestione delle palestre
              </p>
              <div className="flex space-x-4">
                <Button variant="outline" size="icon">
                  <Mail className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Prodotto</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Funzionalità</li>
                <li>Prezzi</li>
                <li>Demo</li>
                <li>Support</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Azienda</h4>
              <ul className="space-y-2 text-muted-foreground">
                <li>Chi Siamo</li>
                <li>Contatti</li>
                <li>Privacy</li>
                <li>Termini</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 Allenati. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GymLanding;