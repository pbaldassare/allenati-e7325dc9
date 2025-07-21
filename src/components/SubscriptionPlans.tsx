import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard } from "lucide-react";

export const SubscriptionPlans = () => {
  const plans = [
    {
      id: "2x-week",
      name: "2x Week",
      description: "Train two times a week",
      price: "79€",
      period: "per month",
      features: ["2 classi a settimana", "Accesso app", "Supporto base"],
      popular: false,
    },
    {
      id: "3x-week", 
      name: "3x Week",
      description: "Train three times a week",
      price: "89€",
      period: "per month",
      features: ["3 classi a settimana", "Accesso app", "Supporto prioritario"],
      popular: false,
    },
    {
      id: "unlimited",
      name: "Unlimited",
      description: "BJJ + Wrestling + Fisico Domingo",
      price: "99€",
      period: "per month",
      features: [
        "Classi illimitate", 
        "Tutti i corsi inclusi",
        "Accesso prioritario",
        "Supporto premium",
        "Eventi speciali"
      ],
      popular: true,
    },
  ];

  return (
    <div className="pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="pt-8 pb-4 text-center">
        <h1 className="text-3xl font-bold text-foreground">Piani Disponibili</h1>
        <p className="text-muted-foreground mt-1">Scegli il piano perfetto per te</p>
      </div>

      {/* Plan Type Tabs */}
      <div className="flex justify-center gap-2">
        <Button className="bg-primary text-primary-foreground">
          Abbonamenti
        </Button>
        <Button variant="outline">
          Lezioni Singole
        </Button>
      </div>

      {/* Plans */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`shadow-card transition-all duration-300 hover:shadow-lg ${
              plan.popular 
                ? "ring-2 ring-primary bg-gradient-to-r from-primary/5 to-secondary/5" 
                : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
                {plan.popular && (
                  <Badge className="bg-primary text-primary-foreground">
                    Popolare
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? "bg-gradient-primary text-primary-foreground shadow-primary" 
                      : ""
                  }`}
                  size="lg"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Acquista Ora
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payment Options */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Visa</span>
            </div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
            <span>Mastercard</span>
            <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
            <span>PayPal</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Pagamenti sicuri e crittografati
          </p>
        </CardContent>
      </Card>
    </div>
  );
};