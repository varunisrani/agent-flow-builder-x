export const config = {
  e2b: {
    apiKey: import.meta.env.VITE_E2B_API_KEY || 'e2b_940e40f52cd526f66d354ed59fc6517dfc385825',
  }
} as const;

// Type-safe environment configuration
export type Config = typeof config; 