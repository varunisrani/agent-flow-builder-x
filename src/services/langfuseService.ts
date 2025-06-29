/**
 * Langfuse Analytics Service
 * Handles fetching observability data from Langfuse API
 */

interface LangfuseConfig {
  publicKey: string;
  secretKey: string;
  host?: string;
}

interface LangfuseTrace {
  id: string;
  name: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  cost?: number;
  tokens?: number;
  model?: string;
  latency?: number;
  version?: string;
}

interface LangfuseObservation {
  id: string;
  traceId: string;
  type: 'generation' | 'span' | 'event';
  name: string;
  startTime: string;
  endTime?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  model?: string;
  modelParameters?: Record<string, unknown>;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  calculatedTotalCost?: number;
}

interface LangfuseAnalytics {
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
  recentTraces: LangfuseTrace[];
}

export class LangfuseService {
  private config: LangfuseConfig;
  private baseUrl: string;

  constructor(config: LangfuseConfig) {
    this.config = config;
    this.baseUrl = config.host || 'https://cloud.langfuse.com';
  }

  private getAuthHeaders(): HeadersInit {
    const credentials = btoa(`${this.config.publicKey}:${this.config.secretKey}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch traces from Langfuse API
   */
  async getTraces(limit: number = 50, page: number = 1): Promise<LangfuseTrace[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/public/traces?limit=${limit}&page=${page}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Langfuse API Error Response:', errorText);
        throw new Error(`Failed to fetch traces: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching traces:', error);
      return [];
    }
  }

  /**
   * Fetch observations (generations, spans, events) from Langfuse API
   */
  async getObservations(limit: number = 100): Promise<LangfuseObservation[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/public/observations?limit=${limit}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Langfuse API Error Response:', errorText);
        throw new Error(`Failed to fetch observations: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching observations:', error);
      return [];
    }
  }

  /**
   * Get analytics summary
   */
  async getAnalytics(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<LangfuseAnalytics> {
    try {
      // Fetch traces and observations
      const [traces, observations] = await Promise.all([
        this.getTraces(100),
        this.getObservations(100)  // Changed from 200 to 100 (API limit)
      ]);

      // Calculate time filter
      const now = new Date();
      const timeFilter = new Date();
      switch (timeRange) {
        case '24h':
          timeFilter.setDate(now.getDate() - 1);
          break;
        case '7d':
          timeFilter.setDate(now.getDate() - 7);
          break;
        case '30d':
          timeFilter.setDate(now.getDate() - 30);
          break;
      }

      // Filter data by time range
      const filteredTraces = traces.filter(trace => 
        new Date(trace.timestamp) >= timeFilter
      );

      const filteredObservations = observations.filter(obs => 
        new Date(obs.startTime) >= timeFilter
      );

      // Calculate analytics
      const totalTraces = filteredTraces.length;
      const totalCost = filteredObservations.reduce((sum, obs) => 
        sum + (obs.calculatedTotalCost || 0), 0
      );
      const totalTokens = filteredObservations.reduce((sum, obs) => 
        sum + (obs.usage?.totalTokens || 0), 0
      );

      // Calculate average latency
      const latencies = filteredObservations
        .filter(obs => obs.endTime && obs.startTime)
        .map(obs => new Date(obs.endTime!).getTime() - new Date(obs.startTime).getTime());
      const averageLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;

      // Group traces by date for time series
      const tracesOverTime = this.groupTracesByDate(filteredTraces, timeRange);

      // Calculate model usage
      const modelUsage = this.calculateModelUsage(filteredObservations);

      // Get top models
      const topModels = modelUsage
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(m => m.model);

      // Get recent traces (last 10)
      const recentTraces = filteredTraces
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

      return {
        totalTraces,
        totalCost,
        totalTokens,
        averageLatency,
        tracesOverTime,
        modelUsage,
        topModels,
        dailyStats: {
          traces: totalTraces,
          cost: totalCost,
          tokens: totalTokens,
        },
        recentTraces,
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Return empty analytics on error
      return {
        totalTraces: 0,
        totalCost: 0,
        totalTokens: 0,
        averageLatency: 0,
        tracesOverTime: [],
        modelUsage: [],
        topModels: [],
        dailyStats: {
          traces: 0,
          cost: 0,
          tokens: 0,
        },
        recentTraces: [],
      };
    }
  }

  /**
   * Group traces by date for time series visualization
   */
  private groupTracesByDate(traces: LangfuseTrace[], timeRange: string): { date: string; count: number }[] {
    const grouped: { [key: string]: number } = {};
    
    traces.forEach(trace => {
      const date = new Date(trace.timestamp).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    // Generate date range and fill missing dates with 0
    const dates: { date: string; count: number }[] = [];
    const now = new Date();
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push({
        date: dateStr,
        count: grouped[dateStr] || 0
      });
    }

    return dates;
  }

  /**
   * Calculate model usage statistics
   */
  private calculateModelUsage(observations: LangfuseObservation[]): { model: string; tokens: number; cost: number; count: number }[] {
    const usage: { [model: string]: { tokens: number; cost: number; count: number } } = {};

    observations.forEach(obs => {
      if (obs.model) {
        if (!usage[obs.model]) {
          usage[obs.model] = { tokens: 0, cost: 0, count: 0 };
        }
        usage[obs.model].tokens += obs.usage?.totalTokens || 0;
        usage[obs.model].cost += obs.calculatedTotalCost || 0;
        usage[obs.model].count += 1;
      }
    });

    return Object.entries(usage).map(([model, stats]) => ({
      model,
      ...stats
    }));
  }

  /**
   * Test the connection to Langfuse
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Langfuse connection...');
      console.log('Base URL:', this.baseUrl);
      console.log('Public Key configured:', !!this.config.publicKey);
      
      const response = await fetch(`${this.baseUrl}/api/public/traces?limit=1`, {
        headers: this.getAuthHeaders(),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Connection test failed:', errorText);
      }
      
      return response.ok;
    } catch (error) {
      console.error('Langfuse connection test failed:', error);
      return false;
    }
  }

  /**
   * Debug method to test authentication
   */
  async debugAuth(): Promise<void> {
    console.log('=== Langfuse Debug Info ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Public Key configured:', !!this.config.publicKey);
    console.log('Secret Key configured:', !!this.config.secretKey);
    
    const headers = this.getAuthHeaders();
    // Only log header keys, not values
    console.log('Auth Headers configured:', Object.keys(headers));
    
    // Test basic auth encoding
    const credentials = btoa(`${this.config.publicKey}:${this.config.secretKey}`);
    console.log('Base64 credentials configured:', !!credentials);
    
    await this.testConnection();
  }
}

// Configuration helper
export const createLangfuseService = (): LangfuseService | null => {
  // Get credentials from environment variables first, then fallback to localStorage
  const publicKey = import.meta.env.LANGFUSE_PUBLIC_KEY || localStorage.getItem('langfuse_public_key');
  const secretKey = import.meta.env.LANGFUSE_SECRET_KEY || localStorage.getItem('langfuse_secret_key');
  const host = import.meta.env.LANGFUSE_HOST || localStorage.getItem('langfuse_host') || 'https://cloud.langfuse.com';

  if (!publicKey || !secretKey) {
    console.warn('Langfuse credentials not found. Please set VITE_LANGFUSE_PUBLIC_KEY and VITE_LANGFUSE_SECRET_KEY in .env file or configure in the UI.');
    return null;
  }

  return new LangfuseService({ publicKey, secretKey, host });
}; 