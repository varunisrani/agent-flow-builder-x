// API configuration
const isDevelopment = import.meta.env.MODE === 'development';

// Get the hostname to determine which domain we're running on
const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
const isCogentxDomain = hostname.includes('cogentx.dev');
const isVercelDomain = hostname.includes('vercel.app');

// When running on same domain in production, API is at /api/* path
const isUnifiedDeployment = isVercelDomain || isCogentxDomain;

const API_CONFIG = {
  // Use the appropriate API URL based on environment and domain
  baseUrl: isDevelopment 
    ? 'http://localhost:3001' 
    : isUnifiedDeployment
      ? '' // Empty string - API is on same domain at /api path
      : 'https://agent-flow-builder-api.onrender.com', // Primary: Render API
  
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