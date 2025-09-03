// TinyCDP Console Configuration

// API endpoint for the TinyCDP backend
// Update this to match your deployment
export const API_ENDPOINT = 'http://localhost:4000';

// Default API key for demo purposes
// In production, users should set their own API keys via Settings
export const DEFAULT_API_KEY = 'demo-admin-key';

// Console version information
export const CONSOLE_VERSION = '1.0.0';
export const CONSOLE_BUILD = 'Phase 7 - Web Console';

// Feature flags for the console itself
export const FEATURES = {
  // Enable expression testing in trait/segment/flag pages
  expressionTesting: true,
  
  // Enable decision testing in flags page
  decisionTesting: true,
  
  // Enable CSV export functionality
  csvExports: true,
  
  // Enable user search and detail views
  userManagement: true,
  
  // Enable system metrics dashboard
  systemMetrics: true,
};

// UI Configuration
export const UI_CONFIG = {
  // Number of items to show per page in lists
  defaultPageSize: 50,
  
  // Refresh interval for dashboard metrics (milliseconds)
  metricsRefreshInterval: 30000,
  
  // Maximum search results to show
  maxSearchResults: 100,
  
  // Default query options for React Query
  defaultQueryOptions: {
    staleTime: 30000,
    refetchOnWindowFocus: false,
  },
};
