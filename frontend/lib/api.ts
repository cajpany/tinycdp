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
  
  // Create client with both auth function and explicit headers
  return backend.with({
    auth: async () => ({ authorization: `Bearer ${apiKey}` }),
    requestInit: {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
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
  console.log('Current API key:', getApiKey() ? 'Present' : 'Missing');
  
  let message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    message = error.message;
    
    // Handle authentication errors specifically
    if (message.includes('Valid API key required') || 
        message.includes('unauthenticated') ||
        message.includes('originalError') && message.includes('Valid API key required')) {
      const hasKey = getApiKey().length > 0;
      message = hasKey 
        ? 'Authentication failed. Please check your API key in Settings.'
        : 'Authentication required. Please set your API key in Settings.';
      console.log('Auth error - hasKey:', hasKey, 'keyLength:', getApiKey().length);
    }
  }
    
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}
