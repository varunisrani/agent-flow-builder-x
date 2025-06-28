import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  Eye,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createLangfuseService } from '@/services/langfuseService';

interface AnalyticsWidget {
  id: string;
  title: string;
  icon: React.ReactNode;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'info';
}

interface InlineAnalyticsProps {
  position?: 'top-right' | 'bottom-right' | 'bottom-left' | 'top-left';
  compact?: boolean;
}

export function InlineAnalytics({ position = 'top-right', compact = false }: InlineAnalyticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(compact);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [widgets, setWidgets] = useState<AnalyticsWidget[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check if analytics is configured
  useEffect(() => {
    const publicKey = localStorage.getItem('langfuse_public_key');
    const secretKey = localStorage.getItem('langfuse_secret_key');
    setIsConfigured(!!(publicKey && secretKey));
  }, []);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!isConfigured) return;
    
    setIsLoading(true);
    try {
      const service = createLangfuseService();
      if (!service) {
        throw new Error('Analytics service not configured');
      }

      const data = await service.getAnalytics('24h');
      
      const newWidgets: AnalyticsWidget[] = [
        {
          id: 'traces',
          title: 'Traces Today',
          icon: <Activity className="w-4 h-4" />,
          value: data.totalTraces,
          change: data.dailyStats.traces > 0 ? `+${data.dailyStats.traces}` : '0',
          trend: data.dailyStats.traces > 0 ? 'up' : 'neutral',
          status: 'info'
        },
        {
          id: 'cost',
          title: 'Cost Today',
          icon: <DollarSign className="w-4 h-4" />,
          value: `$${data.totalCost.toFixed(4)}`,
          change: data.dailyStats.cost > 0 ? `+$${data.dailyStats.cost.toFixed(4)}` : '$0',
          trend: data.dailyStats.cost > 0 ? 'up' : 'neutral',
          status: data.totalCost > 1 ? 'warning' : 'success'
        },
        {
          id: 'tokens',
          title: 'Tokens',
          icon: <Zap className="w-4 h-4" />,
          value: data.totalTokens >= 1000 ? `${(data.totalTokens / 1000).toFixed(1)}K` : data.totalTokens,
          change: data.dailyStats.tokens > 0 ? `+${data.dailyStats.tokens >= 1000 ? `${(data.dailyStats.tokens / 1000).toFixed(1)}K` : data.dailyStats.tokens}` : '0',
          trend: data.dailyStats.tokens > 0 ? 'up' : 'neutral',
          status: 'info'
        },
        {
          id: 'latency',
          title: 'Avg Latency',
          icon: <Clock className="w-4 h-4" />,
          value: `${(data.averageLatency / 1000).toFixed(2)}s`,
          trend: data.averageLatency < 2000 ? 'up' : data.averageLatency > 5000 ? 'down' : 'neutral',
          status: data.averageLatency < 2000 ? 'success' : data.averageLatency > 5000 ? 'error' : 'warning'
        }
      ];
      
      setWidgets(newWidgets);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set error widgets
      setWidgets([
        {
          id: 'error',
          title: 'Analytics Error',
          icon: <AlertCircle className="w-4 h-4" />,
          value: 'Config needed',
          status: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh analytics every 30 seconds when expanded
  useEffect(() => {
    if (isExpanded && isConfigured) {
      fetchAnalytics();
      const interval = setInterval(fetchAnalytics, 30000);
      return () => clearInterval(interval);
    }
  }, [isExpanded, isConfigured]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'top-right':
      default:
        return 'top-20 right-4';
    }
  };

  const getTrendColor = (trend?: string, status?: string) => {
    if (status === 'error') return 'text-red-400';
    if (status === 'warning') return 'text-yellow-400';
    if (status === 'success') return 'text-green-400';
    
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'border-green-500/30 bg-green-500/10';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/10';
      case 'error': return 'border-red-500/30 bg-red-500/10';
      default: return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  if (!isConfigured && !isMinimized) {
    return (
      <div className={`fixed ${getPositionClasses()} z-40`}>
        <Card className="w-64 bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl border border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Analytics</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="ml-auto h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300 mb-2">Analytics not configured</p>
              <Button
                size="sm"
                onClick={() => window.location.href = '/analytics'}
                className="bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 text-xs h-7"
              >
                Configure Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`fixed ${getPositionClasses()} z-40`}>
      <AnimatePresence>
        {isMinimized ? (
          // Minimized floating button
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <Button
              onClick={() => setIsMinimized(false)}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 hover:border-purple-400/50 backdrop-blur-xl shadow-lg group"
            >
              <BarChart3 className="w-5 h-5 text-purple-400 group-hover:text-purple-300" />
            </Button>
          </motion.div>
        ) : (
          // Expanded analytics panel
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-80"
          >
            <Card className="bg-gradient-to-br from-zinc-300/10 via-purple-400/10 to-transparent backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-sm font-semibold text-white">
                      Live Analytics
                    </CardTitle>
                    {isLoading && (
                      <RefreshCw className="w-3 h-3 text-purple-400 animate-spin" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(true)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {lastUpdated && (
                  <p className="text-xs text-gray-400">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Quick metrics - always visible */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {widgets.slice(0, 4).map((widget) => (
                    <div
                      key={widget.id}
                      className={`p-3 rounded-lg border ${getStatusColor(widget.status)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {widget.icon}
                        <span className={`text-xs ${getTrendColor(widget.trend, widget.status)}`}>
                          {widget.change}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {widget.value}
                      </div>
                      <div className="text-xs text-gray-400">
                        {widget.title}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3"
                    >
                      {/* Status indicators */}
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-gray-300">System healthy</span>
                        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs ml-auto">
                          Active
                        </Badge>
                      </div>

                      {/* Quick actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={fetchAnalytics}
                          disabled={isLoading}
                          className="flex-1 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-400/30 text-purple-300 hover:text-purple-200 text-xs h-8"
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = '/analytics'}
                          className="flex-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-400/30 text-blue-300 hover:text-blue-200 text-xs h-8"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>

                      {/* Performance insights */}
                      <div className="p-2 bg-gradient-to-r from-gray-500/10 to-transparent rounded border border-gray-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3 h-3 text-blue-400" />
                          <span className="text-xs font-medium text-gray-300">Performance</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {widgets.find(w => w.id === 'latency')?.status === 'success' 
                            ? 'Response times are optimal'
                            : widgets.find(w => w.id === 'latency')?.status === 'error'
                            ? 'High latency detected'
                            : 'Response times are acceptable'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}