type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

/**
 * Simple in-memory rate limiter used for lightweight endpoints.
 * This is intentionally scoped to the NFT link status endpoint so that other
 * parts of the application remain unaffected.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + windowMs;
    memoryStore.set(key, { count: 1, expiresAt });
    return {
      allowed: true,
      remaining: Math.max(config.limit - 1, 0),
      reset: expiresAt,
    };
  }

  const updatedCount = existing.count + 1;
  const remaining = Math.max(config.limit - updatedCount, 0);

  memoryStore.set(key, {
    count: updatedCount,
    expiresAt: existing.expiresAt,
  });

  return {
    allowed: updatedCount <= config.limit,
    remaining,
    reset: existing.expiresAt,
  };
}


