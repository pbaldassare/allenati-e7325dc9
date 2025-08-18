import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Shop: React.FC = () => {
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Indietro
        </Button>
      </header>
      
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-muted">
          <Construction className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Sezione in Sviluppo</h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Lo shop sarà presto disponibile! Stiamo lavorando per offrirti i migliori prodotti per il tuo allenamento.
          </p>
        </div>
        
        <Button onClick={() => navigate('/')} variant="outline">
          Torna alla Home
        </Button>
      </div>
    </div>
  );
};

export default Shop;