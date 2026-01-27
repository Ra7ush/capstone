# Server-Side Caching & Infrastructure Guide for Nexus

**Context:** Your app is a creator platform with mobile (Expo), admin dashboard (React), and Express backend connected to Supabase.

---

## 🎯 What Server-Side Caching Do You Need?

### Short Answer
**Yes, you need server-side caching.** Even though your mobile app has offline-first client-side caching, the server must cache frequently accessed data to:
1. Reduce database load (Supabase costs scale with queries)
2. Improve API response times (< 200ms target)
3. Handle traffic spikes without degradation
4. Reduce latency for real-time features

---

## 📊 Your Current Architecture Analysis

```
┌─────────────────────────────────────────────────────────┐
│                    NEXUS PLATFORM                       │
├────────────────────���────────────────────────────────────┤
│                                                         │
│  Mobile (Expo)          Admin (React)                   │
│  ├─ AsyncStorage        ├─ React Query                  │
│  ├─ React Query         └─ Client-side cache            │
│  └─ Offline-first                                       │
│         │                       │                       │
│         └───────────┬───────────┘                       │
│                     │                                   │
│         ┌───────────▼──────────┐                        │
│         │   Express Backend    │                        │
│         │   (NO CACHING YET)   │ ⚠️ MISSING             │
│         └───────────┬──────────┘                        │
│                     │                                   │
│         ┌───────────▼──────────┐                        │
│         │  Supabase Database   │                        │
│         │  (PostgreSQL + Auth) │                        │
│         └──────────────────────┘                        │
│                                                         │
└─────────────────────────────────────────────────────────┘

PROBLEM: Every API request hits Supabase directly
- No caching layer
- High database load
- Slow response times for repeated queries
- Expensive (Supabase charges per query)
```

---

## 🔴 Critical Server-Side Caching Needs

### 1. **Redis Cache Layer** (CRITICAL)
**Why:** Reduce database queries by 70-80%

```
Request Flow WITHOUT Redis:
Mobile → Express → Supabase (every time)
         ↓
      ~100ms latency

Request Flow WITH Redis:
Mobile → Express → Redis (cache hit) → 5-10ms latency
                ↓
            Supabase (cache miss, then store in Redis)
```

**What to cache in Redis:**
- User profiles (stale time: 5-10 min)
- Creator stats (earnings, followers, etc.) (stale time: 1 min)
- Community posts feed (stale time: 30 sec)
- Service/product listings (stale time: 5 min)
- Follow relationships (stale time: 1 min)
- Verification status (stale time: 10 min)

**What NOT to cache:**
- Real-time messages (use Supabase realtime directly)
- User auth tokens (keep in Supabase)
- Financial transactions (always fresh from DB)
- Admin-only data (cache separately with shorter TTL)

### 2. **Query Result Caching**
**Why:** Expensive RPC calls and complex queries should be cached

```javascript
// Example: Dashboard stats (expensive RPC)
// Without cache: 500ms per request
// With cache: 5ms per request (cache hit)

const cacheKey = `dashboard_stats:${range}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // 5ms
}

const result = await supabase.rpc('get_dashboard_stats', { time_range: range });
await redis.setex(cacheKey, 60, JSON.stringify(result)); // Cache for 1 min
return result;
```

### 3. **Session/Auth Caching**
**Why:** Verify user permissions without hitting Supabase every request

```javascript
// Cache user role/permissions for 30 minutes
const userKey = `user:${userId}:permissions`;
const cached = await redis.get(userKey);

if (cached) {
  return JSON.parse(cached);
}

const user = await supabase.from('users').select('role, status').eq('id', userId);
await redis.setex(userKey, 1800, JSON.stringify(user)); // 30 min TTL
return user;
```

### 4. **Rate Limit State**
**Why:** Your current rate limiter uses in-memory store (lost on restart)

```javascript
// Use Redis for distributed rate limiting
// Survives server restarts
// Works across multiple server instances

const limiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 1000
});
```

---

## 🟠 High Priority Server-Side Infrastructure

### 5. **Database Connection Pooling**
**Why:** Supabase connections are expensive; reuse them

```javascript
// Current: New connection per request (wasteful)
// Better: Connection pool (reuse connections)

import { createPool } from 'pg';

