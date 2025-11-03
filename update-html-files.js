const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all HTML files
const htmlFiles = glob.sync('*.html');

htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Check if file contains supabase-config.js but not env-config.js before it
  if (content.includes('<script src="supabase-config.js"></script>') && 
      !content.includes('<script src="env-config.js"></script>')) {
    
    // Add env-config.js before supabase-config.js
    content = content.replace(
      '<script src="supabase-config.js"></script>',
      '<script src="env-config.js"></script>\n    <script src="supabase-config.js"></script>'
    );
    
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

console.log('Done!');

