# EasyPrint - Deployment Guide

Complete guide to deploying the EasyPrint application to various hosting platforms.

---

## Table of Contents
1. [Quick Start (Recommended)](#quick-start-recommended)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
4. [Docker Deployment](#docker-deployment)
5. [Production Checklist](#production-checklist)

---

## Quick Start (Recommended)

### Option 1: Vercel (Frontend) + Render (Backend)

This is the easiest and most cost-effective option for getting started.

#### **Step 1: Deploy Backend to Render**

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `easyprint-backend`
     - **Region**: Choose closest to your users
     - **Branch**: `main` (or your default branch)
     - **Root Directory**: `backend`
     - **Runtime**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app`

3. **Add Environment Variables** (in Render dashboard):
   ```
   FLASK_ENV=production
   ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
   ```

4. **Deploy** - Render will automatically build and deploy your backend

5. **Note your backend URL** - It will be something like: `https://easyprint-backend.onrender.com`

#### **Step 2: Deploy Frontend to Vercel**

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Import Your Repository**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure the project:
     - **Framework Preset**: Next.js
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build` (auto-detected)
     - **Output Directory**: `.next` (auto-detected)

3. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://easyprint-backend.onrender.com
   ```
   *(Replace with your actual Render backend URL)*

4. **Deploy** - Vercel will automatically build and deploy

5. **Update CORS** - Go back to Render and update the `ALLOWED_ORIGINS` environment variable with your Vercel URL

#### **Step 3: Test Your Deployment**

Visit your Vercel URL and test the application!

---

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` folder (copy from `.env.example`):

```bash
# Copy the example file
cp backend/.env.example backend/.env
```

Update with your values:
```env
FLASK_ENV=production
PORT=5000
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

### Frontend Environment Variables

Create a `.env.local` file in the `frontend` folder:

```bash
# Copy the example file
cp frontend/.env.example frontend/.env.local
```

Update with your backend URL:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

---

## Deployment Options

### Option 2: Railway (Full Stack)

Railway can host both frontend and backend together.

1. **Create Railway account** at [railway.app](https://railway.app)

2. **Deploy Backend**:
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Deploy backend
   cd backend
   railway init
   railway up
   ```

3. **Deploy Frontend**:
   ```bash
   cd ../frontend
   railway init
   railway up
   ```

4. **Configure environment variables** in Railway dashboard

### Option 3: DigitalOcean App Platform

1. **Create DigitalOcean account**
2. **App Platform** → **Create App**
3. **Connect GitHub repository**
4. Configure components:
   - **Backend**: Python app, build command: `pip install -r backend/requirements.txt`
   - **Frontend**: Node.js app, build command: `cd frontend && npm run build`
5. **Add environment variables**
6. **Deploy**

### Option 4: AWS (Advanced)

#### Backend (AWS Elastic Beanstalk):
```bash
# Install EB CLI
pip install awsebcli

# Initialize
cd backend
eb init -p python-3.11 easyprint-backend

# Create environment
eb create easyprint-backend-env

# Deploy
eb deploy
```

#### Frontend (AWS Amplify or Vercel):
Use Vercel for frontend (easier) or AWS Amplify for full AWS stack.

---

## Docker Deployment

### Local Development with Docker

1. **Build and run with Docker Compose**:
   ```bash
   # Build and start all services
   docker-compose up --build
   
   # Run in background
   docker-compose up -d
   
   # Stop services
   docker-compose down
   ```

2. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

### Deploy Docker to Cloud

#### Google Cloud Run:
```bash
# Install Google Cloud SDK
# Then:

# Build and push backend
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/easyprint-backend
gcloud run deploy easyprint-backend --image gcr.io/YOUR_PROJECT_ID/easyprint-backend

# Build and push frontend
cd ../frontend
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/easyprint-frontend
gcloud run deploy easyprint-frontend --image gcr.io/YOUR_PROJECT_ID/easyprint-frontend
```

#### AWS ECS or Azure Container Instances:
Similar process - build images, push to registry, deploy to container service.

---

## VPS Deployment (Manual Setup)

For DigitalOcean Droplet, Linode, or AWS EC2:

### 1. Initial Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install python3-pip python3-venv nginx nodejs npm -y

# Install PM2 for process management
npm install -g pm2
```

### 2. Deploy Backend

```bash
# Clone repository
git clone https://github.com/yourusername/easyprint.git
cd easyprint/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
nano .env  # Edit with your values

# Start with Gunicorn (managed by systemd)
# Create service file
sudo nano /etc/systemd/system/easyprint-backend.service
```

Add this content:
```ini
[Unit]
Description=EasyPrint Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/easyprint/backend
Environment="PATH=/path/to/easyprint/backend/venv/bin"
ExecStart=/path/to/easyprint/backend/venv/bin/gunicorn app:app --config gunicorn.conf.py

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable easyprint-backend
sudo systemctl start easyprint-backend
```

### 3. Deploy Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name "easyprint-frontend" -- start
pm2 save
pm2 startup
```

### 4. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/easyprint
```

Add:
```nginx
# Backend
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/easyprint /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Add SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

---

## Production Checklist

Before deploying to production, ensure:

### Security
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure CORS properly (restrict to your frontend domain)
- [ ] Add rate limiting
- [ ] Implement authentication and authorization
- [ ] Sanitize file uploads
- [ ] Set up firewall rules

### Database
- [ ] Replace `db.json` with PostgreSQL/MongoDB
- [ ] Set up database backups
- [ ] Use connection pooling

### File Storage
- [ ] Move uploads to cloud storage (AWS S3, Cloudinary, etc.)
- [ ] Set up CDN for static assets
- [ ] Implement file size limits

### Monitoring
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Configure logging (Papertrail, LogDNA)
- [ ] Add uptime monitoring (UptimeRobot)
- [ ] Set up performance monitoring

### Performance
- [ ] Enable caching
- [ ] Optimize images
- [ ] Use CDN
- [ ] Enable compression

### Environment
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` files
- [ ] Set `NODE_ENV=production`
- [ ] Set `FLASK_ENV=production`

---

## Updating Your Deployment

### Render/Vercel (Auto Deploy):
Just push to your GitHub repository - they'll auto-deploy!

### Manual Deploy:
```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart easyprint-backend

# Frontend
cd ../frontend
npm install
npm run build
pm2 restart easyprint-frontend
```

---

## Troubleshooting

### Backend won't start:
```bash
# Check logs
journalctl -u easyprint-backend -f  # Systemd
# or
gunicorn app:app --log-level debug  # Manual test
```

### Frontend build fails:
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### CORS errors:
- Verify `ALLOWED_ORIGINS` in backend `.env`
- Verify `NEXT_PUBLIC_API_URL` in frontend

### File uploads not working:
- Check folder permissions: `chmod 755 uploads processed`
- Verify disk space: `df -h`

---

## Cost Estimates

### Free Tier (Good for testing):
- **Vercel**: Free (hobby plan)
- **Render**: Free (with limitations - sleeps after 15 min)
- **Total**: $0/month

### Starter (Good for small projects):
- **Vercel**: Free
- **Render**: $7/month (starter plan)
- **Total**: $7/month

### Production Ready:
- **Vercel Pro**: $20/month
- **Render**: $25/month (starter plan with scaling)
- **PostgreSQL**: $7/month
- **AWS S3**: ~$5/month
- **Total**: ~$57/month

### VPS Option:
- **DigitalOcean Droplet**: $6-12/month
- **Domain**: $10/year
- **Total**: ~$10/month

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review deployment platform documentation
3. Check application logs

**Happy Deploying! 🚀**
