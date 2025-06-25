import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock, 
  BarChart3,
  PieChart,
  Activity,
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Calendar,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Badge } from '@/components/ui/badge.js';
import { useToast } from '@/hooks/use-toast.js';
import { createLangfuseService, type LangfuseService } from '@/services/langfuseService.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';

interface AnalyticsData {
  totalTraces: number;
  totalCost: number;
  totalTokens: number;
  averageLatency: number;
  tracesOverTime: { date: string; count: number }[];
  modelUsage: { model: string; tokens: number; cost: number; count: number }[];
  topModels: string[];
  dailyStats: {
    traces: number;
    cost: number;
    tokens: number;
  };
  recentTraces: Array<{
    id: string;
    name: string;
    timestamp: string;
    model?: string;
    cost?: number;
    tokens?: number;
  }>;
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [showConfig, setShowConfig] = useState(false);
  const [langfuseConfig, setLangfuseConfig] = useState({
    publicKey: localStorage.getItem('langfuse_public_key') || '',
    secretKey: localStorage.getItem('langfuse_secret_key') || '',
    host: localStorage.getItem('langfuse_host') || 'https://cloud.langfuse.com'
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    if (isConfigured) {
      fetchAnalytics();
    }
  }, [isConfigured, timeRange]);

  const checkConfiguration = () => {
    const publicKey = localStorage.getItem('langfuse_public_key');
    const secretKey = localStorage.getItem('langfuse_secret_key');
    setIsConfigured(!!(publicKey && secretKey));
    setIsLoading(false);
  };

  const saveConfiguration = () => {
    localStorage.setItem('langfuse_public_key', langfuseConfig.publicKey);
    localStorage.setItem('langfuse_secret_key', langfuseConfig.secretKey);
    localStorage.setItem('langfuse_host', langfuseConfig.host);
    setIsConfigured(true);
    setShowConfig(false);
    toast({
      title: "Configuration saved",
      description: "Langfuse credentials have been saved successfully",
    });
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const service = createLangfuseService();
      if (!service) {
        throw new Error('Langfuse service not configured');
      }

      // Debug authentication if needed
      if (process.env.NODE_ENV === 'development') {
        await service.debugAuth();
      }

      const data = await service.getAnalytics(timeRange);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Failed to fetch analytics",
        description: error instanceof Error ? error.message : "Please check your Langfuse configuration and try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToProjects = () => {
    navigate('/projects');
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatLatency = (latency: number) => {
    return `${(latency / 1000).toFixed(2)}s`;
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground relative overflow-hidden">
        <div className="absolute top-0 z-[0] h-full w-full bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent dark:from-zinc-300/2 dark:via-purple-400/5" />
        
        <div className="relative z-10 container mx-auto px-6 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToProjects}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Analytics Setup</h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <CardContent className="space-y-6">
                <div className="p-6 rounded-full bg-purple-100 dark:bg-purple-900/30 w-fit mx-auto">
                  <BarChart3 className="h-12 w-12 text-purple-600 dark:text-purple-400" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold mb-3">Configure Langfuse Analytics</h2>
                  <p className="text-muted-foreground mb-6">
                    Connect your Langfuse account to view observability data for your AI agents
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="publicKey">Public Key</Label>
                    <Input
                      id="publicKey"
                      placeholder="pk-lf-..."
                      value={langfuseConfig.publicKey}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, publicKey: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      placeholder="sk-lf-..."
                      value={langfuseConfig.secretKey}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="host">Host (Optional)</Label>
                    <Input
                      id="host"
                      placeholder="https://cloud.langfuse.com"
                      value={langfuseConfig.host}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                </div>

                <Button 
                  onClick={saveConfiguration}
                  disabled={!langfuseConfig.publicKey || !langfuseConfig.secretKey}
                  className="w-full"
                >
                  Save Configuration
                </Button>

                <div className="text-sm text-muted-foreground">
                  <p>Get your credentials from your Langfuse project settings:</p>
                  <a 
                    href="https://cloud.langfuse.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    cloud.langfuse.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90 text-foreground relative overflow-hidden">
      <div className="absolute top-0 z-[0] h-full w-full bg-gradient-to-br from-zinc-300/5 via-purple-400/10 to-transparent dark:from-zinc-300/2 dark:via-purple-400/5" />
      
      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToProjects}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-muted-foreground">Langfuse observability data for your AI agents</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(value: '24h' | '7d' | '30d') => setTimeRange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon" onClick={fetchAnalytics} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            <Dialog open={showConfig} onOpenChange={setShowConfig}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Langfuse Configuration</DialogTitle>
                  <DialogDescription>
                    Update your Langfuse credentials
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="publicKey">Public Key</Label>
                    <Input
                      id="publicKey"
                      placeholder="pk-lf-..."
                      value={langfuseConfig.publicKey}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, publicKey: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="secretKey">Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      placeholder="sk-lf-..."
                      value={langfuseConfig.secretKey}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, secretKey: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="host">Host</Label>
                    <Input
                      id="host"
                      placeholder="https://cloud.langfuse.com"
                      value={langfuseConfig.host}
                      onChange={(e) => setLangfuseConfig(prev => ({ ...prev, host: e.target.value }))}
                    />
                  </div>
                  
                  <Button onClick={saveConfiguration} className="w-full">
                    Save Configuration
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
        ) : analyticsData ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.totalTraces}</div>
                    <p className="text-xs text-muted-foreground">
                      Agent interactions tracked
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(analyticsData.totalCost)}</div>
                    <p className="text-xs text-muted-foreground">
                      API costs
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatTokens(analyticsData.totalTokens)}</div>
                    <p className="text-xs text-muted-foreground">
                      Tokens consumed
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatLatency(analyticsData.averageLatency)}</div>
                    <p className="text-xs text-muted-foreground">
                      Response time
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Traces Over Time */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Traces Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.tracesOverTime.map((item, index) => (
                        <div key={item.date} className="flex items-center gap-4">
                          <div className="text-sm text-muted-foreground w-24">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex-1 relative">
                            <div 
                              className="h-2 bg-purple-500 rounded"
                              style={{ width: `${(item.count / Math.max(...analyticsData.tracesOverTime.map(d => d.count), 1)) * 100}%` }}
                            />
                          </div>
                          <div className="text-sm font-medium w-8">{item.count}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Model Usage */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Model Usage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData.modelUsage.slice(0, 5).map((model, index) => (
                        <div key={model.model} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{model.model}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {formatTokens(model.tokens)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatCost(model.cost)}
                              </span>
                            </div>
                          </div>
                          <div className="relative">
                            <div 
                              className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded"
                              style={{ 
                                width: `${(model.count / Math.max(...analyticsData.modelUsage.map(m => m.count), 1)) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Recent Traces */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Recent Traces
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.recentTraces.length > 0 ? (
                      analyticsData.recentTraces.map((trace) => (
                        <div key={trace.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">{trace.name || trace.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(trace.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {trace.model && (
                              <Badge variant="outline">{trace.model}</Badge>
                            )}
                            {trace.tokens && (
                              <span className="text-sm text-muted-foreground">
                                {formatTokens(trace.tokens)} tokens
                              </span>
                            )}
                            {trace.cost && (
                              <span className="text-sm font-medium">
                                {formatCost(trace.cost)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent traces found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        ) : (
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground mb-6">
              Unable to fetch analytics data. Please check your configuration.
            </p>
            <Button onClick={() => setShowConfig(true)}>
              Check Configuration
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics; 