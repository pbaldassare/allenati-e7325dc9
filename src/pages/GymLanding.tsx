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
      title: "App Mobile Nativa",
      description: "App iOS e Android personalizzata con il tuo brand. I clienti prenotano, pagano e gestiscono abbonamenti ovunque si trovino",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      title: "Multipalestra Intelligente", 
      description: "Gestisci multiple sedi da un'unica dashboard. I clienti possono usare i crediti in tutte le tue palestre della rete",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: CreditCard,
      title: "Sistema Crediti Avanzato",
      description: "Crediti flessibili, pacchetti personalizzati, abbonamenti ricorrenti, freeze automatici e gestione scadenze intelligente",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: BarChart3,
      title: "Analytics & Revenue",
      description: "Analizza ricavi per sede, istruttore, corso. Previsioni di fatturato, retention rate e lifetime value clienti",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Users,
      title: "Staff Management Pro",
      description: "Istruttori con privilegi owner, gestione turnazioni, commissioni automatiche e monitoraggio performance",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Clock,
      title: "Automazione Totale",
      description: "Liste d'attesa intelligenti, rimborsi automatici, recupero lezioni perse e notifiche push personalizzate",
      color: "from-teal-500 to-blue-500"
    }
  ];

  const benefits = [
    "Aumento del 40% nelle prenotazioni con sistema multipalestra",
    "Riduzione del 70% nel tempo di gestione grazie all'automazione",
    "Incremento del 35% nei ricavi con abbonamenti flessibili",
    "Zero perdite di crediti grazie al sistema di freeze intelligente",
    "Gestione contemporanea di 50+ palestre su un'unica piattaforma",
    "ROI garantito del 300% entro i primi 6 mesi",
    "Integrazione con oltre 15 sistemi di pagamento",
    "Supporto multilingua e personalizzazione completa del brand"
  ];

  const subscriptionTypes = [
    {
      title: "Crediti Flessibili",
      description: "Pacchetti da 1 a 100+ crediti con validità personalizzabile",
      features: ["Uso in tutte le sedi", "Freeze automatico", "Trasferibilità"]
    },
    {
      title: "Abbonamenti Ricorrenti", 
      description: "Mensili, trimestrali, annuali con rinnovo automatico",
      features: ["Pricing dinamico", "Sconti progressivi", "Pausa temporanea"]
    },
    {
      title: "Pacchetti Ibridi",
      description: "Combinazioni crediti + abbonamento per massima flessibilità", 
      features: ["Corsi illimitati", "Personal training", "Servizi extra"]
    }
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
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <Badge className="mb-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 animate-pulse">
            🚀 Rivoluzione Fitness Multipalestra
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 animate-fade-in">
            Il Sistema All-in-One per Reti di Palestre
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            <strong className="text-foreground">Multipalestra • Crediti Flessibili • Abbonamenti Personalizzati</strong><br/>
            Gestisci 1 o 100 palestre con la piattaforma che si adatta a qualsiasi business model fitness
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 shadow-xl hover-scale">
              Demo Personalizzata Gratuita
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 border-purple-500 text-purple-600 hover:bg-purple-50">
              Caso Studio (+300% ROI)
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Tecnologia Enterprise per il Fitness
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              La piattaforma più avanzata del mercato per gestire reti di palestre con flessibilità totale
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full hover:shadow-xl transition-all duration-500 border-0 bg-white/80 backdrop-blur-sm hover:scale-105 group">
                <CardHeader>
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Types Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Abbonamenti Senza Limiti
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Crea qualsiasi tipo di abbonamento, crediti e pacchetti. La flessibilità che ogni palestra sogna
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {subscriptionTypes.map((type, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm hover:scale-105">
                <CardHeader>
                  <CardTitle className="text-xl text-center bg-gradient-to-r from-green-700 to-teal-700 bg-clip-text text-transparent">
                    {type.title}
                  </CardTitle>
                  <CardDescription className="text-center text-base">
                    {type.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {type.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-8 text-white text-center">
            <h3 className="text-2xl font-bold mb-4">Configurazioni Illimitate</h3>
            <p className="text-lg mb-6 opacity-90">
              Crediti con scadenza variabile • Abbonamenti con pause • Pacchetti famiglia • Promozioni automatiche • Sconti progressivi
            </p>
            <Button className="bg-white text-green-600 hover:bg-gray-100 font-semibold">
              Esplora Tutte le Opzioni
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                ROI Garantito + Crescita Esponenziale
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                <strong className="text-foreground">Oltre 500 palestre</strong> hanno già trasformato il loro business con risultati misurabili
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3 group">
                    <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg font-medium">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-200">
                <h4 className="font-bold text-lg mb-2 text-purple-700">Caso di Successo: Rete FitLife</h4>
                <p className="text-sm text-gray-600">
                  <strong>15 sedi, 12.000+ membri</strong> • Da 450k€ a 1.2M€ di fatturato annuo in 18 mesi • 
                  Gestione completamente automatizzata con il nostro sistema multipalestra
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl p-8 text-white shadow-2xl">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-8 w-8 text-yellow-300 fill-current animate-pulse" style={{animationDelay: `${i * 0.1}s`}} />
                    ))}
                  </div>
                  <blockquote className="text-xl italic mb-4 font-medium">
                    "In 8 mesi siamo passati da 3 a 12 palestre. Il sistema multipalestra di Allenati 
                    gestisce tutto automaticamente: crediti condivisi, abbonamenti flessibili e analytics unificati."
                  </blockquote>
                  <cite className="font-bold text-lg">
                    Laura M. - CEO PowerGym Network
                  </cite>
                  <div className="mt-4 text-sm opacity-90">
                    <span className="bg-white/20 px-3 py-1 rounded-full mr-2">12 Sedi</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full mr-2">8,500+ Membri</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">+380% Crescita</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 animate-fade-in">
            Diventa il Leader del Fitness nella Tua Città
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
            <strong>Setup gratuito • Migrazione assistita • ROI garantito in 6 mesi</strong><br/>
            Unisciti alle 500+ palestre che hanno già rivoluzionato il loro business
          </p>
          
          <Card className="max-w-2xl mx-auto shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-white to-gray-50">
              <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Demo Personalizzata + Analisi Gratuita
              </CardTitle>
              <CardDescription className="text-base">
                <strong>In 30 minuti ti mostriamo:</strong> Setup multipalestra, configurazione abbonamenti, 
                calcolo ROI per la tua rete di palestre
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