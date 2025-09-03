import { createLogger } from '../backend/shared/logger';

const logger = createLogger("health-check-script");

interface HealthCheck {
  service: string;
  url: string;
}

const services: HealthCheck[] = [
  { service: "ingest", url: "http://localhost:4000/ingest/health" },
  { service: "identity", url: "http://localhost:4000/identity/health" },
  { service: "traits", url: "http://localhost:4000/traits/health" },
  { service: "segments", url: "http://localhost:4000/segments/health" },
  { service: "decide", url: "http://localhost:4000/decide/health" },
  { service: "admin", url: "http://localhost:4000/admin/health" },
  { service: "export", url: "http://localhost:4000/export/health" },
];

async function checkHealth(check: HealthCheck): Promise<boolean> {
  try {
    logger.info(`Checking health for ${check.service}`, { url: check.url });
    
    const response = await fetch(check.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      logger.error(`Health check failed for ${check.service}`, new Error(`HTTP ${response.status}`), {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    const data = await response.json();
    logger.info(`Health check passed for ${check.service}`, {
      status: data.status,
      database: data.database,
      storage: data.storage,
      checks: data.checks
    });

    return data.status === 'ok';
  } catch (error) {
    logger.error(`Health check error for ${check.service}`, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

async function runHealthChecks(): Promise<void> {
  logger.info("Starting comprehensive health checks");
  
  const results = await Promise.allSettled(
    services.map(service => checkHealth(service))
  );

  let allPassed = true;
  results.forEach((result, index) => {
    const service = services[index];
    if (result.status === 'rejected') {
      logger.error(`Health check failed for ${service.service}`, result.reason);
      allPassed = false;
    } else if (!result.value) {
      logger.error(`Health check returned false for ${service.service}`);
      allPassed = false;
    }
  });

  if (allPassed) {
    logger.info("All health checks passed");
    process.exit(0);
  } else {
    logger.error("Some health checks failed");
    process.exit(1);
  }
}

// Handle script errors
process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception in health check script", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error("Unhandled rejection in health check script", reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

runHealthChecks().catch((error) => {
  logger.error("Health check script failed", error);
  process.exit(1);
});
