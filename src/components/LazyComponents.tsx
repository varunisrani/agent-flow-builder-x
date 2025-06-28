import React, { Suspense } from 'react';
import { Loader2, Bot, BarChart3, Settings, FileText } from 'lucide-react';

// Loading spinner component
const LoadingSpinner: React.FC<{ message?: string; icon?: React.ReactNode }> = ({ 
  message = "Loading...", 
  icon = <Loader2 className="w-6 h-6 animate-spin" /> 
}) => (
  <div className="h-screen flex flex-col items-center justify-center bg-[#0a0b1e] text-white">
    <div className="flex flex-col items-center space-y-4">
      <div className="p-4 bg-gradient-to-tr from-purple-500/20 via-pink-500/20 to-transparent border border-purple-500/30 rounded-xl">
        {icon}
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
        <p className="text-gray-400 text-sm">Please wait while we load the component...</p>
      </div>
    </div>
  </div>
);

// Page-specific loading screens
export const EditorLoadingScreen = () => (
  <LoadingSpinner 
    message="Loading Flow Editor" 
    icon={<Bot className="w-6 h-6 text-purple-400" />} 
  />
);

export const AnalyticsLoadingScreen = () => (
  <LoadingSpinner 
    message="Loading Analytics Dashboard" 
    icon={<BarChart3 className="w-6 h-6 text-blue-400" />} 
  />
);

export const ProjectsLoadingScreen = () => (
  <LoadingSpinner 
    message="Loading Projects" 
    icon={<FileText className="w-6 h-6 text-green-400" />} 
  />
);

export const AuthLoadingScreen = () => (
  <LoadingSpinner 
    message="Loading Authentication" 
    icon={<Settings className="w-6 h-6 text-orange-400" />} 
  />
);

// Lazy-loaded components with proper error boundaries
const withLazyLoading = <T extends Record<string, any>>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>,
  LoadingComponent: React.ComponentType = LoadingSpinner
) => {
  const LazyComponent = React.lazy(importFunc);
  
  return React.forwardRef<any, T>((props, ref) => (
    <Suspense fallback={<LoadingComponent />}>
      <LazyComponent {...props} ref={ref} />
    </Suspense>
  ));
};

// Lazy-loaded pages
export const LazyIndex = withLazyLoading(
  () => import('../pages/Index'),
  EditorLoadingScreen
);

export const LazyAnalytics = withLazyLoading(
  () => import('../pages/Analytics'),
  AnalyticsLoadingScreen
);

export const LazyProjects = withLazyLoading(
  () => import('../pages/Projects'),
  ProjectsLoadingScreen
);

export const LazyAuth = withLazyLoading(
  () => import('../pages/Auth'),
  AuthLoadingScreen
);

export const LazyLandingPage = withLazyLoading(
  () => import('../pages/LandingPage'),
  () => <LoadingSpinner message="Loading Landing Page" />
);

export const LazyNotFound = withLazyLoading(
  () => import('../pages/NotFound'),
  () => <LoadingSpinner message="Loading Page" />
);

// Lazy-loaded heavy components
export const LazyCodeGenerationModal = withLazyLoading(
  () => import('../components/CodeGenerationModal'),
  () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0a0b1e] rounded-lg p-8 border border-purple-500/30">
        <LoadingSpinner message="Loading Code Generator" />
      </div>
    </div>
  )
);

export const LazyMonacoEditor = withLazyLoading(
  () => import('@monaco-editor/react').then(module => ({ default: module.default })),
  () => (
    <div className="h-96 flex items-center justify-center bg-gray-900 rounded border">
      <LoadingSpinner message="Loading Code Editor" />
    </div>
  )
);

// Heavy chart components (if any analytics charts exist)
export const LazyChartComponents = {
  LineChart: withLazyLoading(
    () => import('recharts').then(module => ({ default: module.LineChart })),
    () => <div className="h-64 bg-gray-800 rounded animate-pulse" />
  ),
  BarChart: withLazyLoading(
    () => import('recharts').then(module => ({ default: module.BarChart })),
    () => <div className="h-64 bg-gray-800 rounded animate-pulse" />
  ),
  PieChart: withLazyLoading(
    () => import('recharts').then(module => ({ default: module.PieChart })),
    () => <div className="h-64 bg-gray-800 rounded animate-pulse" />
  )
};

// Preload functions for better UX
export const preloadComponents = {
  editor: () => import('../pages/Index'),
  analytics: () => import('../pages/Analytics'),
  projects: () => import('../pages/Projects'),
  auth: () => import('../pages/Auth'),
  codeGen: () => import('../components/CodeGenerationModal'),
  monaco: () => import('@monaco-editor/react')
};

// Utility to preload critical components
export const preloadCriticalComponents = () => {
  // Preload editor since it's the main feature
  preloadComponents.editor();
  
  // Preload projects since users often navigate there
  setTimeout(() => {
    preloadComponents.projects();
  }, 2000);
  
  // Preload analytics after a delay
  setTimeout(() => {
    preloadComponents.analytics();
  }, 5000);
};

// Hook for intelligent preloading based on user behavior
export const useIntelligentPreloading = () => {
  React.useEffect(() => {
    // Preload on mouse enter for navigation elements
    const handleMouseEnter = (componentType: keyof typeof preloadComponents) => {
      return () => {
        preloadComponents[componentType]();
      };
    };

    // Add event listeners to navigation elements
    const editorLinks = document.querySelectorAll('[data-preload="editor"]');
    const analyticsLinks = document.querySelectorAll('[data-preload="analytics"]');
    const projectsLinks = document.querySelectorAll('[data-preload="projects"]');

    editorLinks.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter('editor'));
    });

    analyticsLinks.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter('analytics'));
    });

    projectsLinks.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter('projects'));
    });

    // Cleanup
    return () => {
      editorLinks.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter('editor'));
      });
      analyticsLinks.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter('analytics'));
      });
      projectsLinks.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter('projects'));
      });
    };
  }, []);
};