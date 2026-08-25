const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix duplicate className attributes: className="..." className="..."
      const regex = /className="([^"]+)"\s+className="([^"]+)"/g;
      const original = content;
      
      content = content.replace(regex, (match, p1, p2) => {
        return `className="${p1} ${p2}"`;
      });
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed duplicate classNames in ${fullPath}`);
      }
    }
  }
}

processDirectory(dirPath);
console.log('Class consolidation complete.');
