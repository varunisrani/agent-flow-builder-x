// API configuration
const isDevelopment = import.meta.env.MODE === 'development';

// Get the hostname to determine which domain we're running on
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isCogentxDomain = hostname.includes('cogentx.dev');

const API_CONFIG = {
  // Use the appropriate API URL based on environment and domain
  baseUrl: isDevelopment 
    ? 'http://localhost:3001' 
    : isCogentxDomain
      ? 'https://agent-flow-builder-api.cogentx.dev'
      : 'https://agent-flow-builder-1ob1bdog8-varuns-projects-859429fc.vercel.app',
  
  endpoints: {
    execute: '/api/execute',
    health: '/api/health'
  },

  // Full endpoint URLs (convenience)
  get executeUrl() {
    return `${this.baseUrl}${this.endpoints.execute}`;
  },
  get healthUrl() {
    return `${this.baseUrl}${this.endpoints.health}`;
  }
};

export default API_CONFIG; 