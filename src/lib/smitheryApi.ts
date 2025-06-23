// Smithery API integration for profile management
const SMITHERY_API_BASE = 'https://api.smithery.ai/v1';

export interface SmitheryProfile {
  id: string;
  name: string;
  description: string;
  schema_id: string;
  defaults: {
    model?: string;
    system_prompt?: string;
    temperature?: number;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CreateProfileRequest {
  name: string;
  description: string;
  schema_id: string;
  defaults: {
    model?: string;
    system_prompt?: string;
    temperature?: number;
    [key: string]: any;
  };
}

class SmitheryApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'SmitheryApiError';
  }
}

// Helper function to make API calls to Smithery
async function smitheryFetch(endpoint: string, options: RequestInit, apiKey: string) {
  const url = `${SMITHERY_API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new SmitheryApiError(
      `Smithery API error (${response.status}): ${errorText}`,
      response.status
    );
  }

  return response.json();
}

// Test API key validity
export async function testSmitheryApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { valid: false, error: 'API key is required' };
    }

    // Test by listing profiles (this is a safe read operation)
    await smitheryFetch('/profiles', { method: 'GET' }, apiKey);
    return { valid: true };
  } catch (error) {
    if (error instanceof SmitheryApiError) {
      if (error.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      if (error.status === 403) {
        return { valid: false, error: 'API key does not have required permissions' };
      }
    }
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Unknown error testing API key' 
    };
  }
}

// Create a new profile
export async function createProfile(apiKey: string, profile: CreateProfileRequest): Promise<SmitheryProfile> {
  try {
    return await smitheryFetch('/profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    }, apiKey);
  } catch (error) {
    throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// List all profiles for the user
export async function listProfiles(apiKey: string): Promise<SmitheryProfile[]> {
  try {
    const response = await smitheryFetch('/profiles', { method: 'GET' }, apiKey);
    return Array.isArray(response) ? response : response.profiles || [];
  } catch (error) {
    throw new Error(`Failed to list profiles: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get a specific profile
export async function getProfile(apiKey: string, profileId: string): Promise<SmitheryProfile> {
  try {
    return await smitheryFetch(`/profiles/${profileId}`, { method: 'GET' }, apiKey);
  } catch (error) {
    throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update a profile
export async function updateProfile(apiKey: string, profileId: string, updates: Partial<CreateProfileRequest>): Promise<SmitheryProfile> {
  try {
    return await smitheryFetch(`/profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }, apiKey);
  } catch (error) {
    throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Delete a profile
export async function deleteProfile(apiKey: string, profileId: string): Promise<void> {
  try {
    await smitheryFetch(`/profiles/${profileId}`, { method: 'DELETE' }, apiKey);
  } catch (error) {
    throw new Error(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate a profile ID for MCP command args
export function generateProfileId(): string {
  // Generate a random profile ID in the format: adjective-noun-randomString
  const adjectives = ['spatial', 'neural', 'dynamic', 'quantum', 'digital', 'virtual', 'smart', 'clever', 'rapid', 'swift'];
  const nouns = ['damselfly', 'falcon', 'eagle', 'phoenix', 'tiger', 'wolf', 'dolphin', 'shark', 'hawk', 'lynx'];
  const randomString = Math.random().toString(36).substring(2, 8);
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}-${noun}-${randomString}`;
}

// Default profile schemas
export const DEFAULT_SCHEMAS = [
  { id: 'openai.chat', name: 'OpenAI Chat', description: 'Standard chat completion schema' },
  { id: 'anthropic.claude', name: 'Anthropic Claude', description: 'Claude chat schema' },
  { id: 'google.gemini', name: 'Google Gemini', description: 'Gemini chat schema' }
];

// Default models for each schema
export const DEFAULT_MODELS = {
  'openai.chat': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  'anthropic.claude': ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  'google.gemini': ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']
};