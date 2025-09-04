/**
 * TinyCDP SDK Usage Examples
 * ========================
 * 
 * This file demonstrates common patterns and best practices for using
 * the TinyCDP TypeScript SDK in real applications.
 * 
 * Examples cover:
 * - SDK initialization
 * - User identification patterns  
 * - Event tracking patterns
 * - Feature flag decision patterns
 * - Error handling
 * - Performance optimizations
 * - Real-world integration scenarios
 */

import type { 
  TinyCDPClient, 
  IdentifyParams, 
  TrackParams, 
  DecideParams,
  DecisionResponse 
} from '../frontend/src/sdk/types'; // Adjust import path as needed

// =============================================================================
// 1. SDK INITIALIZATION PATTERNS
// =============================================================================

/**
 * Basic initialization for most applications
 */
function initBasicClient(): TinyCDPClient {
  // In a real app, these would come from environment variables
  const config = {
    endpoint: process.env.TINYCDP_ENDPOINT || 'https://staging-tinycdp-s3b2.encr.app',
    writeKey: process.env.TINYCDP_WRITE_KEY || 'your-write-key',
    readKey: process.env.TINYCDP_READ_KEY || 'your-read-key',
    debug: process.env.NODE_ENV === 'development'
  };

  // Import and initialize the actual SDK
  const { initTinyCDP } = require('../frontend/src/sdk'); // Adjust path
  return initTinyCDP(config);
}

/**
 * Advanced initialization with custom options
 */
function initAdvancedClient(): TinyCDPClient {
  const { initTinyCDP } = require('../frontend/src/sdk');
  
  return initTinyCDP({
    endpoint: 'https://your-domain.com',
    writeKey: process.env.TINYCDP_WRITE_KEY!,
    readKey: process.env.TINYCDP_READ_KEY!,
    debug: true,
    
    // Advanced options (if supported by your SDK)
    batchSize: 50,
    flushInterval: 10000, // 10 seconds
    timeout: 5000, // 5 second timeout
    retryCount: 3
  });
}

// =============================================================================
// 2. USER IDENTIFICATION PATTERNS
// =============================================================================

class UserManager {
  constructor(private tinycdp: TinyCDPClient) {}

  /**
   * Identify user on signup/login
   */
  async identifyNewUser(userData: {
    userId: string;
    email: string;
    plan?: string;
    source?: string;
  }) {
    const identifyParams: IdentifyParams = {
      userId: userData.userId,
      traits: {
        email: userData.email,
        plan: userData.plan || 'free',
        signup_date: new Date().toISOString(),
        signup_source: userData.source || 'direct',
        onboarding_step: 'welcome'
      }
    };

    try {
      await this.tinycdp.identify(identifyParams);
      console.log(`✅ User ${userData.userId} identified successfully`);
    } catch (error) {
      console.error('❌ Failed to identify user:', error);
      // Don't throw - analytics shouldn't break app flow
    }
  }

