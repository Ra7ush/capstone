# Redis Implementation Guide - Quick Start

---

## 🚀 5-Minute Setup

### Step 1: Install Redis Locally

**macOS:**
```bash
brew install redis
brew services start redis
redis-cli ping  # Should return "PONG"
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
redis-cli ping  # Should return "PONG"
```

**Windows:**
```bash
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL (Windows Subsystem for Linux)
```

### Step 2: Install ioredis Package

```bash
cd backend
npm install ioredis
npm install --save-dev @types/ioredis  # For TypeScript support
```

### Step 3: Create Redis Configuration

**File: `backend/src/config/redis.js`**
```javascript
import Redis from 'ioredis';
import { ENV } from './env.js';
import { logger } from './logger.js';

export const redis = new Redis({
  host: ENV.REDIS_HOST || 'localhost',
  port: ENV.REDIS_PORT || 6379,
  password: ENV.REDIS_PASSWORD,
  db: ENV.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error('❌ Redis error:', err);
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

// Helper functions
export async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error(`Cache get error for ${key}:`, error);
    return null;
  }
}

export async function setCache(key, value, ttl = 300) {
  try {
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
    return true;
  } catch (error) {
    logger.error(`Cache set error for ${key}:`, error);
    return false;
  }
}

export async function deleteCache(key) {
  try {
    await redis.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for ${key}:`, error);
    return false;
  }
}

export async function invalidatePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info(`Invalidated ${keys.length} cache keys matching ${pattern}`);
    }
    return keys.length;
  } catch (error) {
    logger.error(`Cache invalidation error for ${pattern}:`, error);
    return 0;
  }
}

