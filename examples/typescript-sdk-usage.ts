/**
 * TinyCDP TypeScript SDK Usage Examples
 * 
 * This file demonstrates how to use the TinyCDP SDK in various scenarios:
 * - Basic setup and configuration
 * - User identification and tracking
 * - Real-time feature flag decisions
 * - Production-ready patterns
 */

import { initTinyCDP, createLogger } from '../packages/sdk/src/index';

// =============================================================================
// 1. BASIC SETUP
// =============================================================================

/**
 * Initialize TinyCDP client with your API keys
 */
const tinyCDP = initTinyCDP({
  endpoint: 'https://staging-tinycdp-s3b2.encr.app', // Your TinyCDP endpoint
  writeKey: '9X32xyFBpzfVe8kXChVcrYzD3BvMUTVq', // For identify() and track()
  readKey: 'ux0X8YZcKEkKn2MhHRDlN1gRX7EYJ97c',  // For decide()
  
  // Optional: Customize batching behavior
  flushAt: 20,          // Send batch when 20 events collected
  flushIntervalMs: 10000, // Or every 10 seconds, whichever comes first
  
  // Optional: Retry configuration
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  
  // Optional: Debug logging
  debug: true, // Set to false in production
});

// =============================================================================
// 2. USER IDENTIFICATION
// =============================================================================

/**
 * Example: User signup flow
 */
async function handleUserSignup(userId: string, email: string, plan: string) {
  try {
    // Identify the user with their traits
    await tinyCDP.identify({
      userId: userId,
      traits: {
        email: email,
        plan: plan,
        signup_date: new Date().toISOString(),
        device_type: getDeviceType(),
        user_agent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    });
    
    console.log('✅ User identified successfully');
  } catch (error) {
    console.error('❌ Failed to identify user:', error);
  }
}

/**
 * Example: Update user profile
 */
async function updateUserProfile(userId: string, updates: Record<string, any>) {
  try {
    await tinyCDP.identify({
      userId: userId,
      traits: {
        ...updates,
        last_updated: new Date().toISOString(),
      }
    });
    
    console.log('✅ User profile updated');
  } catch (error) {
    console.error('❌ Failed to update user profile:', error);
  }
}

// =============================================================================
// 3. EVENT TRACKING
// =============================================================================

/**
 * Example: Track page views
 */
function trackPageView(userId: string, page: string) {
  tinyCDP.track({
    userId: userId,
    event: 'page_view',
    properties: {
      page: page,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    }
  });
}

/**
 * Example: Track purchase events
 */
function trackPurchase(userId: string, orderData: any) {
  tinyCDP.track({
    userId: userId,
    event: 'purchase',
    properties: {
      order_id: orderData.id,
      amount: orderData.total,
      currency: orderData.currency || 'USD',
      items: orderData.items,
      payment_method: orderData.paymentMethod,
      discount_code: orderData.discountCode,
    }
  });
}

/**
 * Example: Track feature usage
 */
function trackFeatureUsage(userId: string, feature: string, context?: Record<string, any>) {
  tinyCDP.track({
    userId: userId,
    event: 'feature_use',
    properties: {
      feature_name: feature,
      context: context,
      session_id: getSessionId(),
    }
  });
}

/**
 * Example: Track user engagement
 */
function trackEngagement(userId: string, action: string, target?: string) {
  tinyCDP.track({
    userId: userId,
    event: 'engagement',
    properties: {
      action: action, // 'click', 'scroll', 'hover', etc.
      target: target, // button ID, element class, etc.
      page: window.location.pathname,
    }
  });
}

// =============================================================================
// 4. FEATURE FLAG DECISIONS
// =============================================================================

/**
 * Example: Check if premium features should be enabled
 */
async function shouldShowPremiumFeatures(userId: string): Promise<boolean> {
  try {
    const decision = await tinyCDP.decide({
      userId: userId,
      flag: 'premium_features'
    });
    
    // Track that we made this decision for analytics
    tinyCDP.track({
      userId: userId,
      event: 'feature_flag_checked',
      properties: {
        flag: 'premium_features',
        result: decision.allow,
        variant: decision.variant,
      }
    });
    
    return decision.allow;
  } catch (error) {
    console.error('❌ Failed to get premium features flag:', error);
    return false; // Default to false on error
  }
}

/**
 * Example: Get personalized discount offer
 */
async function getDiscountOffer(userId: string): Promise<{ show: boolean; amount?: number }> {
  try {
    const decision = await tinyCDP.decide({
      userId: userId,
      flag: 'discount_offer'
    });
    
    if (decision.allow) {
      // You could return variant-specific data
      const discountAmount = decision.variant === 'high_discount' ? 25 : 15;
      
      return { show: true, amount: discountAmount };
    }
    
    return { show: false };
  } catch (error) {
    console.error('❌ Failed to get discount offer flag:', error);
    return { show: false };
  }
}

/**
 * Example: A/B test implementation
 */
async function getExperimentVariant(userId: string, experimentName: string): Promise<string> {
  try {
    const decision = await tinyCDP.decide({
      userId: userId,
      flag: experimentName
    });
    
    const variant = decision.variant || (decision.allow ? 'treatment' : 'control');
    
    // Track experiment exposure
    tinyCDP.track({
      userId: userId,
      event: 'experiment_exposure',
      properties: {
        experiment: experimentName,
        variant: variant,
      }
    });
    
    return variant;
  } catch (error) {
    console.error(`❌ Failed to get experiment variant for ${experimentName}:`, error);
    return 'control'; // Default to control group
  }
}

// =============================================================================
// 5. PRODUCTION-READY PATTERNS
// =============================================================================

/**
 * React Hook for feature flags
 */
function useFeatureFlag(userId: string | null, flagKey: string, defaultValue = false) {
  const [flagValue, setFlagValue] = React.useState(defaultValue);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    async function checkFlag() {
      try {
        const decision = await tinyCDP.decide({ userId, flag: flagKey });
        setFlagValue(decision.allow);
      } catch (error) {
        console.error(`Feature flag error for ${flagKey}:`, error);
        setFlagValue(defaultValue);
      } finally {
        setLoading(false);
      }
    }
    
    checkFlag();
  }, [userId, flagKey, defaultValue]);
  
  return { value: flagValue, loading };
}

