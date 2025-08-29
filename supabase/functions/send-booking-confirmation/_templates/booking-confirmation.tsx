import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface BookingConfirmationEmailProps {
  userName: string;
  courseName: string;
  scheduledDate: string;
  scheduledTime: string;
  gymName: string;
  gymAddress: string;
  instructorName: string;
  creditsUsed: number;
  qrCode?: string;
  bookingId: string;
}

export const BookingConfirmationEmail = ({
  userName,
  courseName,
  scheduledDate,
  scheduledTime,
  gymName,
  gymAddress,
  instructorName,
  creditsUsed,
  qrCode,
  bookingId,
}: BookingConfirmationEmailProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.slice(0, 5);
  };

  return (
    <Html>
      <Head />
      <Preview>Prenotazione confermata per {courseName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with logo */}
          <Section style={header}>
            <Img
              src="https://qyryykmpadguzxyiotur.supabase.co/storage/v1/object/public/avatars/allenati-sport-logo.png"
              width="120"
              height="40"
              alt="Allenati.me"
              style={logo}
            />
          </Section>

          {/* Success Icon */}
          <Section style={iconSection}>
            <Text style={successIcon}>✅</Text>
          </Section>

          {/* Main Content */}
          <Heading style={h1}>Prenotazione Confermata!</Heading>
          
          <Text style={greeting}>
            Ciao <strong>{userName}</strong>,
          </Text>

          <Text style={text}>
            La tua prenotazione è stata confermata con successo. Ecco i dettagli:
          </Text>

          {/* Booking Details Card */}
          <Section style={bookingCard}>
            <Heading style={h2}>{courseName}</Heading>
            
            <Row style={detailRow}>
              <Column style={iconCol}>📅</Column>
              <Column style={labelCol}>
                <Text style={label}>Data e Ora:</Text>
              </Column>
              <Column style={valueCol}>
                <Text style={value}>
                  {formatDate(scheduledDate)} alle {formatTime(scheduledTime)}
                </Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={iconCol}>📍</Column>
              <Column style={labelCol}>
                <Text style={label}>Palestra:</Text>
              </Column>
              <Column style={valueCol}>
                <Text style={value}>{gymName}</Text>
                <Text style={subValue}>{gymAddress}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={iconCol}>🏃‍♂️</Column>
              <Column style={labelCol}>
                <Text style={label}>Istruttore:</Text>
              </Column>
              <Column style={valueCol}>
                <Text style={value}>{instructorName}</Text>
              </Column>
            </Row>

            <Row style={detailRow}>
              <Column style={iconCol}>💳</Column>
              <Column style={labelCol}>
                <Text style={label}>Crediti utilizzati:</Text>
              </Column>
              <Column style={valueCol}>
                <Text style={value}>{creditsUsed}</Text>
              </Column>
            </Row>
          </Section>

          {/* QR Code Section */}
          {qrCode && (
            <Section style={qrSection}>
              <Text style={qrTitle}>🎫 Codice di Check-in</Text>
              <Text style={qrText}>
                Mostra questo QR code all'ingresso per un check-in veloce:
              </Text>
              <Img
                src={qrCode}
                width="150"
                height="150"
                alt="QR Code Check-in"
                style={qrImage}
              />
              <Text style={bookingIdText}>
                ID Prenotazione: <strong>{bookingId}</strong>
              </Text>
            </Section>
          )}

          {/* Important Notes */}
          <Section style={notesSection}>
            <Text style={notesTitle}>📋 Note Importanti</Text>
            <Text style={noteText}>
              • Presentati almeno 10 minuti prima dell'inizio del corso
            </Text>
            <Text style={noteText}>
              • Porta con te un asciugamano e una bottiglia d'acqua
            </Text>
            <Text style={noteText}>
              • In caso di problemi, contatta la palestra direttamente
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Grazie per aver scelto <strong>Allenati.me</strong>!
            </Text>
            <Text style={footerText}>
              Buon allenamento! 💪
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '20px 30px',
  backgroundColor: '#1a1a1a',
  borderRadius: '8px 8px 0 0',
};

const logo = {
  margin: '0 auto',
  display: 'block',
};

const iconSection = {
  textAlign: 'center' as const,
  padding: '30px 0 20px',
};

const successIcon = {
  fontSize: '48px',
  margin: '0',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1a1a1a',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  textAlign: 'center' as const,
};

const greeting = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px',
  padding: '0 30px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
  padding: '0 30px',
};

const bookingCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  margin: '0 30px 30px',
  padding: '24px',
};

const detailRow = {
  marginBottom: '16px',
};

const iconCol = {
  width: '30px',
  verticalAlign: 'top' as const,
};

const labelCol = {
  width: '120px',
  verticalAlign: 'top' as const,
};

const valueCol = {
  verticalAlign: 'top' as const,
};

const label = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0',
  fontWeight: '500',
};

const value = {
  color: '#1f2937',
  fontSize: '14px',
  margin: '0',
  fontWeight: '600',
};

const subValue = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0 0',
};

const qrSection = {
  textAlign: 'center' as const,
  padding: '0 30px 30px',
};

const qrTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const qrText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 20px',
};

const qrImage = {
  margin: '0 auto 16px',
  display: 'block',
  border: '2px solid #e5e7eb',
  borderRadius: '8px',
};

const bookingIdText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
};

const notesSection = {
  padding: '0 30px 30px',
};

const notesTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const noteText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px',
  lineHeight: '20px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '20px 0',
};

const footer = {
  textAlign: 'center' as const,
  padding: '0 30px',
};

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '0 0 8px',
};

export default BookingConfirmationEmail;