export async function getOrSet(key, fn, ttl = 300) {
  try {
    // Try to get from cache
    const cached = await getCache(key);
    if (cached) {
      logger.debug(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - fetch from source
    logger.debug(`Cache miss: ${key}`);
    const result = await fn();

    // Store in cache
    await setCache(key, result, ttl);

    return result;
  } catch (error) {
    logger.error(`getOrSet error for ${key}:`, error);
    // Fallback: fetch from source without caching
    return await fn();
  }
}

export async function flushAll() {
  try {
    await redis.flushall();
    logger.warn('⚠️ All Redis cache cleared');
  } catch (error) {
    logger.error('Cache flush error:', error);
  }
}
```

### Step 4: Update Environment Variables

**File: `backend/.env`**
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Step 5: Initialize Redis in Server

**File: `backend/src/server.js`**
```javascript
import { redis } from './config/redis.js';

// Connect to Redis before starting server
await redis.connect();

app.listen(ENV.PORT, '0.0.0.0', () => {
  logger.info(`Server running at http://0.0.0.0:${ENV.PORT}`);
  logger.info(`Redis connected: ${ENV.REDIS_HOST}:${ENV.REDIS_PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await redis.quit();
  process.exit(0);
});
```

---

## 💾 Caching Patterns for Your App

### Pattern 1: Cache User Profiles

**File: `backend/src/controllers/profile.controller.js`**
```javascript
import { getOrSet, invalidatePattern } from '../config/redis.js';
import supabase from '../config/db.js';

export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const cacheKey = `user:profile:${userId}`;

    // Get from cache or fetch from DB
    const profile = await getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        return data;
      },
      300 // 5 minutes TTL
    );

    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('users')
      .update(req.body)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Invalidate cache
    await invalidatePattern(`user:profile:${userId}`);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Pattern 2: Cache Creator Stats

**File: `backend/src/controllers/creator.controller.js`**
```javascript
import { getOrSet, invalidatePattern } from '../config/redis.js';
import supabase from '../config/db.js';

export async function getCreatorStats(req, res) {
  try {
    const { creatorId } = req.params;
    const cacheKey = `creator:stats:${creatorId}`;

    const stats = await getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await supabase.rpc('get_creator_stats', {
          p_creator_id: creatorId
        });

        if (error) throw error;
        return data;
      },
      60 // 1 minute TTL (frequently changing)
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Pattern 3: Cache Feed/Posts

**File: `backend/src/controllers/community.controller.js`**
```javascript
import { getOrSet, invalidatePattern } from '../config/redis.js';
import supabase from '../config/db.js';

export async function getFeed(req, res) {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const cacheKey = `feed:${userId}:page:${page}`;

    const feed = await getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (error) throw error;
        return data;
      },
      30 // 30 seconds TTL (very dynamic)
    );

    res.json({ success: true, data: feed });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPost(req, res) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([{ ...req.body, user_id: req.user.id }])
      .select()
      .single();

    if (error) throw error;

    // Invalidate all feed caches
    await invalidatePattern('feed:*');

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Pattern 4: Cache Dashboard Stats

**File: `backend/src/controllers/admin.controller.js`**
```javascript
import { getOrSet, invalidatePattern } from '../config/redis.js';
import supabase from '../config/db.js';

export async function getDashboardStats(req, res) {
  try {
    const { range = '1Y' } = req.query;
    const cacheKey = `admin:dashboard:stats:${range}`;

    const stats = await getOrSet(
      cacheKey,
      async () => {
        const { data, error } = await supabase.rpc('get_dashboard_stats', {
          time_range: range
        });

        if (error) throw error;
        return data;
      },
      300 // 5 minutes TTL
    );

    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 🔄 Real-Time Cache Invalidation

**File: `backend/src/config/realtimeSync.js`**
```javascript
import { redis, invalidatePattern } from './redis.js';
import supabase from './db.js';
import { logger } from './logger.js';

export function setupRealtimeSync() {
  // Listen for database changes
  supabase
    .channel('db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      async (payload) => {
        logger.info('User changed, invalidating cache...');
        await invalidatePattern(`user:profile:${payload.new?.id || payload.old?.id}`);
        await invalidatePattern(`user:stats:${payload.new?.id || payload.old?.id}`);
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'posts' },
      async (payload) => {
        logger.info('Post changed, invalidating feed cache...');
        await invalidatePattern('feed:*');
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'creators' },
      async (payload) => {
        logger.info('Creator changed, invalidating stats cache...');
        await invalidatePattern(`creator:stats:${payload.new?.user_id || payload.old?.user_id}`);
      }
    )
    .subscribe();

  logger.info('✅ Real-time sync initialized');
}
```

**File: `backend/src/server.js` (update)**
```javascript
import { setupRealtimeSync } from './config/realtimeSync.js';

// Setup real-time cache invalidation
setupRealtimeSync();
```

---

## 📊 Monitoring Cache Performance

**File: `backend/src/routes/health.route.js`**
```javascript
import { Router } from 'express';
import { redis } from '../config/redis.js';

const router = Router();

router.get('/cache', async (req, res) => {
  try {
    const ping = await redis.ping();
    const info = await redis.info('stats');
    const memory = await redis.info('memory');
    const keys = await redis.dbsize();

    res.json({
      status: ping === 'PONG' ? 'healthy' : 'unhealthy',
      ping,
      keys: keys,
      memory: {
        used_memory_human: memory.split('\r\n')[1],
        used_memory_peak_human: memory.split('\r\n')[2]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
```

---

## 🧪 Testing Cache

**File: `backend/src/__tests__/redis.test.js`**
```javascript
import { getCache, setCache, deleteCache, getOrSet } from '../config/redis.js';

describe('Redis Cache', () => {
  afterEach(async () => {
    await deleteCache('test:key');
  });

  it('should set and get cache', async () => {
    const data = { id: 1, name: 'Test' };
    await setCache('test:key', data, 60);

    const cached = await getCache('test:key');
    expect(cached).toEqual(data);
  });

  it('should return null for missing key', async () => {
    const cached = await getCache('nonexistent:key');
    expect(cached).toBeNull();
  });

  it('should use getOrSet pattern', async () => {
    const fn = jest.fn(async () => ({ id: 1, name: 'Test' }));

    // First call - cache miss
    const result1 = await getOrSet('test:key', fn, 60);
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call - cache hit
    const result2 = await getOrSet('test:key', fn, 60);
    expect(fn).toHaveBeenCalledTimes(1); // Not called again

    expect(result1).toEqual(result2);
  });

  it('should delete cache', async () => {
    await setCache('test:key', { data: 'test' }, 60);
    await deleteCache('test:key');

    const cached = await getCache('test:key');
    expect(cached).toBeNull();
  });
});
```

---

## 📈 Performance Comparison

### Before Redis
```
GET /api/profile/user123
├─ Parse request: 1ms
├─ Query Supabase: 150ms
├─ Parse response: 2ms
└─ Send response: 2ms
Total: ~155ms
```

### After Redis
```
GET /api/profile/user123 (cache hit)
├─ Parse request: 1ms
├─ Query Redis: 5ms
├─ Parse response: 1ms
└─ Send response: 1ms
Total: ~8ms (19x faster!)

GET /api/profile/user123 (cache miss)
├─ Parse request: 1ms
├─ Query Supabase: 150ms
├─ Store in Redis: 3ms
├─ Parse response: 2ms
└─ Send response: 2ms
Total: ~158ms (similar to before, but now cached)
```

---

## 🚀 Production Deployment

### Option 1: Self-Hosted (Same Server)
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping
```

### Option 2: Managed Redis (Recommended)

**AWS ElastiCache:**
```env
REDIS_HOST=my-redis.abc123.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-auth-token
```

**Upstash (Serverless):**
```env
REDIS_HOST=your-endpoint.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**Redis Cloud:**
```env
REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-password
```

---

## ✅ Implementation Checklist

- [ ] Install Redis locally
- [ ] Install ioredis package
- [ ] Create Redis configuration
- [ ] Add environment variables
- [ ] Initialize Redis in server
- [ ] Cache user profiles
- [ ] Cache creator stats
- [ ] Cache feed/posts
- [ ] Cache dashboard stats
- [ ] Set up real-time invalidation
- [ ] Add cache monitoring endpoint
- [ ] Write tests
- [ ] Performance testing
- [ ] Deploy to production

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Ready to Implement