/**
 * Analytics wrapper class for easier usage
 */
class Analytics {
  constructor(private client: typeof tinyCDP) {}
  
  // User lifecycle events
  async userSignedUp(userId: string, traits: Record<string, any>) {
    await this.client.identify({ userId, traits });
    this.client.track({
      userId,
      event: 'user_signed_up',
      properties: traits
    });
  }
  
  async userLoggedIn(userId: string) {
    this.client.track({
      userId,
      event: 'user_logged_in',
      properties: {
        login_time: new Date().toISOString(),
      }
    });
  }
  
  // Business events
  subscriptionStarted(userId: string, plan: string, amount: number) {
    this.client.track({
      userId,
      event: 'subscription_started',
      properties: { plan, amount, currency: 'USD' }
    });
  }
  
  subscriptionCancelled(userId: string, reason?: string) {
    this.client.track({
      userId,
      event: 'subscription_cancelled',
      properties: { reason, cancelled_at: new Date().toISOString() }
    });
  }
  
  // Feature flags with analytics
  async checkFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const decision = await this.client.decide({ userId, flag: feature });
      
      // Track the check for analytics
      this.client.track({
        userId,
        event: 'feature_checked',
        properties: {
          feature,
          enabled: decision.allow,
          variant: decision.variant,
        }
      });
      
      return decision.allow;
    } catch (error) {
      console.error(`Feature check failed for ${feature}:`, error);
      return false;
    }
  }
}

// =============================================================================
// 6. UTILITY FUNCTIONS
// =============================================================================

function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
    return 'mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'tablet';
  }
  return 'desktop';
}

function getSessionId(): string {
  // Simple session ID - in production, use a more robust solution
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

// =============================================================================
// 7. USAGE EXAMPLES
// =============================================================================

async function exampleUsage() {
  const userId = 'user_123';
  
  console.log('🚀 TinyCDP SDK Usage Examples');
  console.log('================================');
  
  // 1. Identify user
  console.log('\n1️⃣ Identifying user...');
  await handleUserSignup(userId, 'john@example.com', 'premium');
  
  // 2. Track events
  console.log('\n2️⃣ Tracking events...');
  trackPageView(userId, '/dashboard');
  trackFeatureUsage(userId, 'export_data');
  
  // 3. Make decisions
  console.log('\n3️⃣ Making feature flag decisions...');
  const showPremium = await shouldShowPremiumFeatures(userId);
  console.log(`Show premium features: ${showPremium}`);
  
  const discountOffer = await getDiscountOffer(userId);
  console.log(`Discount offer: ${JSON.stringify(discountOffer)}`);
  
  // 4. A/B test
  console.log('\n4️⃣ A/B testing...');
  const variant = await getExperimentVariant(userId, 'new_checkout_flow');
  console.log(`Experiment variant: ${variant}`);
  
  // 5. Flush events
  console.log('\n5️⃣ Flushing events...');
  await tinyCDP.flush();
  console.log('✅ All events sent!');
}

// Initialize analytics wrapper
const analytics = new Analytics(tinyCDP);

// Export for use in your application
export {
  tinyCDP,
  analytics,
  handleUserSignup,
  trackPageView,
  trackPurchase,
  trackFeatureUsage,
  shouldShowPremiumFeatures,
  getDiscountOffer,
  getExperimentVariant,
  useFeatureFlag,
  exampleUsage,
};

// =============================================================================
// 8. CLEANUP
// =============================================================================

// Don't forget to clean up when your app shuts down
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    tinyCDP.destroy();
  });
}
