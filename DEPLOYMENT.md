# Deployment Guide for Render

This guide will help you deploy the Investment Platform Backend to Render's free tier.

## Prerequisites

1. A GitHub repository with your code
2. A Render account (free tier available)
3. Environment variables configured

## Step 1: Prepare Your Repository

1. Ensure all files are committed to your GitHub repository
2. Make sure the `render.yaml` file is in the root directory
3. Verify that `package.json` has the correct start script

## Step 2: Deploy to Render

### Option A: Using Render Dashboard (Recommended for beginners)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `investment-platform-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`

### Option B: Using render.yaml (Advanced)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" and select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file

## Step 3: Configure Environment Variables

In the Render dashboard, go to your service and add these environment variables:

### Required Variables
```
NODE_ENV=production
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
CORS_ORIGIN=https://your-frontend-app.onrender.com
```

### Database Configuration
If using Render PostgreSQL:
- The `DATABASE_URL` will be automatically provided
- No additional configuration needed

If using external database:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Redis Configuration
If using external Redis service:
```
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### Optional Variables
```
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
DEPOSIT_SCAN_INTERVAL_MINUTES=5
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

## Step 4: Database Setup

### Using Render PostgreSQL (Free Tier)
1. In Render dashboard, create a new PostgreSQL database
2. Copy the connection string to your environment variables
3. The database will be automatically connected

### Using External Database
1. Set up your PostgreSQL database (AWS RDS, Railway, etc.)
2. Add the connection string to environment variables

## Step 5: Run Database Migrations

After deployment, you need to run database migrations:

1. Go to your service in Render dashboard
2. Open the "Shell" tab
3. Run: `npm run migrate`

Or add this to your build command:
```
npm install && npm run build && npm run migrate
```

## Step 6: Health Checks

Your service should be accessible at:
- **Health Check**: `https://your-app.onrender.com/health`
- **API**: `https://your-app.onrender.com/api/v1`

## Step 7: Monitoring

Render provides built-in monitoring:
- View logs in the Render dashboard
- Monitor health checks
- Set up alerts for downtime

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check that all dependencies are in `package.json`
   - Ensure TypeScript compilation succeeds
   - Verify build command is correct

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correctly set
   - Check database service is running
   - Ensure network connectivity

3. **Health Check Failures**
   - Verify `/health` endpoint is working
   - Check database and Redis connections
   - Review application logs

4. **CORS Issues**
   - Update `CORS_ORIGIN` with your frontend URL
   - Ensure frontend is deployed and accessible

### Logs and Debugging

1. View logs in Render dashboard
2. Check health endpoint: `https://your-app.onrender.com/health`
3. Test API endpoints with tools like Postman

## Free Tier Limitations

- **Sleep Mode**: Free tier services sleep after 15 minutes of inactivity
- **Build Time**: 500 build minutes per month
- **Database**: 1GB storage limit
- **Bandwidth**: 100GB per month

## Scaling

To scale beyond free tier:
1. Upgrade to paid plan
2. Add more resources
3. Configure auto-scaling
4. Set up monitoring and alerts

## Security Considerations

1. Use strong JWT secrets
2. Configure CORS properly
3. Enable rate limiting
4. Use HTTPS (automatic on Render)
5. Regular security updates

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- Check application logs for specific errors
