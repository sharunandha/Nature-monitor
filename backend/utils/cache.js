class CacheManager {
  constructor(duration = 30) {
    this.cache = new Map();
    this.defaultCacheDuration = Number(duration) * 60 * 1000;
    this.cacheDurations = {
      reservoir: 15 * 60 * 1000,
      dams: 24 * 60 * 60 * 1000,
      rainfall: 30 * 60 * 1000,
    };
  }

  getTTLForKey(key) {
    if (/^reservoir_|^reservoir-levels-|^reservoirs-state-|^reservoir-history-/.test(key)) {
      return this.cacheDurations.reservoir;
    }

    if (/^dams-|^states-|^state-summary-/.test(key)) {
      return this.cacheDurations.dams;
    }

    if (/^weather-fc-|^hist-rain-|^nasa-/.test(key)) {
      return this.cacheDurations.rainfall;
    }

    return this.defaultCacheDuration;
  }

  set(key, value, ttlMs) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: Number(ttlMs) || this.getTTLForKey(key),
    });
  }

  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp;

    const ttl = cached.ttl || this.defaultCacheDuration;
    if (age > ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;

    const now = Date.now();
    const age = now - cached.timestamp;

    const ttl = cached.ttl || this.defaultCacheDuration;
    if (age > ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

module.exports = new CacheManager(process.env.CACHE_DURATION || 10);