const pool = createPool({
  host: ENV.SUPABASE_HOST,
  port: 5432,
  database: ENV.SUPABASE_DB,
  user: ENV.SUPABASE_USER,
  password: ENV.SUPABASE_PASSWORD,
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 6. **Response Compression**
**Why:** Reduce bandwidth by 60-70%

```javascript
import compression from 'compression';

app.use(compression({
  level: 6, // Balance between speed and compression
  threshold: 1024 // Only compress > 1KB
}));
```

### 7. **HTTP Caching Headers**
**Why:** Let clients and CDNs cache responses

```javascript
// For public data (posts, profiles)
res.set('Cache-Control', 'public, max-age=300'); // 5 min

// For user-specific data
res.set('Cache-Control', 'private, max-age=60'); // 1 min

// For real-time data
res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
```

### 8. **CDN for Static Assets**
**Why:** Serve admin dashboard and assets from edge locations

```
Current: All requests → Single server → Slow for distant users
Better:  Requests → CDN edge → Cached assets → Fast globally

Recommended: Cloudflare, AWS CloudFront, or Vercel
```

### 9. **Database Query Optimization**
**Why:** Some queries are slow even with caching

```javascript
// Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

// Use EXPLAIN to find slow queries
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = $1;
```

### 10. **Load Balancing**
**Why:** Distribute traffic across multiple server instances

```
Current: Single server (single point of failure)
Better:  Multiple servers behind load balancer

┌─────────────────────────────────┐
│      Load Balancer (nginx)      │
├─────────────────────────────────┤
│  ↓              ↓              ↓ │
│ Server 1    Server 2      Server 3
│ (Express)   (Express)     (Express)
│  ↓              ↓              ↓ │
��  └──────────────┬───────────────┘
│                 │
│         ┌───────▼──────────┐
│         │  Redis (shared)  │
│         └──────────────────┘
│                 │
│         ┌───────▼──────────┐
│         │  Supabase (DB)   │
│         └──────────────────┘
```

---

## 📋 Recommended Server-Side Stack for Your App

### Tier 1: Essential (Implement First)
```
✅ Redis (In-Memory Cache)
   - Cache user profiles, posts, stats
   - Session/auth caching
   - Rate limit state
   - Pub/Sub for real-time features

✅ Response Compression
   - Reduce bandwidth 60-70%
   - Minimal CPU overhead

✅ HTTP Caching Headers
   - Leverage browser/CDN caching
   - No code changes needed

✅ Database Indexes
   - Speed up queries 10-100x
   - Low effort, high impact
```

### Tier 2: Important (Implement Soon)
```
✅ Connection Pooling
   - Reduce connection overhead
   - Better resource utilization

✅ Query Optimization
   - Profile slow queries
   - Add missing indexes
   - Optimize N+1 queries

✅ Structured Logging
   - Track cache hits/misses
   - Monitor performance
   - Debug issues
```

### Tier 3: Nice to Have (Implement Later)
```
✅ CDN for Static Assets
   - Global distribution
   - Faster admin dashboard load

✅ Load Balancing
   - High availability
   - Horizontal scaling

✅ APM (Application Performance Monitoring)
   - Real-time performance insights
   - Bottleneck identification
```

---

## 🚀 Implementation Priority for Your App

### Phase 1: Redis Caching (Week 1-2)
**Effort:** 20-30 hours | **Impact:** 70% improvement

```javascript
// backend/src/config/redis.js
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableReadyCheck: false,
  enableOfflineQueue: false
});

// Cache helper functions
export async function getOrSet(key, fn, ttl = 300) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  
  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

export async function invalidate(pattern) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

**What to cache first:**
1. User profiles: `user:{userId}` (TTL: 5 min)
2. Creator stats: `creator:stats:{userId}` (TTL: 1 min)
3. Posts feed: `feed:{userId}` (TTL: 30 sec)
4. Services list: `services:all` (TTL: 5 min)

### Phase 2: HTTP Caching Headers (Week 2)
**Effort:** 5-10 hours | **Impact:** 30% improvement

```javascript
// backend/src/middlewares/cacheHeaders.js
export function setCacheHeaders(req, res, next) {
  // Public data (cacheable by everyone)
  if (req.path.includes('/posts') || req.path.includes('/services')) {
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
  }
  
  // User-specific data (cacheable by browser only)
  else if (req.path.includes('/profile') || req.path.includes('/dashboard')) {
    res.set('Cache-Control', 'private, max-age=60');
  }
  
  // Real-time data (no caching)
  else if (req.path.includes('/messages') || req.path.includes('/realtime')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  
  next();
}

// In server.js
app.use(setCacheHeaders);
```

### Phase 3: Database Optimization (Week 3)
**Effort:** 10-15 hours | **Impact:** 50% improvement

```sql
-- Add indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_creators_user_id ON creators(user_id);
CREATE INDEX idx_creators_verification_status ON creators(verification_status);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;
```

### Phase 4: Response Compression (Week 3)
**Effort:** 2-3 hours | **Impact:** 60% bandwidth reduction

```javascript
import compression from 'compression';

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

---

## 📊 Expected Performance Improvements

### Before Server-Side Caching
```
API Response Times:
- Get user profile: 150-200ms (Supabase query)
- Get dashboard stats: 500-800ms (Complex RPC)
- Get posts feed: 300-400ms (Multiple queries)
- Get creator stats: 200-300ms (Aggregation)

Database Load:
- 1000 concurrent users
- 5000 queries/minute
- High Supabase costs

Mobile App:
- Slow initial load
- Frequent network requests
- High battery drain
```

### After Server-Side Caching
```
API Response Times:
- Get user profile: 5-10ms (Redis cache hit)
- Get dashboard stats: 10-20ms (Redis cache hit)
- Get posts feed: 10-15ms (Redis cache hit)
- Get creator stats: 5-10ms (Redis cache hit)

Database Load:
- 1000 concurrent users
- 500 queries/minute (90% reduction)
- 70% lower Supabase costs

Mobile App:
- Fast API responses
- Reduced network requests
- Lower battery drain
- Better offline experience
```

---

## 🔄 Cache Invalidation Strategy

### Real-Time Invalidation (via Supabase Realtime)
```javascript
// When a post is created/updated/deleted
supabase
  .channel('posts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
    // Invalidate feed cache
    await redis.del(`feed:*`);
    await redis.del(`posts:all`);
    
    // Invalidate user's posts cache
    await redis.del(`user:${payload.new.user_id}:posts`);
  })
  .subscribe();
```

### Time-Based Invalidation (TTL)
```javascript
// Short TTL for frequently changing data
redis.setex('feed:user123', 30, data);      // 30 seconds
redis.setex('stats:user123', 60, data);     // 1 minute
redis.setex('profile:user123', 300, data);  // 5 minutes

// Longer TTL for stable data
redis.setex('services:all', 600, data);     // 10 minutes
redis.setex('categories:all', 3600, data);  // 1 hour
```

### Manual Invalidation (on specific events)
```javascript
// When user updates profile
app.put('/api/profile/:id', async (req, res) => {
  const result = await updateProfile(req.params.id, req.body);
  
  // Invalidate related caches
  await redis.del(`user:${req.params.id}`);
  await redis.del(`profile:${req.params.id}`);
  await redis.del(`creator:stats:${req.params.id}`);
  
  res.json(result);
});
```

---

## 🛡️ Cache Reliability & Fallback

### Handle Cache Failures Gracefully
```javascript
export async function getOrSetWithFallback(key, fn, ttl = 300) {
  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached);
  } catch (error) {
    logger.warn(`Cache read failed for ${key}:`, error);
    // Continue to fetch from source
  }

  // Fetch from source
  const result = await fn();

  // Try to cache (don't fail if cache is down)
  try {
    await redis.setex(key, ttl, JSON.stringify(result));
  } catch (error) {
    logger.warn(`Cache write failed for ${key}:`, error);
    // Still return result even if cache failed
  }

  return result;
}
```

### Monitor Cache Health
```javascript
app.get('/api/health/cache', async (req, res) => {
  try {
    const ping = await redis.ping();
    const info = await redis.info('stats');
    
    res.json({
      status: ping === 'PONG' ? 'healthy' : 'unhealthy',
      redis: info,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## 📈 Monitoring & Metrics

### Track Cache Performance
```javascript
export async function trackCacheMetrics(key, hit) {
  const metric = hit ? 'cache:hit' : 'cache:miss';
  await redis.incr(metric);
  
  // Calculate hit rate every hour
  const hits = await redis.get('cache:hit');
  const misses = await redis.get('cache:miss');
  const hitRate = hits / (hits + misses) * 100;
  
  logger.info(`Cache hit rate: ${hitRate.toFixed(2)}%`);
}
```

### Expected Metrics
```
Healthy Cache Performance:
- Hit rate: 70-85%
- Average response time: 10-50ms
- Redis memory usage: < 2GB
- Eviction rate: < 1%

Warning Signs:
- Hit rate < 50% (cache not effective)
- Response time > 100ms (cache too slow)
- Memory usage > 80% (need more capacity)
- High eviction rate (cache too small)
```

---

## 🎯 Implementation Checklist

### Week 1: Redis Setup
- [ ] Install Redis locally for development
- [ ] Install ioredis package
- [ ] Create Redis configuration
- [ ] Create cache helper functions
- [ ] Add Redis health check endpoint
- [ ] Test Redis connection

### Week 2: Cache User Data
- [ ] Cache user profiles (5 min TTL)
- [ ] Cache creator stats (1 min TTL)
- [ ] Cache verification status (10 min TTL)
- [ ] Add cache invalidation on profile update
- [ ] Monitor cache hit rate

### Week 3: Cache Feed & Posts
- [ ] Cache posts feed (30 sec TTL)
- [ ] Cache services list (5 min TTL)
- [ ] Cache community data (1 min TTL)
- [ ] Add real-time invalidation
- [ ] Test with mobile app

### Week 4: Optimize & Monitor
- [ ] Add HTTP caching headers
- [ ] Add database indexes
- [ ] Add response compression
- [ ] Set up cache monitoring
- [ ] Performance testing

---

## 💰 Cost Impact

### Supabase Costs (Before Caching)
```
1000 concurrent users
5000 queries/minute
= ~7.2M queries/month
= $200-500/month (depending on plan)
```

### Supabase Costs (After Caching)
```
1000 concurrent users
500 queries/minute (90% reduction)
= ~720K queries/month
= $20-50/month (90% savings)
```

### Redis Costs
```
Self-hosted: $0 (if on same server)
Managed Redis (AWS ElastiCache): $15-50/month
Managed Redis (Upstash): $10-30/month

Net savings: $150-400/month
```

---

## 🚀 Deployment Considerations

### Local Development
```bash
# Install Redis locally
brew install redis  # macOS
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server

# Test connection
redis-cli ping
```

### Production Deployment
```
Option 1: Self-Hosted Redis
- Deploy on same server as Express
- Pros: Free, simple
- Cons: Single point of failure

Option 2: Managed Redis (Recommended)
- AWS ElastiCache
- Upstash (serverless)
- Redis Cloud
- Pros: Highly available, backups, monitoring
- Cons: Monthly cost ($15-50)

Option 3: Redis Cluster
- Multiple Redis instances
- Pros: High availability, scalability
- Cons: Complex setup
```

---

## 📚 Recommended Resources

### Redis
- Redis Documentation: https://redis.io/documentation
- ioredis: https://github.com/luin/ioredis
- Redis Best Practices: https://redis.io/docs/management/optimization/

### Caching Strategies
- Cache-Aside Pattern: https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside
- Write-Through Pattern: https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside
- Stale-While-Revalidate: https://web.dev/stale-while-revalidate/

### Performance
- Web Vitals: https://web.dev/vitals/
- HTTP Caching: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
- Database Optimization: https://www.postgresql.org/docs/current/performance.html

---

## 🎓 Summary

### Your App Needs Server-Side Caching Because:
1. **Reduce database load** - Supabase costs scale with queries
2. **Improve response times** - 10-50ms vs 150-500ms
3. **Handle traffic spikes** - Cache absorbs load
4. **Better mobile experience** - Faster API responses
5. **Cost savings** - 70-90% reduction in database queries

### Recommended Implementation Order:
1. **Redis caching** (Week 1-2) - Biggest impact
2. **HTTP caching headers** (Week 2) - Easy wins
3. **Database indexes** (Week 3) - Query optimization
4. **Response compression** (Week 3) - Bandwidth savings
5. **Load balancing** (Later) - High availability

### Expected Results:
- API response time: 150-500ms → 5-50ms (10-100x faster)
- Database queries: 5000/min → 500/min (90% reduction)
- Supabase costs: $200-500/month → $20-50/month (80-90% savings)
- Mobile app performance: Significantly improved

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Ready for Implementation
