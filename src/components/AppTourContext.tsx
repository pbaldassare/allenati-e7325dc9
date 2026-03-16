import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

export type TourActionType = "navigate" | "scroll" | "wait";

export interface TourAction {
  type: TourActionType;
  target?: string;
  delay?: number;
}

export interface TourStep {
  selector: string;
  title: string;
  description: string;
  page?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: TourAction;
  duration?: number;
}

export type TourRole = "user" | "gym_owner" | "instructor";

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: (role?: TourRole) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  totalSteps: number;
}

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
};

/* ═══════════════ USER TOUR ═══════════════ */
export const USER_TOUR_STEPS: TourStep[] = [
  { selector: "user-greeting", title: "Benvenuto su Allenati! 🎉", description: "Questa è la tua home. Qui trovi le sessioni disponibili, il tuo calendario, i crediti e le prenotazioni.", page: "/" },
  { selector: "user-gym-selector", title: "Seleziona la tua palestra 🏋️", description: "Se sei iscritto a più palestre, seleziona quella attiva da qui. Tutti i dati si aggiorneranno automaticamente.", page: "/" },
  { selector: "user-stats-sessions", title: "Le tue prossime sessioni 📅", description: "Qui vedi quante sessioni hai prenotato. Tocca per vedere il dettaglio dei tuoi corsi.", page: "/" },
  { selector: "user-stats-credits", title: "Crediti e abbonamento 💳", description: "Controlla i tuoi crediti disponibili o lo stato del tuo abbonamento. Tocca per acquistare crediti o un nuovo piano.", page: "/" },
  { selector: "user-calendar", title: "Calendario lezioni 📆", description: "Naviga tra le settimane per vedere le sessioni disponibili. Tocca un giorno per filtrare le lezioni.", page: "/" },
  { selector: "user-how-it-works", title: "Come funziona? ❓", description: "Se hai dubbi, questo pulsante ti spiega come funziona l'app passo per passo.", page: "/" },
  { selector: "user-session-list", title: "Le sessioni disponibili 🥋", description: "Qui trovi tutte le lezioni disponibili. Puoi filtrare per categoria e prenotare con un tap.", page: "/", action: { type: "scroll", target: "user-session-list" } },
  { selector: "nav-chat", title: "Chat 💬", description: "Scrivi messaggi alla palestra e comunica con gli altri utenti.", page: "/" },
  { selector: "nav-i-miei-corsi", title: "I Miei Corsi 📋", description: "Consulta lo storico delle tue prenotazioni: lezioni passate, prossime e cancellate.", page: "/" },
  { selector: "nav-palestre", title: "Palestre 🏢", description: "Esplora le palestre disponibili, iscriviti a nuove strutture o gestisci le tue iscrizioni.", page: "/" },
  { selector: "nav-profilo", title: "Il tuo profilo ⚙️", description: "Gestisci i tuoi dati personali, certificato medico, documenti, tema e impostazioni dell'account.", page: "/" },
  { selector: "user-greeting", title: "Sei pronto! 🎊", description: "Ora conosci tutte le funzionalità di Allenati. Inizia prenotando la tua prima lezione! Buon allenamento! 💪", page: "/", action: { type: "navigate", target: "/", delay: 400 } },
];

