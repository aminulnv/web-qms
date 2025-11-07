#!/usr/bin/env node

/**
 * Development Server with Cache-Busting and Live Reload
 * Serves files with no-cache headers to prevent browser caching during development
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const net = require('net');

// Global logger instance
let loggerInstance = null;

// Initialize logger helper
async function initializeLogger() {
  if (loggerInstance) {
    return loggerInstance;
  }
  
  try {
    const loggerModule = await import('@rharkor/logger');
    loggerInstance = loggerModule.logger;
    await loggerInstance.init();
    return loggerInstance;
  } catch (err) {
    console.error('Failed to initialize logger:', err.message);
    // Fallback to console if logger fails
    loggerInstance = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      success: (msg) => console.log(`✅ ${msg}`),
      debug: console.debug
    };
    return loggerInstance;
  }
}

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Global variables for WebSocket and file watcher
let wss = null;
let wsPort = null;
let watcher = null;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Get the project root directory (parent of scripts/)
const projectRoot = path.resolve(__dirname, '..');

// Function to find an available port
function findAvailablePort(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let port = startPort;
    let attempts = 0;

    function tryPort() {
      if (attempts >= maxAttempts) {
        reject(new Error(`Could not find available port after ${maxAttempts} attempts`));
        return;
      }

      const testServer = net.createServer();
      testServer.listen(port, HOST, () => {
        testServer.once('close', () => resolve(port));
        testServer.close();
      });
      testServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          port++;
          tryPort();
        } else {
          reject(err);
        }
      });
    }

    tryPort();
  });
}

const server = http.createServer((req, res) => {
  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Default to index.html for root
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Remove leading slash and resolve path
  const filePath = path.join(projectRoot, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(projectRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Not Found</title></head>
        <body>
          <h1>404 - File Not Found</h1>
          <p>The requested file "${pathname}" was not found.</p>
          <p><a href="/">Go to Home</a></p>
        </body>
        </html>
      `);
      return;
    }

    // Read file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      // Get file extension
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Set headers with NO-CACHE for development
      const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      };

      // Add CORS headers for development
      headers['Access-Control-Allow-Origin'] = '*';
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

      // Handle OPTIONS request
      if (req.method === 'OPTIONS') {
        res.writeHead(200, headers);
        res.end();
        return;
      }

      // Inject live reload script for HTML files (only if WebSocket is available)
      if (ext === '.html' && wsPort) {
        let html = data.toString();
        
        // Inject live reload script before closing </body> tag
        const liveReloadScript = `
    <!-- Development Live Reload -->
    <script>
      (function() {
        try {
          const ws = new WebSocket('ws://${HOST}:${wsPort}');
          ws.onmessage = function(event) {
            if (event.data === 'reload') {
              console.log('[Dev Server] Reloading page...');
              window.location.reload();
            }
          };
          ws.onerror = function() {
            console.log('[Dev Server] WebSocket connection failed. Live reload disabled.');
          };
        } catch (e) {
          console.log('[Dev Server] WebSocket not available. Live reload disabled.');
        }
      })();
    </script>
`;
        
        // Insert before </body> or at the end if no </body>
        if (html.includes('</body>')) {
          html = html.replace('</body>', liveReloadScript + '\n</body>');
        } else {
          html += liveReloadScript;
        }
        
        data = Buffer.from(html, 'utf8');
      }

      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

// Start HTTP server
async function startServer() {
  const logger = await initializeLogger();
  
  server.listen(PORT, HOST, async () => {
    logger.success('\n🚀 Development Server Started!');
    logger.info(`📍 Server running at http://${HOST}:${PORT}`);
    logger.info(`📁 Serving files from: ${projectRoot}`);
    logger.info(`🚫 Cache disabled for all files`);

    // Try to start WebSocket server for live reload
    try {
      wsPort = await findAvailablePort(PORT + 1);
      const WebSocket = require('ws');
      wss = new WebSocket.Server({ port: wsPort, host: HOST });
      
      wss.on('listening', () => {
        logger.success(`🔄 Live reload enabled (WebSocket on port ${wsPort})`);
      });

      wss.on('error', (err) => {
        logger.warn(`⚠️  WebSocket server error: ${err.message}`);
        logger.warn(`   Live reload will be disabled, but server is still running`);
        wss = null;
        wsPort = null;
      });
    } catch (err) {
      logger.warn(`⚠️  Could not start WebSocket server: ${err.message}`);
      logger.warn(`   Live reload will be disabled, but server is still running`);
      wss = null;
      wsPort = null;
    }

    // Watch for file changes
    try {
      const chokidar = require('chokidar');
      watcher = chokidar.watch(projectRoot, {
        ignored: [
          /(^|[\/\\])\../, // ignore dotfiles
          /node_modules/,
          /\.git/,
          /\.vscode/,
          /\.idea/
        ],
        persistent: true,
        ignoreInitial: true
      });

      watcher.on('change', (filePath) => {
        const relativePath = path.relative(projectRoot, filePath);
        logger.debug(`[File Changed] ${relativePath}`);
        
        // Notify all connected clients to reload if WebSocket is available
        if (wss) {
          const WebSocket = require('ws');
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send('reload');
            }
          });
        }
      });

      watcher.on('error', (err) => {
        logger.error(`⚠️  File watcher error: ${err.message}`);
      });
    } catch (err) {
      logger.error(`⚠️  Could not start file watcher: ${err.message}`);
      watcher = null;
    }

    logger.info('\n💡 Tips:');
    logger.info('   - Press Ctrl+C to stop the server');
    if (wss) {
      logger.info('   - Changes to files will trigger automatic reload');
    } else {
      logger.info('   - Manual refresh: Ctrl+Shift+R (live reload unavailable)');
    }
    logger.info('   - Hard refresh: Ctrl+Shift+R (if needed)\n');
  });
}

// Initialize logger and start server
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle server shutdown
process.on('SIGINT', () => {
  const logger = loggerInstance || {
    warn: console.log,
    success: console.log
  };
  
  logger.warn('\n\n🛑 Shutting down development server...');
  if (watcher) {
    watcher.close();
  }
  if (wss) {
    wss.close();
  }
  server.close(() => {
    logger.success('✅ Server stopped.\n');
    process.exit(0);
  });
});
