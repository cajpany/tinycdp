import backend from '~backend/client';
import { toast } from '@/components/ui/use-toast';

// Get API key from localStorage or environment
function getApiKey(): string {
  const stored = localStorage.getItem('tinycdp-api-key');
  if (stored) return stored;
  
  // Return empty string if no key is stored
  return '';
}

// Create authenticated backend client
export function getBackendClient() {
  const apiKey = getApiKey();
  
  // If no API key is available, return the basic client
  if (!apiKey) {
    return backend;
  }
  
  return backend.with({
    auth: async () => ({ authorization: `Bearer ${apiKey}` })
  });
}

// API key management
export const apiKeyManager = {
  get: getApiKey,
  set: (key: string) => {
    localStorage.setItem('tinycdp-api-key', key);
  },
  clear: () => {
    localStorage.removeItem('tinycdp-api-key');
  },
  hasKey: (): boolean => {
    return getApiKey().length > 0;
  }
};

// Error handler for API calls
export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  let message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    message = error.message;
    
    // Handle authentication errors specifically
    if (message.includes('Valid API key required') || message.includes('unauthenticated')) {
      message = 'Authentication required. Please set your API key in Settings.';
    }
  }
    
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}
