const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-\[\#0f1117\]/g, replacement: 'bg-pwc-bg' },
  { regex: /bg-\[\#161b2e\]/g, replacement: 'bg-pwc-white' },
  { regex: /bg-\[\#1e2235\]/g, replacement: 'bg-pwc-input' },
  { regex: /border-\[\#2a2f45\]/g, replacement: 'border-pwc-border' },
  { regex: /text-\[\#e8eaf0\]/g, replacement: 'text-pwc-text' },
  { regex: /text-\[\#6b7280\]/g, replacement: 'text-pwc-text-muted' },
  { regex: /text-\[\#6366f1\]/g, replacement: 'text-pwc-primary' },
  { regex: /bg-\[\#6366f1\]/g, replacement: 'bg-pwc-primary' },
  { regex: /bg-\[\#4f46e5\]/g, replacement: 'bg-pwc-hover-orange' },
  { regex: /hover:bg-\[\#4f46e5\]/g, replacement: 'hover:bg-pwc-hover-orange' },
  { regex: /border-\[\#6366f1\]/g, replacement: 'border-pwc-primary' },
  { regex: /border-t-\[\#6366f1\]/g, replacement: 'border-t-pwc-primary' },
  { regex: /hover:bg-\[\#1e2235\]/g, replacement: 'hover:bg-pwc-input' },
  { regex: /bg-\[\#1a1f36\]/g, replacement: 'bg-pwc-bg' },
  { regex: /text-\[\#93a1c6\]/g, replacement: 'text-pwc-placeholder' },
  { regex: /text-white/g, replacement: 'text-pwc-white' }, // be careful with text-white, it might be fine to keep, but pwc-white adapts
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      
      // Also replace style={{ background: 'var(--bg)' }}
      content = content.replace(/style=\{\{ background: 'var\(--bg\)' \}\}/g, "className=\"bg-pwc-bg\"");
      content = content.replace(/style=\{\{ background: 'var\(--surface\)' \}\}/g, "className=\"bg-pwc-white\"");
      content = content.replace(/style=\{\{ background: 'var\(--surface-alt\)' \}\}/g, "className=\"bg-pwc-input\"");

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(dirPath);
console.log('Refactoring complete.');
