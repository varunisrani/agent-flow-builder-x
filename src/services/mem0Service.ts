/**
 * Mem0 Memory Service
 * Handles memory operations for AI agents with persistent context and learning
 */

interface Mem0Config {
  apiKey: string;
  host?: string;
  userId?: string;
  organization?: string;
}

interface MemoryEntry {
  id: string;
  memory: string;
  userId?: string;
  hash?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  categories?: string[];
  score?: number;
}

interface MemorySearchResult {
  results: MemoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

interface MemoryAddRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  userId?: string;
  metadata?: Record<string, unknown>;
  categories?: string[];
}

interface MemorySearchRequest {
  query: string;
  userId?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

interface MemoryAnalytics {
  totalMemories: number;
  totalUsers: number;
  memoriesPerUser: { userId: string; count: number }[];
  recentMemories: MemoryEntry[];
  topCategories: { category: string; count: number }[];
  memoryGrowthOverTime: { date: string; count: number }[];
  userActivity: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export class Mem0Service {
  private config: Mem0Config;
  private baseUrl: string;

  constructor(config: Mem0Config) {
    this.config = config;
    this.baseUrl = config.host || 'https://api.mem0.ai';
  }

  private getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Add new memories from conversation
   */
  async addMemory(request: MemoryAddRequest): Promise<MemoryEntry[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories/`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          messages: request.messages,
          userId: request.userId || this.config.userId,
          metadata: request.metadata,
          categories: request.categories
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mem0 API Error Response:', errorText);
        throw new Error(`Failed to add memory: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return Array.isArray(data.results) ? data.results : [data];
    } catch (error) {
      console.error('Error adding memory:', error);
      return [];
    }
  }

  /**
   * Search memories by query
   */
  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult> {
    try {
      const params = new URLSearchParams({
        query: request.query,
        limit: (request.limit || 10).toString(),
        offset: (request.offset || 0).toString()
      });

      if (request.userId || this.config.userId) {
        params.append('userId', request.userId || this.config.userId!);
      }

      const response = await fetch(`${this.baseUrl}/v1/memories/search/?${params}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mem0 API Error Response:', errorText);
        throw new Error(`Failed to search memories: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return {
        results: data.results || [],
        total: data.total || 0,
        limit: request.limit || 10,
        offset: request.offset || 0
      };
    } catch (error) {
      console.error('Error searching memories:', error);
      return {
        results: [],
        total: 0,
        limit: request.limit || 10,
        offset: request.offset || 0
      };
    }
  }

  /**
   * Get all memories for a user
   */
  async getUserMemories(userId?: string, limit: number = 50): Promise<MemoryEntry[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString()
      });

      if (userId || this.config.userId) {
        params.append('userId', userId || this.config.userId!);
      }

