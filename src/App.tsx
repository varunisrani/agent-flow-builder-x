
import React from 'react';
import { Loader2 } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GlobalErrorBoundary } from "@/components/ErrorBoundary";
import { 
  LazyIndex, 
  LazyLandingPage, 
  LazyProjects, 
  LazyAnalytics, 
  LazyNotFound, 
  LazyAuth,
  preloadCriticalComponents,
  useIntelligentPreloading
} from "@/components/LazyComponents";
import { useAuth } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

// Enhanced protected route component with preloading
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  
  // Use intelligent preloading
  useIntelligentPreloading();
  
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0b1e] text-white">
        <div className="p-4 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent border border-purple-500/30 rounded-xl mb-4">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
        <p className="text-gray-300">Authenticating...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

// App component with preloading initialization  
const AppContent = () => {
  React.useEffect(() => {
    // Initialize critical component preloading
    preloadCriticalComponents();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LazyLandingPage />} />
      <Route path="/auth" element={<LazyAuth />} />
      <Route 
        path="/projects" 
        element={
          <ProtectedRoute>
            <LazyProjects />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/editor" 
        element={
          <ProtectedRoute>
            <LazyIndex />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/analytics" 
        element={
          <ProtectedRoute>
            <LazyAnalytics />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<LazyNotFound />} />
    </Routes>
  );
};

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <AppContent />
            </AnimatePresence>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
