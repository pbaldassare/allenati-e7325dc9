import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import logger from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  /** Optional scope label, used only for logging. */
  scope?: string;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error(`[ErrorBoundary${this.props.scope ? `:${this.props.scope}` : ''}]`, error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold">Qualcosa è andato storto</h2>
            <p className="text-sm text-muted-foreground">
              Si è verificato un errore imprevisto. Puoi riprovare o ricaricare la pagina.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.reset}>Riprova</Button>
              <Button onClick={() => window.location.reload()}>Ricarica pagina</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
