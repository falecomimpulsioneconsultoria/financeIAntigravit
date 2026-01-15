
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
      this.setState({ hasError: false, error: null, errorInfo: null });
      localStorage.removeItem('finances_current_user_cache'); 
      window.location.href = '/'; 
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
               </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Ops! Algo deu errado.</h1>
            <p className="text-gray-600 mb-6 text-sm">
              Ocorreu um erro inesperado ao carregar a aplicação. Tente recarregar a página.
            </p>
            
            {this.state.error && (
                <div className="mb-6 p-3 bg-red-50 rounded-lg text-left overflow-auto max-h-32">
                    <p className="text-xs font-mono text-red-800 break-all">{this.state.error.toString()}</p>
                </div>
            )}

            <div className="flex flex-col gap-3">
                <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                Tentar Novamente
                </button>
                <button
                onClick={this.handleReset}
                className="w-full bg-white text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                Sair e Limpar Dados
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