  /**
   * Update user profile when traits change
   */
  async updateUserProfile(userId: string, updates: Record<string, any>) {
    const identifyParams: IdentifyParams = {
      userId: userId,
      traits: {
        ...updates,
        updated_at: new Date().toISOString()
      }
    };

    try {
      await this.tinycdp.identify(identifyParams);
      console.log(`✅ Profile updated for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
    }
  }

  /**
   * Handle plan upgrades/downgrades
   */
  async handlePlanChange(userId: string, newPlan: string, previousPlan: string) {
    // Update the user's plan trait
    await this.updateUserProfile(userId, {
      plan: newPlan,
      previous_plan: previousPlan,
      plan_changed_at: new Date().toISOString()
    });

    // Track the plan change event
    this.tinycdp.track({
      userId: userId,
      event: 'plan_changed',
      properties: {
        new_plan: newPlan,
        previous_plan: previousPlan,
        change_type: this.getPlanChangeType(previousPlan, newPlan)
      }
    });
  }

  private getPlanChangeType(oldPlan: string, newPlan: string): string {
    const planLevels = { 'free': 0, 'basic': 1, 'premium': 2, 'enterprise': 3 };
    const oldLevel = planLevels[oldPlan as keyof typeof planLevels] || 0;
    const newLevel = planLevels[newPlan as keyof typeof planLevels] || 0;
    
    if (newLevel > oldLevel) return 'upgrade';
    if (newLevel < oldLevel) return 'downgrade';
    return 'change';
  }
}

// =============================================================================
// 3. EVENT TRACKING PATTERNS
// =============================================================================

class EventTracker {
  constructor(private tinycdp: TinyCDPClient) {}

  /**
   * Track page views (SPA/React apps)
   */
  trackPageView(userId: string, route: string, metadata?: Record<string, any>) {
    const trackParams: TrackParams = {
      userId: userId,
      event: 'page_viewed',
      properties: {
        path: route,
        url: window.location.href,
        referrer: document.referrer,
        title: document.title,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };

    this.tinycdp.track(trackParams);
  }

  /**
   * Track user interactions
   */
  trackButtonClick(userId: string, buttonId: string, context?: string) {
    this.tinycdp.track({
      userId: userId,
      event: 'button_clicked',
      properties: {
        button_id: buttonId,
        context: context,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(userId: string, feature: string, metadata?: Record<string, any>) {
    this.tinycdp.track({
      userId: userId,
      event: 'feature_used',
      properties: {
        feature_name: feature,
        usage_timestamp: new Date().toISOString(),
        ...metadata
      }
    });
  }

  /**
   * Track business events
   */
  trackPurchase(userId: string, purchaseData: {
    amount: number;
    currency: string;
    plan: string;
    paymentMethod?: string;
  }) {
    this.tinycdp.track({
      userId: userId,
      event: 'purchase_completed',
      properties: {
        revenue: purchaseData.amount,
        currency: purchaseData.currency,
        plan: purchaseData.plan,
        payment_method: purchaseData.paymentMethod || 'unknown',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track funnel events with context
   */
  trackFunnelStep(userId: string, funnel: string, step: string, stepData?: Record<string, any>) {
    this.tinycdp.track({
      userId: userId,
      event: 'funnel_step',
      properties: {
        funnel_name: funnel,
        step_name: step,
        step_order: this.getStepOrder(funnel, step),
        timestamp: new Date().toISOString(),
        ...stepData
      }
    });
  }

  private getStepOrder(funnel: string, step: string): number {
    // Define your funnel steps
    const funnels: Record<string, string[]> = {
      'onboarding': ['welcome', 'profile_setup', 'preferences', 'complete'],
      'purchase': ['pricing_viewed', 'plan_selected', 'payment_info', 'purchase_complete'],
      'feature_discovery': ['feature_shown', 'feature_clicked', 'feature_used', 'feature_mastered']
    };
    
    const steps = funnels[funnel] || [];
    return steps.indexOf(step) + 1;
  }
}

// =============================================================================
// 4. FEATURE FLAG DECISION PATTERNS
// =============================================================================

class FeatureFlagManager {
  constructor(private tinycdp: TinyCDPClient) {}

  /**
   * Basic feature flag check
   */
  async shouldShowFeature(userId: string, flagName: string): Promise<boolean> {
    try {
      const decision = await this.tinycdp.decide({
        userId: userId,
        flag: flagName
      });
      
      return decision.allow;
    } catch (error) {
      console.error(`❌ Error checking flag ${flagName}:`, error);
      return false; // Fail safe - don't show feature if error
    }
  }

  /**
   * Feature flag with variant support
   */
  async getFeatureVariant(userId: string, flagName: string): Promise<string | null> {
    try {
      const decision = await this.tinycdp.decide({
        userId: userId,
        flag: flagName
      });
      
      return decision.allow ? (decision.variant || 'default') : null;
    } catch (error) {
      console.error(`❌ Error getting variant for ${flagName}:`, error);
      return null;
    }
  }

  /**
   * Multiple feature flags at once (batch)
   */
  async checkMultipleFlags(userId: string, flags: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // In a real implementation, you might want to batch these calls
    const promises = flags.map(async (flag) => {
      const enabled = await this.shouldShowFeature(userId, flag);
      results[flag] = enabled;
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Feature flag with analytics tracking
   */
  async shouldShowFeatureWithTracking(userId: string, flagName: string, context?: string): Promise<boolean> {
    try {
      const decision = await this.tinycdp.decide({
        userId: userId,
        flag: flagName
      });
      
      // Track that we checked this flag
      this.tinycdp.track({
        userId: userId,
        event: 'feature_flag_checked',
        properties: {
          flag_name: flagName,
          result: decision.allow,
          variant: decision.variant,
          context: context,
          timestamp: new Date().toISOString()
        }
      });
      
      return decision.allow;
    } catch (error) {
      console.error(`❌ Error checking flag ${flagName}:`, error);
      
      // Track the error
      this.tinycdp.track({
        userId: userId,
        event: 'feature_flag_error',
        properties: {
          flag_name: flagName,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          context: context
        }
      });
      
      return false;
    }
  }
}

// =============================================================================
// 5. INTEGRATION PATTERNS FOR DIFFERENT FRAMEWORKS
// =============================================================================

/**
 * React Hook Pattern
 */
function useFeatureFlag(userId: string, flagName: string) {
  // This would be implemented as a proper React hook in your app
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const checkFlag = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }
      
      try {
        const tinycdp = initBasicClient();
        const enabled = await tinycdp.decide({
          userId: userId,
          flag: flagName
        });
        
        setIsEnabled(enabled.allow);
      } catch (error) {
        console.error('Feature flag check failed:', error);
        setIsEnabled(false); // Fail safe
      } finally {
        setIsLoading(false);
      }
    };
    
    checkFlag();
  }, [userId, flagName]);
  
  return { isEnabled, isLoading };
}

/**
 * Express.js Middleware Pattern
 */
function createTinyCDPMiddleware(tinycdp: TinyCDPClient) {
  return (req: any, res: any, next: any) => {
    // Add TinyCDP client to request object
    req.tinycdp = tinycdp;
    
    // Helper functions
    req.trackEvent = (event: string, properties?: Record<string, any>) => {
      if (req.user?.id) {
        tinycdp.track({
          userId: req.user.id,
          event: event,
          properties: {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method,
            ...properties
          }
        });
      }
    };
    
    req.checkFlag = async (flagName: string) => {
      if (!req.user?.id) return false;
      
      try {
        const decision = await tinycdp.decide({
          userId: req.user.id,
          flag: flagName
        });
        return decision.allow;
      } catch (error) {
        console.error('Flag check failed:', error);
        return false;
      }
    };
    
    next();
  };
}

/**
 * Vue.js Plugin Pattern
 */
const TinyCDPPlugin = {
  install(app: any, options: any) {
    const tinycdp = initTinyCDP(options);
    
    // Make available globally
    app.config.globalProperties.$tinycdp = tinycdp;
    
    // Provide for composition API
    app.provide('tinycdp', tinycdp);
    
    // Add global methods
    app.config.globalProperties.$track = (event: string, properties?: Record<string, any>) => {
      const userId = app.config.globalProperties.$route?.params?.userId;
      if (userId) {
        tinycdp.track({ userId, event, properties });
      }
    };
  }
};

// =============================================================================
// 6. ERROR HANDLING AND RESILIENCE PATTERNS
// =============================================================================

class ResilientTinyCDPClient {
  constructor(private tinycdp: TinyCDPClient) {}

  /**
   * Wrapper for identify with retry logic
   */
  async identifyWithRetry(params: IdentifyParams, maxRetries: number = 3): Promise<void> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.tinycdp.identify(params);
        return; // Success
      } catch (error) {
        lastError = error as Error;
        console.warn(`Identify attempt ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed to identify user after ${maxRetries} attempts: ${lastError!.message}`);
  }

  /**
   * Feature flag with fallback
   */
  async decideFallback(params: DecideParams, fallback: boolean = false): Promise<boolean> {
    try {
      const decision = await this.tinycdp.decide(params);
      return decision.allow;
    } catch (error) {
      console.warn(`Feature flag ${params.flag} failed, using fallback:`, error);
      return fallback;
    }
  }

  /**
   * Track with fire-and-forget error handling
   */
  trackSafe(params: TrackParams): void {
    try {
      this.tinycdp.track(params);
    } catch (error) {
      console.warn('Track failed:', error);
      // Don't throw - analytics shouldn't break app
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// 7. PERFORMANCE OPTIMIZATION PATTERNS
// =============================================================================

class OptimizedTinyCDPClient {
  private flagCache: Map<string, { value: boolean; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  constructor(private tinycdp: TinyCDPClient) {}

  /**
   * Cached feature flag decisions
   */
  async decideCached(userId: string, flagName: string): Promise<boolean> {
    const cacheKey = `${userId}:${flagName}`;
    const cached = this.flagCache.get(cacheKey);
    
    // Return cached value if still valid
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.value;
    }
    
    try {
      const decision = await this.tinycdp.decide({
        userId: userId,
        flag: flagName
      });
      
      // Cache the result
      this.flagCache.set(cacheKey, {
        value: decision.allow,
        timestamp: Date.now()
      });
      
      return decision.allow;
    } catch (error) {
      console.error(`Feature flag ${flagName} failed:`, error);
      
      // Return cached value if available, otherwise false
      return cached?.value || false;
    }
  }

  /**
   * Batch multiple flag checks
   */
  async batchDecide(userId: string, flags: string[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Check cache first
    const uncachedFlags = flags.filter(flag => {
      const cacheKey = `${userId}:${flag}`;
      const cached = this.flagCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        results[flag] = cached.value;
        return false; // Don't need to fetch
      }
      
      return true; // Need to fetch
    });
    
    // Fetch uncached flags in parallel
    const promises = uncachedFlags.map(async (flag) => {
      try {
        const decision = await this.tinycdp.decide({
          userId: userId,
          flag: flag
        });
        
        const cacheKey = `${userId}:${flag}`;
        this.flagCache.set(cacheKey, {
          value: decision.allow,
          timestamp: Date.now()
        });
        
        results[flag] = decision.allow;
      } catch (error) {
        console.error(`Flag ${flag} failed:`, error);
        results[flag] = false;
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Clear cache for user (e.g., after profile update)
   */
  clearUserCache(userId: string): void {
    for (const [key] of this.flagCache) {
      if (key.startsWith(`${userId}:`)) {
        this.flagCache.delete(key);
      }
    }
  }
}

// =============================================================================
// 8. USAGE EXAMPLE: COMPLETE INTEGRATION
// =============================================================================

/**
 * Complete example showing how to integrate TinyCDP in a typical application
 */
export class TinyCDPService {
  private client: TinyCDPClient;
  private userManager: UserManager;
  private eventTracker: EventTracker;
  private flagManager: FeatureFlagManager;

  constructor(config: {
    endpoint: string;
    writeKey: string;
    readKey: string;
    debug?: boolean;
  }) {
    // Initialize the client
    this.client = initTinyCDP(config);
    
    // Initialize managers
    this.userManager = new UserManager(this.client);
    this.eventTracker = new EventTracker(this.client);
    this.flagManager = new FeatureFlagManager(this.client);
  }

  // User management
  async signUpUser(userData: { userId: string; email: string; plan?: string; source?: string }) {
    await this.userManager.identifyNewUser(userData);
    this.eventTracker.trackFunnelStep(userData.userId, 'onboarding', 'signup_completed');
  }

  async updateUserPlan(userId: string, newPlan: string, previousPlan: string) {
    await this.userManager.handlePlanChange(userId, newPlan, previousPlan);
  }

  // Event tracking
  trackPageView(userId: string, route: string) {
    this.eventTracker.trackPageView(userId, route);
  }

  trackFeature(userId: string, feature: string) {
    this.eventTracker.trackFeatureUsage(userId, feature);
  }

  // Feature flags
  async shouldShowPremiumFeatures(userId: string): Promise<boolean> {
    return this.flagManager.shouldShowFeatureWithTracking(
      userId, 
      'premium_features', 
      'premium_ui_check'
    );
  }

  async getUIVariant(userId: string): Promise<string> {
    return this.flagManager.getFeatureVariant(userId, 'ui_experiment') || 'default';
  }

  // Cleanup
  async shutdown() {
    await this.client.flush();
    this.client.destroy();
  }
}

// Example usage:
/*
const tinycdp = new TinyCDPService({
  endpoint: 'https://staging-tinycdp-s3b2.encr.app',
  writeKey: process.env.TINYCDP_WRITE_KEY!,
  readKey: process.env.TINYCDP_READ_KEY!,
  debug: process.env.NODE_ENV === 'development'
});

// On user signup
await tinycdp.signUpUser({
  userId: 'user123',
  email: 'user@example.com',
  plan: 'free',
  source: 'landing_page'
});

// On page navigation
tinycdp.trackPageView('user123', '/dashboard');

// Feature flag check
const showPremium = await tinycdp.shouldShowPremiumFeatures('user123');
if (showPremium) {
  // Show premium UI
}

// On app shutdown
await tinycdp.shutdown();
*/
