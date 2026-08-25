const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/LandingPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/CustomerDashboard.jsx',
  'src/pages/BankerDashboard.jsx',
  'src/pages/customer/CustomerQueries.jsx'
];

const colorMap = {
  // Indigo / Primary -> PwC Orange
  '#6366f1': 'rgb(var(--color-primary))',
  '#4f46e5': 'rgb(var(--color-hover-orange))',
  '#a5b4fc': 'rgb(var(--color-btn-orange))',
  '#8b5cf6': 'rgb(var(--color-primary))',
  '#2dd4bf': 'rgb(var(--color-btn-orange))', // Teal -> Orange
  
  // Backgrounds
  '#0a0d16': 'rgb(var(--color-bg))',
  '#0f1117': 'rgb(var(--color-bg))',
  '#161b2e': 'rgb(var(--color-white))', // Surface
  
  // Borders
  '#1e2235': 'rgb(var(--color-border))',
  '#2a2f45': 'rgb(var(--color-border))',
  
  // Text
  '#e8eaf0': 'rgb(var(--color-text))',
  '#9ca3af': 'rgb(var(--color-text-muted))',
  '#6b7280': 'rgb(var(--color-text-muted))',
};

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all known hex colors
  for (const [hex, cssVar] of Object.entries(colorMap)) {
    // Escape hex string for regex just in case
    const regex = new RegExp(hex, 'gi');
    content = content.replace(regex, cssVar);
  }

  // Handle `#fff` in color attributes which causes invisible text in light mode
  content = content.replace(/color:\s*['"]#fff(?:fff)?['"]/gi, 'color: "var(--text)"');
  
  // Fix specific occurrences in LandingPage and LoginPage
  // 'var(--text)' instead of 'rgb(var(--color-text))' because LoginPage has aliases
  // But wait, LandingPage doesn't have aliases! Let's map `#fff` to `rgb(var(--color-white))` except for text.
  content = content.replace(/color:(\s*)['"]rgb\(var\(--color-white\)\)['"]/gi, 'color:$1"rgb(var(--color-text))"');

  // Fix transparent backgrounds with opacity hex (e.g. #6366f133 -> rgba(var(--color-primary), 0.2))
  content = content.replace(/#6366f133/gi, 'rgba(var(--color-primary), 0.2)');
  content = content.replace(/#6366f122/gi, 'rgba(var(--color-primary), 0.13)');
  content = content.replace(/#6366f144/gi, 'rgba(var(--color-primary), 0.26)');
  content = content.replace(/#2dd4bf22/gi, 'rgba(var(--color-btn-orange), 0.13)');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
});