/* ═══════════════ GYM OWNER TOUR ═══════════════ */
export const OWNER_TOUR_STEPS: TourStep[] = [
  { selector: "owner-dashboard-title", title: "Dashboard Proprietario 🏋️", description: "Benvenuto nella dashboard del proprietario! Qui monitori membri, prenotazioni, ricavi e stato della palestra in un colpo d'occhio.", page: "/owner" },
  { selector: "owner-nav-users", title: "Gestione Utenti 👥", description: "Visualizza tutti gli iscritti alla tua palestra, gestisci abbonamenti, crediti e certificati medici di ogni utente.", page: "/owner" },
  { selector: "owner-nav-instructors", title: "Istruttori 🧑‍🏫", description: "Aggiungi e gestisci gli istruttori della palestra. Assegna loro i corsi e monitora le ore lavorate.", page: "/owner" },
  { selector: "owner-nav-courses", title: "Corsi 📚", description: "Crea e gestisci tutti i corsi della palestra: nome, istruttore, categoria, crediti richiesti e durata.", page: "/owner" },
  { selector: "owner-nav-rooms", title: "Sale 🚪", description: "Configura le sale della palestra per organizzare le lezioni in spazi dedicati.", page: "/owner" },
  { selector: "owner-nav-schedule", title: "Calendario 📅", description: "Visualizza il calendario completo delle sessioni. Monitora la programmazione settimanale della palestra.", page: "/owner" },
  { selector: "owner-nav-bookings", title: "Prenotazioni 📋", description: "Consulta tutte le prenotazioni degli utenti, gestisci check-in e cancellazioni.", page: "/owner" },
  { selector: "owner-nav-subscriptions", title: "Abbonamenti 💳", description: "Gestisci gli abbonamenti attivi, crea piani personalizzati e monitora i rinnovi.", page: "/owner" },
  { selector: "owner-nav-chat", title: "Chat 💬", description: "Comunica con gli utenti e gli istruttori della palestra in tempo reale.", page: "/owner" },
  { selector: "owner-nav-reports", title: "Report 📊", description: "Analizza le performance della palestra: ricavi, prenotazioni, frequenza e trend.", page: "/owner" },
  { selector: "owner-nav-documents", title: "Documenti 📄", description: "Gestisci i documenti della palestra e i certificati medici degli utenti.", page: "/owner" },
  { selector: "owner-dashboard-title", title: "Tutto pronto! 🎊", description: "Ora conosci tutte le funzionalità del pannello proprietario. Gestisci la tua palestra al meglio! 💪", page: "/owner", action: { type: "navigate", target: "/owner", delay: 400 } },
];

/* ═══════════════ INSTRUCTOR TOUR ═══════════════ */
export const INSTRUCTOR_TOUR_STEPS: TourStep[] = [
  { selector: "instructor-dashboard-title", title: "Dashboard Istruttore 🧑‍🏫", description: "Benvenuto nella tua dashboard! Qui trovi una panoramica dei tuoi corsi, partecipanti e ore lavorate.", page: "/instructor" },
  { selector: "instructor-nav-courses", title: "I Miei Corsi 📚", description: "Visualizza tutti i corsi che ti sono stati assegnati con dettagli su orari, partecipanti e programmazione.", page: "/instructor" },
  { selector: "instructor-nav-participants", title: "Partecipanti 👥", description: "Consulta la lista dei partecipanti per ogni sessione. Gestisci presenze e check-in.", page: "/instructor" },
  { selector: "instructor-nav-schedule", title: "Calendario 📅", description: "Il tuo calendario personale con tutte le lezioni programmate. Visualizza la settimana a colpo d'occhio.", page: "/instructor" },
  { selector: "instructor-dashboard-title", title: "Buon lavoro! 🎊", description: "Ora conosci tutte le funzionalità a tua disposizione. Buone lezioni! 💪", page: "/instructor", action: { type: "navigate", target: "/instructor", delay: 400 } },
];

export function getTourSteps(role: TourRole): TourStep[] {
  switch (role) {
    case "gym_owner": return OWNER_TOUR_STEPS;
    case "instructor": return INSTRUCTOR_TOUR_STEPS;
    default: return USER_TOUR_STEPS;
  }
}

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>(USER_TOUR_STEPS);
  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const startTour = useCallback((role?: TourRole) => {
    const tourSteps = getTourSteps(role ?? "user");
    setSteps(tourSteps);
    stepsRef.current = tourSteps;
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    localStorage.setItem("allenati_tour_done", "1");
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= stepsRef.current.length - 1) {
        setIsActive(false);
        localStorage.setItem("allenati_tour_done", "1");
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return (
    <TourContext.Provider value={{
      isActive, currentStep, steps, startTour, stopTour, nextStep, prevStep, goToStep,
      totalSteps: steps.length,
    }}>
      {children}
    </TourContext.Provider>
  );
};
