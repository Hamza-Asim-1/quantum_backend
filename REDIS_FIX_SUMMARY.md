# Redis Connection Fix

## 🚨 **Issue Identified**

The application was successfully connecting to the database but failing to connect to Redis with the error:
```
❌ Redis Client Error: Error: connect ECONNREFUSED ::1:6379
```

## 🔍 **Root Cause**

The Redis configuration was only using individual environment variables (`REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`) and not supporting the `REDIS_URL` format that you provided from Upstash.

## ✅ **Solution Applied**

### **1. Updated Redis Configuration (`src/config/redis.ts`)**

**Before:**
```typescript
const redisClient: RedisClientType = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
  password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD : undefined,
  legacyMode: false,
});
```

**After:**
```typescript
// Create Redis client with URL or individual config
const redisClient: RedisClientType = process.env.REDIS_URL 
  ? createClient({
      url: process.env.REDIS_URL,
      legacyMode: false,
    })
  : createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD ? process.env.REDIS_PASSWORD : undefined,
      legacyMode: false,
    });
```

### **2. Updated Render Configuration (`render.yaml`)**

**Before:**
```yaml
- key: REDIS_HOST
  fromService:
    type: redis
    name: investment-platform-redis
    property: host
- key: REDIS_PORT
  fromService:
    type: redis
    name: investment-platform-redis
    property: port
- key: REDIS_PASSWORD
  fromService:
    type: redis
    name: investment-platform-redis
    property: password
```

**After:**
```yaml
- key: REDIS_URL
  fromService:
    type: redis
    name: investment-platform-redis
    property: connectionString
```

## 🎯 **What This Fix Does**

1. **Supports Redis URL Format**: Now accepts `REDIS_URL` environment variable (like your Upstash URL)
2. **Backward Compatible**: Still supports individual Redis config variables for local development
3. **Automatic Detection**: Uses URL format when `REDIS_URL` is available, falls back to individual config otherwise

## 🚀 **Environment Variables**

### **For Upstash Redis (Production):**
```bash
REDIS_URL=redis://default:AW1lAAIncDIwNGJjMmRmZGQyMTI0ZDY1YWRhMjkzOWM4NjZjODA2OXAyMjgwMDU@super-teal-28005.upstash.io:6379
```

### **For Local Development:**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
```

## 🔧 **Next Steps**

1. **Commit and Push Changes:**
   ```bash
   git add .
   git commit -m "Fix Redis connection to support REDIS_URL format"
   git push
   ```

2. **Set Environment Variable in Render:**
   - Go to your Render dashboard
   - Navigate to your web service
   - Add environment variable: `REDIS_URL`
   - Value: `redis://default:AW1lAAIncDIwNGJjMmRmZGQyMTI0ZDY1YWRhMjkzOWM4NjZjODA2OXAyMjgwMDU@super-teal-28005.upstash.io:6379`

3. **Redeploy:**
   - The deployment should automatically trigger
   - Monitor the logs for successful Redis connection

## 🎉 **Expected Results**

### **Before Fix:**
```
❌ Redis Client Error: Error: connect ECONNREFUSED ::1:6379
```

### **After Fix:**
```
✅ Redis Client Connected
✅ Redis connection test successful
```

## 🔍 **Troubleshooting**

### **If Redis Still Fails:**
1. Verify the `REDIS_URL` environment variable is set correctly
2. Check that the Upstash Redis instance is accessible
3. Ensure the Redis URL format is correct (should start with `redis://`)

### **If Using Render's Redis Service:**
The `render.yaml` configuration will automatically provide the `REDIS_URL` from the managed Redis service.

---

**Your Redis connection should now work with the Upstash URL!** 🚀