      const response = await fetch(`${this.baseUrl}/v1/memories/?${params}`, {
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mem0 API Error Response:', errorText);
        throw new Error(`Failed to get memories: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Error fetching user memories:', error);
      return [];
    }
  }

  /**
   * Delete a specific memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/memories/${memoryId}/`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mem0 API Error Response:', errorText);
        throw new Error(`Failed to delete memory: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting memory:', error);
      return false;
    }
  }

  /**
   * Get memory analytics and insights
   */
  async getAnalytics(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<MemoryAnalytics> {
    try {
      // Fetch all memories for analytics (this would ideally be a dedicated endpoint)
      const memories = await this.getUserMemories(undefined, 500);

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

      // Filter memories by time range
      const filteredMemories = memories.filter(memory => 
        new Date(memory.createdAt) >= timeFilter
      );

      // Calculate analytics
      const totalMemories = filteredMemories.length;
      const uniqueUsers = new Set(filteredMemories.filter(m => m.userId).map(m => m.userId!));
      const totalUsers = uniqueUsers.size;

      // Memories per user
      const memoriesPerUser = Array.from(uniqueUsers).map(userId => ({
        userId,
        count: filteredMemories.filter(m => m.userId === userId).length
      }));

      // Recent memories (last 10)
      const recentMemories = filteredMemories
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

      // Top categories
      const categoryCount: { [category: string]: number } = {};
      filteredMemories.forEach(memory => {
        memory.categories?.forEach(category => {
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
      });
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Memory growth over time
      const memoryGrowthOverTime = this.groupMemoriesByDate(filteredMemories, timeRange);

      // User activity (simplified - would need more sophisticated tracking)
      const userActivity = {
        dailyActiveUsers: filteredMemories.filter(m => 
          new Date(m.createdAt) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
        ).length,
        weeklyActiveUsers: filteredMemories.filter(m => 
          new Date(m.createdAt) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        monthlyActiveUsers: totalUsers
      };

      return {
        totalMemories,
        totalUsers,
        memoriesPerUser,
        recentMemories,
        topCategories,
        memoryGrowthOverTime,
        userActivity
      };
    } catch (error) {
      console.error('Error fetching memory analytics:', error);
      // Return empty analytics on error
      return {
        totalMemories: 0,
        totalUsers: 0,
        memoriesPerUser: [],
        recentMemories: [],
        topCategories: [],
        memoryGrowthOverTime: [],
        userActivity: {
          dailyActiveUsers: 0,
          weeklyActiveUsers: 0,
          monthlyActiveUsers: 0
        }
      };
    }
  }

  /**
   * Group memories by date for time series visualization
   */
  private groupMemoriesByDate(memories: MemoryEntry[], timeRange: string): { date: string; count: number }[] {
    const grouped: { [key: string]: number } = {};
    
    memories.forEach(memory => {
      const date = new Date(memory.createdAt).toISOString().split('T')[0];
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
   * Test the connection to Mem0
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('Testing Mem0 connection...');
      console.log('Base URL:', this.baseUrl);
      console.log('API Key:', this.config.apiKey?.substring(0, 10) + '...');
      
      const response = await fetch(`${this.baseUrl}/v1/memories/?limit=1`, {
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
      console.error('Mem0 connection test failed:', error);
      return false;
    }
  }

  /**
   * Debug method to test authentication and service
   */
  async debugAuth(): Promise<void> {
    console.log('=== Mem0 Debug Info ===');
    console.log('Base URL:', this.baseUrl);
    console.log('API Key:', this.config.apiKey?.substring(0, 10) + '...');
    console.log('User ID:', this.config.userId);
    console.log('Organization:', this.config.organization);
    
    const headers = this.getAuthHeaders();
    console.log('Auth Headers:', headers);
    
    await this.testConnection();
  }
}

// Configuration helper
export const createMem0Service = (): Mem0Service | null => {
  // Get credentials from environment variables first, then fallback to localStorage
  const apiKey = import.meta.env.MEM0_API_KEY || localStorage.getItem('mem0_api_key');
  const host = import.meta.env.MEM0_HOST || localStorage.getItem('mem0_host') || 'https://api.mem0.ai';
  const userId = import.meta.env.MEM0_USER_ID || localStorage.getItem('mem0_user_id') || 'default_user';
  const organization = import.meta.env.MEM0_ORGANIZATION || localStorage.getItem('mem0_organization');

  if (!apiKey) {
    console.warn('Mem0 API key not found. Please set MEM0_API_KEY in .env file or configure in the UI.');
    return null;
  }

  return new Mem0Service({ apiKey, host, userId, organization });
};

// Memory helper functions
export const addConversationToMemory = async (
  service: Mem0Service,
  userMessage: string,
  assistantResponse: string,
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<MemoryEntry[]> => {
  return service.addMemory({
    messages: [
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantResponse }
    ],
    userId,
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'agent_flow_builder',
      ...metadata
    },
    categories: ['conversation', 'user_interaction']
  });
};

export const getRelevantMemories = async (
  service: Mem0Service,
  query: string,
  userId?: string,
  limit: number = 5
): Promise<MemoryEntry[]> => {
  const result = await service.searchMemories({
    query,
    userId,
    limit
  });
  return result.results;
};

export { type Mem0Service, type MemoryEntry, type MemorySearchResult, type MemoryAnalytics };