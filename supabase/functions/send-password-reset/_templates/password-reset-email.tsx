import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Img,
  Hr,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface PasswordResetEmailProps {
  resetLink: string;
  email: string;
}

export const PasswordResetEmail = ({
  resetLink,
  email,
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>🔐 Reset Password Allenati Sport - Azione richiesta</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with logo */}
        <Section style={header}>
          <Img
            src="https://qyryykmpadguzxyiotur.supabase.co/storage/v1/object/public/avatars/f1aff50e-632e-46e0-b09f-145c702dc0be.png"
            alt="Allenati Sport"
            style={logo}
          />
        </Section>

        {/* Main content */}
        <Section style={content}>
          <Heading style={h1}>🔐 Reset della Password</Heading>
          
          <Text style={text}>
            <strong>Ciao!</strong>
          </Text>
          
          <Text style={text}>
            Abbiamo ricevuto una richiesta per reimpostare la password del tuo account su <strong>Allenati Sport</strong> associato all'indirizzo email: <strong>{email}</strong>
          </Text>
          
          <Text style={text}>
            Per motivi di sicurezza, questo link è valido solo per <strong>60 minuti</strong>. Se non hai richiesto tu questa operazione, puoi tranquillamente ignorare questa email.
          </Text>
          
          <Section style={buttonSection}>
            <Link href={resetLink} style={button}>
              🔓 Reimposta la tua Password
            </Link>
          </Section>
          
          <Text style={text}>
            <strong>Problemi con il pulsante?</strong> Copia e incolla questo link nel tuo browser:
          </Text>
          
          <Text style={linkText}>
            {resetLink}
          </Text>
          
          <Hr style={hr} />
          
          <Text style={warningText}>
            🛡️ <strong>Sicurezza:</strong> Questo link scadrà automaticamente tra 60 minuti e può essere utilizzato una sola volta.
          </Text>
          
          <Text style={text}>
            ❓ <strong>Non hai richiesto tu questo reset?</strong> Puoi tranquillamente ignorare questa email. La tua password rimarrà invariata.
          </Text>
          
          <Text style={text}>
            💬 <strong>Hai bisogno di aiuto?</strong> Contatta il supporto della tua palestra o scrivi al nostro team di assistenza.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            Cordiali saluti,<br />
            Il team di Allenati Sport
          </Text>
          
          <Text style={footerNote}>
            Questa è un'email automatica, per favore non rispondere. Per assistenza, contatta il supporto della tua palestra.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  padding: "32px 20px",
  textAlign: "center" as const,
  borderBottom: "1px solid #f0f0f0",
};

const logo = {
  width: "120px",
  height: "auto",
};

const content = {
  padding: "32px 20px",
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "0 0 32px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  backgroundClip: "text",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#10B981",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "16px 32px",
  textDecoration: "none",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
};

const linkText = {
  color: "#10B981",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0",
  wordBreak: "break-all" as const,
  backgroundColor: "#f0fdf4",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #bbf7d0",
  fontFamily: "monospace",
};

const warningText = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "24px 0",
  fontWeight: "500",
  backgroundColor: "#fef3c7",
  padding: "12px",
  borderRadius: "6px",
  border: "1px solid #fbbf24",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  borderTop: "1px solid #f0f0f0",
  padding: "32px 20px 0",
  marginTop: "32px",
};

const footerText = {
  color: "#1a1a1a",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const footerNote = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};