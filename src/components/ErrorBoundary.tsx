import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'global' | 'component' | 'section';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report error to analytics service if available
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Report to error tracking service (e.g., Sentry, LogRocket)
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        level: this.props.level || 'component',
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Store error locally for debugging
      const existingErrors = JSON.parse(localStorage.getItem('app-errors') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('app-errors', JSON.stringify(existingErrors));
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: ''
      });
    } else {
      // Max retries reached, suggest page refresh
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorDetails = {
      id: errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    };

    const subject = `Bug Report: ${error?.message || 'Unknown Error'}`;
    const body = `Error ID: ${errorId}\n\nError Details:\n${JSON.stringify(errorDetails, null, 2)}`;
    const mailtoUrl = `mailto:support@agentflowbuilder.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(mailtoUrl, '_blank');
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' => {
    const { error } = this.state;
    if (!error) return 'low';

    // Check for critical errors
    if (error.message.includes('ChunkLoadError') || 
        error.message.includes('Loading chunk')) {
      return 'medium'; // Network/loading issues
    }

    if (error.stack?.includes('FlowEditor') || 
        error.stack?.includes('BaseNode')) {
      return 'high'; // Core functionality errors
    }

    return 'low'; // General component errors
  };

  private getErrorRecoveryMessage = (): string => {
    const severity = this.getErrorSeverity();
    const { level } = this.props;

    if (level === 'global') {
      return 'The application encountered an unexpected error. Your work has been automatically saved.';
    }

    switch (severity) {
      case 'high':
        return 'A critical component failed to load. Try refreshing the page to restore functionality.';
      case 'medium':
        return 'Some features may be temporarily unavailable. Try refreshing or check your internet connection.';
      default:
        return 'This section encountered an error. You can continue using other features while we resolve this.';
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const severity = this.getErrorSeverity();
      const isGlobal = this.props.level === 'global';
      const canRetry = this.retryCount < this.maxRetries;

      return (
        <div className={`${isGlobal ? 'min-h-screen' : 'min-h-[200px]'} flex items-center justify-center p-4 bg-gradient-to-br from-red-500/5 via-orange-500/5 to-transparent`}>
          <Card className="max-w-lg w-full bg-gradient-to-br from-zinc-300/10 via-red-400/10 to-transparent backdrop-blur-xl border-[2px] border-red-500/20 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-tr from-red-500/20 via-orange-500/20 to-transparent border border-red-500/30 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                    Something went wrong
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        severity === 'high' 
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : severity === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {severity === 'high' ? 'Critical' : severity === 'medium' ? 'Warning' : 'Minor'}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-gray-300 mt-1">
                    {this.getErrorRecoveryMessage()}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Error Details (collapsible) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 transition-colors">
                  Error Details (Click to expand)
                </summary>
                <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Error ID:</strong> {this.state.errorId}</div>
                    <div><strong>Message:</strong> {this.state.error?.message}</div>
                    <div><strong>Time:</strong> {new Date().toLocaleString()}</div>
                  </div>
                </div>
              </details>

              {/* Recovery Actions */}
              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleRetry}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again {this.retryCount > 0 && `(${this.maxRetries - this.retryCount} attempts left)`}
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={this.handleReload}
                    className="bg-gray-800/50 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reload Page
                  </Button>

                  {isGlobal && (
                    <Button
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="bg-gray-800/50 border-gray-600 text-gray-300 hover:text-white hover:border-gray-500"
                    >
                      <Home className="w-4 h-4 mr-1" />
                      Go Home
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.handleReportBug}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Bug className="w-3 h-3 mr-1" />
                  Report this issue
                </Button>
              </div>

              {/* Helpful Tips */}
              <div className="p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-400/20">
                <p className="text-xs text-blue-300 leading-relaxed">
                  <strong>💡 Tip:</strong> Your work is automatically saved. If you were editing an agent flow, 
                  your changes should be preserved after refreshing the page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for global error boundary
export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary 
      level="global"
      onError={(error, errorInfo) => {
        // Global error reporting logic
        console.error('Global error caught:', error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Convenience wrapper for component-level error boundary
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode; 
  componentName?: string;
  fallback?: ReactNode;
}> = ({ children, componentName, fallback }) => {
  return (
    <ErrorBoundary 
      level="component"
      onError={(error, errorInfo) => {
        console.error(`Error in ${componentName || 'component'}:`, error, errorInfo);
      }}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
};