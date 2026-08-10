#!/bin/bash

# Deploy script for POS System to VPS
# Domain: kamikamikita.site
# VPS IP: 137.59.126.116

echo "🚀 Starting deployment to VPS..."

# VPS Configuration
VPS_IP="137.59.126.116"
VPS_USER="root"  # or your username
APP_DIR="/var/www/pos-system"
DOMAIN="kamikamikita.site"

# 1. Build the application locally
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# 2. Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    --exclude="public/uploads" \
    .

echo "✅ Deployment package created!"

# 3. Upload to VPS
echo "📤 Uploading to VPS..."
scp deploy.tar.gz $VPS_USER@$VPS_IP:$APP_DIR/

# 4. SSH to VPS and deploy
echo "🔧 Deploying on VPS..."
ssh $VPS_USER@$VPS_IP << 'ENDSSH'
    cd /var/www/pos-system
    
    # Backup current version
    if [ -d "backup" ]; then
        rm -rf backup
    fi
    mkdir -p backup
    cp -r . backup/ 2>/dev/null || true
    
    # Extract new version
    tar -xzf deploy.tar.gz
    
    # Install dependencies
    npm install --production
    
    # Generate Prisma client
    npx prisma generate
    
    # Push database schema
    npx prisma db push
    
    # Restart application with PM2
    pm2 restart pos-system || pm2 start npm --name "pos-system" -- start
    
    # Cleanup
    rm deploy.tar.gz
    
    echo "✅ Deployment complete!"
ENDSSH

# 5. Cleanup local
rm deploy.tar.gz

echo "🎉 Deployment finished!"
echo "🌐 Application should be available at https://$DOMAIN"
