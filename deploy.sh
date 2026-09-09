#!/bin/bash

# Deploy script for POS System to VPS
# Domain: kamikamikita.site
# VPS IP: 137.59.126.116

echo "🚀 Starting deployment to VPS..."

# VPS Configuration
VPS_IP="137.59.126.116"
VPS_USER="root"
SSH_KEY="$HOME/.ssh/id_ed25519_kamikamikita"
APP_DIR="/var/www/pos-system"
DOMAIN="kamikamikita.site"

# SSH options
SSH_OPTS="-i $SSH_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=30"

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
rm -f deploy.tar.gz
tar -czf deploy.tar.gz \
    --exclude="node_modules" \
    --exclude=".next" \
    --exclude=".git" \
    --exclude="public/uploads" \
    --exclude="deploy.tar.gz" \
    --exclude="middleware.ts" \
    .

echo "✅ Deployment package created!"

# 3. Upload to VPS (using SSH pipe instead of SCP to avoid subsystem issues)
echo "📤 Uploading to VPS..."
cat deploy.tar.gz | ssh $SSH_OPTS $VPS_USER@$VPS_IP "cat > $APP_DIR/deploy.tar.gz"

# 4. SSH to VPS and deploy
echo "🔧 Deploying on VPS..."
ssh $SSH_OPTS $VPS_USER@$VPS_IP << 'ENDSSH'
    cd /var/www/pos-system
    
    # Backup current version
    if [ -d "backup" ]; then
        rm -rf backup
    fi
    mkdir -p backup
    cp -r . backup/ 2>/dev/null || true
    
    # Extract new version
    tar -xzf deploy.tar.gz
    
    # Install all dependencies (including devDependencies needed for build)
    npm install
    
    # Generate Prisma client
    npx prisma generate

    # Source environment variables for database
    set -a && source .env && set +a

    # Push database schema (creates tables if not exist)
    npx prisma db push --accept-data-loss

    # Seed database dimatikan agar editan menu/stok di back office tidak tertimpa/reset saat deploy
    # npx tsx scripts/seed-menu.ts
    # npx tsx scripts/seed-staff.ts
    # npx tsx scripts/seed-admin.ts

    # Build production bundle (required by next start)
    npm run build

    # Restart application with PM2 (with env loaded)
    pm2 delete pos-system 2>/dev/null || true
    pm2 start npm --name "pos-system" -- start --update-env
    pm2 save
    
    # Cleanup
    rm deploy.tar.gz
    
    echo "✅ Deployment complete!"
ENDSSH

# 5. Cleanup local
rm deploy.tar.gz

echo "🎉 Deployment finished!"
echo "🌐 Application should be available at https://$DOMAIN"