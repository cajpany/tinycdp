import backend from '~backend/client';
import { toast } from '@/components/ui/use-toast';

// Get API key from localStorage or environment
function getApiKey(): string {
  const stored = localStorage.getItem('tinycdp-api-key');
  if (stored) return stored;
  
  // Fallback to environment or default for demo
  return 'demo-admin-key';
}

// Create authenticated backend client
export function getBackendClient() {
  const apiKey = getApiKey();
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
  }
};

// Error handler for API calls
export function handleApiError(error: unknown) {
  console.error('API Error:', error);
  
  const message = error instanceof Error 
    ? error.message 
    : 'An unexpected error occurred';
    
  toast({
    title: 'Error',
    description: message,
    variant: 'destructive',
  });
}
