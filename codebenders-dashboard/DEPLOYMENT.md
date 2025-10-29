# Deploying to Vercel

This guide will help you deploy the Student Success Dashboard to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup) (free tier works great!)
2. Your database credentials
3. An OpenAI API key (if using AI-powered features)

## Deployment Steps

### Option 1: Deploy via GitHub (Recommended - Easiest!)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin deployment
   ```

2. **Go to [vercel.com](https://vercel.com)** and sign in

3. **Click "Add New Project"**

4. **Import your GitHub repository**:
   - Select `devcolor/codebenders-datathon`
   - Vercel will automatically detect it's a Next.js app

5. **Configure the project**:
   - **Root Directory**: Click "Edit" and set to `codebenders-dashboard`
   - **Framework Preset**: Next.js (should auto-detect)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

6. **Add Environment Variables** (click "Environment Variables"):
   ```
   DB_HOST=your-database-host
   DB_USER=your-database-user
   DB_PASSWORD=your-database-password
   DB_PORT=3306
   DB_NAME=pdp_analytics
   OPENAI_API_KEY=your-openai-key
   ```

7. **Click "Deploy"**

   Vercel will:
   - Install dependencies
   - Build your Next.js app
   - Deploy it to a global CDN
   - Give you a URL like `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the dashboard directory**:
   ```bash
   cd codebenders-dashboard
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: codebenders-dashboard
   - In which directory is your code: ./
   - Override settings: No

5. **Add environment variables**:
   ```bash
   vercel env add DB_HOST
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_PORT
   vercel env add DB_NAME
   vercel env add OPENAI_API_KEY
   ```

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

## Important Database Considerations

### Network Access

Your database needs to be accessible from the internet. Options:

1. **If using a cloud database** (AWS RDS, Google Cloud SQL, etc.):
   - Add Vercel's IP ranges to your security group/firewall
   - Vercel uses dynamic IPs, so you may need to allow all IPs (0.0.0.0/0) for serverless functions
   - Better: Use connection pooling services like PlanetScale or Supabase

2. **If using a local/private database**:
   - Consider using [Vercel Edge Config](https://vercel.com/docs/storage/edge-config) with a cloud database
   - Or set up a database proxy/tunnel
   - Or migrate to a cloud-hosted database

### Recommended Database Options for Production

- **PlanetScale** - MySQL-compatible, excellent Vercel integration
- **Supabase** - PostgreSQL, free tier available
- **AWS RDS** - Traditional cloud database
- **Railway** - Easy database hosting

## After Deployment

1. **Test your deployment**:
   - Visit your Vercel URL
   - Test the dashboard features
   - Check that database queries work
   - Try the AI-powered query feature

2. **Set up custom domain** (optional):
   - Go to your project settings in Vercel
   - Navigate to "Domains"
   - Add your custom domain

3. **Enable automatic deployments**:
   - Vercel automatically deploys on every push to your connected branch
   - Preview deployments are created for pull requests
   - Production deploys happen on pushes to `main` (or your chosen branch)

## Monitoring

- **View logs**: Go to your project → Deployments → Click deployment → Runtime Logs
- **Monitor performance**: Vercel Analytics (add to your project in settings)
- **Set up alerts**: Configure webhook notifications for deployment status

## Troubleshooting

### Build Failures

Check the build logs in Vercel dashboard. Common issues:
- Missing environment variables
- TypeScript errors
- Missing dependencies

### Runtime Errors

- Check Runtime Logs in Vercel dashboard
- Verify database connectivity
- Ensure all environment variables are set correctly

### Database Connection Issues

- Verify your database allows connections from Vercel's IP addresses
- Check that your DB_HOST is publicly accessible
- Test credentials are correct
- Ensure SSL/TLS settings are compatible

## Cost

- **Vercel Free Tier includes**:
  - Unlimited deployments
  - 100GB bandwidth per month
  - Serverless function executions
  - Automatic HTTPS
  - Preview deployments

- **Upgrades needed if**:
  - You exceed 100GB bandwidth
  - You need advanced team features
  - You want commercial use support

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Vercel Community: https://github.com/vercel/vercel/discussions

