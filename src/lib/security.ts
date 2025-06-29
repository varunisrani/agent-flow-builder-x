/**
 * Security utilities for API endpoints
 */

export interface SecurityConfig {
  requireApiKey?: boolean;
  rateLimitRequests?: number;
  rateLimitWindow?: number; // in minutes
  maxBodySize?: string;
  allowedOrigins?: string[];
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limiting (for production, use Redis or similar)
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Rate limiting middleware
 */
export function checkRateLimit(
  clientId: string, 
  maxRequests: number = 100, 
  windowMinutes: number = 15
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetTime) {
    // Create new window
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs
    };
    rateLimitMap.set(clientId, newEntry);
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: newEntry.resetTime
    };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime
    };
  }

  entry.count++;
  rateLimitMap.set(clientId, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime
  };
}

/**
 * Validate API key
 */
export function validateApiKey(providedKey: string | undefined): boolean {
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    console.warn('API_SECRET_KEY not configured - API key validation disabled');
    return true; // Allow if not configured for backward compatibility
  }
  
  return providedKey === validApiKey;
}

/**
 * Sanitize and validate input
 */
export function sanitizeInput(input: any, maxLength: number = 1000000): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new Error(`Input too large (max ${maxLength} characters)`);
  }
  
  // Basic sanitization - remove potentially dangerous patterns
  const sanitized = input
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags
    
  return sanitized;
}

/**
 * Validate origin against allowlist
 */
export function validateOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  // Exact match or subdomain match
  return allowedOrigins.some(allowed => {
    if (allowed === origin) return true;
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain);
    }
    return false;
  });
}

/**
 * Get client identifier for rate limiting
 */
export function getClientId(req: any): string {
  // Use API key if provided, otherwise fall back to IP
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (apiKey) {
    return `api:${apiKey.slice(0, 8)}`;
  }
  
  // Get IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0] : req.connection?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}