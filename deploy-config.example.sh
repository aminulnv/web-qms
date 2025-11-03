#!/bin/bash
# Example deployment script - customize for your hosting provider
# This script helps you deploy config files to production

echo "⚠️  Deploying config files to production..."
echo "Make sure your production server is configured correctly."
echo ""

# Example: Using SCP to upload to a server
# scp intercom-config.js supabase-config.js user@your-server.com:/path/to/your/app/

# Example: Using FTP
# curl -T intercom-config.js ftp://your-server.com/ --user username:password
# curl -T supabase-config.js ftp://your-server.com/ --user username:password

# Example: Using rsync
# rsync -avz intercom-config.js supabase-config.js user@your-server.com:/path/to/your/app/

echo "✅ Config files deployment completed!"
echo "Remember: These files should NOT be in your Git repository."

