# Development Environment Setup

This project now includes a development server with **automatic cache-busting** and **live reload** to ensure your changes are always visible.

## Quick Start

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - Navigate to `http://localhost:3000`
   - The server will automatically reload when you make changes to files

3. **Stop the server:**
   - Press `Ctrl+C` in the terminal

## Features

### ✅ Cache-Busting
- All files are served with `no-cache` headers
- HTML files include cache-busting meta tags
- No need to manually clear browser cache

### ✅ Live Reload
- Automatically reloads the page when files change
- Works for HTML, CSS, and JavaScript files
- WebSocket connection for instant updates

### ✅ Development-Friendly
- Serves files from the project root
- Handles all common file types (HTML, JS, CSS, images, etc.)
- CORS enabled for development
- Security headers included

## Troubleshooting

### Changes Not Showing?

1. **Make sure you're using the dev server:**
   - Don't open HTML files directly (file:// protocol)
   - Always use `http://localhost:3000`

2. **Check the terminal:**
   - You should see `[File Changed]` messages when you save files
   - If not, the file watcher might not be working

3. **Manual refresh:**
   - Press `Ctrl+Shift+R` (or `Ctrl+F5`) for a hard refresh
   - Or wait for the automatic reload

4. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

### Port Already in Use?

If port 3000 is already in use, you can change it:

```bash
PORT=3001 npm run dev
```

Or set the HOST:

```bash
HOST=0.0.0.0 PORT=3000 npm run dev
```

## File Structure

```
frfrqms/
├── scripts/
│   ├── dev-server.js          # Development server
│   └── generate-env-config.js # Environment config generator
├── audit-view.html            # Main audit view (with cache-busting)
├── create-audit.html          # Create audit page (with cache-busting)
├── edit-audit.html            # Edit audit page (with cache-busting)
└── package.json               # npm scripts
```

## Scripts

- `npm run dev` - Start development server
- `npm start` - Alias for `npm run dev`
- `npm run build:config` - Generate environment config

## Notes

- The dev server is for **development only**
- For production, use Vercel or your preferred hosting
- The server watches all files in the project root
- Changes to `.env` require restarting the server

