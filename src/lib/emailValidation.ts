import { z } from 'zod';

// Lista dei domini e TLD più comuni e validi
const VALID_TLDS = [
  // TLD italiani
  'it', 'com.it', 'org.it', 'net.it', 'gov.it', 'edu.it',
  // TLD principali internazionali
  'com', 'net', 'org', 'edu', 'gov', 'mil',
  // TLD europei
  'eu', 'de', 'fr', 'es', 'uk', 'co.uk', 'nl', 'be', 'ch', 'at',
  // Altri TLD comuni
  'info', 'biz', 'name', 'me', 'tv', 'cc', 'io', 'app', 'dev'
];

// Provider email più comuni
const COMMON_EMAIL_PROVIDERS = [
  // Provider italiani
  'gmail.com', 'libero.it', 'virgilio.it', 'tiscali.it', 'tin.it', 'alice.it',
  'fastweb.it', 'poste.it', 'email.it', 'yahoo.it', 'hotmail.it',
  // Provider internazionali
  'outlook.com', 'hotmail.com', 'yahoo.com', 'live.com', 'msn.com',
  'aol.com', 'protonmail.com', 'icloud.com', 'me.com', 'mac.com'
];

// Errori comuni di digitazione e loro correzioni
const COMMON_TYPOS: Record<string, string> = {
  // TLD errors
  'con': 'com',
  'co': 'com',
  'cmo': 'com',
  'ocm': 'com',
  'if': 'it',
  'ti': 'it',
  'iy': 'it',
  'ot': 'it',
  // Provider errors
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gamil.com': 'gmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlook.con': 'outlook.com',
  'libero.if': 'libero.it',
  'virgilio.if': 'virgilio.it',
  'tiscali.if': 'tiscali.it'
};

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Valida se un dominio email è nella lista dei domini consentiti
 */
export function validateEmailDomain(email: string): EmailValidationResult {
  // Prima validazione base del formato email
  const emailSchema = z.string().email();
  
  try {
    emailSchema.parse(email);
  } catch {
    return {
      isValid: false,
      error: 'Formato email non valido'
    };
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];
  
  if (!domain) {
    return {
      isValid: false,
      error: 'Dominio email mancante'
    };
  }

  // Controllo se è un provider comune (accettato automaticamente)
  if (COMMON_EMAIL_PROVIDERS.includes(domain)) {
    return { isValid: true };
  }

  // Controllo se il TLD è valido
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return {
      isValid: false,
      error: 'Dominio non valido - manca l\'estensione'
    };
  }

  // Estrai il TLD (può essere .it, .co.uk, etc.)
  const tld = domainParts.slice(-2).join('.'); // per domini come .co.uk
  const simpleTld = domainParts[domainParts.length - 1]; // per domini come .it

  const isValidTld = VALID_TLDS.includes(tld) || VALID_TLDS.includes(simpleTld);

  if (!isValidTld) {
    // Controlla se c'è un errore comune che possiamo correggere
    const suggestion = findTypoSuggestion(domain);
    
    return {
      isValid: false,
      error: `Dominio non riconosciuto: "${domain}"`,
      suggestion: suggestion ? `Forse intendevi: ${suggestion}?` : undefined
    };
  }

  return { isValid: true };
}

/**
 * Cerca suggerimenti per errori di digitazione comuni
 */
function findTypoSuggestion(domain: string): string | undefined {
  // Controllo esatto
  if (COMMON_TYPOS[domain]) {
    return COMMON_TYPOS[domain];
  }

  // Controllo del TLD
  const domainParts = domain.split('.');
  if (domainParts.length >= 2) {
    const mainDomain = domainParts.slice(0, -1).join('.');
    const currentTld = domainParts[domainParts.length - 1];
    
    if (COMMON_TYPOS[currentTld]) {
      return `${mainDomain}.${COMMON_TYPOS[currentTld]}`;
    }
  }

  // Controllo provider comuni con errori
  for (const [typo, correct] of Object.entries(COMMON_TYPOS)) {
    if (domain.includes(typo)) {
      return correct;
    }
  }

  return undefined;
}

/**
 * Schema Zod personalizzato per la validazione email con domini
 */
export const emailDomainSchema = z
  .string()
  .email('Formato email non valido')
  .refine((email) => {
    const result = validateEmailDomain(email);
    return result.isValid;
  }, (email) => {
    const result = validateEmailDomain(email);
    return {
      message: result.suggestion 
        ? `${result.error}. ${result.suggestion}` 
        : result.error || 'Dominio email non valido'
    };
  });

/**
 * Validazione email real-time con debounce per UX migliore
 */
export function createEmailValidator(onValidation: (result: EmailValidationResult) => void) {
  let timeoutId: NodeJS.Timeout;

  return (email: string) => {
    clearTimeout(timeoutId);
    
    if (!email.trim()) {
      onValidation({ isValid: true }); // Non mostrare errore per campo vuoto
      return;
    }

    timeoutId = setTimeout(() => {
      const result = validateEmailDomain(email);
      onValidation(result);
    }, 500); // Debounce di 500ms
  };
}