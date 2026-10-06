import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: any): State {
    console.error("ErrorBoundary caught error:", error);
    return { hasError: true, errorMsg: error instanceof Error ? error.message : String(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          textAlign: 'center' as const,
          backgroundColor: '#FFF1F2',
          border: '1px solid #DC2626',
          borderRadius: '8px',
          margin: '2rem'
        }}>
          <div style={{ color: '#DC2626', fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#111827', marginBottom: '0.5rem', fontFamily: 'Inter, sans-serif' }}>
            Data Sync / Fetch Error
          </h2>
          <p style={{ color: '#6B7280', marginBottom: '1.5rem', maxWidth: '400px', fontFamily: 'Inter, sans-serif', wordWrap: 'break-word' }}>
            <strong style={{color: 'red'}}>DEV ERROR: {String(this.state.errorMsg || "NO MESSAGE")}</strong>
            <br/><br/>
            {this.props.fallbackMessage || "An unexpected error occurred while loading this interface or syncing data from the server."}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#00843D',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
